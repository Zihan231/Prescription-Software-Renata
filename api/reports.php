<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

$period = $_GET['period'] ?? 'month';
$startDate = match ($period) {
    'today' => date('Y-m-d'),
    'week' => date('Y-m-d', strtotime('-6 days')),
    default => date('Y-m-01', strtotime('-5 months')),
};

function scalar_count(PDO $pdo, string $sql, array $params = []): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->fetchColumn();
}

function scalar_sum(PDO $pdo, string $sql, array $params = []): float
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (float) ($stmt->fetchColumn() ?: 0);
}

$totalPatients = scalar_count($pdo, 'SELECT COUNT(*) FROM patients');
$totalPrescriptions = scalar_count($pdo, 'SELECT COUNT(*) FROM prescriptions');
$totalAppointments = scalar_count($pdo, 'SELECT COUNT(*) FROM appointments');
$totalRevenue = scalar_sum($pdo, 'SELECT COALESCE(SUM(paid), 0) FROM invoices');

$patientStmt = $pdo->prepare("
    SELECT DATE_FORMAT(created_at, '%b') AS month,
           COUNT(*) AS new_patients,
           0 AS returning_patients,
           DATE_FORMAT(created_at, '%Y-%m') AS month_key
    FROM patients
    WHERE DATE(created_at) >= ?
    GROUP BY month_key, month
    ORDER BY month_key ASC
");
$patientStmt->execute([$startDate]);
$patientTrends = array_map(fn ($row) => [
    'month' => $row['month'],
    'new' => (int) $row['new_patients'],
    'returning' => (int) $row['returning_patients'],
], $patientStmt->fetchAll());

$rxStmt = $pdo->prepare("
    SELECT DATE_FORMAT(prescription_date, '%b') AS month,
           COUNT(*) AS prescriptions,
           DATE_FORMAT(prescription_date, '%Y-%m') AS month_key
    FROM prescriptions
    WHERE prescription_date >= ?
    GROUP BY month_key, month
    ORDER BY month_key ASC
");
$rxStmt->execute([$startDate]);
$prescriptionVolume = array_map(fn ($row) => [
    'month' => $row['month'],
    'prescriptions' => (int) $row['prescriptions'],
], $rxStmt->fetchAll());

$diagnosisStmt = $pdo->query("
    SELECT diagnosis AS label, COUNT(*) AS total
    FROM prescriptions
    WHERE diagnosis IS NOT NULL AND TRIM(diagnosis) <> ''
    GROUP BY diagnosis
    ORDER BY total DESC, diagnosis ASC
    LIMIT 5
");
$diagnosisRows = $diagnosisStmt->fetchAll();
$maxDiagnosis = max(array_map(fn ($row) => (int) $row['total'], $diagnosisRows) ?: [0]);
$commonDiagnoses = array_map(fn ($row) => [
    'label' => $row['label'],
    'count' => (int) $row['total'] . ' cases',
    'pct' => $maxDiagnosis > 0 ? (int) round(((int) $row['total'] / $maxDiagnosis) * 100) : 0,
], $diagnosisRows);

$medicineStmt = $pdo->query("
    SELECT medicine_name AS label, COUNT(*) AS total
    FROM prescription_medicines
    WHERE medicine_name IS NOT NULL AND TRIM(medicine_name) <> ''
    GROUP BY medicine_name
    ORDER BY total DESC, medicine_name ASC
    LIMIT 5
");
$medicineRows = $medicineStmt->fetchAll();
$maxMedicine = max(array_map(fn ($row) => (int) $row['total'], $medicineRows) ?: [0]);
$topMedicines = array_map(fn ($row) => [
    'label' => $row['label'],
    'count' => (int) $row['total'] . ' times',
    'pct' => $maxMedicine > 0 ? (int) round(((int) $row['total'] / $maxMedicine) * 100) : 0,
], $medicineRows);

respond([
    'totals' => [
        'patients' => $totalPatients,
        'prescriptions' => $totalPrescriptions,
        'appointments' => $totalAppointments,
        'revenue' => $totalRevenue,
    ],
    'patientTrends' => $patientTrends,
    'prescriptionVolume' => $prescriptionVolume,
    'commonDiagnoses' => $commonDiagnoses,
    'topMedicines' => $topMedicines,
]);
