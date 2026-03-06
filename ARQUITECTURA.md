# 🏗️ ARQUITECTURA DEL SISTEMA - Diagrama Visual

## 📊 Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO ACCEDE                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Login (index.html)   │
         │  Email + Password      │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Supabase Auth         │
         │  signInWithPassword()  │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Verificar Credenciales│
         │  (bcrypt hash)         │
         └────────────┬───────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
    ┌───────────┐       ┌───────────┐
    │  ✅ Válido │       │  ❌ Inválido│
    └─────┬─────┘       └─────┬─────┘
          │                   │
          ▼                   ▼
    ┌───────────┐       ┌───────────┐
    │ Generar   │       │  Mostrar  │
    │ JWT Token │       │   Error   │
    └─────┬─────┘       └───────────┘
          │
          ▼
    ┌───────────┐
    │ Cargar    │
    │ Perfil    │
    │ (rol)     │
    └─────┬─────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│ ADMIN  │  │USUARIO │
└────────┘  └────────┘
```

---

## 🎭 Vistas por Rol

### 👑 ADMIN

```
┌──────────────────────────────────────────────────┐
│  Panel de Administrador                          │
│  [👥 Estudiantes] [Cerrar Sesión]               │
└──────────────────────────────────────────────────┘
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  + Crear Evento                        │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  📅 Evento 1 (Usuario A)               │    │
│  │  [Tomar Asistencia]                    │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  📅 Evento 2 (Usuario B)               │    │
│  │  [Tomar Asistencia]                    │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  📅 Evento 3 (Admin)                   │    │
│  │  [Tomar Asistencia]                    │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘

Puede acceder a:
✅ Gestión de Estudiantes (CRUD completo)
✅ Ver TODOS los eventos
✅ Crear eventos
✅ Tomar asistencia en cualquier evento
✅ Generar códigos QR
```

### 👤 USUARIO

```
┌──────────────────────────────────────────────────┐
│  Mis Eventos                                     │
│  [Cerrar Sesión]                                 │
└──────────────────────────────────────────────────┘
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  + Crear Evento                        │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  📅 Mi Evento 1                        │    │
│  │  [Tomar Asistencia]                    │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  📅 Mi Evento 2                        │    │
│  │  [Tomar Asistencia]                    │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘

Puede acceder a:
✅ Ver estudiantes (solo lectura)
✅ Ver SOLO sus eventos
✅ Crear sus propios eventos
✅ Tomar asistencia en sus eventos
❌ NO puede gestionar estudiantes
❌ NO puede ver eventos de otros
```

---

## 🗄️ Estructura de Base de Datos

```
┌─────────────────────────────────────────────────────────┐
│                    auth.users                           │
│  (Tabla de Supabase Auth - Gestionada automáticamente) │
├─────────────────────────────────────────────────────────┤
│  id (UUID)                                              │
│  email                                                  │
│  encrypted_password (bcrypt)                            │
│  raw_user_meta_data (JSON)                              │
│    └─ nombre                                            │
│    └─ rol                                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ TRIGGER: on_auth_user_created
                     │ (Crea perfil automáticamente)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                      perfiles                           │
│  (Tabla pública con información del usuario)            │
├─────────────────────────────────────────────────────────┤
│  id (UUID) → FK: auth.users.id                          │
│  email                                                  │
│  nombre                                                 │
│  rol ('admin' | 'usuario')                              │
│  activo (boolean)                                       │
│  created_at                                             │
│  updated_at                                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ RLS: Solo el usuario ve su perfil
                     │      Admins ven todos los perfiles
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                      eventos                            │
├─────────────────────────────────────────────────────────┤
│  id (UUID)                                              │
│  nombre                                                 │
│  fecha_inicio, fecha_fin                                │
│  hora_inicio, hora_fin                                  │
│  imagen_url                                             │
│  usuario_id → FK: auth.users.id                         │
│  activo                                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ RLS: Admins ven todos
                     │      Usuarios solo los suyos
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    asistencias                          │
├─────────────────────────────────────────────────────────┤
│  id (UUID)                                              │
│  estudiante_id → FK: estudiantes.id                     │
│  evento_id → FK: eventos.id                             │
│  timestamp                                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ RLS: Admins ven todas
                     │      Usuarios solo de sus eventos
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    estudiantes                          │
├─────────────────────────────────────────────────────────┤
│  id (UUID)                                              │
│  codigo_unico                                           │
│  nombre, apellido                                       │
│  email                                                  │
│  especialidad                                           │
│  anio                                                   │
└─────────────────────────────────────────────────────────┘
                     │
                     │ RLS: Admins CRUD completo
                     │      Usuarios solo lectura
