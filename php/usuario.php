<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id = getUserId();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT id_usuario, nombre, correo, fecha_creacion, estado FROM usuarios WHERE id_usuario = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(["ok" => false, "error" => "Usuario no encontrado"]);
            exit;
        }
        unset($row["estado"]);
        echo json_encode(["ok" => true, "usuario" => $row]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true) ?: [];
    $nombre = trim($input["nombre"] ?? "");
    $correo = trim($input["correo"] ?? "");
    if ($nombre === "" || $correo === "") {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Nombre y correo son obligatorios"]);
        exit;
    }
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Correo inválido"]);
        exit;
    }
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare("UPDATE usuarios SET nombre = ?, correo = ? WHERE id_usuario = ?");
        $stmt->execute([$nombre, $correo, $id]);
        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            http_response_code(400);
            echo json_encode(["ok" => false, "error" => "El correo ya está en uso"]);
        } else {
            http_response_code(500);
            echo json_encode(["ok" => false, "error" => $e->getMessage()]);
        }
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);
