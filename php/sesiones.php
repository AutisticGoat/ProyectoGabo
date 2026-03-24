<?php
// =====================================================
// sesiones.php — Gestión de sesiones activas del usuario
//
// GET    → listar sesiones activas
// DELETE ?jti=X  → cerrar una sesión específica
// DELETE ?todas=1 → cerrar todas las sesiones
// =====================================================
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");
$id_usuario = getUserId();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $sesiones = getActiveSessions($id_usuario);
    // Marcar cuál es la sesión actual
    $jtiActual = $_SESSION["jti"] ?? null;
    foreach ($sesiones as &$s) {
        $s["es_actual"] = ($s["jti"] === $jtiActual);
        // No exponer el JTI completo al cliente, solo un ID corto para la UI
        $s["id_corto"] = strtoupper(substr($s["jti"], 0, 8));
    }
    unset($s);
    echo json_encode(["ok" => true, "sesiones" => $sesiones]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "DELETE") {
    $todas = ($_GET["todas"] ?? "") === "1";
    $jti   = $_GET["jti"] ?? "";

    if ($todas) {
        revokeAllSessions($id_usuario);
        // Destruir sesión PHP actual también
        $_SESSION = [];
        session_destroy();
        echo json_encode(["ok" => true, "logout" => true]);
        exit;
    }

    if ($jti !== "") {
        // Verificar que el JTI pertenece a este usuario
        try {
            $pdo  = GetDataBaseConn();
            $stmt = $pdo->prepare(
                "SELECT id_sesion FROM sesiones WHERE jti = ? AND id_usuario = ? LIMIT 1"
            );
            $stmt->execute([$jti, $id_usuario]);
            if (!$stmt->fetch()) {
                http_response_code(403);
                echo json_encode(["ok" => false, "error" => "Sesión no encontrada"]);
                exit;
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["ok" => false, "error" => "Error del servidor"]);
            exit;
        }
        revokeJti($jti);
        echo json_encode(["ok" => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Indica jti o todas=1"]);
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);