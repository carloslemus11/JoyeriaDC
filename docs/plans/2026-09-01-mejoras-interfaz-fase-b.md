# Plan — Mejoras de interfaz Fase B

## Objetivo

Implementar la Fase B: disponibilidad por pieza (campo en Supabase + control en `/admin` +
señal visible en el sitio), respuestas reales en el FAQ, una sección formal de Garantía,
la franja de confianza completa (5 mensajes), horario y teléfono visibles en "Ubicación", y
un mapa real de Google Maps en lugar del pin decorativo. Sin precios, sin testimonios.

## Contexto del problema

Fase A dejó el FAQ con respuestas provisionales y el catálogo sin señal de stock. El sitio
no dice horario, formas de pago, envíos ni garantía, y el "mapa" es un pin dibujado. El
dueño confirmó los datos el 2026-09-01, así que se puede reemplazar todo lo provisional por
información real y agregar el estado de disponibilidad por pieza.

## El spec de referencia

`docs/specs/2026-09-01-mejoras-interfaz-fase-b.md` (aprobado por el usuario el 2026-09-01).

Datos confirmados:
- Horario: **lunes a viernes, 9:00 a.m. – 5:00 p.m.**
- Pagos: **efectivo, transferencia / Nequi / Daviplata.**
- Envíos: **sí, a todo el país, coordinados por WhatsApp; + recogida en tienda.**
- Teléfono visible: el WhatsApp **+1 240 593 3943**.
- Disponibilidad: campo por pieza, 3 estados, default "disponible en tienda".
- Local: **mapa de Google Maps incrustado.**
- Garantía: texto formal de 4 puntos (6 meses por fabricación, primera limpieza sin costo).

## Lista de tareas a implementar

### 1. Migración Supabase — campo `disponibilidad`

- **Qué:** vía Supabase MCP (`apply_migration`, nombre `piezas_disponibilidad`), agregar:
  ```sql
  alter table public.piezas
    add column disponibilidad text not null default 'disponible'
    check (disponibilidad in ('disponible','encargo','agotada'));
  ```
  El `default` + `not null` deja las 9 piezas existentes en `'disponible'`.
- **Dónde:** proyecto Supabase `ardfyksmwwwignoejaft`.
- **Verificar:** `list_tables` / `select` que la columna existe y las piezas quedaron en
  `disponible`.
- **Orden:** esta tarea va **primero**, antes de desplegar cualquier código que lea la
  columna (spec §Errores — migración antes que front).
- **RLS:** no requiere cambios (`piezas_select_publico` y `piezas_admin_todo` cubren la
  columna nueva).
- **Responde a:** spec §Alcance/Incluye 1; §Comportamiento/"Disponibilidad — admin".

### 2. Actualizar `supabase/schema.sql` (fuente de verdad)

- **Qué:** añadir la columna `disponibilidad` a la definición de `create table public.piezas`
  y una nota en el historial del archivo (migración `piezas_disponibilidad`, fecha).
- **Dónde:** `supabase/schema.sql`. Opcional: nota en `supabase/seed-catalogo.sql` si aplica.
- **Responde a:** mantener el esquema versionado consistente (regla de `CLAUDE.md`).

### 3. `catalogo.js` — leer la disponibilidad

- **Qué:** agregar `disponibilidad` al `.select(...)` de `getPiezas()`. El objeto de pieza
  ya se propaga con spread, así que llega al front sin más cambios.
- **Dónde:** `assets/catalogo.js` (`getPiezas`).
- **Responde a:** spec §Comportamiento/"Disponibilidad — sitio público".

### 4. `main.js` — señal de disponibilidad en tarjeta y modal

- **Qué:**
  - Helper `DISPONIBILIDAD = { disponible:{label:"Disponible en tienda", cls:"is-ok"},
    encargo:{label:"Por encargo", cls:"is-encargo"}, agotada:{label:"Agotada", cls:"is-agotada"} }`.
  - En `renderPiezas`: tras `.gallery-meta`, añadir un `<span class="gallery-stock ...">` con
    la etiqueta según `pieza.disponibilidad` (fallback a `disponible`). Para `disponible`,
    render discreto (punto + texto tenue). Para `agotada`, además añadir clase
    `is-agotada` al `.gallery-item` (atenúa con opacidad vía CSS) y cambiar el texto del
    `.gallery-cta` a "Consultar por WhatsApp" (mismo `data-wa-msg`/destino).
  - En `abrirPieza`: pintar la misma etiqueta como línea bajo `#piezaModalMeta`
    (elemento nuevo `#piezaModalStock` en el HTML del modal) y aplicar el ajuste del botón
    igual que en la tarjeta.
