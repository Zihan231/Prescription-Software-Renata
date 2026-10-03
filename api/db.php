<?php
declare(strict_types=1);

$allowedOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isPrivateDevOrigin = preg_match(
    '#^https?://(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::5173)?$#',
    $origin
) === 1;
if (in_array($origin, $allowedOrigins, true) || $isPrivateDevOrigin) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$host = '127.0.0.1';
$database = 'oncology_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$database};charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed',
        'details' => $e->getMessage(),
    ]);
    exit;
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON request body']);
        exit;
    }

    return $data;
}

function respond(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function fetch_patient_pk(PDO $pdo, string $patientCode): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM patients WHERE patient_code = ?');
    $stmt->execute([$patientCode]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int) $id;
}

function next_code(PDO $pdo, string $table, string $column, string $prefix, int $pad = 3): string
{
    $prefixLength = strlen($prefix) + 1;
    $stmt = $pdo->query("
        SELECT MAX(CAST(SUBSTRING({$column}, {$prefixLength}) AS UNSIGNED)) AS max_code
        FROM {$table}
        WHERE {$column} LIKE '{$prefix}%'
    ");
    $max = (int) ($stmt->fetch()['max_code'] ?? 0);
    return $prefix . str_pad((string) ($max + 1), $pad, '0', STR_PAD_LEFT);
}

function ensure_schema(PDO $pdo): void
{
    $statements = [
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications VARCHAR(180) NULL",
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS reg_no VARCHAR(80) NULL",
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic VARCHAR(180) NULL",
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS address TEXT NULL",
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_title VARCHAR(180) NULL",
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_subtitle VARCHAR(220) NULL",
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS avatar_url MEDIUMTEXT NULL",
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(80) NULL",
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 30",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_type VARCHAR(80) NULL",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT NULL",
        "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS referred_by TEXT NULL",
        "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS referred_to TEXT NULL",
        "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS special_notes TEXT NULL",
        "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS follow_up_interval VARCHAR(80) NULL",
        "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS follow_up_note TEXT NULL",
        "CREATE TABLE IF NOT EXISTS app_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(80) NOT NULL UNIQUE,
            setting_value JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS research_projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(180) NOT NULL,
            description TEXT,
            current_step INT NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'Draft',
            metadata JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            identifier VARCHAR(180) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            display_name VARCHAR(180) NULL,
            role VARCHAR(60) NOT NULL DEFAULT 'doctor',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS auth_otps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            identifier VARCHAR(180) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            purpose VARCHAR(40) NOT NULL DEFAULT 'login',
            expires_at DATETIME NOT NULL,
            consumed_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS medicines (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sku VARCHAR(40) NOT NULL UNIQUE,
            product_name VARCHAR(220) NOT NULL,
            generic_name VARCHAR(700) NULL,
            company VARCHAR(120) NULL,
            form VARCHAR(80) NULL,
            strength VARCHAR(120) NULL,
            source VARCHAR(120) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_medicines_product_name (product_name),
            INDEX idx_medicines_sku (sku)
        )",
        "ALTER TABLE medicines ADD COLUMN IF NOT EXISTS generic_name VARCHAR(700) NULL AFTER product_name",
        "ALTER TABLE medicines ADD COLUMN IF NOT EXISTS company VARCHAR(120) NULL AFTER generic_name",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_history TEXT NULL",
        "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS family_history TEXT NULL",
        "CREATE TABLE IF NOT EXISTS patient_summaries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id INT NOT NULL UNIQUE,
            data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS patient_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id INT NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            stored_name VARCHAR(80) NOT NULL,
            mime_type VARCHAR(80) NOT NULL,
            size_bytes INT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_patient_reports_patient (patient_id),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        )",
    ];

    foreach ($statements as $sql) {
        $pdo->exec($sql);
    }
}

ensure_schema($pdo);
