<?php
// =====================================================
// reset_password.php — Valida código y actualiza contraseña
// =====================================================

require_once __DIR__ . "/conn.php";

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Método no permitido"]);
    exit;
}

// ── Leer y validar entrada ─────────────────────────
$input    = json_decode(file_get_contents("php://input"), true) ?: $_POST;
$correo   = trim($input["correo"]   ?? $input["email"]    ?? "");
$codigo   = trim($input["codigo"]   ?? "");
$password = $input["password"] ?? "";

if ($correo === "" || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Correo inválido"]);
    exit;
}

if (!preg_match('/^\d{6}$/', $codigo)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "El código debe tener exactamente 6 dígitos"]);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "La contraseña debe tener al menos 6 caracteres"]);
    exit;
}

try {
    $pdo = GetDataBaseConn();

    // ── Buscar código válido (no usado, no expirado) ─
    $stmt = $pdo->prepare("
        SELECT id
        FROM password_resets
        WHERE correo    = ?
          AND codigo    = ?
          AND usado     = FALSE
          AND expira_en > NOW()
        ORDER BY creado_en DESC
        LIMIT 1
    ");
    $stmt->execute([$correo, $codigo]);
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Código incorrecto o expirado"]);
        exit;
    }

    // ── Marcar el código como usado ────────────────
    $pdo->prepare("UPDATE password_resets SET usado = TRUE WHERE id = ?")
        ->execute([$reset["id"]]);

    // ── Actualizar contraseña del usuario ──────────
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE usuarios SET password_hash = ? WHERE correo = ?")
        ->execute([$hash, $correo]);

    echo json_encode(["ok" => true, "redirect" => "login.html"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Error del servidor"]);
}