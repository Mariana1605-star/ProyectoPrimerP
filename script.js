'use strict';

// Estado del carrusel
let imagenes   = [];
let indiceActual = 0;
// ── Carga inicial ─────────────────────────────────────────────
$(document).ready(function () {
    cargarImagenes();
    cargarTabla();
});

/* ═══════════════════════════════════════════════════════════════
   1. CARRUSEL CON AJAX Y SUSTITUCIÓN DE NODOS
   ═══════════════════════════════════════════════════════════════ */

function cargarImagenes() {
    $.getJSON('datos.php', function (data) {
        imagenes = data;
        if (!imagenes.length) {
            $('#slide-container').html(
                '<p class="text-white text-center py-5">No hay imágenes activas.</p>'
            );
            return;
        }
        construirIndicadores();
        mostrarSlide(0);
    }).fail(function () {
        $('#slide-container').html(
            '<p class="text-danger text-center py-5">Error al cargar imágenes.</p>'
        );
    });
}

/**
 * mostrarSlide(idx)
 *  1. Hace fetch AJAX a datos.php?id=N
 *  2. Crea/SUSTITUYE el nodo <img> dentro de #contenedor-ajax  ← inspector
 *  3. Renderiza el slide visible en #slide-container
 */
function mostrarSlide(idx) {
    if (!imagenes.length) return;
    indiceActual = (idx + imagenes.length) % imagenes.length;
    const img    = imagenes[indiceActual];

    // ── Paso AJAX: obtener datos frescos por ID ───────────────
    $.getJSON('datos.php', { id: img.id }, function (data) {

        const nodoId   = 'img-node-' + Date.now();
        const nuevoImg = document.createElement('img');
        nuevoImg.id        = nodoId;
        nuevoImg.className = 'img-sustituida';
        nuevoImg.src       = data.url_imagen;
        nuevoImg.alt       = data.titulo;

        // Eliminar nodo anterior y colocar el nuevo (SUSTITUCIÓN)
        const contenedorAjax = document.getElementById('contenedor-ajax');
        contenedorAjax.innerHTML = '';      // elimina nodo anterior
        contenedorAjax.appendChild(nuevoImg); // inserta el nuevo nodo

        // ── Render visible del carrusel ───────────────────────
        const slideHtml =
            '<div class="visor-slide">' +
                '<img src="' + escHtml(data.url_imagen) + '"' +
                '     alt="'  + escHtml(data.titulo) + '"' +
                '     style="width:100%;max-height:420px;object-fit:cover;display:block;">' +
                '<div style="position:absolute;bottom:0;left:0;right:0;' +
                     'background:linear-gradient(transparent,rgba(0,0,0,.7));' +
                     'color:#fff;padding:1.2rem 1.5rem;">' +
                    '<h4 style="margin:0 0 .25rem;font-weight:700;">' + escHtml(data.titulo) + '</h4>' +
                    (data.descripcion
                        ? '<p style="margin:0;font-size:.9rem;color:#cbd5e1;">' + escHtml(data.descripcion) + '</p>'
                        : '') +
                '</div>' +
            '</div>';

        $('#slide-container').html(slideHtml);

        // Info card debajo del carrusel
        $('#imgTitulo').text(data.titulo);
        $('#imgDescripcion').text(data.descripcion || '');
        $('#infoImagen').show();

        // Indicadores
        actualizarIndicadores();
    });
}

// ── Botones de navegación ─────────────────────────────────────
$(document).on('click', '#btnPrev', () => mostrarSlide(indiceActual - 1));
$(document).on('click', '#btnNext', () => mostrarSlide(indiceActual + 1));

// ── Puntos indicadores ────────────────────────────────────────
function construirIndicadores() {
    const cont = $('#carouselIndicadores').empty();
    imagenes.forEach((_, i) => {
        $('<button>').addClass('carousel-dot')
            .attr('aria-label', 'Slide ' + (i + 1))
            .on('click', () => mostrarSlide(i))
            .appendTo(cont);
    });
}

function actualizarIndicadores() {
    $('#carouselIndicadores .carousel-dot').each(function (i) {
        $(this).toggleClass('carousel-dot--active', i === indiceActual);
    });
}

/* ═══════════════════════════════════════════════════════════════
   2. PANEL ADMINISTRADOR – CRUD completo
   ═══════════════════════════════════════════════════════════════ */

function cargarTabla() {
    $('#tablaImagenes').html(
        '<tr><td colspan="5" class="text-center py-3 text-muted">Cargando...</td></tr>'
    );
    $.getJSON('datos.php?todas=1', function (rows) {
        if (!rows.length) {
            $('#tablaImagenes').html(
                '<tr><td colspan="5" class="text-center py-4 text-muted">Sin imágenes registradas.</td></tr>'
            );
            return;
        }
        const html = rows.map(r => {
            const src   = escHtml(r.url_imagen);
            const thumb = '<img src="' + src + '" class="admin-thumb" alt="">';
            const badge = r.activo == 1
                ? '<span class="badge-estado badge-activo">Activo</span>'
                : '<span class="badge-estado badge-inactivo">Inactivo</span>';
            return '<tr data-id="' + r.id + '">' +
                '<td>' + thumb + '</td>' +
                '<td class="fw-600">' + escHtml(r.titulo) + '</td>' +
                '<td class="text-center">' + r.orden + '</td>' +
                '<td class="text-center">' + badge + '</td>' +
                '<td class="text-center">' +
                    '<button class="btn-icon btn-toggle" title="Activar/Desactivar">' +
                        '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>' +
                    '</button>' +
                    '<button class="btn-icon btn-edit" title="Editar">' +
                        '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                    '</button>' +
                    '<button class="btn-icon btn-delete" title="Eliminar">' +
                        '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>' +
                    '</button>' +
                '</td>' +
            '</tr>';
        }).join('');
        $('#tablaImagenes').html(html);
    });
}

