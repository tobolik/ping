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
// Zkusíme najít .env soubor - nejprve v kořenovém adresáři projektu (o úroveň výš než config/)
$rootDir = dirname(__DIR__);
$envFile = null;
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false || $host === 'localhost') {
    $envFile = $rootDir . '/.env.localhost';
} else {
    $envFile = $rootDir . '/.env.production';
}

// Pokud neexistuje specifický soubor, zkus .env
if (!file_exists($envFile)) {
    $envFile = $rootDir . '/.env';
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

// DB přihlašovací údaje: záměrně bez výchozích hodnot (null). Nesmí být v gitu.
// Aplikace vyžaduje .env soubor – zkopírujte .env.example jako .env nebo .env.localhost
// a nastavte DB_NAME, DB_USER, DB_PASS. Při chybějícím .env api.php vrátí srozumitelnou chybu.
$config = [
    'db' => [
        'host' => getEnvValue('MYSQLHOST', getEnvValue('DB_HOST', '127.0.0.1')),
        'name' => getEnvValue('MYSQL_DATABASE', getEnvValue('DB_NAME', null)),
        'user' => getEnvValue('MYSQLUSER', getEnvValue('DB_USER', null)),
        'pass' => getEnvValue('MYSQLPASSWORD', getEnvValue('DB_PASS', null)),
        'charset' => 'utf8mb4'
    ],
    'debug' => filter_var(getEnvValue('DEBUG', 'false'), FILTER_VALIDATE_BOOLEAN)
];

return $config;
