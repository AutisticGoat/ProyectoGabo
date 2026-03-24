<?php
// Devuelve información básica del rol del usuario autenticado
// Usado por el frontend para mostrar/ocultar elementos según permisos
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

echo json_encode([
    "ok"         => true,
    "nivel_rol"  => getUserNivel(),
    "nombre_rol" => getUserRol(),
]);