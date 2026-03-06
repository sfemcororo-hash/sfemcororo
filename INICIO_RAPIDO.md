# ⚡ INICIO RÁPIDO - Sistema Seguro

## 🚀 3 Pasos para Activar

### PASO 1: Migrar Base de Datos (2 min)

1. Abre: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a: **SQL Editor** → **New Query**
4. Copia y pega el contenido de: `migration_auth_roles.sql`
5. Click **Run** ▶️
6. Verifica: "Success. No rows returned"

---

### PASO 2: Crear Usuario Admin (1 min)

1. Ve a: **Authentication** → **Users**
2. Click **Add User** (botón verde)
3. Completa:
   ```
   Email: admin@escuela.com
   Password: Admin123!
   Auto Confirm User: ✅ (activar)
   ```
4. En **User Metadata**, pega:
   ```json
   {
     "nombre": "Administrador",
     "rol": "admin"
   }
   ```
5. Click **Create User**

---

### PASO 3: Probar (1 min)

1. Abre: `public/index.html` en tu navegador
2. Login con:
   ```
   Email: admin@escuela.com
   Password: Admin123!
   ```
3. ✅ Deberías ver: "Panel de Administrador"
4. ✅ Deberías ver el botón: "👥 Estudiantes"

---

## 🎯 ¡Listo!

Tu sistema ahora tiene:
- ✅ Autenticación segura
- ✅ Contraseñas hasheadas
- ✅ Sistema de roles
- ✅ RLS habilitado

---

## 👥 Crear Más Usuarios

### Usuario Normal (Docente):

1. **Authentication** → **Users** → **Add User**
2. Completa:
   ```
   Email: docente1@escuela.com
   Password: Docente123!
   Auto Confirm User: ✅
   ```
3. User Metadata:
   ```json
   {
     "nombre": "Docente 1",
     "rol": "usuario"
   }
   ```

---

## 🔍 Verificar que Funciona

### Como Admin:
- ✅ Ve "Panel de Administrador"
- ✅ Ve botón "👥 Estudiantes"
- ✅ Puede agregar estudiantes
- ✅ Ve todos los eventos

### Como Usuario:
- ✅ Ve "Mis Eventos"
- ❌ NO ve botón "👥 Estudiantes"
- ✅ Puede crear eventos
- ✅ Solo ve sus propios eventos

---

## 🆘 Problemas?

### No puedo hacer login
```sql
-- Verifica que el usuario existe
SELECT email, raw_user_meta_data 
FROM auth.users;
```

### No veo el perfil
```sql
-- Verifica que el perfil se creó
SELECT * FROM perfiles;
```

### Error de permisos
```sql
-- Verifica que RLS está activo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 📖 Documentación Completa

- `GUIA_MIGRACION.md` - Guía detallada
- `SEGURIDAD_ROLES.md` - Documentación de seguridad
- `RESUMEN_MIGRACION.md` - Resumen de cambios

---

## 🎊 ¡Disfruta tu sistema seguro!
