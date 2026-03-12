<?php
require_once __DIR__ . "/conn.php";

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Requiere sesión activa ─────────────────────────
function requireAuth() {
    if (!isset($_SESSION["id_usuario"])) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(401);
        echo json_encode(["ok" => false, "error" => "No autorizado"]);
        exit;
    }
}

// ── Requiere rol administrador ─────────────────────
function requireAdmin() {
    requireAuth();
    if (($_SESSION["rol"] ?? "") !== "administrador") {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(403);
        echo json_encode(["ok" => false, "error" => "Acceso denegado"]);
        exit;
    }
}

function getUserId() {
    return (int) ($_SESSION["id_usuario"] ?? 0);
}

function getUserRol() {
    return $_SESSION["rol"] ?? "usuario";
}