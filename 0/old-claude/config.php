<?php
// Konfiguraèní soubor pro pøipojení k databázi
// TENTO SOUBOR NEPØIDÁVEJTE DO GIT! (.gitignore)

return [
    'db' => [
        'host' => '127.0.0.1',           // nebo 'localhost'
        'name' => 'sensiocz02',
        'user' => 'sensiocz003',        // ZMÌÒTE
        'pass' => 'NSLGKL13',        // ZMÌÒTE
        'charset' => 'utf8mb4'
    ],
    'debug' => true  // Pro produkci nastavte na false
];