// Toggle activo
$(document).on('click', '.btn-toggle', function () {
    const id = $(this).closest('tr').data('id');
    $.getJSON('datos.php', { toggle: 1, id: id }, function (d) {
        notif(d.mensaje, d.exito ? 'success' : 'error');
        cargarTabla();
        cargarImagenes();
    });
});

// Eliminar
$(document).on('click', '.btn-delete', function () {
    const tr = $(this).closest('tr');
    const id = tr.data('id');
    if (!confirm('¿Eliminar imagen #' + id + '?')) return;
    $.ajax({
        url: 'datos.php?id=' + id,
        type: 'DELETE',
        success: function (d) {
            notif(d.mensaje, d.exito ? 'success' : 'error');
            cargarTabla(); cargarImagenes();
        },
        error: function () { notif('Error al eliminar', 'error'); }
    });
});

/* ── Modal nueva/editar imagen ─────────────────────────────── */
let editandoId  = null;
let archivoFile = null;
let tabActivo   = 'url';  // 'url' | 'local'

$('#btnNuevaImagen').on('click', () => abrirModal(null));

$(document).on('click', '.btn-edit', function () {
    const id = $(this).closest('tr').data('id');
    $.getJSON('datos.php', { id: id }, function (d) { abrirModal(d); });
});

function abrirModal(datos) {
    editandoId  = datos ? datos.id : null;
    archivoFile = null;
    tabActivo   = 'url';

    const esEdicion = editandoId !== null;
    const modal = $(
        '<div class="admin-modal" id="modalImagen">' +
        '<div class="admin-modal-inner">' +
            '<div class="admin-modal-header">' +
                '<h5>' + (esEdicion ? 'Editar imagen' : 'Nueva imagen') + '</h5>' +
                '<button class="btn-modal-close" id="btnCerrarModal">' +
                    '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="admin-modal-body">' +
                '<div class="mb-3"><label class="form-label fw-600">Título *</label>' +
                    '<input type="text" id="mTitulo" class="form-control" value="' + (datos ? escHtml(datos.titulo) : '') + '"></div>' +
                '<div class="mb-3"><label class="form-label fw-600">Descripción</label>' +
                    '<textarea id="mDesc" class="form-control" rows="2">' + (datos ? escHtml(datos.descripcion || '') : '') + '</textarea></div>' +
                '<div class="row mb-3">' +
                    '<div class="col-6"><label class="form-label fw-600">Orden</label>' +
                        '<input type="number" id="mOrden" class="form-control" value="' + (datos ? datos.orden : 0) + '"></div>' +
                    '<div class="col-6"><label class="form-label fw-600">Estado</label>' +
                        '<select id="mActivo" class="form-control">' +
                            '<option value="1" ' + (!datos || datos.activo == 1 ? 'selected' : '') + '>Activo</option>' +
                            '<option value="0" ' + (datos && datos.activo == 0 ? 'selected' : '') + '>Inactivo</option>' +
                        '</select></div>' +
                '</div>' +
                '<div class="mb-3">' +
                    '<label class="form-label fw-600">Imagen</label>' +
                    '<div class="img-source-tabs mb-2">' +
                        '<button class="img-tab active" id="tabUrl">URL externa</button>' +
                        '<button class="img-tab" id="tabLocal">Archivo local</button>' +
                    '</div>' +
                    '<div id="panelUrl"><input type="url" id="mUrl" class="form-control" placeholder="https://..." value="' + (datos ? escHtml(datos.url_imagen) : '') + '"></div>' +
                    '<div id="panelLocal" style="display:none;">' +
                        '<div class="file-drop-zone" id="dropZone">' +
                            '<div class="file-drop-icon"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>' +
                            '<p class="file-drop-text">Arrastra tu imagen o <span>selecciona un archivo</span></p>' +
                            '<p class="file-drop-hint">JPG, PNG, GIF, WEBP · máx 5 MB</p>' +
                            '<input type="file" id="mArchivo" accept="image" style="display:none;">' +
                        '</div>' +
                        '<div id="fileChosen" style="display:none;" class="file-chosen">' +
                            '<span id="fileName"></span>' +
                            '<button class="btn-quitar-archivo" id="btnQuitarArchivo">' +
                                '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                (datos
                    ? '<div class="admin-preview mb-2"><img id="previewImg" src="' + escHtml(datos.url_imagen) + '"><span class="preview-label">imagen actual</span></div>'
                    : '') +
            '</div>' +
            '<div class="admin-modal-footer">' +
                '<button class="btn btn-outline-secondary btn-sm" id="btnCerrarModal2">Cancelar</button>' +
                '<button class="btn-admin-save" id="btnGuardar">' + (esEdicion ? 'Guardar cambios' : 'Crear imagen') + '</button>' +
            '</div>' +
        '</div>' +
        '</div>'
    );
    $('body').append(modal);
 */

    // Tabs URL / Local
    $('#tabUrl').on('click', function () {
        tabActivo = 'url';
        $(this).addClass('active'); $('#tabLocal').removeClass('active');
        $('#panelUrl').show(); $('#panelLocal').hide();
    });
    $('#tabLocal').on('click', function () {
        tabActivo = 'local';
        $(this).addClass('active'); $('#tabUrl').removeClass('active');
        $('#panelLocal').show(); $('#panelUrl').hide();
    });

    // Drop zone
    $('#dropZone').on('click', () => $('#mArchivo').click());
    $('#dropZone').on('dragover', function (e) { e.preventDefault(); $(this).addClass('dragover'); });
    $('#dropZone').on('dragleave drop', function (e) {
        e.preventDefault(); $(this).removeClass('dragover');
        if (e.type === 'drop') manejarArchivo(e.originalEvent.dataTransfer.files[0]);
    });
    $('#mArchivo').on('change', function () { if (this.files[0]) manejarArchivo(this.files[0]); });
    $('#btnQuitarArchivo').on('click', () => { archivoFile=null; $('#fileChosen').hide(); $('#dropZone').show(); });

    // Cerrar modal
    $('#btnCerrarModal, #btnCerrarModal2').on('click', () => $('#modalImagen').remove());
    $('#modalImagen').on('click', function (e) { if ($(e.target).is('#modalImagen')) $(this).remove(); });

    // Guardar
    $('#btnGuardar').on('click', guardarImagen);
}

