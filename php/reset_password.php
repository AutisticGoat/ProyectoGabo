<?php
require_once __DIR__ . '/conn.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

$correo          = trim($_POST['correo']          ?? '');
$codigo          = trim($_POST['codigo']          ?? '');
$nuevaPassword   = $_POST['nueva_password']       ?? '';

if ($correo === '' || $codigo === '' || $nuevaPassword === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Todos los campos son obligatorios']);
    exit;
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Correo inválido']);
    exit;
}

if (strlen($nuevaPassword) < 8) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'La contraseña debe tener al menos 8 caracteres']);
    exit;
}

try {
    $pdo = GetDataBaseConn();

    // Verificar código válido: no usado, no expirado, correo coincide
    $stmt = $pdo->prepare(
        "SELECT id FROM password_resets
         WHERE correo = ? AND codigo = ? AND usado = 0 AND expira_en > UTC_TIMESTAMP()
         ORDER BY creado_en DESC LIMIT 1"
    );
    $stmt->execute([$correo, $codigo]);
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Código inválido o expirado']);
        exit;
    }

    // Marcar código como usado
    $pdo->prepare("UPDATE password_resets SET usado = 1 WHERE id = ?")
        ->execute([$reset['id']]);

    // Actualizar contraseña con Bcrypt
    $hash = password_hash($nuevaPassword, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE usuarios SET password_hash = ? WHERE correo = ?")
        ->execute([$hash, $correo]);

    echo json_encode(['ok' => true, 'message' => 'Contraseña actualizada correctamente']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error del servidor']);
}
?>