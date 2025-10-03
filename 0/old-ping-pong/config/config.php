<?php
// Konfigurační soubor pro Ping Pong Turnajovou Aplikaci
// TENTO SOUBOR NEPŘIDÁVEJTE DO GIT! (.gitignore)

// Pokus o načtení z environment proměnných (pokud jsou dostupné)
// Jinak použij výchozí hodnoty
$config = [
    'db' => [
        'host' => (function_exists('getenv') && getenv('DB_HOST')) ? getenv('DB_HOST') : '127.0.0.1',
        'name' => (function_exists('getenv') && getenv('DB_NAME')) ? getenv('DB_NAME') : 'sensiocz02',
        'user' => (function_exists('getenv') && getenv('DB_USER')) ? getenv('DB_USER') : 'sensiocz003',
        'pass' => (function_exists('getenv') && getenv('DB_PASS')) ? getenv('DB_PASS') : 'NSLGKL13',
        'charset' => 'utf8mb4',
        'timeout' => 30
    ],
    'cors' => [
        'origin' => (function_exists('getenv') && getenv('CORS_ORIGIN')) ? getenv('CORS_ORIGIN') : '*',
        'methods' => (function_exists('getenv') && getenv('CORS_METHODS')) ? getenv('CORS_METHODS') : 'GET, POST, PUT, DELETE, OPTIONS',
        'headers' => (function_exists('getenv') && getenv('CORS_HEADERS')) ? getenv('CORS_HEADERS') : 'Content-Type, Authorization'
    ],
    'api' => [
        'version' => '1.0',
        'max_players_per_tournament' => 8,
        'default_points_to_win' => 11,
        'max_upload_size' => 10 * 1024 * 1024 // 10MB
    ],
    'debug' => (function_exists('getenv') && getenv('DEBUG')) ? 
        filter_var(getenv('DEBUG'), FILTER_VALIDATE_BOOLEAN) : true
];

// Pro zpětnou kompatibilitu - definice konstant
define('DB_HOST', $config['db']['host']);
define('DB_NAME', $config['db']['name']);
define('DB_USER', $config['db']['user']);
define('DB_PASS', $config['db']['pass']);
define('DB_TIMEOUT', $config['db']['timeout']);

define('CORS_ORIGIN', $config['cors']['origin']);
define('CORS_METHODS', $config['cors']['methods']);
define('CORS_HEADERS', $config['cors']['headers']);

define('API_VERSION', $config['api']['version']);
define('MAX_PLAYERS_PER_TOURNAMENT', $config['api']['max_players_per_tournament']);
define('DEFAULT_POINTS_TO_WIN', $config['api']['default_points_to_win']);
define('MAX_UPLOAD_SIZE', $config['api']['max_upload_size']);

define('DEBUG_MODE', $config['debug']);

return $config;
?>