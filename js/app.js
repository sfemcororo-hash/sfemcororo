let html5QrCode = null;
let isScanning = false;
let currentUser = null;
let currentProfile = null;
let currentEventId = null;
let eventoTimer = null;
let currentPage = 1;
const eventsPerPage = 5;
let totalEvents = 0;
let allEvents = [];
let currentEspecialidad = null;
let currentAnio = null;
let qrCodesGenerated = [];
let currentEventoId = null;
let currentEventoNombre = null;

// ========== SISTEMA OFFLINE PARA OPTIMIZAR ANCHO DE BANDA ==========
let offlineQueue = [];
let syncInProgress = false;
let lastSyncTime = 0;
const SYNC_INTERVAL = 30000; // 30 segundos
const MAX_BATCH_SIZE = 10; // Máximo 10 asistencias por lote
let estudiantesCache = []; // Cache local de estudiantes

// Cargar cache de estudiantes desde localStorage
function loadEstudiantesCache() {
    try {
        const saved = localStorage.getItem('estudiantes_cache');
        estudiantesCache = saved ? JSON.parse(saved) : [];
        console.log(`Cache de estudiantes cargado: ${estudiantesCache.length} estudiantes`);
    } catch (error) {
        console.error('Error cargando cache de estudiantes:', error);
        estudiantesCache = [];
    }
}

// Guardar cache de estudiantes en localStorage
function saveEstudiantesCache() {
    try {
        localStorage.setItem('estudiantes_cache', JSON.stringify(estudiantesCache));
        console.log(`Cache de estudiantes guardado: ${estudiantesCache.length} estudiantes`);
    } catch (error) {
        console.error('Error guardando cache de estudiantes:', error);
    }
}

// Actualizar cache de estudiantes
async function updateEstudiantesCache() {
    try {
        const { data, error } = await tursodb.from('estudiantes').select('*');
        if (!error && data) {
            estudiantesCache = data;
            saveEstudiantesCache();
            console.log(`Cache actualizado con ${data.length} estudiantes`);
        }
    } catch (error) {
        console.log('No se pudo actualizar cache de estudiantes (sin conexión)');
    }
}

// Buscar estudiante en cache local
function findEstudianteInCache(codigoUnico) {
    return estudiantesCache.find(est => est.codigo_unico === codigoUnico);
}

// Cargar cola offline desde localStorage
function loadOfflineQueue() {
    try {
        const saved = localStorage.getItem('asistencias_offline');
        offlineQueue = saved ? JSON.parse(saved) : [];
        console.log(`Cola offline cargada: ${offlineQueue.length} asistencias pendientes`);
        updateOfflineIndicator();
    } catch (error) {
        console.error('Error cargando cola offline:', error);
        offlineQueue = [];
    }
}

// Guardar cola offline en localStorage
function saveOfflineQueue() {
    try {
        localStorage.setItem('asistencias_offline', JSON.stringify(offlineQueue));
        updateOfflineIndicator();
    } catch (error) {
        console.error('Error guardando cola offline:', error);
    }
}

// Actualizar indicador visual de estado offline
function updateOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (!indicator) return;
    
    if (offlineQueue.length > 0) {
        indicator.style.display = 'block';
        indicator.textContent = `📱 ${offlineQueue.length} pendientes`;
        indicator.className = 'offline-indicator pending';
    } else {
        indicator.style.display = 'none';
    }
}

// Agregar asistencia a cola offline
function addToOfflineQueue(estudianteId, eventoId, timestamp = null) {
    // VERIFICAR DUPLICADOS EN COLA OFFLINE ANTES DE AGREGAR
    const yaExisteEnCola = offlineQueue.find(a => 
        a.estudiante_id === estudianteId && a.evento_id === eventoId
    );
    
    if (yaExisteEnCola) {
        console.log('Asistencia ya existe en cola offline, no se agrega duplicado');
        return false; // No se agregó
    }
    
    const asistencia = {
        id: Date.now() + Math.random(), // ID único temporal
        estudiante_id: estudianteId,
        evento_id: eventoId,
        timestamp: timestamp || new Date().toISOString(),
        created_offline: true
    };
    
    offlineQueue.push(asistencia);
    saveOfflineQueue();
    console.log('Asistencia agregada a cola offline:', asistencia);
    return true; // Se agregó correctamente
}

// Sincronizar cola offline con servidor
async function syncOfflineQueue() {
    if (syncInProgress || offlineQueue.length === 0) return;
    
    syncInProgress = true;
    const indicator = document.getElementById('offline-indicator');
    
    try {
        if (indicator) {
            indicator.textContent = '🔄 Sincronizando...';
            indicator.className = 'offline-indicator syncing';
        }
        
        // Procesar en lotes pequeños para optimizar ancho de banda
        const batch = offlineQueue.splice(0, MAX_BATCH_SIZE);
        let syncedCount = 0;
        let skippedCount = 0;
        
        for (const asistencia of batch) {
            try {
                // VERIFICAR SI YA EXISTE antes de insertar
                const { data: existente } = await tursodb.query(`
                    SELECT id FROM asistencias 
                    WHERE estudiante_id = ? AND evento_id = ?
                `, [asistencia.estudiante_id, asistencia.evento_id]);
                
                if (existente && existente.length > 0) {
                    // Ya existe - saltar sin error
                    skippedCount++;
                    console.log(`Asistencia ya existe, saltando: estudiante_id=${asistencia.estudiante_id}, evento_id=${asistencia.evento_id}`);
                } else {
                    // No existe - insertar
                    const { error } = await tursodb.from('asistencias').insert({
                        estudiante_id: asistencia.estudiante_id,
                        evento_id: asistencia.evento_id,
                        timestamp: asistencia.timestamp
                    });
                    
                    if (!error) {
                        syncedCount++;
                        console.log(`Asistencia sincronizada: estudiante_id=${asistencia.estudiante_id}`);
                    } else {
                        // Error insertando - devolver a la cola
                        offlineQueue.unshift(asistencia);
                        console.error('Error sincronizando asistencia:', error);
                    }
                }
            } catch (err) {
                // Error de red - devolver a la cola
                offlineQueue.unshift(asistencia);
                console.error('Error de red sincronizando:', err);
            }
        }
        
        saveOfflineQueue();
        lastSyncTime = Date.now();
        
        if (syncedCount > 0 || skippedCount > 0) {
            console.log(`Sincronización: ${syncedCount} nuevas, ${skippedCount} ya existían`);
            // Recargar lista de asistencias si estamos en la pantalla del escáner
            if (currentEventId && document.getElementById('scanner-section').classList.contains('active')) {
                loadAsistencias(currentEventId);
            }
        }
        
    } catch (error) {
        console.error('Error en sincronización:', error);
    } finally {
        syncInProgress = false;
        updateOfflineIndicator();
    }
}

