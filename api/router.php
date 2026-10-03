<?php
// Router for PHP's built-in dev server (npm run api). Uploaded reports are
// only served through reports_files.php, never as direct static files.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/uploads/')) {
    http_response_code(404);
    exit;
}
return false;
