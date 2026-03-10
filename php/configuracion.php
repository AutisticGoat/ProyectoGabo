<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id_usuario = getUserId();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT notificaciones, tema FROM configuracion WHERE id_usuario = ? LIMIT 1"
        );
        $stmt->execute([$id_usuario]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $row = ["notificaciones" => true, "tema" => "claro"];
        } else {
            $row["notificaciones"] = (bool) $row["notificaciones"];
        }
        echo json_encode(["ok" => true, "configuracion" => $row]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true) ?: [];
    $notificaciones = isset($input["notificaciones"]) ? (bool) $input["notificaciones"] : null;
    $tema = $input["tema"] ?? null;
    if ($tema !== null && !in_array($tema, ["claro", "oscuro"], true)) $tema = "claro";
    try {
        $pdo = GetDataBaseConn();
        $stmt = $pdo->prepare("SELECT id_configuracion FROM configuracion WHERE id_usuario = ? LIMIT 1");
        $stmt->execute([$id_usuario]);
        $existe = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existe) {
            $updates = [];
            $params = [];
            if ($notificaciones !== null) { $updates[] = "notificaciones = ?"; $params[] = $notificaciones ? 1 : 0; }
            if ($tema !== null) { $updates[] = "tema = ?"; $params[] = $tema; }
            if (!empty($updates)) {
                $params[] = $id_usuario;
                $pdo->prepare("UPDATE configuracion SET " . implode(", ", $updates) . " WHERE id_usuario = ?")->execute($params);
            }
        } else {
            $notif = $notificaciones !== null ? $notificaciones : true;
            $t = $tema ?: "claro";
            $stmt = $pdo->prepare("INSERT INTO configuracion (id_usuario, notificaciones, tema) VALUES (?, ?, ?)");
            $stmt->execute([$id_usuario, $notif ? 1 : 0, $t]);
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
