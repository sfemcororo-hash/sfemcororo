// Script para limpiar la base de datos y agregar columna password
async function ejecutarLimpiezaBD() {
    console.log('🗃️ Iniciando limpieza de base de datos...');
    
    try {
        // 1. Eliminar todas las asistencias
        console.log('1. Eliminando asistencias...');
        await tursodb.query('DELETE FROM asistencias');
        
        // 2. Eliminar asistencias de personal (si existe la tabla)
        try {
            await tursodb.query('DELETE FROM asistencias_personal');
        } catch (e) {
            console.log('Tabla asistencias_personal no existe, continuando...');
        }
        
        // 3. Eliminar todos los estudiantes
        console.log('2. Eliminando estudiantes...');
        await tursodb.query('DELETE FROM estudiantes');
        
        // 4. Eliminar personal administrativo
        console.log('3. Eliminando personal administrativo...');
        try {
            await tursodb.query('DELETE FROM administrativos');
        } catch (e) {
            console.log('Tabla administrativos no existe, continuando...');
        }
        
        // 5. Eliminar eventos
        console.log('4. Eliminando eventos...');
        await tursodb.query('DELETE FROM eventos');
        
        // 6. Eliminar usuarios (excepto admin)
        console.log('5. Eliminando usuarios (excepto admin)...');
        await tursodb.query('DELETE FROM usuarios WHERE email != ?', ['admin@escuela.com']);
        
        // 7. Recrear tabla estudiantes con password
        console.log('6. Recreando tabla estudiantes con columna password...');
        
        // Eliminar tabla temporal si existe
        await tursodb.query('DROP TABLE IF EXISTS estudiantes_nueva');
        
        // Crear nueva tabla con password
        await tursodb.query(`
            CREATE TABLE estudiantes_nueva (
                id TEXT PRIMARY KEY,
                codigo_unico TEXT UNIQUE NOT NULL,
                dni TEXT NOT NULL,
                nombre TEXT NOT NULL,
                apellido_paterno TEXT NOT NULL,
                apellido_materno TEXT,
                especialidad TEXT NOT NULL,
                anio_formacion TEXT NOT NULL,
                celular TEXT,
                email TEXT,
                password TEXT NOT NULL DEFAULT 'estudiante123',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Eliminar tabla antigua y renombrar
        await tursodb.query('DROP TABLE IF EXISTS estudiantes');
        await tursodb.query('ALTER TABLE estudiantes_nueva RENAME TO estudiantes');
        
        console.log('✅ Base de datos limpiada exitosamente');
        console.log('✅ Tabla estudiantes actualizada con columna password');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        return false;
    }
}

// Ejecutar la limpieza
ejecutarLimpiezaBD().then(success => {
    if (success) {
        alert('✅ Base de datos limpiada exitosamente\\n\\n• Todos los datos eliminados\\n• Tabla estudiantes actualizada con columna password\\n• Solo queda el usuario admin');
    } else {
        alert('❌ Error durante la limpieza de la base de datos\\n\\nRevisa la consola para más detalles');
    }
});