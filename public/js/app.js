let html5QrCode = null;
let isScanning = false;

// ========== AUTENTICACIÓN CON SUPABASE AUTH ==========

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Completa todos los campos';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorEl.textContent = 'Credenciales incorrectas';
            return;
        }

        await loadUserProfile();
        showDashboard();
    } catch (err) {
        errorEl.textContent = 'Error de conexión';
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    showLogin();
}

function isAdmin() {
    return currentProfile?.rol === 'admin';
}

function isUsuario() {
    return currentProfile?.rol === 'usuario';
}

let currentEventId = null;

// ========== NAVEGACIÓN ==========

function showLogin() {
    hideAllSections();
    document.getElementById('login-section').classList.add('active');
}

function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard-section').classList.add('active');
    
    // Actualizar header según rol
    const headerTitle = document.querySelector('#dashboard-section .header h1');
    const btnEstudiantes = document.querySelector('#dashboard-section .header button[onclick="showEstudiantes()"]');
    
    if (isAdmin()) {
        headerTitle.textContent = 'Panel de Administrador';
        btnEstudiantes.style.display = 'inline-block';
    } else {
        headerTitle.textContent = 'Mis Eventos';
        btnEstudiantes.style.display = 'none';
    }
    
    loadEventos();
}

function showCreateEvent() {
    hideAllSections();
    document.getElementById('create-event-section').classList.add('active');
}

function showScanner(eventoId, eventoNombre) {
    hideAllSections();
    currentEventId = eventoId;
    document.getElementById('evento-title').textContent = eventoNombre;
    document.getElementById('scanner-section').classList.add('active');
    startScanner();
    loadAsistencias(eventoId);
}

function showEstudiantes() {
    if (!isAdmin()) {
        alert('Solo administradores pueden gestionar estudiantes');
        return;
    }
    hideAllSections();
    document.getElementById('estudiantes-section').classList.add('active');
    loadEstudiantes();
}

function showAgregarEstudiante() {
    hideAllSections();
    document.getElementById('agregar-estudiante-section').classList.add('active');
}

function hideAllSections() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
}

// ========== EVENTOS ==========

async function crearEvento() {
    const nombre = document.getElementById('evento-nombre').value;
    const fechaInicio = document.getElementById('evento-fecha-inicio').value;
    const fechaFin = document.getElementById('evento-fecha-fin').value;
    const horaInicio = document.getElementById('evento-hora-inicio').value;
    const horaFin = document.getElementById('evento-hora-fin').value;
    const imagenFile = document.getElementById('evento-imagen').files[0];

    if (!nombre || !fechaInicio || !fechaFin || !horaInicio || !horaFin) {
        alert('Completa todos los campos obligatorios');
        return;
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
        alert('La fecha fin no puede ser anterior a la fecha inicio');
        return;
    }

    if (fechaInicio === fechaFin && horaFin <= horaInicio) {
        alert('La hora fin debe ser posterior a la hora inicio');
        return;
    }

    let imagenUrl = null;

    if (imagenFile) {
        const fileName = `${Date.now()}_${imagenFile.name}`;
        const { data, error } = await supabase.storage
            .from('eventos')
            .upload(fileName, imagenFile);

        if (!error) {
            imagenUrl = supabase.storage.from('eventos').getPublicUrl(fileName).data.publicUrl;
        }
    }

    await supabase.from('eventos').insert({
        nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        imagen_url: imagenUrl,
        usuario_id: currentUser.id,
        activo: true
    });

    document.getElementById('evento-nombre').value = '';
    document.getElementById('evento-fecha-inicio').value = '';
    document.getElementById('evento-fecha-fin').value = '';
    document.getElementById('evento-hora-inicio').value = '08:00';
    document.getElementById('evento-hora-fin').value = '18:00';
    document.getElementById('evento-imagen').value = '';

    showDashboard();
}

