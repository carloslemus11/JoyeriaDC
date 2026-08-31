# Plan — Fase 1 (Fundación) de la migración a Supabase

Fecha: 2026-08-31

## Objetivo

Dejar montada toda la base técnica para que el sitio de Joyería DC funcione sobre Supabase y Netlify: el esquema completo de base de datos (todas las tablas de las 6 fases), sus políticas de seguridad, el Storage de imágenes y el login por correo/contraseña; el sitio reestructurado en varios archivos, versionado en git, servido desde Netlify, y ya conectado a Supabase — **sin ningún cambio visible** para el visitante.

## Contexto del problema

Hoy el sitio es un único `index.html` publicado como Claude Artifact. El contenido está congelado en el código, las reseñas/sugerencias dependen de la capability del Artifact, no hay registro del interés de los visitantes, y un Artifact no puede conectarse a Supabase por su CSP. La Fase 1 no cambia lo que el visitante ve: prepara el terreno (base de datos, hosting propio, estructura de archivos, conexión) para que las fases 2-5 muevan catálogo, reseñas, cotizaciones y textos a la base y agreguen el panel `/admin`.

## El spec de referencia

`docs/specs/2026-08-31-migracion-supabase.md` (aprobado en el approval gate el 2026-08-31).

Esta Fase 1 corresponde al punto **"Fase 1 — Fundación"** de la sección *Alcance v1 → Incluye* del spec.

## Dependencias externas (bloquean partes del plan)

Estas las provee el usuario; sin ellas las tareas 4-5-6 y el deploy quedan a medias:

- **URL del proyecto Supabase** y **anon/public key** (Supabase → Project Settings → API).
- Confirmación de **cuenta de Netlify** y de si el repo va a **GitHub** (para auto-deploy) o se sube por Netlify CLI / drag-and-drop.
- **Correo(s)** que serán admin.

El plan se puede ejecutar hasta la tarea 3 y la parte estructural de la 7-8 sin estas credenciales; el resto se completa cuando lleguen.

## Lista de tareas a implementar

### 1. Inicializar git y congelar el estado actual
- **Qué:** `git init` en la raíz del proyecto; crear `.gitignore` (excluir `.DS_Store`, `node_modules/`, `.netlify/`, archivos temporales, y **no** excluir `assets/config.js` porque la anon key es pública por diseño); commit inicial con `index.html`, `CLAUDE.md`, `docs/`, `IMAGENES JOYAS/` y los skills.
- **Dónde:** raíz `/Users/julianlemus/JOYERIA.DC.`.
- **Responde a:** spec Fase 1 — "El proyecto pasa a ser un repositorio git".
- **Detalle:** dejar un commit limpio del "antes" para poder comparar que la reestructuración no cambió nada visible. Confirmar con el usuario el nombre/branch (`main`).

### 2. Reestructurar el archivo único en varios archivos (sin cambios visibles)
- **Qué:** separar `index.html` en:
  - `index.html` — solo el marcado; `<link rel="stylesheet" href="/assets/styles.css">` en el `<head>` y `<script type="module" src="/assets/main.js">` antes de `</body>`.
  - `assets/styles.css` — todo el contenido actual del `<style>` inline, tal cual (incluye los `data:image/webp;base64` de las texturas de seda — se quedan aquí en esta fase).
  - `assets/main.js` — todo el contenido actual del `<script>` inline, tal cual (armado de `wa-link`, scroll-reveal, nav, widget de estrellas y sugerencias en su versión local actual — **no se toca su lógica en esta fase**).
  - Las 9 fotos de producto siguen embebidas como `data:` en los `<img>` de `index.html` (se mueven a Storage en la Fase 2).
- **Dónde:** `index.html`, nuevos `assets/styles.css`, `assets/main.js`.
- **Responde a:** spec Fase 1 — "Estructura del proyecto reorganizada: deja de ser un archivo único; sitio público + carpeta `admin/`, sin framework ni paso de build"; y spec *Comportamiento → Visitante* punto 1 ("Ve lo mismo que hoy").
- **Detalle:** rutas absolutas (`/assets/...`) para que funcionen igual en `/` y en `/admin/`. Verificar byte a byte que el render es idéntico (comparar contra el commit de la tarea 1 en el navegador de preview).

