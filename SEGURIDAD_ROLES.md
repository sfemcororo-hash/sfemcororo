# 🔒 SEGURIDAD Y ROLES - ACTUALIZACIÓN

## ✅ Sistema de Seguridad Implementado

### Características de Seguridad:
- ✅ **Supabase Auth**: Autenticación real con JWT
- ✅ **Contraseñas Hasheadas**: bcrypt automático
- ✅ **Row Level Security (RLS)**: Políticas a nivel de BD
- ✅ **Sistema de Roles**: admin y usuario
- ✅ **Sesiones Seguras**: Tokens JWT con expiración
- ✅ **Sin Credenciales en Código**: Variables de entorno

---

## 👥 SISTEMA DE ROLES

### 👑 ROL: ADMIN (Administrador)

**Permisos:**
- ✅ Gestión completa de estudiantes (crear, editar, eliminar)
- ✅ Ver TODOS los eventos del sistema
- ✅ Generar códigos QR
- ✅ Ver todas las asistencias
- ✅ Crear y gestionar eventos

**Vista:**
```
┌─────────────────────────────────────┐
│ Panel de Administrador              │
│ [👥 Estudiantes] [Cerrar Sesión]   │
└─────────────────────────────────────┘
```

---

### 👤 ROL: USUARIO (Docente)

**Permisos:**
- ✅ Ver estudiantes (solo lectura)
- ✅ Crear sus propios eventos
- ✅ Ver SOLO sus eventos
- ✅ Tomar asistencia en sus eventos
- ❌ NO puede gestionar estudiantes
- ❌ NO puede ver eventos de otros

**Vista:**
```
┌─────────────────────────────────────┐
│ Mis Eventos                         │
│ [Cerrar Sesión]                     │
└─────────────────────────────────────┘
```

---

## 🚀 INICIO RÁPIDO

### 1. Ejecutar Migración

```bash
# En Supabase SQL Editor, ejecuta:
migration_auth_roles.sql
```

### 2. Crear Usuarios

**Desde Dashboard:**
- Authentication → Users → Add User
- Completa email, password y metadata con rol

**Credenciales de Prueba:**
```
ADMIN:
Email: admin@escuela.com
Password: Admin123!

USUARIO:
Email: docente1@escuela.com
Password: Docente123!
```

### 3. Iniciar Aplicación

```bash
# Servidor local
python -m http.server 8000

# Abre: http://localhost:8000/public/
```

---

## 🔐 POLÍTICAS DE SEGURIDAD (RLS)

### Estudiantes
- **Admin**: Acceso total (CRUD)
- **Usuario**: Solo lectura

### Eventos
- **Admin**: Ve todos los eventos
- **Usuario**: Solo sus eventos

### Asistencias
- **Admin**: Ve todas las asistencias
- **Usuario**: Solo de sus eventos

---

## 📋 MIGRACIÓN DESDE VERSIÓN ANTERIOR

Si tienes la versión anterior sin roles:

1. **Backup de datos**:
```sql
-- Exportar eventos existentes
COPY eventos TO '/tmp/eventos_backup.csv' CSV HEADER;
```

2. **Ejecutar migración**:
```sql
-- Ejecuta: migration_auth_roles.sql
```

3. **Crear usuarios** en Authentication

4. **Reasignar eventos**:
```sql
-- Actualizar eventos con nuevo usuario_id
UPDATE eventos 
SET usuario_id = (SELECT id FROM auth.users WHERE email = 'admin@escuela.com')
WHERE usuario_id IS NULL;
```

---

## 🛡️ MEJORES PRÁCTICAS

### Producción:
1. **Variables de entorno**: No expongas credenciales
2. **HTTPS obligatorio**: Configura en hosting
3. **Email verification**: Activa en Supabase Auth
4. **Rate limiting**: Configura en Supabase
5. **Backup regular**: Programa backups automáticos

### Desarrollo:
1. **Usuarios de prueba**: Usa emails de prueba
2. **Datos de prueba**: No uses datos reales
3. **Logs**: Revisa logs de Supabase regularmente

---

## 📚 DOCUMENTACIÓN COMPLETA

- **Guía de Migración**: Ver `GUIA_MIGRACION.md`
- **Scripts SQL**: Ver `migration_auth_roles.sql` y `crear_usuarios.sql`
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **RLS Policies**: https://supabase.com/docs/guides/auth/row-level-security

---

## 🆘 SOPORTE

### Problemas Comunes:

**No puedo iniciar sesión**
- Verifica que el usuario existe en Authentication
- Verifica que el email esté confirmado
- Revisa la consola del navegador (F12)

**No veo eventos**
- Verifica tu rol en la tabla `perfiles`
- Usuarios solo ven sus propios eventos
- Admins ven todos los eventos

**Error de permisos**
- Verifica que RLS esté habilitado
- Verifica que las políticas existan
- Ejecuta: `SELECT * FROM pg_policies WHERE schemaname = 'public';`

---

Agrega esta sección al README.md principal para documentar el nuevo sistema de seguridad.