async function loadEventos() {
    const listEl = document.getElementById('eventos-list');
    listEl.innerHTML = '<p style="color: white;">Cargando...</p>';

    let query = supabase
        .from('eventos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });
    
    // Usuarios solo ven sus eventos, admins ven todos
    if (!isAdmin()) {
        query = query.eq('usuario_id', currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
        listEl.innerHTML = '<p style="color: white;">Error cargando eventos</p>';
        return;
    }

    if (!data || data.length === 0) {
        listEl.innerHTML = '<p style="color: white; text-align: center;">No hay eventos. Crea uno para comenzar.</p>';
        return;
    }

    listEl.innerHTML = '';
    data.forEach(evento => {
        const card = document.createElement('div');
        card.className = 'evento-card';
        const fechaInicio = new Date(evento.fecha_inicio).toLocaleDateString('es-ES');
        const fechaFin = new Date(evento.fecha_fin).toLocaleDateString('es-ES');
        const rangoFecha = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} - ${fechaFin}`;
        card.innerHTML = `
            <div class="evento-info">
                <h3>${evento.nombre}</h3>
                <p>📅 ${rangoFecha}</p>
                <p>🕒 ${evento.hora_inicio} - ${evento.hora_fin}</p>
            </div>
            <button class="btn-asistencia" onclick="showScanner('${evento.id}', '${evento.nombre}')">
                Tomar Asistencia
            </button>
        `;
        listEl.appendChild(card);
    });
}

// ========== ESCÁNER QR ==========

function startScanner() {
    html5QrCode = new Html5Qrcode("reader");
    
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length > 0) {
            html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onScanSuccess,
                () => {}
            ).catch(err => {
                showMessage('Error al iniciar cámara. Usa la opción de subir imagen.', 'error');
                showFileUpload();
            });
        } else {
            showMessage('No se detectó cámara. Usa la opción de subir imagen.', 'warning');
            showFileUpload();
        }
    }).catch(err => {
        showMessage('No se puede acceder a la cámara. Usa la opción de subir imagen.', 'error');
        showFileUpload();
    });
}

function showFileUpload() {
    const readerDiv = document.getElementById('reader');
    readerDiv.innerHTML = `
        <div style="padding: 30px; background: white; border-radius: 10px; text-align: center;">
            <h3 style="margin-bottom: 20px;">📷 Subir imagen del código QR</h3>
            <input type="file" id="qr-file" accept="image/*" style="margin-bottom: 20px;">
            <button onclick="scanFile()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">Escanear Imagen</button>
        </div>
    `;
}

function scanFile() {
    const fileInput = document.getElementById('qr-file');
    const file = fileInput.files[0];
    if (!file) {
        alert('Selecciona una imagen primero');
        return;
    }
    
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.scanFile(file, true)
        .then(decodedText => {
            onScanSuccess(decodedText);
        })
        .catch(err => {
            showMessage('No se pudo leer el código QR de la imagen', 'error');
        });
}

async function onScanSuccess(codigoUnico) {
    if (isScanning) return;
    isScanning = true;

    try {
        const { data: estudiante, error: estudianteError } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('codigo_unico', codigoUnico)
            .maybeSingle();

        if (estudianteError) {
            console.error('Error buscando estudiante:', estudianteError);
            showMessage('Error al buscar estudiante', 'error');
            setTimeout(() => { isScanning = false; }, 2000);
            return;
        }

        if (!estudiante) {
            showMessage('Estudiante no encontrado', 'error');
            setTimeout(() => { isScanning = false; }, 2000);
            return;
        }

        const { data: asistenciaExiste, error: checkError } = await supabase
            .from('asistencias')
            .select('id')
            .eq('estudiante_id', estudiante.id)
            .eq('evento_id', currentEventId)
            .maybeSingle();

        if (checkError) {
            console.error('Error verificando asistencia:', checkError);
        }

        if (asistenciaExiste) {
            showMessage('Asistencia ya registrada', 'warning');
            setTimeout(() => { isScanning = false; }, 2000);
            return;
        }

        const { error: insertError } = await supabase.from('asistencias').insert({
            estudiante_id: estudiante.id,
            evento_id: currentEventId
        });

        if (insertError) {
            console.error('Error insertando asistencia:', insertError);
            showMessage('Error al registrar asistencia', 'error');
            setTimeout(() => { isScanning = false; }, 2000);
            return;
        }

        showMessage(`✓ ${estudiante.nombre} ${estudiante.apellido} - Asistencia registrada`, 'success');
        loadAsistencias(currentEventId);
        setTimeout(() => { isScanning = false; }, 2000);

    } catch (error) {
        console.error('Error general:', error);
        showMessage('Error: ' + error.message, 'error');
        setTimeout(() => { isScanning = false; }, 2000);
    }
}

// ========== ASISTENCIAS ==========

async function loadAsistencias(eventoId) {
    const listEl = document.getElementById('asistencias-list');
    
    const { data, error } = await supabase
        .from('asistencias')
        .select(`
            *,
            estudiantes (nombre, apellido, codigo_unico, especialidad, anio)
        `)
        .eq('evento_id', eventoId)
        .order('timestamp', { ascending: false });

    if (!data || data.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #666;">No hay asistencias registradas</p>';
        return;
    }

    listEl.innerHTML = '';
    data.forEach(asistencia => {
        const item = document.createElement('div');
        item.className = 'asistencia-item';
        const time = new Date(asistencia.timestamp).toLocaleTimeString('es-ES');
        const est = asistencia.estudiantes;
        item.innerHTML = `
            <div style="width: 100%;">
                <strong style="font-size: 16px; color: #333;">${est.nombre} ${est.apellido}</strong><br>
                <small style="color: #666; font-size: 13px;">
                    📋 ${est.codigo_unico} | 
                    🎓 ${est.especialidad || 'Sin especialidad'} | 
                    📅 Año ${est.anio || 'N/A'}
                </small>
            </div>
            <span style="color: #007bff; font-weight: bold;">${time}</span>
        `;
        listEl.appendChild(item);
    });
}

// ========== UTILIDADES ==========

function showMessage(text, type) {
    const msgEl = document.getElementById('mensaje');
    msgEl.textContent = text;
    msgEl.className = type;
    setTimeout(() => {
        msgEl.textContent = '';
        msgEl.className = '';
    }, 3000);
}

// ========== GESTIÓN DE ESTUDIANTES ==========

let currentEspecialidad = null;
let currentAnio = null;
let qrCodesGenerated = [];

async function loadEstudiantes() {
    hideAllSections();
    document.getElementById('estudiantes-section').classList.add('active');
    
    const container = document.getElementById('especialidades-accordion');
    container.innerHTML = '<p style="color: white;">Cargando...</p>';

    const { data } = await supabase
        .from('estudiantes')
        .select('*')
        .order('especialidad', { ascending: true })
        .order('anio', { ascending: true })
        .order('codigo_unico', { ascending: true });

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color: white;">No hay estudiantes. Crea una especialidad para comenzar.</p>';
        return;
    }

    const grouped = {};
    data.forEach(est => {
        const esp = est.especialidad || 'Sin Especialidad';
        const anio = est.anio || 'Sin Año';
        if (!grouped[esp]) grouped[esp] = {};
        if (!grouped[esp][anio]) grouped[esp][anio] = [];
        grouped[esp][anio].push(est);
    });

    container.innerHTML = '';
    Object.keys(grouped).sort().forEach(especialidad => {
        const accordion = document.createElement('div');
        accordion.className = 'accordion';
        
        const totalEst = Object.values(grouped[especialidad]).flat().length;
        const espId = especialidad.replace(/\s/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        
        accordion.innerHTML = `
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <span>🎓 ${especialidad} (${totalEst} estudiantes)</span>
                <span>▼</span>
            </div>
            <div class="accordion-content">
                <div id="anios-${espId}"></div>
            </div>
        `;
        container.appendChild(accordion);

        const aniosContainer = accordion.querySelector(`#anios-${espId}`);
        Object.keys(grouped[especialidad]).sort((a, b) => a - b).forEach(anio => {
            const subAccordion = document.createElement('div');
            subAccordion.className = 'sub-accordion';
            
            const estudiantes = grouped[especialidad][anio];
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'sub-accordion-header';
            headerDiv.onclick = function() { toggleSubAccordion(this); };
            
            headerDiv.innerHTML = `
                <span>📅 Año ${anio} (${estudiantes.length} estudiantes)</span>
                <div>
                    <button class="btn-primary" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">+ Agregar</button>
                    <button class="btn-success" style="padding: 5px 10px; font-size: 12px;">📥 QRs</button>
                    <span style="margin-left: 10px;">▼</span>
                </div>
            `;
            
            const btnAgregar = headerDiv.querySelector('.btn-primary');
            btnAgregar.onclick = function(e) {
                e.stopPropagation();
                agregarEstudianteA(especialidad, anio);
            };
            
            const btnQRs = headerDiv.querySelector('.btn-success');
            btnQRs.onclick = function(e) {
                e.stopPropagation();
                generarQRsGrupoDirecto(especialidad, anio);
            };
            
            subAccordion.appendChild(headerDiv);
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'sub-accordion-content';
            contentDiv.innerHTML = estudiantes.map(est => `
                <div class="estudiante-item">
                    <div>
                        <strong>${est.nombre} ${est.apellido}</strong><br>
                        <small>📋 ${est.codigo_unico}</small>
                    </div>
                </div>
            `).join('');
            
            subAccordion.appendChild(contentDiv);
            aniosContainer.appendChild(subAccordion);
        });
    });
}

function toggleAccordion(element) {
    const content = element.nextElementSibling;
    content.classList.toggle('active');
    const arrow = element.querySelector('span:last-child');
    arrow.textContent = content.classList.contains('active') ? '▲' : '▼';
}

function toggleSubAccordion(element) {
    const content = element.nextElementSibling;
    content.classList.toggle('active');
    const arrow = element.querySelector('span:last-child');
    arrow.textContent = content.classList.contains('active') ? '▲' : '▼';
}

function showCrearEspecialidad() {
    hideAllSections();
    document.getElementById('crear-especialidad-section').classList.add('active');
}

function crearEspecialidadAnio() {
    const especialidad = document.getElementById('nueva-especialidad').value;
    const anio = document.getElementById('nuevo-anio').value;
    
    if (!especialidad || !anio) {
        alert('Completa todos los campos');
        return;
    }
    
    currentEspecialidad = especialidad;
    currentAnio = parseInt(anio);
    showAgregarEstudiante();
}

function agregarEstudianteA(especialidad, anio) {
    currentEspecialidad = especialidad;
    currentAnio = anio;
    showAgregarEstudiante();
}

function showListaEstudiantes() {
    loadEstudiantes();
}

function showAgregarEstudiante() {
    hideAllSections();
    document.getElementById('agregar-estudiante-section').classList.add('active');
    document.getElementById('form-especialidad').textContent = currentEspecialidad;
    document.getElementById('form-anio').textContent = currentAnio;
}

async function agregarEstudiante() {
    const codigo = document.getElementById('est-codigo').value;
    const nombre = document.getElementById('est-nombre').value;
    const apellido = document.getElementById('est-apellido').value;
    const email = document.getElementById('est-email').value;

    if (!codigo || !nombre || !apellido) {
        alert('Completa todos los campos obligatorios');
        return;
    }

    const { error } = await supabase.from('estudiantes').insert({
        codigo_unico: codigo,
        nombre,
        apellido,
        email: email || null,
        especialidad: currentEspecialidad,
        anio: currentAnio
    });

    if (error) {
        alert('Error: ' + error.message);
        return;
    }

    document.getElementById('est-codigo').value = '';
    document.getElementById('est-nombre').value = '';
    document.getElementById('est-apellido').value = '';
    document.getElementById('est-email').value = '';

    alert('✓ Estudiante agregado correctamente');
    showListaEstudiantes();
}

async function generarQRsGrupo() {
    generarQRsGrupoDirecto(currentEspecialidad, currentAnio);
}

async function generarQRsGrupoDirecto(especialidad, anio) {
    currentEspecialidad = especialidad;
    currentAnio = anio;
    
    hideAllSections();
    document.getElementById('generar-qr-section').classList.add('active');
    
    const container = document.getElementById('qr-container');
    container.innerHTML = '<p style="color: white;">Generando QRs...</p>';
    qrCodesGenerated = [];

    const { data } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('especialidad', especialidad)
        .eq('anio', anio)
        .order('codigo_unico', { ascending: true });

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color: white;">No hay estudiantes</p>';
        return;
    }

    container.innerHTML = '';
    
    data.forEach((est, index) => {
        const qrItem = document.createElement('div');
        qrItem.className = 'qr-item';
        qrItem.innerHTML = `
            <h3>${est.nombre} ${est.apellido}</h3>
            <p><strong>${est.codigo_unico}</strong></p>
            <div class="qr-code" id="qr-${index}"></div>
            <button class="download-btn" onclick="downloadSingleQR('qr-${index}', '${est.codigo_unico}')">📥 Descargar</button>
        `;
        container.appendChild(qrItem);

        setTimeout(() => {
            new QRCode(document.getElementById(`qr-${index}`), {
                text: est.codigo_unico,
                width: 180,
                height: 180
            });
        }, index * 100);

        qrCodesGenerated.push({ id: `qr-${index}`, codigo: est.codigo_unico });
    });
}

function downloadSingleQR(elementId, filename) {
    const canvas = document.querySelector(`#${elementId} canvas`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR_${filename}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function downloadAllQRs() {
    if (qrCodesGenerated.length === 0) {
        alert('No hay QRs generados');
        return;
    }
    qrCodesGenerated.forEach((qr, index) => {
        setTimeout(() => downloadSingleQR(qr.id, qr.codigo), index * 300);
    });
}
