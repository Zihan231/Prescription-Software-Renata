<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function auth_user_from_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'identifier' => $row['identifier'],
        'displayName' => $row['display_name'] ?? '',
        'role' => $row['role'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $data = json_input();
    $identifier = trim((string) ($data['identifier'] ?? ''));
    $password = (string) ($data['password'] ?? '');

    if ($identifier === '' || $password === '') {
        respond(['error' => 'Identifier and password are required'], 422);
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE identifier = ?');
    $stmt->execute([$identifier]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond(['error' => 'Invalid login credentials'], 401);
    }

    respond(['success' => true, 'user' => auth_user_from_row($user)]);
}

if ($method === 'POST' && $action === 'forgot') {
    $data = json_input();
    $identifier = trim((string) ($data['identifier'] ?? ''));
    if ($identifier === '') {
        respond(['error' => 'Identifier is required'], 422);
    }

    $otp = (string) random_int(100000, 999999);
    $stmt = $pdo->prepare('
        INSERT INTO auth_otps (identifier, otp_hash, purpose, expires_at)
        VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    ');
    $stmt->execute([$identifier, password_hash($otp, PASSWORD_DEFAULT), 'forgot']);

    respond([
        'success' => true,
        'message' => 'OTP generated. Configure SMS/email delivery before production use.',
    ]);
}

if ($method === 'POST' && $action === 'verify-otp') {
    $data = json_input();
    $identifier = trim((string) ($data['identifier'] ?? ''));
    $otp = (string) ($data['otp'] ?? '');

    $stmt = $pdo->prepare("
        SELECT * FROM auth_otps
        WHERE identifier = ?
          AND consumed_at IS NULL
          AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmt->execute([$identifier]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($otp, $row['otp_hash'])) {
        respond(['error' => 'Invalid or expired OTP'], 401);
    }

    $pdo->prepare('UPDATE auth_otps SET consumed_at = NOW() WHERE id = ?')->execute([(int) $row['id']]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
