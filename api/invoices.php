<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function invoice_from_row(array $row): array
{
    return [
        'id' => $row['invoice_code'],
        'patientId' => $row['patient_code'],
        'patient' => $row['full_name'],
        'date' => $row['invoice_date'],
        'amount' => (float) $row['amount'],
        'discount' => (float) $row['discount'],
        'paid' => (float) $row['paid'],
        'due' => (float) $row['due'],
        'method' => $row['payment_method'] ?? '',
        'status' => $row['status'],
        'serviceType' => $row['service_type'] ?? '',
        'notes' => $row['notes'] ?? '',
    ];
}

function get_invoice(PDO $pdo, string $code): ?array
{
    $stmt = $pdo->prepare("
        SELECT i.*, p.patient_code, p.full_name
        FROM invoices i
        JOIN patients p ON p.id = i.patient_id
        WHERE i.invoice_code = ?
    ");
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    return $row ? invoice_from_row($row) : null;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT i.*, p.patient_code, p.full_name
        FROM invoices i
        JOIN patients p ON p.id = i.patient_id
        ORDER BY i.invoice_date DESC, i.id DESC
    ");
    respond(array_map('invoice_from_row', $stmt->fetchAll()));
}

if ($method === 'POST') {
    $data = json_input();
    $patientId = fetch_patient_pk($pdo, (string) ($data['patientId'] ?? ''));
    if (!$patientId) {
        respond(['error' => 'Valid patient ID is required'], 422);
    }

    $code = next_code($pdo, 'invoices', 'invoice_code', 'INV-');
    $stmt = $pdo->prepare("
        INSERT INTO invoices
          (invoice_code, patient_id, invoice_date, amount, discount, paid, due, payment_method, status, service_type, notes)
        VALUES
          (:code, :patient_id, :date, :amount, :discount, :paid, :due, :method, :status, :service_type, :notes)
    ");
    $stmt->execute([
        ':code' => $code,
        ':patient_id' => $patientId,
        ':date' => $data['date'] ?? date('Y-m-d'),
        ':amount' => (float) ($data['amount'] ?? 0),
        ':discount' => (float) ($data['discount'] ?? 0),
        ':paid' => (float) ($data['paid'] ?? 0),
        ':due' => (float) ($data['due'] ?? 0),
        ':method' => $data['method'] ?? null,
        ':status' => $data['status'] ?? 'Unpaid',
        ':service_type' => $data['serviceType'] ?? null,
        ':notes' => $data['notes'] ?? '',
    ]);

    respond(get_invoice($pdo, $code), 201);
}

if ($method === 'DELETE') {
    $code = (string) ($_GET['id'] ?? '');
    if ($code === '') {
        respond(['error' => 'Invoice ID is required'], 422);
    }
    $stmt = $pdo->prepare('DELETE FROM invoices WHERE invoice_code = ?');
    $stmt->execute([$code]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