### 3. Escribir los scripts SQL del esquema, políticas y Storage
- **Qué:** crear la carpeta `supabase/` con:
  - `schema.sql` — tablas para las fases 1-5:
    - `categorias` (id uuid pk, nombre, slug único, descripcion, orden int, activa bool, created_at)
    - `piezas` (id uuid pk, nombre, categoria_id fk→categorias, descripcion, orden int, activa bool, created_at, updated_at)
    - `pieza_fotos` (id uuid pk, pieza_id fk→piezas on delete cascade, storage_path, alt, orden int)
    - `calificaciones` (id uuid pk, estrellas int check 1..5, device_hash text null, created_at)
    - `sugerencias` (id uuid pk, nombre text null, texto text not null, estado text check in ('pendiente','aprobada','oculta') default 'pendiente', created_at)
    - `cotizaciones` (id uuid pk, pieza_id fk→piezas null on delete set null, etiqueta text, origen text, created_at)
    - `contenido_sitio` (clave text pk, valor text, actualizado_at)
    - `perfiles` (id uuid pk references auth.users on delete cascade, rol text default 'admin', created_at)
    - Nota en comentario: `favoritos` (Fase 6) se creará solo si se aprueba esa fase.
  - `policies.sql` — `alter table ... enable row level security` en todas; función `is_admin()` (`security definer`, devuelve true si `auth.uid()` está en `perfiles` con `rol = 'admin'`); políticas:
    - `categorias`, `piezas`, `pieza_fotos`: `select` para `anon`/`authenticated` where `activa` (fotos: where la pieza está activa); `all` para `is_admin()`.
    - `contenido_sitio`: `select` para todos; `all` para `is_admin()`.
    - `calificaciones`: `insert` para `anon` con check `estrellas between 1 and 5`; `select` para todos (filas anónimas, sin PII); sin `update`/`delete` público.
    - `sugerencias`: `insert` para `anon`; `select` para `anon` solo where `estado = 'aprobada'`; `all` para `is_admin()`.
    - `cotizaciones`: `insert` para `anon`; `select`/`all` solo `is_admin()`.
    - `perfiles`: `select`/`all` solo `is_admin()`.
  - `storage.sql` — crear bucket `piezas` (público para lectura); políticas de `storage.objects`: lectura pública del bucket `piezas`, escritura/borrado solo `is_admin()`.
  - `setup.md` — pasos manuales para el usuario, en orden: (1) correr `schema.sql`, `policies.sql`, `storage.sql` en el SQL Editor de Supabase; (2) en Auth → Providers, dejar Email habilitado; (3) en Auth → Settings, **deshabilitar "Allow new users to sign up"** (para que nadie se registre como admin); (4) crear el usuario admin manualmente en Auth → Users → Add user (con el correo confirmado); (5) `insert into perfiles (id, rol) values ('<uuid del usuario>', 'admin');`.
- **Dónde:** nueva carpeta `supabase/`.
- **Responde a:** spec Fase 1 — "esquema de base de datos (todas las tablas de las fases siguientes), políticas RLS, bucket de Storage, Auth por correo/contraseña"; y spec *Errores y mitigaciones* — filas de "escribir sin ser admin", "anon key visible", "sesión admin".
- **Detalle:** los `.sql` quedan versionados como fuente de verdad del esquema. En esta fase el usuario los corre a mano (no hay Supabase CLI en el proyecto); si más adelante se adopta la CLI, se convierten en migraciones.

### 4. Añadir la configuración y el cliente de Supabase
- **Qué:**
  - `assets/config.js` — `window.JOYERIA_CONFIG = { SUPABASE_URL: "", SUPABASE_ANON_KEY: "" }` (se rellena con las credenciales reales cuando el usuario las pase; se commitea con valores reales — la anon key es pública).
  - `assets/supabase-client.js` — `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"`; crea y exporta `export const sb = createClient(window.JOYERIA_CONFIG.SUPABASE_URL, window.JOYERIA_CONFIG.SUPABASE_ANON_KEY)`.
- **Dónde:** nuevos `assets/config.js`, `assets/supabase-client.js`; `config.js` se carga con `<script src="/assets/config.js">` (clásico, antes de los módulos) tanto en `index.html` como en `admin/index.html`.
- **Responde a:** spec Fase 1 — "ya con `supabase-js` cargado y conectado"; spec *Errores* — "anon key visible → es pública por diseño, la seguridad está en RLS".
- **Detalle:** Netlify no tiene la CSP del Artifact, así que el `import` desde `esm.sh` está permitido. Fijar la versión mayor (`@2`) para no romper con cambios futuros.

### 5. Conectar el cliente en el sitio público sin cambiar comportamiento
- **Qué:** en `assets/main.js`, importar `sb` desde `./supabase-client.js`. No cambiar aún ninguna función (estrellas, sugerencias y catálogo siguen en su versión local hasta Fase 2-3). Añadir solo un chequeo de conexión discreto: al cargar, hacer una consulta trivial (p. ej. `select count` sobre `contenido_sitio`) y registrar en `console` si la conexión respondió — sin mostrar nada en la interfaz.
- **Dónde:** `assets/main.js`.
- **Responde a:** spec Fase 1 — "funcionando igual que hoy (sin cambios visibles), ya con supabase-js cargado y conectado"; spec *Comportamiento → Estados generales* — "nunca pantalla en blanco esperando a la base" (aquí no se espera nada, es solo diagnóstico).
- **Detalle:** el healthcheck es temporal para validar la Fase 1; puede quedar detrás de un flag o quitarse al empezar la Fase 2.