```

---

## 🔒 Políticas RLS (Row Level Security)

```
┌─────────────────────────────────────────────────────────┐
│                    PERFILES                             │
├─────────────────────────────────────────────────────────┤
│  SELECT:                                                │
│    ✅ Usuario ve su propio perfil                       │
│    ✅ Admin ve todos los perfiles                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   ESTUDIANTES                           │
├─────────────────────────────────────────────────────────┤
│  SELECT:                                                │
│    ✅ Admin: todos                                      │
│    ✅ Usuario: todos (solo lectura)                     │
│  INSERT/UPDATE/DELETE:                                  │
│    ✅ Admin: sí                                         │
│    ❌ Usuario: no                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     EVENTOS                             │
├─────────────────────────────────────────────────────────┤
│  SELECT:                                                │
│    ✅ Admin: todos los eventos                          │
│    ✅ Usuario: solo eventos activos                     │
│  INSERT:                                                │
│    ✅ Admin: sí                                         │
│    ✅ Usuario: solo con su usuario_id                   │
│  UPDATE:                                                │
│    ✅ Admin: todos                                      │
│    ✅ Usuario: solo sus eventos                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   ASISTENCIAS                           │
├─────────────────────────────────────────────────────────┤
│  SELECT:                                                │
│    ✅ Admin: todas                                      │
│    ✅ Usuario: solo de sus eventos                      │
│  INSERT:                                                │
│    ✅ Admin: todas                                      │
│    ✅ Usuario: solo en sus eventos                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Toma de Asistencia

```
┌─────────────────────────────────────────────────────────┐
│  Usuario abre evento → Click "Tomar Asistencia"        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Iniciar Escáner QR   │
         │  (Cámara o Imagen)    │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Escanear Código QR   │
         │  (codigo_unico)       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Buscar Estudiante    │
         │  en BD                │
         └───────────┬───────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
    ┌──────────────┐   ┌──────────────┐
    │ ✅ Encontrado│   │ ❌ No existe │
    └──────┬───────┘   └──────┬───────┘
           │                  │
           ▼                  ▼
    ┌──────────────┐   ┌──────────────┐
    │ Verificar    │   │ Mostrar      │
    │ Duplicado    │   │ Error        │
    └──────┬───────┘   └──────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐  ┌────────┐
│Ya Reg. │  │ Nuevo  │
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│Warning │  │Registrar│
└────────┘  └───┬────┘
                │
                ▼
         ┌──────────────┐
         │ RLS Verifica │
         │ Permisos     │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Insertar en  │
         │ asistencias  │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Actualizar   │
         │ Lista en UI  │
         └──────────────┘
```

---

## 🎯 Matriz de Permisos Detallada

```
┌──────────────────────┬─────────┬──────────┬──────────┬──────────┐
│ Recurso              │ Admin   │ Usuario  │ Público  │ Anónimo  │
├──────────────────────┼─────────┼──────────┼──────────┼──────────┤
│ auth.users           │ Auto    │ Auto     │ ❌       │ ❌       │
│ perfiles (propio)    │ ✅ CRUD │ ✅ R     │ ❌       │ ❌       │
│ perfiles (otros)     │ ✅ CRUD │ ❌       │ ❌       │ ❌       │
│ estudiantes (ver)    │ ✅      │ ✅       │ ❌       │ ❌       │
│ estudiantes (CRUD)   │ ✅      │ ❌       │ ❌       │ ❌       │
│ eventos (propios)    │ ✅ CRUD │ ✅ CRUD  │ ❌       │ ❌       │
│ eventos (otros)      │ ✅ CRUD │ ✅ R     │ ❌       │ ❌       │
│ asistencias (propias)│ ✅ CRUD │ ✅ CRUD  │ ❌       │ ❌       │
│ asistencias (otras)  │ ✅ CRUD │ ❌       │ ❌       │ ❌       │
│ storage (eventos)    │ ✅ CRUD │ ✅ CRUD  │ ✅ R     │ ❌       │
└──────────────────────┴─────────┴──────────┴──────────┴──────────┘

Leyenda:
✅ = Permitido
❌ = Denegado
R = Solo lectura
CRUD = Crear, Leer, Actualizar, Eliminar
Auto = Gestionado por Supabase Auth
```

---

## 🔐 Flujo de Seguridad

```
┌─────────────────────────────────────────────────────────┐
│                  PETICIÓN DEL CLIENTE                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Verificar JWT Token  │
         │  (Supabase Auth)      │
         └───────────┬───────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
    ┌──────────────┐   ┌──────────────┐
    │ ✅ Token     │   │ ❌ Token     │
    │    Válido    │   │    Inválido  │
    └──────┬───────┘   └──────┬───────┘
           │                  │
           ▼                  ▼
    ┌──────────────┐   ┌──────────────┐
    │ Extraer      │   │ Rechazar     │
    │ auth.uid()   │   │ 401          │
    └──────┬───────┘   └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Buscar Perfil│
    │ (rol)        │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Aplicar      │
    │ Políticas RLS│
    └──────┬───────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐  ┌────────┐
│ Admin  │  │Usuario │
│Políticas│  │Políticas│
└───┬────┘  └───┬────┘
    │           │
    └─────┬─────┘
          │
          ▼
   ┌──────────────┐
   │ Filtrar Datos│
   │ según Rol    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Retornar     │
   │ Resultado    │
   └──────────────┘
```

---

**Este diagrama muestra la arquitectura completa del sistema con roles y seguridad implementada.**
