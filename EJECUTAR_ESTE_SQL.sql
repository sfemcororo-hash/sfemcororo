-- ============================================
-- MIGRACIÓN: SUPABASE AUTH + ROLES
-- ============================================

-- 1. Crear tabla de perfiles con roles
CREATE TABLE perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'usuario')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Modificar tabla eventos para usar auth.users
ALTER TABLE eventos 
DROP COLUMN docente_id,
ADD COLUMN usuario_id UUID REFERENCES auth.users(id);

-- 3. Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS - PERFILES
CREATE POLICY "Usuarios ven su perfil"
ON perfiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins ven todos los perfiles"
ON perfiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND rol = 'admin'
    )
);

-- POLÍTICAS RLS - ESTUDIANTES
CREATE POLICY "Admins gestionan estudiantes"
ON estudiantes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND rol = 'admin'
    )
);

CREATE POLICY "Usuarios ven estudiantes"
ON estudiantes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND rol = 'usuario'
    )
);

-- POLÍTICAS RLS - EVENTOS
CREATE POLICY "Admins gestionan eventos"
ON eventos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND rol = 'admin'
    )
);

CREATE POLICY "Usuarios ven eventos activos"
ON eventos FOR SELECT
USING (activo = true);

CREATE POLICY "Usuarios crean sus eventos"
ON eventos FOR INSERT
WITH CHECK (
    auth.uid() = usuario_id AND
    EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND rol = 'usuario'
    )
);

CREATE POLICY "Usuarios editan sus eventos"
ON eventos FOR UPDATE
USING (auth.uid() = usuario_id);

-- POLÍTICAS RLS - ASISTENCIAS
CREATE POLICY "Admins gestionan asistencias"
ON asistencias FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND rol = 'admin'
    )
);

CREATE POLICY "Usuarios registran asistencias"
ON asistencias FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM eventos
        WHERE id = evento_id AND usuario_id = auth.uid()
    )
);

CREATE POLICY "Usuarios ven asistencias de sus eventos"
ON asistencias FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM eventos
        WHERE id = evento_id AND usuario_id = auth.uid()
    )
);

-- FUNCIÓN: Crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrar usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ELIMINAR TABLA ANTIGUA
DROP TABLE IF EXISTS docentes CASCADE;
