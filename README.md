# Sistema de Asistencia QR

Sistema web para registro de asistencias mediante códigos QR, desarrollado para instituciones educativas.

## 🚀 Características

- **Autenticación segura** con roles (admin/usuario)
- **Gestión de estudiantes** por especialidad y año
- **Creación de eventos** con validación de fecha/hora
- **Escaneo QR** con cámara o subida de imagen
- **Generación masiva de QRs** por grupo
- **Base de datos en la nube** con Turso (SQLite)
- **Responsive design** para móviles y desktop

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Base de datos**: Turso (SQLite en la nube)
- **Librerías**: Html5-QrCode, QRCode.js
- **Hosting**: GitHub Pages

## 📦 Instalación

1. Clona el repositorio
2. Configura las credenciales de Turso en `js/tursodb.js`
3. Ejecuta `CREAR_ADMIN_SIMPLE.sql` para crear el usuario admin
4. Abre `index.html` en un servidor web

## 🔑 Credenciales por defecto

- **Email**: admin@escuela.com
- **Contraseña**: Admin123!

## 📁 Estructura del proyecto

```
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos
├── js/
│   ├── app.js          # Lógica principal
│   └── tursodb.js      # Adaptador de base de datos
├── CREAR_ADMIN_SIMPLE.sql  # Script para crear admin
├── LIMPIAR_BD.sql      # Script para limpiar datos
└── README.md           # Documentación
```

## 🎯 Uso

1. **Login**: Ingresa con las credenciales de admin
2. **Gestionar estudiantes**: Crea especialidades, años y agrega estudiantes
3. **Generar QRs**: Descarga códigos QR por grupo
4. **Crear eventos**: Define fechas, horas y nombre del evento
5. **Tomar asistencia**: Escanea QRs durante el evento

## 🔧 Configuración

Para usar tu propia base de datos Turso:

1. Crea una cuenta en [Turso](https://turso.tech)
2. Crea una base de datos
3. Actualiza las credenciales en `js/tursodb.js`:
   ```javascript
   this.dbUrl = 'tu-url-de-turso';
   this.authToken = 'tu-token-de-turso';
   ```

## 📱 Compatibilidad

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Móviles (iOS/Android)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.