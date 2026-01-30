<?php
// migrate.php - Jednorázový skript pro import SQL databáze
// PO POUŽITÍ SMAZAT!

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('memory_limit', '512M');
set_time_limit(300); // 5 minut limit

$config = require 'config/config.php';

$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['sql_file'])) {
    $file = $_FILES['sql_file'];
    
    if ($file['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if ($ext === 'sql') {
            // Připojení k DB
            $mysqli = new mysqli(
                $config['db']['host'],
                $config['db']['user'],
                $config['db']['pass'],
                $config['db']['name']
            );

            if ($mysqli->connect_error) {
                $message = "Chyba připojení k DB: " . $mysqli->connect_error;
                $messageType = "error";
            } else {
                $mysqli->set_charset("utf8mb4");
                
                // Přečtení obsahu souboru
                $sqlContent = file_get_contents($file['tmp_name']);
                
                // Odstranění blokových komentářů /* ... */
                $sqlContent = preg_replace('!/\*.*?\*/!s', '', $sqlContent);
                
                // Vypnutí kontroly cizích klíčů pro hladký import
                $mysqli->query("SET FOREIGN_KEY_CHECKS = 0");
                
                // Rozdělení na jednotlivé příkazy
                $queries = [];
                $lines = explode("\n", $sqlContent);
                $query = "";
                
                foreach ($lines as $line) {
                    $trimLine = trim($line);
                    // Přeskočení prázdných řádků a řádkových komentářů
                    if ($trimLine === "" || strpos($trimLine, "--") === 0 || strpos($trimLine, "#") === 0) {
                        continue;
                    }
                    
                    $query .= $line . "\n";
                    if (substr(trim($line), -1) === ";") {
                        $queries[] = $query;
                        $query = "";
                    }
                }
                
                $successCount = 0;
                $errorCount = 0;
                $firstError = "";

                foreach ($queries as $q) {
                    $trimmedQ = trim($q);
                    if (!empty($trimmedQ)) {
                        if ($mysqli->query($trimmedQ)) {
                            $successCount++;
                        } else {
                            $errorCount++;
                            if (!$firstError) $firstError = $mysqli->error;
                        }
                    }
                }
                
                $mysqli->query("SET FOREIGN_KEY_CHECKS = 1");
                $mysqli->close();
                
                if ($errorCount === 0) {
                    $message = "Migrace úspěšná! Provedeno $successCount dotazů.";
                    $messageType = "success";
                } else {
                    $message = "Migrace dokončena s chybami. Úspěšných: $successCount, Chyb: $errorCount. První chyba: $firstError";
                    $messageType = "warning";
                }
            }
        } else {
            $message = "Prosím nahrajte soubor s příponou .sql";
            $messageType = "error";
        }
    } else {
        $message = "Chyba při nahrávání souboru: " . $file['error'];
        $messageType = "error";
    }
}
?>

<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DB Migrace</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">🚀 Import databáze</h1>
        
        <?php if ($message): ?>
            <div class="mb-4 p-4 rounded-lg <?php echo $messageType === 'success' ? 'bg-green-100 text-green-700' : ($messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'); ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>

        <form method="post" enctype="multipart/form-data" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Vyberte .sql soubor (export z ostré DB)</label>
                <input type="file" name="sql_file" accept=".sql" required 
                    class="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 cursor-pointer border rounded-lg p-2">
            </div>
            
            <div class="pt-4">
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                    Nahrát a migrovat
                </button>
            </div>
        </form>
        
        <div class="mt-6 text-center text-xs text-gray-500 border-t pt-4">
            <p class="font-bold text-red-500">⚠ VAROVÁNÍ</p>
            <p>Po dokončení migrace tento soubor (migrate.php) smažte!</p>
            <p class="mt-2">Host: <?php echo htmlspecialchars($config['db']['host']); ?></p>
            <p>DB: <?php echo htmlspecialchars($config['db']['name']); ?></p>
        </div>
    </div>
</body>
</html>
