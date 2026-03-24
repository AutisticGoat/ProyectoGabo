<?php
// =====================================================
// recover.php — Genera y envía código de recuperación
// Requiere PHPMailer: composer require phpmailer/phpmailer
// =====================================================

require_once __DIR__ . "/conn.php";

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Método no permitido"]);
    exit;
}

// ── Leer y validar correo ──────────────────────────
$input  = json_decode(file_get_contents("php://input"), true) ?: $_POST;
$correo = trim($input["correo"] ?? $input["email"] ?? "");

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($correo === "" || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Correo inválido"]);
    exit;
}

try {
    $pdo = GetDataBaseConn();

    // ── Verificar que el correo existe en la BD ────
    $stmt = $pdo->prepare("SELECT nombre FROM usuarios WHERE correo = ? AND estado = 'activo' LIMIT 1");
    $stmt->execute([$correo]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    // Respuesta genérica para no revelar si el correo existe o no
    if (!$usuario) {
        echo json_encode(["ok" => true]);
        exit;
    }

    // ── Invalidar códigos anteriores del mismo correo ─
    $pdo->prepare("UPDATE password_resets SET usado = TRUE WHERE correo = ? AND usado = FALSE")
        ->execute([$correo]);

    // ── Generar código de 6 dígitos ───────────────
    $codigo    = str_pad(random_int(0, 999999), 6, "0", STR_PAD_LEFT);
    $expira_en = date("Y-m-d H:i:s", strtotime("+15 minutes"));

    $pdo->prepare("INSERT INTO password_resets (correo, codigo, expira_en) VALUES (?, ?, ?)")
        ->execute([$correo, $codigo, $expira_en]);

    // ── Enviar correo con PHPMailer ────────────────
    require_once __DIR__ . "/../vendor/autoload.php"; // composer

    $mail = new PHPMailer(true);

    // ── Configuración SMTP ─────────────────────────
    // Cambia estos valores por los de tu proveedor
    $mail->isSMTP();
    $mail->Host       = "smtp.gmail.com";          // p.ej. smtp.gmail.com
    $mail->SMTPAuth   = true;
    $mail->Username   = "TU_CORREO@gmail.com";     // ← tu correo
    $mail->Password   = "TU_APP_PASSWORD";         // ← contraseña de app de Gmail
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;
    $mail->CharSet    = "UTF-8";

    // ── Remitente y destinatario ───────────────────
    $mail->setFrom("TU_CORREO@gmail.com", "Seguimiento de Hábitos");
    $mail->addAddress($correo, $usuario["nombre"]);

    // ── Contenido del correo ───────────────────────
    $mail->isHTML(true);
    $mail->Subject = "Código de recuperación de contraseña";
    $mail->Body    = "
        <div style='font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                     border:1px solid #e2e5ea;border-radius:12px;'>
            <h2 style='color:#0d9488;margin-bottom:8px;'>Recuperar contraseña</h2>
            <p style='color:#5f6773;'>Hola <strong>{$usuario['nombre']}</strong>,</p>
            <p style='color:#5f6773;margin-top:12px;'>
                Tu código de recuperación es:
            </p>
            <div style='font-size:2.5rem;font-weight:700;letter-spacing:12px;
                        text-align:center;padding:24px;margin:20px 0;
                        background:#f0fdfa;border-radius:10px;color:#0d9488;'>
                {$codigo}
            </div>
            <p style='color:#5f6773;font-size:0.875rem;'>
                Este código expira en <strong>15 minutos</strong>.<br>
                Si no solicitaste esto, puedes ignorar este correo.
            </p>
        </div>
    ";
    $mail->AltBody = "Tu código de recuperación es: {$codigo}. Expira en 15 minutos.";

    $mail->send();

    echo json_encode(["ok" => true]);

} catch (Exception $e) {
    // Error de PHPMailer
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "No se pudo enviar el correo. Detalle: " . $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Error del servidor"]);
}