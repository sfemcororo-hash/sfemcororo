-- Tabla de docentes
CREATE TABLE docentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de estudiantes
CREATE TABLE estudiantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_unico TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de eventos
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    fecha DATE NOT NULL,
    imagen_url TEXT,
    docente_id UUID REFERENCES docentes(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de asistencias
CREATE TABLE asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID REFERENCES estudiantes(id),
    evento_id UUID REFERENCES eventos(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    UNIQUE(estudiante_id, evento_id)
);

-- Deshabilitar RLS
ALTER TABLE docentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias DISABLE ROW LEVEL SECURITY;

-- Insertar docente
INSERT INTO docentes (email, password, nombre) VALUES
('sfem.cororo@gmail.com', 'Scemcororo2026', 'Usuario Principal');

-- Insertar estudiantes
INSERT INTO estudiantes (codigo_unico, nombre, apellido, email) VALUES
('EST001', 'María', 'García', 'maria@estudiante.com'),
('EST002', 'Carlos', 'López', 'carlos@estudiante.com'),
('EST003', 'Ana', 'Martínez', 'ana@estudiante.com'),
('EST004', 'Luis', 'Rodríguez', 'luis@estudiante.com'),
('EST005', 'Sofía', 'Fernández', 'sofia@estudiante.com');
