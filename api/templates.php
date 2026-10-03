<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

function template_from_row(PDO $pdo, array $row): array
{
    $stmt = $pdo->prepare('SELECT section_name FROM template_sections WHERE template_id = ? ORDER BY sort_order ASC, id ASC');
    $stmt->execute([(int) $row['id']]);

    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'desc' => $row['description'] ?? '',
        'tags' => $row['specialty'] ? array_map('trim', explode(',', $row['specialty'])) : [],
        'isDefault' => (bool) $row['is_default'],
        'used' => (int) $row['used_count'],
        'sections' => array_column($stmt->fetchAll(), 'section_name'),
    ];
}

function get_template(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM prescription_templates WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? template_from_row($pdo, $row) : null;
}

function save_sections(PDO $pdo, int $templateId, array $sections): void
{
    $pdo->prepare('DELETE FROM template_sections WHERE template_id = ?')->execute([$templateId]);
    $stmt = $pdo->prepare('INSERT INTO template_sections (template_id, section_name, sort_order) VALUES (?, ?, ?)');
    foreach (array_values($sections) as $index => $section) {
        if (trim((string) $section) !== '') {
            $stmt->execute([$templateId, trim((string) $section), $index]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM prescription_templates ORDER BY is_default DESC, name ASC');
    respond(array_map(fn ($row) => template_from_row($pdo, $row), $stmt->fetchAll()));
}

if ($method === 'POST') {
    $data = json_input();
    if (empty($data['name'])) {
        respond(['error' => 'Template name is required'], 422);
    }

    if (!empty($data['isDefault'])) {
        $pdo->exec('UPDATE prescription_templates SET is_default = 0');
    }

    $stmt = $pdo->prepare('
        INSERT INTO prescription_templates (name, description, specialty, is_default, used_count)
        VALUES (:name, :description, :specialty, :is_default, :used_count)
    ');
    $stmt->execute([
        ':name' => trim((string) $data['name']),
        ':description' => $data['desc'] ?? '',
        ':specialty' => implode(',', $data['tags'] ?? []),
        ':is_default' => !empty($data['isDefault']) ? 1 : 0,
        ':used_count' => (int) ($data['used'] ?? 0),
    ]);
    $id = (int) $pdo->lastInsertId();
    save_sections($pdo, $id, $data['sections'] ?? []);
    respond(get_template($pdo, $id), 201);
}

if ($method === 'PUT') {
    $data = json_input();
    $id = (int) ($data['id'] ?? 0);
    if ($id <= 0) {
        respond(['error' => 'Template ID is required'], 422);
    }

    if (!empty($data['isDefault'])) {
        $pdo->exec('UPDATE prescription_templates SET is_default = 0');
    }

    if (!empty($data['incrementUsed'])) {
        $stmt = $pdo->prepare('UPDATE prescription_templates SET used_count = used_count + 1 WHERE id = ?');
        $stmt->execute([$id]);
    } else {
        $stmt = $pdo->prepare('
            UPDATE prescription_templates
            SET name = :name, description = :description, specialty = :specialty, is_default = :is_default
            WHERE id = :id
        ');
        $stmt->execute([
            ':id' => $id,
            ':name' => trim((string) $data['name']),
            ':description' => $data['desc'] ?? '',
            ':specialty' => implode(',', $data['tags'] ?? []),
            ':is_default' => !empty($data['isDefault']) ? 1 : 0,
        ]);
        save_sections($pdo, $id, $data['sections'] ?? []);
    }

    $template = get_template($pdo, $id);
    if (!$template) {
        respond(['error' => 'Template not found'], 404);
    }
    respond($template);
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        respond(['error' => 'Template ID is required'], 422);
    }
    $pdo->prepare('DELETE FROM prescription_templates WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
