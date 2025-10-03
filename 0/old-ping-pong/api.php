<?php
// Finální zadání: Aplikace pro správu pingpongových turnajů

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json; charset=UTF-8");

require_once 'config/config.php';

// --- Helper Functions ---

function send_json($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
    exit();
}

function send_error($message, $statusCode = 400) {
    send_json(['error' => $message], $statusCode);
}

function snake_to_camel($str) {
    return lcfirst(str_replace('_', '', ucwords($str, '_')));
}

function camel_to_snake($str) {
    return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $str));
}

function convert_keys_to_camel($array) {
    $result = [];
    foreach ($array as $key => $value) {
        if (is_array($value)) {
            $value = convert_keys_to_camel($value);
        }
        $result[snake_to_camel($key)] = $value;
    }
    return $result;
}

function get_db_connection() {
    global $config;
    try {
        $dsn = "mysql:host={$config['db']['host']};dbname={$config['db']['name']};charset={$config['db']['charset']}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        return new PDO($dsn, $config['db']['user'], $config['db']['pass'], $options);
    } catch (PDOException $e) {
        send_error("Database connection failed: " . $e->getMessage(), 500);
    }
}

// --- Main Logic ---

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '/';

$pdo = get_db_connection();

if ($method === 'GET' && $path === '/') {
    handle_get_all($pdo);
} elseif ($method === 'POST' && $path === '/sync') {
    handle_post_sync($pdo);
                    } else {
    send_error("Invalid endpoint or method", 404);
}

// --- Endpoint Handlers ---

function handle_get_all($pdo) {
    try {
        $data = [];
        $tables = ['players', 'tournaments', 'matches', 'tournament_players'];

        foreach ($tables as $table) {
            $stmt = $pdo->query("SELECT * FROM {$table} WHERE valid_to IS NULL");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $data[$table] = array_map('convert_keys_to_camel', $rows);
        }

        // Handle settings separately as it's an object, not an array of objects
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $settings_raw = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        $data['settings'] = [];
        if ($settings_raw) {
            foreach ($settings_raw as $key => $value) {
                // Assuming boolean values are stored as 'true'/'false' strings
                if ($value === 'true') {
                    $value = true;
                } elseif ($value === 'false') {
                    $value = false;
                }
                $data['settings'][snake_to_camel($key)] = $value;
            }
        }


        send_json($data);

    } catch (PDOException $e) {
        send_error("Failed to fetch data: " . $e->getMessage(), 500);
    }
}

function handle_post_sync($pdo) {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        send_error("Invalid JSON payload: " . json_last_error_msg());
        return;
    }

    $id_map = [];
    $table_order = ['players', 'tournaments', 'matches', 'tournament_players', 'settings'];

    try {
        $pdo->beginTransaction();

        foreach ($table_order as $table_name_camel) {
            if (isset($payload[$table_name_camel])) {
                $table_name_snake = camel_to_snake($table_name_camel);
                if ($table_name_snake === 'settings') {
                    process_settings($pdo, $payload[$table_name_camel]);
                    continue;
                }
                if ($table_name_snake === 'tournament_players') {
                    process_tournament_players($pdo, $payload[$table_name_camel]);
                    continue;
                }
                $id_map[$table_name_camel] = process_table_data($pdo, $table_name_snake, $payload[$table_name_camel]);
            }
        }
        
        // Placeholder for processing logic
        // The actual logic will be added in the next steps.

        $pdo->commit();

        send_json([
            'success' => true,
            'id_map' => (object)$id_map // Return empty object if no IDs were mapped
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
        $pdo->rollBack();
        }
        send_error("Sync failed: " . $e->getMessage(), 500);
    }
}

