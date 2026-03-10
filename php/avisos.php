<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id_usuario = getUserId();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT id_aviso, mensaje, tipo, fecha_programada, estado FROM avisos WHERE id_usuario = ? ORDER BY fecha_programada DESC"
        );
        $stmt->execute([$id_usuario]);
        $avisos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["ok" => true, "avisos" => $avisos]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $mensaje = trim($input["mensaje"] ?? "");
    $tipo = $input["tipo"] ?? "personalizado";
    $fecha_programada = $input["fecha_programada"] ?? date("Y-m-d H:i:s");
    if ($mensaje === "") {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Mensaje obligatorio"]);
        exit;
    }
    if (!in_array($tipo, ["automatico", "personalizado"], true)) $tipo = "personalizado";
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "INSERT INTO avisos (id_usuario, mensaje, tipo, fecha_programada, estado) VALUES (?, ?, ?, ?, 'activo')"
        );
        $stmt->execute([$id_usuario, $mensaje, $tipo, $fecha_programada]);
        echo json_encode(["ok" => true, "id_aviso" => (int) $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);
