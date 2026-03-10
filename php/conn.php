<?php 
// =====================================================
// Configuración de la base de datos
// =====================================================


// Mierda 
function GetDataBaseConn()
{
    $host = "localhost";
    $dbname = "sistema_rutinas";
    $user = "root";
    $pass = "";

    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        echo "❌ Error de conexión: " . $e->getMessage();
    }
}

?>