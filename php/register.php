<?php
require_once __DIR__ . "/conn.php";

session_start();

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["ok" => false, "error" => "Acceso no permitido"]);
    exit;
}

$nombre = trim($_POST["username"] ?? "");
$correo = trim($_POST["email"] ?? "");
$password = $_POST["password"] ?? "";

if ($nombre === "" || $correo === "" || $password === "") {
    echo json_encode(["ok" => false, "error" => "Todos los campos son obligatorios"]);
    exit;
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["ok" => false, "error" => "Email inválido"]);
    exit;
}

try {
    $pdo = GetDataBaseConn();
    $stmt = $pdo->prepare(
        "INSERT INTO usuarios (nombre, correo, password_hash, fecha_creacion) VALUES (?, ?, ?, NOW())"
    );
    $stmt->execute([
        $nombre,
        $correo,
        password_hash($password, PASSWORD_DEFAULT)
    ]);

    echo json_encode(["ok" => true, "message" => "Registro exitoso"]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        echo json_encode(["ok" => false, "error" => "El correo ya está registrado"]);
    } else {
        echo json_encode(["ok" => false, "error" => "Error al registrar: " . $e->getMessage()]);
    }
}
