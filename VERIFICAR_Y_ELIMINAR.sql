-- VERIFICAR QUE DATOS EXISTEN
SELECT * FROM estudiantes;

-- ELIMINAR ESPECÍFICAMENTE ESTOS ESTUDIANTES
DELETE FROM estudiantes WHERE codigo_unico IN ('EST006', 'EST007', 'EST008');
DELETE FROM estudiantes WHERE nombre IN ('edward', 'juan', 'jhoely');
DELETE FROM estudiantes WHERE dni IN ('7486511', '7932446', '789456465');

-- ELIMINAR TODO POR SI ACASO
DELETE FROM estudiantes;
DELETE FROM asistencias;
DELETE FROM eventos;

-- VERIFICAR QUE ESTÉ VACÍO
SELECT COUNT(*) as total_estudiantes FROM estudiantes;