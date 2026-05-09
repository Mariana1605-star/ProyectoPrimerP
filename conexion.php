<?php

define('DB_DRIVER', 'mysql');

define('DB_HOST', 'localhost');
define('DB_PORT', DB_DRIVER === 'pgsql' ? '5432' : '3306');
define('DB_USER', 'mguadarrama');
define('DB_PASS', '16052004');
define('DB_NAME', 'mguadarrama_db');
class DB {
    private static ?PDO $instance = null;

    public static function conectar(): PDO {
        if (self::$instance !== null) return self::$instance;
        try {
            $dsn = DB_DRIVER === 'pgsql'
                ? sprintf('pgsql:host=%s;port=%s;dbname=%s', DB_HOST, DB_PORT, DB_NAME)
                : sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);

            $opts = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            self::$instance = new PDO($dsn, DB_USER, DB_PASS, $opts);
            if (DB_DRIVER === 'pgsql') self::$instance->exec("SET client_encoding TO 'UTF8'");
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            die(json_encode(['exito' => false, 'mensaje' => 'Error de conexión a la base de datos']));
        }
        return self::$instance;
    }
    public static function driver(): string { return DB_DRIVER; }
    public static function cerrar(): void   { self::$instance = null; }
}

function sql_driver(string $mysql, string $pgsql): string {
    return DB_DRIVER === 'pgsql' ? $pgsql : $mysql;
}

if (session_status() === PHP_SESSION_NONE) session_start();