// Iniciar sincronización automática
function startAutoSync() {
    setInterval(async () => {
        if (Date.now() - lastSyncTime > SYNC_INTERVAL) {
            await syncOfflineQueue();
        }
    }, SYNC_INTERVAL);
}

// Forzar sincronización manual
async function forceSyncOffline() {
    // Usar la misma función que la sincronización automática (con validación de duplicados)
    await syncOfflineQueue();
    
    // Mostrar resultado al usuario
    if (offlineQueue.length === 0) {
        alert('✅ Sincronización completada\n\nTodas las asistencias offline han sido procesadas.');
    } else {
        alert(`⚠️ Sincronización parcial\n\nQuedan ${offlineQueue.length} asistencias pendientes.\nPuede ser por problemas de conexión.`);
    }
}

// ========== FUNCIONES DE AUDITORÍA ==========



// FUNCIÓN DE AUDITORÍA: Auditar asistencias de un evento
async function auditarAsistencias() {
    if (!currentEventoId) {
        alert('Abre primero la lista de asistencias de un evento');
        return;
    }
    
    try {
        const result = await tursodb.query(`
            SELECT 
                a.id as asistencia_id,
                a.timestamp,
                e.codigo_unico,
                e.nombre,
                e.apellido_paterno,
                e.apellido_materno,
                e.especialidad,
                e.anio_formacion,
                COUNT(*) OVER (PARTITION BY e.id) as veces_registrado
            FROM asistencias a
            JOIN estudiantes e ON a.estudiante_id = e.id
            WHERE a.evento_id = ?
            ORDER BY e.codigo_unico, a.timestamp
        `, [currentEventoId]);
        
        console.log('=== AUDITORÍA DE ASISTENCIAS ===');
        console.log(`Total asistencias: ${result.rows?.length || 0}`);
        
        if (result.rows) {
            // Agrupar por especialidad y año
            const grupos = {};
            const duplicados = [];
            
            result.rows.forEach(row => {
                const key = `${row.especialidad} - ${row.anio_formacion}`;
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(row);
                
                if (row.veces_registrado > 1) {
                    duplicados.push(row);
                }
            });
            
            console.log('\n--- POR ESPECIALIDAD Y AÑO ---');
            Object.keys(grupos).forEach(key => {
                console.log(`${key}: ${grupos[key].length} asistencias`);
            });
            
            let mensaje = `📊 AUDITORÍA DEL EVENTO\n\n`;
            mensaje += `Total asistencias: ${result.rows.length}\n\n`;
            
            mensaje += `Por especialidad y año:\n`;
            Object.keys(grupos).forEach(key => {
                mensaje += `• ${key}: ${grupos[key].length}\n`;
            });
            
            if (duplicados.length > 0) {
                console.log('\n--- DUPLICADOS DETECTADOS ---');
                duplicados.forEach(dup => {
                    console.log(`${dup.codigo_unico} - ${dup.nombre} ${dup.apellido_paterno}: ${dup.veces_registrado} veces`);
                });
                mensaje += `\n⚠️ DUPLICADOS DETECTADOS: ${duplicados.length}\n`;
                mensaje += `\nLos duplicados se eliminan automáticamente al abrir "Ver Lista".`;
            } else {
                mensaje += `\n✅ No se encontraron duplicados`;
            }
            
            alert(mensaje);
            console.log('🔍 Revisa la consola para análisis detallado');
        }
        
    } catch (error) {
        console.error('Error en auditoría:', error);
        alert('Error realizando auditoría: ' + error.message);
    }
}



// ========== AUTENTICACIÓN CON SUPABASE AUTH ==========

async function login() {
    const emailOrCi = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    if (!emailOrCi || !password) {
        errorEl.textContent = 'Completa todos los campos';
        return;
    }

    try {
        let email = emailOrCi;
        
        // Si es el CI del admin, convertir a email
        if (emailOrCi === '79310777') {
            email = 'admin@escuela.com';
        }
        // Verificar si es un CI (solo números) para futuros usuarios
        else if (/^\d+$/.test(emailOrCi)) {
            errorEl.textContent = 'CI no encontrado';
            return;
        }

        // Login con email
        const { data, error } = await tursodb.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorEl.textContent = error.message;
            return;
        }

        // Cargar perfil del usuario
        const { data: profile } = await tursodb
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
    await tursodb.auth.signOut();
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



function showLogin() {
    hideAllSections();
    document.getElementById('login-section').classList.add('active');
}

function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard-section').classList.add('active');
}

function showAsistenciaModule() {
    hideAllSections();
    document.getElementById('asistencia-module-section').classList.add('active');
    loadEventos();
}

function showBibliotecaModule() {
    alert('Módulo de Biblioteca en desarrollo. Próximamente disponible.');
}

function showGestionUsuarios() {
    hideAllSections();
    document.getElementById('gestion-usuarios-section').classList.add('active');
}

function showRegistroDocentes() {
    hideAllSections();
    document.getElementById('registro-docentes-section').classList.add('active');
}

function showCargaMasiva() {
    hideAllSections();
    document.getElementById('carga-masiva-section').classList.add('active');
    mostrarCargaNueva();
}

function mostrarCargaNueva() {
    document.getElementById('seccion-carga-nueva').style.display = 'block';
    document.getElementById('seccion-actualizacion').style.display = 'none';
    document.getElementById('btn-carga-nueva').className = 'btn-primary';
    document.getElementById('btn-actualizacion').className = 'btn-secondary';
    document.getElementById('resultado-carga').innerHTML = '';
}

function mostrarActualizacion() {
    document.getElementById('seccion-carga-nueva').style.display = 'none';
    document.getElementById('seccion-actualizacion').style.display = 'block';
    document.getElementById('btn-carga-nueva').className = 'btn-secondary';
    document.getElementById('btn-actualizacion').className = 'btn-primary';
    document.getElementById('admin-password-update').value = '';
    document.getElementById('resultado-carga').innerHTML = '';
}

