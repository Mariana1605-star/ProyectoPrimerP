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
            $('#slide-container').html('<p class="text-white text-center py-5">No hay imágenes activas.</p>');
            return;
        }
        construirIndicadores();
        mostrarSlide(0);
    }).fail(function () {
        $('#slide-container').html('<p class="text-danger text-center py-5">Error al cargar imágenes.</p>');
    });
}

function mostrarSlide(idx) {
    if (!imagenes.length) return;
    indiceActual = (idx + imagenes.length) % imagenes.length;
    const img = imagenes[indiceActual];

    $.getJSON('datos.php', { id: img.id }, function (data) {
        // Sustitución de nodo en el inspector (Nodo invisible para pruebas/forense)
        const nuevoImg = document.createElement('img');
        nuevoImg.id = 'img-node-' + Date.now();
        nuevoImg.className = 'img-sustituida';
        nuevoImg.src = data.url_imagen;
        
        const contenedorAjax = document.getElementById('contenedor-ajax');
        if(contenedorAjax) {
            contenedorAjax.innerHTML = '';
            contenedorAjax.appendChild(nuevoImg);
        }

        // Render visible
        const slideHtml = `
            <div class="visor-slide">
                <img src="${escHtml(data.url_imagen)}" alt="${escHtml(data.titulo)}" 
                     style="width:100%; max-height:420px; object-fit:cover; display:block;">
                <div style="position:absolute; bottom:0; left:0; right:0; 
                     background:linear-gradient(transparent,rgba(0,0,0,.7)); color:#fff; padding:1.2rem 1.5rem;">
                    <h4 style="margin:0 0 .25rem; font-weight:700;">${escHtml(data.titulo)}</h4>
                    ${data.descripcion ? `<p style="margin:0; font-size:.9rem; color:#cbd5e1;">${escHtml(data.descripcion)}</p>` : ''}
                </div>
            </div>`;

        $('#slide-container').html(slideHtml);
        $('#imgTitulo').text(data.titulo);
        $('#imgDescripcion').text(data.descripcion || '');
        $('#infoImagen').show();
        actualizarIndicadores();
    });
}

$(document).on('click', '#btnPrev', () => mostrarSlide(indiceActual - 1));
$(document).on('click', '#btnNext', () => mostrarSlide(indiceActual + 1));

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
   2. PANEL ADMINISTRADOR
   ═══════════════════════════════════════════════════════════════ */

function cargarTabla() {
    $('#tablaImagenes').html('<tr><td colspan="5" class="text-center py-3 text-muted">Cargando...</td></tr>');
    $.getJSON('datos.php?todas=1', function (rows) {
        if (!rows.length) {
            $('#tablaImagenes').html('<tr><td colspan="5" class="text-center py-4 text-muted">Sin imágenes registradas.</td></tr>');
            return;
        }
        const html = rows.map(r => {
            return `<tr data-id="${r.id}">
                <td><img src="${escHtml(r.url_imagen)}" class="admin-thumb"></td>
                <td class="fw-600">${escHtml(r.titulo)}</td>
                <td class="text-center">${r.orden}</td>
                <td class="text-center">
                    <span class="badge-estado ${r.activo == 1 ? 'badge-activo' : 'badge-inactivo'}">
                        ${r.activo == 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn-icon btn-toggle" title="Estado">🔄</button>
                    <button class="btn-icon btn-edit" title="Editar">✏️</button>
                    <button class="btn-icon btn-delete" title="Eliminar">🗑️</button>
                </td>
            </tr>`;
        }).join('');
        $('#tablaImagenes').html(html);
    });
}

$(document).on('click', '.btn-toggle', function () {
    const id = $(this).closest('tr').data('id');
    $.getJSON('datos.php', { toggle: 1, id: id }, function (d) {
        notif(d.mensaje, d.exito ? 'success' : 'error');
        cargarTabla(); cargarImagenes();
    });
});

$(document).on('click', '.btn-delete', function () {
    const id = $(this).closest('tr').data('id');
    if (!confirm('¿Eliminar imagen #' + id + '?')) return;
    $.ajax({
        url: 'datos.php?id=' + id,
        type: 'DELETE',
        success: function (d) {
            notif(d.mensaje, d.exito ? 'success' : 'error');
            cargarTabla(); cargarImagenes();
        }
    });
});

/* ── Modal y Lógica de Guardado ─────────────────────────────── */
let editandoId  = null;
let archivoFile = null;
let tabActivo   = 'url';

$('#btnNuevaImagen').on('click', () => abrirModal(null));

$(document).on('click', '.btn-edit', function () {
    const id = $(this).closest('tr').data('id');
    $.getJSON('datos.php', { id: id }, function (d) { abrirModal(d); });
});

