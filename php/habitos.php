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

function habitoPerteneceUsuario(PDO $pdo, $id_habito, $id_usuario) {
    $st = $pdo->prepare("
        SELECT 1 FROM habitos h
        JOIN rutinas r ON r.id_rutina = h.id_rutina
        WHERE h.id_habito = ? AND r.id_usuario = ?
    ");
    $st->execute([$id_habito, $id_usuario]);
    return (bool) $st->fetch();
}

// ── GET: listar hábitos de una rutina ─────────────────
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
        echo json_encode(["ok" => true, "habitos" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

// ── POST: agregar hábito a una rutina ─────────────────
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input     = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_rutina = (int) ($input["id_rutina"] ?? 0);
    $nombre    = trim($input["nombre"] ?? "");
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
        echo json_encode(["ok" => true, "id_habito" => (int) $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

// ── DELETE: eliminar un hábito ────────────────────────
if ($_SERVER["REQUEST_METHOD"] === "DELETE") {
    $id_habito = (int) ($_GET["id_habito"] ?? 0);
    if ($id_habito < 1) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "id_habito obligatorio"]);
        exit;
    }
    try {
        $pdo = GetDataBaseConn();
        if (!habitoPerteneceUsuario($pdo, $id_habito, $id_usuario)) {
            http_response_code(403);
            echo json_encode(["ok" => false, "error" => "Hábito no encontrado"]);
            exit;
        }
        $pdo->prepare("DELETE FROM habitos WHERE id_habito = ?")->execute([$id_habito]);
        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);