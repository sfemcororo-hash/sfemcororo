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
            errorEl.textContent = error.message;
            return;
        }

        // Cargar perfil del usuario
        const { data: profile } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        currentUser = data.user;
        currentProfile = profile || { rol: 'admin' }; // Fallback para admin
        showDashboard();
    } catch (err) {
        errorEl.textContent = 'Error de conexión: ' + err.message;
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
let eventoTimer = null;

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
    
    // Validar fecha y hora del evento
    validarEventoActivo(eventoId).then(esValido => {
        if (esValido) {
            startScanner();
            loadAsistencias(eventoId);
            iniciarMonitoreoEvento(eventoId);
        }
    });
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
    
    // Detener temporizador si existe
    if (eventoTimer) {
        clearInterval(eventoTimer);
        eventoTimer = null;
    }
    
    // Detener escáner si está activo
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop();
    }
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

    const { data, error } = await supabase
        .from('eventos')
        .select('*');

    if (error) {
        listEl.innerHTML = '<p style="color: white;">Error cargando eventos</p>';
        return;
    }

    // Filtrar eventos según rol
    let eventos = data || [];
    if (!isAdmin()) {
        eventos = eventos.filter(evento => evento.usuario_id === currentUser.id);
    }
    
    // Filtrar solo eventos activos
    eventos = eventos.filter(evento => evento.activo);
    
    // Ordenar por fecha de creación
    eventos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (eventos.length === 0) {
        listEl.innerHTML = '<p style="color: white; text-align: center;">No hay eventos. Crea uno para comenzar.</p>';
        return;
    }

    listEl.innerHTML = '';
    eventos.forEach(evento => {
        const card = document.createElement('div');
        card.className = 'evento-card';
        const fechaInicio = new Date(evento.fecha_inicio + 'T00:00:00').toLocaleDateString('es-BO');
        const fechaFin = new Date(evento.fecha_fin + 'T00:00:00').toLocaleDateString('es-BO');
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

function iniciarMonitoreoEvento(eventoId) {
    // Verificar cada 60 segundos si el evento sigue activo
    eventoTimer = setInterval(async () => {
        const { data: evento } = await supabase
            .from('eventos')
            .select('fecha_inicio, fecha_fin, hora_inicio, hora_fin')
            .eq('id', eventoId)
            .single();
        
        if (!evento) return;
        
        const ahora = new Date();
        const fechaActual = ahora.toISOString().split('T')[0];
        const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + ahora.getMinutes().toString().padStart(2, '0');
        const horaFin = evento.hora_fin.substring(0, 5);
        
        // Agregar 10 minutos de tolerancia
        const [horaFinH, horaFinM] = horaFin.split(':').map(Number);
        let minutosFinales = horaFinM + 10;
        let horasFinales = horaFinH;
        
        if (minutosFinales >= 60) {
            horasFinales += 1;
            minutosFinales -= 60;
        }
        
        const horaFinConTolerancia = horasFinales.toString().padStart(2, '0') + ':' + minutosFinales.toString().padStart(2, '0');
        
        // Verificar si ya pasó el tiempo (con tolerancia)
        if (fechaActual > evento.fecha_fin || (fechaActual === evento.fecha_fin && horaActual > horaFinConTolerancia)) {
            clearInterval(eventoTimer);
            alert('⏰ El periodo del evento ha finalizado. Redirigiendo al dashboard...');
            showDashboard();
        }
    }, 60000); // Cada 60 segundos
}

async function validarEventoActivo(eventoId) {
    const { data: evento } = await supabase
        .from('eventos')
        .select('fecha_inicio, fecha_fin, hora_inicio, hora_fin')
        .eq('id', eventoId)
        .single();
    
    if (!evento) return false;
    
    const ahora = new Date();
    const fechaActual = ahora.toISOString().split('T')[0];
    const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + ahora.getMinutes().toString().padStart(2, '0');
    
    console.log('Validación:', {
        fechaActual,
        horaActual,
        evento
    });
    
    // Validar fecha
    if (fechaActual < evento.fecha_inicio || fechaActual > evento.fecha_fin) {
        alert(`⚠️ Este evento solo está activo entre ${evento.fecha_inicio} y ${evento.fecha_fin}\nFecha actual: ${fechaActual}`);
        showDashboard();
        return false;
    }
    
    // Extraer solo HH:MM de las horas del evento (quitar segundos)
    const horaInicio = evento.hora_inicio.substring(0, 5);
    const horaFin = evento.hora_fin.substring(0, 5);
    
    // Validar hora
    if (horaActual < horaInicio || horaActual > horaFin) {
        alert(`⚠️ Este evento solo registra asistencias entre ${horaInicio} y ${horaFin}\nHora actual: ${horaActual}`);
        showDashboard();
        return false;
    }
    
    return true;
}

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

        const { data: todasAsistencias } = await supabase
            .from('asistencias')
            .select('*');
        
        const asistenciaExiste = todasAsistencias?.find(a => 
            a.estudiante_id === estudiante.id && a.evento_id === currentEventId
        );



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

        showMessage(`✓ ${estudiante.nombre} ${estudiante.apellido_paterno} ${estudiante.apellido_materno || ''} - Asistencia registrada`, 'success');
        
        // Esperar un momento antes de recargar las asistencias
        setTimeout(() => {
            loadAsistencias(currentEventId);
        }, 500);
        
        // Reiniciar escáner después de 2 segundos
        setTimeout(() => { 
            isScanning = false;
            // Si hay cámara activa, continuar escaneando
            if (html5QrCode && html5QrCode.isScanning) {
                // Ya está escaneando, solo resetear flag
            } else {
                // Reiniciar escáner si se detuvo
                startScanner();
            }
        }, 2000);

    } catch (error) {
        console.error('Error general:', error);
        showMessage('Error: ' + error.message, 'error');
        setTimeout(() => { isScanning = false; }, 2000);
    }
}

