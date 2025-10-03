<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$config = require 'config/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$conn = new mysqli($config['db']['host'], $config['db']['user'], $config['db']['pass'], $config['db']['name']);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => "Connection failed: " . $conn->connect_error]);
    exit();
}
$conn->set_charset($config['db']['charset']);

// --- ROUTER ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    handleGetData($conn);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? null;
    $payload = $input['payload'] ?? null;

    if (!$action) {
        http_response_code(400);
        echo json_encode(['error' => 'Action not specified.']);
        exit();
    }

    try {
        switch ($action) {
            case 'createTournament':
                handleCreateTournament($conn, $payload);
                break;
            case 'savePlayer':
                handleSavePlayer($conn, $payload);
                break;
            case 'deletePlayer':
                handleDeletePlayer($conn, $payload);
                break;
            case 'deleteTournament':
                handleDeleteTournament($conn, $payload);
                break;
            case 'updateTournament':
                handleUpdateTournament($conn, $payload);
                break;
            case 'updateMatch':
                handleUpdateMatch($conn, $payload);
                break;
            // Zde budou další akce (updateMatch, atd.)
            default:
                http_response_code(400);
                echo json_encode(['error' => "Unknown action: $action"]);
                break;
        }
        // Po každé úspěšné akci vrátíme čerstvá data
        handleGetData($conn);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Operation failed: ' . $e->getMessage()]);
    }
    exit();
}


// --- AKCE ---

function handleCreateTournament($conn, $payload) {
    $conn->begin_transaction();
    try {
        // 1. Vytvořit turnaj a získat jeho ID
        $stmt = $conn->prepare("INSERT INTO tournaments (name, points_to_win, is_locked, valid_from) VALUES (?, ?, 0, ?)");
        $stmt->bind_param("sis", $payload['name'], $payload['pointsToWin'], $payload['createdAt']);
        $stmt->execute();
        $tournamentEntityId = $conn->insert_id; // Získáme auto-increment ID, které použijeme jako entity_id

        // Aktualizujeme entity_id pro právě vložený záznam
        $conn->query("UPDATE tournaments SET entity_id = $tournamentEntityId WHERE id = $tournamentEntityId");

        // 2. Vložit hráče do turnaje
        $playerStmt = $conn->prepare("INSERT INTO tournament_players (tournament_id, player_id, player_order) VALUES (?, ?, ?)");
        foreach ($payload['playerIds'] as $order => $playerId) {
            $playerStmt->bind_param("iii", $tournamentEntityId, $playerId, $order);
            $playerStmt->execute();
            // Zde také nastavíme entity_id pro každý záznam
            $tpId = $conn->insert_id;
            $conn->query("UPDATE tournament_players SET entity_id = $tpId WHERE id = $tpId");
        }

        // 3. Vygenerovat a vložit zápasy
        $matchStmt = $conn->prepare("INSERT INTO matches (tournament_id, player1_id, player2_id, match_order) VALUES (?, ?, ?, ?)");
        $playerIds = $payload['playerIds'];
        $order = 0;
        for ($i = 0; $i < count($playerIds); $i++) {
            for ($j = $i + 1; $j < count($playerIds); $j++) {
                $matchStmt->bind_param("iiii", $tournamentEntityId, $playerIds[$i], $playerIds[$j], $order);
                $matchStmt->execute();
                 // Zde také nastavíme entity_id pro každý záznam
                $mId = $conn->insert_id;
                $conn->query("UPDATE matches SET entity_id = $mId WHERE id = $mId");
                $order++;
            }
        }
        
        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        throw $e; // Předáme výjimku výše, aby se správně odeslala chybová odpověď
    }
}

