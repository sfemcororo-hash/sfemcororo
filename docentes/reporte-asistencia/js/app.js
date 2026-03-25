// ========== REPORTE DE ASISTENCIA ==========

let currentUser = null;

window.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { window.location.href = '../../index.html'; return; }
    currentUser = user;
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = user.nombre);
    document.querySelectorAll('.dropdown-rol').forEach(el => el.textContent = user.rol.toUpperCase());
    await tursodb.initializeData();
    await cargarEspecialidades();
});

// ========== DROPDOWN ==========
function toggleUserDropdown(id) {
    const d = document.getElementById(id);
    if (d) d.classList.toggle('active');
}
document.addEventListener('click', function(e) {
    const d = document.getElementById('user-dropdown-rep');
    if (d && !d.contains(e.target)) d.classList.remove('active');
});
function cerrarSesion() {
    localStorage.removeItem('currentUser');
    window.location.href = '../../index.html';
}
function volverDocentes() {
    window.location.href = '../index.html';
}

// ========== SELECCIÓN ==========
async function cargarEspecialidades() {
    const result = await tursodb.query(`SELECT DISTINCT especialidad FROM estudiantes ORDER BY especialidad`);
    const sel = document.getElementById('sel-especialidad');
    sel.innerHTML = '<option value="">-- Selecciona --</option>';
    (result.rows || []).forEach(r => {
        sel.innerHTML += `<option value="${r.especialidad}">${r.especialidad}</option>`;
    });
}

async function cargarAnios() {
    const especialidad = document.getElementById('sel-especialidad').value;
    const grupoAnio = document.getElementById('grupo-anio');
    const btnGenerar = document.getElementById('btn-generar');
    const selAnio = document.getElementById('sel-anio');

    if (!especialidad) {
        grupoAnio.style.display = 'none';
        btnGenerar.style.display = 'none';
        return;
    }

    const result = await tursodb.query(
        `SELECT DISTINCT anio_formacion FROM estudiantes WHERE especialidad = ? ORDER BY anio_formacion`,
        [especialidad]
    );
    const orden = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO'];
    const anios = (result.rows || []).sort((a,b) => orden.indexOf(a.anio_formacion) - orden.indexOf(b.anio_formacion));

    selAnio.innerHTML = '<option value="">-- Selecciona --</option>';
    anios.forEach(r => {
        selAnio.innerHTML += `<option value="${r.anio_formacion}">${r.anio_formacion}</option>`;
    });

    grupoAnio.style.display = 'block';
    selAnio.onchange = () => {
        btnGenerar.style.display = selAnio.value ? 'block' : 'none';
        document.getElementById('reporte-container').style.display = 'none';
    };
}

