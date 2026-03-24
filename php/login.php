<?php
require_once __DIR__ . '/conn.php';
require_once __DIR__ . '/JwtHelper.php';
require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../login.html');
    exit;
}

$correo   = trim($_POST['correo'] ?? $_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$tzRaw    = $_POST['timezone'] ?? 'UTC';
$timezone = in_array($tzRaw, timezone_identifiers_list(), true) ? $tzRaw : 'UTC';

header('Content-Type: application/json; charset=utf-8');

if ($correo === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Correo y contraseña son obligatorios']);
    exit;
}

try {
    $pdo = GetDataBaseConn();

    // Obtener usuario + datos de rol en una sola query
    $stmt = $pdo->prepare(
        "SELECT u.id_usuario, u.nombre, u.correo, u.password_hash, u.estado,
                r.nombre AS nombre_rol, r.nivel AS nivel_rol
         FROM usuarios u
         JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.correo = ? LIMIT 1"
    );
    $stmt->execute([$correo]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Respuesta genérica para no revelar si el correo existe
    $errorCredenciales = ['ok' => false, 'error' => 'Credenciales incorrectas'];

    if (!$user || $user['estado'] !== 'activo') {
        http_response_code(401);
        echo json_encode($errorCredenciales);
        exit;
    }

    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode($errorCredenciales);
        exit;
    }

    // ── Datos de la solicitud para detección de hijacking ──
    $ip     = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $uaHash = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');

    // ── Generar JWT ────────────────────────────────────────
    $payload = [
        'sub'    => (int) $user['id_usuario'],   // subject: ID del usuario
        'rol'    => $user['nombre_rol'],           // nombre del rol
        'nivel'  => (int) $user['nivel_rol'],      // nivel jerárquico
        'uah'    => $uaHash,                       // user-agent hash (anti-hijacking)
    ];
    $token = JwtHelper::encode($payload);
    $jti   = JwtHelper::peekJti($token);

    // ── Registrar sesión en BD (gestión multisesión) ───────
    registerSession($pdo, (int) $user['id_usuario'], $jti, $ip, $uaHash, JwtHelper::TTL_SEGUNDOS);

    // ── Iniciar sesión PHP también (para el dashboard web) ─
    session_regenerate_id(true);
    $_SESSION['id_usuario'] = (int) $user['id_usuario'];
    $_SESSION['nombre']     = $user['nombre'];
    $_SESSION['correo']     = $user['correo'];
    $_SESSION['nombre_rol'] = $user['nombre_rol'];
    $_SESSION['nivel_rol']  = (int) $user['nivel_rol'];
    $_SESSION['timezone']   = $timezone;
    $_SESSION['jti']        = $jti; // para poder revocar al hacer logout

    // Redirigir según nivel de rol
    $redirect = $user['nivel_rol'] <= 2 ? 'admin.html' : 'dashboard.html';

    echo json_encode([
        'ok'       => true,
        'redirect' => $redirect,
        'rol'      => $user['nombre_rol'],
        'nivel'    => (int) $user['nivel_rol'],
        'token'    => $token,              // JWT para clientes API
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error del servidor']);
}
?>