<?php
require_once __DIR__ . "/conn.php";

session_start();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: ../login.html");
    exit;
}

$correo = trim($_POST["correo"] ?? $_POST["email"] ?? "");
$password = $_POST["password"] ?? "";

if ($correo === "" || $password === "") {
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["ok" => false, "error" => "Correo y contraseña son obligatorios"]);
    exit;
}

try {
    $pdo = GetDataBaseConn();
    $stmt = $pdo->prepare(
        "SELECT id_usuario, nombre, correo, password_hash, estado FROM usuarios WHERE correo = ? LIMIT 1"
    );
    $stmt->execute([$correo]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode(["ok" => false, "error" => "Credenciales incorrectas"]);
        exit;
    }

    if ($user["estado"] !== "activo") {
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode(["ok" => false, "error" => "Cuenta desactivada"]);
        exit;
    }

    if (!password_verify($password, $user["password_hash"])) {
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode(["ok" => false, "error" => "Credenciales incorrectas"]);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION["id_usuario"] = (int) $user["id_usuario"];
    $_SESSION["nombre"] = $user["nombre"];
    $_SESSION["correo"] = $user["correo"];

    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["ok" => true, "redirect" => "dashboard.html"]);
} catch (PDOException $e) {
    header("Content-Type: application/json; charset=utf-8");
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Error del servidor"]);
}
