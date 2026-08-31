# Joyería DC — sitio web

Sitio de una sola página para **Joyería DC**, joyería de oro 18K en Ibagué, Colombia. Instagram: [@joyeriadc__](https://www.instagram.com/joyeriadc__/). Local físico: C.C. Los Panches, local 53, Ibagué. WhatsApp de contacto/ventas: **+1 240 593 3943** (usado en el sitio como `wa.me/12405933943`).

Es un repositorio git (`main`). No hay build step. Desde la **Fase 1 de la migración a Supabase** (2026-08-31) el sitio dejó de ser un único archivo autocontenido y de publicarse como Claude Artifact: ahora es un sitio estático multi-archivo con backend en **Supabase** (Postgres + Auth + Storage), pensado para publicarse en **Netlify**. Ver `docs/specs/2026-08-31-migracion-supabase.md` y `docs/plans/2026-08-31-migracion-supabase.md`.

## Estructura de carpetas

```
JOYERIA.DC./
├── index.html                          # Sitio público (solo el marcado; CSS y JS ahora en assets/)
├── 404.html
├── README.md                           # Cómo correr local, configurar Supabase y publicar en Netlify
├── netlify.toml                        # Config de deploy (publish = ".", sin build, cabeceras)
├── CLAUDE.md                           # Este archivo
├── revision-final.md                   # Historial de auditorías (lo crea/actualiza el skill revision-final; no existe hasta la primera corrida)
├── assets/
│   ├── styles.css                      # Todo el CSS (incluye las texturas de seda en base64)
│   ├── main.js                         # JS del sitio público (módulo ES). Antes era el <script> inline
│   ├── config.js                       # SUPABASE_URL + publishable key + WA_NUMBER (público por diseño, SÍ se versiona)
│   ├── supabase-client.js              # Cliente Supabase compartido (sitio + admin) + healthcheck
│   ├── catalogo.js                     # Lectura del catálogo (categorías/piezas/fotoUrl) — Fase 2
│   ├── interacciones.js                # Sugerencias, registro de cotizaciones y registro de visitas
│   ├── contenido.js                    # Textos editables del sitio ([data-cs]) — Fase 5
│   └── piezas/                         # Respaldo de las 9 fotos (ya en Storage; no se sirven)
├── admin/
│   ├── index.html                      # Panel de administración (tabs Piezas/Categorías/Sugerencias/Cotizaciones/Visitas/Textos)
│   ├── admin.css
│   └── admin.js                        # Login por correo/contraseña + chequeo de rol admin en public.perfiles
├── netlify/
│   └── edge-functions/
│       └── geo-pais.js                 # Inyecta <meta name="dc-pais"> con el país aproximado (para el registro de visitas)
├── supabase/
│   ├── schema.sql                      # Tablas (fuente de verdad del esquema; ya aplicado)
│   ├── policies.sql                    # RLS + políticas + private.is_admin() (ya aplicado)
│   ├── storage.sql                     # Bucket "piezas" + políticas de Storage (ya aplicado)
│   ├── seed-catalogo.sql               # Seed de categorías/piezas/fotos (Fase 2)
│   ├── funciones.sql                   # resumen_visitas() + notas de índices/seeds
│   └── setup.md                        # Pasos de configuración; incluye los pendientes de Auth
├── docs/
│   ├── specs/                           # Specs de desarrollo (los crea/actualiza el skill design-spec; no existe hasta el primero)
│   │   └── YYYY-MM-DD-titulo.md
│   └── plans/                           # Planes de implementación (los crea/actualiza el skill design-plan; no existe hasta el primero)
│       └── YYYY-MM-DD-titulo.md
├── IMAGENES JOYAS/                      # Fotos reales de producto, copiadas al proyecto por el usuario (ver "Fuentes de las fotos")
│   ├── Fotos originales por producto/   # Todas las tomas, organizadas en subcarpetas por pieza (9 piezas, varias fotos c/u)
│   ├── Versiones para web/              # Recortes ya optimizados — de aquí salieron las 9 fotos embebidas en index.html (pasan a Supabase Storage en la Fase 2)
│   └── Texturas de seda/                # Fotos de tela de seda para fondos (ver "Textura de seda (fondo fotográfico)")
│       ├── Originales/                  # JPG originales tal como los subió el usuario, sin procesar
│       └── Versiones para web/          # WebP redimensionados/comprimidos — de aquí sale el fondo embebido en index.html
└── .claude/
    ├── launch.json                     # Config del servidor local para preview (`joyeria-dc`, usado por verify-after-changes)
    └── skills/
        ├── revision-final/
        │   └── SKILL.md                 # Skill de auditoría del sitio (ver sección "Skills del proyecto")
        ├── brainstorming/
        │   └── SKILL.md                 # Skill de indagación previa a un desarrollo (ver sección "Skills del proyecto")
        ├── design-spec/
        │   └── SKILL.md                 # Skill de especificación previa a un desarrollo (ver sección "Skills del proyecto")
        ├── design-plan/
        │   └── SKILL.md                 # Skill de plan de implementación, tras aprobar el spec (ver sección "Skills del proyecto")
        └── verify-after-changes/
            └── SKILL.md                 # Skill de prueba y cierre de un desarrollo (ver sección "Skills del proyecto")
```

Sobre la estructura del sitio (post Fase 1):
- El CSS vive en `assets/styles.css` (linkeado en el `<head>`), no inline. Sigue teniendo las texturas de seda en base64 — por eso pesa ~240 KB.
- El JS vive en `assets/main.js`, cargado como **módulo ES** (`<script type="module">`). Es el mismo IIFE de antes más un `import` del cliente de Supabase y una llamada a `healthcheck()`.
- Como `main.js`/`admin.js` son módulos, el sitio **debe servirse por HTTP** (server local o Netlify); ya no funciona abriendo el `.html` con `file://`.
- **Fase 2 hecha (parte pública):** el catálogo (4 categorías + 9 piezas) ya NO está en el HTML — vive en Supabase (`categorias`, `piezas`, `pieza_fotos`) y lo renderiza `assets/main.js` con `assets/catalogo.js`. `index.html` bajó a ~21 KB (se fue todo el base64 de producto).
- Las 9 fotos de producto están como archivos en `assets/piezas/` (copiadas de `IMAGENES JOYAS/Versiones para web/`). `pieza_fotos.storage_path` apunta a `assets/piezas/*.jpeg` por ahora; el botón "Importar fotos iniciales" del panel las subirá al bucket `piezas` de Storage y cambiará el path a `catalogo/*.jpeg`. `fotoUrl()` en `catalogo.js` resuelve: `assets/…` o `/…` = archivo del sitio; el resto = objeto de Storage.
- `assets/config.js` NO es secreto: la publishable key de Supabase es pública por diseño; la seguridad la dan las políticas RLS. Se versiona en git.

**Ya no se publica como Claude Artifact.** Un Artifact no puede conectarse a Supabase (su CSP bloquea todo fetch externo). La forma de publicar ahora es Netlify — ver `README.md`. El Artifact anterior queda obsoleto.

### Backend Supabase

- Proyecto: `ardfyksmwwwignoejaft` — `https://ardfyksmwwwignoejaft.supabase.co`.
- Esquema, RLS y Storage aplicados vía migraciones (`fase1_*`). Fuente de verdad en `supabase/*.sql`. Advisors de seguridad: sin hallazgos.
- Tablas: `categorias`, `piezas`, `pieza_fotos`, `sugerencias`, `cotizaciones`, `contenido_sitio`, `perfiles`, `visitas`. (Las tablas `calificaciones` y `favoritos` fueron retiradas el 2026-08-31 — ver "Estado de la migración por fases".)
- Regla RLS: el público (anon) solo lee catálogo/textos activos e inserta sugerencias/cotizaciones/visitas; todo lo demás exige sesión admin (`private.is_admin()` = tener fila en `public.perfiles` con `rol='admin'`).
- Bucket de Storage `piezas` (público en lectura, escritura solo admin) para las fotos del catálogo.
- **Pendiente manual en el dashboard de Supabase** (no se puede por API): **volver a desactivar** el registro público de usuarios (se activó en Fase 6, ya retirada), poner el Site URL, y activar "Leaked password protection". Pasos en `supabase/setup.md`.

### Estado de la migración por fases

Plan completo en `docs/plans/2026-08-31-migracion-supabase.md`. Spec en `docs/specs/2026-08-31-migracion-supabase.md`.

- **Fase 1 — Fundación:** EN CURSO. Hecho: esquema + RLS + Storage + git + reestructura a multi-archivo + `assets/config.js`/`supabase-client.js` + shell de `/admin` con login + `netlify.toml`. Falta: pasos de Auth en el dashboard, primer deploy a Netlify, verificación.
- **Fase 2 — Catálogo + panel admin:** HECHA y verificada (2026-08-31). Catálogo (4 cat + 9 piezas) en Supabase; `assets/catalogo.js` + `assets/main.js` lo renderizan en el sitio público. Panel `/admin` completo (`admin/admin.js` + `admin/admin.css`): login + gate de admin, tabs Piezas/Categorías, CRUD con modal, activar/desactivar, borrar con confirmación in-app, subir/reemplazar foto a Storage, botón "Importar fotos iniciales". Las 9 fotos ya están en el bucket `piezas/catalogo/*` y el sitio las sirve desde Storage. `assets/piezas/` quedó como respaldo (ya no se sirve; se puede borrar). Verificado en el navegador con la sesión admin real: CRUD OK, trigger `updated_at` OK, anon no puede escribir.
  - **Notas para futuras fases del panel:** (1) `admin.css` tiene `[hidden]{display:none!important}` porque `.admin-modal`/`.admin-shell` usan `display:flex`. (2) NO usar `window.confirm`/`alert`/`prompt` — devuelven false/nada en varios navegadores; usar `confirmar()` de `admin/admin.js`. (3) el panel usa un único `#modal` + `#modalForm` reutilizado por `openModal()` y `confirmar()`.
- **Fase 3 — Reseñas y sugerencias en base de datos:** HECHA (2026-08-31), luego **el widget de reseñas por estrellas se RETIRÓ** (2026-08-31, migración `retirar_resenas`) — nunca recibió calificaciones reales. Ya no existe la tabla `calificaciones` ni la función `resumen_calificaciones()`, ni la sección `#resenas` del sitio. **Las sugerencias siguen vivas:** persisten en `public.sugerencias` con moderación previa (solo se publican las `aprobada` desde `/admin`). Módulo `assets/interacciones.js`; panel: pestaña "Sugerencias".
- **Fase 4 — Registro de cotizaciones:** HECHA (2026-08-31). Cada clic de `.wa-link` inserta en `public.cotizaciones` (best effort, no bloquea WhatsApp) con `etiqueta`/`origen` (`data-cotiza`/`data-cotiza-origen` en el HTML y en el render de la galería/categorías) y `pieza_id` cuando aplica. Panel: pestaña "Cotizaciones" (ranking + total 30 días + últimos 100). Índice `cotizaciones_created_idx`. Verificado: los clics se registran y WhatsApp abre igual; anon no puede leer cotizaciones.
- **Fase 5 — Textos editables del sitio:** HECHA (2026-08-31). 20 claves en `public.contenido_sitio` (seed = texto que estaba en el HTML). `assets/contenido.js` aplica a `[data-cs]` al cargar (fallback: si falla, se quedan los del HTML). `hero_titulo` usa `*x*`→`<em>` y `\n`→`<br>` (`[data-cs-html]`). Panel: pestaña "Textos" (form agrupado + "Guardar cambios"). Verificado: cambios se reflejan al recargar; si Supabase cae, se ven los del HTML.
- **Fase 6 — Cuentas de clientes:** HECHA (2026-08-31) y luego **REVERTIDA** (2026-08-31, migración `quitar_favoritos_agregar_visitas` + limpieza de código). Se decidió que no aporta a un negocio 100% WhatsApp. Ya no existen la tabla `public.favoritos` ni `assets/cuenta.js`, ni el botón "Cuenta", los modales `#cuentaModal`/`#favModal` ni el corazón por pieza. **Pendiente:** volver a desactivar el registro público de usuarios en Supabase Auth (sigue activo desde Fase 6).
- **Reparación de `perfiles` (2026-08-31, migración `reparar_perfiles`):** una sesión previa borró `public.perfiles` (además de `calificaciones` y `favoritos`), lo que dejó caída la galería pública (la política de `pieza_fotos` llama a `private.is_admin()`, que lee `perfiles`) y el login de `/admin`. Se recreó `perfiles` y se reasignó el rol admin a `cjlr0318@gmail.com` (único usuario).
- **Manejo de visitas (2026-08-31, migración `visitas_v2`):** tabla `public.visitas` (un registro por carga de página: `path`, `seccion`, `fuente`, `referrer_dominio`, `dispositivo`, `pais`) — anónima, sin IP ni identificador persistente. RLS: insert público, select solo admin. `registrarVisita()` en `assets/interacciones.js` (best effort, llamada desde `main.js`). El país lo aporta la Netlify Edge Function `netlify/edge-functions/geo-pais.js` (inyecta `<meta name="dc-pais">`). Panel: pestaña "Visitas" (`resumen_visitas()` → hoy, 30 días, por día, por fuente/dispositivo/país). Spec/plan: `docs/{specs,plans}/2026-08-31-visitas-y-reparacion-perfiles.md`. **Al re-desplegar en Netlify hay que incluir `netlify/edge-functions/`** o el país deja de registrarse.

## Modelo de negocio reflejado en el sitio

- **No hay pasarela de pago ni checkout online.** Todo botón de "Comprar" o "Cotizar" abre WhatsApp (`wa.me`) con un mensaje pre-escrito mencionando la pieza específica. Así es como opera el negocio realmente (cotización + venta por WhatsApp), y así se decidió mantenerlo — no inventar un método de pago que no existe.
- No hay precios ni horario de atención publicados en el sitio porque no se tiene esa información confirmada; mejor omitirlo que inventarlo.
- Las sugerencias arrancan **vacías** a propósito — nada de testimonios de relleno. Se llenan solo con interacciones reales de visitantes. (El widget de calificación por estrellas existió y se retiró — ver Fase 3.)

## Decisiones de diseño

### Filosofía general
Estética "premium, transparente, con capas" tipo Apple: mucho espacio en blanco, tipografía grande, paneles translúcidos tipo vidrio esmerilado (`backdrop-filter: blur`), animaciones de scroll-reveal sutiles, botones tipo píldora.

### Tipografía
- **Fraunces** (serif, variable, con eje óptico e itálica) — para titulares grandes y acentos en cursiva (ej. la palabra "alma" en el hero, el "18K" del logo).
- **Manrope** — tipografía de cuerpo (párrafos, botones, nav).
- **IBM Plex Mono** — para "etiquetas de datos": eyebrows, tags de categoría, precios/labels pequeños en mayúsculas con letter-spacing amplio. Da un aire de "ficha de producto/certificado" apropiado para joyería.

Cargadas desde Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`), únicas dependencias externas del sitio.

### Colores — paleta pastel con textura de seda
Se pasó por varias iteraciones: empezó en dorado sobre marrón espresso oscuro (look "joyería de noche"), luego el usuario pidió **tonos pastel con textura de tela de seda**, como en sus fotos de producto (fondos de seda blanca/marfil/blush con pliegues suaves). Paleta actual, vía CSS custom properties en `:root`:

**Modo claro (el que se ve por defecto):**
- `--bg: #F7EAE2` (champán suave), `--bg-alt: #EFDCD1` (blush)
- `--ink: #4A362E` (cacao cálido, no negro puro)
- `--gold: #BC9268` / `--gold-strong: #9C7548` (oro-rosado apagado, no dorado saturado)
- `--rose: #DDB1A5` (acento secundario)
- Botón sólido: fondo cacao oscuro (`--btn-fill-bg: #4A362E`), texto crema

**Modo oscuro** (`prefers-color-scheme: dark` o `data-theme="dark"`):
- `--bg: #2C201C` (ciruela profundo, no negro puro)
- `--ink: #F5E5D9` (blanco cálido)
- `--gold: #E4BA8C` / `--gold-strong: #F1CDA2` (dorado champán claro)
- Botón sólido: fondo dorado claro, texto oscuro (invertido respecto al modo claro a propósito, no es solo "invertir colores")

Ambos temas están completamente definidos (nunca solo uno "por defecto" con el otro a medias), siguiendo el patrón: paleta clara en `:root`, oscura repetida en `@media (prefers-color-scheme: dark)` y en `:root[data-theme="dark"]`.

### Textura de seda

Hay dos sistemas de fondo "seda", uno CSS puro (el original) y uno fotográfico (agregado después, es el que se ve hoy en la mayoría de las secciones):

**1. CSS puro (clases `.silk` / `.silk-alt`)** — gradientes, sin imágenes de tela:
- Tokens: `--silk-hi` (brillo ambiental suave en las esquinas), `--silk-sheen` (franjas diagonales de brillo más intenso, simulando cómo la luz pega en un pliegue), `--silk-blush` (mancha difusa cálida, muy sutil).
- **Importante:** se probó primero con `repeating-linear-gradient` para simular pliegues, pero el usuario lo rechazó porque se veían como "líneas" duras y artificiales — no como tela real. Se reemplazó por gradientes suaves y difusos (radiales + lineales con transiciones amplias), sin bordes duros. Si se vuelve a tocar este fondo, **no** volver a usar `repeating-linear-gradient` con stops duros para simular pliegues de tela.
- Sigue aplicado como base en `<body>` (clase `.silk`) y en los recuadros decorativos pequeños (`.story-art`, `.loc-visual`) — estos últimos quedaron con el gradiente CSS a propósito, no con la foto, porque son cajas chicas (diagramas SVG decorativos) y la foto ahí se vería recortada sin sentido.
- `.silk-alt` quedó definida en el CSS pero sin usar en el HTML (no se eliminó porque no molesta y podría servir a futuro).

**2. Fondo fotográfico (el que se ve en el sitio hoy)** — fotos reales de seda del usuario (ver "Fuentes de las fotos de textura"), embebidas como `data:image/webp;base64,...` vía dos CSS custom properties en `:root` (fuera de los bloques de tema, porque la imagen en sí no cambia entre claro/oscuro):
  ```css
  --photo-champagne: url("data:image/webp;base64,...");  /* sin usar actualmente, ver nota abajo */
  --photo-ivory: url("data:image/webp;base64,...");       /* la que está en uso */
  ```
  - Se usa **una sola** de las dos fotos (`--photo-ivory`, seda blanca/marfil) en **toda la página**: hero, Colección (`#coleccion`), Atelier y Sugerencias (comparten clase `.atelier`), Ubicación (`.loc`) y footer. Cada sección la aplica así:
    ```css
    background-color: var(--surface); /* fallback sólido mientras carga / si algo falla */
    background-image:
      linear-gradient(var(--silk-photo-ivory), var(--silk-photo-ivory)), /* capa de tinte translúcido */
      var(--photo-ivory);
    background-size: cover, cover;
    background-position: center, <foco propio de la sección>;
    background-repeat: no-repeat, no-repeat;
    ```
  - `--silk-photo-ivory` es el tinte translúcido encima de la foto (≈76% opacidad en modo claro, ≈74% en oscuro, valores por tema en `:root`, en el bloque `@media (prefers-color-scheme: dark)` y en `:root[data-theme="dark"]`) — sin este tinte el texto no tendría contraste suficiente sobre la tela.
  - Cada sección usa un `background-position` distinto (con su propio ajuste en `@media (max-width:720px)`) para no repetir literalmente el mismo recorte de la foto en cada bloque, aunque sea la misma imagen de fondo.
  - El hero **tuvo** una tarjeta de vidrio esmerilado envolviendo `.hero-copy`, pero el usuario pidió (2026-08-31) quitarla para que el fondo del hero se vea igual de continuo que el resto de las secciones. Ahora `.hero-copy` solo es `position:relative; z-index:1;` y el texto va directo sobre la seda tintada — el contraste lo da el tinte `--silk-photo-ivory` (76%/74%), verificado en claro y oscuro. Al quitar el padding de la tarjeta, el titular pasó de 3 a 2 líneas ("Joyas con *alma*," / "hechas para durar."). `.hero h1` lleva `padding-left:.06em` para que el pie curvo de la "J" de Fraunces no cuelgue del margen. `--surface-glass` sigue en uso en la nav al hacer scroll.
  - **`--photo-champagne` existió y se usó primero solo en el hero** (para diferenciar la "portada" del resto), pero el usuario pidió después unificar todo el sitio con un solo tono/foto → se quitó del hero y quedó sin uso en ningún selector. Si en algún momento se reactiva un fondo distinto para el hero, la foto original está en `IMAGENES JOYAS/Texturas de seda/` lista para volver a optimizarse e insertarse igual que la marfil.
  - Un detalle chico de paleta: `#coleccion` tiene además una capa extra `radial-gradient(..., var(--emerald-veil), transparent 70%)` — un verde esmeralda profundo casi imperceptible (~5-7% opacidad) en una esquina, como guiño sutil a la paleta "blanco/marfil/champán/dorado/esmeralda/negro suave" que pidió el usuario, sin tocar el dorado como único acento en botones/bordes/íconos.

### Logo
No existe un archivo de logo real (se buscó en Canva y en carpetas locales del usuario y no se encontró uno). El logo se recreó en HTML/CSS puro como un "lockup":
- **"D" + "C"** superpuestas en Fraunces bold, la C en color dorado con margen negativo para que se solapen (imitando el monograma real de la marca, visto en fotos de producto con marca de agua).
- Debajo: línea dorada fina, "18K" en cursiva, "Amor, arte y estilo" en mayúsculas pequeñas con tracking amplio (mono font).
- Usado en dos tamaños: grande en el hero (`.logo-lockup`, reemplazó un SVG de diamante/gema que estaba ahí antes — se quitó por pedido explícito del usuario), y pequeño en el badge circular de la barra de navegación (`.brand-mark`, 52px, antes 38px — se agrandó para darle más presencia al logo).

### Layout / componentes
- Nav fija con blur al hacer scroll (clase `.is-scrolled`), menú hamburguesa en móvil.
- Botones: `.btn-fill` (sólido, color según tema) y `.btn-ghost` (borde, transparente).
- `.container` con `max-width: 1160px` centra todo el contenido.
- Grids con `clamp()` para tipografía fluida entre móvil y desktop.
- Se respeta `prefers-reduced-motion` (desactiva animaciones/scroll suave).

## Secciones del sitio (todo en `index.html`, navegación por anclas)

| Sección | id | Contenido |
|---|---|---|
| Nav | — | Logo + "Joyería DC", links a cada sección, botón "Cotizar" (WhatsApp) |
| Hero | `#top` | Titular, bajada, botones CTA, fila de stats (18K / seguidores IG / local), logo grande |
| Colección | `#coleccion` | 4 tarjetas de categoría + galería de piezas — **ambas se cargan desde Supabase** (`#catGrid`, `#galleryGrid`, contenedores vacíos que rellena `main.js`). Cada pieza abre WhatsApp con su nombre. Estados de carga (shimmer) y de error (mensaje + WhatsApp) en `catalogo`. |
| Atelier | `#atelier` | 3 bloques "por qué elegirnos" (oro 18K real, diseño con carácter, atención en Ibagué) |
| Sugerencias | `#sugerencias` | Formulario → tabla `sugerencias` (pendiente); la lista pública solo muestra las aprobadas por el dueño |
| Ubicación | `#ubicacion` | Dirección, WhatsApp, Instagram, botón "Cómo llegar" (Google Maps) |
| Footer | — | Resumen de marca, links rápidos, contacto |
| Botón flotante (FAB) | — | WhatsApp "servicio al cliente", fijo abajo a la derecha, visible en todo momento |

## Funcionalidad / interactividad

- **Botones de WhatsApp**: cualquier elemento con clase `wa-link` y atributo `data-wa-msg="..."` recibe automáticamente (vía JS al cargar) un `href` a `wa.me/12405933943?text=...` con ese mensaje. Así se arma cada botón de cotización/compra sin repetir el número a mano.
- **Sugerencias** (Fase 3): formulario → `public.sugerencias` con `estado='pendiente'`. El sitio público solo lista las `estado='aprobada'` (RLS). El dueño modera en `/admin` → pestaña **Sugerencias** (Aprobar / Ocultar / Borrar). Lógica en `assets/main.js` (`initSuggestions`) + `assets/interacciones.js` + `admin/admin.js` (`refreshSugerencias`).
- **Registro de visitas**: `registrarVisita()` en `assets/interacciones.js` inserta una fila en `public.visitas` por carga de página (best effort, sin `await`, llamada desde `initSitio` en `main.js`). Deriva `fuente` del dominio del `document.referrer`, `dispositivo` del user-agent, `pais` del `<meta name="dc-pais">` que inyecta la Edge Function. Panel: pestaña "Visitas" (`admin/admin.js` → `refreshVisitas()` → RPC `resumen_visitas()`).
- **Scroll-reveal**: `IntersectionObserver` agrega la clase `.is-visible` a elementos `.reveal` cuando entran en pantalla.
- **Nav**: se vuelve translúcida/blur al hacer scroll; menú hamburguesa en móvil con `aria-expanded`. Solo el botón "Cotizar" a la derecha (el "Cuenta" de Fase 6 se retiró). En móvil (`≤860px`) el ícono hamburguesa va pegado a la esquina (`margin-left:auto`) y el menú abierto (`.nav-links.is-open`) usa el mismo fondo de seda que el hero (sin borde), para que se vea igual que la portada.
- **Registro de cotizaciones** (Fase 4): un listener delegado en `document` (captura) sobre `.wa-link` inserta en `cotizaciones` antes de abrir WhatsApp. No usa `await` (best effort). La galería y las categorías traen `data-cotiza`/`data-cotiza-origen`/`data-pieza-id`; los `.wa-link` estáticos traen `data-cotiza`/`data-cotiza-origen` en el HTML.
- **Textos editables** (Fase 5): elementos con `data-cs="clave"` (y `data-cs-html` para el h1 del hero). `assets/contenido.js` los rellena desde `contenido_sitio`. Si la clave no existe o la carga falla, se queda el texto del HTML.
- **País de la visita** (Netlify Edge Function `netlify/edge-functions/geo-pais.js`): lee `context.geo.country.code` e inyecta `<meta name="dc-pais" content="XX">` en `<head>` de la portada. No usa cookies. Declarada en `netlify.toml` (`[[edge_functions]]`, paths `/` y `/index.html`). Si al desplegar falta la carpeta, las visitas se registran igual con país "Desconocido".

## Fuentes de las fotos de producto

Las 9 fotos actuales en la galería de Colección vienen de `IMAGENES JOYAS/Versiones para web/` **dentro del proyecto** — el usuario copió ahí toda la carpeta que antes vivía en `~/.codex/.chatgpt-projects/g-p-68bcc7fb61d08191bf68f5a156de13df/Imagenes de joyas encontradas/`. Si se necesita esa ruta externa por algún motivo, ya no es necesaria: todo está local en `IMAGENES JOYAS/`.

- `Fotos originales por producto/` — organizada por pieza (9 piezas: corona 15, corona piedras de colores, anillo banda verde, pulseras Colombia, anillo piedra azul, pulsera esferas doradas, cadena cruz, anillo piedra verde, argollas), varias tomas por pieza. Fuente para si se necesitan **más** fotos o ángulos distintos de una pieza ya usada.
- `Versiones para web/` — recortes ya optimizados, de aquí salieron las 9 fotos embebidas en `index.html`: `corona-15.jpeg`, `corona-colores.jpeg`, `anillo-azul.jpeg`, `anillo-verde.jpeg`, `banda-verde.jpeg`, `cadena-cruz.jpeg`, `pulsera-colombia.jpeg`, `pulsera-esferas.jpeg`, `argollas.jpeg` (+ `preview-catalogo.png`, sin usar todavía). Dos de estas incluyen marca de agua real de la marca (`@joyeriadc__` y el logo "DC"), confirmando que son fotos propias del negocio, no stock genérico.

Antes se había probado con imágenes sacadas de la cuenta de Canva del usuario (carpeta "Subidos"), pero esas solo se pudieron traer en 200px de resolución (limitación de la API de Canva, no hay forma de bajar el original ahí) — se reemplazaron por las de `IMAGENES JOYAS/` en cuanto estuvieron disponibles, que sí son buena resolución (hasta ~900px). Si en algún momento se necesitan más piezas para la galería, revisar primero `Fotos originales por producto/` antes de volver a Canva.

## Fuentes de las fotos de textura (seda)

El usuario subió dos fotos de tela de seda (stock de Pexels, no de su negocio) para usar como fondo ambiental del sitio: `pexels-artempodrez-7232394.jpg` (seda champán/dorada) y `pexels-beyzaa-yurtkuran-279977530-17325397.jpg` (seda blanca/marfil), ambas originalmente en `~/Downloads`.

- Se copiaron sin modificar a `IMAGENES JOYAS/Texturas de seda/Originales/` (JPG, ~2-3 MB cada una, resolución original ~3456×6144 y ~4000×6000).
- Se generaron versiones optimizadas en `IMAGENES JOYAS/Texturas de seda/Versiones para web/` (WebP, lado largo redimensionado a 1800px, calidad ~72): `seda-champagne.webp` (~155 KB) y `seda-marfil.webp` (~42 KB). Se usó Python + Pillow para el redimensionado/conversión a WebP (no había `cwebp` ni ImageMagick instalados en la máquina; se instaló Pillow vía pip solo para esta tarea).
- Solo `seda-marfil.webp` terminó embebida en `index.html` (ver "Textura de seda"). `seda-champagne.webp` quedó en la carpeta sin usar, por si se retoma la idea de un fondo distinto para el hero.

## Preferencias del usuario a tener en cuenta

- **No inventar información del negocio** (precios, horarios, métodos de pago que no existen, testimonios falsos). Ante la duda, omitir el dato y preguntar, no rellenar.
- Prefiere **fotos reales del negocio** sobre placeholders o gráficos genéricos — cuando pide "usa mis fotos", hay que buscar en sus fuentes reales (Canva, carpetas locales) antes de recurrir a SVG/CSS decorativo.
- Da referencias visuales (capturas de pantalla, fotos de producto, resultados de búsqueda de sitios como Magnific) para dirección de diseño — hay que interpretarlas como guía de estilo, no asumir que hay que usar el archivo exacto si no está disponible/accesible.
- Pide cambios de forma directa e iterativa. (Antes cada cambio se republicaba como el mismo Claude Artifact; post Fase 1 el sitio se publica en Netlify — ver `README.md`.)
- Prefiere que se valide el HTML (estructura balanceada, imágenes válidas) antes de publicar, dado que el archivo es demasiado grande para previsualizarlo cómodamente en el navegador de la herramienta.
- Cuando pide "textura de fondo" para el sitio, prefiere **un solo tono/foto aplicado de forma consistente en toda la página** por sobre alternar varias fotos/colores distintos por sección — aunque el pedido inicial haya sido justo lo contrario (alternar). Pasó con la seda: primero se implementó alternando champán en el hero y marfil en el resto, y el usuario pidió después unificar todo con la marfil. Ante un nuevo cambio de fondo, mejor preguntar/confirmar en vez de asumir que "alternar" sigue siendo lo deseado.

## Skills del proyecto

- **`revision-final`** (`.claude/skills/revision-final/SKILL.md`) — audita cualquier `.html` del proyecto contra un checklist fijo: botones/links correctos, se ve bien en móvil (375px), sin texto de relleno, imágenes cargan, tono consistente con el resto del sitio. Reglas clave:
  - Prueba el sitio en el navegador real (no solo lee el código); si el navegador falla en abrir el HTML por su tamaño (limitación ya vista en este proyecto), cae a análisis estático y lo dice explícitamente en vez de omitirlo.
  - Entrega el reporte priorizado (Crítico → Alto → Medio → Bajo) en el chat **y** lo agrega con fecha a `revision-final.md` en la raíz (historial acumulado, nunca lo sobrescribe).
  - **No corrige nada por su cuenta**, ni lo obvio — solo reporta, hasta que el usuario apruebe qué arreglar.
  - Se invoca escribiendo `/revision-final` o pidiéndolo por nombre. Como es un skill de proyecto (vive en `.claude/`, no en la config global), puede requerir abrir una sesión nueva para que aparezca listado como invocable.

- **`brainstorming`** (`.claude/skills/brainstorming/SKILL.md`) — se usa al arrancar cualquier desarrollo nuevo (sección, función, cambio de diseño no trivial) que deje espacio a más de una interpretación. Reglas clave:
  - Antes de preguntar, revisa qué ya es inferible del código, de este `CLAUDE.md` y de la conversación — solo pregunta lo que de verdad falta definir.
  - Pregunta de forma concreta y agrupada (ejes típicos: alcance, contenido/datos reales, diseño/ubicación, comportamiento, prioridad).
  - Al final presenta **2-3 alternativas concretas** (nombre corto + qué implica + trade-off principal) y espera a que el usuario elija antes de implementar.
  - **No escribe ni edita código durante la skill** — es solo indagación y propuesta.
  - No se usa para pedidos triviales, bugfixes con causa clara, o cuando el usuario ya dio todos los detalles.
  - Se invoca escribiendo `/brainstorming`, pidiéndolo por nombre, o automáticamente cuando el pedido lo amerita.

- **`design-spec`** (`.claude/skills/design-spec/SKILL.md`) — se usa después de tener claridad sobre el problema y qué se va a construir (típicamente justo después de `brainstorming`, con una alternativa ya elegida), para dejarlo documentado antes de escribir código. Reglas clave:
  - Genera (o actualiza, si ya existe uno relacionado) un archivo en `docs/specs/YYYY-MM-DD-titulo.md`.
  - Siempre con estas seis secciones, en este orden: Overview, Usuarios objetivo, Contexto del problema, Alcance v1, Comportamiento esperado, Posibles errores y mitigaciones.
  - Todo escrito desde el punto de vista del usuario/negocio, no de la implementación técnica.
  - **No implementa nada** — solo el documento.
  - **Termina con un approval gate**: pregunta explícitamente si el usuario quiere iterar el spec (se ajusta el mismo archivo y se repite el gate) o aprobarlo y continuar con `design-plan`. Sin elección explícita del usuario no se avanza — el silencio no cuenta como aprobación.
  - Se invoca escribiendo `/design-spec`, pidiéndolo por nombre, o cuando el usuario pida dejar algo documentado antes de construir.

- **`design-plan`** (`.claude/skills/design-plan/SKILL.md`) — se usa después de que el usuario aprueba el spec en el gate de `design-spec`, para generar el plan de implementación. Reglas clave:
  - Genera (o actualiza, si ya existe uno relacionado) un archivo en `docs/plans/YYYY-MM-DD-titulo.md`, idealmente con el mismo slug que su spec de referencia.
  - Siempre con estas cuatro secciones, en este orden: Objetivo, Contexto del problema, El spec de referencia, Lista de tareas a implementar (con detalle suficiente para ejecutar cada una).
  - Cada tarea debe ser trazable a una parte del spec — no agrega alcance que el spec no contempló sin preguntar primero.
  - **No implementa nada** — solo el documento del plan; al final pregunta si se procede a implementarlo.
  - Se invoca escribiendo `/design-plan`, pidiéndolo por nombre, o automáticamente al aprobarse un spec.

- **`verify-after-changes`** (`.claude/skills/verify-after-changes/SKILL.md`) — se usa cuando se considera terminada la implementación de un plan/desarrollo, para probarlo en el navegador antes de darlo por cerrado. Reglas clave:
  - Levanta el servidor local (`preview_start` con la config `joyeria-dc` de `.claude/launch.json`, nunca Bash).
  - Elige **5 casos de prueba** relevantes para el cambio puntual (no una auditoría genérica) y los prueba directo en el navegador.
  - Compara el resultado contra el plan acordado en la conversación y/o el spec más reciente en `docs/specs/`.
  - **A diferencia de `brainstorming`/`design-spec`/`revision-final`, esta skill sí corrige** lo que falle, dentro del mismo ciclo — y si todo cumple, da luz verde y cierra.
  - Documenta la limitación conocida del navegador integrado (pestaña puede quedar "oculta" con capturas en blanco) y cómo recuperarse (cerrar/reabrir pestaña, scroll en pasos cortos, o caer a verificación por código si persiste).
  - Recuerda volver a desplegar en Netlify si el sitio cambió durante la corrección (antes era "republicar el Artifact").
  - Se invoca escribiendo `/verify-after-changes`, pidiéndolo por nombre, o al terminar de implementar algo.

## Pendiente / en curso

- **Migración a Supabase — Fases 1 a 5 HECHAS y verificadas (2026-08-31), en producción.** Fase 6 (cuentas de cliente) se hizo y se **revirtió**. Fase 3 (reseñas por estrellas) se **retiró** (sugerencias siguen).
- **Manejo de visitas + reparación de `perfiles` — IMPLEMENTADO, DESPLEGADO y VERIFICADO EN PRODUCCIÓN (2026-08-31).** Spec/plan en `docs/{specs,plans}/2026-08-31-visitas-y-reparacion-perfiles.md`. Migraciones: `reparar_perfiles`, `retirar_resenas`, `visitas_v2`. Verificado en vivo: galería con fotos, sin Reseñas/Cuenta/corazón, Edge Function inyecta `dc-pais` y la visita se registra con país. Tabla `visitas` limpia (0 filas, lista para tráfico real).
- **EN PRODUCCIÓN:** <https://joyeriadc.netlify.app> (admin: `/admin/`). El sitio Netlify `joyeriadc` está **conectado al repo GitHub `carloslemus11/JoyeriaDC` (branch `main`)** desde el 2026-08-31 → **cada `git push` a `main` redespliega solo** (build vacío, publish `.`, la carpeta `netlify/edge-functions/` va incluida). El push usa un token guardado en el osxkeychain del Mac. Quedó un sitio Netlify huérfano `elaborate-genie-98e47c` de una prueba — se puede borrar.
- Pendientes en el dashboard de Supabase: (1) **volver a desactivar el registro público de usuarios** (se activó en Fase 6). (2) activar "Leaked password protection". (3) poner el **Site URL** = `https://joyeriadc.netlify.app` en Authentication → URL Configuration.
- `revision-final` todavía no se ha corrido ni una vez.
- **Dominio propio `joyeriadc.com` — pendiente (el usuario lo hará más adelante).** Recomendado: comprarlo a través de Netlify (Domain management → Add a domain → Buy), que configura DNS + SSL solo. Después: cambiar el Site URL de Supabase Auth a `https://joyeriadc.com` y agregar `https://joyeriadc.com/**` a Redirect URLs. El código del sitio no requiere cambios (no hay URLs de `netlify.app` hardcodeadas).
