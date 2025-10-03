<?php
// Načtení konfigurace
$config = require __DIR__ . '/config.php';

// Nastavení chyb podle konfigurace
if ($config['debug']) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Konfigurace databáze z config.php
define('DB_HOST', $config['db']['host']);
define('DB_NAME', $config['db']['name']);
define('DB_USER', $config['db']['user']);
define('DB_PASS', $config['db']['pass']);

// Připojení k databázi
function getDB() {
    static $db = null;
    if ($db === null) {
        try {
            $db = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Chyba připojení k databázi']);
            exit;
        }
    }
    return $db;
}

// Pomocné funkce
function sendResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getRequestData() {
    return json_decode(file_get_contents('php://input'), true);
}

// Router
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $db = getDB();

    switch ($action) {
        // === PLAYERS ===
        case 'get_players':
            $stmt = $db->query("SELECT * FROM players ORDER BY name ASC");
            sendResponse($stmt->fetchAll());

        case 'get_player':
            $id = $_GET['id'] ?? 0;
            $stmt = $db->prepare("SELECT * FROM players WHERE id = ?");
            $stmt->execute([$id]);
            $player = $stmt->fetch();
            sendResponse($player ?: ['error' => 'Hráč nenalezen'], $player ? 200 : 404);

        case 'create_player':
            $data = getRequestData();
            $stmt = $db->prepare("INSERT INTO players (name, photo_url, strengths, weaknesses) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $data['name'],
                $data['photoUrl'] ?? '',
                $data['strengths'] ?? '',
                $data['weaknesses'] ?? ''
            ]);
            sendResponse(['id' => $db->lastInsertId(), 'success' => true], 201);

        case 'update_player':
            $data = getRequestData();
            $stmt = $db->prepare("UPDATE players SET name = ?, photo_url = ?, strengths = ?, weaknesses = ? WHERE id = ?");
            $stmt->execute([
                $data['name'],
                $data['photoUrl'] ?? '',
                $data['strengths'] ?? '',
                $data['weaknesses'] ?? '',
                $data['id']
            ]);
            sendResponse(['success' => true]);

        case 'delete_player':
            $id = $_GET['id'] ?? 0;
            // Kontrola, zda hráč není v turnaji
            $stmt = $db->prepare("SELECT COUNT(*) FROM tournament_players WHERE player_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() > 0) {
                sendResponse(['error' => 'Hráče nelze smazat, protože je součástí jednoho nebo více turnajů.'], 400);
            }
            $stmt = $db->prepare("DELETE FROM players WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['success' => true]);

        // === TOURNAMENTS ===
        case 'get_tournaments':
            $stmt = $db->query("
                SELECT t.*, 
                    (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id) as total_matches,
                    (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id AND completed = 1) as completed_matches
                FROM tournaments t 
                ORDER BY t.created_at DESC
            ");
            $tournaments = $stmt->fetchAll();
            
            foreach ($tournaments as &$tournament) {
                // Načtení hráčů
                $stmt = $db->prepare("
                    SELECT p.id FROM players p
                    JOIN tournament_players tp ON p.id = tp.player_id
                    WHERE tp.tournament_id = ?
                    ORDER BY tp.player_order
                ");
                $stmt->execute([$tournament['id']]);
                $tournament['playerIds'] = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
            }
            sendResponse($tournaments);

        case 'get_tournament':
            $id = $_GET['id'] ?? 0;
            $stmt = $db->prepare("SELECT * FROM tournaments WHERE id = ?");
            $stmt->execute([$id]);
            $tournament = $stmt->fetch();
            
            if (!$tournament) {
                sendResponse(['error' => 'Turnaj nenalezen'], 404);
            }
            
            // Načtení hráčů
            $stmt = $db->prepare("
                SELECT p.id FROM players p
                JOIN tournament_players tp ON p.id = tp.player_id
                WHERE tp.tournament_id = ?
                ORDER BY tp.player_order
            ");
            $stmt->execute([$id]);
            $tournament['playerIds'] = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
            
            // Načtení zápasů
            $stmt = $db->prepare("
                SELECT * FROM matches 
                WHERE tournament_id = ? 
                ORDER BY match_order
            ");
            $stmt->execute([$id]);
            $tournament['matches'] = $stmt->fetchAll();
            
            sendResponse($tournament);

        case 'create_tournament':
            $data = getRequestData();
            
            $db->beginTransaction();
            try {
                // Vytvoření turnaje
                $stmt = $db->prepare("INSERT INTO tournaments (name, points_to_win, is_locked) VALUES (?, ?, 0)");
                $stmt->execute([$data['name'], $data['pointsToWin']]);
                $tournamentId = $db->lastInsertId();
                
                // Přidání hráčů
                $stmt = $db->prepare("INSERT INTO tournament_players (tournament_id, player_id, player_order) VALUES (?, ?, ?)");
                foreach ($data['playerIds'] as $order => $playerId) {
                    $stmt->execute([$tournamentId, $playerId, $order]);
                }
                
                // Vytvoření zápasů
                $matchOrder = 0;
                $stmt = $db->prepare("INSERT INTO matches (tournament_id, player1_id, player2_id, match_order) VALUES (?, ?, ?, ?)");
                foreach ($data['matches'] as $match) {
                    $stmt->execute([
                        $tournamentId,
                        $match['player1Id'],
                        $match['player2Id'],
                        $matchOrder++
                    ]);
                }
                
                $db->commit();
                sendResponse(['id' => $tournamentId, 'success' => true], 201);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }

        case 'update_tournament':
            $data = getRequestData();
            
            $db->beginTransaction();
            try {
                // Aktualizace turnaje
                $stmt = $db->prepare("UPDATE tournaments SET name = ?, is_locked = ? WHERE id = ?");
                $stmt->execute([$data['name'], $data['isLocked'] ? 1 : 0, $data['id']]);
                
                // Aktualizace hráčů (pokud není zamčený)
                if (!$data['isLocked']) {
                    // Smazání starých
                    $stmt = $db->prepare("DELETE FROM tournament_players WHERE tournament_id = ?");
                    $stmt->execute([$data['id']]);
                    
                    // Přidání nových
                    $stmt = $db->prepare("INSERT INTO tournament_players (tournament_id, player_id, player_order) VALUES (?, ?, ?)");
                    foreach ($data['playerIds'] as $order => $playerId) {
                        $stmt->execute([$data['id'], $playerId, $order]);
                    }
                }
                
                $db->commit();
                sendResponse(['success' => true]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }

        case 'delete_tournament':
            $id = $_GET['id'] ?? 0;
            $stmt = $db->prepare("DELETE FROM tournaments WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['success' => true]);

        case 'toggle_lock':
            $id = $_GET['id'] ?? 0;
            $stmt = $db->prepare("UPDATE tournaments SET is_locked = NOT is_locked WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['success' => true]);

        // === MATCHES ===
        case 'get_matches':
            $tournamentId = $_GET['tournament_id'] ?? 0;
            $stmt = $db->prepare("SELECT * FROM matches WHERE tournament_id = ? ORDER BY match_order");
            $stmt->execute([$tournamentId]);
            sendResponse($stmt->fetchAll());

        case 'update_match':
            $data = getRequestData();
            $stmt = $db->prepare("
                UPDATE matches 
                SET score1 = ?, score2 = ?, completed = ?, first_server = ?, serving_player = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['score1'],
                $data['score2'],
                $data['completed'] ? 1 : 0,
                $data['firstServer'] ?? null,
                $data['servingPlayer'] ?? null,
                $data['id']
            ]);
            sendResponse(['success' => true]);

        case 'reorder_matches':
            $data = getRequestData();
            $db->beginTransaction();
            try {
                $stmt = $db->prepare("UPDATE matches SET match_order = ? WHERE id = ?");
                foreach ($data['matches'] as $order => $matchId) {
                    $stmt->execute([$order, $matchId]);
                }
                $db->commit();
                sendResponse(['success' => true]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }

        case 'add_matches':
            $data = getRequestData();
            $db->beginTransaction();
            try {
                $stmt = $db->prepare("INSERT INTO matches (tournament_id, player1_id, player2_id, match_order) VALUES (?, ?, ?, ?)");
                foreach ($data['matches'] as $match) {
                    $stmt->execute([
                        $data['tournamentId'],
                        $match['player1Id'],
                        $match['player2Id'],
                        $match['order']
                    ]);
                }
                $db->commit();
                sendResponse(['success' => true]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }

        // === SETTINGS ===
        case 'get_settings':
            $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
            $settings = [];
            foreach ($stmt->fetchAll() as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            sendResponse($settings);

        case 'update_setting':
            $data = getRequestData();
            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            ");
            $stmt->execute([$data['key'], $data['value']]);
            sendResponse(['success' => true]);

        default:
            sendResponse(['error' => 'Neplatná akce'], 400);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Chyba serveru',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}