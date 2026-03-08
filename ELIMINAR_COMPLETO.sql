-- ELIMINAR COMPLETAMENTE TODOS LOS DATOS
DELETE FROM asistencias WHERE 1=1;
DELETE FROM estudiantes WHERE 1=1;
DELETE FROM eventos WHERE 1=1;

-- Verificar eliminación
SELECT 'Estudiantes restantes: ' || COUNT(*) as resultado FROM estudiantes
UNION ALL
SELECT 'Asistencias restantes: ' || COUNT(*) FROM asistencias
UNION ALL
SELECT 'Eventos restantes: ' || COUNT(*) FROM eventos;