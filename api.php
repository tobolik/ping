<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$config = require 'config/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$conn = new mysqli($config['db']['host'], $config['db']['user'], $config['db']['pass'], $config['db']['name']);
if ($conn->connect_error) {
    http_response_code(500); echo json_encode(['error' => "Connection failed: " . $conn->connect_error]); exit();
}
$conn->set_charset($config['db']['charset']);

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    handleGetData($conn);
    exit();
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? null;
    $payload = $input['payload'] ?? null;

    if (!$action) {
        http_response_code(400); echo json_encode(['error' => 'Action not specified.']); exit();
    }

    $conn->begin_transaction();
    try {
        switch ($action) {
            case 'createTournament': handleCreateTournament($conn, $payload); break;
            case 'updateTournament': handleUpdateTournament($conn, $payload); break;
            case 'updateMatch': handleUpdateMatch($conn, $payload); break;
            case 'savePlayer': handleSavePlayer($conn, $payload); break;
            case 'deletePlayer': handleDeletePlayer($conn, $payload); break;
            case 'deleteTournament': handleDeleteTournament($conn, $payload); break;
            case 'saveSettings': handleSaveSettings($conn, $payload); break;
            case 'reorderMatches': 
                handleReorderMatches($conn, $payload);
                $conn->commit();
                echo json_encode(['success' => true]);
                exit();
            case 'swapSides':
                handleSwapSides($conn, $payload);
                $conn->commit();
                echo json_encode(['success' => true]);
                exit();
            case 'toggleTournamentLock':
                handleToggleTournamentLock($conn, $payload);
                $conn->commit();
                echo json_encode(['success' => true]);
                exit();
            default:
                http_response_code(400);
                throw new Exception("Unknown action: $action");
        }
        $conn->commit();
        handleGetData($conn);
    } catch (Exception $e) {
        $conn->rollback();
    http_response_code(500);
        echo json_encode(['error' => 'Operation failed: ' . $e->getMessage()]);
    }
    exit();
}

function handleSaveSettings($conn, $payload) {
    $key = $payload['key'] ?? null;
    $value = $payload['value'];

    if (!$key) return;

    // Najdeme existující záznam a jeho hodnotu
    $stmtFind = $conn->prepare("SELECT entity_id, setting_value FROM settings WHERE setting_key = ? AND valid_to IS NULL");
    $stmtFind->bind_param("s", $key);
    $stmtFind->execute();
    $result = $stmtFind->get_result();
    $existingSetting = $result->fetch_assoc();

    $dbValue = null;
    if ($existingSetting) {
        $dbValue = ($existingSetting['setting_value'] === 'true') ? true : (($existingSetting['setting_value'] === 'false') ? false : $existingSetting['setting_value']);
    }

    // Normalizujeme hodnoty pro porovnání (převod na boolean pro boolean hodnoty)
    // Pokud záznam neexistuje, $dbValue je null, takže vždy uložíme
    $shouldSave = false;
    if (!$existingSetting) {
        $shouldSave = true;
    } else {
        // Normalizujeme hodnoty pro porovnání
        $normalizedDbValue = is_bool($value) ? (bool)$dbValue : $dbValue;
        $normalizedValue = is_bool($value) ? (bool)$value : $value;
        $shouldSave = ($normalizedDbValue !== $normalizedValue);
    }

    // Ukládáme jen pokud je hodnota jiná, nebo pokud záznam neexistuje
    if ($shouldSave) {
        $entityId = null;
        if ($existingSetting) {
            $entityId = $existingSetting['entity_id'];
        } else {
            $result = $conn->query("SELECT MAX(entity_id) as max_id FROM `settings`");
            $entityId = ($result->fetch_assoc()['max_id'] ?? 0) + 1;
        }

        if($existingSetting) {
            $stmtUpdate = $conn->prepare("UPDATE settings SET valid_to = NOW() WHERE setting_key = ? AND valid_to IS NULL");
            $stmtUpdate->bind_param("s", $key);
            $stmtUpdate->execute();
        }

        $stringValue = is_bool($value) ? ($value ? 'true' : 'false') : strval($value);
        $stmtInsert = $conn->prepare("INSERT INTO settings (entity_id, setting_key, setting_value) VALUES (?, ?, ?)");
        $stmtInsert->bind_param("iss", $entityId, $key, $stringValue);
        $stmtInsert->execute();
    }
}


