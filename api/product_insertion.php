<?php
// api/product_insertion.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST'); // POST only

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

require_once __DIR__ . '/dbinfo.php';

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('PDO connection not initialized. Check dbinfo.php');
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Read JSON body
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new InvalidArgumentException('Invalid JSON payload.');
    }

    // Helpers
    $MAX_VARCHAR = 255;
    $MAX_URL_LEN = 2083;


    $trimOrNull = function ($v) {
        if ($v === null) return null;
        $s = trim((string)$v);
        return $s === '' ? null : $s;
    };
    $toInt = function ($v) {
        if ($v === '' || $v === null || $v === false) return null;
        if (!is_numeric($v)) return null;
        return (int)$v;
    };
    $toDecimalString = function ($v) {
        if ($v === '' || $v === null || $v === false) return null;
        if (!is_numeric($v)) return null;
        return number_format((float)$v, 2, '.', ''); // DECIMAL(10,2) safe string
    };
    $isHttpUrl = function ($u) use ($MAX_URL_LEN) {
        if ($u === null) return true;
        if (mb_strlen($u) > $MAX_URL_LEN) return false;
        if (!filter_var($u, FILTER_VALIDATE_URL)) return false;
        $scheme = parse_url($u, PHP_URL_SCHEME);
        return in_array($scheme, ['http', 'https'], true);
    };

    // Extract & normalize
    $product_name = $trimOrNull($data['product_name'] ?? null);
    $duration     = $toInt($data['duration'] ?? null);

    $supplier     = $trimOrNull($data['supplier'] ?? null);
    $wc_priceStr  = $toDecimalString($data['wc_price'] ?? null);
    $retail_priceStr = $toDecimalString($data['retail_price'] ?? null);
    $notes        = $trimOrNull($data['notes'] ?? null);
    $link         = $trimOrNull($data['link'] ?? null);

    // Make link forgiving
    if ($link !== null) {
        if (!preg_match('~^https?://~i', $link)) {
            $link = 'https://' . $link;
        }
        $link = preg_replace('/\s+/', '%20', $link);
    }

    // Validate
    $errors = [];
    if (!$product_name) {
        $errors['product_name'] = 'Product name is required.';
    } elseif (mb_strlen($product_name) > $MAX_VARCHAR) {
        $errors['product_name'] = "Max {$MAX_VARCHAR} characters.";
    }

    if (!is_int($duration) || $duration < 1) {
        $errors['duration'] = 'Duration must be an integer ≥ 1.';
    }

    if ($supplier !== null && mb_strlen($supplier) > $MAX_VARCHAR) {
        $errors['supplier'] = "Max {$MAX_VARCHAR} characters.";
    }

    if ($wc_priceStr === null || (float)$wc_priceStr < 0) {
        $errors['wc_price'] = 'WC price must be a number ≥ 0.';
    }

    if ($retail_priceStr === null) {
        $errors['retail_price'] = 'Retail price is required.';
    } elseif ((float)$retail_priceStr <= (float)$wc_priceStr) {
        $errors['retail_price'] = 'Retail must be greater than WC price.';
    }

    if ($link !== null && !$isHttpUrl($link)) {
        $errors['link'] = 'Link must be a valid http(s) URL (≤ 2083 chars).';
    }

    if ($errors) {
        http_response_code(422);
        echo json_encode(['success' => false, 'errors' => $errors]);
        exit;
    }

    // Insert
    $sql = "
        INSERT INTO product_list
            (product_name, duration, supplier, wc_price, retail_price, notes, link)
        VALUES
            (:product_name, :duration, :supplier, :wc_price, :retail_price, :notes, :link)
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':product_name' => $product_name,
        ':duration'     => $duration,
        ':supplier'     => $supplier,
        ':wc_price'     => $wc_priceStr,
        ':retail_price' => $retail_priceStr,
        ':notes'        => $notes,
        ':link'         => $link
    ]);

    $id = (int)$pdo->lastInsertId();

    http_response_code(201);
    echo json_encode(['success' => true, 'id' => $id]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
