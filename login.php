<?php
require_once 'conexion.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido']); exit;
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = trim($input['email']    ?? '');
$password = trim($input['password'] ?? '');

if (empty($email) || empty($password)) {
    echo json_encode(['exito' => false, 'mensaje' => 'Completa todos los campos']); exit;
}

$db   = DB::conectar();
$stmt = $db->prepare("SELECT id, nombre, password, rol FROM usuarios WHERE email = :email LIMIT 1");
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    echo json_encode(['exito' => false, 'mensaje' => 'Correo o contraseña incorrectos']); exit;
}

$_SESSION['usuario_id']     = $user['id'];
$_SESSION['usuario_nombre'] = $user['nombre'];
$_SESSION['usuario_rol']    = $user['rol'];

echo json_encode(['exito' => true, 'mensaje' => 'Bienvenido, ' . $user['nombre']]);
