<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once './dbinfo.php'; // your PDO connection

try {
    // Pull raw int plus a computed boolean for a painless shim
    $stmt = $pdo->query("
        SELECT 
            product_id,
            product_name,
            duration,
            supplier,
            wc_price,
            retail_price,
            notes,
            link
        FROM product_list
        ORDER BY product_name ASC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        // Integers
        $r['product_id'] = isset($r['product_id']) ? (int)$r['product_id'] : null;
        $r['duration']   = isset($r['duration']) ? (int)$r['duration'] : null;

        // Money as numbers
        $r['wc_price']     = isset($r['wc_price']) ? (float)$r['wc_price'] : 0.0;
        $r['retail_price'] = isset($r['retail_price']) ? (float)$r['retail_price'] : 0.0;

        // Nullable strings
        $r['supplier']   = $r['supplier'] ?? null;
        $r['notes']      = $r['notes'] ?? null;
        $r['link']       = $r['link'] ?? null;
    }
    unset($r);

    echo json_encode([
        'success' => true,
        'data'    => $rows
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
