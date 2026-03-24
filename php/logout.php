<?php
require_once __DIR__ . '/conn.php';
require_once __DIR__ . '/auth.php';

// Revocar el JWT de esta sesión en la BD
if (!empty($_SESSION['jti'])) {
    revokeJti($_SESSION['jti']);
}

// Opción: logout global (cierra TODAS las sesiones del usuario)
// Descomentar si se quiere "cerrar sesión en todos los dispositivos"
// if (!empty($_SESSION['id_usuario'])) {
//     revokeAllSessions((int) $_SESSION['id_usuario']);
// }

// Destruir sesión PHP
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();

header('Location: ../login.html');
exit;
?>