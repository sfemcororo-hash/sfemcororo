# 📁 Estructura Modular del Proyecto

## Organización de Archivos

```
public/
├── index.html              # Versión monolítica (actual)
├── index-modular.html      # Versión modular (nueva)
├── views/                  # Vistas HTML separadas
│   ├── login.html
│   ├── dashboard.html
│   ├── estudiantes.html
│   ├── crear-evento.html
│   ├── asistencias.html
│   └── generar-qr.html
├── js/
│   ├── config.js          # Configuración de Supabase
│   ├── router.js          # Manejo de navegación
│   ├── main.js            # Inicialización de la app
│   ├── modules/           # Módulos por funcionalidad
│   │   ├── auth.js        # Autenticación
│   │   ├── eventos.js     # Gestión de eventos
│   │   ├── estudiantes.js # Gestión de estudiantes
│   │   ├── asistencias.js # Toma de asistencia
│   │   └── qr.js          # Generación de QR
│   └── app.js             # Versión monolítica (actual)
└── css/
    └── styles.css         # Estilos globales
```

## Ventajas de la Estructura Modular

### 1. Mantenibilidad
- Cada módulo tiene una responsabilidad única
- Fácil localizar y corregir errores
- Cambios aislados no afectan otros módulos

### 2. Escalabilidad
- Agregar nuevas funcionalidades sin tocar código existente
- Módulos independientes y reutilizables

### 3. Colaboración
- Múltiples desarrolladores pueden trabajar en paralelo
- Menos conflictos en control de versiones

### 4. Testing
- Probar módulos individuales
- Debugging más sencillo

## Cómo Usar la Versión Modular

### Opción 1: Usar index-modular.html

```bash
# Abre el archivo modular
open public/index-modular.html
```

### Opción 2: Migrar Gradualmente

1. Mantén `index.html` como respaldo
2. Desarrolla nuevas funciones en módulos
3. Prueba con `index-modular.html`
4. Cuando esté estable, reemplaza `index.html`

## Módulos Disponibles

### auth.js
- `login()` - Autenticación de usuarios
- `logout()` - Cerrar sesión
- `getCurrentUser()` - Obtener usuario actual

### eventos.js
- `crearEvento()` - Crear nuevo evento
- `loadEventos()` - Cargar lista de eventos
- `showCreateEvent()` - Mostrar formulario

### estudiantes.js
- `loadEstudiantes()` - Cargar estudiantes
- `agregarEstudiante()` - Agregar nuevo estudiante
- `showCrearEspecialidad()` - Mostrar formulario

### asistencias.js
- `startScanner()` - Iniciar escáner QR
- `onScanSuccess()` - Procesar código escaneado
- `loadAsistencias()` - Cargar lista de asistencias

### qr.js
- `generarQRsGrupo()` - Generar QR por grupo
- `downloadSingleQR()` - Descargar QR individual
- `downloadAllQRs()` - Descargar todos los QR

## Router

El router maneja la navegación entre vistas:

```javascript
// Cargar una vista
loadView('dashboard');

// Mostrar secciones
showLogin();
showDashboard();
showEstudiantes();
```

## Migración Paso a Paso

### Paso 1: Probar Versión Modular
```bash
# Servidor local
python -m http.server 8000
# Abre: http://localhost:8000/public/index-modular.html
```

### Paso 2: Verificar Funcionalidad
- Login funciona
- Dashboard carga eventos
- Estudiantes se muestran correctamente
- Asistencias se registran
- QR se generan

### Paso 3: Reemplazar (Opcional)
```bash
# Backup del original
cp public/index.html public/index-backup.html

# Reemplazar
cp public/index-modular.html public/index.html
```

## Notas Importantes

⚠️ **La versión modular requiere servidor HTTP**
- No funciona con `file://` por CORS
- Usa servidor local para desarrollo

✅ **Compatibilidad**
- Ambas versiones funcionan en paralelo
- Puedes cambiar entre ellas sin problemas
- Los datos en Supabase son compartidos

## Próximos Pasos

1. Completar migración de todas las vistas
2. Agregar lazy loading de módulos
3. Implementar sistema de componentes
4. Optimizar carga de recursos