async function actualizarBDCompleta() {
    const password = document.getElementById('admin-password-update').value;
    const fileInput = document.getElementById('excel-file-update');
    const resultadoDiv = document.getElementById('resultado-carga');
    
    if (!password) {
        alert('Ingresa tu contraseña de administrador');
        return;
    }
    
    if (password !== 'Admin123!') {
        resultadoDiv.innerHTML = '<p style="color: red;">❌ Contraseña incorrecta</p>';
        return;
    }
    
    if (!fileInput.files[0]) {
        alert('Selecciona un archivo Excel');
        return;
    }
    
    const confirmacion = confirm('⚠️ CONFIRMACIÓN DE ACTUALIZACIÓN\n\nEsto eliminará TODOS los estudiantes actuales y cargará los nuevos desde Excel.\n\n¿Continuar?');
    
    if (!confirmacion) {
        resultadoDiv.innerHTML = '<p style="color: orange;">🛑 Operación cancelada</p>';
        return;
    }
    
    try {
        resultadoDiv.innerHTML = '<p style="color: blue;">🔄 Actualizando base de datos...</p>';
        
        // Contar estudiantes actuales
        const countResult = await tursodb.query('SELECT COUNT(*) as total FROM estudiantes');
        const estudiantesAnteriores = countResult.rows[0]?.total || 0;
        
        // Eliminar datos existentes
        await tursodb.query('DELETE FROM asistencias');
        await tursodb.query('DELETE FROM estudiantes');
        
        resultadoDiv.innerHTML = '<p style="color: blue;">📄 Procesando archivo Excel...</p>';
        
        // Procesar el nuevo archivo
        await procesarExcelInterno(fileInput.files[0], resultadoDiv, estudiantesAnteriores);
        
    } catch (error) {
        console.error('Error actualizando BD:', error);
        resultadoDiv.innerHTML = `<p style="color: red;">❌ Error: ${error.message}</p>`;
    }
}

function showLimpiarBD() {
    // Función obsoleta - redirigir a actualización
    showCargaMasiva();
    mostrarActualizacion();
}

async function confirmarLimpiarBD() {
    // Función obsoleta - mantener por compatibilidad
    alert('Esta función se ha movido a "Carga Masiva > Actualizar Existentes"');
}

async function registrarDocente() {
    const ci = document.getElementById('docente-ci').value;
    const nombre = document.getElementById('docente-nombre').value;
    const email = document.getElementById('docente-email').value;
    const password = document.getElementById('docente-password').value;
    const celular = document.getElementById('docente-celular').value;

    if (!ci || !nombre || !email || !password) {
        alert('Completa todos los campos obligatorios');
        return;
    }

    try {
        const { data, error } = await tursodb.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre,
                    ci,
                    celular: celular || null,
                    rol: 'usuario'
                }
            }
        });

        if (error) {
            alert('Error: ' + error.message);
            return;
        }

        document.getElementById('docente-ci').value = '';
        document.getElementById('docente-nombre').value = '';
        document.getElementById('docente-email').value = '';
        document.getElementById('docente-password').value = '';
        document.getElementById('docente-celular').value = '';

        alert('✓ Docente registrado correctamente');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function procesarExcel() {
    const fileInput = document.getElementById('excel-file');
    const resultadoDiv = document.getElementById('resultado-carga');
    
    if (!fileInput.files[0]) {
        alert('Selecciona un archivo Excel');
        return;
    }
    
    await procesarExcelInterno(fileInput.files[0], resultadoDiv, 0);
}

