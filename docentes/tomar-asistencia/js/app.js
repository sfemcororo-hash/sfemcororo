// ========== TOMAR ASISTENCIA - LÓGICA ==========

let currentUser = null;
let estadosEstudiantes = {}; // { estudiante_id: 'PRESENTE'|'AUSENTE' }

window.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { window.location.href = '../../index.html'; return; }
    currentUser = user;
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = user.nombre);
    document.querySelectorAll('.dropdown-rol').forEach(el => el.textContent = user.rol.toUpperCase());
    await tursodb.initializeData();
    await cargarEspecialidades();
    await verificarRegistroHoy();
});

// ========== DROPDOWN ==========
function toggleUserDropdown(id) {
    const d = document.getElementById(id);
    if (d) d.classList.toggle('active');
}
document.addEventListener('click', function(e) {
    const d = document.getElementById('user-dropdown-ta');
    if (d && !d.contains(e.target)) d.classList.remove('active');
});
function cerrarSesion() {
    localStorage.removeItem('currentUser');
    window.location.href = '../../index.html';
}
function volverDocentes() {
    sessionStorage.setItem('fromModule', '1');
    window.location.href = '../index.html';
}

// ========== PASO 1: SELECCIÓN ==========
async function cargarEspecialidades() {
    const result = await tursodb.query(`SELECT DISTINCT especialidad FROM estudiantes ORDER BY especialidad`);
    const sel = document.getElementById('sel-especialidad');
    sel.innerHTML = '<option value="">-- Selecciona especialidad --</option>';
    (result.rows || []).forEach(row => {
        sel.innerHTML += `<option value="${row.especialidad}">${row.especialidad}</option>`;
    });
}

async function cargarAnios() {
    const especialidad = document.getElementById('sel-especialidad').value;
    const grupoAnio = document.getElementById('grupo-anio');
    const btnCargar = document.getElementById('btn-cargar');
    const selAnio = document.getElementById('sel-anio');

    if (!especialidad) {
        grupoAnio.style.display = 'none';
        btnCargar.style.display = 'none';
        return;
    }

    const result = await tursodb.query(
        `SELECT DISTINCT anio_formacion FROM estudiantes WHERE especialidad = ? ORDER BY anio_formacion`,
        [especialidad]
    );

    selAnio.innerHTML = '<option value="">-- Selecciona año --</option>';
    const orden = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO'];
    const anios = (result.rows || []).sort((a,b) => orden.indexOf(a.anio_formacion) - orden.indexOf(b.anio_formacion));
    anios.forEach(row => {
        selAnio.innerHTML += `<option value="${row.anio_formacion}">${row.anio_formacion}</option>`;
    });

    grupoAnio.style.display = 'block';
    selAnio.onchange = () => {
        btnCargar.style.display = selAnio.value ? 'block' : 'none';
    };
}

// ========== PASO 2: LISTA ==========
async function cargarLista() {
    const especialidad = document.getElementById('sel-especialidad').value;
    const anio = document.getElementById('sel-anio').value;
    if (!especialidad || !anio) { alert('Selecciona especialidad y año'); return; }

    const result = await tursodb.query(
        `SELECT * FROM estudiantes WHERE especialidad = ? AND anio_formacion = ? ORDER BY apellido_paterno, nombre`,
        [especialidad, anio]
    );

    if (!result.rows || result.rows.length === 0) {
        alert('No hay estudiantes en este grupo'); return;
    }

    // Inicializar todos como PRESENTE
    estadosEstudiantes = {};
    result.rows.forEach(est => { estadosEstudiantes[est.id] = 'PRESENTE'; });

    // Ocultar registros del día al entrar a tomar lista
    document.querySelectorAll('.registros-hoy').forEach(el => el.style.display = 'none');

    // Mostrar lista
    document.getElementById('paso-seleccion').style.display = 'none';
    document.getElementById('paso-lista').style.display = 'block';

    const ahora = new Date();
    document.getElementById('lista-titulo').textContent = `${especialidad} - ${anio}`;
    document.getElementById('lista-fecha').textContent =
        `📅 ${ahora.toLocaleDateString('es-BO')} | 🕒 ${ahora.toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit'})}`;

    renderLista(result.rows);
    actualizarContadores();
}

function renderLista(estudiantes) {
    const container = document.getElementById('lista-estudiantes');
    container.innerHTML = '';
    estudiantes.forEach(est => {
        const div = document.createElement('div');
        div.className = 'estudiante-row';
        div.id = `row-${est.id}`;
        div.onclick = () => toggleEstado(est.id);
        div.innerHTML = `
            <div class="est-info">
                <strong>${est.apellido_paterno} ${est.apellido_materno !== 'SIN DATO' ? est.apellido_materno : ''} ${est.nombre}</strong>
                <small>${est.codigo_unico}</small>
            </div>
            <span class="estado-badge" id="badge-${est.id}">✅ PRESENTE</span>
        `;
        container.appendChild(div);
    });
}