- **Dónde:** `assets/main.js` (`renderPiezas`, `abrirPieza`), `index.html` (agregar
  `<p id="piezaModalStock">` en `.pieza-modal__body`).
- **Responde a:** spec §Comportamiento/"Disponibilidad — sitio público", §Errores (valor
  inesperado → tratar como disponible).

### 5. CSS — etiquetas de disponibilidad

- **Qué:** en el bloque "Fase A" de `assets/styles.css` (o un bloque "Fase B" nuevo al
  final): `.gallery-stock` (base mono, pequeña), variantes `.is-ok` (color `--ink-soft`
  con un punto verde tenue), `.is-encargo` (color `--gold-strong`), `.is-agotada` (color
  `--muted`); `.gallery-item.is-agotada{opacity:.62}` y que el hover no la "encienda" del
  todo. Misma etiqueta reutilizada en `.pieza-modal__stock`. Verificar en modo oscuro.
- **Dónde:** `assets/styles.css`.
- **Responde a:** spec §Comportamiento/"Disponibilidad"; §Errores (`prefers-reduced-motion`,
  móvil 375).

### 6. `admin/admin.js` — control de disponibilidad

- **Qué:**
  - En `openPiezaForm`: añadir un `field("Disponibilidad", "disponibilidad", p?.disponibilidad ?? "disponible", { type:"select", options:[{value:"disponible",label:"Disponible en tienda"},{value:"encargo",label:"Por encargo"},{value:"agotada",label:"Agotada"}] })`.
  - En el `payload`: `disponibilidad: fd.get("disponibilidad") || "disponible"`.
  - En `refreshPiezas`: mostrar el estado en la línea `admin-mono` de cada fila (ej.
    "· por encargo" / "· agotada"; nada si es disponible).
- **Dónde:** `admin/admin.js` (`openPiezaForm`, `refreshPiezas`).
- **Responde a:** spec §Comportamiento/"Disponibilidad — panel /admin".

### 7. `index.html` — FAQ con respuestas reales

- **Qué:** reemplazar el texto provisional de las preguntas de horario, pagos, envíos y
  garantía por las respuestas reales:
  - Horario → "Atendemos de lunes a viernes, de 9:00 a.m. a 5:00 p.m., en C.C. Los Panches,
    local 53." (con `data-cs="faq_horario"` para editarlo luego, fallback al HTML).
  - Pagos → "Aceptamos efectivo y transferencia (Nequi / Daviplata / bancaria)."
  - Envíos → "Sí. Enviamos a todo el país; coordinamos transportadora, costo y tiempo por
    WhatsApp según tu ciudad. También puedes recoger en el local."
  - Garantía → resumen de 2 líneas + enlace "Ver garantía completa" a `#garantia`.
  - Se mantienen intactas las de "¿El oro es realmente 18K?" y "¿Puedo ver las piezas en
    persona?".
- **Dónde:** `index.html` sección `#faq`.
- **Responde a:** spec §Alcance/Incluye 2; §Comportamiento/"FAQ".

### 8. `index.html` — sección `#garantia`

- **Qué:** nueva `<section id="garantia">` (después de `#faq`, antes de `#ubicacion`), con
  eyebrow + título "Garantía" + lista numerada de 4 puntos (autenticidad del oro / defectos
  de fabricación 6 meses / exclusiones / mantenimiento) + un botón `.wa-link`
  "Preguntar por la garantía" (`data-cotiza-origen="garantia"`). Cada párrafo con
  `data-cs="garantia_p1..p4"` y el título `data-cs="garantia_titulo"` (fallback al HTML).
- **CSS:** reglas `#garantia` con tinte de seda como las demás secciones; lista con números
  en `--font-mono` color oro, coherente con `.story-index`.
- **Nav/footer:** agregar "Garantía" a la columna "Explorar" del footer. (La nav principal
  se deja en 4 ítems para no saturar en móvil.)
- **Dónde:** `index.html`, `assets/styles.css`.
- **Responde a:** spec §Alcance/Incluye 3; §Comportamiento/"Sección Garantía".

### 9. `index.html` — franja de confianza a 5 ítems

- **Qué:** añadir 2 `<li class="trust-item">` a `.trust-list`:
  - ícono escudo/check → "Garantía de 6 meses por defectos de fabricación"
    (`data-cs="trust4"`).
  - ícono caja/camión → "Envíos a todo Colombia · efectivo o transferencia"
    (`data-cs="trust5"`).
