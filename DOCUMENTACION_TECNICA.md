# 📚 Documentación Técnica - Sistema de Asistencia QR

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Base de Datos](#base-de-datos)
4. [Módulos Principales](#módulos-principales)
5. [Funciones Clave](#funciones-clave)
6. [Sistema de Escaneo QR](#sistema-de-escaneo-qr)
7. [Sistema Offline](#sistema-offline)
8. [Flujos de Trabajo](#flujos-de-trabajo)
9. [Guía de Desarrollo](#guía-de-desarrollo)

---

## 🏗️ Arquitectura del Sistema

### Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript Vanilla (ES6+)
- **Base de Datos**: Turso (SQLite en la nube)
- **Librerías**:
  - `Html5-QrCode`: Escaneo de códigos QR
  - `QRCode.js`: Generación de códigos QR
  - `XLSX.js`: Procesamiento de archivos Excel
  - `JSZip`: Compresión de archivos

### Patrón de Diseño

- **SPA (Single Page Application)**: Una sola página HTML con navegación por secciones
- **Estado Global**: Variables globales para gestionar el estado de la aplicación
- **Event-Driven**: Manejo de eventos del DOM para interacciones

---

## 📁 Estructura de Archivos

```
sistema-asistencia-supabase/
│
├── index.html                          # Página principal (SPA)
│
├── css/
│   └── styles.css                      # Estilos globales
│
├── js/
│   ├── app.js                          # Lógica principal de la aplicación
│   └── tursodb.js                      # Adaptador de base de datos Turso
│
├── fondo_escritorio.jpg                # Imagen de fondo para desktop
├── fondo_movil.png                     # Imagen de fondo para móviles
│
├── CREAR_ADMIN_SIMPLE.sql              # Script para crear usuario admin
├── CREAR_ESTRUCTURA_ESTUDIANTES.sql    # Script para crear tablas de estudiantes
├── CREAR_TABLA_ADMINISTRATIVOS.sql     # Script para crear tabla de personal
├── LIMPIAR_BD.sql                      # Script para limpiar base de datos
│
└── README.md                           # Documentación básica
```

---

## 🗄️ Base de Datos

### Tablas Principales

#### 1. **usuarios**
```sql
CREATE TABLE usuarios (
    id TEXT PRIMARY KEY,
    ci TEXT,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT,
    apellido_materno TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    celular TEXT,
    especialidad TEXT,
    codigo_unico TEXT,
    rol TEXT DEFAULT 'usuario',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **estudiantes**
```sql
CREATE TABLE estudiantes (
    id TEXT PRIMARY KEY,
    codigo_unico TEXT UNIQUE NOT NULL,
    dni TEXT,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT,
    especialidad TEXT NOT NULL,
    anio_formacion TEXT NOT NULL,
    celular TEXT,
    email TEXT,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **administrativos**
```sql
CREATE TABLE administrativos (
    id TEXT PRIMARY KEY,
    codigo_unico TEXT UNIQUE NOT NULL,
    dni TEXT,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT,
    personal TEXT NOT NULL,
    cargo TEXT NOT NULL,
    celular TEXT,
    email TEXT,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **eventos**
```sql
CREATE TABLE eventos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    imagen_url TEXT,
    usuario_id TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. **asistencias**
```sql
CREATE TABLE asistencias (
    id TEXT PRIMARY KEY,
    estudiante_id TEXT NOT NULL,
    evento_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
    FOREIGN KEY (evento_id) REFERENCES eventos(id)
);
```

#### 6. **asistencias_personal**
```sql
CREATE TABLE asistencias_personal (
    id TEXT PRIMARY KEY,
    personal_id TEXT NOT NULL,
    evento_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personal_id) REFERENCES administrativos(id),
    FOREIGN KEY (evento_id) REFERENCES eventos(id)
);
```

---

## 🧩 Módulos Principales

### 1. **Autenticación** (`login()`, `logout()`)

**Ubicación**: `js/app.js`

```javascript
async function login() {
    // Valida credenciales contra tabla usuarios
    // Almacena usuario en localStorage
    // Redirige al dashboard
}

async function logout() {
    // Limpia sesión
    // Redirige al login
}
```

**Variables de Estado**:
- `currentUser`: Usuario autenticado actual
- `currentProfile`: Perfil del usuario (admin/usuario)

---

### 2. **Gestión de Estudiantes**

#### Funciones Principales:

**`loadEstudiantes()`**
- Carga estudiantes agrupados por especialidad y año
- Genera acordeones dinámicos
- Permite generar QRs por grupo

**`agregarEstudiante()`**
- Valida campos obligatorios
- Inserta estudiante en BD
- Actualiza vista

**`procesarExcel()`**
- Lee archivo Excel (.xlsx, .xls)
- Detecta cabeceras automáticamente
- Valida datos obligatorios
- Inserta estudiantes en lote
- Maneja errores por fila

**Formato Excel Esperado**:
```
Columna A: Código único (OBLIGATORIO)
Columna B: DNI/CI
Columna C: Nombre
Columna D: Apellido paterno
Columna E: Apellido materno (opcional)
Columna F: Especialidad
Columna G: Año (PRIMERO, SEGUNDO, TERCERO, CUARTO, QUINTO)
Columna H: Celular (opcional)
Columna I: Email (opcional)
Columna J: Contraseña
```

---

### 3. **Gestión de Eventos**

#### Funciones Principales:

**`crearEvento()`**
- Valida fecha y hora
- Verifica que hora_fin > hora_inicio
- Crea evento en BD

**`validarEventoActivo(eventoId)`**
- Verifica si el evento está dentro del rango de fecha/hora
- Bloquea acceso si está fuera del rango
- Muestra alertas informativas

**`iniciarMonitoreoEvento(eventoId)`**
- Verifica cada 60 segundos si el evento sigue activo
- Redirige automáticamente si el evento finaliza
- Incluye 10 minutos de tolerancia

---

### 4. **Sistema de Escaneo QR**

#### Modos de Escaneo:

##### **Modo Cámara** (`startCameraScanner()`)

```javascript
function startCameraScanner() {
    // 1. Detiene cámara anterior si existe
    // 2. Oculta herramientas de cargar foto
    // 3. Prepara área de cámara
    // 4. Actualiza botones
    // 5. Inicializa Html5Qrcode
}
```

**Características**:
- Escaneo automático en tiempo real
- Configuración: 10 FPS, QR box 250x250
- Cámara trasera por defecto (`facingMode: "environment"`)
- Manejo de errores de permisos

##### **Modo Cargar Foto** (`showFileUpload()`)

```javascript
function showFileUpload() {
    // 1. Detiene cámara si está activa
    // 2. Oculta área de cámara
    // 3. Muestra herramientas de foto
    // 4. Actualiza botones
    // 5. Configura botón procesar
}
```

**Características**:
- Selección de archivo de imagen
- Procesamiento manual con botón
- Soporta: JPG, PNG, etc.

##### **Procesamiento de QR** (`onScanSuccess()`)

```javascript
async function onScanSuccess(qrData, decodedResult) {
    // 1. Previene escaneos duplicados (flag isScanning)
    // 2. Extrae código único del QR
    // 3. Busca en cache local primero
    // 4. Si no está en cache, busca en BD
    // 5. Verifica duplicados
    // 6. Intenta guardar online (timeout 3s)
    // 7. Si falla, guarda offline
    // 8. Muestra alerta grande
    // 9. Actualiza lista de asistencias
}
```

**Formato de QR**:
```
Nombre Completo|Especialidad/Cargo|Código Único
Ejemplo: JUAN PEREZ LOPEZ|MATEMÁTICA|EST001
```

---

### 5. **Sistema Offline**

#### Variables Globales:

```javascript
let offlineQueue = [];              // Cola de asistencias pendientes
let estudiantesCache = [];          // Cache local de estudiantes
let isAdaptiveOfflineMode = false;  // Estado del modo offline
```

#### Funciones Principales:

**`addToOfflineQueue(personaId, eventoId, timestamp, tipo)`**
- Verifica duplicados antes de agregar
- Guarda en localStorage
- Actualiza indicador visual

**`syncOfflineQueue()`**
- Procesa lote de máximo 10 asistencias
- Verifica duplicados en BD antes de insertar
- Elimina de cola solo las sincronizadas exitosamente
- Maneja errores sin perder datos

**`forceSyncOffline()`**
- Sincronización manual por botón
- Muestra resultado al usuario
- Recarga lista de asistencias

**`loadEstudiantesCache()`**
- Carga cache desde localStorage
- Se actualiza al iniciar sesión

**`updateEstudiantesCache()`**
- Actualiza cache desde BD
- Se ejecuta al entrar a tomar asistencia

#### Indicador Visual:

```javascript
function updateOfflineIndicator() {
    // Muestra cantidad de asistencias pendientes
    // Estados: pending, syncing, adaptive
}
```

---

### 6. **Generación de QR**

#### Funciones Principales:

**`generarQRsGrupoDirecto(especialidad, anio)`**
- Filtra estudiantes por especialidad y año
- Genera QR para cada estudiante
- Usa librería `qrcode.js`
- Tamaño: 120x120 px (pantalla), 295x295 px (descarga)

**`downloadSingleQR(elementId, filename)`**
- Convierte SVG a PNG
- Establece DPI a 300 para impresión
- Tamaño: 2.5cm a 300 DPI = 295px

**`downloadAllQRs()`**
- Genera ZIP con todos los QRs
- Nombre: `QRs_ESPECIALIDAD_AÑO.zip`
- Procesa en lotes para evitar bloqueos
- Muestra progreso al usuario

**Función auxiliar `setPNGDPI()`**:
- Modifica metadatos PNG
- Agrega chunk pHYs (Physical pixel dimensions)
- Calcula CRC32 para validación

---

### 7. **Exportación a Excel**

**`exportarAsistenciasExcel()`**

**Características**:
- Genera archivo Excel (.xlsx)
- Una hoja por especialidad
- Incluye TODOS los estudiantes (asistieron y faltaron)
- Calcula estados: ASISTIÓ, FALTÓ, RETRASO
- Formato con título, estadísticas y datos

**Estructura del Excel**:
```
Fila 1: REPORTE DE ASISTENCIAS - [NOMBRE EVENTO]
Fila 2: ESPECIALIDAD: [NOMBRE]
Fila 3: Estadísticas (Total, Asistieron, Faltaron, Retrasos)
Fila 4: (vacía)
Fila 5: Encabezados (Código, CI, Nombre, Año, Estado, Fecha/Hora)
Fila 6+: Datos de estudiantes
```

---

## 🔄 Flujos de Trabajo

### Flujo 1: Tomar Asistencia

```
1. Usuario entra a "Tomar Asistencia" de un evento
   ↓
2. Sistema valida que evento esté activo
   ↓
3. Muestra mensaje: "Selecciona un modo de escaneo"
   ↓
4. Usuario selecciona modo (Cámara o Cargar Foto)
   ↓
5a. MODO CÁMARA:
    - Activa cámara
    - Escanea QR automáticamente
    - Registra asistencia
   ↓
5b. MODO CARGAR FOTO:
    - Usuario selecciona imagen
    - Presiona "Procesar Imagen"
    - Sistema escanea QR de la imagen
    - Registra asistencia
   ↓
6. Sistema verifica duplicados
   ↓
7. Intenta guardar online (timeout 3s)
   ↓
8a. SI HAY CONEXIÓN:
    - Guarda en BD
    - Muestra alerta verde
   ↓
8b. SI NO HAY CONEXIÓN:
    - Guarda en cola offline
    - Muestra alerta naranja
   ↓
9. Actualiza lista de asistencias
   ↓
10. Usuario puede sincronizar manualmente con botón "Sync"
```

### Flujo 2: Carga Masiva de Estudiantes

```
1. Admin entra a "Gestión de Usuarios" > "Carga Masiva Estudiantes"
   ↓
2. Selecciona modo:
   - "Cargar Nuevos": Agrega sin eliminar existentes
   - "Actualizar Existentes": Elimina todo y carga nuevos
   ↓
3. Selecciona archivo Excel
   ↓
4. Sistema lee archivo
   ↓
5. Detecta cabeceras automáticamente
   ↓
6. Procesa fila por fila:
   - Valida campos obligatorios
   - Maneja apellido materno opcional
   - Detecta y corrige datos mal estructurados
   ↓
7. Inserta en BD
   ↓
8. Muestra resumen:
   - Exitosos
   - Errores (con detalles)
   ↓
9. Si hay errores, muestra lista expandible
```

### Flujo 3: Generación de QRs

```
1. Usuario entra a "Estudiantes" o "Personal"
   ↓
2. Navega por especialidad/año o tipo de personal
   ↓
3. Presiona botón "📥 QRs"
   ↓
4. Sistema filtra personas del grupo
   ↓
5. Genera QR para cada persona:
   - Formato: Nombre|Especialidad|Código
   - Tamaño: 120x120 px
   ↓
6. Muestra grid de QRs
   ↓
7. Usuario puede:
   - Descargar individual (PNG 300 DPI)
   - Descargar todos (ZIP)
```

---

## 🛠️ Guía de Desarrollo

### Variables Globales Importantes

```javascript
// Estado de usuario
let currentUser = null;
let currentProfile = null;

// Estado de escáner
let html5QrCode = null;
let isScanning = false;
let isFirstScan = true;

// Estado de eventos
let currentEventId = null;
let eventoTimer = null;

// Sistema offline
let offlineQueue = [];
let estudiantesCache = [];
let syncInProgress = false;

// Paginación
let currentPage = 1;
const eventsPerPage = 5;
let allEvents = [];
```

### Funciones de Navegación

```javascript
// Mostrar secciones
function showLogin()
function showDashboard()
function showAsistenciaModule()
function showEstudiantes()
function showScanner(eventoId, eventoNombre)
function showCreateEvent()

// Ocultar todas las secciones
function hideAllSections()
```

### Funciones de Utilidad

```javascript
// Formateo
function formatearNombreCompleto(nombre, apellidoP, apellidoM)
function formatearCampoOpcional(valor, valorPorDefecto)

// Mensajes
function showMessage(text, type)
function showBigAlert(nombre, tipo, mensaje)

// Validación
function isAdmin()
function isUsuario()
```

### Manejo de Errores

**Estrategia**:
1. Try-catch en todas las operaciones async
2. Logs detallados en consola
3. Mensajes amigables al usuario
4. Fallback a modo offline si falla conexión

**Ejemplo**:
```javascript
try {
    const result = await tursodb.query('SELECT * FROM estudiantes');
    // Procesar resultado
} catch (error) {
    console.error('Error cargando estudiantes:', error);
    alert('Error de conexión. Intenta nuevamente.');
}
```

### Timeouts y Delays

```javascript
// Timeout para operaciones de BD
const TIMEOUT_BD = 3000; // 3 segundos

// Delay para inicializar cámara
const DELAY_CAMERA = 300; // 300 ms

// Delay entre escaneos
const DELAY_SCAN = 5000; // 5 segundos

// Intervalo de monitoreo de evento
const INTERVAL_EVENTO = 60000; // 60 segundos
```

### LocalStorage

**Claves utilizadas**:
```javascript
'currentUser'           // Usuario autenticado
'asistencias_offline'   // Cola de asistencias pendientes
'estudiantes_cache'     // Cache de estudiantes
```

---

## 🐛 Debugging

### Logs en Consola

El sistema incluye logs detallados con emojis para facilitar el debugging:

```javascript
console.log('🚀 Escáner iniciado')
console.log('📷 Modo CÁMARA activado')
console.log('📁 Modo CARGAR FOTO activado')
console.log('✅ Operación exitosa')
console.log('❌ Error detectado')
console.log('🛑 Deteniendo proceso')
console.log('🔄 Sincronizando...')
```

### Herramientas de Desarrollo

**Chrome DevTools**:
1. F12 para abrir
2. Console: Ver logs
3. Network: Ver peticiones a BD
4. Application > Local Storage: Ver datos guardados
5. Application > Cache Storage: Ver cache

### Problemas Comunes

**1. Cámara no se activa**
- Verificar permisos del navegador
- Revisar consola para errores
- Probar en HTTPS (requerido para cámara)

**2. QR no se escanea**
- Verificar formato del QR
- Asegurar buena iluminación
- Probar con modo "Cargar Foto"

**3. Asistencias no se guardan**
- Verificar conexión a internet
- Revisar cola offline en localStorage
- Usar botón "Sync" para sincronizar

**4. Excel no se procesa**
- Verificar formato de columnas
- Revisar que tenga datos
- Ver detalles de errores en pantalla

---

## 📝 Notas Adicionales

### Seguridad

- Contraseñas almacenadas en texto plano (⚠️ MEJORAR en producción)
- Validación de roles en frontend (⚠️ Agregar validación en backend)
- Sin protección CSRF (⚠️ Implementar tokens)

### Performance

- Cache de estudiantes para reducir consultas
- Procesamiento en lotes para Excel
- Timeouts para evitar bloqueos
- Lazy loading de eventos (paginación)

### Mejoras Futuras

1. Implementar hash de contraseñas (bcrypt)
2. Agregar validación de roles en backend
3. Implementar WebSockets para sincronización en tiempo real
4. Agregar reportes avanzados con gráficos
5. Implementar notificaciones push
6. Agregar soporte para múltiples idiomas

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar esta documentación
2. Verificar logs en consola
3. Revisar código fuente con comentarios
4. Contactar al equipo de desarrollo

---

**Última actualización**: Marzo 2026
**Versión**: 1.0.0