function toggleEstado(estudianteId) {
    estadosEstudiantes[estudianteId] = estadosEstudiantes[estudianteId] === 'PRESENTE' ? 'AUSENTE' : 'PRESENTE';
    actualizarBadge(estudianteId);
    actualizarContadores();
}

function actualizarBadge(estudianteId) {
    const badge = document.getElementById(`badge-${estudianteId}`);
    const row = document.getElementById(`row-${estudianteId}`);
    const estado = estadosEstudiantes[estudianteId];
    if (estado === 'PRESENTE') {
        badge.textContent = '✅ PRESENTE';
        badge.className = 'estado-badge presente';
        row.className = 'estudiante-row';
    } else {
        badge.textContent = '❌ AUSENTE';
        badge.className = 'estado-badge ausente';
        row.className = 'estudiante-row ausente';
    }
}

function marcarTodos(estado) {
    Object.keys(estadosEstudiantes).forEach(id => {
        estadosEstudiantes[id] = estado;
        actualizarBadge(id);
    });
    actualizarContadores();
}

function actualizarContadores() {
    const presentes = Object.values(estadosEstudiantes).filter(e => e === 'PRESENTE').length;
    const ausentes = Object.values(estadosEstudiantes).filter(e => e === 'AUSENTE').length;
    document.getElementById('cnt-presente').textContent = presentes;
    document.getElementById('cnt-ausente').textContent = ausentes;
}

