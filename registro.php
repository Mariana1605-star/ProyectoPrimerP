<?php
require_once 'conexion.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido']); exit;
}

$input   = json_decode(file_get_contents('php://input'), true) ?? [];
$nombre  = trim($input['nombre']   ?? '');
$email   = trim($input['email']    ?? '');
$passRaw = trim($input['password'] ?? '');

if (empty($nombre) || empty($email) || empty($passRaw)) {
    echo json_encode(['exito' => false, 'mensaje' => 'Completa todos los campos']); exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['exito' => false, 'mensaje' => 'Correo electrónico inválido']); exit;
}
if (strlen($passRaw) < 6) {
    echo json_encode(['exito' => false, 'mensaje' => 'La contraseña debe tener al menos 6 caracteres']); exit;
}

$db    = DB::conectar();
$check = $db->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
$check->execute([':email' => $email]);
if ($check->fetch()) {
    echo json_encode(['exito' => false, 'mensaje' => 'El correo ya está registrado']); exit;
}

$hash = password_hash($passRaw, PASSWORD_BCRYPT);

if (DB::driver() === 'pgsql') {
    $stmt = $db->prepare(
        "INSERT INTO usuarios (nombre,email,password,rol) VALUES (:n,:e,:p,'usuario') RETURNING id"
    );
    $stmt->execute([':n' => $nombre, ':e' => $email, ':p' => $hash]);
    $ok = (bool)$stmt->fetch();
} else {
    $stmt = $db->prepare(
        "INSERT INTO usuarios (nombre,email,password,rol) VALUES (:n,:e,:p,'usuario')"
    );
    $ok = $stmt->execute([':n' => $nombre, ':e' => $email, ':p' => $hash]);
}

echo json_encode($ok
    ? ['exito' => true,  'mensaje' => 'Cuenta creada exitosamente']
    : ['exito' => false, 'mensaje' => 'Error al guardar, intenta de nuevo']
);
