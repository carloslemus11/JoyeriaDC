# Plan — Fase 2 (Catálogo + panel admin) de la migración a Supabase

Fecha: 2026-08-31

## Objetivo

Sacar el catálogo (categorías, piezas y fotos) del código de `index.html` y llevarlo a Supabase, de modo que el sitio público lo renderice desde la base y el dueño pueda administrarlo — crear, editar, reordenar, activar/desactivar piezas y categorías, y subir fotos — desde el panel `/admin`, sin tocar código.

## Contexto del problema

Hoy las 4 categorías y las 9 piezas están escritas a mano en `index.html`, y las fotos van embebidas en base64 (por eso el archivo pesa ~870 KB). Cambiar una pieza, una descripción o una foto obliga a editar el HTML y volver a desplegar; el dueño no puede hacerlo. La Fase 1 ya dejó las tablas (`categorias`, `piezas`, `pieza_fotos`), el bucket de Storage `piezas`, las políticas RLS y el login de `/admin`. Falta poblarlas, conectar el render público y construir el CRUD.

## El spec de referencia

`docs/specs/2026-08-31-migracion-supabase.md` (aprobado el 2026-08-31). Esta fase corresponde al punto **"Fase 2 — Catálogo + panel admin"** de *Alcance v1 → Incluye*, y a los puntos 2-3 de *Comportamiento → Visitante* y 1-3 de *Comportamiento → Administrador*.

## Decisión pendiente antes de implementar (fuera del alcance literal del spec)

El spec dice "las fotos pasan a Storage". El detalle no resuelto es **cómo migran las 9 fotos actuales**, dado que no hay forma automatizada de subir archivos a Storage desde aquí (requiere una sesión admin en el navegador o la service-role key). Tres opciones:

- **A — Botón de importación en el panel (recomendada).** Se commitean las 9 fotos optimizadas en `assets/piezas/` (ya existen en `IMAGENES JOYAS/Versiones para web/`). El panel muestra, mientras el bucket esté vacío, un botón "Importar fotos iniciales" que —con el admin ya logueado— lee cada archivo del sitio y lo sube a Storage en su ruta definitiva. Un clic. Después las copias de `assets/piezas/` se pueden borrar (o dejar como respaldo).
- **B — El dueño sube todo a mano.** Se seedean las piezas sin foto; el dueño sube las 9 desde el panel una por una. Más trabajo manual, cero código extra.
- **C — Servir las 9 desde el repo indefinidamente.** `pieza_fotos.storage_path` admite un prefijo `local:` que el front resuelve a `/assets/piezas/`. Storage solo se usa para piezas nuevas. Deja el catálogo inicial fuera de Storage (se aparta del spec).

El plan de abajo asume **Opción A**. Confirmar antes de implementar la tarea 6.

## Dependencia externa que bloquea la verificación

El panel `/admin` (CRUD y subida) no se puede probar de punta a punta sin un **usuario admin creado** (pasos en `supabase/setup.md`, aún pendientes). Se puede implementar y verificar el render público sin eso; el CRUD se verifica cuando el usuario exista.

## Lista de tareas a implementar

### 1. Preparar las fotos optimizadas en el repo
- **Qué:** copiar las 9 fotos de `IMAGENES JOYAS/Versiones para web/` a `assets/piezas/` con nombres estables (`anillo-azul.jpeg`, `anillo-verde.jpeg`, `argollas.jpeg`, `banda-verde.jpeg`, `cadena-cruz.jpeg`, `corona-15.jpeg`, `corona-colores.jpeg`, `pulsera-colombia.jpeg`, `pulsera-esferas.jpeg`). Verificar cuál base64 del HTML actual corresponde a cuál archivo (comparar tamaños/bytes) para no cruzar piezas con fotos.
- **Dónde:** nueva carpeta `assets/piezas/`.
- **Responde a:** spec Fase 2 — "las fotos pasan a Storage" (aquí quedan listas para importar); spec *Errores* — "imagen de Storage no carga → placeholder".

