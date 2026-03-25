// ========== REGISTROS ANTERIORES ==========

let currentUser = null;
let fechaBuscada = '';
let registroActual = { especialidad: '', anio: '', hora: '', fecha: '' };

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

// ========== VISTA 1: BUSCAR ==========
async function buscarRegistros() {
    const fecha = document.getElementById('input-fecha').value;
    if (!fecha) { alert('Selecciona una fecha'); return; }
    fechaBuscada = fecha;

    document.getElementById('registros-dia').style.display = 'none';
    document.getElementById('sin-resultados').style.display = 'none';

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
    `, [String(currentUser.id), fecha]);

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
            <div class="registro-card-info">
                <div>
                    <strong>🎓 ${r.especialidad} - Año ${r.anio_formacion}</strong>
                    <small>🕒 Registrado a las ${r.hora_registro}</small>
                    <div class="mini-contadores">
                        <span class="mini-cnt presente">P ${r.presentes}</span>
                        <span class="mini-cnt retraso">R ${r.retrasos}</span>
                        <span class="mini-cnt licencia">L ${r.licencias}</span>
                        <span class="mini-cnt ausente">A ${r.ausentes}</span>
                        <span class="mini-cnt total">T ${r.total}</span>
                    </div>
                </div>
                <div class="registro-card-btns">
                    <button onclick="verDetalle('${r.especialidad}', '${r.anio_formacion}', '${r.hora_registro}', '${fecha}', 'ver')" class="btn-ver">👁 Ver</button>
                    <button onclick="verDetalle('${r.especialidad}', '${r.anio_formacion}', '${r.hora_registro}', '${fecha}', 'actualizar')" class="btn-actualizar">✏️ Actualizar</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('registros-dia').style.display = 'block';
}

// ========== VISTA 2: DETALLE ==========
async function verDetalle(especialidad, anio, hora, fecha, modo) {
    registroActual = { especialidad, anio, hora, fecha, modo };

    const result = await tursodb.query(`
        SELECT ae.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_unico
        FROM asistencia_estudiantes ae
        JOIN estudiantes e ON ae.estudiante_id = e.id
        WHERE ae.especialidad = ? AND ae.anio_formacion = ? AND ae.hora_registro = ? AND ae.fecha = ? AND ae.docente_id = ?
        ORDER BY e.apellido_paterno, e.nombre
    `, [especialidad, anio, hora, fecha, String(currentUser.id)]);

    if (!result.rows || result.rows.length === 0) return;

    // Cambiar vista
    document.getElementById('vista-buscar').style.display = 'none';
    document.getElementById('vista-detalle').style.display = 'block';

    // Cambiar botón volver del header
    document.getElementById('btn-volver').onclick = volverABuscar;

    const [anioF, mes, dia] = fecha.split('-');
    document.getElementById('det-titulo').textContent = `${especialidad} - Año ${anio}`;
    document.getElementById('det-info').textContent = `📅 ${dia}/${mes}/${anioF} | 🕒 ${hora} | ${modo === 'actualizar' ? '✏️ Modo actualización' : '👁 Solo lectura'}`;

    renderDetalle(result.rows, modo);
    actualizarContadores(result.rows);
}

function renderDetalle(registros, modo) {
    const container = document.getElementById('lista-detalle');
    container.innerHTML = '';

    registros.forEach(reg => {
        const div = document.createElement('div');
        const esAusente = reg.estado !== 'PRESENTE';
        div.className = `estudiante-row ${esAusente ? 'ausente' : ''}`;
        div.id = `det-${reg.id}`;

        const apellidoM = reg.apellido_materno !== 'SIN DATO' ? reg.apellido_materno : '';
        const nombre = `${reg.apellido_paterno} ${apellidoM} ${reg.nombre}`.trim();
        const horaAct = reg.hora_actualizacion ? ` · ✏️ ${reg.fecha_actualizacion} ${reg.hora_actualizacion}` : '';

        const badgeMap = {
            'PRESENTE': '<span class="estado-badge presente">P Presente</span>',
            'AUSENTE':  '<span class="estado-badge ausente">A Ausente</span>',
            'RETRASO':  '<span class="estado-badge retraso">R Retraso</span>',
            'LICENCIA': '<span class="estado-badge licencia">L Licencia</span>'
        };

        // En modo ver: solo badge. En modo actualizar: botones solo para no-presentes
        let accion = badgeMap[reg.estado] || badgeMap['AUSENTE'];
        if (modo === 'actualizar' && reg.estado !== 'PRESENTE') {
            accion = `
                <div class="estados-update">
                    <button onclick="actualizarEstado('${reg.id}', 'AUSENTE')"
                        class="btn-estado ${reg.estado === 'AUSENTE' ? 'activo ausente-btn' : ''}">A Ausente</button>
                    <button onclick="actualizarEstado('${reg.id}', 'RETRASO')"
                        class="btn-estado ${reg.estado === 'RETRASO' ? 'activo retraso-btn' : ''}">R Retraso</button>
                    <button onclick="actualizarEstado('${reg.id}', 'LICENCIA')"
                        class="btn-estado ${reg.estado === 'LICENCIA' ? 'activo licencia-btn' : ''}">L Licencia</button>
                </div>`;
        }

        div.innerHTML = `
            <div class="est-info">
                <strong>${nombre}</strong>
                <small>${reg.codigo_unico}${horaAct}</small>
            </div>
            ${accion}
        `;
        container.appendChild(div);
    });
}

async function actualizarEstado(registroId, nuevoEstado) {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit', hour12:false});
    const fecha = ahora.toISOString().split('T')[0];

    await tursodb.query(`
        UPDATE asistencia_estudiantes
        SET estado = ?, hora_actualizacion = ?, fecha_actualizacion = ?
        WHERE id = ?
    `, [nuevoEstado, hora, fecha, registroId]);

    // Recargar solo la vista de detalle
    await verDetalle(
        registroActual.especialidad,
        registroActual.anio,
        registroActual.hora,
        registroActual.fecha,
        registroActual.modo
    );
}

function actualizarContadores(registros) {
    document.getElementById('det-cnt-presente').textContent = registros.filter(r => r.estado === 'PRESENTE').length;
    document.getElementById('det-cnt-retraso').textContent  = registros.filter(r => r.estado === 'RETRASO').length;
    document.getElementById('det-cnt-licencia').textContent = registros.filter(r => r.estado === 'LICENCIA').length;
    document.getElementById('det-cnt-ausente').textContent  = registros.filter(r => r.estado === 'AUSENTE').length;
}

function volverABuscar() {
    document.getElementById('vista-detalle').style.display = 'none';
    document.getElementById('vista-buscar').style.display = 'block';
    document.getElementById('btn-volver').onclick = volverDocentes;
}
