-- ============================================
-- CREAR USUARIOS DE PRUEBA
-- ============================================

-- IMPORTANTE: Ejecuta esto DESPUÉS de migration_auth_roles.sql

-- ============================================
-- OPCIÓN 1: Desde Supabase Dashboard (RECOMENDADO)
-- ============================================

-- 1. Ve a: Authentication → Users → Add User
-- 2. Completa:
--    - Email: admin@escuela.com
--    - Password: Admin123!
--    - User Metadata: {"nombre": "Administrador", "rol": "admin"}
-- 3. Click "Create User"
-- 
-- Repite para crear usuarios normales con rol "usuario"

-- ============================================
-- OPCIÓN 2: Desde SQL (Solo Desarrollo)
-- ============================================

-- NOTA: Esto requiere acceso directo a auth.users
-- Solo funciona si tienes permisos de superusuario

-- Usuario Admin
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
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
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Usuario Normal 1
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
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
    'docente1@escuela.com',
    crypt('Docente123!', gen_salt('bf')),
    NOW(),
    '{"nombre": "Docente 1", "rol": "usuario"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Usuario Normal 2
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
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
    'docente2@escuela.com',
    crypt('Docente123!', gen_salt('bf')),
    NOW(),
    '{"nombre": "Docente 2", "rol": "usuario"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- ============================================
-- VERIFICAR USUARIOS CREADOS
-- ============================================

-- Ver usuarios en auth
SELECT id, email, raw_user_meta_data->>'nombre' as nombre, raw_user_meta_data->>'rol' as rol
FROM auth.users;

-- Ver perfiles creados automáticamente
SELECT * FROM perfiles;

-- ============================================
-- CREDENCIALES DE ACCESO
-- ============================================

-- ADMIN:
-- Email: admin@escuela.com
-- Password: Admin123!
-- Permisos: Gestión completa (estudiantes, eventos, asistencias)

-- USUARIO 1:
-- Email: docente1@escuela.com
-- Password: Docente123!
-- Permisos: Solo sus eventos y asistencias

-- USUARIO 2:
-- Email: docente2@escuela.com
-- Password: Docente123!
-- Permisos: Solo sus eventos y asistencias