async function procesarExcelInterno(file, resultadoDiv, estudiantesAnteriores = 0) {
    console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size);
    resultadoDiv.innerHTML = '<p style="color: blue;">📁 Leyendo archivo Excel...</p>';

    try {
        const data = await file.arrayBuffer();
        console.log('Archivo leído, tamaño del buffer:', data.byteLength);
        resultadoDiv.innerHTML = '<p style="color: blue;">📊 Procesando datos...</p>';
        
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('Datos extraídos:', jsonData.length, 'filas');
        console.log('Primeras 3 filas:', jsonData.slice(0, 3));

        if (jsonData.length === 0) {
            resultadoDiv.innerHTML = '<p style="color: red;">❌ El archivo está vacío</p>';
            return;
        }

        // Detectar si tiene cabeceras
        let startRow = 0;
        const firstRow = jsonData[0];
        if (firstRow && firstRow.some(cell => 
            typeof cell === 'string' && 
            (cell.toLowerCase().includes('nombre') || 
             cell.toLowerCase().includes('dni') || 
             cell.toLowerCase().includes('codigo'))
        )) {
            startRow = 1;
            console.log('Cabeceras detectadas, iniciando desde fila 2');
        } else {
            console.log('Sin cabeceras, procesando desde fila 1');
        }

        let exitosos = 0;
        let errores = 0;
        const erroresDetalle = [];
        const totalFilas = jsonData.length - startRow;
        
        resultadoDiv.innerHTML = `<p style="color: blue;">⏳ Procesando ${totalFilas} estudiantes...</p>`;

        for (let i = startRow; i < jsonData.length; i++) {
            const fila = jsonData[i];
            
            // Actualizar progreso cada 10 registros
            if ((i - startRow) % 10 === 0) {
                const progreso = Math.round(((i - startRow) / totalFilas) * 100);
                resultadoDiv.innerHTML = `<p style="color: blue;">⏳ Procesando... ${progreso}% (${i - startRow}/${totalFilas})</p>`;
            }
            
            // Saltar filas vacías
            if (!fila || fila.every(cell => !cell)) {
                console.log(`Fila ${i + 1} vacía, saltando`);
                continue;
            }
            
            try {
                const estudiante = {
                    codigo_unico: fila[0] ? fila[0].toString().trim() : '',
                    dni: fila[1] ? fila[1].toString().trim() : '',
                    nombre: fila[2] ? fila[2].toString().toUpperCase().trim() : '',
                    apellido_paterno: fila[3] ? fila[3].toString().toUpperCase().trim() : '',
                    apellido_materno: fila[4] ? fila[4].toString().toUpperCase().trim() : '',
                    especialidad: fila[5] ? fila[5].toString().toUpperCase().trim() : '',
                    anio_formacion: fila[6] ? fila[6].toString().toUpperCase().trim() : '',
                    celular: fila[7] ? fila[7].toString().trim() : null,
                    email: fila[8] ? fila[8].toString().toLowerCase().trim() : null
                };
                
                // Detectar y corregir datos mal estructurados (nombre en posición incorrecta)
                if (!estudiante.apellido_paterno && estudiante.nombre && estudiante.apellido_materno) {
                    // Caso: RAMIREZ,,JOSE LUIS -> JOSE LUIS,RAMIREZ,SIN DATO
                    const temp = estudiante.nombre;
                    estudiante.nombre = estudiante.apellido_materno;
                    estudiante.apellido_paterno = temp;
                    estudiante.apellido_materno = 'SIN DATO';
                    console.log(`Fila ${i + 1}: Datos reestructurados - Nombre: ${estudiante.nombre}, Apellido: ${estudiante.apellido_paterno}`);
                }

                // Validar campos obligatorios (apellido materno es opcional)
                if (!estudiante.codigo_unico || !estudiante.dni || !estudiante.nombre || !estudiante.apellido_paterno || !estudiante.especialidad || !estudiante.anio_formacion) {
                    errores++;
                    const camposFaltantes = [];
                    if (!estudiante.codigo_unico) camposFaltantes.push('código');
                    if (!estudiante.dni) camposFaltantes.push('DNI');
                    if (!estudiante.nombre) camposFaltantes.push('nombre');
                    if (!estudiante.apellido_paterno) camposFaltantes.push('apellido paterno');
                    if (!estudiante.especialidad) camposFaltantes.push('especialidad');
                    if (!estudiante.anio_formacion) camposFaltantes.push('año de formación');
                    
                    const errorMsg = `Fila ${i + 1} (${estudiante.codigo_unico || 'Sin código'}): Faltan campos obligatorios: ${camposFaltantes.join(', ')}`;
                    erroresDetalle.push(errorMsg);
                    console.log(`❌ ${errorMsg}`);
                    console.log('Datos de la fila:', estudiante);
                    continue;
                }
                
                // Si apellido materno está vacío, usar "SIN DATO"
                if (!estudiante.apellido_materno) {
                    estudiante.apellido_materno = 'SIN DATO';
                    console.log(`Fila ${i + 1}: Apellido materno vacío, usando "SIN DATO"`);
                }
                
                console.log(`Insertando estudiante ${exitosos + 1}:`, estudiante.codigo_unico, estudiante.nombre);
                
                const { error } = await tursodb.from('estudiantes').insert(estudiante);

                if (error) {
                    errores++;
                    erroresDetalle.push(`Fila ${i + 1}: ${error.message}`);
                    console.error(`Error insertando fila ${i + 1}:`, error);
                } else {
                    exitosos++;
                }
            } catch (err) {
                errores++;
                erroresDetalle.push(`Fila ${i + 1}: ${err.message}`);
                console.error(`Error procesando fila ${i + 1}:`, err);
            }
        }

        let resultado = `<h4>📊 Proceso completado:</h4>`;
        resultado += `<p style="color: green; font-size: 18px;">✅ Estudiantes cargados: <strong>${exitosos}</strong></p>`;
        if (errores > 0) {
            resultado += `<p style="color: red; font-size: 18px;">❌ Errores encontrados: <strong>${errores}</strong></p>`;
            resultado += `<p style="color: orange; font-size: 14px;">⚠️ Revisa los datos y corrige los errores antes de continuar</p>`;
        }
        
        if (erroresDetalle.length > 0) {
            resultado += `<details style="margin-top: 15px;"><summary style="cursor: pointer; font-weight: bold;">👁️ Ver detalles de errores (${errores})</summary><ul style="margin-top: 10px;">`;
            erroresDetalle.slice(0, 20).forEach(error => {
                resultado += `<li style="color: red; margin: 5px 0;">${error}</li>`;
            });
            if (erroresDetalle.length > 20) {
                resultado += `<li style="color: orange;">... y ${erroresDetalle.length - 20} errores más</li>`;
            }
            resultado += `</ul></details>`;
        }

        resultadoDiv.innerHTML = resultado;
        console.log('Proceso completado:', { exitosos, errores });
        
        if (exitosos > 0) {
            setTimeout(() => {
                if (errores > 0) {
                    alert(`⚠️ Proceso completado con errores\n✅ ${exitosos} estudiantes cargados\n❌ ${errores} errores encontrados\n\nRevisa los detalles en pantalla y corrige los datos faltantes.`);
                } else {
                    const mensaje = estudiantesAnteriores > 0 
                        ? `🔄 ¡Base de datos actualizada!\n❌ ${estudiantesAnteriores} estudiantes anteriores eliminados\n✅ ${exitosos} nuevos estudiantes cargados\n❌ 0 errores`
                        : `🎉 ¡Proceso completado exitosamente!\n✅ ${exitosos} estudiantes cargados\n❌ 0 errores`;
                    alert(mensaje);
                }
            }, 1000);
        } else if (errores > 0) {
            setTimeout(() => {
                alert(`❌ No se pudo cargar ningún estudiante\n${errores} errores encontrados\n\nRevisa el formato del archivo Excel.`);
            }, 1000);
        }

    } catch (error) {
        console.error('Error general:', error);
        resultadoDiv.innerHTML = `<p style="color: red;">❌ Error procesando archivo: ${error.message}</p>`;
        alert('Error: ' + error.message);
    }
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
    
    validarEventoActivo(eventoId).then(esValido => {
        if (esValido) {
            // Actualizar cache de estudiantes antes de iniciar el escáner
            updateEstudiantesCache();
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

    await tursodb.from('eventos').insert({
        nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        imagen_url: null,
        usuario_id: currentUser.id,
        activo: true
    });

    document.getElementById('evento-nombre').value = '';
    document.getElementById('evento-fecha-inicio').value = '';
    document.getElementById('evento-fecha-fin').value = '';
    document.getElementById('evento-hora-inicio').value = '08:00';
    document.getElementById('evento-hora-fin').value = '18:00';

    showAsistenciaModule();
}

async function loadEventos(page = 1) {
    currentPage = page;
    const listEl = document.getElementById('eventos-list');
    const paginationEl = document.getElementById('pagination-controls');
    
    listEl.innerHTML = '<p style="color: white;">Cargando...</p>';
    paginationEl.innerHTML = '';

    const { data, error } = await tursodb
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
    
    // Ordenar por fecha de creación (más recientes primero)
    eventos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    allEvents = eventos;
    totalEvents = eventos.length;

    if (totalEvents === 0) {
        listEl.innerHTML = '<p style="color: white; text-align: center;">No hay eventos. Crea uno para comenzar.</p>';
        return;
    }

    // Calcular eventos para la página actual
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = startIndex + eventsPerPage;
    const eventosPage = eventos.slice(startIndex, endIndex);

    // Mostrar eventos de la página actual
    listEl.innerHTML = '';
    
    for (const evento of eventosPage) {
        // Verificar si tiene asistencias
        const { data: asistencias } = await tursodb.query(`
            SELECT COUNT(*) as total FROM asistencias WHERE evento_id = ?
        `, [evento.id]);
        
        const tieneAsistencias = asistencias && asistencias[0] && parseInt(asistencias[0].total) > 0;
        console.log(`Evento ${evento.nombre}: ${asistencias?.[0]?.total || 0} asistencias - Tiene asistencias: ${tieneAsistencias}`);
        
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
            <div class="evento-actions">
                <button class="btn-asistencia" onclick="showScanner('${evento.id}', '${evento.nombre}')">
                    Tomar Asistencia
                </button>
                <button class="btn-info" onclick="verListaAsistencias('${evento.id}', '${evento.nombre.replace(/'/g, "\\'")}')">📋 Ver Lista</button>
                ${!tieneAsistencias ? 
                    `<button class="btn-danger" onclick="eliminarEvento('${evento.id}')">🗑️ Eliminar</button>` : ''
                }
            </div>
        `;
        listEl.appendChild(card);
    }
    
    // Mostrar controles de paginación
    renderPagination();
}

function renderPagination() {
    const paginationEl = document.getElementById('pagination-controls');
    const totalPages = Math.ceil(totalEvents / eventsPerPage);
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Botón anterior
    paginationHTML += `
        <button class="pagination-btn" onclick="loadEventos(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            ← Anterior
        </button>
    `;
    
    // Información de página
    paginationHTML += `
        <span class="pagination-info">
            Página ${currentPage} de ${totalPages} (${totalEvents} eventos)
        </span>
    `;
    
    // Botón siguiente
    paginationHTML += `
        <button class="pagination-btn" onclick="loadEventos(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Siguiente →
        </button>
    `;
    
    paginationEl.innerHTML = paginationHTML;
}

// ========== ESCÁNER QR ==========

function iniciarMonitoreoEvento(eventoId) {
    // Verificar cada 60 segundos si el evento sigue activo
    eventoTimer = setInterval(async () => {
        const { data: evento } = await tursodb
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
            alert('⏰ El periodo del evento ha finalizado. Redirigiendo al módulo...');
            showAsistenciaModule();
        }
    }, 60000); // Cada 60 segundos
}

async function validarEventoActivo(eventoId) {
    const { data: evento } = await tursodb
        .from('eventos')
        .select('fecha_inicio, fecha_fin, hora_inicio, hora_fin')
        .eq('id', eventoId)
        .single();
    
    if (!evento) return false;
    
    const ahora = new Date();
    const fechaActual = ahora.toISOString().split('T')[0];
    const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + ahora.getMinutes().toString().padStart(2, '0');
    
    // Validar fecha
    if (fechaActual < evento.fecha_inicio || fechaActual > evento.fecha_fin) {
        alert(`⚠️ Este evento solo está activo entre ${evento.fecha_inicio} y ${evento.fecha_fin}\nFecha actual: ${fechaActual}`);
        showAsistenciaModule();
        return false;
    }
    
    // Extraer solo HH:MM de las horas del evento (quitar segundos)
    const horaInicio = evento.hora_inicio.substring(0, 5);
    const horaFin = evento.hora_fin.substring(0, 5);
    
    // Validar hora
    if (horaActual < horaInicio || horaActual > horaFin) {
        alert(`⚠️ Este evento solo registra asistencias entre ${horaInicio} y ${horaFin}\nHora actual: ${horaActual}`);
        showAsistenciaModule();
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
        let estudiante = null;
        
        // Intentar buscar en base de datos primero
        try {
            const { data, error } = await tursodb
                .from('estudiantes')
                .select('*')
                .eq('codigo_unico', codigoUnico)
                .maybeSingle();
            
            if (!error && data) {
                estudiante = data;
            }
        } catch (networkError) {
            console.log('Sin conexión, buscando en cache local...');
        }
        
        // Si no se encontró en BD o no hay conexión, buscar en cache
        if (!estudiante) {
            estudiante = findEstudianteInCache(codigoUnico);
        }

        if (!estudiante) {
            showMessage('Estudiante no encontrado', 'error');
            setTimeout(() => { isScanning = false; }, 2000);
            return;
        }

        // VERIFICAR DUPLICADOS EN COLA OFFLINE (por estudiante_id Y evento_id)
        const existeOffline = offlineQueue.find(a => 
            a.estudiante_id === estudiante.id && a.evento_id === currentEventId
        );
        
        if (existeOffline) {
            showMessage('Asistencia ya registrada (pendiente de sincronizar)', 'warning');
            setTimeout(() => { isScanning = false; }, 2000);
            return;
        }

        // Verificar duplicados en servidor (solo si hay conexión)
        let yaExisteEnServidor = false;
        try {
            const { data: existeEnBD } = await tursodb.query(`
                SELECT id FROM asistencias 
                WHERE estudiante_id = ? AND evento_id = ?
            `, [estudiante.id, currentEventId]);
            
            if (existeEnBD && existeEnBD.length > 0) {
                yaExisteEnServidor = true;
            }
        } catch (networkError) {
            console.log('Sin conexión para verificar duplicados en servidor');
        }

        if (yaExisteEnServidor) {
            showMessage('Asistencia ya registrada', 'warning');
            setTimeout(() => { isScanning = false; }, 2000);
            return;
        }

        // Intentar guardar directamente primero
        try {
            const { error: insertError } = await tursodb.from('asistencias').insert({
                estudiante_id: estudiante.id,
                evento_id: currentEventId
            });

            if (!insertError) {
                // Éxito - guardado directamente
                showMessage(`✓ ${formatearNombreCompleto(estudiante.nombre, estudiante.apellido_paterno, estudiante.apellido_materno)} - Asistencia registrada`, 'success');
                setTimeout(() => {
                    loadAsistencias(currentEventId);
                }, 500);
            } else {
                throw new Error('Error de base de datos');
            }
        } catch (networkError) {
            // Sin conexión - guardar en cola offline
            const agregado = addToOfflineQueue(estudiante.id, currentEventId);
            
            if (agregado) {
                showMessage(`📱 ${formatearNombreCompleto(estudiante.nombre, estudiante.apellido_paterno, estudiante.apellido_materno)} - Guardado offline`, 'success');
                // Mostrar en lista local inmediatamente
                addToLocalAsistenciasList(estudiante);
            } else {
                showMessage('Asistencia ya registrada (en cola offline)', 'warning');
            }
        }
        
        // Reiniciar escáner después de 2 segundos
        setTimeout(() => { 
            isScanning = false;
            if (html5QrCode && html5QrCode.isScanning) {
                // Ya está escaneando, solo resetear flag
            } else {
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
    const result = await tursodb.query(`
        SELECT a.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.codigo_unico, e.dni, e.especialidad, e.anio_formacion
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
            year: 'numeric',
            hour12: false
        });
        item.innerHTML = `
            <div style="width: 100%;">
                <strong style="font-size: 16px; color: #333;">${formatearNombreCompleto(asistencia.nombre, asistencia.apellido_paterno, asistencia.apellido_materno)}</strong><br>
                <small style="color: #666; font-size: 13px;">
                    📋 ${asistencia.codigo_unico} | 
                    🆔 ${formatearCampoOpcional(asistencia.dni, 'Sin DNI')} | 
                    🎓 ${formatearCampoOpcional(asistencia.especialidad, 'Sin especialidad')} | 
                    📅 Año ${formatearCampoOpcional(asistencia.anio_formacion, 'N/A')}
                </small>
            </div>
            <span style="color: #007bff; font-weight: bold;">${time}</span>
        `;
        listEl.appendChild(item);
    });
}

