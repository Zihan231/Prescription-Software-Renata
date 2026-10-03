<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function appointment_from_row(array $row): array
{
    $time = substr((string) $row['appointment_time'], 0, 5);
    $display = DateTimeImmutable::createFromFormat('H:i', $time);

    return [
        'id' => $row['appointment_code'],
        'patientId' => $row['patient_code'],
        'patient' => $row['full_name'],
        'mobile' => $row['mobile'],
        'age' => (int) ($row['age'] ?? 0),
        'gender' => $row['gender'],
        'date' => $row['appointment_date'],
        'time' => $display ? $display->format('h:i A') : $time,
        'serial' => (int) $row['serial_no'],
        'status' => $row['status'],
        'type' => $row['appointment_type'] ?? '',
        'duration' => (int) ($row['duration_minutes'] ?? 30),
        'notes' => $row['notes'] ?? '',
    ];
}

function get_appointment(PDO $pdo, string $code): ?array
{
    $stmt = $pdo->prepare("
        SELECT a.*, p.patient_code, p.full_name, p.mobile, p.age, p.gender
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.appointment_code = ?
    ");
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    return $row ? appointment_from_row($row) : null;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT a.*, p.patient_code, p.full_name, p.mobile, p.age, p.gender
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
    ");
    respond(array_map('appointment_from_row', $stmt->fetchAll()));
}

if ($method === 'POST') {
    $data = json_input();
    $patientId = fetch_patient_pk($pdo, (string) ($data['patientId'] ?? ''));
    if (!$patientId) {
        respond(['error' => 'Valid patient ID is required'], 422);
    }

    $code = next_code($pdo, 'appointments', 'appointment_code', 'APT-');
    $date = ($data['date'] ?? '') !== '' ? $data['date'] : date('Y-m-d');
    $time = ($data['rawTime'] ?? $data['time'] ?? '') !== '' ? ($data['rawTime'] ?? $data['time']) : date('H:i:s');

    $stmt = $pdo->prepare("
        SELECT COALESCE(MAX(serial_no), 0) + 1
        FROM appointments
        WHERE appointment_date = ?
    ");
    $stmt->execute([$date]);
    $serial = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare("
        INSERT INTO appointments
          (appointment_code, patient_id, appointment_date, appointment_time, serial_no, status, appointment_type, duration_minutes, notes)
        VALUES
          (:code, :patient_id, :date, :time, :serial, :status, :type, :duration, :notes)
    ");
    $stmt->execute([
        ':code' => $code,
        ':patient_id' => $patientId,
        ':date' => $date,
        ':time' => $time,
        ':serial' => $serial,
        ':status' => $data['status'] ?? 'Confirmed',
        ':type' => $data['type'] ?? null,
        ':duration' => (int) ($data['duration'] ?? 30),
        ':notes' => $data['notes'] ?? '',
    ]);

    respond(get_appointment($pdo, $code), 201);
}

if ($method === 'PUT') {
    $data = json_input();
    $code = (string) ($data['id'] ?? '');
    if ($code === '') {
        respond(['error' => 'Appointment ID is required'], 422);
    }

    $stmt = $pdo->prepare("
        UPDATE appointments
        SET status = COALESCE(:status, status),
            notes = COALESCE(:notes, notes)
        WHERE appointment_code = :code
    ");
    $stmt->execute([
        ':code' => $code,
        ':status' => $data['status'] ?? null,
        ':notes' => $data['notes'] ?? null,
    ]);

    $appointment = get_appointment($pdo, $code);
    if (!$appointment) {
        respond(['error' => 'Appointment not found'], 404);
    }
    respond($appointment);
}

if ($method === 'DELETE') {
    $code = (string) ($_GET['id'] ?? '');
    if ($code === '') {
        respond(['error' => 'Appointment ID is required'], 422);
    }
    $stmt = $pdo->prepare('DELETE FROM appointments WHERE appointment_code = ?');
    $stmt->execute([$code]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