function process_table_data($pdo, $table_name, $records) {
    $local_id_map = [];

    // Get table columns to filter out fields from payload that don't exist in DB
    $stmt = $pdo->query("DESCRIBE {$table_name}");
    $table_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($records as $record) {
        $record_snake = [];
        foreach ($record as $key => $value) {
            $record_snake[camel_to_snake($key)] = $value;
        }

        // Filter payload to only include columns that exist in the table
        $data = array_intersect_key($record_snake, array_flip($table_columns));
        unset($data['id'], $data['entity_id'], $data['valid_from'], $data['valid_to']); // Let DB handle these

        $is_new = !isset($record['id']) || !is_numeric($record['id']);

        if ($is_new) {
            // --- CREATE ---
            $stmt = $pdo->query("SELECT MAX(entity_id) as max_id FROM {$table_name}");
            $max_id = $stmt->fetchColumn();
            $new_entity_id = ($max_id ?? 0) + 1;

            $data['entity_id'] = $new_entity_id;
            
            $columns = implode(', ', array_keys($data));
            $placeholders = ':' . implode(', :', array_keys($data));

            $sql = "INSERT INTO {$table_name} ($columns) VALUES ($placeholders)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($data);

            $local_id_map[$record['id']] = $new_entity_id;

        } else {
            // --- UPDATE or DELETE ---
            $entity_id = $record['id']; // For existing records, the frontend sends entity_id as 'id'

            // Find the current valid record
            $sql = "SELECT * FROM {$table_name} WHERE entity_id = :entity_id AND valid_to IS NULL";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['entity_id' => $entity_id]);
            $current_record = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$current_record) continue; // Record may have been deleted in a previous sync

            // Invalidate the old record by setting valid_to
            $sql_invalidate = "UPDATE {$table_name} SET valid_to = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt_invalidate = $pdo->prepare($sql_invalidate);
            
            if (isset($record['_deleted']) && $record['_deleted'] === true) {
                // --- DELETE ---
                $stmt_invalidate->execute(['id' => $current_record['id']]);

            } else {
                // --- UPDATE ---
                
                // Compare data to see if an update is needed
                $is_different = false;
                foreach ($data as $key => $value) {
                    if (!array_key_exists($key, $current_record) || $current_record[$key] != $value) {
                        $is_different = true;
                        break;
                    }
                }

                if ($is_different) {
                    $stmt_invalidate->execute(['id' => $current_record['id']]);

                    // Insert the new version
                    $data['entity_id'] = $entity_id; // Keep the same entity_id
                    
                    $columns = implode(', ', array_keys($data));
                    $placeholders = ':' . implode(', :', array_keys($data));

                    $sql_insert = "INSERT INTO {$table_name} ($columns) VALUES ($placeholders)";
                    $stmt_insert = $pdo->prepare($sql_insert);
                    $stmt_insert->execute($data);
                }
            }
        }
    }
    return $local_id_map;
}

function process_tournament_players($pdo, $records) {
    if (empty($records)) {
        return;
    }

    // Group players by tournament
    $players_by_tournament = [];
    foreach ($records as $record) {
        $players_by_tournament[$record['tournamentId']][] = $record;
    }

    foreach ($players_by_tournament as $tournament_id => $frontend_players) {
        // Get current players from DB for this tournament
        $sql = "SELECT * FROM tournament_players WHERE tournament_id = :tournament_id AND valid_to IS NULL";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['tournament_id' => $tournament_id]);
        $db_players = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $frontend_player_ids = array_column($frontend_players, 'playerId');
        $db_player_ids = array_column($db_players, 'player_id');

        // 1. Invalidate players who are in DB but not in frontend list
        $players_to_invalidate = array_diff($db_player_ids, $frontend_player_ids);
        if (!empty($players_to_invalidate)) {
            $placeholders = implode(',', array_fill(0, count($players_to_invalidate), '?'));
            $sql_invalidate = "UPDATE tournament_players SET valid_to = CURRENT_TIMESTAMP 
                               WHERE tournament_id = ? AND player_id IN ({$placeholders}) AND valid_to IS NULL";
            $stmt_invalidate = $pdo->prepare($sql_invalidate);
            $params = array_merge([$tournament_id], array_values($players_to_invalidate));
            $stmt_invalidate->execute($params);
        }

        // 2. Insert or update players from frontend list
        foreach ($frontend_players as $player_data) {
            $player_id = $player_data['playerId'];
            $player_order = $player_data['playerOrder'];

            $existing_player = null;
            foreach ($db_players as $db_player) {
                if ($db_player['player_id'] == $player_id) {
                    $existing_player = $db_player;
                    break;
                }
            }

            if ($existing_player) {
                // UPDATE if order is different
                if ($existing_player['player_order'] != $player_order) {
                    // Invalidate old entry
                    $sql_invalidate_single = "UPDATE tournament_players SET valid_to = CURRENT_TIMESTAMP WHERE id = :id";
                    $stmt_invalidate_single = $pdo->prepare($sql_invalidate_single);
                    $stmt_invalidate_single->execute(['id' => $existing_player['id']]);

                    // Insert new entry
                    $sql_insert = "INSERT INTO tournament_players (tournament_id, player_id, player_order) VALUES (:tid, :pid, :po)";
                    $stmt_insert = $pdo->prepare($sql_insert);
                    $stmt_insert->execute(['tid' => $tournament_id, 'pid' => $player_id, 'po' => $player_order]);
                }
        } else {
                // INSERT new player
                $sql_insert = "INSERT INTO tournament_players (tournament_id, player_id, player_order) VALUES (:tid, :pid, :po)";
                $stmt_insert = $pdo->prepare($sql_insert);
                $stmt_insert->execute(['tid' => $tournament_id, 'pid' => $player_id, 'po' => $player_order]);
            }
        }
    }
}

function process_settings($pdo, $settings) {
    $sql = "UPDATE settings SET setting_value = :value WHERE setting_key = :key";
    $stmt = $pdo->prepare($sql);

    foreach ($settings as $key_camel => $value) {
        $key_snake = camel_to_snake($key_camel);
        
        // Convert boolean to string for DB
        if (is_bool($value)) {
            $value = $value ? 'true' : 'false';
        }

        $stmt->execute(['value' => $value, 'key' => $key_snake]);
    }
}
