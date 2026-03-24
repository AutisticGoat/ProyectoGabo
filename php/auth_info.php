<?php
require_once __DIR__ . '/auth.php';
requireAuth();

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'ok'         => true,
    'nivel_rol'  => getUserNivel(),
    'nombre_rol' => getUserRol(),
]);
?>