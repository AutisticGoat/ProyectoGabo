<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id_usuario = getUserId();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT id_rutina, nombre, descripcion, fecha_inicio, estado FROM rutinas WHERE id_usuario = ? ORDER BY fecha_inicio DESC"
        );
        $stmt->execute([$id_usuario]);
        $rutinas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rutinas as &$r) {
            $st = $pdo->prepare("SELECT id_habito, nombre, frecuencia FROM habitos WHERE id_rutina = ?");
            $st->execute([$r["id_rutina"]]);
            $r["habitos"] = $st->fetchAll(PDO::FETCH_ASSOC);
        }
        unset($r);

        echo json_encode(["ok" => true, "rutinas" => $rutinas]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $nombre = trim($input["nombre"] ?? "");
    $descripcion = trim($input["descripcion"] ?? "");
    $fecha_inicio = $input["fecha_inicio"] ?? date("Y-m-d");
    if ($nombre === "") {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "El nombre de la rutina es obligatorio"]);
        exit;
    }
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "INSERT INTO rutinas (id_usuario, nombre, descripcion, fecha_inicio, estado) VALUES (?, ?, ?, ?, 'activa')"
        );
        $stmt->execute([$id_usuario, $nombre, $descripcion ?: null, $fecha_inicio]);
        $id_rutina = (int) $pdo->lastInsertId();
        echo json_encode(["ok" => true, "id_rutina" => $id_rutina]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_rutina = (int) ($input["id_rutina"] ?? 0);
    $nombre = trim($input["nombre"] ?? "");
    $estado = $input["estado"] ?? null;
    if ($id_rutina < 1) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "id_rutina obligatorio"]);
        exit;
    }
    try {
        $pdo = GetDataBaseConn();
        if ($nombre !== "") {
            $stmt = $pdo->prepare("UPDATE rutinas SET nombre = ? WHERE id_rutina = ? AND id_usuario = ?");
            $stmt->execute([$nombre, $id_rutina, $id_usuario]);
        }
        if ($estado !== null && in_array($estado, ["activa", "pausada", "finalizada"], true)) {
            $stmt = $pdo->prepare("UPDATE rutinas SET estado = ? WHERE id_rutina = ? AND id_usuario = ?");
            $stmt->execute([$estado, $id_rutina, $id_usuario]);
        }
        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "DELETE") {
    $id_rutina = (int) ($_GET["id_rutina"] ?? 0);
    if ($id_rutina < 1) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "id_rutina obligatorio"]);
        exit;
    }
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare("DELETE FROM rutinas WHERE id_rutina = ? AND id_usuario = ?");
        $stmt->execute([$id_rutina, $id_usuario]);
        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);
