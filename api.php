<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$config = require 'config/config.php';

// Handle preflight OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db_config = $config['db'];
$conn = new mysqli($db_config['host'], $db_config['user'], $db_config['pass'], $db_config['name']);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => "Connection failed: " . $conn->connect_error]);
    exit();
}
$conn->set_charset($db_config['charset']);

// Router pro zpracování požadavků
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    handleGetData($conn);
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handlePostData($conn);
} else {
    $response = ['status' => 'success', 'message' => 'API is working, but no action taken for this request method.'];
    echo json_encode($response);
}

function handlePostData($conn) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON received']);
        return;
    }

    $conn->begin_transaction();

    try {
        // --- Synchronizace hráčů ---
        syncPlayers($conn, $input['playerDatabase']);
        
        // --- Synchronizace turnajů (a jejich hráčů a zápasů) ---
        syncTournaments($conn, $input['tournaments']);


        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Data saved successfully.']);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function syncTournaments($conn, $frontendTournaments) {
    // 1. Načtení aktuálních turnajů z DB
    $dbTournamentsResult = $conn->query("SELECT entity_id as id, name, points_to_win, is_locked FROM tournaments WHERE valid_to IS NULL");
    $dbTournaments = [];
    while($row = $dbTournamentsResult->fetch_assoc()) {
        $dbTournaments[$row['id']] = $row;
    }

    $frontendTournamentIds = array_column($frontendTournaments, 'id');

    // 2. Detekce smazaných turnajů
    $deletedTournamentIds = array_diff(array_keys($dbTournaments), $frontendTournamentIds);
    if (!empty($deletedTournamentIds)) {
        $stmtDelete = $conn->prepare("UPDATE tournaments SET valid_to = NOW() WHERE entity_id IN (" . implode(',', array_fill(0, count($deletedTournamentIds), '?')) . ") AND valid_to IS NULL");
        $stmtDelete->bind_param(str_repeat('i', count($deletedTournamentIds)), ...$deletedTournamentIds);
        $stmtDelete->execute();
    }
    
    // 3. Detekce nových a upravených turnajů
    $stmtUpdate = $conn->prepare("UPDATE tournaments SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
    $stmtInsert = $conn->prepare("INSERT INTO tournaments (entity_id, name, points_to_win, is_locked, valid_from) VALUES (?, ?, ?, ?, ?)");
    
    $maxEntityIdResult = $conn->query("SELECT MAX(entity_id) as max_id FROM tournaments");
    $nextEntityId = ($maxEntityIdResult->fetch_assoc()['max_id'] ?? 0) + 1;

    foreach ($frontendTournaments as $feTournament) {
        $id = $feTournament['id'];
        $createdAt = $feTournament['createdAt'];

        if (isset($dbTournaments[$id])) { // Turnaj existuje
            $dbTournament = $dbTournaments[$id];
            if ($dbTournament['name'] != $feTournament['name'] || $dbTournament['points_to_win'] != $feTournament['pointsToWin'] || $dbTournament['is_locked'] != $feTournament['isLocked']) {
                $stmtUpdate->bind_param("i", $id);
                $stmtUpdate->execute();
                $stmtInsert->bind_param("isiis", $id, $feTournament['name'], $feTournament['pointsToWin'], $feTournament['isLocked'], $createdAt);
                $stmtInsert->execute();
            }
        } else { // Nový turnaj
            $stmtInsert->bind_param("isiis", $nextEntityId, $feTournament['name'], $feTournament['pointsToWin'], $feTournament['isLocked'], $createdAt);
            $stmtInsert->execute();
            $id = $nextEntityId; // Pro navazující funkce použijeme nové ID
            $nextEntityId++;
        }

        // Synchronizace hráčů a zápasů pro tento konkrétní turnaj
        syncTournamentPlayers($conn, $id, $feTournament['playerIds']);
        syncMatches($conn, $id, $feTournament['matches']);
    }
}

function syncTournamentPlayers($conn, $tournamentId, $frontendPlayerIds) {
    // 1. Načtení aktuálních hráčů v turnaji z DB
    $stmt = $conn->prepare("SELECT player_id FROM tournament_players WHERE tournament_id = ? AND valid_to IS NULL ORDER BY player_order");
    $stmt->bind_param("i", $tournamentId);
    $stmt->execute();
    $dbPlayerIds = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'player_id');

    // 2. Detekce smazaných
    $deletedPlayerIds = array_diff($dbPlayerIds, $frontendPlayerIds);
    if (!empty($deletedPlayerIds)) {
        $stmtDelete = $conn->prepare("UPDATE tournament_players SET valid_to = NOW() WHERE tournament_id = ? AND player_id IN (" . implode(',', array_fill(0, count($deletedPlayerIds), '?')) . ") AND valid_to IS NULL");
        $types = "i" . str_repeat('i', count($deletedPlayerIds));
        $stmtDelete->bind_param($types, $tournamentId, ...$deletedPlayerIds);
        $stmtDelete->execute();
    }

    // 3. Detekce nových (neřešíme změnu pořadí, prostě smažeme a vložíme)
    if ($dbPlayerIds !== $frontendPlayerIds) {
        // Zneplatníme všechny staré záznamy pro tento turnaj
        $stmtInvalidate = $conn->prepare("UPDATE tournament_players SET valid_to = NOW() WHERE tournament_id = ? AND valid_to IS NULL");
        $stmtInvalidate->bind_param("i", $tournamentId);
        $stmtInvalidate->execute();

        // Vložíme nové záznamy ve správném pořadí
        $stmtInsert = $conn->prepare("INSERT INTO tournament_players (entity_id, tournament_id, player_id, player_order) VALUES (?, ?, ?, ?)");
        $maxEntityIdResult = $conn->query("SELECT MAX(entity_id) as max_id FROM tournament_players");
        $nextEntityId = ($maxEntityIdResult->fetch_assoc()['max_id'] ?? 0) + 1;
        foreach ($frontendPlayerIds as $order => $playerId) {
            $stmtInsert->bind_param("iiii", $nextEntityId, $tournamentId, $playerId, $order);
            $stmtInsert->execute();
            $nextEntityId++;
        }
    }
}

