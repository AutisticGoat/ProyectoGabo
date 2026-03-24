<?php
// =========================================================
// JwtHelper.php — JWT HS256 sin dependencias externas
// =========================================================

class JwtHelper {

    const TTL_SEGUNDOS = 7200; // 2 horas

    private static function secret(): string {
        return defined('JWT_SECRET') ? JWT_SECRET : 'c4mb14_3st4_cl4v3_p0r_un4_muy_larg4_y_aleat0r14';
    }

    public static function encode(array $payload): string {
        $now = time();
        $payload = array_merge($payload, [
            'iat' => $now,
            'exp' => $now + self::TTL_SEGUNDOS,
            'jti' => self::uuid(),
        ]);
        $header    = self::b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body      = self::b64u(json_encode($payload));
        $signature = self::b64u(hash_hmac('sha256', "$header.$body", self::secret(), true));
        return "$header.$body.$signature";
    }

    public static function decode(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$header, $body, $sig] = $parts;
        $expected = self::b64u(hash_hmac('sha256', "$header.$body", self::secret(), true));
        if (!hash_equals($expected, $sig)) return null;
        $payload = json_decode(self::b64uDecode($body), true);
        if (!$payload) return null;
        if (isset($payload['exp']) && $payload['exp'] < time()) return null;
        return $payload;
    }

    public static function peekJti(string $token): ?string {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        $payload = json_decode(self::b64uDecode($parts[1]), true);
        return $payload['jti'] ?? null;
    }

    private static function b64u(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64uDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }

    public static function uuid(): string {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
?>