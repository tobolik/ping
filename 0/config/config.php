<?php
// Konfigurační soubor pro připojení k databázi
// TENTO SOUBOR NEPŘIDÁVEJTE DO GIT! (.gitignore)

// Pokus o načtení z environment proměnných (pokud jsou dostupné)
// Jinak použij výchozí hodnoty
$config = [
    'db' => [
        'host' => (function_exists('getenv') && getenv('DB_HOST')) ? getenv('DB_HOST') : '127.0.0.1',
        'name' => (function_exists('getenv') && getenv('DB_NAME')) ? getenv('DB_NAME') : 'sensiocz02',
        'user' => (function_exists('getenv') && getenv('DB_USER')) ? getenv('DB_USER') : 'sensiocz003',
        'pass' => (function_exists('getenv') && getenv('DB_PASS')) ? getenv('DB_PASS') : 'NSLGKL13',
        'charset' => 'utf8mb4'
    ],
    'debug' => (function_exists('getenv') && getenv('DEBUG')) ? 
        filter_var(getenv('DEBUG'), FILTER_VALIDATE_BOOLEAN) : true
];

return $config;
