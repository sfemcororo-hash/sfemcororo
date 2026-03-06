# 🚀 ACTIVAR SISTEMA - INSTRUCCIONES

## PASO 1: Ejecutar Migración SQL

### Opción A: Copiar y Pegar (RECOMENDADO)

1. **Abre Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/fjselqntjcrhrkVugbca
   ```

2. **Ve a SQL Editor:**
   - Click en "SQL Editor" en el menú izquierdo
   - Click en "New Query"

3. **Copia TODO el contenido del archivo:**
   ```
   migration_auth_roles.sql
   ```

4. **Pega en el editor y click "Run" ▶️**

5. **Verifica el resultado:**
   - Debe decir: "Success. No rows returned"
   - Si hay error, cópialo y dímelo

---

## PASO 2: Crear Usuario Admin

1. **Ve a Authentication:**
   ```
   Dashboard → Authentication → Users
   ```

2. **Click "Add User" (botón verde)**

3. **Completa el formulario:**
   ```
   Email: admin@escuela.com
   Password: Admin123!
   Auto Confirm User: ✅ (ACTIVAR ESTO)
   ```

4. **En "User Metadata" pega esto:**
   ```json
   {"nombre": "Administrador", "rol": "admin"}
   ```

5. **Click "Create User"**

---

## PASO 3: Verificar

1. **Verifica que el usuario se creó:**
   - Debe aparecer en la lista de usuarios
   - Email: admin@escuela.com

2. **Verifica que el perfil se creó automáticamente:**
   - Ve a: Table Editor → perfiles
   - Debe haber 1 registro con rol "admin"

---

## PASO 4: Probar la Aplicación

1. **Abre el archivo:**
   ```
   public/index.html
   ```

2. **Login con:**
   ```
   Email: admin@escuela.com
   Password: Admin123!
   ```

3. **Verifica que veas:**
   - ✅ "Panel de Administrador" (en el header)
   - ✅ Botón "👥 Estudiantes"

---

## ✅ SI TODO FUNCIONA

¡Sistema activado correctamente! 🎉

Ahora puedes:
- Gestionar estudiantes
- Crear eventos
- Tomar asistencia

---

## ❌ SI HAY PROBLEMAS

### Error al ejecutar SQL:
```
Copia el mensaje de error completo y dímelo
```

### No puedo hacer login:
```sql
-- Ejecuta esto en SQL Editor para verificar:
SELECT email, raw_user_meta_data FROM auth.users;
```

### No veo el perfil:
```sql
-- Ejecuta esto en SQL Editor:
SELECT * FROM perfiles;
```

---

## 📞 SIGUIENTE: Crear Usuario Normal (Opcional)

Si quieres probar el rol "usuario":

1. Authentication → Users → Add User
2. Email: docente1@escuela.com
3. Password: Docente123!
4. Auto Confirm: ✅
5. Metadata: `{"nombre": "Docente 1", "rol": "usuario"}`
6. Create User

Luego logout y login con esas credenciales para ver la diferencia.

---

**¡Empieza con el PASO 1!**
