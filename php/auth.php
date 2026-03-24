<?php
// =========================================================
// auth.php — Autenticación + Autorización (RBAC)
//
// Soporta dos mecanismos en paralelo:
//   1. PHP Session  (para el dashboard web)
//   2. JWT Bearer   (para clientes API / multisesión)
//
// Jerarquía de roles (nivel menor = más poder):
//   1 superadmin | 2 admin | 3 editor | 4 cliente
// =========================================================

require_once __DIR__ . '/conn.php';
require_once __DIR__ . '/JwtHelper.php';

// ── Constantes de nivel de rol ────────────────────────────
define('ROL_SUPERADMIN', 1);
define('ROL_ADMIN',      2);
define('ROL_EDITOR',     3);
define('ROL_CLIENTE',    4);

// Máximo de sesiones simultáneas permitidas por usuario.
// Si se supera, se revoca la más antigua.
define('MAX_SESIONES', 3);

// ── Iniciar sesión PHP si es necesario ───────────────────
if (session_status() === PHP_SESSION_NONE) {
    // Flags de seguridad para la cookie de sesión
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => false,   // true en HTTPS/producción
        'httponly' => true,    // JS no puede leer la cookie
        'samesite' => 'Lax',   // protección CSRF básica
    ]);
    session_start();
}

// =========================================================
// RESOLUCIÓN DE IDENTIDAD
// Intenta identificar al usuario por Session o JWT.
// Devuelve un array con los datos del usuario o null.
// =========================================================
function resolveUser(): ?array {
    // ── Opción A: PHP Session ─────────────────────────────
    if (!empty($_SESSION['id_usuario'])) {
        return [
            'id_usuario' => (int) $_SESSION['id_usuario'],
            'nivel_rol'  => (int) ($_SESSION['nivel_rol'] ?? ROL_CLIENTE),
            'nombre_rol' => $_SESSION['nombre_rol'] ?? 'cliente',
            'via'        => 'session',
        ];
    }

    // ── Opción B: JWT en cabecera Authorization ───────────
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if (str_starts_with($authHeader, 'Bearer ')) {
        $token   = substr($authHeader, 7);
        $payload = JwtHelper::decode($token);

        if (!$payload) return null; // token inválido o expirado

        // Verificar que el JTI exista en BD y no esté revocado
        // (permite invalidación remota de tokens)
        try {
            $pdo  = GetDataBaseConn();
            $stmt = $pdo->prepare(
                "SELECT id_usuario FROM sesiones
                 WHERE jti = ? AND revocado = 0 AND expira_en > UTC_TIMESTAMP()
                 LIMIT 1"
            );
            $stmt->execute([$payload['jti']]);
            if (!$stmt->fetch()) return null; // sesión revocada o expirada en BD
        } catch (PDOException $e) {
            return null;
        }

        // Detección de session hijacking: comparar User-Agent
        $uaHash = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
        if (isset($payload['uah']) && !hash_equals($payload['uah'], $uaHash)) {
            // User-Agent distinto al del login — posible robo de token
            revokeJti($payload['jti']);
            return null;
        }

        return [
            'id_usuario' => (int) $payload['sub'],
            'nivel_rol'  => (int) ($payload['nivel'] ?? ROL_CLIENTE),
            'nombre_rol' => $payload['rol'] ?? 'cliente',
            'jti'        => $payload['jti'],
            'via'        => 'jwt',
        ];
    }

    return null;
}

// =========================================================
// GUARDS
// =========================================================

// Requiere cualquier usuario autenticado (nivel 1–4)
function requireAuth(): void {
    $user = resolveUser();
    if (!$user) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'No autorizado — inicia sesión']);
        exit;
    }
    // Inyectar en sesión para que el resto del script use getUserId()
    $_SESSION['_resolved_user'] = $user;
}

// Requiere un nivel de rol mínimo (número menor = más poder)
// Ejemplo: requireRole(ROL_ADMIN) → solo admin y superadmin pasan
function requireRole(int $nivelRequerido): void {
    requireAuth();
    $user = $_SESSION['_resolved_user'];
    if ($user['nivel_rol'] > $nivelRequerido) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(403);
        echo json_encode([
            'ok'    => false,
            'error' => "Prohibido — se requiere rol con nivel ≤ $nivelRequerido (tienes {$user['nivel_rol']})"
        ]);
        exit;
    }
}

// Alias semánticos para los guards más usados
function requireAdmin():      void { requireRole(ROL_ADMIN); }
function requireEditor():     void { requireRole(ROL_EDITOR); }
function requireSuperAdmin(): void { requireRole(ROL_SUPERADMIN); }

// =========================================================
// HELPERS DE IDENTIDAD
// =========================================================
function getUserId(): int {
    return (int) ($_SESSION['_resolved_user']['id_usuario']
        ?? $_SESSION['id_usuario']
        ?? 0);
}

function getUserRol(): string {
    return $_SESSION['_resolved_user']['nombre_rol']
        ?? $_SESSION['nombre_rol']
        ?? 'cliente';
}

function getUserNivel(): int {
    return (int) ($_SESSION['_resolved_user']['nivel_rol']
        ?? $_SESSION['nivel_rol']
        ?? ROL_CLIENTE);
}

// =========================================================
// GESTIÓN DE SESIONES JWT EN BD
// =========================================================

// Registra una nueva sesión en la tabla sesiones.
// Si el usuario ya tiene MAX_SESIONES, revoca la más antigua.
function registerSession(PDO $pdo, int $idUsuario, string $jti, string $ip, string $uaHash, int $ttl): void {
    // Contar sesiones activas
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM sesiones
         WHERE id_usuario = ? AND revocado = 0 AND expira_en > UTC_TIMESTAMP()"
    );
    $stmt->execute([$idUsuario]);
    $activas = (int) $stmt->fetchColumn();

    if ($activas >= MAX_SESIONES) {
        // Revocar la sesión más antigua
        $pdo->prepare(
            "UPDATE sesiones SET revocado = 1
             WHERE id_usuario = ? AND revocado = 0 AND expira_en > UTC_TIMESTAMP()
             ORDER BY creado_en ASC LIMIT 1"
        )->execute([$idUsuario]);
    }

    $pdo->prepare(
        "INSERT INTO sesiones (id_usuario, jti, ip, user_agent_hash, expira_en)
         VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))"
    )->execute([$idUsuario, $jti, $ip, $uaHash, $ttl]);
}

// Revoca un JTI específico (logout individual)
function revokeJti(string $jti): void {
    try {
        $pdo = GetDataBaseConn();
        $pdo->prepare("UPDATE sesiones SET revocado = 1 WHERE jti = ?")
            ->execute([$jti]);
    } catch (PDOException $e) {}
}

// Revoca TODAS las sesiones de un usuario (logout global)
function revokeAllSessions(int $idUsuario): void {
    try {
        $pdo = GetDataBaseConn();
        $pdo->prepare("UPDATE sesiones SET revocado = 1 WHERE id_usuario = ?")
            ->execute([$idUsuario]);
    } catch (PDOException $e) {}
}

// Devuelve todas las sesiones activas de un usuario (para panel)
function getActiveSessions(int $idUsuario): array {
    try {
        $pdo  = GetDataBaseConn();
        $stmt = $pdo->prepare(
            "SELECT jti, ip, creado_en, expira_en
             FROM sesiones
             WHERE id_usuario = ? AND revocado = 0 AND expira_en > UTC_TIMESTAMP()
             ORDER BY creado_en DESC"
        );
        $stmt->execute([$idUsuario]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}
?>