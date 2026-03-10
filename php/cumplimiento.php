<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id_usuario = getUserId();

function habitoPerteneceUsuario(PDO $pdo, $id_habito, $id_usuario) {
    $st = $pdo->prepare(
        "SELECT 1 FROM habitos h INNER JOIN rutinas r ON h.id_rutina = r.id_rutina WHERE h.id_habito = ? AND r.id_usuario = ?"
    );
    $st->execute([$id_habito, $id_usuario]);
    return (bool) $st->fetch();
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $desde = $_GET["desde"] ?? date("Y-m-d", strtotime("-7 days"));
    $hasta = $_GET["hasta"] ?? date("Y-m-d");
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT c.id_cumplimiento, c.id_habito, c.fecha, c.completado, h.nombre as nombre_habito, r.nombre as nombre_rutina
             FROM cumplimiento c
             INNER JOIN habitos h ON c.id_habito = h.id_habito
             INNER JOIN rutinas r ON h.id_rutina = r.id_rutina
             WHERE r.id_usuario = ? AND c.fecha >= ? AND c.fecha <= ?
             ORDER BY c.fecha DESC, c.id_habito"
        );
        $stmt->execute([$id_usuario, $desde, $hasta]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $porFecha = [];
        foreach ($rows as $row) {
            $f = $row["fecha"];
            if (!isset($porFecha[$f])) $porFecha[$f] = ["completados" => 0, "total" => 0];
            $porFecha[$f]["total"]++;
            if ($row["completado"]) $porFecha[$f]["completados"]++;
        }

        echo json_encode(["ok" => true, "cumplimiento" => $rows, "por_fecha" => $porFecha]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $id_habito = (int) ($input["id_habito"] ?? 0);
    $fecha = $input["fecha"] ?? date("Y-m-d");
    $completado = isset($input["completado"]) ? (bool) $input["completado"] : true;
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
        $st = $pdo->prepare("SELECT id_cumplimiento FROM cumplimiento WHERE id_habito = ? AND fecha = ? LIMIT 1");
        $st->execute([$id_habito, $fecha]);
        $existe = $st->fetch(PDO::FETCH_ASSOC);
        if ($existe) {
            $stmt = $pdo->prepare("UPDATE cumplimiento SET completado = ? WHERE id_cumplimiento = ?");
            $stmt->execute([$completado ? 1 : 0, $existe["id_cumplimiento"]]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO cumplimiento (id_habito, fecha, completado) VALUES (?, ?, ?)");
            $stmt->execute([$id_habito, $fecha, $completado ? 1 : 0]);
        }
        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);