// ========== ASISTENCIAS ==========

async function loadAsistencias(eventoId) {
    console.log('Cargando asistencias para evento:', eventoId);
    const listEl = document.getElementById('asistencias-list');
    
    // Usar consulta SQL directa
    console.log('Ejecutando consulta SQL con eventoId:', eventoId, 'tipo:', typeof eventoId);
    const result = await supabase.query(`
        SELECT a.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_unico, e.dni, e.especialidad, e.anio
        FROM asistencias a
        JOIN estudiantes e ON a.estudiante_id = e.id
        WHERE a.evento_id = ?
        ORDER BY a.timestamp DESC
    `, [eventoId]);
    
    console.log('Resultado consulta directa:', result);
    
    if (!result.rows || result.rows.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #666;">No hay asistencias registradas</p>';
        return;
    }

    listEl.innerHTML = '';
    result.rows.forEach(asistencia => {
        const item = document.createElement('div');
        item.className = 'asistencia-item';
        const time = new Date(asistencia.timestamp).toLocaleString('es-BO', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        item.innerHTML = `
            <div style="width: 100%;">
                <strong style="font-size: 16px; color: #333;">${asistencia.nombre} ${asistencia.apellido_paterno} ${asistencia.apellido_materno || ''}</strong><br>
                <small style="color: #666; font-size: 13px;">
                    📋 ${asistencia.codigo_unico} | 
                    🆔 ${asistencia.dni || 'Sin DNI'} | 
                    🎓 ${asistencia.especialidad || 'Sin especialidad'} | 
                    📅 Año ${asistencia.anio || 'N/A'}
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
        .select('*');

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color: white;">No hay estudiantes. Crea una especialidad para comenzar.</p>';
        return;
    }

    // Ordenar en JavaScript
    data.sort((a, b) => {
        if (a.especialidad !== b.especialidad) {
            return a.especialidad.localeCompare(b.especialidad);
        }
        if (a.anio !== b.anio) {
            return a.anio - b.anio;
        }
        return a.codigo_unico.localeCompare(b.codigo_unico);
    });

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
                        <strong>${est.nombre} ${est.apellido_paterno} ${est.apellido_materno || ''}</strong><br>
                        <small>📋 ${est.codigo_unico} | 🆔 ${est.dni || 'Sin DNI'} | 📱 ${est.celular || 'Sin celular'}</small>
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
    const dni = document.getElementById('est-dni').value;
    const nombre = document.getElementById('est-nombre').value;
    const apellidoPaterno = document.getElementById('est-apellido-paterno').value;
    const apellidoMaterno = document.getElementById('est-apellido-materno').value;
    const celular = document.getElementById('est-celular').value;
    const email = document.getElementById('est-email').value;

    if (!codigo || !dni || !nombre || !apellidoPaterno || !apellidoMaterno) {
        alert('Completa todos los campos obligatorios');
        return;
    }

    const { error } = await supabase.from('estudiantes').insert({
        codigo_unico: codigo,
        dni: dni,
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        celular: celular || null,
        email: email || null,
        especialidad: currentEspecialidad,
        anio: currentAnio
    });

    if (error) {
        alert('Error: ' + error.message);
        return;
    }

    document.getElementById('est-codigo').value = '';
    document.getElementById('est-dni').value = '';
    document.getElementById('est-nombre').value = '';
    document.getElementById('est-apellido-paterno').value = '';
    document.getElementById('est-apellido-materno').value = '';
    document.getElementById('est-celular').value = '';
    document.getElementById('est-email').value = '';

    alert('✓ Estudiante agregado correctamente');
    showListaEstudiantes();
}

async function generarQRsGrupo() {
    generarQRsGrupoDirecto(currentEspecialidad, currentAnio);
}

async function generarQRsGrupoDirecto(especialidad, anio) {
    console.log('Generando QRs para:', especialidad, anio);
    currentEspecialidad = especialidad;
    currentAnio = anio;
    
    hideAllSections();
    document.getElementById('generar-qr-section').classList.add('active');
    
    const container = document.getElementById('qr-container');
    container.innerHTML = '<p style="color: white;">Generando QRs...</p>';
    qrCodesGenerated = [];

    const { data, error } = await supabase.from('estudiantes').select('*');
    
    if (error) {
        console.error('Error cargando estudiantes:', error);
        container.innerHTML = '<p style="color: white;">Error cargando estudiantes</p>';
        return;
    }

    // Filtrar por especialidad y año en JavaScript
    const estudiantesFiltrados = (data || []).filter(est => 
        est.especialidad === especialidad && est.anio == anio
    );
    
    // Ordenar por codigo_unico
    estudiantesFiltrados.sort((a, b) => a.codigo_unico.localeCompare(b.codigo_unico));

    if (estudiantesFiltrados.length === 0) {
        container.innerHTML = '<p style="color: white;">No hay estudiantes</p>';
        return;
    }

    container.innerHTML = '';
    
    estudiantesFiltrados.forEach((est, index) => {
        const qrItem = document.createElement('div');
        qrItem.className = 'qr-item';
        const nombreCompleto = `${est.nombre} ${est.apellido_paterno} ${est.apellido_materno || ''}`;
        qrItem.innerHTML = `
            <h3>${nombreCompleto}</h3>
            <p><strong>${est.codigo_unico}</strong></p>
            <div class="qr-code" id="qr-${index}"></div>
            <button class="download-btn" onclick="downloadSingleQR('qr-${index}', '${est.codigo_unico}')">📥 Descargar</button>
        `;
        container.appendChild(qrItem);

        setTimeout(() => {
            console.log('Generando QR para elemento:', `qr-${index}`);
            const qrElement = document.getElementById(`qr-${index}`);
            if (qrElement && typeof QRCode !== 'undefined') {
                new QRCode(qrElement, {
                text: est.codigo_unico,
                width: 180,
                height: 180
            });
        } else {
            console.error('No se encontró el elemento QR o la librería QRCode');
        }
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
