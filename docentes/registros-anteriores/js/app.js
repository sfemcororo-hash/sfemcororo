// ========== REGISTROS ANTERIORES - LÓGICA ==========

let currentUser = null;
let fechaBuscada = '';

window.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { window.location.href = '../../index.html'; return; }
    currentUser = user;
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = user.nombre);
    document.querySelectorAll('.dropdown-rol').forEach(el => el.textContent = user.rol.toUpperCase());
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('input-fecha').value = hoy;
    document.getElementById('input-fecha').max = hoy;
    await tursodb.initializeData();
});

// ========== DROPDOWN ==========
function toggleUserDropdown(id) {
    const d = document.getElementById(id);
    if (d) d.classList.toggle('active');
}
document.addEventListener('click', function(e) {
    const d = document.getElementById('user-dropdown-ra');
    if (d && !d.contains(e.target)) d.classList.remove('active');
});
function cerrarSesion() {
    localStorage.removeItem('currentUser');
    window.location.href = '../../index.html';
}
function volverDocentes() {
    window.location.href = '../index.html';
}

// ========== BUSCAR REGISTROS ==========
async function buscarRegistros() {
    const fecha = document.getElementById('input-fecha').value;
    if (!fecha) { alert('Selecciona una fecha'); return; }
    fechaBuscada = fecha;

    document.getElementById('registros-dia').style.display = 'none';
    document.getElementById('sin-resultados').style.display = 'none';
    document.getElementById('detalle-registro').style.display = 'none';

    // Traer todos los registros agrupados por especialidad+anio+hora (cada llamada de lista es única)
    const result = await tursodb.query(`
        SELECT especialidad, anio_formacion, hora_registro,
            SUM(CASE WHEN estado = 'PRESENTE' THEN 1 ELSE 0 END) as presentes,
            SUM(CASE WHEN estado = 'AUSENTE'  THEN 1 ELSE 0 END) as ausentes,
            SUM(CASE WHEN estado = 'RETRASO'  THEN 1 ELSE 0 END) as retrasos,
            SUM(CASE WHEN estado = 'LICENCIA' THEN 1 ELSE 0 END) as licencias,
            COUNT(*) as total
        FROM asistencia_estudiantes
        WHERE docente_id = ? AND fecha = ?
        GROUP BY especialidad, anio_formacion, hora_registro
        ORDER BY hora_registro DESC
    `, [currentUser.id, fecha]);

    if (!result.rows || result.rows.length === 0) {
        document.getElementById('sin-resultados').style.display = 'block';
        return;
    }

    const [anio, mes, dia] = fecha.split('-');
    document.getElementById('titulo-fecha').textContent = `📅 Registros del ${dia}/${mes}/${anio}`;

    const container = document.getElementById('lista-registros');
    container.innerHTML = '';

    result.rows.forEach(r => {
        const div = document.createElement('div');
        div.className = 'registro-card';
        div.innerHTML = `
            <div class="registro-card-header">
                <div>
                    <strong>🎓 ${r.especialidad} - Año ${r.anio_formacion}</strong>
                    <small>🕒 Registrado a las ${r.hora_registro}</small>
                </div>
                <div class="mini-contadores">
                    <span class="mini-cnt presente">✅ ${r.presentes}</span>
                    <span class="mini-cnt retraso">⏰ ${r.retrasos}</span>
                    <span class="mini-cnt licencia">📋 ${r.licencias}</span>
                    <span class="mini-cnt ausente">❌ ${r.ausentes}</span>
                    <span class="mini-cnt total">👥 ${r.total}</span>
                </div>
            </div>
            <div class="lista-inline" id="lista-${r.especialidad.replace(/\s/g,'-')}-${r.anio_formacion}-${r.hora_registro.replace(':','')}"></div>
            <button class="btn-toggle-lista" onclick="toggleDetalle(this, '${r.especialidad}', '${r.anio_formacion}', '${r.hora_registro}', '${fecha}')">
                Ver lista ▼
            </button>
        `;
        container.appendChild(div);
    });

    document.getElementById('registros-dia').style.display = 'block';
}

