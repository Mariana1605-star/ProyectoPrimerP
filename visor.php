<?php
require_once 'conexion.php';
$id = intval($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); die("<p>ID no válido.</p>"); }
$db   = DB::conectar();
$stmt = $db->prepare("SELECT titulo, descripcion, url_imagen FROM imagenes WHERE id = :id AND activo = 1 LIMIT 1");
$stmt->execute([':id' => $id]);
$img  = $stmt->fetch();
if (!$img) { http_response_code(404); die("<p>Imagen no encontrada.</p>"); }
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($img['titulo']) ?></title>
    <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#1e293b; min-height:100vh; display:flex; flex-direction:column;
               align-items:center; justify-content:center; font-family:sans-serif; padding:2rem; }
        img  { max-width:100%; max-height:80vh; border-radius:12px;
               box-shadow:0 8px 40px rgba(0,0,0,.5); }
        .info { margin-top:1.25rem; text-align:center; color:#e2e8f0; }
        .info h2 { font-size:1.4rem; margin-bottom:.4rem; }
        .info p  { color:#94a3b8; font-size:.95rem; }
        .url-display { margin-top:.75rem; background:rgba(255,255,255,.08); border-radius:8px;
                       padding:.4rem .9rem; font-size:.8rem; color:#7dd3fc;
                       font-family:monospace; word-break:break-all; }
        .btn-back { margin-top:1.5rem; display:inline-block; background:#0d6efd; color:#fff;
                    text-decoration:none; padding:.5rem 1.4rem; border-radius:8px;
                    font-weight:700; font-size:.9rem; transition:background .2s; }
        .btn-back:hover { background:#0a58ca; }
    </style>
</head>
<body>
    <img src="<?= htmlspecialchars($img['url_imagen']) ?>"
         alt="<?= htmlspecialchars($img['titulo']) ?>">
    <div class="info">
        <h2><?= htmlspecialchars($img['titulo']) ?></h2>
        <?php if (!empty($img['descripcion'])): ?>
            <p><?= htmlspecialchars($img['descripcion']) ?></p>
        <?php endif; ?>
        <div class="url-display">📁 <?= htmlspecialchars($img['url_imagen']) ?></div>
    </div>
    <a href="javascript:history.back()" class="btn-back">← Volver</a>
</body>
</html>