- **CSS:** verificar que a 5 ítems la franja siga centrada en escritorio (wrap) y apilada
  en `≤720px` sin desborde.
- **Dónde:** `index.html` `.trust-strip`, `assets/styles.css` (ajuste de `gap` si hace
  falta).
- **Responde a:** spec §Alcance/Incluye 4; §Comportamiento/"Franja de confianza"; §Errores
  (móvil 375).

### 10. `index.html` — información comercial + mapa en `#ubicacion`

- **Qué:**
  - Añadir un `.loc-item` de **Horario** (ícono reloj SVG inline): `<h4>Horario</h4>` +
    `<p data-cs="ubic_horario">Lunes a viernes, 9:00 a.m. – 5:00 p.m.</p>`.
  - En el `.loc-item` de WhatsApp, añadir el número visible: `<p>+1 240 593 3943 —
    cotizaciones, dudas y seguimiento.</p>`.
  - Reemplazar el contenido de `.loc-visual` (pin + anillo animado) por un
    `<iframe>` de Google Maps: `src="https://www.google.com/maps?q=4.4418983,-75.2378117&z=16&output=embed"`,
    `loading="lazy"`, `title="Ubicación de Joyería DC en Google Maps"`,
    `referrerpolicy="no-referrer-when-downgrade"`, sin bordes, ocupando el recuadro
    (`width/height:100%`). Mantener `aspect-ratio` del recuadro actual.
  - El botón "Cómo llegar" y su lógica iOS/Android en `main.js` no cambian.
- **CSS:** `.loc-visual{padding:0}` y `.loc-visual iframe{width:100%;height:100%;border:0;display:block}`;
  quitar/neutralizar `.loc-pin` / `.loc-pin-ring` para esta sección (o dejar el CSS muerto).
- **Dónde:** `index.html` `#ubicacion`, `assets/styles.css`.
- **Responde a:** spec §Alcance/Incluye 5 y 6; §Comportamiento/"Ubicación"; §Errores (mapa
  no carga → botón "Cómo llegar" sigue; iframe lazy; cookies de Google aceptadas).

### 11. `admin/admin.js` — grupo "Garantía e info" en Textos

- **Qué:** añadir a `TEXTOS_GRUPOS` un grupo nuevo con: `ubic_horario` (input),
  `garantia_titulo` (input), `garantia_p1..p4` (textarea), `trust1..trust5` (input, para
  poder editar los 5 mensajes de la franja), `faq_horario` / `faq_pagos` / `faq_envios`
  (textarea) si se decide hacerlos editables. Mantener el grupo corto y claro.
- **Dónde:** `admin/admin.js` (`TEXTOS_GRUPOS`).
- **Responde a:** spec §Comportamiento/"Sección Garantía" y "FAQ" (textos editables);
  §Errores (horario/garantía editables sin tocar código).

### 12. Actualizar `CLAUDE.md`

- **Qué:** tabla de secciones (agregar `#garantia`, horario y mapa en Ubicación,
  disponibilidad en las tarjetas), esquema (`piezas.disponibilidad`), panel `/admin`
  (selector de disponibilidad, nuevo grupo de textos), y mover Fase B de "Pendiente" a
  hecho dejando solo lo que quede fuera (más fotos por pieza, testimonios).
- **Dónde:** `CLAUDE.md`.

### 13. Verificación (`verify-after-changes`)

- **Qué:** server local, y verificar 5 casos: (1) galería muestra la etiqueta correcta por
  pieza y "Agotada" atenúa + cambia el botón; (2) modal muestra la disponibilidad; (3)
  `/admin` guarda el estado y se refleja en el sitio; (4) FAQ con respuestas reales +
  enlace a `#garantia` funciona; (5) `#ubicacion` con horario, número visible y mapa de
  Google cargando, a 375 px sin scroll horizontal ni choque con la barra CTA. Revisar
  consola y modo oscuro. Corregir lo que falle.
- **Nota:** aplicar la migración (tarea 1) antes de esta verificación; recordar que un
  `git push` a `main` redespliega en Netlify.
- **Responde a:** spec completo.

## Fuera de alcance (NO hacer en este plan)

Precios, testimonios/reseñas, más fotos por pieza en el modal, stock numérico, crédito /
financiación, pasarela de pago, y cualquier cambio al flujo de WhatsApp o al registro de
cotizaciones.
