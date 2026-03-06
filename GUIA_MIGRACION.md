# 🔒 Guía de Migración: Sistema Seguro con Roles

## 📋 Resumen de Cambios

### ✅ Implementado:
- ✅ Supabase Auth (autenticación real con JWT)
- ✅ Sistema de roles (admin/usuario)
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Políticas de acceso por rol
- ✅ Vistas diferenciadas por rol
- ✅ Credenciales removidas del código

### 🔐 Seguridad:
- Contraseñas hasheadas con bcrypt
- Tokens JWT seguros
- Políticas RLS a nivel de base de datos
- Sesiones persistentes

---

## 🚀 PASOS DE MIGRACIÓN

### PASO 1: Ejecutar Migración de Base de Datos (5 min)

1. Abre Supabase Dashboard → **SQL Editor**
2. Ejecuta el archivo: `migration_auth_roles.sql`
3. Verifica que no haya errores

**Esto hará:**
- Crear tabla `perfiles` con roles
- Eliminar tabla `docentes` antigua
- Habilitar RLS en todas las tablas
- Crear políticas de acceso
- Configurar trigger para crear perfiles automáticamente

---

### PASO 2: Crear Usuarios (3 min)

**Opción A: Desde Dashboard (RECOMENDADO)**

1. Ve a: **Authentication → Users → Add User**
2. Crea el admin:
   - Email: `admin@escuela.com`
   - Password: `Admin123!`
   - Auto Confirm User: ✅ Yes
   - User Metadata (JSON):
     ```json
     {
       "nombre": "Administrador",
       "rol": "admin"
     }
     ```
3. Click **Create User**

4. Crea usuarios normales:
   - Email: `docente1@escuela.com`
   - Password: `Docente123!`
   - User Metadata:
     ```json
     {
       "nombre": "Docente 1",
       "rol": "usuario"
     }
     ```

**Opción B: Desde SQL**

Ejecuta el archivo: `crear_usuarios.sql`

---

### PASO 3: Verificar Configuración (1 min)

1. Verifica que los archivos actualizados estén en su lugar:
   - ✅ `public/js/config.js` - Actualizado
   - ✅ `public/js/app.js` - Actualizado
   - ✅ `public/index.html` - Sin credenciales

2. Verifica en Supabase:
   - **Authentication → Users**: Deben aparecer los usuarios creados
   - **Table Editor → perfiles**: Deben tener registros automáticos

---

### PASO 4: Probar la Aplicación (5 min)

1. Abre `public/index.html` en el navegador

2. **Prueba como ADMIN:**
   - Login: `admin@escuela.com` / `Admin123!`
   - Verifica que veas: "Panel de Administrador"
   - Verifica que puedas acceder a "👥 Estudiantes"
   - Crea un evento de prueba
   - Agrega un estudiante

3. **Prueba como USUARIO:**
   - Logout y login: `docente1@escuela.com` / `Docente123!`
   - Verifica que veas: "Mis Eventos"
   - Verifica que NO veas el botón "👥 Estudiantes"
   - Crea un evento propio
   - Verifica que solo veas tus eventos

---

## 🎯 DIFERENCIAS POR ROL

### 👑 ADMIN (Administrador)
**Puede:**
- ✅ Ver y gestionar TODOS los estudiantes
- ✅ Ver TODOS los eventos (de todos los usuarios)
- ✅ Crear, editar y eliminar estudiantes
- ✅ Generar códigos QR
- ✅ Ver todas las asistencias

**Vista:**
- Header: "Panel de Administrador"
- Botón "👥 Estudiantes" visible

---

### 👤 USUARIO (Docente)
**Puede:**
- ✅ Ver estudiantes (solo lectura)
- ✅ Ver solo SUS eventos
- ✅ Crear sus propios eventos
- ✅ Tomar asistencia en sus eventos
- ❌ NO puede agregar/editar estudiantes
- ❌ NO puede ver eventos de otros usuarios

**Vista:**
- Header: "Mis Eventos"
- Botón "👥 Estudiantes" oculto

---

## 🔧 CONFIGURACIÓN ADICIONAL

### Variables de Entorno (Producción)

Para deployment, crea archivo `.env`:

```env
VITE_SUPABASE_URL=https://fjselqntjcrhrkVugbca.supabase.co
VITE_SUPABASE_KEY=eyJhbGc...
```

Y actualiza `config.js`:

```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "No se puede iniciar sesión"
- Verifica que ejecutaste `migration_auth_roles.sql`
- Verifica que el usuario existe en Authentication → Users
- Verifica que el email esté confirmado

### Error: "No se ven los eventos"
- Verifica que RLS esté habilitado
- Verifica que las políticas se crearon correctamente
- Ejecuta en SQL Editor:
  ```sql
  SELECT * FROM perfiles WHERE id = auth.uid();
  ```

### Error: "Usuario no puede acceder a estudiantes"
- Esto es correcto si el rol es "usuario"
- Solo admins pueden gestionar estudiantes

### Error: "Perfil no se crea automáticamente"
- Verifica que el trigger existe:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- Si no existe, ejecuta nuevamente la sección del trigger en `migration_auth_roles.sql`

---

## 📊 VERIFICAR POLÍTICAS RLS

Ejecuta en SQL Editor:

```sql
-- Ver todas las políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## 🎉 ¡Migración Completa!

Tu sistema ahora tiene:
- 🔐 Autenticación segura con Supabase Auth
- 👥 Sistema de roles (admin/usuario)
- 🛡️ Row Level Security activo
- 🔒 Contraseñas hasheadas
- 🎯 Vistas diferenciadas por rol
- ✅ Sin credenciales en el código

---

## 📝 PRÓXIMOS PASOS OPCIONALES

1. **Registro de usuarios**: Agregar formulario de registro
2. **Recuperación de contraseña**: Implementar "Olvidé mi contraseña"
3. **Perfil de usuario**: Permitir editar nombre y cambiar contraseña
4. **Auditoría**: Registrar acciones de usuarios
5. **Notificaciones**: Email al registrar asistencia
