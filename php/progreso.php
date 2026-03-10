<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id_usuario = getUserId();

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Método no permitido"]);
    exit;
}

$desde = $_GET["desde"] ?? date("Y-m-d", strtotime("-7 days"));
$hasta = $_GET["hasta"] ?? date("Y-m-d");

try {
    $pdo = GetDataBaseConn();
    $stmt = $pdo->prepare(
        "SELECT id_progreso, fecha, porcentaje_cumplimiento FROM progreso WHERE id_usuario = ? AND fecha >= ? AND fecha <= ? ORDER BY fecha DESC"
    );
    $stmt->execute([$id_usuario, $desde, $hasta]);
    $progreso = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["ok" => true, "progreso" => $progreso]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