function syncMatches($conn, $tournamentId, $frontendMatches) {
    // 1. Načtení aktuálních zápasů z DB
    $stmt = $conn->prepare("SELECT entity_id as id, player1_id, player2_id, score1, score2, completed, first_server, serving_player FROM matches WHERE tournament_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $tournamentId);
    $stmt->execute();
    $dbMatchesResult = $stmt->get_result();
    $dbMatches = [];
    while($row = $dbMatchesResult->fetch_assoc()) {
        $dbMatches[$row['id']] = $row;
    }

    $frontendMatchIds = array_column($frontendMatches, 'id');
    
    // 2. Detekce smazaných zápasů (např. po odebrání hráče)
    $deletedMatchIds = array_diff(array_keys($dbMatches), $frontendMatchIds);
    if (!empty($deletedMatchIds)) {
        $stmtDelete = $conn->prepare("UPDATE matches SET valid_to = NOW() WHERE tournament_id = ? AND entity_id IN (" . implode(',', array_fill(0, count($deletedMatchIds), '?')) . ") AND valid_to IS NULL");
        $types = "i" . str_repeat('i', count($deletedMatchIds));
        $stmtDelete->bind_param($types, $tournamentId, ...$deletedMatchIds);
        $stmtDelete->execute();
    }
    
    // 3. Detekce nových a upravených zápasů
    $stmtUpdate = $conn->prepare("UPDATE matches SET valid_to = NOW() WHERE entity_id = ? AND tournament_id = ? AND valid_to IS NULL");
    $stmtInsert = $conn->prepare("INSERT INTO matches (entity_id, tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, match_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $maxEntityIdResult = $conn->query("SELECT MAX(entity_id) as max_id FROM matches");
    $nextEntityId = ($maxEntityIdResult->fetch_assoc()['max_id'] ?? 0) + 1;

    foreach ($frontendMatches as $order => $feMatch) {
        $id = $feMatch['id'];
        // Normalizujeme hodnoty z frontendu, které mohou být null
        $firstServer = isset($feMatch['firstServer']) ? $feMatch['firstServer'] : null;
        $servingPlayer = isset($feMatch['servingPlayer']) ? $feMatch['servingPlayer'] : null;

        if (isset($dbMatches[$id])) { // Zápas existuje
            $dbMatch = $dbMatches[$id];
            // Porovnání všech relevantních polí
            if ($dbMatch['score1'] != $feMatch['score1'] || $dbMatch['score2'] != $feMatch['score2'] || $dbMatch['completed'] != $feMatch['completed'] || $dbMatch['first_server'] != $firstServer || $dbMatch['serving_player'] != $servingPlayer) {
                $stmtUpdate->bind_param("ii", $id, $tournamentId);
                $stmtUpdate->execute();
                $stmtInsert->bind_param("iiiiiiiiii", $id, $tournamentId, $feMatch['player1Id'], $feMatch['player2Id'], $feMatch['score1'], $feMatch['score2'], $feMatch['completed'], $firstServer, $servingPlayer, $order);
                $stmtInsert->execute();
            }
        } else { // Nový zápas
            $stmtInsert->bind_param("iiiiiiiiii", $nextEntityId, $tournamentId, $feMatch['player1Id'], $feMatch['player2Id'], $feMatch['score1'], $feMatch['score2'], $feMatch['completed'], $firstServer, $servingPlayer, $order);
            $stmtInsert->execute();
            $nextEntityId++;
        }
    }
}


function syncPlayers($conn, $frontendPlayers) {
    // 1. Načtení aktuálních hráčů z DB
    $dbPlayersResult = $conn->query("SELECT entity_id as id, name, photo_url, strengths, weaknesses FROM players WHERE valid_to IS NULL");
    $dbPlayers = [];
    while($row = $dbPlayersResult->fetch_assoc()) {
        $dbPlayers[$row['id']] = $row;
    }

    $frontendPlayerIds = array_column($frontendPlayers, 'id');

    // 2. Detekce smazaných hráčů
    $deletedPlayerIds = array_diff(array_keys($dbPlayers), $frontendPlayerIds);
    if (!empty($deletedPlayerIds)) {
        $stmtDelete = $conn->prepare("UPDATE players SET valid_to = NOW() WHERE entity_id IN (" . implode(',', array_fill(0, count($deletedPlayerIds), '?')) . ") AND valid_to IS NULL");
        $stmtDelete->bind_param(str_repeat('i', count($deletedPlayerIds)), ...$deletedPlayerIds);
        $stmtDelete->execute();
    }

    // 3. Detekce nových a upravených hráčů
    $stmtUpdate = $conn->prepare("UPDATE players SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
    $stmtInsert = $conn->prepare("INSERT INTO players (entity_id, name, photo_url, strengths, weaknesses) VALUES (?, ?, ?, ?, ?)");
    
    // Získání nejvyššího entity_id pro případné nové hráče
    $maxEntityIdResult = $conn->query("SELECT MAX(entity_id) as max_id FROM players");
    $nextEntityId = ($maxEntityIdResult->fetch_assoc()['max_id'] ?? 0) + 1;

    foreach ($frontendPlayers as $fePlayer) {
        $id = $fePlayer['id'];
        
        if (isset($dbPlayers[$id])) { // Hráč existuje v DB -> zkontrolovat změny
            $dbPlayer = $dbPlayers[$id];
            if ($dbPlayer['name'] != $fePlayer['name'] || $dbPlayer['photo_url'] != $fePlayer['photoUrl'] || $dbPlayer['strengths'] != $fePlayer['strengths'] || $dbPlayer['weaknesses'] != $fePlayer['weaknesses']) {
                // Hráč byl změněn
                $stmtUpdate->bind_param("i", $id);
                $stmtUpdate->execute();
                $stmtInsert->bind_param("issss", $id, $fePlayer['name'], $fePlayer['photoUrl'], $fePlayer['strengths'], $fePlayer['weaknesses']);
                $stmtInsert->execute();
            }
        } else { // Nový hráč
            $stmtInsert->bind_param("issss", $nextEntityId, $fePlayer['name'], $fePlayer['photoUrl'], $fePlayer['strengths'], $fePlayer['weaknesses']);
            $stmtInsert->execute();
            $nextEntityId++;
        }
    }
}


function handleGetData($conn) {
    $data = [
        'settings' => [],
        'playerDatabase' => [],
        'tournaments' => []
    ];

    // Načtení nastavení
    $settingsResult = $conn->query("SELECT setting_key, setting_value FROM settings WHERE valid_to IS NULL");
    while ($row = $settingsResult->fetch_assoc()) {
        $value = $row['setting_value'];
        if ($value === 'true') $value = true;
        if ($value === 'false') $value = false;
        $data['settings'][$row['setting_key']] = $value;
    }

    // Načtení hráčů
    $playersResult = $conn->query("SELECT entity_id as id, name, photo_url, strengths, weaknesses FROM players WHERE valid_to IS NULL ORDER BY entity_id");
    $data['playerDatabase'] = $playersResult->fetch_all(MYSQLI_ASSOC);

    // Načtení turnajů
    $tournamentsResult = $conn->query("SELECT entity_id as id, name, points_to_win, is_locked, valid_from as createdAt FROM tournaments WHERE valid_to IS NULL ORDER BY entity_id");
    $tournaments = $tournamentsResult->fetch_all(MYSQLI_ASSOC);
    
    // Načtení hráčů v turnajích a zápasů pro každý turnaj
    $tournamentPlayersStmt = $conn->prepare("SELECT player_id FROM tournament_players WHERE tournament_id = ? AND valid_to IS NULL ORDER BY player_order");
    $matchesStmt = $conn->prepare("SELECT entity_id as id, player1_id, player2_id, score1, score2, completed, first_server, serving_player FROM matches WHERE tournament_id = ? AND valid_to IS NULL ORDER BY match_order");

    foreach ($tournaments as &$tournament) {
        // Hráči
        $tournamentPlayersStmt->bind_param("i", $tournament['id']);
        $tournamentPlayersStmt->execute();
        $players = $tournamentPlayersStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $tournament['playerIds'] = array_column($players, 'player_id');
        
        // Zápasy
        $matchesStmt->bind_param("i", $tournament['id']);
        $matchesStmt->execute();
        $matches = $matchesStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $tournament['matches'] = $matches;
    }

    $data['tournaments'] = $tournaments;

    echo json_encode($data);
}


$conn->close();
