# 🎓 Sistema de Asistencia con QR - Supabase

Sistema completo de gestión de asistencia para instituciones educativas usando códigos QR, con gestión de estudiantes por especialidad y año.

## ✅ Stack Tecnológico (100% Gratis)

- **Supabase** - Base de datos PostgreSQL + Storage
- **html5-qrcode** - Escáner QR desde cámara o imagen
- **qrcode.js** - Generador de códigos QR
- **JavaScript Vanilla** - Frontend sin frameworks

---

## 📁 Estructura del Proyecto

```
sistema-asistencia-supabase/
├── public/
│   ├── css/
│   │   └── styles.css          # Estilos con acordeones y diseño responsive
│   ├── js/
│   │   ├── config.js           # Configuración de Supabase
│   │   └── app.js              # Lógica principal de la aplicación
│   └── index.html              # Aplicación principal
└── README.md                   # Este archivo
```

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### PASO 1: Crear Proyecto Supabase (3 min)

1. Ve a: https://supabase.com
2. Click **"Start your project"**
3. Sign up con GitHub/Google
4. Click **"New Project"**
5. Configuración:
   - Name: `asistencia-qr`
   - Database Password: **Guarda tu contraseña**
   - Region: **South America (São Paulo)** (o la más cercana)
   - Plan: **Free** ✅
6. Click **"Create new project"**
7. Espera ~2 minutos

---

### PASO 2: Crear Estructura de Base de Datos (5 min)

En Supabase Dashboard → **SQL Editor** → **New Query**

Ejecuta este script completo:

```sql
-- ============================================
-- CREAR TABLAS
-- ============================================

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
    especialidad TEXT,
    anio INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de eventos
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
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

-- ============================================
-- DESHABILITAR ROW LEVEL SECURITY
-- ============================================

ALTER TABLE docentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- Insertar docente de prueba
INSERT INTO docentes (email, password, nombre) VALUES
('docente@escuela.com', 'admin123', 'Docente Principal');

-- Insertar estudiantes de prueba
INSERT INTO estudiantes (codigo_unico, nombre, apellido, email, especialidad, anio) VALUES
('EST001', 'María', 'García', 'maria@estudiante.com', 'Ingeniería de Sistemas', 3),
('EST002', 'Carlos', 'López', 'carlos@estudiante.com', 'Ingeniería Industrial', 2),
('EST003', 'Ana', 'Martínez', 'ana@estudiante.com', 'Ingeniería Civil', 4),
('EST004', 'Luis', 'Rodríguez', 'luis@estudiante.com', 'Ingeniería de Sistemas', 1),
('EST005', 'Sofía', 'Fernández', 'sofia@estudiante.com', 'Ingeniería Electrónica', 3);
```

---

### PASO 3: Habilitar Storage (1 min)

1. En Supabase → **Storage** → **New bucket**
2. Name: `eventos`
3. Public: ✅ **Yes**
4. Click **Create**

---

### PASO 4: Configurar Credenciales (2 min)

1. En Supabase → **Settings** → **API**
2. Busca la sección **"Project API keys"**
3. Copia:
   - **URL**: `https://xxxxx.supabase.co`
   - **anon public** (JWT key que empieza con `eyJ...`)

4. Edita el archivo `public/js/config.js`:

```javascript
const SUPABASE_URL = 'TU_URL_AQUI';
const SUPABASE_KEY = 'TU_ANON_KEY_AQUI';

var supabase;

window.addEventListener('DOMContentLoaded', () => {
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
});
```

---

## 🎯 FUNCIONALIDADES

### 1. Gestión de Estudiantes
- **Organización por Especialidad y Año**: Acordeones desplegables
- **Especialidades disponibles**:
  - Ingeniería de Sistemas
  - Ingeniería Industrial
  - Ingeniería Civil
  - Ingeniería Electrónica
  - Ingeniería Mecánica
  - Ingeniería Química
  - Arquitectura
  - Administración
  - Contabilidad
  - Derecho
- **Años**: Primero, Segundo, Tercero, Cuarto, Quinto
- **Agregar estudiantes** por especialidad/año
- **Generar códigos QR** por grupo completo

### 2. Gestión de Eventos
- **Crear eventos** con:
  - Nombre del evento
  - Fecha inicio y fin
  - Hora inicio y fin
  - Imagen opcional (subida a Supabase Storage)
- **Validaciones**:
  - Fecha fin no puede ser anterior a fecha inicio
  - Si es el mismo día, hora fin debe ser posterior a hora inicio

