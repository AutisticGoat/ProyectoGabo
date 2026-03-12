<?php
// =====================================================
// admin.php — API exclusiva para administradores
//
// GET    /php/admin.php              → listar usuarios
// PUT    /php/admin.php              → cambiar estado o rol
// DELETE /php/admin.php?id=X         → eliminar usuario
// =====================================================

require_once __DIR__ . "/auth.php";
requireAdmin();

header("Content-Type: application/json; charset=utf-8");

$adminId = getUserId();

// ══════════════════════════════════════════════════
// GET — Listar todos los usuarios
// ══════════════════════════════════════════════════
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $pdo  = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT id_usuario, nombre, correo, fecha_creacion, estado, rol
             FROM usuarios
             ORDER BY fecha_creacion DESC"
        );
        $stmt->execute();
        $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["ok" => true, "usuarios" => $usuarios]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => "Error del servidor"]);
    }
    exit;
}

// ══════════════════════════════════════════════════
// PUT — Cambiar estado (activo/inactivo) o rol
// Body JSON: { id_usuario, estado? , rol? }
// ══════════════════════════════════════════════════
if ($_SERVER["REQUEST_METHOD"] === "PUT") {
    $input      = json_decode(file_get_contents("php://input"), true) ?: [];
    $id_usuario = (int) ($input["id_usuario"] ?? 0);
    $estado     = $input["estado"] ?? null;
    $rol        = $input["rol"]    ?? null;

    if ($id_usuario < 1) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "id_usuario obligatorio"]);
        exit;
    }

    // Un admin no puede modificarse a sí mismo de esta forma
    if ($id_usuario === $adminId) {
        http_response_code(403);
        echo json_encode(["ok" => false, "error" => "No puedes modificar tu propio rol o estado"]);
        exit;
    }

    // Validar valores permitidos
    if ($estado !== null && !in_array($estado, ["activo", "inactivo"], true)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Estado inválido"]);
        exit;
    }

    if ($rol !== null && !in_array($rol, ["usuario", "administrador"], true)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Rol inválido"]);
        exit;
    }

    if ($estado === null && $rol === null) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Nada que actualizar"]);
        exit;
    }

    try {
        $pdo = GetDataBaseConn();

        // Verificar que el usuario objetivo existe
        $check = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1");
        $check->execute([$id_usuario]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(["ok" => false, "error" => "Usuario no encontrado"]);
            exit;
        }

        $updates = [];
        $params  = [];

        if ($estado !== null) { $updates[] = "estado = ?"; $params[] = $estado; }
        if ($rol    !== null) { $updates[] = "rol = ?";    $params[] = $rol;    }

        $params[] = $id_usuario;

        $stmt = $pdo->prepare(
            "UPDATE usuarios SET " . implode(", ", $updates) . " WHERE id_usuario = ?"
        );
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) {
            // Usuario existe pero el valor ya era el mismo, no hubo cambio real
            echo json_encode(["ok" => true, "aviso" => "Sin cambios: el valor ya era el mismo"]);
            exit;
        }

        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => "Error de base de datos: " . $e->getMessage()]);
    }
    exit;
}

// ══════════════════════════════════════════════════
// DELETE — Eliminar usuario (y sus datos en cascada)
// Query param: ?id=X
// ══════════════════════════════════════════════════
if ($_SERVER["REQUEST_METHOD"] === "DELETE") {
    $id_usuario = (int) ($_GET["id"] ?? 0);

    if ($id_usuario < 1) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "id obligatorio"]);
        exit;
    }

    // Un admin no puede eliminarse a sí mismo
    if ($id_usuario === $adminId) {
        http_response_code(403);
        echo json_encode(["ok" => false, "error" => "No puedes eliminar tu propia cuenta"]);
        exit;
    }

    try {
        $pdo = GetDataBaseConn();

        // Verificar que el objetivo no sea también un administrador
        $stmt = $pdo->prepare("SELECT rol FROM usuarios WHERE id_usuario = ? LIMIT 1");
        $stmt->execute([$id_usuario]);
        $target = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            http_response_code(404);
            echo json_encode(["ok" => false, "error" => "Usuario no encontrado"]);
            exit;
        }

        if ($target["rol"] === "administrador") {
            http_response_code(403);
            echo json_encode(["ok" => false, "error" => "No puedes eliminar a otro administrador"]);
            exit;
        }

        // El CASCADE en FK borra rutinas, hábitos, cumplimiento, avisos, etc.
        $pdo->prepare("DELETE FROM usuarios WHERE id_usuario = ?")
            ->execute([$id_usuario]);

        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => "Error del servidor"]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);