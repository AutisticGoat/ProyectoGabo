<?php
require_once __DIR__ . "/auth.php";
requireAuth();

header("Content-Type: application/json; charset=utf-8");

$id = getUserId();

// ── GET: obtener datos del usuario ────────────────────
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $pdo  = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT id_usuario, nombre, correo, fecha_creacion FROM usuarios WHERE id_usuario = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(["ok" => false, "error" => "Usuario no encontrado"]);
            exit;
        }
        echo json_encode(["ok" => true, "usuario" => $row]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

// ── PUT: actualizar nombre, correo y/o contraseña ────
if ($_SERVER["REQUEST_METHOD"] === "PUT") {
    $input  = json_decode(file_get_contents("php://input"), true) ?: [];
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

    // Cambio de contraseña (opcional)
    $passwordActual  = $input["password_actual"]  ?? "";
    $passwordNueva   = $input["password_nueva"]   ?? "";
    $cambiarPassword = $passwordActual !== "" || $passwordNueva !== "";

    try {
        $pdo = GetDataBaseConn();

        if ($cambiarPassword) {
            if ($passwordNueva === "") {
                http_response_code(400);
                echo json_encode(["ok" => false, "error" => "Escribe la nueva contraseña"]);
                exit;
            }
            if (strlen($passwordNueva) < 8) {
                http_response_code(400);
                echo json_encode(["ok" => false, "error" => "La contraseña debe tener al menos 8 caracteres"]);
                exit;
            }
            // Verificar contraseña actual
            $stmt = $pdo->prepare("SELECT password_hash FROM usuarios WHERE id_usuario = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || !password_verify($passwordActual, $row["password_hash"])) {
                http_response_code(400);
                echo json_encode(["ok" => false, "error" => "La contraseña actual es incorrecta"]);
                exit;
            }
            $nuevoHash = password_hash($passwordNueva, PASSWORD_DEFAULT);
            $pdo->prepare(
                "UPDATE usuarios SET nombre = ?, correo = ?, password_hash = ? WHERE id_usuario = ?"
            )->execute([$nombre, $correo, $nuevoHash, $id]);
        } else {
            $pdo->prepare(
                "UPDATE usuarios SET nombre = ?, correo = ? WHERE id_usuario = ?"
            )->execute([$nombre, $correo, $id]);
        }

        // Actualizar nombre en sesión (ya iniciada por auth.php)
        $_SESSION["nombre"] = $nombre;
        $_SESSION["correo"] = $correo;

        echo json_encode(["ok" => true]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            http_response_code(400);
            echo json_encode(["ok" => false, "error" => "Ese correo ya está en uso por otra cuenta"]);
        } else {
            http_response_code(500);
            echo json_encode(["ok" => false, "error" => $e->getMessage()]);
        }
    }
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Método no permitido"]);