### 3. Toma de Asistencia
- **Escaneo por cámara** (si está disponible)
- **Subir imagen de QR** (alternativa sin cámara)
- **Registro automático** con validación de duplicados
- **Visualización en tiempo real** con:
  - Nombre completo
  - Código único
  - Especialidad y año
  - Hora de registro

### 4. Generación de Códigos QR
- **Integrado en la aplicación**
- **Por grupo** (especialidad + año)
- **Descarga individual** o **descarga masiva**
- **Formato PNG** de alta calidad

---

## 🖥️ USO DE LA APLICACIÓN

### Iniciar Sesión
1. Abre `public/index.html` en tu navegador
2. Credenciales por defecto:
   - Email: `docente@escuela.com`
   - Password: `admin123`

### Gestionar Estudiantes
1. Click en **"👥 Estudiantes"**
2. Navega por especialidades y años (acordeones desplegables)
3. **Agregar estudiante**: Click en "+ Agregar" en el año deseado
4. **Generar QRs**: Click en "📥 QRs" para generar códigos del grupo
5. Los QR se generan automáticamente y puedes descargarlos individual o masivamente

### Crear Evento
1. En el dashboard, click **"+ Crear Evento"**
2. Completa:
   - Nombre del evento
   - Fechas (inicio y fin)
   - Horas (inicio y fin)
   - Imagen (opcional)
3. Click **"Crear Evento"**

### Tomar Asistencia
1. En el evento, click **"Tomar Asistencia"**
2. Opciones:
   - **Con cámara**: Escanea el QR directamente
   - **Sin cámara**: Sube una imagen del QR
3. La asistencia se registra automáticamente
4. Visualiza la lista de asistentes en tiempo real

---

## 🔧 PERSONALIZACIÓN

### Agregar más especialidades
Edita `public/index.html`, sección de select:

```html
<select id="nueva-especialidad">
    <option value="Tu Nueva Especialidad">Tu Nueva Especialidad</option>
</select>
```

### Cambiar colores
Edita `public/css/styles.css`:

```css
.accordion-header {
    background: #667eea; /* Color principal */
}
```

### Modificar años disponibles
Edita el select de años en `public/index.html`

---

## 📱 DEPLOYMENT

### Opción 1: GitHub Pages (Gratis)
1. Sube el proyecto a GitHub
2. Settings → Pages → Source: main branch
3. Tu app estará en: `https://tuusuario.github.io/repo`

### Opción 2: Vercel (Gratis)
1. Instala Vercel CLI: `npm i -g vercel`
2. En la carpeta del proyecto: `vercel`
3. Sigue las instrucciones

### Opción 3: Netlify (Gratis)
1. Arrastra la carpeta `public` a netlify.com/drop
2. Tu app estará lista en segundos

---

## 🔒 SEGURIDAD

⚠️ **IMPORTANTE**: Este sistema usa autenticación básica para demostración.

**Para producción, implementa**:
- Supabase Auth (autenticación real)
- Hash de contraseñas (bcrypt)
- Row Level Security (RLS) con políticas
- HTTPS obligatorio

---

## 🔗 RECURSOS Y CREDENCIALES

### Proyecto Actual

**Supabase Project:**
- URL: `https://fjselqntjcrhrkvugbca.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqc2VscW50amNyaHJrdnVnYmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzQyMTAsImV4cCI6MjA4ODMxMDIxMH0._dcOllU3A4AkMdwORavJKn2veFTAao5EuPEE58x5E-Q`
- Database Password: `Esfencororo2026`

**Credenciales de Acceso:**
- Email: `sfem.cororo@gmail.com`
- Password: `Sfemcororo2026`

### Librerías CDN Utilizadas

**Supabase JS Client:**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.js"></script>
```
- Documentación: https://supabase.com/docs/reference/javascript
- GitHub: https://github.com/supabase/supabase-js

**HTML5 QR Code Scanner:**
```html
<script src="https://unpkg.com/html5-qrcode"></script>
```
- Documentación: https://github.com/mebjas/html5-qrcode
- NPM: https://www.npmjs.com/package/html5-qrcode

**QRCode.js Generator:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
```
- GitHub: https://github.com/davidshimjs/qrcodejs
- CDN: https://cdnjs.com/libraries/qrcodejs

### Servicios Externos

