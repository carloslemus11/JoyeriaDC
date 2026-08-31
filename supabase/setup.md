# Setup de Supabase — Joyería DC

Proyecto: **ardfyksmwwwignoejaft**
URL: `https://ardfyksmwwwignoejaft.supabase.co`

## 1. Esquema, políticas y Storage — ✅ HECHO

Aplicado el 2026-08-31 vía migraciones:

| Migración | Qué hace |
|---|---|
| `fase1_schema_inicial` | Crea las 8 tablas (`schema.sql`) |
| `fase1_rls_politicas` | Activa RLS + políticas + `is_admin()` (`policies.sql`) |
| `fase1_storage_piezas` | Crea el bucket `piezas` + políticas de Storage (`storage.sql`) |
| `fase1_is_admin_a_schema_privado` | Mueve `is_admin()` al schema `private` (cierra un aviso de seguridad) |

Si algún día se recrea el proyecto desde cero, correr en el SQL Editor y en este orden: `schema.sql` → `policies.sql` → `storage.sql`.

Advisors de seguridad tras aplicar: **sin hallazgos**.

## 2. Auth — PENDIENTE (lo haces tú en el dashboard)

Estos pasos no se pueden hacer por API; hay que entrar a
`https://supabase.com/dashboard/project/ardfyksmwwwignoejaft`.

### 2.1 Deshabilitar el registro público
**Authentication → Sign In / Providers → Email** (o **Authentication → Settings**):
- Deja **Email** habilitado.
- **Desactiva "Allow new users to sign up"** (o "Enable sign-ups").
  Así nadie puede auto-registrarse: los admin se crean a mano.
- Opcional: desactiva "Confirm email" para el admin, o confírmalo manualmente en el paso 2.2.

### 2.2 Crear el usuario administrador
**Authentication → Users → Add user → Create new user**:
- Email: _(el correo con el que vas a administrar el sitio)_
- Password: una contraseña fuerte
- Marca **"Auto Confirm User"** para que quede activo sin verificar correo.

### 2.3 Darle rol de admin
Copia el **UID** del usuario recién creado (columna del listado de Users) y corre
en el **SQL Editor**:

```sql
insert into public.perfiles (id, rol)
values ('PEGA_AQUI_EL_UID', 'admin');
```

Verifícalo:

```sql
select p.id, u.email, p.rol
from public.perfiles p
join auth.users u on u.id = p.id;
```

## 3. Claves del proyecto (para el front)

Están en **Project Settings → API**. Ya quedaron puestas en `assets/config.js`:

- **Project URL:** `https://ardfyksmwwwignoejaft.supabase.co`
- **Publishable key:** `sb_publishable_mxaighjTzkTes_A_WSL3Mg_DorwIQRE`
  (es pública por diseño — puede ir en el código del cliente; la seguridad la dan las políticas RLS)

## 4. Cómo probar que las políticas funcionan

Desde el SQL Editor, simulando un visitante anónimo:

```sql
set local role anon;
select count(*) from public.piezas;        -- debe funcionar (0 filas)
insert into public.calificaciones (estrellas) values (5);   -- debe funcionar
select * from public.cotizaciones;         -- debe devolver 0 filas (no error): anon no ve cotizaciones
reset role;
```
