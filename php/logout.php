<?php
require_once __DIR__ . '/conn.php';
require_once __DIR__ . '/auth.php';

// Revocar JWT de esta sesión
if (!empty($_SESSION['jti'])) {
    revokeJti($_SESSION['jti']);
}

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