<?php
require_once __DIR__ . '/auth.php';
requireAdmin();

header('Content-Type: application/json; charset=utf-8');

$adminId    = getUserId();
$adminNivel = getUserNivel();

// ── GET: listar usuarios + catálogo de roles ──────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $pdo = GetDataBaseConn();

        $stmt = $pdo->prepare(
            "SELECT u.id_usuario, u.nombre, u.correo, u.fecha_creacion,
                    u.estado, u.id_rol, r.nombre AS nombre_rol, r.nivel AS nivel_rol
             FROM usuarios u
             JOIN roles r ON r.id_rol = u.id_rol
             ORDER BY u.fecha_creacion DESC"
        );
        $stmt->execute();
        $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Solo roles que el admin puede asignar (nivel >= al suyo)
        $stmtRoles = $pdo->prepare(
            "SELECT id_rol, nombre, descripcion, nivel
             FROM roles WHERE nivel >= ? ORDER BY nivel ASC"
        );
        $stmtRoles->execute([$adminNivel]);
        $roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['ok' => true, 'usuarios' => $usuarios, 'roles' => $roles]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error del servidor']);
    }
    exit;
}

// ── PUT: cambiar estado o rol ─────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input      = json_decode(file_get_contents('php://input'), true) ?: [];
    $id_usuario = (int) ($input['id_usuario'] ?? 0);
    $estado     = $input['estado']  ?? null;
    $id_rol     = isset($input['id_rol']) ? (int) $input['id_rol'] : null;

    if ($id_usuario < 1) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id_usuario obligatorio']);
        exit;
    }
    if ($id_usuario === $adminId) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'No puedes modificar tu propio rol o estado']);
        exit;
    }
    if ($estado !== null && !in_array($estado, ['activo', 'inactivo'], true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Estado inválido']);
        exit;
    }
    if ($estado === null && $id_rol === null) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Nada que actualizar']);
        exit;
    }

    try {
        $pdo = GetDataBaseConn();

        if ($id_rol !== null) {
            $stmtRol = $pdo->prepare("SELECT nivel FROM roles WHERE id_rol = ? LIMIT 1");
            $stmtRol->execute([$id_rol]);
            $rolObj = $stmtRol->fetch(PDO::FETCH_ASSOC);
            if (!$rolObj) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Rol no encontrado']);
                exit;
            }
            if ($rolObj['nivel'] < $adminNivel) {
                http_response_code(403);
                echo json_encode(['ok' => false, 'error' => 'No puedes asignar un rol con más privilegios que el tuyo']);
                exit;
            }
        }

        $check = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1");
        $check->execute([$id_usuario]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Usuario no encontrado']);
            exit;
        }

        $updates = [];
        $params  = [];
        if ($estado  !== null) { $updates[] = 'estado = ?';  $params[] = $estado; }
        if ($id_rol  !== null) { $updates[] = 'id_rol = ?';  $params[] = $id_rol; }
        $params[] = $id_usuario;

        $pdo->prepare("UPDATE usuarios SET " . implode(', ', $updates) . " WHERE id_usuario = ?")
            ->execute($params);

        // Si se cambió el rol, revocar todas las sesiones del usuario
        if ($id_rol !== null) {
            revokeAllSessions($id_usuario);
        }

        echo json_encode(['ok' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
    exit;
}

// ── DELETE: eliminar usuario ──────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id_usuario = (int) ($_GET['id'] ?? 0);

    if ($id_usuario < 1) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obligatorio']);
        exit;
    }
    if ($id_usuario === $adminId) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'No puedes eliminar tu propia cuenta']);
        exit;
    }

    try {
        $pdo  = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT u.id_usuario, r.nivel
             FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = ? LIMIT 1"
        );
        $stmt->execute([$id_usuario]);
        $target = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Usuario no encontrado']);
            exit;
        }
        if ($target['nivel'] <= $adminNivel) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'No puedes eliminar a un usuario con igual o mayor nivel de permisos']);
            exit;
        }

        $pdo->prepare("DELETE FROM usuarios WHERE id_usuario = ?")->execute([$id_usuario]);
        echo json_encode(['ok' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error del servidor']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
?>