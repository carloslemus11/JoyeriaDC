# Joyería DC — sitio web

Sitio de Joyería DC (oro 18K, Ibagué). Antes era un único `index.html` publicado
como Claude Artifact; desde la Fase 1 de la migración corre sobre **Supabase**
(base de datos + Auth + Storage) y se publica en **Netlify**.

**En producción:** <https://joyeriadc.netlify.app>
(panel de administración en <https://joyeriadc.netlify.app/admin/>)

Publicado con **Netlify Drop** (arrastrar carpeta). Para actualizar tras un
cambio: volver a arrastrar la carpeta a <https://app.netlify.com/drop>, o
conectar el repo de GitHub (`carloslemus11/JoyeriaDC`) en Netlify para
auto-deploy — ver "Publicar en Netlify" abajo.

Ver el contexto completo del proyecto en [`CLAUDE.md`](CLAUDE.md), el spec de la
migración en [`docs/specs/2026-08-31-migracion-supabase.md`](docs/specs/2026-08-31-migracion-supabase.md)
y el plan de la Fase 1 en [`docs/plans/2026-08-31-migracion-supabase.md`](docs/plans/2026-08-31-migracion-supabase.md).

## Estructura

```
index.html            # sitio público (marcado)
404.html
assets/
  styles.css          # todo el CSS (incluye texturas de seda en base64)
  main.js             # JS del sitio público (módulo ES)
  config.js           # URL + publishable key de Supabase (público por diseño)
  supabase-client.js  # cliente Supabase compartido
admin/
  index.html          # panel de administración
  admin.css
  admin.js
supabase/
  schema.sql          # tablas
  policies.sql        # RLS + políticas
  storage.sql         # bucket "piezas"
  setup.md            # pasos de configuración (incluye los pendientes de Auth)
netlify.toml
```

No hay paso de build. Las fotos de producto siguen embebidas como `data:` en
`index.html` (se mueven a Supabase Storage en la Fase 2).

## Desarrollo local

```bash
python3 -m http.server 8743
```

Luego abrir <http://localhost:8743>. Nota: hay que servirlo por HTTP (no abrir el
archivo con `file://`) porque `main.js` y `admin.js` son módulos ES.

## Configurar Supabase

Ver [`supabase/setup.md`](supabase/setup.md). El esquema, las políticas y el
Storage ya están aplicados. Falta (en el dashboard de Supabase):

1. Desactivar el registro público de usuarios.
2. Crear el usuario administrador.
3. Insertar su fila en `public.perfiles` con `rol = 'admin'`.

## Publicar en Netlify

**Opción A — repo de GitHub (deploy automático):**

1. Crear un repositorio en GitHub y subir este proyecto:
   ```bash
   git remote add origin git@github.com:USUARIO/joyeria-dc.git
   git push -u origin main
   ```
2. En Netlify: **Add new site → Import an existing project → GitHub**, elegir el repo.
3. Build command: _(vacío)_. Publish directory: `.`
4. Cada `git push` a `main` vuelve a desplegar.

**Opción B — Netlify CLI (sin GitHub):**

```bash
npm install -g netlify-cli
netlify deploy --dir . --prod
```

**Opción C — arrastrar la carpeta** en <https://app.netlify.com/drop>.

El sitio queda en un subdominio `*.netlify.app`. Se puede conectar un dominio
propio después sin cambiar nada del código.
