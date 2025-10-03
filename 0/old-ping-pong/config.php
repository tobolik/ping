<?php
// Konfigurace databáze pro Ping Pong Turnajovou Aplikaci

// Databázové připojení
define('DB_HOST', 'localhost');
define('DB_NAME', 'ping_pong_tournaments');
define('DB_USER', 'root');
define('DB_PASS', '');

// CORS nastavení
define('CORS_ORIGIN', '*');
define('CORS_METHODS', 'GET, POST, PUT, DELETE, OPTIONS');
define('CORS_HEADERS', 'Content-Type, Authorization');

// Nastavení API
define('API_VERSION', '1.0');
define('MAX_PLAYERS_PER_TOURNAMENT', 8);
define('DEFAULT_POINTS_TO_WIN', 11);

// Chybové hlášení (v produkci nastavit na false)
define('DEBUG_MODE', true);

// Timeout pro databázové operace (v sekundách)
define('DB_TIMEOUT', 30);

// Maximální velikost pro upload dat (v bytech)
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
?>