<?php
// =====================================================
// admin_stats.php — Estadísticas generales (solo admin)
// GET /php/admin_stats.php
// =====================================================

require_once __DIR__ . "/auth.php";
requireAdmin();

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Método no permitido"]);
    exit;
}

try {
    $pdo = GetDataBaseConn();

    $totalUsuarios = (int) $pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    $usuariosActivos = (int) $pdo->query("SELECT COUNT(*) FROM usuarios WHERE estado = 'activo'")->fetchColumn();
    $totalRutinas  = (int) $pdo->query("SELECT COUNT(*) FROM rutinas")->fetchColumn();
    $totalHabitos  = (int) $pdo->query("SELECT COUNT(*) FROM habitos")->fetchColumn();

    echo json_encode([
        "ok"              => true,
        "total_usuarios"  => $totalUsuarios,
        "usuarios_activos" => $usuariosActivos,
        "total_rutinas"   => $totalRutinas,
        "total_habitos"   => $totalHabitos,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Error del servidor"]);
}