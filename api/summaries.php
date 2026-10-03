<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $patientId = fetch_patient_pk($pdo, (string) ($_GET['patient'] ?? ''));
    if (!$patientId) {
        respond(['error' => 'Valid patient ID is required'], 422);
    }

    $stmt = $pdo->prepare('SELECT data, updated_at FROM patient_summaries WHERE patient_id = ?');
    $stmt->execute([$patientId]);
    $row = $stmt->fetch();
    respond($row
        ? ['data' => json_decode((string) $row['data'], true), 'updatedAt' => $row['updated_at']]
        : ['data' => null, 'updatedAt' => null]);
}

if ($method === 'PUT' || $method === 'POST') {
    $input = json_input();
    $patientId = fetch_patient_pk($pdo, (string) ($input['patientId'] ?? ''));
    if (!$patientId) {
        respond(['error' => 'Valid patient ID is required'], 422);
    }
    if (!is_array($input['data'] ?? null)) {
        respond(['error' => 'Summary data is required'], 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO patient_summaries (patient_id, data)
        VALUES (:patient_id, :data)
        ON DUPLICATE KEY UPDATE data = VALUES(data)
    ");
    $stmt->execute([
        ':patient_id' => $patientId,
        ':data' => json_encode($input['data'], JSON_UNESCAPED_UNICODE),
    ]);

    $stmt = $pdo->prepare('SELECT data, updated_at FROM patient_summaries WHERE patient_id = ?');
    $stmt->execute([$patientId]);
    $row = $stmt->fetch();
    respond(['data' => json_decode((string) $row['data'], true), 'updatedAt' => $row['updated_at']]);
}

respond(['error' => 'Method not allowed'], 405);
