<?php
// Jednoduchý test databáze
header('Content-Type: text/plain');

try {
    $config = require __DIR__ . '/config/config.php';
    echo "Config loaded successfully\n";
    echo "Host: " . $config['db']['host'] . "\n";
    echo "Database: " . $config['db']['name'] . "\n";
    echo "User: " . $config['db']['user'] . "\n";
    
    $db = new PDO(
        "mysql:host=" . $config['db']['host'] . ";dbname=" . $config['db']['name'] . ";charset=utf8mb4",
        $config['db']['user'],
        $config['db']['pass']
    );
    echo "Database connection successful\n";
    
    // Test tabulek
    $tables = ['players', 'tournaments', 'tournament_players', 'matches', 'settings'];
    foreach ($tables as $table) {
        $result = $db->query("SHOW TABLES LIKE '$table'");
        if ($result->rowCount() > 0) {
            echo "Table '$table' exists\n";
        } else {
            echo "Table '$table' MISSING\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
