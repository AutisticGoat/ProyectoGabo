<?php
// =========================================================
// auth.php — Autenticación + Autorización (RBAC)
// Soporta PHP Session (dashboard web) y JWT Bearer (API)
// =========================================================

require_once __DIR__ . '/conn.php';
require_once __DIR__ . '/JwtHelper.php';

define('ROL_SUPERADMIN', 1);
define('ROL_ADMIN',      2);
define('ROL_EDITOR',     3);
define('ROL_CLIENTE',    4);
define('MAX_SESIONES',   3);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => false,   // cambiar a true en HTTPS/producción
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ── Resolver identidad (Session o JWT) ───────────────────
function resolveUser(): ?array {
    // Opción A: PHP Session
    if (!empty($_SESSION['id_usuario'])) {
        return [
            'id_usuario' => (int) $_SESSION['id_usuario'],
            'nivel_rol'  => (int) ($_SESSION['nivel_rol']  ?? ROL_CLIENTE),
            'nombre_rol' => $_SESSION['nombre_rol'] ?? 'cliente',
            'via'        => 'session',
        ];
    }

    // Opción B: JWT Bearer
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if (str_starts_with($authHeader, 'Bearer ')) {
        $token   = substr($authHeader, 7);
        $payload = JwtHelper::decode($token);
        if (!$payload) return null;

        try {
            $pdo  = GetDataBaseConn();
            $stmt = $pdo->prepare(
                "SELECT id_usuario FROM sesiones
                 WHERE jti = ? AND revocado = 0 AND expira_en > UTC_TIMESTAMP() LIMIT 1"
            );
            $stmt->execute([$payload['jti']]);
            if (!$stmt->fetch()) return null;
        } catch (PDOException $e) {
            return null;
        }

        // Detección de session hijacking por User-Agent
        $uaHash = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
        if (isset($payload['uah']) && !hash_equals($payload['uah'], $uaHash)) {
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

// ── Guards ────────────────────────────────────────────────
function requireAuth(): void {
    $user = resolveUser();
    if (!$user) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'No autorizado — inicia sesión']);
        exit;
    }
    $_SESSION['_resolved_user'] = $user;
}

function requireRole(int $nivelRequerido): void {
    requireAuth();
    $user = $_SESSION['_resolved_user'];
    if ($user['nivel_rol'] > $nivelRequerido) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(403);
        echo json_encode([
            'ok'    => false,
            'error' => "Acceso denegado — se requiere nivel ≤ $nivelRequerido (tienes {$user['nivel_rol']})"
        ]);
        exit;
    }
}

function requireAdmin():      void { requireRole(ROL_ADMIN); }
function requireEditor():     void { requireRole(ROL_EDITOR); }
function requireSuperAdmin(): void { requireRole(ROL_SUPERADMIN); }

// ── Helpers de identidad ──────────────────────────────────
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

// ── Gestión de sesiones JWT ───────────────────────────────
function registerSession(PDO $pdo, int $idUsuario, string $jti, string $ip, string $uaHash, int $ttl): void {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM sesiones
         WHERE id_usuario = ? AND revocado = 0 AND expira_en > UTC_TIMESTAMP()"
    );
    $stmt->execute([$idUsuario]);
    if ((int) $stmt->fetchColumn() >= MAX_SESIONES) {
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

function revokeJti(string $jti): void {
    try {
        $pdo = GetDataBaseConn();
        $pdo->prepare("UPDATE sesiones SET revocado = 1 WHERE jti = ?")
            ->execute([$jti]);
    } catch (PDOException $e) {}
}

function revokeAllSessions(int $idUsuario): void {
    try {
        $pdo = GetDataBaseConn();
        $pdo->prepare("UPDATE sesiones SET revocado = 1 WHERE id_usuario = ?")
            ->execute([$idUsuario]);
    } catch (PDOException $e) {}
}

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