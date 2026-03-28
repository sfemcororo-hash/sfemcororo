// ========== HORARIOS ==========

let currentUser = null;

window.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { window.location.href = '../../../index.html'; return; }
    currentUser = user;
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = user.nombre);
    document.querySelectorAll('.dropdown-rol').forEach(el => el.textContent = user.rol.toUpperCase());
    await tursodb.initializeData();
    await cargarEspecialidades('hor-especialidad');
    await cargarEspecialidades('ver-especialidad');

    // Mascara formato 24h para campos de hora
    ['hor-inicio', 'hor-fin'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', function() {
            let v = this.value.replace(/[^0-9]/g, '');
            if (v.length >= 3) v = v.substring(0,2) + ':' + v.substring(2,4);
            this.value = v;
        });
        input.addEventListener('blur', function() {
            const match = this.value.match(/^(\d{1,2}):(\d{2})$/);
            if (match) {
                let h = Math.min(23, parseInt(match[1]));
                let m = Math.min(59, parseInt(match[2]));
                this.value = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
            } else {
                this.value = '';
            }
        });
    });
});

// ========== DROPDOWN ==========
function toggleUserDropdown(id) {
    const d = document.getElementById(id);
    if (d) d.classList.toggle('active');
}
document.addEventListener('click', function(e) {
    const d = document.getElementById('user-dropdown-hor');
    if (d && !d.contains(e.target)) d.classList.remove('active');
});
function cerrarSesion() {
    localStorage.removeItem('currentUser');
    window.location.href = '../../../index.html';
}
function volverConfiguracion() {
    window.location.href = '../index.html';
}

