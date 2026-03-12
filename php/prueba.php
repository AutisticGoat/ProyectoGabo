<?php
// =====================================================
// debug_tz.php — Diagnóstico de zona horaria
// Abre este archivo en el navegador y comparte
// el resultado para identificar dónde está el desfase.
// ELIMINA este archivo cuando termines el diagnóstico.
// =====================================================
require_once __DIR__ . "/conn.php";
header("Content-Type: application/json; charset=utf-8");

$pdo = GetDataBaseConn();

// Hora actual según PHP
$phpNow = date("Y-m-d H:i:s");

// Hora actual según MySQL
$mysqlNow = $pdo->query("SELECT NOW() as now")->fetch(PDO::FETCH_ASSOC)["now"];

// Zona horaria activa en PHP
$phpTz = date_default_timezone_get();

// Zona horaria activa en MySQL
$mysqlTz = $pdo->query("SELECT @@session.time_zone as tz")->fetch(PDO::FETCH_ASSOC)["tz"];

// Último aviso guardado en la BD (valor crudo)
$ultimoAviso = $pdo->query("SELECT fecha_programada FROM avisos ORDER BY id_aviso DESC LIMIT 1")
                   ->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    "php_now"            => $phpNow,
    "mysql_now"          => $mysqlNow,
    "php_timezone"       => $phpTz,
    "mysql_timezone"     => $mysqlTz,
    "ultimo_aviso_en_bd" => $ultimoAviso["fecha_programada"] ?? "sin avisos",
], JSON_PRETTY_PRINT);
?>