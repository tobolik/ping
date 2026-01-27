<?php
/**
 * Test připojení k databázi
 * Tento skript zkontroluje připojení pomocí MySQLi i PDO
 */

header("Content-Type: text/html; charset=UTF-8");
?>
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test připojení k databázi</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { color: green; background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .error { color: red; background: #f8d7da; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .info { color: #0c5460; background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        h2 { margin-top: 30px; }
    </style>
</head>
<body>
    <h1>🔍 Test připojení k databázi</h1>
    
    <?php
    // Zkontrolujme, zda existuje .env soubor
    $rootDir = dirname(__DIR__);
    $envFiles = [
        $rootDir . '/.env.production',
        $rootDir . '/.env.localhost',
        $rootDir . '/.env'
    ];
    
    echo '<div class="info">Kontrola .env souborů:</div>';
    echo '<pre>';
    foreach ($envFiles as $envFile) {
        $exists = file_exists($envFile);
        echo ($exists ? '✅' : '❌') . ' ' . htmlspecialchars($envFile) . ($exists ? ' (existuje)' : ' (neexistuje)') . "\n";
    }
    echo '</pre>';
    
    try {
        $config = require 'config/config.php';
        echo '<div class="info">✅ Konfigurace načtena úspěšně</div>';
        echo '<pre>';
        echo "DB_HOST: " . $config['db']['host'] . "\n";
        echo "DB_NAME: " . $config['db']['name'] . "\n";
        echo "DB_USER: " . $config['db']['user'] . "\n";
        echo "DB_PASS: " . (strlen($config['db']['pass']) > 0 ? str_repeat('*', strlen($config['db']['pass'])) : '(prázdné)') . "\n";
        echo "Charset: " . $config['db']['charset'] . "\n";
        echo '</pre>';
        
        // Zkontrolujme, zda se hodnoty načetly z .env nebo jsou výchozí
        if ($config['db']['user'] === 'root') {
            echo '<div class="error">⚠️ Upozornění: Používá se výchozí hodnota \'root\' místo hodnoty z .env souboru. Zkontrolujte, zda se .env soubor načítá správně.</div>';
        }
    } catch (Exception $e) {
        echo '<div class="error">❌ Chyba při načítání konfigurace: ' . htmlspecialchars($e->getMessage()) . '</div>';
        exit;
    }
    ?>

    <h2>1. Test připojení pomocí MySQLi</h2>
    <?php
    $mysqliSuccess = false;
    $mysqliError = null;
    
    try {
        $mysqli = new mysqli(
            $config['db']['host'],
            $config['db']['user'],
            $config['db']['pass'],
            $config['db']['name']
        );
        
        if ($mysqli->connect_error) {
            $mysqliError = $mysqli->connect_error;
            throw new Exception($mysqli->connect_error);
        }
        
        $mysqli->set_charset($config['db']['charset']);
        $mysqliSuccess = true;
        
        echo '<div class="success">✅ MySQLi připojení úspěšné!</div>';
        echo '<pre>';
        echo "Server info: " . $mysqli->server_info . "\n";
        echo "Host info: " . $mysqli->host_info . "\n";
        echo "Charset: " . $mysqli->character_set_name() . "\n";
        echo '</pre>';
        
        // Test dotazu
        $result = $mysqli->query("SELECT 1 as test");
        if ($result) {
            $row = $result->fetch_assoc();
            echo '<div class="success">✅ Test dotazu úspěšný (výsledek: ' . $row['test'] . ')</div>';
        }
        
        $mysqli->close();
        
    } catch (Exception $e) {
        echo '<div class="error">❌ MySQLi připojení selhalo: ' . htmlspecialchars($e->getMessage()) . '</div>';
        if (strpos($e->getMessage(), 'authentication method') !== false || 
            strpos($e->getMessage(), 'unknown to the client') !== false ||
            strpos($e->getMessage(), '2054') !== false) {
            echo '<div class="info">💡 Tato chyba obvykle znamená problém s metodou autentizace. Zkuste použít PDO (viz test níže).</div>';
        }
    }
    ?>

    <h2>2. Test připojení pomocí PDO</h2>
    <?php
    $pdoSuccess = false;
    $pdoError = null;
    
    // Zkusíme různé varianty připojení
    $pdoOptions = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$config['db']['charset']}"
    ];
    
    // Pro MariaDB/MySQL 8.0+ zkusíme přidat možnost pro mysql_native_password
    $dsnVariants = [
        "mysql:host={$config['db']['host']};dbname={$config['db']['name']};charset={$config['db']['charset']}",
        "mysql:host={$config['db']['host']};dbname={$config['db']['name']};charset={$config['db']['charset']};auth_plugin=mysql_native_password"
    ];
    
    $pdo = null;
    foreach ($dsnVariants as $index => $dsn) {
        try {
            echo '<div class="info">Zkouším variantu ' . ($index + 1) . ': ' . htmlspecialchars($dsn) . '</div>';
            $pdo = new PDO($dsn, $config['db']['user'], $config['db']['pass'], $pdoOptions);
        
            $pdoSuccess = true;
            
            echo '<div class="success">✅ PDO připojení úspěšné s variantou ' . ($index + 1) . '!</div>';
            echo '<pre>';
            echo "PDO Driver: " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) . "\n";
            echo "Server version: " . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n";
            echo "Client version: " . $pdo->getAttribute(PDO::ATTR_CLIENT_VERSION) . "\n";
            echo '</pre>';
            
            // Test dotazu
            $stmt = $pdo->query("SELECT 1 as test");
            $row = $stmt->fetch();
            echo '<div class="success">✅ Test dotazu úspěšný (výsledek: ' . $row['test'] . ')</div>';
            
            break; // Úspěšné připojení, ukončíme smyčku
            
        } catch (PDOException $e) {
            $pdoError = $e->getMessage();
            if ($index === 0) {
                echo '<div class="error">❌ Varianta ' . ($index + 1) . ' selhala: ' . htmlspecialchars($e->getMessage()) . '</div>';
            } else {
                echo '<div class="error">❌ Všechny varianty PDO připojení selhaly. Poslední chyba: ' . htmlspecialchars($e->getMessage()) . '</div>';
            }
        }
    }
    
    if (!$pdoSuccess) {
        echo '<div class="info">💡 Zkuste změnit metodu autentizace uživatele v MariaDB:<br>';
        echo '<code>ALTER USER \'' . htmlspecialchars($config['db']['user']) . '\'@\'localhost\' IDENTIFIED BY \'heslo\';</code><br>';
        echo 'Nebo pro MariaDB:<br>';
        echo '<code>SET PASSWORD FOR \'' . htmlspecialchars($config['db']['user']) . '\'@\'localhost\' = PASSWORD(\'heslo\');</code></div>';
    }
    ?>

    <h2>3. Test tabulek v databázi</h2>
    <?php
    if ($pdoSuccess || $mysqliSuccess) {
        $conn = $pdoSuccess ? $pdo : $mysqli;
        $isPDO = $pdoSuccess;
        
        try {
            if ($isPDO) {
                $stmt = $conn->query("SHOW TABLES");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } else {
                $result = $conn->query("SHOW TABLES");
                $tables = [];
                while ($row = $result->fetch_array()) {
                    $tables[] = $row[0];
                }
            }
            
            echo '<div class="success">✅ Nalezeno ' . count($tables) . ' tabulek:</div>';
            echo '<pre>';
            foreach ($tables as $table) {
                echo "- $table\n";
            }
            echo '</pre>';
            
            // Zkontrolujme klíčové tabulky
            $requiredTables = ['players', 'tournaments', 'tournament_players', 'matches', 'settings'];
            $missingTables = [];
            foreach ($requiredTables as $required) {
                if (!in_array($required, $tables)) {
                    $missingTables[] = $required;
                }
            }
            
            if (empty($missingTables)) {
                echo '<div class="success">✅ Všechny požadované tabulky jsou přítomny</div>';
            } else {
                echo '<div class="error">❌ Chybí následující tabulky: ' . implode(', ', $missingTables) . '</div>';
            }
            
        } catch (Exception $e) {
            echo '<div class="error">❌ Chyba při kontrole tabulek: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
    } else {
        echo '<div class="error">❌ Nelze zkontrolovat tabulky - žádné připojení není dostupné</div>';
    }
    ?>

    <h2>4. Shrnutí</h2>
    <div class="info">
        <strong>MySQLi:</strong> <?php echo $mysqliSuccess ? '✅ Funguje' : '❌ Ne funguje'; ?><br>
        <strong>PDO:</strong> <?php echo $pdoSuccess ? '✅ Funguje' : '❌ Ne funguje'; ?><br><br>
        <?php if ($mysqliSuccess && $pdoSuccess): ?>
            ✅ Obě metody připojení fungují správně!
        <?php elseif ($pdoSuccess && !$mysqliSuccess): ?>
            ⚠️ PDO funguje, ale MySQLi ne. API by mělo automaticky použít PDO.
        <?php elseif (!$mysqliSuccess && !$pdoSuccess): ?>
            ❌ Ani jedna metoda připojení nefunguje. Zkontrolujte údaje v .env souboru.
        <?php endif; ?>
    </div>

    <hr style="margin: 30px 0;">
    <p><small>Skript: test_db.php | Datum: <?php echo date('Y-m-d H:i:s'); ?></small></p>
</body>
</html>

