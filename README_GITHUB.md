# 🎓 Sistema de Asistencia QR - En Producción

Sistema de gestión de asistencia con códigos QR, autenticación segura y roles.

## 🌐 Demo en Vivo

**URL:** https://tu-usuario.github.io/sistema-asistencia-supabase

## 🔐 Credenciales de Prueba

```
Admin:
Email: admin@escuela.com
Password: Admin123!
```

## ✨ Características

- ✅ Autenticación con Supabase Auth
- ✅ Sistema de roles (Admin/Usuario)
- ✅ Gestión de estudiantes por especialidad/año
- ✅ Generación de códigos QR
- ✅ Escaneo QR desde cámara o imagen
- ✅ Registro de asistencias en tiempo real
- ✅ Storage de imágenes en Supabase

## 🛠️ Tecnologías

- Supabase (Backend + Auth + Storage)
- JavaScript Vanilla
- HTML5 QR Code Scanner
- QRCode.js

## 📦 Instalación Local

```bash
git clone https://github.com/tu-usuario/sistema-asistencia-supabase.git
cd sistema-asistencia-supabase
python -m http.server 8000
```

Abre: http://localhost:8000/public/

## 🔧 Configuración

Las credenciales de Supabase están en `public/js/config.js`

## 📄 Licencia

MIT