**Supabase (Backend):**
- Website: https://supabase.com
- Dashboard: https://app.supabase.com
- Documentación: https://supabase.com/docs
- Pricing: https://supabase.com/pricing (Plan Free disponible)

**Storage Bucket:**
- Nombre: `eventos`
- Tipo: Public
- Uso: Almacenar imágenes de eventos

### Opciones de Deployment

**GitHub Pages:**
- Website: https://pages.github.com
- Documentación: https://docs.github.com/pages
- Costo: Gratis

**Vercel:**
- Website: https://vercel.com
- Documentación: https://vercel.com/docs
- Costo: Gratis para proyectos personales

**Netlify:**
- Website: https://www.netlify.com
- Documentación: https://docs.netlify.com
- Costo: Gratis para proyectos personales

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error 401 Unauthorized
- Verifica que RLS esté deshabilitado
- Confirma que la anon key sea correcta (JWT largo)

### Error 406 Not Acceptable
- Usa la clave JWT anon, no la publishable key
- Verifica que las tablas existan

### No se ve la cámara
- Usa HTTPS o localhost
- Permite permisos de cámara en el navegador
- Usa la opción de subir imagen como alternativa

### Los QR no se generan
- Verifica que la librería qrcode.js esté cargada
- Revisa la consola del navegador (F12)

---

## 📄 LICENCIA

MIT License - Uso libre para proyectos educativos y comerciales

---

## 👨‍💻 SOPORTE

Para dudas o problemas:
1. Revisa la consola del navegador (F12)
2. Verifica la configuración de Supabase
3. Confirma que todas las tablas existan

---

## 🎉 ¡Listo para usar!

Sistema completo de asistencia con QR, 100% funcional y gratis.

---

## 📦 IMPORTACIÓN DEL PROYECTO

### Opción 1: Clonar desde GitHub

```bash
git clone https://github.com/tu-usuario/sistema-asistencia-supabase.git
cd sistema-asistencia-supabase
```

### Opción 2: Descargar ZIP

1. Descarga el proyecto como ZIP
2. Extrae en tu carpeta deseada
3. Navega a la carpeta del proyecto

### Opción 3: Copiar Archivos Manualmente

**Estructura de archivos necesaria:**

```
tu-proyecto/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── config.js
│   │   └── app.js
│   └── index.html
└── README.md
```

**Nota:** El archivo `generar-qr.html` fue eliminado ya que la funcionalidad está integrada en la aplicación principal.

### Pasos para Configurar en Nuevo Entorno

**1. Copiar Archivos**
```bash
# Copia toda la carpeta del proyecto
cp -r sistema-asistencia-supabase /ruta/destino/
```

**2. Configurar Supabase**

Edita `public/js/config.js` con tus credenciales:

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = 'tu-anon-key-aqui';

var supabase;

window.addEventListener('DOMContentLoaded', () => {
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
});
```

**3. Crear Base de Datos**

Ejecuta el SQL completo del **PASO 2** en tu nuevo proyecto Supabase

**4. Configurar Storage**

Crea el bucket `eventos` como se indica en el **PASO 3**

**5. Probar Localmente**

```bash
# Opción A: Abrir directamente
open public/index.html  # macOS
start public/index.html # Windows
xdg-open public/index.html # Linux

# Opción B: Servidor local simple
python -m http.server 8000
# Luego abre: http://localhost:8000/public/

# Opción C: Con Node.js
npx http-server public -p 8000
```

**6. Verificar Funcionamiento**

- Abre la aplicación en el navegador
- Inicia sesión con las credenciales por defecto
- Verifica que puedas ver el dashboard
- Prueba crear un evento
- Prueba agregar un estudiante

### Migracion de Datos Existentes

**Exportar datos del proyecto actual:**

```sql
-- En Supabase SQL Editor del proyecto original
COPY (SELECT * FROM docentes) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM estudiantes) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM eventos) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM asistencias) TO STDOUT WITH CSV HEADER;
```

**Importar en nuevo proyecto:**

1. Ve a Supabase Dashboard → Table Editor
2. Selecciona cada tabla
3. Click en "Insert" → "Import data from CSV"
4. Sube los archivos CSV exportados

### Requisitos del Sistema

**Navegadores Compatibles:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Permisos Necesarios:**
- Acceso a cámara (opcional, para escaneo QR)
- JavaScript habilitado
- Cookies habilitadas

**No Requiere:**
- Node.js (opcional, solo para servidor local)
- Base de datos local
- Instalación de dependencias