### 2. Seed de `categorias` y `piezas` en Supabase
- **Qué:** insertar vía SQL (migración de datos) las 4 categorías y las 9 piezas con el contenido textual actual del sitio:
  - Categorías (con `orden` 1..4, `slug`): Anillos, Cadenas, Pulseras, Dijes y accesorios — con sus descripciones actuales.
  - Piezas (con `orden` 1..9, `activa = true`, `categoria_id` según corresponda): Anillo corazón 15, Anillo corona, Anillo con zafiro, Anillo con esmeralda, Banda con esmeraldas, Cadena con cruz, Pulsera tricolor, Pulsera de esferas, Argollas de matrimonio. La descripción por pieza hoy no existe en el sitio (la galería solo tiene el nombre) → se dejan con `descripcion = null`; **no inventar textos** (regla de `CLAUDE.md`).
  - `pieza_fotos`: una fila por pieza, `storage_path` = ruta definitiva en el bucket (p. ej. `catalogo/anillo-azul.jpeg`), `orden = 0`, `alt` = nombre de la pieza.
- **Dónde:** nueva migración; reflejada en `supabase/seed-catalogo.sql` para dejar traza.
- **Responde a:** spec Fase 2 — "Las piezas y categorías salen del HTML y pasan a Supabase"; spec *Comportamiento → Visitante* punto 2.

### 3. Capa de acceso a datos del catálogo (frontend público)
- **Qué:** en `assets/`, un módulo nuevo (`catalogo.js`) con funciones para leer de Supabase: `getCategorias()` (activas, ordenadas), `getPiezas()` (activas, ordenadas, con su primera foto), y `urlFoto(storage_path)` que devuelve la URL pública de Storage (`{SUPABASE_URL}/storage/v1/object/public/piezas/{path}`).
- **Dónde:** `assets/catalogo.js`, importado desde `assets/main.js`.
- **Responde a:** spec Fase 2 — render desde la base; spec *Errores* — "Supabase caído → catálogo con mensaje + WhatsApp".

### 4. Render del catálogo público desde la base
- **Qué:** en `index.html` + `assets/main.js`:
  - Reemplazar las 4 `<article class="cat-card">` escritas a mano por un contenedor vacío que `main.js` rellena con las categorías de la base (manteniendo la clase `.cat-card`, el ícono SVG —que se puede mapear por `slug`— , el `<h3>`, la `<p>` y el enlace `wa-link` con `data-wa-msg`).
  - Reemplazar los 9 `<a class="gallery-item">` (con su base64) por un `<div class="gallery-grid">` vacío que `main.js` rellena: por cada pieza, un `<a class="gallery-item wa-link">` con `data-wa-msg="Hola, quiero comprar/cotizar: {nombre}."`, un `<img>` con `src` = URL de Storage y `loading="lazy"` + `alt`, y el `<span class="gallery-tag">`.
  - Estados: mientras carga, un esqueleto simple en la zona de la galería (reusar estilo de tarjeta con un shimmer o solo opacidad); si la carga falla, mensaje corto ("No pudimos cargar el catálogo — escríbenos por WhatsApp") + botón WhatsApp general; el resto del sitio intacto.
  - Reaplicar el cableado de `wa-link` y el `IntersectionObserver` de `.reveal` **después** de inyectar las piezas (hoy corren una sola vez al cargar).
  - Quitar del HTML el `<img>` base64: esto baja `index.html` de ~870 KB a ~20 KB.
- **Dónde:** `index.html` sección `#coleccion`, `assets/main.js`, `assets/styles.css` (estilos de esqueleto/error).
- **Responde a:** spec *Comportamiento → Visitante* puntos 1-2; spec *Errores* — filas de Supabase caído e imagen que no carga; spec *Estados generales* — "prioriza mostrar la estructura".

### 5. Panel `/admin`: estructura y navegación interna
- **Qué:** ampliar `admin/` (hoy solo login + placeholder). Tras autenticar como admin, mostrar un layout con secciones; en esta fase se implementan **Catálogo** (piezas y categorías). Dejar navegación preparada para Sugerencias/Cotizaciones/Textos (Fases 3-5) como ítems deshabilitados o ocultos.
- **Dónde:** `admin/index.html`, `admin/admin.js`, `admin/admin.css`.
- **Responde a:** spec *Comportamiento → Administrador* punto 3.