### 6. Crear el shell del panel `/admin` con login real
- **Qué:** carpeta `admin/` con:
  - `admin/index.html` — pantalla de login (campo correo, campo contraseña, botón "Entrar", zona de error). Carga `/assets/config.js`, `/assets/supabase-client.js` y `/admin/admin.js`. Usa la misma paleta/tipografías del sitio (reutiliza `/assets/styles.css` + un `admin/admin.css` chico).
  - `admin/admin.js` — al enviar el formulario: `sb.auth.signInWithPassword(...)`. Si falla → mensaje genérico ("Correo o contraseña incorrectos"), sin revelar si el correo existe. Si funciona → consultar `perfiles` por el `uid`; si no es admin → `sb.auth.signOut()` y mensaje ("Esta cuenta no tiene acceso al panel"). Si es admin → ocultar el login y mostrar un placeholder "Panel en construcción — Fase 2". Botón "Cerrar sesión" (`signOut` → vuelve al login). Al cargar la página, si ya hay sesión válida de admin, saltar directo al placeholder; si la sesión expiró, mostrar login con aviso.
- **Dónde:** nueva carpeta `admin/`.
- **Responde a:** spec Fase 1 — "Auth por correo/contraseña"; spec *Comportamiento → Administrador* puntos 1-2 y 8-9; spec *Errores* — "escribir sin ser admin", "sesión admin expirada", "login incorrecto sin dar pistas".
- **Detalle:** el contenido real del panel (catálogo, sugerencias, etc.) es Fase 2+. Aquí solo se valida de punta a punta que Auth + `perfiles` + RLS funcionan.

### 7. Configurar Netlify y preparar el deploy
- **Qué:**
  - `netlify.toml` — `publish = "."`, sin build command; cabeceras de seguridad básicas (`X-Frame-Options: DENY` salvo que rompa algo, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`); regla para servir `/admin` → `/admin/index.html`.
  - `404.html` simple con la paleta del sitio y un enlace a la home.
  - `README.md` — cómo hacer el deploy: opción A (conectar el repo de GitHub en Netlify, deploy automático en cada push), opción B (Netlify CLI / arrastrar carpeta); y el checklist de `supabase/setup.md`.
- **Dónde:** raíz: `netlify.toml`, `404.html`, `README.md`.
- **Responde a:** spec Fase 1 — "El sitio actual movido a Netlify"; spec *Errores* — "sesión admin robada → cabeceras / expiración".
- **Detalle:** el deploy en sí lo dispara el usuario (requiere su cuenta Netlify y, para la opción A, su GitHub). El plan deja todo listo y las instrucciones escritas; se acompaña al usuario en el primer deploy.

### 8. Actualizar la documentación del proyecto
- **Qué:** actualizar `CLAUDE.md`: nueva estructura de carpetas (`assets/`, `admin/`, `supabase/`, `netlify.toml`), el hecho de que el sitio ya no es archivo único ni se publica como Artifact sino en Netlify + Supabase, y una nota de que las fases 2-6 están pendientes con enlace al spec y al plan.
- **Dónde:** `CLAUDE.md`.
- **Responde a:** spec Fase 1 — reestructuración; mantener `CLAUDE.md` como fuente fiel del estado del proyecto (preferencia del usuario en `CLAUDE.md`).
- **Detalle:** no borrar el historial de decisiones de diseño (paleta, seda, logo) — solo actualizar lo que cambió de estructura/hosting.

### 9. Verificación local (cierre de la fase)
- **Qué:** correr `verify-after-changes`: levantar el server local (`joyeria-dc` de `.claude/launch.json`), y comprobar 5 casos: (a) el sitio público se ve idéntico al de antes; (b) la consola muestra el cliente Supabase conectado sin errores; (c) `/admin` muestra login; (d) login con el correo admin entra al placeholder; (e) login incorrecto y cuenta sin perfil admin se rechazan bien.
- **Dónde:** navegador de preview.
- **Responde a:** todo el "Comportamiento esperado" de la Fase 1.
- **Detalle:** si `index.html` seguía publicado como Artifact, dejar constancia de que a partir de aquí el Artifact queda obsoleto y la fuente es Netlify.

## Fuera de este plan (fases siguientes)

- Mover catálogo/categorías/fotos a la base y construir el CRUD del panel → Fase 2.
- Conectar el widget de estrellas y el formulario de sugerencias a Supabase + moderación → Fase 3.
- Registrar los clics de "Cotizar" → Fase 4.
- Textos del sitio editables desde `/admin` → Fase 5.
- Cuentas de clientes / favoritos → Fase 6 (condicional).

---

El plan está listo para ejecutarse. Al terminar la implementación corresponde `verify-after-changes` (tarea 9) para cerrar la fase. ¿Procedo a implementar la Fase 1, o hay ajustes al plan primero?
