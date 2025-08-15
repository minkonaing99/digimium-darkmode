<?php
// api/sales_table.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/dbinfo.php'; // provides $pdo

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('PDO connection not initialized. Check dbinfo.php');
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $stmt = $pdo->query("
        SELECT
            id,
            product_name,
            duration,
            customer,
            gmail,
            purchase_date,
            end_date,
            seller,
            note,
            price
        FROM product_sold
        ORDER BY purchase_date DESC, id DESC
    ");
    $rows = $stmt->fetchAll();

    // Normalize types
    foreach ($rows as &$r) {
        $r['id']             = isset($r['id']) ? (int)$r['id'] : null;
        $r['duration']       = isset($r['duration']) ? (int)$r['duration'] : null;

        $r['price']          = isset($r['price']) ? (float)$r['price'] : 0.0;

        // Nullable strings/dates
        $r['product_name']   = $r['product_name'] ?? null;
        $r['customer']       = $r['customer'] ?? null;
        $r['gmail']          = $r['gmail'] ?? null;
        $r['purchase_date']  = $r['purchase_date'] ?? null; // 'YYYY-MM-DD'
        $r['end_date']       = $r['end_date'] ?? null;   // 'YYYY-MM-DD' or null
        $r['seller']         = $r['seller'] ?? null;
        $r['note']           = $r['note'] ?? null;
    }
    unset($r);

    echo json_encode(
        ['success' => true, 'data' => $rows],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION
    );
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(
        ['success' => false, 'error' => $e->getMessage()],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
}
