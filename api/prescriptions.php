<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function prescription_from_row(PDO $pdo, array $row): array
{
    $stmt = $pdo->prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ? ORDER BY sort_order ASC, id ASC');
    $stmt->execute([(int) $row['id']]);
    $medicines = array_map(fn ($med) => [
        'name' => $med['medicine_name'],
        'generic' => $med['generic_name'] ?? '',
        'dosage' => $med['dosage'] ?? '',
        'meal' => $med['meal_timing'] ?? '',
        'duration' => $med['duration'] ?? '',
        'instructions' => $med['instructions'] ?? '',
    ], $stmt->fetchAll());

    return [
        'id' => $row['prescription_code'],
        'patientId' => $row['patient_code'],
        'patient' => $row['full_name'],
        'date' => $row['prescription_date'],
        'diagnosis' => $row['diagnosis'] ?? '',
        'medicines' => count($medicines),
        'status' => $row['status'],
        'doctor' => $row['doctor_name'] ?? '',
        'doctorDetails' => implode(' - ', array_filter([
            $row['doctor_qualifications'] ?? '',
            $row['doctor_specialty'] ?? '',
        ])),
        'clinic' => implode(', ', array_filter([
            $row['doctor_clinic'] ?? '',
            $row['doctor_address'] ?? '',
        ])),
        'phone' => $row['doctor_phone'] ?? '',
        'medicineItems' => $medicines,
        'clinicalData' => [
            'Chief Complaint' => $row['chief_complaint'] ?? '',
            'History' => $row['history'] ?? '',
            'On Examination' => $row['examination'] ?? '',
            'Diagnosis' => $row['diagnosis'] ?? '',
            'Treatment Plan' => $row['treatment_plan'] ?? '',
            'Referred By' => $row['referred_by'] ?? '',
        ],
        'advice' => $row['advice'] ?? '',
        'investigation' => $row['investigation'] ?? '',
        'followUpDate' => $row['follow_up_date'],
        'followUp' => [
            'interval' => $row['follow_up_interval'] ?? '',
            'specificDate' => $row['follow_up_date'] ?? '',
            'note' => $row['follow_up_note'] ?? '',
        ],
        'referredTo' => $row['referred_to'] ?? '',
        'specialNotes' => $row['special_notes'] ?? '',
    ];
}

function get_prescription(PDO $pdo, string $code): ?array
{
    $stmt = $pdo->prepare("
        SELECT pr.*, p.patient_code, p.full_name,
               d.full_name AS doctor_name, d.qualifications AS doctor_qualifications,
               d.specialty AS doctor_specialty, d.clinic AS doctor_clinic,
               d.address AS doctor_address, d.mobile AS doctor_phone
        FROM prescriptions pr
        JOIN patients p ON p.id = pr.patient_id
        LEFT JOIN doctors d ON d.id = pr.doctor_id
        WHERE pr.prescription_code = ?
    ");
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    return $row ? prescription_from_row($pdo, $row) : null;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $code = (string) ($_GET['id'] ?? '');
    if ($code !== '') {
        $prescription = get_prescription($pdo, $code);
        if (!$prescription) {
            respond(['error' => 'Prescription not found'], 404);
        }
        respond($prescription);
    }

    $stmt = $pdo->query("
        SELECT pr.*, p.patient_code, p.full_name,
               d.full_name AS doctor_name, d.qualifications AS doctor_qualifications,
               d.specialty AS doctor_specialty, d.clinic AS doctor_clinic,
               d.address AS doctor_address, d.mobile AS doctor_phone
        FROM prescriptions pr
        JOIN patients p ON p.id = pr.patient_id
        LEFT JOIN doctors d ON d.id = pr.doctor_id
        ORDER BY pr.prescription_date DESC, pr.id DESC
    ");
    respond(array_map(fn ($row) => prescription_from_row($pdo, $row), $stmt->fetchAll()));
}

if ($method === 'POST') {
    $data = json_input();
    $patientId = fetch_patient_pk($pdo, (string) ($data['patientId'] ?? ''));
    if (!$patientId) {
        respond(['error' => 'Valid patient ID is required'], 422);
    }

    $code = next_code($pdo, 'prescriptions', 'prescription_code', 'RX-' . date('Y') . '-', 4);
    $clinical = $data['clinicalData'] ?? [];
    $doctorId = $pdo->query('SELECT id FROM doctors ORDER BY id ASC LIMIT 1')->fetchColumn();
    $stmt = $pdo->prepare("
        INSERT INTO prescriptions
          (prescription_code, patient_id, doctor_id, prescription_date, chief_complaint, history, examination,
           diagnosis, treatment_plan, referred_by, advice, investigation, follow_up_date, follow_up_interval,
           follow_up_note, referred_to, special_notes, status)
        VALUES
          (:code, :patient_id, :doctor_id, :date, :chief_complaint, :history, :examination,
           :diagnosis, :treatment_plan, :referred_by, :advice, :investigation, :follow_up_date, :follow_up_interval,
           :follow_up_note, :referred_to, :special_notes, :status)
    ");
    $stmt->execute([
        ':code' => $code,
        ':patient_id' => $patientId,
        ':doctor_id' => $doctorId !== false ? (int) $doctorId : null,
        ':date' => $data['date'] ?? date('Y-m-d'),
        ':chief_complaint' => $clinical['Chief Complaint'] ?? '',
        ':history' => $clinical['History'] ?? '',
        ':examination' => $clinical['On Examination'] ?? '',
        ':diagnosis' => $clinical['Diagnosis'] ?? ($data['diagnosis'] ?? ''),
        ':treatment_plan' => $clinical['Treatment Plan'] ?? '',
        ':referred_by' => $clinical['Referred By'] ?? '',
        ':advice' => $data['advice'] ?? '',
        ':investigation' => is_array($data['investigations'] ?? null) ? implode("\n", $data['investigations']) : ($data['investigation'] ?? ''),
        ':follow_up_date' => ($data['followUp']['specificDate'] ?? '') !== '' ? $data['followUp']['specificDate'] : null,
        ':follow_up_interval' => $data['followUp']['interval'] ?? '',
        ':follow_up_note' => $data['followUp']['note'] ?? '',
        ':referred_to' => $data['referredTo'] ?? '',
        ':special_notes' => $data['specialNotes'] ?? '',
        ':status' => $data['status'] ?? 'Final',
    ]);
    $prescriptionId = (int) $pdo->lastInsertId();

    $medicineStmt = $pdo->prepare("
        INSERT INTO prescription_medicines
          (prescription_id, medicine_name, generic_name, dosage, meal_timing, duration, instructions, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach (array_values($data['medicines'] ?? []) as $index => $medicine) {
        $name = trim((string) ($medicine['name'] ?? ''));
        if ($name !== '') {
            $medicineStmt->execute([
                $prescriptionId,
                $name,
                $medicine['generic'] ?? '',
                $medicine['dosage'] ?? '',
                $medicine['meal'] ?? '',
                $medicine['duration'] ?? '',
                $medicine['instructions'] ?? '',
                $index,
            ]);
        }
    }

    respond(get_prescription($pdo, $code), 201);
}

if ($method === 'DELETE') {
    $code = (string) ($_GET['id'] ?? '');
    if ($code === '') {
        respond(['error' => 'Prescription ID is required'], 422);
    }
    $pdo->prepare('DELETE FROM prescriptions WHERE prescription_code = ?')->execute([$code]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
