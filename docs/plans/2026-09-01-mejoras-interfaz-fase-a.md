# Plan — Mejoras de interfaz Fase A

## Objetivo

Implementar la Fase A de mejoras de interfaz del sitio público: que un visitante (sobre
todo en móvil) entienda más rápido qué se vende, sienta más confianza y llegue a WhatsApp
con menos fricción — sin publicar precios y sin depender de datos comerciales nuevos.

## Contexto del problema

Hoy la galería es una cuadrícula de fotos con el nombre en una etiqueta diminuta y sin
botón visible de cotizar; no se puede ver una pieza en grande. El hero lo domina la seda y
el monograma, sin una foto de joya que genere deseo. Hay textos muy pequeños y poco
contraste, la página es larga en móvil, el botón circular de WhatsApp es discreto y tapa
fotos, una insignia flotante resta terminación, y "Sugerencias" ocupa un lugar central que
interrumpe el recorrido de compra.

## El spec de referencia

`docs/specs/2026-09-01-mejoras-interfaz-fase-a.md` (aprobado por el usuario el 2026-09-01).

## Lista de tareas a implementar

### 1. Tarjeta de pieza rediseñada

- **Qué:** rehacer `renderPiezas()` en `assets/main.js` para que cada `.gallery-item` deje
  de ser un único enlace-a-WhatsApp a pantalla completa. Nueva estructura por tarjeta:
  contenedor con (a) media cuadrada con la foto (o estado "sin foto"), (b) bloque de texto
  con nombre de la pieza (grande, `--font-display`), una línea "Categoría · Oro 18K", y
  (c) un botón visible **"Cotizar esta pieza"** (`.btn` estilo relleno pequeño, clase
  `wa-link`, con `data-wa-msg` / `data-cotiza` / `data-cotiza-origen="galeria"` /
  `data-pieza-id` como hoy). La zona de la foto + el nombre son el disparador de la vista
  ampliada (botón/área con `type=button`, `aria-haspopup="dialog"`), y el botón de cotizar
  va aparte y detiene la propagación para no abrir el modal.
- **Dónde:** `assets/main.js` (`renderPiezas`, y el `data-estado`/error se mantienen);
  `assets/styles.css` (nuevas reglas `.gallery-item`, `.gallery-media`, `.gallery-body`,
  `.gallery-name`, `.gallery-meta`, `.gallery-cta`; ajustar/retirar `.gallery-tag`,
  `.gallery-link`, y el bloque duplicado de `.gallery-item` de las líneas ~445-447).
- **Categoría de la pieza:** en `cargarCatalogo()` construir un mapa `categoria_id ->
  nombre` a partir de las `categorias` ya cargadas y pasarlo a `renderPiezas` para pintar
  la línea de meta. Si la pieza no tiene categoría, mostrar solo "Oro 18K".
- **Responde a:** spec §Alcance/Incluye 1; §Comportamiento/"Colección — galería" (estados
  con datos, cotizar desde la tarjeta), §Errores (pieza sin foto).

### 2. Vista ampliada de la pieza (modal)

- **Qué:** agregar al final de `index.html` (antes de `</body>`, fuera de `main`) un único
  contenedor de modal reutilizable: overlay + panel con rol `dialog`, `aria-modal="true"`,
  botón de cierre (X), y huecos para foto grande, nombre, línea "Categoría · Oro 18K",
  descripción y un botón "Cotizar esta pieza". Oculto por defecto (`hidden`).
- **JS:** en `assets/main.js`, función `abrirPieza(pieza, catNombre)` que rellena el modal
  y lo muestra; `cerrarPieza()` que lo oculta. Wire: click en el área foto/nombre de la
  tarjeta → `abrirPieza`. Cierre con botón X, tecla `Escape`, y click en el overlay
  (fuera del panel). Al abrir: mover foco al botón de cierre y bloquear el scroll del
  `body` (clase en `body`). Al cerrar: devolver el foco a la tarjeta de origen. El botón
  "Cotizar" del modal es `.wa-link` con los mismos `data-*` que la tarjeta y
  `data-cotiza-origen="galeria-modal"`; llamar `wireWaLinks` sobre el modal tras rellenar.
- **CSS:** reglas de overlay (fondo `--ink` translúcido), panel centrado con `max-width`,
  scroll interno si el contenido excede el alto, foto con `object-fit`. Respetar
  `prefers-reduced-motion` (sin transición de entrada/salida si está activo).
- **Sin descripción:** si `pieza.descripcion` es vacío, no renderizar ese bloque.
- **Responde a:** spec §Alcance/Incluye 2; §Comportamiento/"Abrir/Cerrar vista ampliada",
  "Cotizar desde el modal"; §Errores (pieza sin descripción, sin foto,
  `prefers-reduced-motion`).

