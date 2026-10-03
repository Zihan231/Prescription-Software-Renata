<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

const REPORT_MAX_BYTES = 20 * 1024 * 1024;
const REPORT_ALLOWED_TYPES = [
    'application/pdf' => 'pdf',
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

function report_dir(string $patientCode): string
{
    return __DIR__ . '/uploads/patients/' . preg_replace('/[^A-Za-z0-9_-]/', '', $patientCode);
}

function report_from_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'patientId' => $row['patient_code'],
        'name' => $row['original_name'],
        'mimeType' => $row['mime_type'],
        'size' => (int) $row['size_bytes'],
        'uploadedAt' => $row['uploaded_at'],
    ];
}

function get_report(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare("
        SELECT r.*, p.patient_code
        FROM patient_reports r
        JOIN patients p ON p.id = r.patient_id
        WHERE r.id = ?
    ");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id > 0) {
        $row = get_report($pdo, $id);
        $path = $row ? report_dir($row['patient_code']) . '/' . $row['stored_name'] : '';
        if (!$row || !is_file($path)) {
            respond(['error' => 'Report not found'], 404);
        }

        $disposition = ($_GET['download'] ?? '') === '1' ? 'attachment' : 'inline';
        $filename = str_replace(['"', "\r", "\n"], '', $row['original_name']);
        header('Content-Type: ' . $row['mime_type']);
        header('Content-Length: ' . filesize($path));
        header("Content-Disposition: {$disposition}; filename=\"{$filename}\"");
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }

    $patientId = fetch_patient_pk($pdo, (string) ($_GET['patient'] ?? ''));
    if (!$patientId) {
        respond(['error' => 'Valid patient ID is required'], 422);
    }
    $stmt = $pdo->prepare("
        SELECT r.*, p.patient_code
        FROM patient_reports r
        JOIN patients p ON p.id = r.patient_id
        WHERE r.patient_id = ?
        ORDER BY r.uploaded_at DESC, r.id DESC
    ");
    $stmt->execute([$patientId]);
    respond(array_map('report_from_row', $stmt->fetchAll()));
}

if ($method === 'POST') {
    $patientCode = (string) ($_POST['patientId'] ?? '');
    $patientId = fetch_patient_pk($pdo, $patientCode);
    if (!$patientId) {
        respond(['error' => 'Valid patient ID is required'], 422);
    }

    $upload = $_FILES['file'] ?? null;
    if (!is_array($upload) || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        respond(['error' => 'File upload failed'], 422);
    }
    if ((int) $upload['size'] > REPORT_MAX_BYTES) {
        respond(['error' => 'File is larger than 20 MB'], 422);
    }

    // Trust the file contents, not the browser-supplied name or type.
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']) ?: '';
    if (!isset(REPORT_ALLOWED_TYPES[$mime])) {
        respond(['error' => 'Only PDF, JPG, PNG and WEBP files are allowed'], 422);
    }

    $dir = report_dir($patientCode);
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
        respond(['error' => 'Could not create upload folder'], 500);
    }
    $storedName = bin2hex(random_bytes(16)) . '.' . REPORT_ALLOWED_TYPES[$mime];
    if (!move_uploaded_file($upload['tmp_name'], $dir . '/' . $storedName)) {
        respond(['error' => 'Could not save file'], 500);
    }

    $originalName = mb_substr(basename((string) $upload['name']), 0, 255);
    $stmt = $pdo->prepare("
        INSERT INTO patient_reports (patient_id, original_name, stored_name, mime_type, size_bytes)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$patientId, $originalName, $storedName, $mime, (int) $upload['size']]);
    respond(report_from_row(get_report($pdo, (int) $pdo->lastInsertId())), 201);
}

if ($method === 'DELETE') {
    $row = get_report($pdo, (int) ($_GET['id'] ?? 0));
    if (!$row) {
        respond(['error' => 'Report not found'], 404);
    }
    @unlink(report_dir($row['patient_code']) . '/' . $row['stored_name']);
    $pdo->prepare('DELETE FROM patient_reports WHERE id = ?')->execute([(int) $row['id']]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
