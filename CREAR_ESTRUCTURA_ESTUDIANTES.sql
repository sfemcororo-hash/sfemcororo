-- VERIFICAR ESTRUCTURA ACTUAL
PRAGMA table_info(estudiantes);

-- CREAR TABLA ESTUDIANTES CON ESTRUCTURA CORRECTA
CREATE TABLE IF NOT EXISTS estudiantes_nueva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_unico TEXT UNIQUE NOT NULL,
    dni TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT NOT NULL,
    especialidad TEXT NOT NULL,
    anio_formacion TEXT NOT NULL,
    celular TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MIGRAR DATOS SI EXISTEN
INSERT INTO estudiantes_nueva (codigo_unico, dni, nombre, apellido_paterno, apellido_materno, especialidad, anio_formacion, celular, email)
SELECT codigo_unico, dni, nombre, apellido_paterno, apellido_materno, especialidad, 
       CASE 
           WHEN anio = 1 THEN 'PRIMERO'
           WHEN anio = 2 THEN 'SEGUNDO'
           WHEN anio = 3 THEN 'TERCERO'
           WHEN anio = 4 THEN 'CUARTO'
           WHEN anio = 5 THEN 'QUINTO'
           ELSE anio_formacion
       END as anio_formacion,
       celular, email
FROM estudiantes
WHERE EXISTS (SELECT 1 FROM estudiantes);

-- RENOMBRAR TABLAS
DROP TABLE IF EXISTS estudiantes_old;
ALTER TABLE estudiantes RENAME TO estudiantes_old;
ALTER TABLE estudiantes_nueva RENAME TO estudiantes;

-- VERIFICAR RESULTADO
SELECT COUNT(*) as total_estudiantes FROM estudiantes;
SELECT * FROM estudiantes LIMIT 3;