function manejarArchivo(file) {
    if (!file) return;
    archivoFile = file;
    $('#fileName').text(file.name);
    $('#fileChosen').show(); $('#dropZone').hide();
}

function guardarImagen() {
    const titulo      = $('#mTitulo').val().trim();
    const descripcion = $('#mDesc').val().trim();
    const orden       = parseInt($('#mOrden').val()) || 0;
    const activo      = parseInt($('#mActivo').val());

    if (!titulo) { alert('El título es requerido'); return; }

    const btn = $('#btnGuardar').prop('disabled', true).text('Guardando...');

    if (tabActivo === 'local' && archivoFile) {
        // FormData para subir archivo
        const fd = new FormData();
        fd.append('titulo',      titulo);
        fd.append('descripcion', descripcion);
        fd.append('orden',       orden);
        fd.append('activo',      activo);
        fd.append('archivo',     archivoFile);
        if (editandoId) fd.append('_method', 'PUT'), fd.append('id', editandoId);
        $.ajax({
            url: 'datos.php', type: 'POST', data: fd,
            processData: false, contentType: false,
            success: function (d) { onGuardado(d); },
            error: function ()    { notif('Error de red', 'error'); btn.prop('disabled',false).text('Guardar'); }
        });
    } else {
        // JSON con URL externa
        const url_imagen = $('#mUrl').val().trim();
        if (!url_imagen) { alert('Ingresa una URL de imagen'); btn.prop('disabled',false).text('Guardar'); return; }
        const payload = { titulo, descripcion, orden, activo, url_imagen };
        if (editandoId) {
            payload.id = editandoId;
            $.ajax({
                url: 'datos.php', type: 'POST',
                data: JSON.stringify(Object.assign({ _method:'PUT' }, payload)),
                contentType: 'application/json',
                beforeSend: function () {
                    // Truco: forzar PUT via POST con _method
                },
                success: function (d) { onGuardado(d); },
                error:   function ()  { notif('Error de red', 'error'); btn.prop('disabled',false); }
            });
            // Alternativa directa PUT:
            $.ajax({
                url: 'datos.php', type: 'PUT',
                data: JSON.stringify(payload),
                contentType: 'application/json',
                success: function (d) { onGuardado(d); },
                error:   function ()  {}
            });
            return;
        }
        $.ajax({
            url: 'datos.php', type: 'POST',
            data: JSON.stringify(payload),
            contentType: 'application/json',
            success: function (d) { onGuardado(d); },
            error:   function ()  { notif('Error de red', 'error'); btn.prop('disabled',false); }
        });
    }
}
function onGuardado(d) {
    $('#modalImagen').remove();
    notif(d.mensaje, d.exito ? 'success' : 'error');
    if (d.exito) { cargarTabla(); cargarImagenes(); }
}

/* ── Utilidades ─────────────────────────────────────────────── */
function notif(msg, tipo) {
    const cls = tipo === 'success' ? 'admin-notif admin-notif--success' : 'admin-notif admin-notif--error';
    $('#adminNotif').html('<div class="' + cls + '">' + escHtml(msg) + '</div>');
    setTimeout(() => $('#adminNotif').empty(), 4000);
}

function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

