<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

const SETTINGS_KEY = 'app';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?');
    $stmt->execute([SETTINGS_KEY]);
    $value = $stmt->fetchColumn();
    respond($value ? json_decode((string) $value, true) : new stdClass());
}

if ($method === 'PUT' || $method === 'POST') {
    $data = json_input();
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);

    $stmt = $pdo->prepare("
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (:setting_key, :setting_value)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");
    $stmt->execute([
        ':setting_key' => SETTINGS_KEY,
        ':setting_value' => $json,
    ]);

    respond($data);
}

respond(['error' => 'Method not allowed'], 405);
