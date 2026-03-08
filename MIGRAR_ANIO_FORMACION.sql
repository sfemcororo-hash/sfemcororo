-- ACTUALIZAR ESTRUCTURA DE ESTUDIANTES
-- Cambiar campo anio a anio_formacion y actualizar valores

-- 1. Agregar nueva columna anio_formacion
ALTER TABLE estudiantes ADD COLUMN anio_formacion TEXT;

-- 2. Migrar datos de anio a anio_formacion con valores literales
UPDATE estudiantes SET anio_formacion = 
    CASE 
        WHEN anio = 1 THEN 'PRIMERO'
        WHEN anio = 2 THEN 'SEGUNDO'
        WHEN anio = 3 THEN 'TERCERO'
        WHEN anio = 4 THEN 'CUARTO'
        WHEN anio = 5 THEN 'QUINTO'
        ELSE 'PRIMERO'
    END;

-- 3. Eliminar columna anio antigua (opcional, comentado por seguridad)
-- ALTER TABLE estudiantes DROP COLUMN anio;

-- Verificar la migración
SELECT codigo_unico, nombre, especialidad, anio_formacion 
FROM estudiantes 
ORDER BY especialidad, anio_formacion;