// Agregar asistencia a lista local (para mostrar inmediatamente)
function addToLocalAsistenciasList(estudiante) {
    const listEl = document.getElementById('asistencias-list');
    if (!listEl) return;
    
    const item = document.createElement('div');
    item.className = 'asistencia-item offline-item';
    const time = new Date().toLocaleString('es-BO', { 
        hour: '2-digit', 
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
    });
    
    item.innerHTML = `
        <div style="width: 100%;">
            <strong style="font-size: 16px; color: #333;">${formatearNombreCompleto(estudiante.nombre, estudiante.apellido_paterno, estudiante.apellido_materno)}</strong><br>
            <small style="color: #666; font-size: 13px;">
                📋 ${estudiante.codigo_unico} | 
                🆔 ${formatearCampoOpcional(estudiante.dni, 'Sin DNI')} | 
                🎓 ${formatearCampoOpcional(estudiante.especialidad, 'Sin especialidad')} | 
                📅 Año ${formatearCampoOpcional(estudiante.anio_formacion, 'N/A')}
            </small>
        </div>
        <span style="color: #ff9800; font-weight: bold;">📱 ${time}</span>
    `;
    
    // Insertar al inicio de la lista
    listEl.insertBefore(item, listEl.firstChild);
}

// Inicializar sistema offline al cargar la página
window.addEventListener('DOMContentLoaded', function() {
    loadOfflineQueue();
    loadEstudiantesCache();
    startAutoSync();
    
    // Actualizar cache de estudiantes al iniciar (si hay conexión)
    updateEstudiantesCache();
});

