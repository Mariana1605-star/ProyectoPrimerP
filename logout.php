<?php
require_once 'conexion.php'; // inicia sesión si no está activa
session_unset();
session_destroy();
header('Location: login.html');
exit;
