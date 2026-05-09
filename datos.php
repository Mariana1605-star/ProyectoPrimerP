<?php
require_once 'conexion.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('IMG_DIR', __DIR__ . '/img/');
if (!is_dir(IMG_DIR)) mkdir(IMG_DIR, 0755, true);

$db     = DB::conectar();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_POST['_method'] ?? '') === 'PUT') $method = 'PUT';

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {

    // Toggle activo
    if (isset($_GET['toggle'], $_GET['id'])) {
        $id   = intval($_GET['id']);
        $stmt = $db->prepare("SELECT activo FROM imagenes WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row  = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }
        $nuevo = $row['activo'] == 1 ? 0 : 1;
        $db->prepare("UPDATE imagenes SET activo = :a WHERE id = :id")->execute([':a'=>$nuevo,':id'=>$id]);
        echo json_encode(['exito'=>true,'activo'=>$nuevo,'mensaje'=>$nuevo?'Activada':'Desactivada']); exit;
    }

    // Una imagen por ID
    if (isset($_GET['id'])) {
        $id   = intval($_GET['id']);
        $stmt = $db->prepare("SELECT id,titulo,descripcion,url_imagen,activo,orden FROM imagenes WHERE id=:id LIMIT 1");
        $stmt->execute([':id'=>$id]);
        $row  = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }
        echo json_encode($row); exit;
    }

    // Siguiente orden disponible (solo informativo para mostrar en el modal)
    if (isset($_GET['siguiente_orden'])) {
        $stmt = $db->query("SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM imagenes");
        echo json_encode(['siguiente' => (int)$stmt->fetch()['siguiente']]);
        exit;
    }

    // Todas o solo activas
    $todas = isset($_GET['todas']) && $_GET['todas'] == '1';
    $where = $todas ? '' : 'WHERE activo = 1';
    echo json_encode($db->query(
        "SELECT id,titulo,descripcion,url_imagen,activo,orden FROM imagenes $where ORDER BY orden ASC, id ASC"
    )->fetchAll()); exit;
}

// ── POST (crear) ──────────────────────────────────────────────
if ($method === 'POST') {
    $esForm      = !empty($_POST);
    $titulo      = trim($esForm ? ($_POST['titulo']      ?? '') : '');
    $descripcion = trim($esForm ? ($_POST['descripcion'] ?? '') : '');
    $activo      = intval($esForm ? ($_POST['activo']    ?? 1)  : 1);
    $url_ext     = trim($esForm ? ($_POST['url_imagen']  ?? '') : '');

    if (!$esForm) {
        $json        = json_decode(file_get_contents('php://input'), true) ?? [];
        $titulo      = trim($json['titulo']      ?? '');
        $descripcion = trim($json['descripcion'] ?? '');
        $activo      = intval($json['activo']    ?? 1);
        $url_ext     = trim($json['url_imagen']  ?? '');
    }

    if (empty($titulo)) {
        http_response_code(422);
        echo json_encode(['exito'=>false,'mensaje'=>'El título es requerido']);
        exit;
    }

    // ── Orden automático garantizado único ──────────────────
    $stmtOrden = $db->query("SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM imagenes");
    $orden     = (int)$stmtOrden->fetch()['siguiente'];

    $url_imagen = '';
    if ($esForm && isset($_FILES['archivo']) && $_FILES['archivo']['error'] === UPLOAD_ERR_OK) {
        $url_imagen = subirArchivo($_FILES['archivo']);
        if (!$url_imagen) {
            echo json_encode(['exito'=>false,'mensaje'=>'Archivo no válido. Solo JPG/PNG/GIF/WEBP, máx 5 MB.']);
            exit;
        }
    } else {
        $url_imagen = $url_ext;
    }

    if (empty($url_imagen)) {
        http_response_code(422);
        echo json_encode(['exito'=>false,'mensaje'=>'Se requiere imagen (archivo local o URL)']);
        exit;
    }

    if (DB::driver() === 'pgsql') {
        $stmt = $db->prepare("INSERT INTO imagenes (titulo,descripcion,url_imagen,activo,orden) VALUES (:t,:d,:u,:a,:o) RETURNING id");
        $stmt->execute([':t'=>$titulo,':d'=>$descripcion,':u'=>$url_imagen,':a'=>$activo,':o'=>$orden]);
        $id = (int)($stmt->fetch()['id'] ?? 0);
    } else {
        $stmt = $db->prepare("INSERT INTO imagenes (titulo,descripcion,url_imagen,activo,orden) VALUES (:t,:d,:u,:a,:o)");
        $stmt->execute([':t'=>$titulo,':d'=>$descripcion,':u'=>$url_imagen,':a'=>$activo,':o'=>$orden]);
        $id = (int)$db->lastInsertId();
    }

    echo json_encode(['exito'=>true,'mensaje'=>'Imagen creada','id'=>$id,'orden'=>$orden,'url_imagen'=>$url_imagen]);
    exit;
}