function handleUpdateTournament($conn, $payload) {
    $conn->begin_transaction();
    try {
        $id = $payload['id'];
        $data = $payload['data'];

        // Načíst aktuální stav turnaje a porovnat
        $stmt = $conn->prepare("SELECT name, points_to_win, is_locked FROM tournaments WHERE entity_id = ? AND valid_to IS NULL");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $dbTournament = $stmt->get_result()->fetch_assoc();

        if ($dbTournament['name'] != $data['name'] || $dbTournament['points_to_win'] != $data['pointsToWin'] || $dbTournament['is_locked'] != $data['isLocked']) {
            $stmtUpdate = $conn->prepare("UPDATE tournaments SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
            $stmtUpdate->bind_param("i", $id);
            $stmtUpdate->execute();
            
            $stmtInsert = $conn->prepare("INSERT INTO tournaments (entity_id, name, points_to_win, is_locked, valid_from) VALUES (?, ?, ?, ?, ?)");
            $stmtInsert->bind_param("isiis", $id, $data['name'], $data['pointsToWin'], $data['isLocked'], $data['createdAt']);
            $stmtInsert->execute();
        }

        // Zkontrolovat, zda se změnili hráči
        $playerStmt = $conn->prepare("SELECT player_id FROM tournament_players WHERE tournament_id = ? AND valid_to IS NULL ORDER BY player_order");
        $playerStmt->bind_param("i", $id);
        $playerStmt->execute();
        $dbPlayerIds = array_column($playerStmt->get_result()->fetch_all(MYSQLI_ASSOC), 'player_id');

        if (count($dbPlayerIds) !== count($data['playerIds']) || !empty(array_diff($dbPlayerIds, $data['playerIds']))) {
            // Hráči se změnili -> přegenerovat hráče i zápasy
            $stmtInvalidatePlayers = $conn->prepare("UPDATE tournament_players SET valid_to = NOW() WHERE tournament_id = ? AND valid_to IS NULL");
            $stmtInvalidatePlayers->bind_param("i", $id);
            $stmtInvalidatePlayers->execute();

            $stmtInsertPlayer = $conn->prepare("INSERT INTO tournament_players (tournament_id, player_id, player_order) VALUES (?, ?, ?)");
            foreach ($data['playerIds'] as $order => $playerId) {
                $stmtInsertPlayer->bind_param("iii", $id, $playerId, $order);
                $stmtInsertPlayer->execute();
                $tpId = $conn->insert_id;
                $conn->query("UPDATE tournament_players SET entity_id = $tpId WHERE id = $tpId");
            }

            $stmtInvalidateMatches = $conn->prepare("UPDATE matches SET valid_to = NOW() WHERE tournament_id = ? AND valid_to IS NULL");
            $stmtInvalidateMatches->bind_param("i", $id);
            $stmtInvalidateMatches->execute();

            $matchStmt = $conn->prepare("INSERT INTO matches (tournament_id, player1_id, player2_id, match_order) VALUES (?, ?, ?, ?)");
            $playerIds = $data['playerIds'];
            $order = 0;
            for ($i = 0; $i < count($playerIds); $i++) {
                for ($j = $i + 1; $j < count($playerIds); $j++) {
                    $matchStmt->bind_param("iiii", $id, $playerIds[$i], $playerIds[$j], $order);
                    $matchStmt->execute();
                    $mId = $conn->insert_id;
                    $conn->query("UPDATE matches SET entity_id = $mId WHERE id = $mId");
                    $order++;
                }
            }
        }
        
        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function handleUpdateMatch($conn, $payload) {
    $id = $payload['id'];
    $data = $payload['data'];

    // Načíst a porovnat
    $stmt = $conn->prepare("SELECT score1, score2, completed, first_server, serving_player FROM matches WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $dbMatch = $stmt->get_result()->fetch_assoc();

    if (!$dbMatch || $dbMatch['score1'] != $data['score1'] || $dbMatch['score2'] != $data['score2'] || $dbMatch['completed'] != $data['completed'] || $dbMatch['first_server'] != $data['firstServer'] || $dbMatch['serving_player'] != $data['servingPlayer']) {
        $stmtUpdate = $conn->prepare("UPDATE matches SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
        $stmtUpdate->bind_param("i", $id);
        $stmtUpdate->execute();

        $stmtInsert = $conn->prepare("INSERT INTO matches (entity_id, tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, match_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtInsert->bind_param("iiiiiiiiii", $id, $data['tournament_id'], $data['player1Id'], $data['player2Id'], $data['score1'], $data['score2'], $data['completed'], $data['firstServer'], $data['servingPlayer'], $data['match_order']);
        $stmtInsert->execute();
    }
}

function handleSavePlayer($conn, $payload) {
    $id = $payload['id'] ?? null;
    $data = $payload['data'];
    
    if ($id) { // Úprava existujícího
        // Načíst a porovnat
        $stmt = $conn->prepare("SELECT name, photo_url, strengths, weaknesses FROM players WHERE entity_id = ? AND valid_to IS NULL");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $dbPlayer = $stmt->get_result()->fetch_assoc();
        
        if (!$dbPlayer || $dbPlayer['name'] != $data['name'] || $dbPlayer['photo_url'] != $data['photoUrl'] || $dbPlayer['strengths'] != $data['strengths'] || $dbPlayer['weaknesses'] != $data['weaknesses']) {
            $stmtUpdate = $conn->prepare("UPDATE players SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
            $stmtUpdate->bind_param("i", $id);
            $stmtUpdate->execute();

            $stmtInsert = $conn->prepare("INSERT INTO players (entity_id, name, photo_url, strengths, weaknesses) VALUES (?, ?, ?, ?, ?)");
            $stmtInsert->bind_param("issss", $id, $data['name'], $data['photoUrl'], $data['strengths'], $data['weaknesses']);
            $stmtInsert->execute();
        }
    } else { // Vytvoření nového
        $stmtInsert = $conn->prepare("INSERT INTO players (name, photo_url, strengths, weaknesses) VALUES (?, ?, ?, ?)");
        $stmtInsert->bind_param("ssss", $data['name'], $data['photoUrl'], $data['strengths'], $data['weaknesses']);
        $stmtInsert->execute();
        $newId = $conn->insert_id;
        $conn->query("UPDATE players SET entity_id = $newId WHERE id = $newId");
    }
}

function handleDeletePlayer($conn, $payload) {
    $id = $payload['id'];
    $stmt = $conn->prepare("UPDATE players SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
}

function handleDeleteTournament($conn, $payload) {
    $id = $payload['id'];
    $stmt = $conn->prepare("UPDATE tournaments SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
}


// --- NAČÍTÁNÍ DAT ---

function handleGetData($conn) {
    $data = [
        'settings' => [],
        'playerDatabase' => [],
        'tournaments' => []
    ];

    $settingsResult = $conn->query("SELECT setting_key, setting_value FROM settings WHERE valid_to IS NULL");
    while ($row = $settingsResult->fetch_assoc()) {
        $value = $row['setting_value'];
        $data['settings'][$row['setting_key']] = ($value === 'true') ? true : (($value === 'false') ? false : $value);
    }

    $playersResult = $conn->query("SELECT entity_id as id, name, photo_url, strengths, weaknesses FROM players WHERE valid_to IS NULL ORDER BY entity_id");
    $data['playerDatabase'] = $playersResult->fetch_all(MYSQLI_ASSOC);

    $tournamentsResult = $conn->query("SELECT entity_id as id, name, points_to_win, is_locked, valid_from as createdAt FROM tournaments WHERE valid_to IS NULL ORDER BY entity_id");
    $tournaments = $tournamentsResult->fetch_all(MYSQLI_ASSOC);
    
    $tournamentPlayersStmt = $conn->prepare("SELECT player_id FROM tournament_players WHERE tournament_id = ? AND valid_to IS NULL ORDER BY player_order");
    $matchesStmt = $conn->prepare("SELECT entity_id as id, player1_id, player2_id, score1, score2, completed, first_server, serving_player FROM matches WHERE tournament_id = ? AND valid_to IS NULL ORDER BY match_order");

    foreach ($tournaments as &$tournament) {
        $t_id = intval($tournament['id']);
        $tournamentPlayersStmt->bind_param("i", $t_id);
        $tournamentPlayersStmt->execute();
        $players = $tournamentPlayersStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $tournament['playerIds'] = array_column($players, 'player_id');
        
        $matchesStmt->bind_param("i", $t_id);
        $matchesStmt->execute();
        $matches = $matchesStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $tournament['matches'] = $matches;
    }

    $data['tournaments'] = $tournaments;

    echo json_encode($data);
}

$conn->close();