function abrirModal(datos) {
    editandoId = datos ? datos.id : null;
    archivoFile = null;
    tabActivo = 'url';

    const esEdicion = editandoId !== null;
    const modalHtml = `
        <div class="admin-modal" id="modalImagen">
            <div class="admin-modal-inner">
                <div class="admin-modal-header">
                    <h5>${esEdicion ? 'Editar imagen' : 'Nueva imagen'}</h5>
                    <button class="btn-modal-close" id="btnCerrarModal">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="mb-3">
                        <label class="form-label fw-600">Título *</label>
                        <input type="text" id="mTitulo" class="form-control" value="${datos ? escHtml(datos.titulo) : ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-600">Descripción</label>
                        <textarea id="mDesc" class="form-control" rows="2">${datos ? escHtml(datos.descripcion || '') : ''}</textarea>
                    </div>
                    <div class="row mb-3">
                        <div class="col-6">
                            <label class="form-label fw-600">Orden</label>
                            <input type="number" id="mOrden" class="form-control" value="${datos ? datos.orden : 0}">
                        </div>
                        <div class="col-6">
                            <label class="form-label fw-600">Estado</label>
                            <select id="mActivo" class="form-control">
                                <option value="1" ${!datos || datos.activo == 1 ? 'selected' : ''}>Activo</option>
                                <option value="0" ${datos && datos.activo == 0 ? 'selected' : ''}>Inactivo</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-600">Imagen</label>
                        <div class="img-source-tabs mb-2">
                            <button class="img-tab active" id="tabUrl">URL externa</button>
                            <button class="img-tab" id="tabLocal">Archivo local</button>
                        </div>
                        <div id="panelUrl">
                            <input type="url" id="mUrl" class="form-control" placeholder="https://..." value="${datos ? escHtml(datos.url_imagen) : ''}">
                        </div>
                        <div id="panelLocal" style="display:none;">
                            <div class="file-drop-zone" id="dropZone">
                                <p>Arrastra o selecciona un archivo</p>
                                <input type="file" id="mArchivo" accept="image/*" style="display:none;">
                            </div>
                            <div id="fileChosen" style="display:none;" class="file-chosen">
                                <span id="fileName"></span>
                                <button class="btn-quitar-archivo" id="btnQuitarArchivo">×</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button class="btn btn-outline-secondary btn-sm" id="btnCerrarModal2">Cancelar</button>
                    <button class="btn-admin-save" id="btnGuardar">${esEdicion ? 'Guardar cambios' : 'Crear imagen'}</button>
                </div>
            </div>
        </div>`;

    $('body').append(modalHtml);

    // Eventos del modal
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

    // CORRECCIÓN: Eventos de selección de archivo
    $('#dropZone').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    // Forzamos el click en el input oculto
    document.getElementById('mArchivo').click();
});

// Asegurarnos que el cambio se detecte
$(document).on('change', '#mArchivo', function() {
    if (this.files && this.files[0]) {
        manejarArchivo(this.files[0]);
    }
});

    $('#btnQuitarArchivo').on('click', function() { 
        archivoFile = null; 
        $('#fileChosen').hide(); 
        $('#dropZone').show(); 
        $('#mArchivo').val(''); // Limpiar el input
    });

    $('#btnCerrarModal, #btnCerrarModal2').on('click', () => $('#modalImagen').remove());
    $('#btnGuardar').on('click', guardarImagen);
} // Aquí cierra abrirModal correctamente

// 3. FUNCIONES GLOBALES (Fuera de abrirModal)
function manejarArchivo(file) {
    archivoFile = file;
    $('#fileName').text(file.name);
    $('#fileChosen').show(); 
    $('#dropZone').hide();
}

function guardarImagen() {
    const titulo = $('#mTitulo').val().trim();
    if (!titulo) return alert('El título es requerido');

    const btn = $('#btnGuardar').prop('disabled', true).text('Guardando...');
    const fd = new FormData();
    fd.append('titulo', titulo);
    fd.append('descripcion', $('#mDesc').val().trim());
    fd.append('orden', $('#mOrden').val());
    fd.append('activo', $('#mActivo').val());

    if (tabActivo === 'local' && archivoFile) {
        fd.append('archivo', archivoFile);
    } else {
        fd.append('url_imagen', $('#mUrl').val().trim());
    }

    if (editandoId) {
        fd.append('id', editandoId);
        fd.append('_method', 'PUT'); 
    }

    $.ajax({
        url: 'datos.php',
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        success: function (d) {
            $('#modalImagen').remove();
            notif(d.mensaje, d.exito ? 'success' : 'error');
            if (d.exito) { cargarTabla(); cargarImagenes(); }
        },
        error: function () {
            notif('Error de servidor', 'error');
            btn.prop('disabled', false).text('Guardar');
        }
    });
}

function notif(msg, tipo) {
    const cls = tipo === 'success' ? 'admin-notif admin-notif--success' : 'admin-notif admin-notif--error';
    $('#adminNotif').html(`<div class="${cls}">${escHtml(msg)}</div>`);
    setTimeout(() => $('#adminNotif').empty(), 4000);
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
