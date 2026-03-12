<?php
// =====================================================
// Configuración de la base de datos
// =====================================================
// Forzamos UTC en PHP y MySQL independientemente de
// lo que diga php.ini o la configuración del sistema.
// El navegador convierte a hora local al mostrar.

date_default_timezone_set('UTC');

function GetDataBaseConn()
{
    $host   = "localhost";
    $dbname = "sistema_rutinas";
    $user   = "root";
    $pass   = "";

    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $user,
            $pass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        // Forzar UTC en esta sesión de MySQL,
        // sin importar la configuración del servidor
        $pdo->exec("SET time_zone = '+00:00'");

        return $pdo;
    } catch (PDOException $e) {
        echo "Error de conexión: " . $e->getMessage();
    }
}
?>