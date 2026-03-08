-- LIMPIAR BASE DE DATOS MANTENIENDO SOLO ADMIN
-- Eliminar todas las asistencias
DELETE FROM asistencias;

-- Eliminar todos los estudiantes
DELETE FROM estudiantes;

-- Eliminar todos los eventos
DELETE FROM eventos;

-- Mantener solo el usuario admin (admin@escuela.com)
-- No eliminamos usuarios para conservar el acceso

-- Mensaje de confirmación
SELECT 'Base de datos limpiada. Solo se mantiene el usuario administrador.' as mensaje;