-- MIGRAR EVENTOS EXISTENTES AL ADMIN
-- Asignar todos los eventos existentes al usuario admin

UPDATE eventos 
SET usuario_id = (
    SELECT id FROM auth.users WHERE email = 'admin@escuela.com'
)
WHERE usuario_id IS NULL;

-- Verificar
SELECT id, nombre, usuario_id FROM eventos;