// ── PUT (editar) ──────────────────────────────────────────────
if ($method === 'PUT') {
    $esForm = !empty($_POST);
    if ($esForm) {
        $id=$_POST['id']??0; $titulo=$_POST['titulo']??''; $descripcion=$_POST['descripcion']??'';
        $orden=$_POST['orden']??0; $activo=$_POST['activo']??1; $url_ext=$_POST['url_imagen']??'';
    } else {
        $json=json_decode(file_get_contents('php://input'),true)??[];
        $id=$json['id']??0; $titulo=$json['titulo']??''; $descripcion=$json['descripcion']??'';
        $orden=$json['orden']??0; $activo=$json['activo']??1; $url_ext=$json['url_imagen']??'';
    }

    $id    = intval($id);
    $orden = intval($orden);

    if (!$id) { http_response_code(422); echo json_encode(['exito'=>false,'mensaje'=>'ID requerido']); exit; }

    // Verificar que el orden no esté en uso por otra imagen
    $chk = $db->prepare("SELECT id FROM imagenes WHERE orden = :o AND id != :id LIMIT 1");
    $chk->execute([':o'=>$orden,':id'=>$id]);
    if ($chk->fetch()) {
        // Si está duplicado, asignar el siguiente disponible
        $stmtOrden = $db->query("SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM imagenes");
        $orden     = (int)$stmtOrden->fetch()['siguiente'];
    }

    $curr = $db->prepare("SELECT url_imagen FROM imagenes WHERE id=:id LIMIT 1");
    $curr->execute([':id'=>$id]); $actual = $curr->fetch();
    if (!$actual) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }

    $url_imagen = $actual['url_imagen'];
    if ($esForm && isset($_FILES['archivo']) && $_FILES['archivo']['error'] === UPLOAD_ERR_OK) {
        $nueva = subirArchivo($_FILES['archivo']);
        if (!$nueva) { echo json_encode(['exito'=>false,'mensaje'=>'Archivo no válido.']); exit; }
        borrarLocal($actual['url_imagen']); $url_imagen = $nueva;
    } elseif (!empty($url_ext) && $url_ext !== $actual['url_imagen']) {
        borrarLocal($actual['url_imagen']); $url_imagen = $url_ext;
    }

    $db->prepare("UPDATE imagenes SET titulo=:t,descripcion=:d,url_imagen=:u,activo=:a,orden=:o WHERE id=:id")
       ->execute([':t'=>$titulo,':d'=>$descripcion,':u'=>$url_imagen,':a'=>$activo,':o'=>$orden,':id'=>$id]);
    echo json_encode(['exito'=>true,'mensaje'=>'Imagen actualizada','orden'=>$orden,'url_imagen'=>$url_imagen]);
    exit;
}

// ── DELETE ────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) { $b=json_decode(file_get_contents('php://input'),true)??[]; $id=intval($b['id']??0); }
    if (!$id) { http_response_code(422); echo json_encode(['exito'=>false,'mensaje'=>'ID requerido']); exit; }
    $curr=$db->prepare("SELECT url_imagen FROM imagenes WHERE id=:id LIMIT 1");
    $curr->execute([':id'=>$id]); $row=$curr->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }
    $db->prepare("DELETE FROM imagenes WHERE id=:id")->execute([':id'=>$id]);
    borrarLocal($row['url_imagen']);
    echo json_encode(['exito'=>true,'mensaje'=>'Imagen eliminada']);
    exit;
}

http_response_code(405);
echo json_encode(['exito'=>false,'mensaje'=>'Método no permitido']);

// ── Helpers ───────────────────────────────────────────────────
function subirArchivo(array $file): string|false {
    $ok   = ['image/jpeg','image/png','image/gif','image/webp'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!in_array($mime,$ok,true) || $file['size'] > 5*1024*1024) return false;
    $ext  = ['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp'][$mime] ?? false;
    if (!$ext) return false;
    $nombre  = uniqid('img_',true).'.'.$ext;
    $destino = IMG_DIR.$nombre;
    if (!move_uploaded_file($file['tmp_name'],$destino)) return false;
    chmod($destino,0644);
    return 'img/'.$nombre;
}

function borrarLocal(string $url): void {
    if (empty($url) || str_starts_with($url,'http://') || str_starts_with($url,'https://')) return;
    $ruta = __DIR__.'/'.ltrim($url,'/');
    if (file_exists($ruta) && is_file($ruta)) @unlink($ruta);
}
