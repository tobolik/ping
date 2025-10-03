<?php
// Jednoduchý test API připojení
require_once 'config/config.php';

echo "=== API Test ===\n";
echo "DB Host: " . DB_HOST . "\n";
echo "DB Name: " . DB_NAME . "\n";
echo "DB User: " . DB_USER . "\n";
echo "CORS Origin: " . CORS_ORIGIN . "\n";
echo "Debug Mode: " . (DEBUG_MODE ? 'ON' : 'OFF') . "\n\n";

// Test databázového připojení
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Databázové připojení: ÚSPĚŠNÉ\n";
    
    // Test tabulek
    $tables = ['players', 'tournaments', 'tournament_players', 'matches', 'settings'];
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            echo "✅ Tabulka $table: $count záznamů\n";
        } catch (Exception $e) {
            echo "❌ Tabulka $table: CHYBA - " . $e->getMessage() . "\n";
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Databázové připojení: CHYBA - " . $e->getMessage() . "\n";
}

echo "\n=== Test API endpoint ===\n";
try {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost/api.php');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo "❌ CURL Error: $error\n";
    } else {
        echo "HTTP Code: $httpCode\n";
        if ($httpCode === 200) {
            echo "✅ API Response: " . substr($response, 0, 200) . "...\n";
        } else {
            echo "❌ API Error: $response\n";
        }
    }
} catch (Exception $e) {
    echo "❌ API Test Error: " . $e->getMessage() . "\n";
}
?>
