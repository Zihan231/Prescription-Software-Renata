<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function patient_from_row(array $row): array
{
    return [
        'id' => $row['patient_code'],
        'name' => $row['full_name'],
        'mobile' => $row['mobile'],
        'age' => (int) ($row['age'] ?? 0),
        'gender' => $row['gender'],
        'bloodGroup' => $row['blood_group'] ?: '-',
        'lastVisit' => $row['last_visit'],
        'totalVisits' => (int) $row['total_visits'],
        'previousReports' => $row['previous_reports'] ?? '',
        'previousReportFiles' => $row['previous_report_files'] ?? '',
    ];
}

function next_patient_code(PDO $pdo): string
{
    $stmt = $pdo->query("
        SELECT MAX(CAST(SUBSTRING(patient_code, 4) AS UNSIGNED)) AS max_code
        FROM patients
        WHERE patient_code LIKE 'PT-%'
    ");
    $max = (int) ($stmt->fetch()['max_code'] ?? 0);
    return 'PT-' . str_pad((string) ($max + 1), 3, '0', STR_PAD_LEFT);
}

function calculate_age(?string $dateOfBirth): ?int
{
    if (!$dateOfBirth) {
        return null;
    }

    try {
        $dob = new DateTimeImmutable($dateOfBirth);
        return $dob->diff(new DateTimeImmutable('today'))->y;
    } catch (Exception) {
        return null;
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT patient_code, full_name, mobile, age, gender, blood_group,
               previous_reports, previous_report_files, last_visit, total_visits
        FROM patients
        ORDER BY patient_code ASC
    ");
    respond(array_map('patient_from_row', $stmt->fetchAll()));
}

if ($method === 'POST') {
    $data = json_input();

    if (empty($data['name']) || empty($data['mobile']) || empty($data['gender'])) {
        respond(['error' => 'Name, mobile, and gender are required'], 422);
    }

    $code = next_patient_code($pdo);
    $age = calculate_age($data['dob'] ?? null);

    $stmt = $pdo->prepare("
        INSERT INTO patients
          (patient_code, full_name, mobile, date_of_birth, age, gender, blood_group,
           previous_reports, previous_report_files, last_visit, total_visits)
        VALUES
          (:patient_code, :full_name, :mobile, :date_of_birth, :age, :gender, :blood_group,
           :previous_reports, :previous_report_files, CURDATE(), 0)
    ");
    $stmt->execute([
        ':patient_code' => $code,
        ':full_name' => trim((string) $data['name']),
        ':mobile' => trim((string) $data['mobile']),
        ':date_of_birth' => ($data['dob'] ?? '') !== '' ? $data['dob'] : null,
        ':age' => $age,
        ':gender' => $data['gender'],
        ':blood_group' => ($data['bloodGroup'] ?? '') !== '' ? $data['bloodGroup'] : null,
        ':previous_reports' => $data['previousReports'] ?? '',
        ':previous_report_files' => $data['previousReportFiles'] ?? '',
    ]);

    $stmt = $pdo->prepare("SELECT * FROM patients WHERE patient_code = ?");
    $stmt->execute([$code]);
    respond(patient_from_row($stmt->fetch()), 201);
}

if ($method === 'PUT') {
    $data = json_input();
    $code = (string) ($data['id'] ?? '');

    if ($code === '') {
        respond(['error' => 'Patient ID is required'], 422);
    }
    if (empty($data['name']) || empty($data['mobile']) || empty($data['gender'])) {
        respond(['error' => 'Name, mobile, and gender are required'], 422);
    }

    $age = calculate_age($data['dob'] ?? null);

    $stmt = $pdo->prepare("
        UPDATE patients
        SET full_name = :full_name,
            mobile = :mobile,
            date_of_birth = COALESCE(:date_of_birth, date_of_birth),
            age = COALESCE(:age, age),
            gender = :gender,
            blood_group = :blood_group,
            previous_reports = :previous_reports,
            previous_report_files = :previous_report_files
        WHERE patient_code = :patient_code
    ");
    $stmt->execute([
        ':patient_code' => $code,
        ':full_name' => trim((string) $data['name']),
        ':mobile' => trim((string) $data['mobile']),
        ':date_of_birth' => ($data['dob'] ?? '') !== '' ? $data['dob'] : null,
        ':age' => $age,
        ':gender' => $data['gender'],
        ':blood_group' => ($data['bloodGroup'] ?? '') !== '' ? $data['bloodGroup'] : null,
        ':previous_reports' => $data['previousReports'] ?? '',
        ':previous_report_files' => $data['previousReportFiles'] ?? '',
    ]);

    $stmt = $pdo->prepare("SELECT * FROM patients WHERE patient_code = ?");
    $stmt->execute([$code]);
    $patient = $stmt->fetch();

    if (!$patient) {
        respond(['error' => 'Patient not found'], 404);
    }

    respond(patient_from_row($patient));
}

if ($method === 'DELETE') {
    $code = (string) ($_GET['id'] ?? '');

    if ($code === '') {
        respond(['error' => 'Patient ID is required'], 422);
    }

    $stmt = $pdo->prepare("DELETE FROM patients WHERE patient_code = ?");
    $stmt->execute([$code]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