function formatearCampoOpcional(valor, valorPorDefecto = '') {
    if (!valor || valor === 'SIN DATO' || valor === 'Sin DNI' || valor === 'Sin celular' || valor === 'Sin email' || valor === 'N/A') {
        return valorPorDefecto;
    }
    return valor;
}

function formatearNombreCompleto(nombre, apellidoPaterno, apellidoMaterno) {
    // Solo ocultar si es exactamente "SIN DATO", no otros valores falsy
    const apellidoMaternoFormateado = (apellidoMaterno && apellidoMaterno !== 'SIN DATO') ? apellidoMaterno : '';
    return `${nombre} ${apellidoPaterno}${apellidoMaternoFormateado ? ' ' + apellidoMaternoFormateado : ''}`;
}

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

async function loadEstudiantes() {
    hideAllSections();
    document.getElementById('estudiantes-section').classList.add('active');
    
    const container = document.getElementById('especialidades-accordion');
    container.innerHTML = '<p style="color: white;">Cargando...</p>';

    const result = await tursodb.query(`SELECT * FROM estudiantes ORDER BY especialidad, anio_formacion, codigo_unico`);
    
    console.log('Total estudiantes encontrados:', result.rows?.length || 0);
    
    if (!result.rows || result.rows.length === 0) {
        container.innerHTML = '<p style="color: white;">No hay estudiantes. Usa la carga masiva para importar desde Excel.</p>';
        return;
    }

    const data = result.rows;
    
    // Ordenar en JavaScript
    data.sort((a, b) => {
        if (a.especialidad !== b.especialidad) {
            return a.especialidad.localeCompare(b.especialidad);
        }
        if (a.anio_formacion !== b.anio_formacion) {
            const orden = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO'];
            return orden.indexOf(a.anio_formacion) - orden.indexOf(b.anio_formacion);
        }
        return a.codigo_unico.localeCompare(b.codigo_unico);
    });

    const grouped = {};
    data.forEach(est => {
        const esp = est.especialidad || 'Sin Especialidad';
        const anio = est.anio_formacion || 'Sin Año';
        if (!grouped[esp]) grouped[esp] = {};
        if (!grouped[esp][anio]) grouped[esp][anio] = [];
        grouped[esp][anio].push(est);
    });

    // Limpiar completamente el contenedor antes de agregar nuevo contenido
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
        Object.keys(grouped[especialidad]).sort((a, b) => {
            const orden = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO'];
            return orden.indexOf(a) - orden.indexOf(b);
        }).forEach(anio => {
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
                        <strong>${formatearNombreCompleto(est.nombre, est.apellido_paterno, est.apellido_materno)}</strong><br>
                        <small>📋 ${est.codigo_unico} | 🆔 ${formatearCampoOpcional(est.dni, 'Sin DNI')} | 📱 ${formatearCampoOpcional(est.celular, 'Sin celular')}</small>
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

    const { error } = await tursodb.from('estudiantes').insert({
        codigo_unico: codigo,
        dni: dni,
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        celular: celular || null,
        email: email || null,
        especialidad: currentEspecialidad,
        anio_formacion: currentAnio
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
    currentEspecialidad = especialidad;
    currentAnio = anio;
    
    hideAllSections();
    document.getElementById('generar-qr-section').classList.add('active');
    
    const container = document.getElementById('qr-container');
    container.innerHTML = '<p style="color: white;">Generando QRs...</p>';
    qrCodesGenerated = [];

    const { data, error } = await tursodb.from('estudiantes').select('*');
    
    if (error) {
        container.innerHTML = '<p style="color: white;">Error cargando estudiantes</p>';
        console.error('Error cargando estudiantes:', error);
        return;
    }
    
    const estudiantesFiltrados = (data || []).filter(est => 
        est.especialidad === especialidad && est.anio_formacion == anio
    );
    
    estudiantesFiltrados.sort((a, b) => a.codigo_unico.localeCompare(b.codigo_unico));

    if (estudiantesFiltrados.length === 0) {
        container.innerHTML = '<p style="color: white;">No hay estudiantes para esta especialidad y año</p>';
        return;
    }

    container.innerHTML = '';
    
    estudiantesFiltrados.forEach((est, index) => {
        const qrItem = document.createElement('div');
        qrItem.className = 'qr-item';
        const nombreCompleto = formatearNombreCompleto(est.nombre, est.apellido_paterno, est.apellido_materno);
        qrItem.innerHTML = `
            <h3>${nombreCompleto}</h3>
            <p><strong>${est.codigo_unico}</strong></p>
            <div class="qr-code" id="qr-${index}"></div>
            <button class="download-btn" onclick="downloadSingleQR('qr-${index}', '${nombreCompleto.replace(/\s+/g, '_')}')">📥 Descargar</button>
        `;
        container.appendChild(qrItem);

        setTimeout(() => {
            const qrElement = document.getElementById(`qr-${index}`);
            if (qrElement && typeof QRCode !== 'undefined') {
                new QRCode(qrElement, {
                text: est.codigo_unico,
                width: 180,
                height: 180
            });
        }
        }, index * 100);

        qrCodesGenerated.push({ id: `qr-${index}`, nombre: nombreCompleto.replace(/\s+/g, '_') });
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

async function downloadAllQRs() {
    if (qrCodesGenerated.length === 0) {
        alert('No hay QRs generados');
        return;
    }
    
    const zip = new JSZip();
    const especialidadLimpia = currentEspecialidad.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toUpperCase();
    const nombreZip = `QRs_${especialidadLimpia}_${currentAnio}.zip`;
    
    const container = document.getElementById('qr-container');
    
    try {
        // Buscar todos los canvas ANTES de cambiar el contenido
        const allCanvas = document.querySelectorAll('#qr-container canvas');
        console.log('Canvas encontrados:', allCanvas.length);
        
        if (allCanvas.length === 0) {
            throw new Error('No se encontraron códigos QR. Genera los QRs primero.');
        }
        
        // Crear elemento de progreso sin eliminar el contenido existente
        const progressDiv = document.createElement('div');
        progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; z-index: 9999;';
        progressDiv.textContent = '📦 Preparando descarga...';
        document.body.appendChild(progressDiv);
        
        let archivosAgregados = 0;
        
        // Procesar cada canvas
        for (let i = 0; i < allCanvas.length; i++) {
            const canvas = allCanvas[i];
            
            try {
                // Obtener el nombre del estudiante del elemento padre
                const qrItem = canvas.closest('.qr-item');
                const nombreElement = qrItem ? qrItem.querySelector('h3') : null;
                const nombreCompleto = nombreElement ? nombreElement.textContent.trim() : `Estudiante_${i + 1}`;
                const nombreArchivo = nombreCompleto.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
                
                // Convertir canvas a blob
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/png', 1.0);
                });
                
                if (blob && blob.size > 100) {
                    zip.file(`QR_${nombreArchivo}.png`, blob);
                    archivosAgregados++;
                    console.log(`QR agregado: ${nombreArchivo}`);
                }
            } catch (err) {
                console.warn(`Error procesando canvas ${i}:`, err);
            }
            
            const progreso = Math.round(((i + 1) / allCanvas.length) * 100);
            progressDiv.textContent = `📦 Procesando... ${progreso}%`;
        }
        
        if (archivosAgregados === 0) {
            throw new Error('No se pudieron procesar los códigos QR.');
        }
        
        progressDiv.textContent = '💾 Creando ZIP...';
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        progressDiv.textContent = '⬇️ Descargando...';
        
        // Descargar
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreZip;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Remover progreso
        document.body.removeChild(progressDiv);
        
        alert(`✅ Descarga completada\n📁 ${nombreZip}\n📊 ${archivosAgregados} QRs incluidos`);
        
    } catch (error) {
        console.error('Error:', error);
        // Remover progreso si existe
        const progressDiv = document.querySelector('div[style*="position: fixed"]');
        if (progressDiv) document.body.removeChild(progressDiv);
        alert(`❌ ${error.message}`);
    }
}
// ========== GESTIÓN DE EVENTOS AVANZADA ==========

async function eliminarEvento(eventoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        // Verificar que no tenga asistencias
        const { data: asistencias } = await tursodb.query(`
            SELECT COUNT(*) as total FROM asistencias WHERE evento_id = ?
        `, [eventoId]);
        
        if (asistencias && asistencias[0] && asistencias[0].total > 0) {
            alert('No se puede eliminar un evento que tiene asistencias registradas.');
            return;
        }
        
        // Eliminar evento
        await tursodb.query(`DELETE FROM eventos WHERE id = ?`, [eventoId]);
        
        alert('Evento eliminado correctamente.');
        loadEventos(currentPage);
    } catch (error) {
        console.error('Error eliminando evento:', error);
        alert('Error al eliminar el evento.');
    }
}

async function verListaAsistencias(eventoId, eventoNombre) {
    currentEventoId = eventoId;
    currentEventoNombre = eventoNombre;
    
    hideAllSections();
    document.getElementById('ver-asistencias-section').classList.add('active');
    document.getElementById('asistencias-evento-title').textContent = `Asistencias - ${eventoNombre}`;
    
    const listEl = document.getElementById('asistencias-completas-list');
    listEl.innerHTML = '<p>Limpiando duplicados y cargando asistencias...</p>';
    
    try {
        // LIMPIAR DUPLICADOS AUTOMÁTICAMENTE ANTES DE MOSTRAR
        await limpiarDuplicadosEvento(eventoId);
        
        const result = await tursodb.query(`
            SELECT 
                a.timestamp,
                e.codigo_unico,
                e.dni,
                e.nombre,
                e.apellido_paterno,
                e.apellido_materno,
                e.celular,
                e.email,
                e.especialidad,
                e.anio_formacion
            FROM asistencias a
            JOIN estudiantes e ON a.estudiante_id = e.id
            WHERE a.evento_id = ?
            ORDER BY a.timestamp DESC
        `, [eventoId]);
        
        if (!result.rows || result.rows.length === 0) {
            listEl.innerHTML = '<p>No hay asistencias registradas para este evento.</p>';
            return;
        }
        
        // Crear tabla
        let tableHTML = `
            <h3>Total de asistencias: ${result.rows.length}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Fecha/Hora</th>
                        <th>Código</th>
                        <th>DNI</th>
                        <th>Nombre Completo</th>
                        <th>Celular</th>
                        <th>Email</th>
                        <th>Especialidad</th>
                        <th>Año</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        result.rows.forEach(asistencia => {
            const fecha = new Date(asistencia.timestamp).toLocaleString('es-BO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            const nombreCompleto = formatearNombreCompleto(asistencia.nombre, asistencia.apellido_paterno, asistencia.apellido_materno);
            
            tableHTML += `
                <tr>
                    <td>${fecha}</td>
                    <td>${asistencia.codigo_unico}</td>
                    <td>${formatearCampoOpcional(asistencia.dni, 'N/A')}</td>
                    <td>${nombreCompleto}</td>
                    <td>${formatearCampoOpcional(asistencia.celular, 'N/A')}</td>
                    <td>${formatearCampoOpcional(asistencia.email, 'N/A')}</td>
                    <td>${formatearCampoOpcional(asistencia.especialidad, 'N/A')}</td>
                    <td>${formatearCampoOpcional(asistencia.anio_formacion, 'N/A')}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        listEl.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Error cargando asistencias:', error);
        listEl.innerHTML = '<p>Error cargando las asistencias.</p>';
    }
}

// Función para limpiar duplicados de un evento específico
async function limpiarDuplicadosEvento(eventoId) {
    try {
        const result = await tursodb.query(`
            DELETE FROM asistencias 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM asistencias 
                WHERE evento_id = ? 
                GROUP BY estudiante_id
            ) AND evento_id = ?
        `, [eventoId, eventoId]);
        
        console.log(`Duplicados eliminados del evento ${eventoId}`);
        
    } catch (error) {
        console.error('Error limpiando duplicados:', error);
    }
}

async function exportarAsistenciasExcel() {
    if (!currentEventoId) return;
    
    try {
        const result = await tursodb.query(`
            SELECT 
                a.timestamp,
                e.codigo_unico,
                e.dni,
                e.nombre,
                e.apellido_paterno,
                e.apellido_materno,
                e.celular,
                e.email,
                e.especialidad,
                e.anio_formacion
            FROM asistencias a
            JOIN estudiantes e ON a.estudiante_id = e.id
            WHERE a.evento_id = ?
            ORDER BY a.timestamp DESC
        `, [currentEventoId]);
        
        if (!result.rows || result.rows.length === 0) {
            alert('No hay asistencias para exportar.');
            return;
        }
        
        // Preparar datos para Excel (reordenando columnas)
        const excelData = result.rows.map(asistencia => {
            const fecha = new Date(asistencia.timestamp).toLocaleString('es-BO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            const nombreCompleto = formatearNombreCompleto(asistencia.nombre, asistencia.apellido_paterno, asistencia.apellido_materno);
            
            return {
                'Código': asistencia.codigo_unico,
                'CI': formatearCampoOpcional(asistencia.dni, 'N/A'),
                'Nombre Completo': nombreCompleto,
                'Celular': formatearCampoOpcional(asistencia.celular, 'N/A'),
                'Email': formatearCampoOpcional(asistencia.email, 'N/A'),
                'Especialidad': formatearCampoOpcional(asistencia.especialidad, 'N/A'),
                'Año': formatearCampoOpcional(asistencia.anio_formacion, 'N/A'),
                'Fecha/Hora Registro': fecha
            };
        });
        
        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        
        // Crear datos con título
        const wsData = [
            [`REPORTE DE ASISTENCIAS - ${currentEventoNombre.toUpperCase()}`],
            [`Fecha de generación: ${new Date().toLocaleDateString('es-BO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            })} ${new Date().toLocaleTimeString('es-BO', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })}`],
            [`Total de asistencias: ${result.rows.length}`],
            [], // Fila vacía
            // Encabezados
            ['Código', 'CI', 'Nombre Completo', 'Celular', 'Email', 'Especialidad', 'Año', 'Fecha/Hora Registro']
        ];
        
        // Agregar datos de asistencias
        excelData.forEach(row => {
            wsData.push([
                row['Código'],
                row['CI'],
                row['Nombre Completo'],
                row['Celular'],
                row['Email'],
                row['Especialidad'],
                row['Año'],
                row['Fecha/Hora Registro']
            ]);
        });
        
        // Crear hoja de trabajo
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Ajustar ancho de columnas
        const colWidths = [
            { wch: 12 }, // Código
            { wch: 12 }, // CI
            { wch: 25 }, // Nombre Completo
            { wch: 15 }, // Celular
            { wch: 25 }, // Email
            { wch: 20 }, // Especialidad
            { wch: 8 },  // Año
            { wch: 20 }  // Fecha/Hora Registro
        ];
        ws['!cols'] = colWidths;
        
        // Fusionar celdas para el título
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Título
            { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Fecha generación
            { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }  // Total asistencias
        ];
        
        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');
        
        // Generar nombre de archivo
        const nombreArchivo = `Asistencias_${currentEventoNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Descargar archivo Excel
        XLSX.writeFile(wb, nombreArchivo);
        
        alert('Archivo Excel exportado correctamente.');
        
    } catch (error) {
        console.error('Error exportando:', error);
        alert('Error al exportar el archivo.');
    }
}