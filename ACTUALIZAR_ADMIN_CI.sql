-- ACTUALIZAR CI DEL ADMIN EXISTENTE
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'),
    '{ci}',
    '"79310777"'
)
WHERE email = 'admin@escuela.com';

-- Verificar la actualización
SELECT email, raw_user_meta_data->>'ci' as ci, raw_user_meta_data->>'nombre' as nombre
FROM auth.users 
WHERE email = 'admin@escuela.com';