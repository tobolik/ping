<?php
// Konfigura�n� soubor pro p�ipojen� k datab�zi
// TENTO SOUBOR NEP�ID�VEJTE DO GIT! (.gitignore)

return [
    'db' => [
        'host' => '127.0.0.1',           // nebo 'localhost'
        'name' => 'sensiocz02',
        'user' => 'sensiocz003',        // ZM��TE
        'pass' => 'NSLGKL13',        // ZM��TE
        'charset' => 'utf8mb4'
    ],
    'debug' => true  // Pro produkci nastavte na false
];