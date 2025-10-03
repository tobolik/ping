<?php
header('Content-Type: application/json');

// Test připojení k databázi
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'sensiocz02');
define('DB_USER', 'sensiocz003');
define('DB_PASS', 'NSLGKL13');

try {
    $db = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS
    );
    echo json_encode([
        'status' => 'OK',
        'message' => 'Připojení k databázi funguje!'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'ERROR',
        'message' => $e->getMessage()
    ]);
}
?>