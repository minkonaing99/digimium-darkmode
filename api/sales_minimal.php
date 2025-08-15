<?php
// api/sales_minimal.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// Buffer output so we can discard HTML warnings/notices and still return JSON.
ob_start();

try {
    // Don't echo PHP warnings to the client; log them instead.
    ini_set('display_errors', '0');
    error_reporting(E_ALL);

    // Use your existing PDO bootstrap
    require_once __DIR__ . '/dbinfo.php';  // must define $pdo = new PDO(...)

    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('DB connection ($pdo) not initialized.');
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("
        SELECT
            id,
            product_name,
            price,
            profit,
            purchase_date,
            end_date,
            customer,
            gmail,
            duration
        FROM product_sold
        ORDER BY purchase_date DESC, id DESC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Debug: log the number of rows returned
    error_log("sales_minimal.php: Retrieved " . count($rows) . " rows from product_sold table");

    foreach ($rows as &$r) {
        $r['id']             = isset($r['id'])             ? (int)$r['id']             : null;
        $r['product_name']   = $r['product_name']          ?? null;
        $r['price']          = isset($r['price'])          ? (float)$r['price']        : 0.0;
        $r['profit']         = isset($r['profit'])         ? (float)$r['profit']       : 0.0;

        // Dates / strings
        $r['purchase_date']  = $r['purchase_date']         ?? null; // "YYYY-MM-DD"
        $r['end_date']       = $r['end_date']              ?? null; // "YYYY-MM-DD" or null
        $r['customer']       = $r['customer']              ?? null;
        $r['gmail']          = $r['gmail']                 ?? null;

        // Duration as INT (months)
        $r['duration']       = isset($r['duration'])       ? (int)$r['duration']       : null;
    }
    unset($r);

    // Success: discard buffered HTML (if any) and return JSON
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'data'    => $rows
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
} catch (Throwable $e) {
    // Error: discard buffered HTML and return error JSON
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