### 3. Franja de confianza

- **Qué:** agregar en `index.html` una sección/banda nueva (`.trust-strip`) justo después
  del `</header>` del hero y antes de `<section id="coleccion">`. Tres ítems, cada uno
  ícono SVG inline + texto corto:
  1. "Oro 18K en cada pieza"
  2. "Compra presencial — C.C. Los Panches, local 53, Ibagué"
  3. "Atención y cotización personalizada por WhatsApp"
  No interactiva. Marcar `aria-hidden="false"` normal; es contenido informativo.
- **CSS:** `.trust-strip` como flex horizontal centrado en escritorio; en `≤720px` apilar
  en columna o permitir scroll-x (elegir apilar para no esconder info). Tinte translúcido
  de seda coherente con las demás secciones (`--silk-photo-ivory`) para no romper el fondo
  continuo.
- **Textos editables:** exponer los 3 textos con `data-cs="trust1"`, `trust2`, `trust3`
  para poder editarlos luego desde el panel (sin agregar claves a Supabase ahora; si la
  clave no existe queda el texto del HTML, que es el comportamiento actual de
  `contenido.js`).
- **Responde a:** spec §Alcance/Incluye 3; §Comportamiento/"Franja de confianza".

### 4. Foto protagonista en el hero

- **Qué:** en `index.html`, dentro de `.hero-inner`, reemplazar el bloque `.logo-wrap`
  actual por un bloque `.hero-visual` que contenga (a) una fotografía protagonista de una
  pieza y (b) el lockup del logo en menor tamaño integrado (o moverlo debajo del titular).
  Elegir una foto de `IMAGENES JOYAS/Versiones para web/` con presencia (candidatas:
  `anillo-azul.jpeg`, `cadena-cruz.jpeg`, `argollas.jpeg`) y copiarla a `assets/` (o
  reutilizar la de `assets/piezas/`) — usar la versión ya optimizada, verificar peso.
- **CSS:** `.hero-visual` con la foto en `object-fit:cover`, esquinas redondeadas suaves,
  sombra sutil, dentro de la grilla del hero (columna derecha en escritorio, debajo del
  texto en `≤960px`). El monograma con diamante (`.logo-lockup`) se reescala (más chico) y
  se posiciona sobre o junto a la foto sin taparla. `.page-silk` no se toca.
- **Responde a:** spec §Alcance/Incluye 4; §Comportamiento/"Hero"; §Errores (peso de la
  foto del hero).

### 5. Legibilidad y contraste

