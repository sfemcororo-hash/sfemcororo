-- ELIMINAR TODOS LOS ESTUDIANTES Y DATOS RELACIONADOS
DELETE FROM asistencias;
DELETE FROM estudiantes;
DELETE FROM eventos;

-- Verificar que todo esté limpio
SELECT 'Estudiantes eliminados: ' || COUNT(*) FROM estudiantes;
SELECT 'Asistencias eliminadas: ' || COUNT(*) FROM asistencias;
SELECT 'Eventos eliminados: ' || COUNT(*) FROM eventos;