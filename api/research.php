<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function research_from_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'description' => $row['description'] ?? '',
        'currentStep' => (int) $row['current_step'],
        'status' => $row['status'],
        'metadata' => $row['metadata'] ? json_decode((string) $row['metadata'], true) : new stdClass(),
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function get_research(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM research_projects WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? research_from_row($row) : null;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM research_projects ORDER BY updated_at DESC, id DESC');
    respond(array_map('research_from_row', $stmt->fetchAll()));
}

if ($method === 'POST') {
    $data = json_input();
    $title = trim((string) ($data['title'] ?? ''));
    if ($title === '') {
        respond(['error' => 'Project title is required'], 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO research_projects (title, description, current_step, status, metadata)
        VALUES (:title, :description, :current_step, :status, :metadata)
    ");
    $stmt->execute([
        ':title' => $title,
        ':description' => $data['description'] ?? '',
        ':current_step' => (int) ($data['currentStep'] ?? 0),
        ':status' => $data['status'] ?? 'Draft',
        ':metadata' => json_encode($data['metadata'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
    ]);

    respond(get_research($pdo, (int) $pdo->lastInsertId()), 201);
}

if ($method === 'PUT') {
    $data = json_input();
    $id = (int) ($data['id'] ?? 0);
    if ($id <= 0) {
        respond(['error' => 'Research project ID is required'], 422);
    }

    $stmt = $pdo->prepare("
        UPDATE research_projects
        SET title = :title,
            description = :description,
            current_step = :current_step,
            status = :status,
            metadata = :metadata
        WHERE id = :id
    ");
    $stmt->execute([
        ':id' => $id,
        ':title' => trim((string) ($data['title'] ?? '')),
        ':description' => $data['description'] ?? '',
        ':current_step' => (int) ($data['currentStep'] ?? 0),
        ':status' => $data['status'] ?? 'Draft',
        ':metadata' => json_encode($data['metadata'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
    ]);

    $project = get_research($pdo, $id);
    if (!$project) {
        respond(['error' => 'Research project not found'], 404);
    }
    respond($project);
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        respond(['error' => 'Research project ID is required'], 422);
    }

    $stmt = $pdo->prepare('DELETE FROM research_projects WHERE id = ?');
    $stmt->execute([$id]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
