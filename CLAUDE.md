# Joyería DC — sitio web

Sitio de una sola página para **Joyería DC**, joyería de oro 18K en Ibagué, Colombia.
Instagram: [@joyeriadc__](https://www.instagram.com/joyeriadc__/). Local físico: C.C. Los
Panches, local 53, Ibagué. WhatsApp de contacto/ventas: **+1 240 593 3943** (en el sitio
como `wa.me/12405933943`).

Sitio estático multi-archivo (sin build step) con backend en **Supabase** (Postgres + Auth
+ Storage), publicado en **Netlify**. Repositorio git en `carloslemus11/JoyeriaDC` (branch
`main`).

- **EN PRODUCCIÓN:** <https://joyeriadc.netlify.app> · admin en `/admin/`
- **Deploy:** el sitio Netlify `joyeriadc` está conectado al repo GitHub → **cada `git push`
  a `main` redespliega solo** (build vacío, `publish = "."`, incluye `netlify/edge-functions/`).
  El push usa un token guardado en el osxkeychain del Mac del usuario.
- Como `main.js`/`admin.js` son **módulos ES**, el sitio debe servirse por HTTP (server
  local o Netlify); no funciona abriendo el `.html` con `file://`.

## Estructura de carpetas

```
JOYERIA.DC./
├── index.html                  # Sitio público (solo marcado; CSS y JS en assets/)
├── 404.html
├── README.md                   # Correr local, configurar Supabase, publicar en Netlify
├── netlify.toml                # Deploy: publish=".", sin build, cabeceras, edge functions
├── CLAUDE.md                   # Este archivo
├── revision-final.md           # Historial de auditorías (lo crea el skill revision-final)
├── assets/
│   ├── styles.css              # TODO el CSS (~240 KB: incluye la textura de seda en base64)
│   ├── main.js                 # JS del sitio público (módulo ES)
│   ├── config.js               # SUPABASE_URL + publishable key + WA_NUMBER (público, SÍ se versiona)
│   ├── supabase-client.js      # Cliente Supabase compartido (sitio + admin) + healthcheck
│   ├── catalogo.js             # Lectura del catálogo (categorías/piezas/fotoUrl)
│   ├── interacciones.js        # Sugerencias + registro de cotizaciones + registro de visitas
│   ├── contenido.js            # Textos editables del sitio ([data-cs])
│   └── piezas/                 # Fotos de piezas (16 al 2026-10-01; las 9 originales también
│                                #   en Storage, las 7 nuevas sirven de aquí hasta importarlas)
├── admin/
│   ├── index.html              # Panel: tabs Piezas / Categorías / Sugerencias / Cotizaciones / Visitas / Textos
│   ├── admin.css
│   └── admin.js                # Login correo/contraseña + gate de rol admin (public.perfiles)
├── netlify/
│   └── edge-functions/
│       └── geo-pais.js         # Inyecta <meta name="dc-pais"> con el país aproximado (para las visitas)
├── supabase/
│   ├── schema.sql              # Tablas (fuente de verdad del esquema)
│   ├── policies.sql            # RLS + políticas + private.is_admin()
│   ├── storage.sql             # Bucket "piezas" + políticas de Storage
│   ├── seed-catalogo.sql       # Seed de categorías/piezas/fotos
│   ├── funciones.sql           # resumen_visitas() + notas de índices/seeds
│   └── setup.md                # Pasos de configuración + pendientes manuales del dashboard
├── docs/
│   ├── specs/                  # Specs (skill design-spec) — YYYY-MM-DD-titulo.md
│   └── plans/                  # Planes (skill design-plan) — YYYY-MM-DD-titulo.md
├── IMAGENES JOYAS/             # Assets de marca copiados al proyecto por el usuario
│   ├── Fotos originales por producto/   # Todas las tomas por pieza (9 piezas)
│   ├── Versiones para web/              # Recortes optimizados (de aquí salieron las 9 fotos del catálogo)
│   ├── Texturas de seda/                # Fotos de seda para el fondo (Originales/ y Versiones para web/)
│   └── Logo/logo-referencia-dc.png      # Logo de referencia que mandó el usuario (fondo de seda horneado)
└── .claude/
    ├── launch.json             # Config del server local para preview (`joyeria-dc`)
    └── skills/                 # brainstorming, design-spec, design-plan, verify-after-changes, revision-final
```

## Backend Supabase

- Proyecto: `ardfyksmwwwignoejaft` — `https://ardfyksmwwwignoejaft.supabase.co`.
- Esquema, RLS, Storage y funciones aplicados vía migraciones. **Fuente de verdad:
  `supabase/*.sql`.** Si se recrea el proyecto: correr `schema.sql` → `policies.sql` →
  `storage.sql` → `funciones.sql` → `seed-catalogo.sql` en el SQL Editor.
- **Tablas** (`public`): `categorias`, `piezas`, `pieza_fotos`, `sugerencias`,
  `cotizaciones`, `contenido_sitio`, `perfiles`, `visitas`. `piezas.disponibilidad`
  (`'disponible'|'encargo'|'agotada'`, default `'disponible'`) — migración
  `piezas_disponibilidad` (2026-09-01).
- **Regla RLS:** el público (anon) solo LEE catálogo/textos activos e INSERTA
  sugerencias / cotizaciones / visitas. Todo lo demás exige sesión admin
  (`private.is_admin()` = tener fila en `public.perfiles` con `rol='admin'`). Hoy hay **un
  solo usuario**: `cjlr0318@gmail.com` (el dueño).
- **Bucket de Storage `piezas`** (lectura pública, escritura solo admin) — sirve las 9 fotos
  originales del catálogo desde `piezas/catalogo/*`. Las 7 piezas agregadas el 2026-10-01
  todavía sirven desde `assets/piezas/` (respaldo del sitio) hasta que se usen "Importar
  fotos iniciales" en `/admin`.
- **Función RPC:** `public.resumen_visitas()` (SECURITY INVOKER, solo `authenticated`) —
  agrega el panel de Visitas (hoy, 30 días, por día, por fuente/dispositivo/país).
- **Pendientes manuales en el dashboard** (no se pueden por API) — ver `supabase/setup.md`:
  1. **Desactivar "Allow new users to sign up"** (se activó para la Fase 6, ya retirada;
     todavía sigue activo, hay que apagarlo).
  2. Site URL = `https://joyeriadc.netlify.app` en Authentication → URL Configuration.
  3. Activar "Leaked password protection" (Attack Protection) — solo plan Pro; opcional.

### Incidente — proyecto pausado por inactividad (2026-10-01)

El proyecto (plan Free) se pausó tras ~1 mes sin actividad; el dominio
`ardfyksmwwwignoejaft.supabase.co` llegó a no resolver por DNS y el catálogo del sitio
quedó caído (errores `TypeError: Failed to fetch` en consola). El usuario lo reanudó desde
el dashboard de Supabase. **Lección para la próxima vez que esto pase:**

- Tras reanudar, **el dominio y el servicio de Postgres vuelven primero; los datos
  (`public.*`, `auth.users`, Storage) pueden tardar varios minutos más en repropagarse** —
  un `list_tables` justo después de reanudar puede mostrar el schema `public` vacío sin que
  el proyecto esté realmente en blanco. Antes de asumir que hay que reconstruir desde cero,
  esperar unos minutos y volver a chequear.
- Esa vez no se esperó: se corrieron `schema.sql` → `policies.sql` → `storage.sql` →
  `funciones.sql` → `seed-catalogo.sql` contra lo que parecía un proyecto vacío, y a mitad
  de camino los datos originales terminaron de repropagarse por su cuenta. Resultado: las
  9 piezas quedaron duplicadas (18) porque el `insert` del seed no es idempotente (a
  diferencia de `categorias`, que sí tiene `on conflict (slug) do nothing`). Se arregló
  dedupeando por `nombre` y quedándose con el `created_at` más antiguo (las filas
  originales, del 2026-08-31, con fotos ya subidas a Storage) — los `pieza_fotos`
  asociados a los duplicados se fueron solos por el `on delete cascade`.
  Las políticas de Storage sí fallaron ruidosamente en el reintento ("already exists") en
  vez de duplicarse, porque `create policy` no tolera nombres repetidos — ese error fue la
  pista de que el dato original ya había vuelto.
  `auth.users` / `public.perfiles` (login admin), `visitas` (150 filas), `cotizaciones` (4)
  y `contenido_sitio` (20 claves) **se recuperaron solos**, sin tocar nada — no hizo falta
  recrear el usuario admin ni perder el historial de tráfico.
- **Si vuelve a pasar:** confirmar primero con `select count(*) from auth.users` (o
  similar) separado por un par de minutos de espera antes de correr cualquier migración de
  reconstrucción. Si tras esperar sigue en cero, ahí sí se asume borrado y se reconstruye
  desde `supabase/*.sql` como dice el comentario de cabecera de `schema.sql`.

### Cómo llegamos acá (historia condensada)

El sitio nació como un único archivo autocontenido publicado como Claude Artifact. El
2026-08-31 se migró a Supabase en fases:

- **Fases 1–5 (hechas y en producción):** fundación (esquema/RLS/Storage/git/multi-archivo)
  · catálogo desde Supabase + panel `/admin` con CRUD · sugerencias con moderación ·
  registro de cotizaciones (cada clic de `.wa-link`) · textos editables (`contenido_sitio`,
  20 claves).
- **Fase 6 (cuentas de cliente + favoritos): se hizo y se REVIRTIÓ.** No aportaba a un
  negocio 100% WhatsApp. Ya no existen `public.favoritos` ni `assets/cuenta.js` ni el botón
  "Cuenta". (Dejó activo el registro público de usuarios en Auth → hay que apagarlo.)
- **Widget de reseñas por estrellas (Fase 3): se RETIRÓ** (nunca recibió calificaciones
  reales). Ya no existen la tabla `calificaciones`, la función `resumen_calificaciones()`
  ni la sección `#resenas`. **El formulario de Sugerencias sí sigue.**
- **Reparación de `perfiles`:** una sesión previa borró `public.perfiles` (y de paso
  `calificaciones`/`favoritos`), lo que tumbó la galería pública y el login de `/admin`
  (todo cuelga de `private.is_admin()`, que lee `perfiles`). Migración `reparar_perfiles`
  la recreó y reasignó el rol admin.
- **Manejo de visitas (migración `visitas_v2`):** tabla `public.visitas` — un registro por
  carga de página, anónimo (sin IP, sin identificador persistente): `path`, `seccion`,
  `fuente`, `referrer_dominio`, `dispositivo`, `pais`. RLS: insert público, select solo
  admin. Ya recibe tráfico real.

Specs/planes en `docs/specs/` y `docs/plans/` (`2026-08-31-migracion-supabase*` y
`2026-08-31-visitas-y-reparacion-perfiles`).

## Modelo de negocio reflejado en el sitio

- **No hay pasarela de pago ni checkout online.** Todo botón de "Comprar"/"Cotizar" abre
  WhatsApp (`wa.me`) con un mensaje pre-escrito que menciona la pieza específica. Así opera
  el negocio de verdad — **no inventar un método de pago que no existe.**
- **No hay precios ni horario de atención publicados** porque no se tiene esa info
  confirmada. Mejor omitir que inventar.
- Las sugerencias arrancan **vacías** a propósito — nada de testimonios de relleno; se
  llenan solo con interacciones reales.

## Decisiones de diseño

### Filosofía
Estética "premium, con capas" tipo Apple: mucho espacio en blanco, tipografía grande,
paneles translúcidos, scroll-reveal sutil, botones tipo píldora. Se respeta
`prefers-reduced-motion`.

### Dependencias externas
Google Fonts (tipografías, abajo) y —desde Fase B— un `<iframe>` de Google Maps
(`output=embed`, sin API key) en la sección Ubicación. Nada más carga de terceros.

### Tipografía (Google Fonts)
- **Fraunces** (serif variable, con eje óptico e itálica) — titulares grandes y acentos en
  cursiva (la palabra "alma" del hero, el "18K" del logo, el monograma DC).
- **Manrope** — cuerpo (párrafos, botones, nav).
- **IBM Plex Mono** — "etiquetas de datos": eyebrows, tags, labels en mayúsculas con
  tracking amplio. Aire de "ficha de producto / certificado".

### Colores — paleta pastel oro rosa (CSS custom properties en `:root`)

**Modo claro (por defecto):** `--bg:#F7EAE2` · `--bg-alt:#EFDCD1` · `--ink:#4A362E` (cacao,
no negro) · `--gold:#BC9268` / `--gold-strong:#9C7548` (oro-rosado apagado) ·
`--rose:#DDB1A5` · botón sólido cacao oscuro, texto crema.

**Modo oscuro** (`prefers-color-scheme: dark` o `:root[data-theme="dark"]`):
`--bg:#2C201C` (ciruela) · `--ink:#F5E5D9` · `--gold:#E4BA8C` / `--gold-strong:#F1CDA2` ·
botón sólido dorado claro, texto oscuro (invertido a propósito).

Ambos temas están **completamente definidos** — paleta clara en `:root`, oscura repetida en
`@media (prefers-color-scheme: dark)` y en `:root[data-theme="dark"]`. Nunca dejar un tema a
medias.

### Fondos por sección (2026-09-01 — se abandonó la "seda continua")

Antes toda la página era una sola foto de seda continua. **Ahora la seda es solo un acento
en 2 sitios** y cada zona tiene su propio fondo, a pedido del usuario:

| Sección | Fondo |
|---|---|
| Hero (`#top`) | **Seda marfil** (`--silk-photo-ivory`, ahora con más tinte para que el texto se lea) |
| Franja de confianza (`.trust-strip`) | Blanco cálido (`--sec-blanco`) |
| Colección (`#coleccion`) | **Marfil liso** (`--sec-marfil`, opaco, sin foto — las joyas son las protagonistas) |
| Atelier (`#atelier`) | **Seda marfil** (la "sección destacada" con seda) |
| Garantía (`#garantia`) | **Chocolate oscuro** (`--sec-choco`) con texto crema (`--sec-choco-ink` / `--sec-choco-soft` / `--sec-choco-gold`) |
| FAQ (`#faq`), Ubicación (`#ubicacion`), Sugerencias (`#sugerencias`), footer | Blanco cálido (`--sec-blanco`) |

Orden de secciones en `index.html`: hero → trust → `#coleccion` → `#atelier` → `#garantia`
→ `#faq` → `#ubicacion` → `#sugerencias` → footer. (`#garantia` se movió **antes** de
`#faq` para que el bloque chocolate corte entre el catálogo y la info práctica.)

**Arquitectura de la seda (sigue igual para hero y atelier):** un único elemento
`.page-silk` (`<div class="page-silk">`, primer hijo de `<body>`) con `position:fixed;
inset:0; z-index:0` pinta la foto (`--photo-ivory`, WebP en base64 en `styles.css`). El
contenido va encima (`main, footer { position:relative; z-index:1 }`). Hero y atelier son
translúcidos (`background: var(--silk-photo-ivory)`, ahora ~0.86 claro / ~0.85 oscuro — más
tinte que antes) y dejan ver `.page-silk`. El resto de secciones son **opacas** y la tapan.
Todos los tokens `--sec-*` y `--silk-photo-ivory` tienen variante clara y oscura.

- **Por qué así:** antes cada sección tenía su propia copia de la foto con un
  `background-position` distinto → costuras visibles en cada junta. `background-attachment:
  fixed` lo arreglaba pero **iOS Safari lo ignora**. Un elemento `position:fixed` real sí
  funciona en iOS.
- `#coleccion` conserva su `radial-gradient(--emerald-veil)` (verde esmeralda ~5-7%
  opacidad en una esquina) **encima** del marfil liso.
- El menú móvil abierto (`.nav-links`) lleva una **copia opaca** de la seda (`center/cover`)
  para tapar el contenido de la página detrás.
- El `hero` es **full-width** (`<header>` sin `max-width`; el contenido se limita con
  `.hero-inner`) para que la seda llegue a los bordes. `.hero-copy` ya no tiene tarjeta de
  vidrio esmerilado (se quitó a pedido del usuario); el texto va directo sobre la seda
  tintada y el contraste lo da el tinte. El titular quedó en 2 líneas
  ("Joyas con *alma*," / "hechas para durar.").
- `.hero h1` lleva `padding-left:.06em` para que el pie curvo de la "J" de Fraunces no
  cuelgue del margen.
- **Sistema CSS de seda anterior** (`.silk` / `.silk-alt`, puros gradientes): `.silk` sigue
  en `<body>` como fallback muerto detrás de `.page-silk` (ya no se ve). Se usa aún en
  cajas decorativas chicas (`.story-art`, `.loc-visual`). `--surface-glass` sigue vivo en la
  nav al hacer scroll. **Lección aprendida:** NO usar `repeating-linear-gradient` con stops
  duros para simular pliegues de tela — el usuario lo rechazó por verse artificial;
  gradientes suaves y difusos.
- Al usuario le gusta **un solo tono/foto consistente en toda la página**, aunque un pedido
  inicial suyo diga "alternar". Ante un cambio de fondo, confirmar en vez de asumir.

- **Cadena decorativa sobre la seda (probada y retirada el 2026-09-01):** se hizo una
  cadena de eslabones de oro dibujada en CSS (`.chain-drape` diagonal + `.chain-accent`
  recto, `background-image` de un eslabón SVG repetido) que cruzaba el hero y bajaba por el
  borde derecho de toda la página. Tras varias iteraciones de intensidad, al usuario no le
  convenció y pidió quitarla. Ya no existe en el código. **Lección:** los acentos
  decorativos sobre la seda tienden a competir con el contenido; el usuario prefiere la
  seda limpia + la foto protagonista del hero.

### Logo (HTML/CSS puro — no hay archivo vectorial en el repo)

El **2026-09-01** el usuario compartió un logo de referencia
(`IMAGENES JOYAS/Logo/logo-referencia-dc.png`): monograma DC entrelazado en oro rosa, con un
diamante tipo marquesa en el cruce y "AMOR, ARTE Y ESTILO" debajo. Pidió adaptarlo "jugando
solo con la D y la C, sin tocar los colores de fondo". Estado actual:

- **Monograma "D" + "C" entrelazado:** dos `<span>` (`.logo-d`, `.logo-c`) en Fraunces. La D
  va delante (`z-index:2`), la C detrás (`z-index:1`) con `margin-left` negativo (solape
  hondo) + un `translateY` chico (cae un poco, como dos aros enlazados). Ambas en oro rosa
  (`--gold-strong` la D, `--gold` la C).
- **Diamante en el cruce** (`.logo-gem`, solo en el hero): rombo/marquesa con `clip-path`,
  gradiente blanco→`--rose`→`--gold-strong`, `position:absolute` sobre la junta D/C.
- Debajo: línea dorada fina (`.logo-rule`), "18K" en cursiva, "Amor, arte y estilo" en mono
  con tracking amplio.
- Tres apariciones: hero (`.logo-lockup.logo-lockup--sm`, con diamante, en menor tamaño
  debajo de la foto protagonista — antes era el monograma gigante que dominaba el hero),
  badge circular de la nav (`.brand-mark`, 52px, sin diamante y con solape más suave para
  que la C se lea), y el mismo badge en el footer.
- Para usar el logo real como imagen haría falta un **PNG/SVG con fondo transparente** (el
  de referencia tiene la seda horneada).

### Layout / componentes
- Nav fija con blur al hacer scroll (`.is-scrolled`); hamburguesa en móvil (`≤860px`) con
  `aria-expanded`, pegada a la esquina (`margin-left:auto`). A la derecha solo el botón
  "Cotizar" (WhatsApp).
- Botones: `.btn-fill` (sólido, color por tema) y `.btn-ghost` (borde, transparente).
- `.container` con `max-width:1160px` centra el contenido de las secciones.
- Grids con `clamp()` para tipografía fluida.

## Secciones del sitio (todo en `index.html`, navegación por anclas)

| Sección | id | Contenido |
|---|---|---|
| Nav | — | Logo + "Joyería DC", links (Colección / Atelier / Preguntas / Ubicación), botón "Cotizar" |
| Hero | `#top` | Titular, bajada, CTAs, fila de stats (18K / seguidores IG / local), **foto protagonista de una pieza** (`assets/hero-joya.jpeg`) + monograma DC pequeño con diamante debajo (`.hero-visual` / `.logo-lockup--sm`) |
| Franja de confianza | — | `.trust-strip` tras el hero: 5 mensajes con ícono (Oro 18K · compra presencial en Ibagué · atención personalizada · garantía 6 meses · envíos + pagos). Textos con `data-cs="trust1..5"`. No interactiva |
| Colección | `#coleccion` | 4 tarjetas de categoría + galería de piezas, **ambas desde Supabase** (`#catGrid`, `#galleryGrid`, contenedores vacíos que rellena `main.js`). Cada pieza es una tarjeta (`.gallery-item`) con nombre grande, "Categoría · Oro 18K", **etiqueta de disponibilidad** (disponible / por encargo / agotada), botón "Cotizar esta pieza" y disparador de la vista ampliada. "Agotada" atenúa la tarjeta y el botón pasa a "Consultar por WhatsApp". Estados de carga (shimmer) y de error (mensaje + WhatsApp). |
| Atelier | `#atelier` | 3 bloques "por qué elegirnos" |
| Preguntas frecuentes | `#faq` | Acordeón `<details>` nativo (sin JS). Respuestas reales: oro 18K, verlas en persona, horario, formas de pago, envíos, garantía (resumen + enlace a `#garantia`) |
| Garantía | `#garantia` | Texto formal de 4 puntos (autenticidad del oro · defectos de fabricación 6 meses · exclusiones · mantenimiento). Editable desde `/admin` → "Textos". Botón "Preguntar por la garantía" (WhatsApp) |
| Ubicación | `#ubicacion` | Dirección, **horario (L–V 9 a.m.–5 p.m.)**, WhatsApp con número visible, Instagram, **mapa de Google Maps incrustado** (`.loc-visual` → `<iframe>` lazy), botón "Cómo llegar" (Google/Apple Maps) |
| Sugerencias | `#sugerencias` | Bloque compacto **antes del footer** (movido desde su lugar central). Formulario → `public.sugerencias`; la lista pública solo muestra las aprobadas |
| Footer | — | Resumen de marca, links rápidos, contacto |
| FAB / barra CTA | — | En escritorio: FAB circular de WhatsApp abajo a la derecha. En móvil (`≤720px`): el FAB se oculta y aparece `.cta-bar` fija abajo ("Cotizar por WhatsApp"); el `footer` reserva `padding-bottom` para no quedar tapado |
| Modal de pieza | `#piezaModal` | Vista ampliada: foto grande + nombre + "Categoría · Oro 18K" + descripción (si hay) + "Cotizar esta pieza". Abre al tocar una tarjeta; cierra con X / Escape / clic fuera; maneja foco y `body.modal-open` |

## Funcionalidad / interactividad

- **Botones de WhatsApp:** cualquier `.wa-link` con `data-wa-msg="..."` recibe (vía JS al
  cargar) un `href` a `wa.me/12405933943?text=...`. Así se arma cada botón sin repetir el
  número.
- **Registro de cotizaciones:** un listener delegado en `document` (captura) sobre
  `.wa-link` inserta en `public.cotizaciones` antes de abrir WhatsApp (best effort, sin
  `await`). Usa `data-cotiza` / `data-cotiza-origen` / `data-pieza-id`. Panel: pestaña
  "Cotizaciones".
- **Registro de visitas:** `registrarVisita()` (`assets/interacciones.js`) inserta una fila
  en `public.visitas` por carga de página (best effort, llamado desde `initSitio` en
  `main.js`). Deriva `fuente` del dominio del `document.referrer`, `dispositivo` del
  user-agent, `pais` del `<meta name="dc-pais">` que inyecta la Edge Function. Panel:
  pestaña "Visitas" (`refreshVisitas()` → RPC `resumen_visitas()`).
- **País de la visita:** Netlify Edge Function `netlify/edge-functions/geo-pais.js` lee
  `context.geo.country.code` e inyecta `<meta name="dc-pais" content="XX">` en `<head>` (sin
  cookies). Declarada en `netlify.toml` (`[[edge_functions]]`, paths `/` y `/index.html`).
  Si al desplegar falta la carpeta, las visitas se cuentan igual con país "Desconocido".
- **Sugerencias:** formulario → `public.sugerencias` con `estado='pendiente'`. El sitio solo
  lista las `aprobada` (RLS). El dueño modera en `/admin` → pestaña "Sugerencias" (Aprobar /
  Ocultar / Borrar). Lógica: `main.js` (`initSuggestions`) + `interacciones.js` + `admin.js`
  (`refreshSugerencias`).
- **Textos editables:** elementos con `data-cs="clave"` (`data-cs-html` para el h1 del
  hero, que usa `*x*`→`<em>` y `\n`→`<br>`). `contenido.js` los rellena desde
  `contenido_sitio`; si la clave no existe o la carga falla, queda el texto del HTML.
- **Scroll-reveal:** `IntersectionObserver` agrega `.is-visible` a los `.reveal`.
- **Maps:** el botón "Cómo llegar" usa Apple Maps en iOS y Google Maps en el resto.
- **Vista ampliada de pieza (`main.js` → `abrirPieza`/`cerrarPieza`/`initPiezaModal`):** un
  único `#piezaModal` en `index.html` que se rellena al vuelo. `renderPiezas` construye cada
  tarjeta con un `<button class="gallery-open">` (dispara el modal) y un `<a>` "Cotizar esta
  pieza" aparte. La categoría se resuelve con un mapa `categoria_id → nombre` armado en
  `cargarCatalogo` desde las `categorias` ya cargadas. El modal atrapa foco (Tab/Shift+Tab),
  cierra con Escape / X / clic en overlay, y bloquea el scroll con `body.modal-open`.
- **FAQ (`#faq`):** acordeón con `<details>/<summary>` nativo, sin JS.

### Notas del panel `/admin`
- `admin.css` tiene `[hidden]{display:none!important}` porque `.admin-modal`/`.admin-shell`
  usan `display:flex`.
- **NO usar `window.confirm`/`alert`/`prompt`** — devuelven false/nada en varios
  navegadores; usar `confirmar()` de `admin/admin.js`.
- El panel reutiliza un único `#modal` + `#modalForm` para `openModal()` y `confirmar()`.

## Fuentes de las fotos

### Producto (16 piezas en el catálogo, al 2026-10-01)
Las **9 originales** están en `IMAGENES JOYAS/Versiones para web/` (recortes optimizados) y
como respaldo en `assets/piezas/`; ya viven en el bucket de Storage `piezas/catalogo/*` y el
sitio las sirve desde ahí (`pieza_fotos.storage_path`). Dos incluyen marca de agua real
(`@joyeriadc__` / logo "DC") → son fotos propias del negocio, no stock. Para más ángulos de
una pieza: `IMAGENES JOYAS/Fotos originales por producto/`.

`fotoUrl()` en `catalogo.js` resuelve `assets/…` o `/…` como archivo del sitio y el resto
como objeto de Storage.

**7 piezas nuevas (2026-10-01):** el usuario las guardó directo en `IMAGENES JOYAS/` de la
carpeta principal del repo (no en un worktree) — confirmó que son piezas reales que tiene
disponibles, aunque varias llegaron con nombre de archivo de generador de IA
(`studio_product_shot_...`, `a_close_up_...`); se le preguntó antes de subirlas. Procesadas
a JPEG ~675×900 y guardadas en `assets/piezas/` con el mismo convenio
`storage_path = 'assets/piezas/<archivo>.jpeg'` (sin subir a Storage todavía — lo hace
"Importar fotos iniciales" en `/admin` cuando se use):

| Pieza | Categoría | Archivo |
|---|---|---|
| Conjunto esmeralda (aretes, collar y anillo) | Dijes y accesorios | `conjunto-esmeralda.jpeg` |
| Cadena con crucifijo | Cadenas | `cadena-crucifijo.jpeg` |
| Cadena con crucifijo clásica | Cadenas | `cadena-crucifijo-clasica.jpeg` |
| Rosario con dije de Virgen | Cadenas | `rosario-virgen.jpeg` |
| Collar con dije de piedra verde | Cadenas | `collar-piedra-verde.jpeg` |
| Pulsera y anillo de mariposas | Pulseras | `pulsera-mariposas.jpeg` |
| Anillo de corazón con piedra | Anillos | `anillo-corazon-piedra.jpeg` |

Nota: "Cadena con crucifijo" y "Cadena con crucifijo clásica" se ven muy parecidas en foto
— confirmar con el usuario si son dos piezas distintas o la misma fotografiada dos veces;
si es la misma, borrar una desde `/admin` → Piezas.

### Textura de seda
Dos fotos de stock (Pexels) que subió el usuario, en `IMAGENES JOYAS/Texturas de seda/`
(`Originales/` sin tocar, `Versiones para web/` en WebP a 1800px lado largo). Solo
`seda-marfil.webp` (~42 KB) está embebida en el CSS como `--photo-ivory`; la de champán
quedó sin usar.

## Preferencias del usuario a tener en cuenta

- **No es programador.** Ver [[usuario-nivel-tecnico]] en memoria: para tareas de terminal /
  git / deploy / dashboards hay que dar **pasos numerados, una acción por paso**, con
  textos literales y qué botón clickear, y trabajar sobre las capturas que manda. Prefiere
  que Claude haga lo que pueda directo (migraciones por MCP, código, verificación en el
  navegador) y le deje solo lo que requiere sus credenciales.
- **No inventar información del negocio** (precios, horarios, métodos de pago, testimonios).
  Ante la duda, omitir y preguntar.
- Prefiere **fotos reales del negocio** sobre placeholders o gráficos genéricos.
- Da **referencias visuales** (capturas, fotos, resultados de búsqueda) como guía de estilo
  — interpretarlas como dirección, no asumir que hay que usar el archivo exacto.
- Pide cambios de forma **directa e iterativa**.
- Prefiere **un solo tono/foto de fondo consistente en toda la página** (ver "Fondo de
  seda").
- Prefiere validar el HTML/CSS y verificar en el navegador antes de dar algo por cerrado.

## Skills del proyecto

Los archivos viven en `.claude/skills/*/SKILL.md`. Como son skills de proyecto pueden
requerir abrir sesión nueva para aparecer listadas.

- **`brainstorming`** — al arrancar cualquier desarrollo nuevo con espacio a más de una
  interpretación. Revisa qué ya es inferible (código, este archivo, la conversación),
  pregunta concreto y agrupado, y termina con **2-3 alternativas concretas** a elegir. **No
  escribe código.** No se usa para pedidos triviales ni bugfixes con causa clara.
- **`design-spec`** — tras elegir una alternativa, documenta antes de codear. Genera/actualiza
  `docs/specs/YYYY-MM-DD-titulo.md` con seis secciones fijas (Overview, Usuarios objetivo,
  Contexto del problema, Alcance v1, Comportamiento esperado, Posibles errores y
  mitigaciones), desde el punto de vista del usuario/negocio. **No implementa.** Termina con
  un **approval gate** explícito (iterar / aprobar y seguir a design-plan / dejar así).
- **`design-plan`** — tras aprobar el spec. Genera/actualiza `docs/plans/YYYY-MM-DD-titulo.md`
  (mismo slug que el spec) con cuatro secciones fijas (Objetivo, Contexto del problema, El
  spec de referencia, Lista de tareas a implementar). Cada tarea trazable al spec. **No
  implementa.**
- **`verify-after-changes`** — al terminar una implementación. Levanta el server local
  (`preview_start` con `joyeria-dc`, nunca Bash), elige **5 casos de prueba** relevantes,
  los prueba en el navegador, compara contra el plan/spec. **Sí corrige** lo que falle en el
  mismo ciclo. Documenta la limitación del navegador integrado (pestaña "oculta" / capturas
  en blanco; recuperarse cerrando/reabriendo la pestaña o cayendo a verificación por
  código). Recuerda que un `git push` a `main` redespliega en Netlify.
- **`revision-final`** — auditoría del sitio contra un checklist fijo (móvil 375px, botones/
  links, texto de relleno, imágenes, tono). Prueba en el navegador real; si falla, cae a
  análisis estático y lo dice. Entrega el reporte priorizado (Crítico→Bajo) en el chat **y**
  lo acumula con fecha en `revision-final.md`. **No corrige nada** — solo reporta hasta que
  el usuario apruebe. Todavía no se ha corrido ni una vez.

## Pendiente / en curso

- **Mejoras de interfaz — Fases A y B: HECHAS** (specs/planes
  `docs/{specs,plans}/2026-09-01-mejoras-interfaz-fase-{a,b}.md`).
  - Fase A: tarjetas de pieza + modal, franja de confianza, foto protagonista en el hero,
    legibilidad, barra CTA móvil, compactación, FAQ, Sugerencias al pie.
  - Fase B: `piezas.disponibilidad` + selector en `/admin` + etiqueta en galería/modal,
    FAQ con respuestas reales, sección `#garantia`, franja de confianza a 5, horario y
    número visibles en Ubicación, mapa de Google Maps incrustado, grupos nuevos en
    `/admin` → "Textos" (`ubic_horario`, `trust1..5`, `faq_*`, `garantia_*`).
  - **Fuera (posible Fase C):** más fotografías por pieza en el modal (subir a Storage) y
    testimonios de clientes (el negocio aún no tiene reseñas verificables).
  - **Precios: descartados** — el usuario confirmó mantener el sitio sin precios.
  - **Garantía:** 6 meses por defectos de fabricación + primera limpieza sin costo. Si los
    términos cambian, se editan desde `/admin` → "Textos" → "Garantía".
- **Insignia flotante "Powered by Netlify"** (`<iframe id="nl-badge-frame">`): la inyecta
  Netlify en el edge (por eso no está en el repo y solo se ve en producción, no en local).
  Activa por defecto en proyectos del plan Free creados después del 2026-08-19. **No se
  puede quitar por CSS** (va en un frame aislado). Se apaga en el dashboard: Netlify →
  Project configuration → General → "Powered by Netlify badge" → off → Save. Requiere la
  sesión del dueño. Ref: <https://docs.netlify.com/manage/projects/powered-by-netlify-badge/>
- **Supabase Auth (dashboard):** desactivar "Allow new users to sign up"; poner Site URL;
  (opcional, solo Pro) "Leaked password protection". Ver `supabase/setup.md`.
- **Dominio propio `joyeriadc.com`** — el usuario lo hará más adelante. Recomendado:
  comprarlo a través de Netlify (Domain management → Add a domain → Buy) que configura DNS +
  SSL solo. Después: cambiar el Site URL de Supabase Auth a `https://joyeriadc.com` y
  agregar `https://joyeriadc.com/**` a Redirect URLs. El código del sitio no cambia (no hay
  URLs de `netlify.app` hardcodeadas).
- **Sitio Netlify huérfano `elaborate-genie-98e47c`** (de una prueba de deploy) — se puede
  borrar.
- **`revision-final`** todavía no se ha corrido — buen momento ahora que está en producción.