### 6. Panel `/admin`: CRUD de piezas y categorías + fotos
- **Qué:**
  - **Categorías:** listar (todas), crear, editar (nombre, descripción, orden), activar/desactivar, borrar con confirmación (advertir que las piezas quedan sin categoría, no se borran).
  - **Piezas:** listar (activas e inactivas), crear (nombre, categoría, descripción, orden, estado), editar cualquier campo, reordenar (campo `orden` editable; opcionalmente flechas subir/bajar), desactivar (sale del sitio, no se borra), borrar con confirmación ("es permanente").
  - **Fotos de pieza:** subir a Storage (`sb.storage.from('piezas').upload()`), validar tipo (JPG/PNG/WebP) y tamaño (≤ 5 MB, ya forzado por el bucket) antes de subir, mostrar vista previa, reemplazar y quitar; guardar/borrar la fila en `pieza_fotos`. Una foto por pieza en esta fase (múltiples fotos = mejora posterior, no bloquea).
  - **Importación inicial (Opción A):** botón "Importar fotos iniciales" visible solo si el bucket `piezas` está vacío; al pulsarlo, por cada pieza seedeada hace `fetch('/assets/piezas/<archivo>')` → `blob` → `upload()` a su `storage_path`. Muestra progreso y resultado por pieza.
  - Todas las escrituras dependen de la sesión admin; las políticas RLS ya rechazan a cualquier otro (spec *Errores* — "escribir sin ser admin").
  - Estados vacíos con mensaje guía ("Aún no hay piezas. Crea la primera.").
  - Errores de guardado/subida: mensaje claro, no se pierde lo escrito.
- **Dónde:** `admin/admin.js`, `admin/admin.css`, y un módulo de datos admin (`admin/data.js`) o reutilizar `assets/catalogo.js` extendido con las operaciones de escritura.
- **Responde a:** spec *Comportamiento → Administrador* punto 3 (todos los sub-puntos); spec *Errores* — "foto muy pesada/formato raro", "admin borra por error", "imagen no carga".

### 7. Sincronizar `updated_at` de piezas
- **Qué:** trigger `before update` en `public.piezas` que setea `updated_at = now()`.
- **Dónde:** nueva migración; reflejar en `supabase/schema.sql`.
- **Responde a:** consistencia de datos para el panel (mostrar "última edición"); soporte al punto 3 de *Administrador*.

### 8. Limpiar el HTML y documentar
- **Qué:** confirmar que `index.html` ya no tiene base64 de producto ni catálogo hardcodeado; actualizar `CLAUDE.md` (sección "Secciones del sitio" y "Fuentes de las fotos": el catálogo ahora vive en Supabase; `assets/piezas/` como respaldo de importación) y marcar la Fase 2 como hecha en el estado por fases. Actualizar `revision-final.md` no aplica (no es auditoría).
- **Dónde:** `index.html`, `CLAUDE.md`.
- **Responde a:** mantener `CLAUDE.md` fiel al estado real (preferencia del usuario).

### 9. Verificación (`verify-after-changes`)
- **Qué:** 5 casos: (a) sitio público muestra las 4 categorías y las 9 piezas desde la base, con fotos; (b) cada pieza abre WhatsApp con su mensaje; (c) con Supabase forzado a fallar, la galería muestra el estado de error y el resto del sitio funciona; (d) en `/admin` logueado: crear una pieza de prueba la hace aparecer en el sitio, desactivarla la oculta, borrarla la quita; (e) subir una foto a una pieza se refleja en el sitio. Casos (d) y (e) requieren el usuario admin creado.
- **Responde a:** todo el "Comportamiento esperado" de la Fase 2.

## Fuera de este plan (fases siguientes)

- Widget de estrellas y formulario de sugerencias a Supabase + moderación → Fase 3.
- Registro de clics de "Cotizar" → Fase 4 (aunque el `data-wa-msg` ya quede por pieza, el registro se agrega después).
- Textos del hero/atelier/ubicación editables → Fase 5.
- Múltiples fotos por pieza, orden por drag-and-drop, roles de admin diferenciados → mejoras posteriores, no v1.
