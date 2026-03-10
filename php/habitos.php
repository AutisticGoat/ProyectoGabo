<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id_usuario = getUserId();

function rutinaPerteneceUsuario(PDO $pdo, $id_rutina, $id_usuario) {
    $st = $pdo->prepare("SELECT 1 FROM rutinas WHERE id_rutina = ? AND id_usuario = ?");
    $st->execute([$id_rutina, $id_usuario]);
    return (bool) $st->fetch();
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $id_rutina = (int) ($_GET["id_rutina"] ?? 0);
    if ($id_rutina < 1) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "id_rutina obligatorio"]);
        exit;
    }
    try {
        $pdo = GetDataBaseConn();
        if (!rutinaPerteneceUsuario($pdo, $id_rutina, $id_usuario)) {
            http_response_code(403);
            echo json_encode(["ok" => false, "error" => "Rutina no encontrada"]);
            exit;
        }
        $stmt = $pdo->prepare("SELECT id_habito, id_rutina, nombre, frecuencia FROM habitos WHERE id_rutina = ?");
        $stmt->execute([$id_rutina]);
        $habitos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["ok" => true, "habitos" => $habitos]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_rutina = (int) ($input["id_rutina"] ?? 0);
    $nombre = trim($input["nombre"] ?? "");
    $frecuencia = $input["frecuencia"] ?? "diaria";
    if ($id_rutina < 1 || $nombre === "") {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "id_rutina y nombre son obligatorios"]);
        exit;
    }
    if (!in_array($frecuencia, ["diaria", "semanal", "mensual"], true)) {
        $frecuencia = "diaria";
    }
    try {
        $pdo = GetDataBaseConn();
        if (!rutinaPerteneceUsuario($pdo, $id_rutina, $id_usuario)) {
            http_response_code(403);
            echo json_encode(["ok" => false, "error" => "Rutina no encontrada"]);
            exit;
        }
        $stmt = $pdo->prepare("INSERT INTO habitos (id_rutina, nombre, frecuencia) VALUES (?, ?, ?)");
        $stmt->execute([$id_rutina, $nombre, $frecuencia]);
        $id_habito = (int) $pdo->lastInsertId();
        echo json_encode(["ok" => true, "id_habito" => $id_habito]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);
