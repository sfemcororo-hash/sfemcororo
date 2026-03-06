-- CREAR USUARIO ADMIN DESDE SQL
-- Ejecuta esto en SQL Editor

-- Insertar usuario en auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@escuela.com',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    '{"nombre": "Administrador", "rol": "admin"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Verificar que se creó
SELECT email, raw_user_meta_data->>'nombre' as nombre, raw_user_meta_data->>'rol' as rol
FROM auth.users
WHERE email = 'admin@escuela.com';

-- Verificar que el perfil se creó automáticamente
SELECT * FROM perfiles WHERE email = 'admin@escuela.com';
