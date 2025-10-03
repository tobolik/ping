<?php
require_once __DIR__ . '/../config/config.php';

// Tento skript vymaže stávající data a naimportuje čistá data z JSON souboru.
// Je to užitečné pro resetování databáze do známého stavu pro testování.

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Úspěšně připojeno k databázi.\n";
} catch (PDOException $e) {
    die("Chyba připojení k databázi: " . $e->getMessage() . "\n");
}

// 1. Vymazání stávajících dat
echo "Mažu stávající data...\n";
try {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE `matches`;");
    $pdo->exec("TRUNCATE TABLE `tournament_players`;");
    $pdo->exec("TRUNCATE TABLE `tournaments`;");
    $pdo->exec("TRUNCATE TABLE `players`;");
    $pdo->exec("TRUNCATE TABLE `settings`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "Všechny tabulky byly vymazány.\n";
} catch (PDOException $e) {
    die("Chyba při mazání tabulek: " . $e->getMessage() . "\n");
}

// 2. Načtení dat z JSON souboru
$jsonFile = __DIR__ . '/../data/ping-pong-turnaje.json';
if (!file_exists($jsonFile)) {
    die("Chyba: Soubor {$jsonFile} nebyl nalezen.\n");
}
$jsonData = json_decode(file_get_contents($jsonFile), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("Chyba: JSON soubor je neplatný: " . json_last_error_msg() . "\n");
}
echo "JSON data byla úspěšně načtena.\n";

// 3. Import dat
try {
    $pdo->beginTransaction();

    // Import hráčů
    echo "Importuji hráče...\n";
    $playerStmt = $pdo->prepare(
        "INSERT INTO `players` (id, entity_id, name, photo_url, strengths, weaknesses, valid_from) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())"
    );
    foreach ($jsonData['playerDatabase'] as $player) {
        $playerStmt->execute([
            $player['id'],
            $player['id'], // entity_id je stejné jako původní id
            $player['name'],
            $player['photoUrl'] ?? '',
            $player['strengths'] ?? '',
            $player['weaknesses'] ?? ''
        ]);
    }
    echo "Hráči byli naimportováni (" . count($jsonData['playerDatabase']) . " záznamů).\n";

    // Import turnajů
    echo "Importuji turnaje a zápasy...\n";
    $tournamentStmt = $pdo->prepare(
        "INSERT INTO `tournaments` (id, entity_id, name, points_to_win, is_locked, valid_from) 
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $tpStmt = $pdo->prepare(
        "INSERT INTO `tournament_players` (tournament_id, player_id, player_order, valid_from) 
         VALUES (?, ?, ?, NOW())"
    );
    $matchStmt = $pdo->prepare(
        "INSERT INTO `matches` (id, entity_id, tournament_id, player1_id, player2_id, score1, score2, completed, first_server, serving_player, match_order, valid_from) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );

    $matchIdCounter = 1;
    foreach ($jsonData['tournaments'] as $tournament) {
        // Vložení turnaje
        $createdAt = date('Y-m-d H:i:s', strtotime($tournament['createdAt']));
        $tournamentStmt->execute([
            $tournament['id'],
            $tournament['id'], // entity_id
            $tournament['name'],
            $tournament['pointsToWin'],
            $tournament['isLocked'] ? 1 : 0,
            $createdAt
        ]);

        // Vložení hráčů do turnaje (tournament_players)
        foreach ($tournament['playerIds'] as $order => $playerId) {
            $tpStmt->execute([
                $tournament['id'], // tournament_entity_id
                $playerId,         // player_entity_id
                $order
            ]);
        }

        // Vložení zápasů
        foreach ($tournament['matches'] as $order => $match) {
            $matchStmt->execute([
                $matchIdCounter,   // Nové unikátní `id`
                $matchIdCounter,   // Nové unikátní `entity_id`
                $tournament['id'], // tournament_entity_id
                $match['player1Id'],
                $match['player2Id'],
                $match['score1'],
                $match['score2'],
                $match['completed'] ? 1 : 0,
                $match['firstServer'] ?? null,
                $match['servingPlayer'] ?? null,
                $order
            ]);
            $matchIdCounter++;
        }
    }
    echo "Turnaje a jejich data byly naimportovány (" . count($jsonData['tournaments']) . " záznamů).\n";

    // Import nastavení
    echo "Importuji nastavení...\n";
    $settingsStmt = $pdo->prepare(
        "INSERT INTO `settings` (setting_key, setting_value, valid_from) 
         VALUES (?, ?, NOW())"
    );
    foreach ($jsonData['settings'] as $key => $value) {
        $settingsStmt->execute([$key, is_bool($value) ? ($value ? 'true' : 'false') : $value]);
    }
    echo "Nastavení bylo naimportováno.\n";

    $pdo->commit();
    echo "\n-------------------------------------\n";
    echo "VŠECHNO HOTOVO! Databáze byla úspěšně resetována a naplněna daty.\n";

} catch (PDOException $e) {
    $pdo->rollBack();
    die("Chyba při importu dat: " . $e->getMessage() . "\n");
}

?>
