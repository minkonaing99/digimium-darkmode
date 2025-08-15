<?php
// api/sales_export_csv.php
declare(strict_types=1);

// --- debug switch ---
$debug = isset($_GET['debug']) && $_GET['debug'] !== '0';
if ($debug) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(E_ALL);
}

function fail(int $code, string $msg, bool $debug): void
{
    http_response_code($code);
    header('Content-Type: text/plain; charset=utf-8');
    echo $debug ? $msg : 'Export failed.';
    exit;
}

// ---- Load PDO from your bootstrap (dbinfo.php) ----
$pdo = null;
$tried = [];
$tryPaths = [
    __DIR__ . '/../dbinfo.php',
    __DIR__ . '/dbinfo.php',
    dirname(__DIR__) . '/dbinfo.php',
];

$loaded = false;

require_once __DIR__ . '/dbinfo.php';

// ---- Query (no id in export) ----
$sql = "
    SELECT
        product_name,
        duration,
        customer,
        gmail,
        purchase_date,
        end_date,
        seller,
        note,
        price,
        profit
    FROM product_sold
    ORDER BY purchase_date DESC, id DESC
";
try {
    $stmt = $pdo->query($sql);
} catch (Throwable $e) {
    fail(500, 'Query failed: ' . $e->getMessage(), $debug);
}

// ---- Send CSV headers only after success ----
$filename = 'sales_export_' . date('Ymd_His') . '.csv';
header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('X-Content-Type-Options: nosniff');

// UTF-8 BOM (Excel-friendly)
echo "\xEF\xBB\xBF";

$out = fopen('php://output', 'w');
if ($out === false) {
    fail(500, 'Unable to open output stream.', $debug);
}

// Header row
$headers = [
    'product_name',
    'duration',
    'customer',
    'gmail',
    'purchase_date',
    'end_date',
    'seller',
    'note',
    'price',
    'profit',
];
fputcsv($out, $headers);

// Stream rows
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    // Normalize types
    $row['duration'] = isset($row['duration']) ? (int)$row['duration'] : null;
    $row['price']    = isset($row['price']) ? (float)$row['price'] : 0.0;
    $row['profit']   = isset($row['profit']) ? (float)$row['profit'] : 0.0;

    fputcsv($out, $row);
}

fclose($out);
