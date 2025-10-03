<?php
// Import dat z JSON souboru do databáze
// Použití: Nahrajte JSON soubor a otevřete tento skript v prohlížeči

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Načtení konfigurace
$config = require __DIR__ . '/config.php';

try {
    $db = new PDO(
        "mysql:host=" . $config['db']['host'] . ";dbname=" . $config['db']['name'] . ";charset=utf8mb4",
        $config['db']['user'],
        $config['db']['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
    
    echo "<h1>Import dat z JSON</h1>";
    
    // Načtení JSON souboru
    $jsonFile = __DIR__ . '/ping-pong-turnaje.json';
    
    if (!file_exists($jsonFile)) {
        die("<p style='color: red;'>Soubor 'ping-pong-turnaje.json' nebyl nalezen. Nahrajte ho do stejné složky jako tento skript.</p>");
    }
    
    $jsonData = file_get_contents($jsonFile);
    $data = json_decode($jsonData, true);
    
    if (!$data) {
        die("<p style='color: red;'>Chyba při čtení JSON souboru.</p>");
    }
    
    echo "<h2>Začínám import...</h2>";
    
    $db->beginTransaction();
    
    // 1. Import nastavení
    echo "<h3>1. Import nastavení</h3>";
    if (isset($data['settings']['soundsEnabled'])) {
        $stmt = $db->prepare("
            INSERT INTO settings (setting_key, setting_value) 
            VALUES ('sounds_enabled', ?) 
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ");
        $stmt->execute([$data['settings']['soundsEnabled'] ? 'true' : 'false']);
        echo "<p>✓ Nastavení zvuků importováno</p>";
    }
    
    // 2. Import hráčů
    echo "<h3>2. Import hráčů</h3>";
    $playerIdMap = []; // Mapa starých ID na nové ID
    
    foreach ($data['playerDatabase'] as $player) {
        // Zkontrolujeme, zda hráč již existuje (podle jména)
        $stmt = $db->prepare("SELECT id FROM players WHERE name = ?");
        $stmt->execute([$player['name']]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            $playerIdMap[$player['id']] = $existing['id'];
            echo "<p>○ Hráč '{$player['name']}' již existuje (ID: {$existing['id']})</p>";
        } else {
            $stmt = $db->prepare("
                INSERT INTO players (name, photo_url, strengths, weaknesses) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                $player['name'],
                $player['photoUrl'] ?? '',
                $player['strengths'] ?? '',
                $player['weaknesses'] ?? ''
            ]);
            
            $newId = $db->lastInsertId();
            $playerIdMap[$player['id']] = $newId;
            echo "<p>✓ Hráč '{$player['name']}' importován (staré ID: {$player['id']}, nové ID: {$newId})</p>";
        }
    }
    
    // 3. Import turnajů
    echo "<h3>3. Import turnajů</h3>";
    
    foreach ($data['tournaments'] as $tournament) {
        // Vytvoření turnaje
        $stmt = $db->prepare("
            INSERT INTO tournaments (name, points_to_win, is_locked, created_at) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $tournament['name'],
            $tournament['pointsToWin'],
            $tournament['isLocked'] ? 1 : 0,
            $tournament['createdAt']
        ]);
        
        $tournamentId = $db->lastInsertId();
        echo "<p><strong>✓ Turnaj '{$tournament['name']}' importován (ID: {$tournamentId})</strong></p>";
        
        // Import hráčů turnaje
        $stmt = $db->prepare("
            INSERT INTO tournament_players (tournament_id, player_id, player_order) 
            VALUES (?, ?, ?)
        ");
        
        foreach ($tournament['playerIds'] as $order => $oldPlayerId) {
            $newPlayerId = $playerIdMap[$oldPlayerId];
            $stmt->execute([$tournamentId, $newPlayerId, $order]);
        }
        echo "<p>&nbsp;&nbsp;→ Přidáno " . count($tournament['playerIds']) . " hráčů do turnaje</p>";
        
        // Import zápasů
        $stmt = $db->prepare("
            INSERT INTO matches 
            (tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, match_order) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $matchCount = 0;
        foreach ($tournament['matches'] as $order => $match) {
            $stmt->execute([
                $tournamentId,
                $playerIdMap[$match['player1Id']],
                $playerIdMap[$match['player2Id']],
                $match['score1'],
                $match['score2'],
                $match['completed'] ? 1 : 0,
                $match['firstServer'] ?? null,
                $match['servingPlayer'] ?? null,
                $order
            ]);
            $matchCount++;
        }
        echo "<p>&nbsp;&nbsp;→ Importováno {$matchCount} zápasů</p>";
    }
    
    $db->commit();
    
    echo "<h2 style='color: green;'>✓ Import úspěšně dokončen!</h2>";
    echo "<p><a href='index.html'>→ Přejít do aplikace</a></p>";
    
    // Zobrazení statistik
    echo "<h3>Statistiky:</h3>";
    echo "<ul>";
    echo "<li>Hráčů: " . count($data['playerDatabase']) . "</li>";
    echo "<li>Turnajů: " . count($data['tournaments']) . "</li>";
    
    $totalMatches = 0;
    foreach ($data['tournaments'] as $t) {
        $totalMatches += count($t['matches']);
    }
    echo "<li>Celkem zápasů: {$totalMatches}</li>";
    echo "</ul>";
    
    echo "<p style='color: orange;'><strong>Poznámka:</strong> Můžete nyní smazat soubor 'import.php' a JSON soubor z bezpečnostních důvodů.</p>";
    
} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "<h2 style='color: red;'>Chyba při importu:</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "<h2 style='color: red;'>Chyba:</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>