<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function default_profile(): array
{
    return [
        'name' => '',
        'specialty' => '',
        'qualifications' => '',
        'regNo' => '',
        'phone' => '',
        'clinic' => '',
        'address' => '',
        'prescriptionTitle' => '',
        'prescriptionSubtitle' => '',
        'avatarUrl' => '',
    ];
}

function profile_from_row(?array $row): array
{
    if (!$row) {
        return default_profile();
    }
    return [
        'name' => $row['full_name'] ?? '',
        'specialty' => $row['specialty'] ?? '',
        'qualifications' => $row['qualifications'] ?? '',
        'regNo' => $row['reg_no'] ?? '',
        'phone' => $row['mobile'] ?? '',
        'clinic' => $row['clinic'] ?? '',
        'address' => $row['address'] ?? '',
        'prescriptionTitle' => $row['prescription_title'] ?? '',
        'prescriptionSubtitle' => $row['prescription_subtitle'] ?? '',
        'avatarUrl' => $row['avatar_url'] ?? '',
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM doctors ORDER BY id ASC LIMIT 1');
    respond(profile_from_row($stmt->fetch() ?: null));
}

if ($method === 'PUT' || $method === 'POST') {
    $data = json_input();
    $stmt = $pdo->query('SELECT id FROM doctors ORDER BY id ASC LIMIT 1');
    $id = $stmt->fetchColumn();

    if ($id === false) {
        $stmt = $pdo->prepare("
            INSERT INTO doctors
              (full_name, specialty, qualifications, reg_no, mobile, clinic, address, prescription_title, prescription_subtitle, avatar_url)
            VALUES
              (:name, :specialty, :qualifications, :reg_no, :phone, :clinic, :address, :title, :subtitle, :avatar)
        ");
        $stmt->execute([
            ':name' => $data['name'] ?? '',
            ':specialty' => $data['specialty'] ?? '',
            ':qualifications' => $data['qualifications'] ?? '',
            ':reg_no' => $data['regNo'] ?? '',
            ':phone' => $data['phone'] ?? '',
            ':clinic' => $data['clinic'] ?? '',
            ':address' => $data['address'] ?? '',
            ':title' => $data['prescriptionTitle'] ?? '',
            ':subtitle' => $data['prescriptionSubtitle'] ?? '',
            ':avatar' => $data['avatarUrl'] ?? '',
        ]);
    } else {
        $stmt = $pdo->prepare("
            UPDATE doctors
            SET full_name = :name,
                specialty = :specialty,
                qualifications = :qualifications,
                reg_no = :reg_no,
                mobile = :phone,
                clinic = :clinic,
                address = :address,
                prescription_title = :title,
                prescription_subtitle = :subtitle,
                avatar_url = :avatar
            WHERE id = :id
        ");
        $stmt->execute([
            ':id' => (int) $id,
            ':name' => $data['name'] ?? '',
            ':specialty' => $data['specialty'] ?? '',
            ':qualifications' => $data['qualifications'] ?? '',
            ':reg_no' => $data['regNo'] ?? '',
            ':phone' => $data['phone'] ?? '',
            ':clinic' => $data['clinic'] ?? '',
            ':address' => $data['address'] ?? '',
            ':title' => $data['prescriptionTitle'] ?? '',
            ':subtitle' => $data['prescriptionSubtitle'] ?? '',
            ':avatar' => $data['avatarUrl'] ?? '',
        ]);
    }

    $stmt = $pdo->query('SELECT * FROM doctors ORDER BY id ASC LIMIT 1');
    respond(profile_from_row($stmt->fetch() ?: null));
}

respond(['error' => 'Method not allowed'], 405);