// ========== TOGGLE DETALLE INLINE ==========
async function toggleDetalle(btn, especialidad, anio, hora, fecha) {
    const listId = `lista-${especialidad.replace(/\s/g,'-')}-${anio}-${hora.replace(':','')}`;
    const container = document.getElementById(listId);

    if (container.style.display === 'block') {
        container.style.display = 'none';
        btn.textContent = 'Ver lista ▼';
        return;
    }

    btn.textContent = 'Cargando...';

    const result = await tursodb.query(`
        SELECT ae.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_unico
        FROM asistencia_estudiantes ae
        JOIN estudiantes e ON ae.estudiante_id = e.id
        WHERE ae.especialidad = ? AND ae.anio_formacion = ? AND ae.hora_registro = ? AND ae.fecha = ? AND ae.docente_id = ?
        ORDER BY e.apellido_paterno, e.nombre
    `, [especialidad, anio, hora, fecha, currentUser.id]);

    if (!result.rows || result.rows.length === 0) {
        container.innerHTML = '<p style="padding:10px; color:#666;">Sin datos</p>';
    } else {
        renderListaInline(container, result.rows, especialidad, anio, hora, fecha);
        actualizarContadoresCard(result.rows, especialidad, anio, hora);
    }

    container.style.display = 'block';
    btn.textContent = 'Ocultar lista ▲';
}

function renderListaInline(container, registros, especialidad, anio, hora, fecha) {
    container.innerHTML = '';
    registros.forEach(reg => {
        const div = document.createElement('div');
        div.className = `est-row-inline ${reg.estado !== 'PRESENTE' ? 'ausente' : ''}`;
        div.id = `reg-${reg.id}`;

        const apellidoM = reg.apellido_materno !== 'SIN DATO' ? reg.apellido_materno : '';
        const nombre = `${reg.apellido_paterno} ${apellidoM} ${reg.nombre}`.trim();
        const horaAct = reg.hora_actualizacion ? ` · ✏️ ${reg.fecha_actualizacion} ${reg.hora_actualizacion}` : '';

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
                    <small>${reg.codigo_unico}${horaAct}</small>
                </div>
                <div class="estados-update">
                    <button onclick="actualizarEstado('${reg.id}', 'AUSENTE', '${especialidad}', '${anio}', '${hora}', '${fecha}')"
                        class="btn-estado ${reg.estado === 'AUSENTE' ? 'activo ausente-btn' : ''}">❌ Ausente</button>
                    <button onclick="actualizarEstado('${reg.id}', 'RETRASO', '${especialidad}', '${anio}', '${hora}', '${fecha}')"
                        class="btn-estado ${reg.estado === 'RETRASO' ? 'activo retraso-btn' : ''}">⏰ Retraso</button>
                    <button onclick="actualizarEstado('${reg.id}', 'LICENCIA', '${especialidad}', '${anio}', '${hora}', '${fecha}')"
                        class="btn-estado ${reg.estado === 'LICENCIA' ? 'activo licencia-btn' : ''}">📋 Licencia</button>
                </div>
            `;
        }
        container.appendChild(div);
    });
}

async function actualizarEstado(registroId, nuevoEstado, especialidad, anio, hora, fecha) {
    const ahora = new Date();
    const horaAct = ahora.toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit', hour12:false});
    const fechaAct = ahora.toISOString().split('T')[0];

    await tursodb.query(`
        UPDATE asistencia_estudiantes
        SET estado = ?, hora_actualizacion = ?, fecha_actualizacion = ?
        WHERE id = ?
    `, [nuevoEstado, horaAct, fechaAct, registroId]);

    // Recargar solo esa lista inline
    const listId = `lista-${especialidad.replace(/\s/g,'-')}-${anio}-${hora.replace(':','')}`;
    const container = document.getElementById(listId);

    const result = await tursodb.query(`
        SELECT ae.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_unico
        FROM asistencia_estudiantes ae
        JOIN estudiantes e ON ae.estudiante_id = e.id
        WHERE ae.especialidad = ? AND ae.anio_formacion = ? AND ae.hora_registro = ? AND ae.fecha = ? AND ae.docente_id = ?
        ORDER BY e.apellido_paterno, e.nombre
    `, [especialidad, anio, hora, fecha, currentUser.id]);

    renderListaInline(container, result.rows, especialidad, anio, hora, fecha);
    actualizarContadoresCard(result.rows, especialidad, anio, hora);
}

function actualizarContadoresCard(registros, especialidad, anio, hora) {
    // Actualizar mini contadores de la tarjeta
    buscarRegistros();
}
