# Joyería DC — sitio web

Sitio de Joyería DC (oro 18K, Ibagué). Antes era un único `index.html` publicado
como Claude Artifact; desde la Fase 1 de la migración corre sobre **Supabase**
(base de datos + Auth + Storage) y se publica en **Netlify**.

**En producción:** <https://joyeriadc.netlify.app>
(panel de administración en <https://joyeriadc.netlify.app/admin/>)

El sitio Netlify está **conectado al repo GitHub `carloslemus11/JoyeriaDC`**
(branch `main`): cada `git push` a `main` redespliega solo, con la carpeta
`netlify/edge-functions/` incluida. No hace falta arrastrar nada.

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
  funciones.sql       # funciones RPC (resumen_visitas, …)
  setup.md            # pasos de configuración (incluye los pendientes de Auth)
netlify/
  edge-functions/
    geo-pais.js       # inyecta el país aproximado del visitante (registro de visitas)
netlify.toml
```

No hay paso de build. El catálogo y las fotos viven en Supabase (Storage). El
manejo de visitas registra cada carga de página en `public.visitas` (anónimo, sin
IP); el país lo aporta la Edge Function `netlify/edge-functions/geo-pais.js` — hay
que incluir esa carpeta al desplegar.

## Desarrollo local

```bash
python3 -m http.server 8743
```

Luego abrir <http://localhost:8743>. Nota: hay que servirlo por HTTP (no abrir el
archivo con `file://`) porque `main.js` y `admin.js` son módulos ES.

## Configurar Supabase

Ver [`supabase/setup.md`](supabase/setup.md). El esquema, las políticas, el
Storage y las funciones ya están aplicados, y el usuario admin ya existe. Falta
(en el dashboard de Supabase):

1. **Volver a desactivar** el registro público de usuarios (se activó en la Fase 6,
   ya retirada).
2. Poner el Site URL = `https://joyeriadc.netlify.app`.
3. Activar "Leaked password protection".

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