// ========== NAVEGACIÓN ==========
function mostrarVista(id) {
    document.querySelectorAll('.container > div').forEach(el => el.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.getElementById('btn-volver').onclick = id === 'vista-menu' ? volverConfiguracion : () => mostrarVista('vista-menu');
    // Limpiar formulario al volver al menu o al mostrar agregar
    if (id === 'vista-menu' || id === 'vista-agregar') {
        limpiarFormulario();
    }
}

function limpiarFormulario() {
    ['hor-especialidad','hor-anio','hor-materia','hor-dia','hor-inicio','hor-fin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('hor-grupo-anio').style.display = 'none';
    document.getElementById('hor-form-detalle').style.display = 'none';
    document.getElementById('hor-lista-container').style.display = 'none';
}

// ========== HELPERS ==========
async function cargarEspecialidades(selId) {
    const result = await tursodb.query(`SELECT DISTINCT especialidad FROM estudiantes ORDER BY especialidad`);
    const sel = document.getElementById(selId);
    sel.innerHTML = '<option value="">-- Selecciona --</option>';
    (result.rows || []).forEach(r => sel.innerHTML += `<option value="${r.especialidad}">${r.especialidad}</option>`);
}

async function cargarAnios(selEspId, selAnioId, grupoId, callback) {
    const especialidad = document.getElementById(selEspId).value;
    const grupoAnio = document.getElementById(grupoId);
    if (!especialidad) { grupoAnio.style.display = 'none'; return; }

    const result = await tursodb.query(
        `SELECT DISTINCT anio_formacion FROM estudiantes WHERE especialidad = ? ORDER BY anio_formacion`,
        [especialidad]
    );
    const orden = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO'];
    const anios = (result.rows || []).sort((a,b) => orden.indexOf(a.anio_formacion) - orden.indexOf(b.anio_formacion));

    const sel = document.getElementById(selAnioId);
    sel.innerHTML = '<option value="">-- Selecciona --</option>';
    anios.forEach(r => sel.innerHTML += `<option value="${r.anio_formacion}">${r.anio_formacion}</option>`);
    grupoAnio.style.display = 'block';
    sel.onchange = callback;
}

// ========== AGREGAR HORARIO ==========
async function cargarAniosHorario() {
    await cargarAnios('hor-especialidad', 'hor-anio', 'hor-grupo-anio', cargarMateriasHorario);
    document.getElementById('hor-form-detalle').style.display = 'none';
    document.getElementById('hor-lista-container').style.display = 'none';
}

async function cargarMateriasHorario() {
    const especialidad = document.getElementById('hor-especialidad').value;
    const anio = document.getElementById('hor-anio').value;
    if (!anio) { document.getElementById('hor-form-detalle').style.display = 'none'; return; }

    const result = await tursodb.query(
        `SELECT nombre FROM materias WHERE especialidad = ? AND anio_formacion = ? ORDER BY nombre`,
        [especialidad, anio]
    );
    const sel = document.getElementById('hor-materia');
    sel.innerHTML = '<option value="">-- Selecciona --</option>';
    (result.rows || []).forEach(m => sel.innerHTML += `<option value="${m.nombre}">${m.nombre}</option>`);

    document.getElementById('hor-form-detalle').style.display = 'block';
    await cargarListaHorarios();
}

async function cargarListaHorarios() {
    const especialidad = document.getElementById('hor-especialidad').value;
    const anio = document.getElementById('hor-anio').value;
    if (!especialidad || !anio) return;

    const result = await tursodb.query(
        `SELECT * FROM horarios WHERE especialidad = ? AND anio_formacion = ? ORDER BY dia_semana, hora_inicio`,
        [especialidad, anio]
    );

    const container = document.getElementById('hor-lista-container');
    const lista = document.getElementById('hor-lista');

    if (!result.rows || result.rows.length === 0) {
        container.style.display = 'none';
        return;
    }

    document.getElementById('hor-lista-titulo').textContent = `🕐 Horarios - ${especialidad} · ${anio} (${result.rows.length})`;
    lista.innerHTML = '';
    result.rows.forEach(h => {
        const div = document.createElement('div');
        div.className = 'horario-item';
        div.innerHTML = `
            <div>
                <strong>📖 ${h.materia}</strong>
                <small>${h.dia_semana} | ${h.hora_inicio} - ${h.hora_fin}</small>
            </div>
            <button onclick="eliminarHorario('${h.id}')" class="btn-danger btn-sm">✕</button>
        `;
        lista.appendChild(div);
    });
    container.style.display = 'block';
}

async function agregarHorario() {
    const especialidad = document.getElementById('hor-especialidad').value;
    const anio = document.getElementById('hor-anio').value;
    const materia = document.getElementById('hor-materia').value;
    const dia = document.getElementById('hor-dia').value;
    const inicio = document.getElementById('hor-inicio').value;
    const fin = document.getElementById('hor-fin').value;

    if (!materia || !dia || !inicio || !fin) { alert('Completa todos los campos'); return; }
    if (fin <= inicio) { alert('La hora fin debe ser posterior a la hora inicio'); return; }

    // Verificar duplicado
    const existe = await tursodb.query(
        `SELECT id FROM horarios WHERE especialidad = ? AND anio_formacion = ? AND materia = ? AND dia_semana = ?`,
        [especialidad, anio, materia, dia]
    );
    if (existe.rows && existe.rows.length > 0) {
        alert(`Ya existe un horario para ${materia} el ${dia}`); return;
    }

    const id = Date.now().toString() + Math.random().toString(36).substr(2,4);
    await tursodb.query(
        `INSERT INTO horarios (id, especialidad, anio_formacion, materia, dia_semana, hora_inicio, hora_fin, docente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, especialidad, anio, materia, dia, inicio, fin, String(currentUser.id)]
    );

    // Limpiar campos
    document.getElementById('hor-materia').value = '';
    document.getElementById('hor-dia').value = '';
    document.getElementById('hor-inicio').value = '';
    document.getElementById('hor-fin').value = '';

    await cargarListaHorarios();
}

async function eliminarHorario(id) {
    if (!confirm('¿Eliminar este horario?')) return;
    await tursodb.query(`DELETE FROM horarios WHERE id = ?`, [id]);
    await cargarListaHorarios();
}

// ========== VER HORARIOS ==========
async function cargarAniosVer() {
    await cargarAnios('ver-especialidad', 'ver-anio', 'ver-grupo-anio', verHorarios);
    document.getElementById('ver-grilla').style.display = 'none';
}

async function verHorarios() {
    const especialidad = document.getElementById('ver-especialidad').value;
    const anio = document.getElementById('ver-anio').value;
    if (!anio) { document.getElementById('ver-grilla').style.display = 'none'; return; }

    const result = await tursodb.query(
        `SELECT * FROM horarios WHERE especialidad = ? AND anio_formacion = ? ORDER BY hora_inicio`,
        [especialidad, anio]
    );

    const grilla = document.getElementById('ver-grilla');

    if (!result.rows || result.rows.length === 0) {
        grilla.innerHTML = '<div class="card"><p style="text-align:center;color:#666;">No hay horarios registrados para este grupo</p></div>';
        grilla.style.display = 'block';
        return;
    }

    const dias = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
    const porDia = {};
    dias.forEach(d => porDia[d] = []);
    result.rows.forEach(h => {
        if (porDia[h.dia_semana]) porDia[h.dia_semana].push(h);
    });

    let html = `<h3 style="color:white; margin-bottom:12px;">📋 ${especialidad} - ${anio}</h3>`;
    html += '<div class="grilla-wrapper"><table class="grilla-tabla"><thead><tr>';
    dias.forEach(d => {
        const tiene = porDia[d].length > 0;
        html += `<th class="${tiene ? 'dia-activo' : 'dia-vacio'}">${d}</th>`;
    });
    html += '</tr></thead><tbody><tr>';

    dias.forEach(d => {
        html += '<td class="grilla-col">';
        if (porDia[d].length === 0) {
            html += '<span class="sin-clase">—</span>';
        } else {
            porDia[d].sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio)).forEach(h => {
                html += `
                    <div class="clase-bloque">
                        <span class="clase-materia">${h.materia}</span>
                        <span class="clase-hora">${h.hora_inicio} - ${h.hora_fin}</span>
                    </div>`;
            });
        }
        html += '</td>';
    });
    html += '</tr></tbody></table></div>';

    grilla.innerHTML = html;
    grilla.style.display = 'block';
}