- **Qué:** subir tamaños mínimos y reforzar contraste, respetando la paleta:
  - `.eyebrow`: 12px → 13px (y `≥13px` en móvil).
  - `.stat-label`: 11.5px → 13px; color `--muted` (#AB9284) → `--ink-soft` (#83685B).
  - `.stat-num`: revisar que se lea (subir a ~24px si hace falta).
  - `.nav-links a`: 14px → 15px; color `--ink-soft` → `--ink` (o intermedio) para más
    contraste.
  - `.cat-card p` y `.gallery-meta`: `--muted` → `--ink-soft`, tamaño mínimo 14.5px.
  - `.sugg-meta`, `.loc-item p`: revisar mismo criterio (`--muted` → `--ink-soft` donde el
    texto sea informativo, no decorativo).
  - Verificar en modo oscuro que los cambios no rompan contraste inverso.
- **Dónde:** `assets/styles.css` (reglas puntuales; sin tocar los tokens base salvo que se
  decida ajustar `--muted` globalmente — preferir cambios por selector).
- **Responde a:** spec §Alcance/Incluye 5; §Comportamiento/"Página" (legibilidad).

### 6. Llamada a la acción móvil permanente

- **Qué:** en `index.html`, añadir una barra fija inferior `.cta-bar` (solo visible en
  móvil) con ícono de WhatsApp + "Cotizar por WhatsApp", como `.wa-link` con
  `data-wa-msg` genérico y `data-cotiza-origen="cta-movil"`. Ocultar el `.fab` circular en
  móvil (mantenerlo en escritorio) — o retirar el FAB y dejar solo la barra en móvil y
  nada flotante en escritorio; decidir en implementación viendo el resultado, por defecto:
  barra en móvil, FAB en escritorio.
- **CSS:** `.cta-bar{position:fixed; left/right/bottom:0; ...}` con tinte sólido para
  contraste, `display:none` por defecto y `display:flex` en `@media (max-width:720px)`;
  `.fab` pasa a `display:none` en ese mismo breakpoint. Añadir `padding-bottom` extra al
  `footer` (o al `body` en móvil) equivalente al alto de la barra para que nada quede
  tapado. Verificar a 375px.
- **Responde a:** spec §Alcance/Incluye 6; §Comportamiento/"Llamada a la acción móvil";
  §Errores (barra tapando contenido a 375px).

### 7. Quitar la insignia flotante

- **Qué:** identificar en el navegador (preview) qué es la insignia flotante ("Powered by
  Netlify" u otra). Si viene de un elemento del propio sitio, quitarlo. Si la inyecta
  Netlify y no es editable por código, documentarlo como pendiente de configuración de
  Netlify en el propio plan/CLAUDE.md y aplicar el CSS de ocultamiento que sí sea posible.
- **Dónde:** `index.html` / `assets/styles.css` según lo que se encuentre; nota en
  `CLAUDE.md` §Pendiente si queda fuera del alcance del código.
- **Responde a:** spec §Alcance/Incluye 7; §Errores (insignia no removible por CSS).

### 8. Página más compacta (−25–35% vertical)

- **Qué:** reducir el espaciado vertical:
  - `section{padding:112px 0}` → ~`76px 0` en escritorio; `@720px` `76px 0` → ~`52px 0`.
  - `.section-head{margin-bottom:56px}` → ~`36px`.
  - Márgenes internos grandes entre sub-bloques de `#coleccion` (el `margin-top:64px` del
    segundo `section-head`) → ~`40px`.
  - `.stat-row{margin-top:64px}` → ~`40px`; `.hero-actions{margin-top:38px}` → ~`28px`.
  - `.atelier` `.story` y `#sugerencias`: revisar gaps.
  - Hero: `padding:150px 0 70px` en móvil → reducir el bottom.
- **Dónde:** `assets/styles.css`, reglas de espaciado; sin quitar secciones.
- **Responde a:** spec §Alcance/Incluye 8; §Comportamiento/"Página más compacta".

### 9. Reubicar "Sugerencias" y shell de FAQ

- **Qué (Sugerencias):** mover la `<section id="sugerencias">` completa en `index.html` a
  un bloque más compacto ubicado justo antes de `<footer>` (después de `#ubicacion`).
  Mantener `id="sugerencias"` para que sigan funcionando los enlaces de nav/footer.
  Compactar su layout (`.sugg-panel` a una columna más estrecha, título más pequeño). El
  JS de `initSuggestions()` no cambia.
- **Qué (FAQ shell):** en el lugar que ocupaba Sugerencias (después de `#atelier`), añadir
  `<section id="faq">` con eyebrow + título ("Preguntas frecuentes") y una lista de
  preguntas usando `<details>/<summary>` (acordeón nativo, accesible, sin JS). Preguntas
  visibles (borrador, a confirmar en Fase B): horarios de atención, formas de pago,
  ¿hacen envíos en Colombia?, garantía y cuidado del oro, ¿el oro es realmente 18K?,
  ¿puedo ver las piezas en persona? Respuestas: texto provisional útil —
  "Estamos completando esta información. Escríbenos por WhatsApp y te respondemos al
  momento." con enlace `.wa-link` — salvo las que ya son verificables (oro 18K, verlas en
  persona en C.C. Los Panches L-53), que llevan respuesta corta real.
- **Nav / footer:** actualizar los enlaces del menú y del footer — reemplazar "Sugerencias"
  por "Preguntas" (`#faq`) en la nav; en el footer, ajustar la columna "Explorar" para
  listar FAQ y dejar Sugerencias como enlace secundario o quitarlo del listado principal.
- **CSS:** reglas `#faq details/summary` (marcador, espaciado, borde inferior por ítem),
  coherentes con la estética; tinte de seda como las demás secciones.
- **Responde a:** spec §Alcance/Incluye 9; §Comportamiento/"Preguntas frecuentes (shell)",
  "Sugerencias (reubicada)"; §Errores (FAQ con respuestas provisionales que se ven vacías).

### 10. Verificación (cierre, con `verify-after-changes`)

- **Qué:** levantar el server local (`preview_start` con `joyeria-dc`), y verificar 5 casos:
  (1) galería con tarjetas nuevas + botón visible + abrir modal; (2) modal cierra con X /
  Escape / click fuera y devuelve foco; (3) franja de confianza y hero con foto en móvil
  375px sin romper layout; (4) barra CTA móvil visible, no tapa footer, abre WhatsApp;
  (5) FAQ acordeón abre/cierra y Sugerencias quedó antes del footer con enlaces de nav
  funcionando. Revisar consola/errores y modo oscuro. Corregir lo que falle en el mismo
  ciclo.
- **Responde a:** spec completo (validación).

## Fuera de alcance (NO hacer en este plan)

Precios, disponibilidad por pieza, cambios de esquema Supabase, cambios en `/admin`,
respuestas reales del FAQ, sección de info comercial (horarios/pagos/envíos/garantía),
mapa real o foto del local, testimonios, más fotos por pieza. Todo eso es Fase B y requiere
contenido comercial del usuario.