// --- HELPER ---
function getNextEntityId($conn, $tableName) {
    $result = $conn->query("SELECT MAX(entity_id) as max_id FROM `$tableName`");
    return ($result->fetch_assoc()['max_id'] ?? 0) + 1;
}

// --- AKCE ---

function handleReorderMatches($conn, $payload) {
    $matchIds = $payload['matchIds'] ?? [];
    if (empty($matchIds)) return;

    $stmt = $conn->prepare("UPDATE matches SET match_order = ? WHERE entity_id = ? AND valid_to IS NULL");
    foreach ($matchIds as $order => $matchId) {
        $stmt->bind_param("ii", $order, $matchId);
        $stmt->execute();
    }
}

function handleSwapSides($conn, $payload) {
    $matchId = $payload['matchId'] ?? null;
    if (!$matchId) return;
    $matchId = intval($matchId);

    // 1. Najdeme aktuální záznam
    $stmt = $conn->prepare("SELECT tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, match_order, sides_swapped FROM matches WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $matchId);
    $stmt->execute();
    $dbMatch = $stmt->get_result()->fetch_assoc();

    if ($dbMatch) {
        // 2. Zneplatníme starý záznam
        $stmtUpdate = $conn->prepare("UPDATE matches SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
        $stmtUpdate->bind_param("i", $matchId);
        $stmtUpdate->execute();

        // 3. Vložíme nový záznam s prohozenou hodnotou
        $newSidesSwapped = !$dbMatch['sides_swapped'];
        $stmtInsert = $conn->prepare("INSERT INTO matches (entity_id, tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, match_order, sides_swapped) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtInsert->bind_param("iiiiiiiiiii", 
            $matchId, 
            $dbMatch['tournament_id'], 
            $dbMatch['player1_id'], 
            $dbMatch['player2_id'], 
            $dbMatch['score1'], 
            $dbMatch['score2'], 
            $dbMatch['completed'], 
            $dbMatch['first_server'], 
            $dbMatch['serving_player'], 
            $dbMatch['match_order'], 
            $newSidesSwapped
        );
        $stmtInsert->execute();
    }
}

function handleCreateTournament($conn, $payload) {
    $tournamentEntityId = getNextEntityId($conn, 'tournaments');
    $stmt = $conn->prepare("INSERT INTO tournaments (entity_id, name, points_to_win, valid_from) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        throw new Exception("Chyba při přípravě dotazu pro turnaj: " . $conn->error);
    }
    $stmt->bind_param("isis", $tournamentEntityId, $payload['name'], $payload['pointsToWin'], $payload['createdAt']);
    if (!$stmt->execute()) {
        throw new Exception("Chyba při vytváření turnaje: " . $stmt->error);
    }
    
    // Získáme skutečné ID nově vytvořeného turnaje
    $tournamentId = $conn->insert_id;
    if (!$tournamentId || $tournamentId == 0) {
        throw new Exception("Nepodařilo se získat ID nově vytvořeného turnaje. insert_id: " . $conn->insert_id);
    }

    $nextTpEntityId = getNextEntityId($conn, 'tournament_players');
    $playerStmt = $conn->prepare("INSERT INTO tournament_players (entity_id, tournament_id, player_id, player_order) VALUES (?, ?, ?, ?)");
    if (!$playerStmt) {
        throw new Exception("Chyba při přípravě dotazu pro hráče turnaje: " . $conn->error);
    }
    foreach ($payload['playerIds'] as $order => $playerId) {
        $playerStmt->bind_param("iiii", $nextTpEntityId, $tournamentEntityId, $playerId, $order);
        if (!$playerStmt->execute()) {
            throw new Exception("Chyba při vkládání hráče do turnaje: " . $playerStmt->error);
        }
        $nextTpEntityId++;
    }

    $nextMatchEntityId = getNextEntityId($conn, 'matches');
    $matchStmt = $conn->prepare("INSERT INTO matches (entity_id, tournament_id, player1_id, player2_id, match_order, score1, score2) VALUES (?, ?, ?, ?, ?, 0, 0)");
    if (!$matchStmt) {
        throw new Exception("Chyba při přípravě dotazu pro zápasy: " . $conn->error);
    }
    $playerIds = $payload['playerIds'];
    $order = 0;
    for ($i = 0; $i < count($playerIds); $i++) {
        for ($j = $i + 1; $j < count($playerIds); $j++) {
            $matchStmt->bind_param("iiiii", $nextMatchEntityId, $tournamentEntityId, $playerIds[$i], $playerIds[$j], $order);
            if (!$matchStmt->execute()) {
                throw new Exception("Chyba při vkládání zápasu: " . $matchStmt->error);
            }
            $nextMatchEntityId++;
            $order++;
        }
    }
}

function handleToggleTournamentLock($conn, $payload) {
    $id = $payload['id'];
    if (!$id) return;

    $stmt = $conn->prepare("SELECT name, points_to_win, is_locked, valid_from FROM tournaments WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $dbTournament = $stmt->get_result()->fetch_assoc();

    if ($dbTournament) {
        $newIsLocked = !$dbTournament['is_locked'];

        $stmtUpdate = $conn->prepare("UPDATE tournaments SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
        $stmtUpdate->bind_param("i", $id);
        $stmtUpdate->execute();
        
        $stmtInsert = $conn->prepare("INSERT INTO tournaments (entity_id, name, points_to_win, is_locked, valid_from) VALUES (?, ?, ?, ?, ?)");
        $stmtInsert->bind_param("isiis", $id, $dbTournament['name'], $dbTournament['points_to_win'], $newIsLocked, $dbTournament['valid_from']);
        $stmtInsert->execute();
    }
}

function handleUpdateTournament($conn, $payload) {
    $id = $payload['id'];
    $data = $payload['data'];

    $stmt = $conn->prepare("SELECT name, points_to_win, is_locked FROM tournaments WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $dbTournament = $stmt->get_result()->fetch_assoc();

    if ($dbTournament && ($dbTournament['name'] != $data['name'] || $dbTournament['is_locked'] != $data['isLocked'])) {
        $stmtUpdate = $conn->prepare("UPDATE tournaments SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
        $stmtUpdate->bind_param("i", $id);
        $stmtUpdate->execute();
        
        $stmtInsert = $conn->prepare("INSERT INTO tournaments (entity_id, name, points_to_win, is_locked, valid_from) VALUES (?, ?, ?, ?, ?)");
        $stmtInsert->bind_param("isiis", $id, $data['name'], $data['pointsToWin'], $data['isLocked'], $data['createdAt']);
        $stmtInsert->execute();
    }

    $playerStmt = $conn->prepare("SELECT entity_id, player_id, player_order FROM tournament_players WHERE tournament_id = ? AND valid_to IS NULL ORDER BY player_order");
    $playerStmt->bind_param("i", $id);
    $playerStmt->execute();
    $dbPlayers = $playerStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $dbPlayerIds = array_column($dbPlayers, 'player_id');
    $newPlayerIds = $data['playerIds'];

    $playersChanged = count($dbPlayerIds) !== count($newPlayerIds) || !empty(array_diff($dbPlayerIds, $newPlayerIds)) || !empty(array_diff($newPlayerIds, $dbPlayerIds));

    if ($playersChanged) {
        $stmtInvalidateMatches = $conn->prepare("UPDATE matches SET valid_to = NOW() WHERE tournament_id = ? AND valid_to IS NULL");
        $stmtInvalidateMatches->bind_param("i", $id);
        $stmtInvalidateMatches->execute();
        
        $nextMatchEntityId = getNextEntityId($conn, 'matches');
        $matchStmt = $conn->prepare("INSERT INTO matches (entity_id, tournament_id, player1_id, player2_id, match_order, score1, score2) VALUES (?, ?, ?, ?, ?, 0, 0)");
        $order = 0;
        for ($i = 0; $i < count($newPlayerIds); $i++) {
            for ($j = $i + 1; $j < count($newPlayerIds); $j++) {
                $matchStmt->bind_param("iiiii", $nextMatchEntityId, $id, $newPlayerIds[$i], $newPlayerIds[$j], $order);
                $matchStmt->execute();
                $nextMatchEntityId++;
                $order++;
            }
        }

        $dbPlayerMap = []; 
        foreach ($dbPlayers as $p) {
            $dbPlayerMap[$p['player_id']] = ['entity_id' => $p['entity_id'], 'order' => $p['player_order']];
        }
        $newPlayerMap = array_flip($newPlayerIds);

        $playersToRemove = array_diff_key($dbPlayerMap, $newPlayerMap);
        if (!empty($playersToRemove)) {
            $stmtInvalidateRemoved = $conn->prepare("UPDATE tournament_players SET valid_to = NOW() WHERE entity_id = ?");
            foreach ($playersToRemove as $player) {
                $stmtInvalidateRemoved->bind_param("i", $player['entity_id']);
                $stmtInvalidateRemoved->execute();
            }
        }

        $nextTpEntityId = getNextEntityId($conn, 'tournament_players');
        $stmtInsertPlayer = $conn->prepare("INSERT INTO tournament_players (entity_id, tournament_id, player_id, player_order) VALUES (?, ?, ?, ?)");
        $stmtInvalidateReordered = $conn->prepare("UPDATE tournament_players SET valid_to = NOW() WHERE entity_id = ?");

        foreach ($newPlayerIds as $newOrder => $playerId) {
            if (!isset($dbPlayerMap[$playerId])) {
                $stmtInsertPlayer->bind_param("iiii", $nextTpEntityId, $id, $playerId, $newOrder);
                $stmtInsertPlayer->execute();
                $nextTpEntityId++;
            } else {
                $oldPlayerInfo = $dbPlayerMap[$playerId];
                if ($oldPlayerInfo['order'] != $newOrder) {
                    $stmtInvalidateReordered->bind_param("i", $oldPlayerInfo['entity_id']);
                    $stmtInvalidateReordered->execute();
                    
                    $stmtInsertPlayer->bind_param("iiii", $nextTpEntityId, $id, $playerId, $newOrder);
                    $stmtInsertPlayer->execute();
                    $nextTpEntityId++;
                }
            }
        }
    }
}

function handleUpdateMatch($conn, $payload) {
    $id = $payload['id'];
    $data = $payload['data'];
    
    $stmt = $conn->prepare("SELECT score1, score2, completed, first_server, serving_player, sides_swapped FROM matches WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $dbMatch = $stmt->get_result()->fetch_assoc();

    if (!$dbMatch) {
        error_log("handleUpdateMatch: Zápas s entity_id $id nebyl nalezen");
        return;
    }

    // Normalizace hodnot pro porovnání (NULL -> 0 nebo false)
    $dbFirstServer = $dbMatch['first_server'] ?? null;
    $dbServingPlayer = $dbMatch['serving_player'] ?? null;
    $dbSidesSwapped = $dbMatch['sides_swapped'] ?? 0;
    $dataFirstServer = $data['firstServer'] ?? null;
    $dataServingPlayer = $data['servingPlayer'] ?? null;
    $dataSidesSwapped = isset($data['sidesSwapped']) ? ($data['sidesSwapped'] ? 1 : 0) : 0;

    // Porovnání hodnot s podporou NULL
    $hasChanges = (
        intval($dbMatch['score1']) != intval($data['score1']) ||
        intval($dbMatch['score2']) != intval($data['score2']) ||
        intval($dbMatch['completed']) != intval($data['completed']) ||
        $dbFirstServer !== $dataFirstServer ||
        $dbServingPlayer !== $dataServingPlayer ||
        intval($dbSidesSwapped) != intval($dataSidesSwapped)
    );

    if ($hasChanges) {
        $stmtUpdate = $conn->prepare("UPDATE matches SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
        $stmtUpdate->bind_param("i", $id);
        $stmtUpdate->execute();

        $stmtInsert = $conn->prepare("INSERT INTO matches (entity_id, tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, match_order, sides_swapped) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtInsert->bind_param("iiiiiiiiiii", $id, $data['tournament_id'], $data['player1Id'], $data['player2Id'], $data['score1'], $data['score2'], $data['completed'], $dataFirstServer, $dataServingPlayer, $data['match_order'], $dataSidesSwapped);
        if (!$stmtInsert->execute()) {
            error_log("handleUpdateMatch: Chyba při vkládání nové verze zápasu: " . $stmtInsert->error);
            throw new Exception("Chyba při aktualizaci zápasu: " . $stmtInsert->error);
        }
    }
}

function handleSavePlayer($conn, $payload) {
    $id = $payload['id'] ?? null;
    $data = $payload['data'];
    
    if ($id) {
        $stmt = $conn->prepare("SELECT name, photo_url, strengths, weaknesses FROM players WHERE entity_id = ? AND valid_to IS NULL");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $dbPlayer = $stmt->get_result()->fetch_assoc();
        
        if ($dbPlayer && ($dbPlayer['name'] != $data['name'] || $dbPlayer['photo_url'] != $data['photoUrl'] || $dbPlayer['strengths'] != $data['strengths'] || $dbPlayer['weaknesses'] != $data['weaknesses'])) {
            $stmtUpdate = $conn->prepare("UPDATE players SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
            $stmtUpdate->bind_param("i", $id);
            $stmtUpdate->execute();

            $stmtInsert = $conn->prepare("INSERT INTO players (entity_id, name, photo_url, strengths, weaknesses) VALUES (?, ?, ?, ?, ?)");
            $stmtInsert->bind_param("issss", $id, $data['name'], $data['photoUrl'], $data['strengths'], $data['weaknesses']);
            $stmtInsert->execute();
        }
} else {
        $nextEntityId = getNextEntityId($conn, 'players');
        $stmtInsert = $conn->prepare("INSERT INTO players (entity_id, name, photo_url, strengths, weaknesses) VALUES (?, ?, ?, ?, ?)");
        $stmtInsert->bind_param("issss", $nextEntityId, $data['name'], $data['photoUrl'], $data['strengths'], $data['weaknesses']);
        $stmtInsert->execute();
    }
}

function handleDeletePlayer($conn, $payload) {
    $id = $payload['id'];
    if (!$id) return;
    $stmt = $conn->prepare("UPDATE players SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
}

function handleDeleteTournament($conn, $payload) {
    $id = $payload['id'];
    if (!$id) return;
    $stmt = $conn->prepare("UPDATE tournaments SET valid_to = NOW() WHERE entity_id = ? AND valid_to IS NULL");
    $stmt->bind_param("i", $id);
    $stmt->execute();
}

// --- GET DATA ---
function handleGetData($conn) {
    $data = [
        'settings' => [],
        'playerDatabase' => [],
        'tournaments' => []
    ];

    // Načteme jen nejnovější záznamy pro každé nastavení (podle entity_id, protože entity_id se zvyšuje)
    $settingsResult = $conn->query("
        SELECT s1.setting_key, s1.setting_value 
        FROM settings s1
        INNER JOIN (
            SELECT setting_key, MAX(entity_id) as max_entity_id
            FROM settings
            WHERE valid_to IS NULL
            GROUP BY setting_key
        ) s2 ON s1.setting_key = s2.setting_key AND s1.entity_id = s2.max_entity_id
        WHERE s1.valid_to IS NULL
    ");
    while ($row = $settingsResult->fetch_assoc()) {
        $value = $row['setting_value'];
        $data['settings'][$row['setting_key']] = ($value === 'true') ? true : (($value === 'false') ? false : $value);
    }

    $playersResult = $conn->query("SELECT entity_id as id, name, photo_url, strengths, weaknesses FROM players WHERE valid_to IS NULL ORDER BY entity_id");
    $data['playerDatabase'] = $playersResult->fetch_all(MYSQLI_ASSOC);

    $tournamentsResult = $conn->query("SELECT entity_id as id, name, points_to_win, is_locked, valid_from as createdAt FROM tournaments WHERE valid_to IS NULL ORDER BY entity_id");
    $tournaments = $tournamentsResult->fetch_all(MYSQLI_ASSOC);
    
    $tournamentPlayersStmt = $conn->prepare("SELECT player_id FROM tournament_players WHERE tournament_id = ? AND valid_to IS NULL ORDER BY player_order");
    $matchesStmt = $conn->prepare("SELECT entity_id as id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, sides_swapped FROM matches WHERE tournament_id = ? AND valid_to IS NULL ORDER BY match_order ASC, id ASC");

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
