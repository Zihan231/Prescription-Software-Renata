<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function medicine_from_row(array $row): array
{
    return [
        'sku' => $row['sku'],
        'brand' => $row['product_name'],
        'generic' => $row['generic_name'] ?? '',
        'company' => $row['company'] ?? '',
        'form' => $row['form'] ?: 'Medicine',
        'strength' => $row['strength'] ?? '',
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $query = trim((string) ($_GET['q'] ?? ''));
    $limit = max(1, min(100, (int) ($_GET['limit'] ?? 50)));

    if ($query !== '') {
        $stmt = $pdo->prepare("
            SELECT sku, product_name, generic_name, company, form, strength
            FROM medicines
            WHERE product_name LIKE :query
               OR generic_name LIKE :query
               OR company LIKE :query
               OR sku LIKE :query
            ORDER BY product_name ASC
            LIMIT {$limit}
        ");
        $stmt->execute([':query' => '%' . $query . '%']);
    } else {
        $stmt = $pdo->query("
            SELECT sku, product_name, generic_name, company, form, strength
            FROM medicines
            ORDER BY product_name ASC
            LIMIT {$limit}
        ");
    }

    respond(array_map('medicine_from_row', $stmt->fetchAll()));
}

respond(['error' => 'Method not allowed'], 405);
