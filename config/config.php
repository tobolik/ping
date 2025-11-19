<?php
// Konfigurační soubor pro připojení k databázi
// TENTO SOUBOR NEPŘIDÁVEJTE DO GIT! (.gitignore)

/**
 * Načte hodnoty z .env souboru
 * @param string $envFile Cesta k .env souboru
 * @return array Asociativní pole s hodnotami z .env souboru
 */
function loadEnvFile($envFile) {
    $env = [];
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Přeskočit komentáře
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            // Parsovat KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $env[trim($key)] = trim($value);
            }
        }
    }
    return $env;
}

// Určení, který .env soubor použít
// Priorita: 1) .env.localhost (pro localhost), 2) .env.production (pro produkci), 3) .env
$envFile = null;
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false || $host === 'localhost') {
    $envFile = __DIR__ . '/../.env.localhost';
} else {
    $envFile = __DIR__ . '/../.env.production';
}

// Pokud neexistuje specifický soubor, zkus .env
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../.env';
}

// Načtení hodnot z .env souboru
$env = loadEnvFile($envFile);

// Funkce pro získání hodnoty z env (priorita: .env soubor > getenv() > výchozí hodnota)
function getEnvValue($key, $default = null) {
    global $env;
    // Nejdřív z .env souboru
    if (isset($env[$key])) {
        return $env[$key];
    }
    // Pak z system environment proměnných
    if (function_exists('getenv') && getenv($key) !== false) {
        return getenv($key);
    }
    // Nakonec výchozí hodnota
    return $default;
}

$config = [
    'db' => [
        'host' => getEnvValue('DB_HOST', '127.0.0.1'),
        'name' => getEnvValue('DB_NAME', 'sensiocz02'),
        'user' => getEnvValue('DB_USER', 'root'),
        'pass' => getEnvValue('DB_PASS', 'vertrigo'),
        'charset' => 'utf8mb4'
    ],
    'debug' => filter_var(getEnvValue('DEBUG', 'true'), FILTER_VALIDATE_BOOLEAN)
];

return $config;