// ========== GUARDAR ==========
async function guardarAsistencia() {
    const especialidad = document.getElementById('sel-especialidad').value;
    const anio = document.getElementById('sel-anio').value;
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit', hour12:false});

    const total = Object.keys(estadosEstudiantes).length;
    const presentes = Object.values(estadosEstudiantes).filter(e => e === 'PRESENTE').length;

    // Verificar si ya existe un registro de este grupo hoy
    const existe = await tursodb.query(`
        SELECT COUNT(*) as total FROM asistencia_estudiantes
        WHERE docente_id = ? AND especialidad = ? AND anio_formacion = ? AND fecha = ?
    `, [currentUser.id, especialidad, anio, fecha]);

    if (existe.rows && parseInt(existe.rows[0].total) > 0) {
        const confirmar = confirm(`⚠️ Ya existe un registro de asistencia para este grupo hoy.\n\n¿Deseas guardar un nuevo registro de todas formas?`);
        if (!confirmar) return;
    } else {
        const confirmar = confirm(`¿Guardar asistencia?\n\n✅ Presentes: ${presentes}\n❌ Ausentes: ${total - presentes}\n\nGrupo: ${especialidad} - ${anio}`);
        if (!confirmar) return;
    }

    try {
        for (const [estudianteId, estado] of Object.entries(estadosEstudiantes)) {
            const id = Date.now().toString() + Math.random().toString(36).substr(2,5);
            await tursodb.query(`
                INSERT INTO asistencia_estudiantes 
                (id, estudiante_id, docente_id, especialidad, anio_formacion, estado, fecha, hora_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, estudianteId, currentUser.id, especialidad, anio, estado, fecha, hora]);
        }
        alert(`✅ Asistencia guardada correctamente\n${presentes} presentes | ${total - presentes} ausentes`);
        // Volver al paso de selección limpio
        document.getElementById('paso-lista').style.display = 'none';
        document.getElementById('paso-seleccion').style.display = 'block';
        document.getElementById('sel-especialidad').value = '';
        document.getElementById('sel-anio').value = '';
        document.getElementById('grupo-anio').style.display = 'none';
        document.getElementById('btn-cargar').style.display = 'none';
        document.querySelectorAll('.registros-hoy').forEach(el => el.remove());
        await verificarRegistroHoy();
    } catch (error) {
        alert('❌ Error guardando: ' + error.message);
    }
}

// ========== VERIFICAR REGISTRO HOY ==========
async function verificarRegistroHoy() {
    const fecha = new Date().toISOString().split('T')[0];
    const result = await tursodb.query(`
        SELECT DISTINCT especialidad, anio_formacion, hora_registro
        FROM asistencia_estudiantes
        WHERE docente_id = ? AND fecha = ?
        ORDER BY hora_registro DESC
    `, [currentUser.id, fecha]);

    if (result.rows && result.rows.length > 0) {
        // Hay registros hoy - mostrar opción de actualizar
        mostrarRegistrosHoy(result.rows, fecha);
    }
}

function mostrarRegistrosHoy(registros, fecha) {
    const seleccion = document.getElementById('paso-seleccion');
    let html = `<div class="registros-hoy"><h3>📌 Registros de hoy (${fecha})</h3>`;
    registros.forEach(r => {
        html += `
            <div class="registro-item" onclick="cargarActualizacion('${r.especialidad}', '${r.anio_formacion}', '${fecha}')">
                <span>🎓 ${r.especialidad} - ${r.anio_formacion}</span>
                <span class="hora-reg">🕒 ${r.hora_registro} <span class="btn-edit">Actualizar →</span></span>
            </div>`;
    });
    html += '</div>';
    seleccion.insertAdjacentHTML('afterend', html);
}

// ========== PASO 3: ACTUALIZAR ==========
async function cargarActualizacion(especialidad, anio, fecha) {
    const result = await tursodb.query(`
        SELECT ae.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_unico
        FROM asistencia_estudiantes ae
        JOIN estudiantes e ON ae.estudiante_id = e.id
        WHERE ae.especialidad = ? AND ae.anio_formacion = ? AND ae.fecha = ? AND ae.docente_id = ?
        ORDER BY e.apellido_paterno, e.nombre
    `, [especialidad, anio, fecha, currentUser.id]);

    if (!result.rows || result.rows.length === 0) return;

    document.getElementById('paso-seleccion').style.display = 'none';
    document.getElementById('paso-lista').style.display = 'none';
    document.querySelectorAll('.registros-hoy').forEach(el => el.style.display = 'none');
    document.getElementById('paso-actualizar').style.display = 'block';

    document.getElementById('act-titulo').textContent = `${especialidad} - ${anio}`;
    document.getElementById('act-fecha').textContent = `📅 ${fecha} | Actualizando ausentes`;

    renderActualizacion(result.rows);
    actualizarContadoresAct(result.rows);
}

function renderActualizacion(registros) {
    const container = document.getElementById('lista-actualizar');
    container.innerHTML = '';
    registros.forEach(reg => {
        const div = document.createElement('div');
        div.className = `estudiante-row ${reg.estado !== 'PRESENTE' ? 'ausente' : ''}`;
        div.id = `act-row-${reg.id}`;

        const nombre = `${reg.apellido_paterno} ${reg.apellido_materno !== 'SIN DATO' ? reg.apellido_materno : ''} ${reg.nombre}`;

        if (reg.estado === 'PRESENTE') {
            div.innerHTML = `
                <div class="est-info">
                    <strong>${nombre}</strong>
                    <small>${reg.codigo_unico}</small>
                </div>
                <span class="estado-badge presente">✅ PRESENTE</span>
            `;
        } else {
            div.innerHTML = `
                <div class="est-info">
                    <strong>${nombre}</strong>
                    <small>${reg.codigo_unico}</small>
                </div>
                <div class="estados-update">
                    <button onclick="actualizarEstado('${reg.id}', 'AUSENTE')" 
                        class="btn-estado ${reg.estado === 'AUSENTE' ? 'activo ausente-btn' : ''}">❌ Ausente</button>
                    <button onclick="actualizarEstado('${reg.id}', 'RETRASO')" 
                        class="btn-estado ${reg.estado === 'RETRASO' ? 'activo retraso-btn' : ''}">⏰ Retraso</button>
                    <button onclick="actualizarEstado('${reg.id}', 'LICENCIA')" 
                        class="btn-estado ${reg.estado === 'LICENCIA' ? 'activo licencia-btn' : ''}">📋 Licencia</button>
                </div>
            `;
        }
        container.appendChild(div);
    });
}

async function actualizarEstado(registroId, nuevoEstado) {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit', hour12:false});
    const fechaAct = ahora.toISOString().split('T')[0];
    await tursodb.query(`
        UPDATE asistencia_estudiantes 
        SET estado = ?, hora_actualizacion = ?, fecha_actualizacion = ?
        WHERE id = ?
    `, [nuevoEstado, hora, fechaAct, registroId]);

    // Recargar la vista
    const especialidad = document.getElementById('act-titulo').textContent.split(' - ')[0];
    const anio = document.getElementById('act-titulo').textContent.split(' - ')[1];
    const fecha = new Date().toISOString().split('T')[0];
    await cargarActualizacion(especialidad, anio, fecha);
}

function actualizarContadoresAct(registros) {
    document.getElementById('act-cnt-presente').textContent = registros.filter(r => r.estado === 'PRESENTE').length;
    document.getElementById('act-cnt-retraso').textContent = registros.filter(r => r.estado === 'RETRASO').length;
    document.getElementById('act-cnt-licencia').textContent = registros.filter(r => r.estado === 'LICENCIA').length;
    document.getElementById('act-cnt-ausente').textContent = registros.filter(r => r.estado === 'AUSENTE').length;
}

function cancelarLista() {
    document.getElementById('paso-lista').style.display = 'none';
    document.getElementById('paso-seleccion').style.display = 'block';
    document.querySelectorAll('.registros-hoy').forEach(el => el.style.display = 'block');
    estadosEstudiantes = {};
}

function volverSeleccion() {
    document.getElementById('paso-actualizar').style.display = 'none';
    document.getElementById('paso-seleccion').style.display = 'block';
    document.querySelectorAll('.registros-hoy').forEach(el => el.style.display = 'block');
}