// ========== GENERAR REPORTE ==========
async function generarReporte() {
    const especialidad = document.getElementById('sel-especialidad').value;
    const anio = document.getElementById('sel-anio').value;
    if (!especialidad || !anio) return;

    // 1. Obtener todos los estudiantes del grupo
    const estResult = await tursodb.query(
        `SELECT id, nombre, apellido_paterno, apellido_materno, codigo_unico
         FROM estudiantes WHERE especialidad = ? AND anio_formacion = ?
         ORDER BY apellido_paterno, nombre`,
        [especialidad, anio]
    );
    if (!estResult.rows || estResult.rows.length === 0) {
        alert('No hay estudiantes en este grupo'); return;
    }

    // 2. Obtener todas las fechas únicas con registros (cada fecha+hora = una clase)
    const clasesResult = await tursodb.query(
        `SELECT DISTINCT fecha, hora_registro
         FROM asistencia_estudiantes
         WHERE especialidad = ? AND anio_formacion = ?
         ORDER BY fecha ASC, hora_registro ASC`,
        [especialidad, anio]
    );
    const clases = clasesResult.rows || [];

    if (clases.length === 0) {
        alert('No hay registros de asistencia para este grupo'); return;
    }

    // 3. Obtener todos los registros de asistencia del grupo
    const asistResult = await tursodb.query(
        `SELECT estudiante_id, fecha, hora_registro, estado
         FROM asistencia_estudiantes
         WHERE especialidad = ? AND anio_formacion = ?`,
        [especialidad, anio]
    );
    const registros = asistResult.rows || [];

    // Crear mapa: { estudiante_id: { 'fecha_hora': estado } }
    const mapaAsist = {};
    registros.forEach(r => {
        if (!mapaAsist[r.estudiante_id]) mapaAsist[r.estudiante_id] = {};
        mapaAsist[r.estudiante_id][`${r.fecha}_${r.hora_registro}`] = r.estado;
    });

    // 4. Agrupar clases por mes
    const meses = {};
    clases.forEach(c => {
        const [anioF, mes] = c.fecha.split('-');
        const key = `${anioF}-${mes}`;
        if (!meses[key]) meses[key] = [];
        meses[key].push(c);
    });

    // 5. Llenar encabezado del reporte
    const ahora = new Date();
    const fechaReporte = ahora.toLocaleDateString('es-BO', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
    document.getElementById('rep-especialidad').textContent = especialidad;
    document.getElementById('rep-anio').textContent = anio;
    document.getElementById('rep-usuario').textContent = currentUser.nombre;
    document.getElementById('rep-fecha').textContent = fechaReporte;
    document.getElementById('rep-total-clases').textContent = clases.length;

    // 6. Construir cabecera de tabla
    const thead = document.getElementById('tabla-head');
    const tbody = document.getElementById('tabla-body');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const mesesNombres = {
        '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril',
        '05':'Mayo','06':'Junio','07':'Julio','08':'Agosto',
        '09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'
    };

    // Fila 1: meses (colspan por cantidad de clases en ese mes)
    let fila1 = `<tr><th rowspan="2" class="th-nro">Nro</th><th rowspan="2" class="th-nombre">Nombre Completo</th>`;
    Object.keys(meses).forEach(mesKey => {
        const [, mes] = mesKey.split('-');
        fila1 += `<th colspan="${meses[mesKey].length}" class="th-mes">${mesesNombres[mes]}</th>`;
    });
    fila1 += `<th rowspan="2" class="th-total">Total<br>Asist.</th><th rowspan="2" class="th-pct">%</th></tr>`;

    // Fila 2: fechas (día/mes)
    let fila2 = `<tr>`;
    clases.forEach(c => {
        const [, mes, dia] = c.fecha.split('-');
        fila2 += `<th class="th-fecha">${dia}/${mes}</th>`;
    });
    fila2 += `</tr>`;

    thead.innerHTML = fila1 + fila2;

    // 7. Construir filas de estudiantes
    estResult.rows.forEach((est, idx) => {
        const apellidoM = est.apellido_materno !== 'SIN DATO' ? est.apellido_materno : '';
        const nombre = `${est.apellido_paterno} ${apellidoM} ${est.nombre}`.trim();
        let asistencias = 0;
        let celdas = '';

        clases.forEach(c => {
            const key = `${c.fecha}_${c.hora_registro}`;
            const estado = mapaAsist[est.id]?.[key] || null;
            if (estado === 'PRESENTE') {
                asistencias++;
                celdas += `<td class="est-presente">P</td>`;
            } else if (estado === 'RETRASO') {
                asistencias++;
                celdas += `<td class="est-retraso">R</td>`;
            } else if (estado === 'LICENCIA') {
                asistencias++;
                celdas += `<td class="est-licencia">L</td>`;
            } else if (estado === 'AUSENTE') {
                celdas += `<td class="est-ausente">A</td>`;
            } else {
                celdas += `<td class="est-sin">-</td>`;
            }
        });

        const porcentaje = clases.length > 0 ? Math.round((asistencias / clases.length) * 100) : 0;
        const pctClass = porcentaje >= 80 ? 'pct-bueno' : porcentaje >= 60 ? 'pct-regular' : 'pct-malo';

        tbody.innerHTML += `
            <tr>
                <td class="td-nro">${idx + 1}</td>
                <td class="td-nombre">${nombre}</td>
                ${celdas}
                <td class="td-total">${asistencias}/${clases.length}</td>
                <td class="td-pct ${pctClass}">${porcentaje}%</td>
            </tr>
        `;
    });

    document.getElementById('reporte-container').style.display = 'block';
    document.getElementById('reporte-container').scrollIntoView({behavior:'smooth'});
}
