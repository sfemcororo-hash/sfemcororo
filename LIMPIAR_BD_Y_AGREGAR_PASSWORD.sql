-- LIMPIAR TODA LA BASE DE DATOS Y AGREGAR CONTRASEÑA A ESTUDIANTES

-- Eliminar todas las asistencias
DELETE FROM asistencias;
DELETE FROM asistencias_personal;

-- Eliminar todos los estudiantes
DELETE FROM estudiantes;

-- Eliminar todo el personal administrativo
DELETE FROM administrativos;

-- Eliminar todos los eventos (excepto los que puedan tener referencias)
DELETE FROM eventos;

-- Eliminar usuarios (excepto el admin principal)
DELETE FROM usuarios WHERE email != 'admin@escuela.com';

-- Recrear tabla de estudiantes con contraseña
DROP TABLE IF EXISTS estudiantes_nueva;

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
    password TEXT NOT NULL DEFAULT 'estudiante123', -- Nueva columna de contraseña
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Eliminar tabla antigua y renombrar
DROP TABLE IF EXISTS estudiantes;
ALTER TABLE estudiantes_nueva RENAME TO estudiantes;

-- Mensaje de confirmación
SELECT 'Base de datos limpiada y tabla estudiantes actualizada con columna password' as resultado;