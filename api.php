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
} else {
    $response = ['status' => 'success', 'message' => 'API is working, but no action taken for this request method.'];
    echo json_encode($response);
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
