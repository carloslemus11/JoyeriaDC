# Plan — Fase 3 (reseñas y sugerencias en Supabase)

Fecha: 2026-08-31

## Objetivo

Que el widget de calificación por estrellas y el formulario de sugerencias del sitio guarden de verdad en Supabase (hoy no persisten nada), que el sitio público muestre el promedio real de calificaciones y solo las sugerencias aprobadas, y que el dueño modere las sugerencias y vea el resumen de calificaciones desde `/admin`.

## Contexto del problema

En el sitio actual, el widget de estrellas y el formulario de sugerencias funcionan solo en memoria del navegador (`assets/main.js`, `initRatings`/`initSuggestions`): al recargar se pierde todo. Antes usaban la "capability" del Claude Artifact para persistir; al salir de Artifact (Fase 1) esa persistencia desapareció y no se reemplazó. Las tablas `calificaciones` y `sugerencias` ya existen en Supabase desde la Fase 1, con sus políticas RLS (el público inserta; solo ve sugerencias aprobadas; el admin ve y modera todo). Falta conectar el front y añadir la moderación al panel.

## El spec de referencia

`docs/specs/2026-08-31-migracion-supabase.md` (aprobado el 2026-08-31). Esta fase corresponde a **"Fase 3 — Reseñas y sugerencias en base de datos"** de *Alcance v1 → Incluye*, a los puntos 4-5 de *Comportamiento → Visitante* y 4-5 de *Comportamiento → Administrador*, y a las filas de *Errores y mitigaciones* sobre fallo al guardar, calificación repetida y spam.

## Lista de tareas a implementar

### 1. Función de resumen de calificaciones
- **Qué:** crear en Supabase una función SQL `public.resumen_calificaciones()` que devuelva `promedio numeric` (redondeado a 1 decimal, `null`/0 si no hay) y `total int`. `stable`, sin `security definer` (se apoya en la política de SELECT pública de `calificaciones`). Reflejar en un archivo `supabase/funciones.sql`.
- **Dónde:** nueva migración `fase3_resumen_calificaciones`; `supabase/funciones.sql`.
- **Responde a:** spec *Comportamiento → Visitante* punto 4 ("el promedio … se calcula desde la base") y *Administrador* punto 5 ("promedio y cantidad").
- **Detalle:** se usa una función y no traer todas las filas para no depender del volumen; el front la llama con `sb.rpc("resumen_calificaciones")`.

### 2. Capa de datos de interacciones (front)
- **Qué:** módulo nuevo `assets/interacciones.js` con:
  - `getResumenCalificaciones()` → `{ promedio, total }` vía `sb.rpc`.
  - `enviarCalificacion(estrellas)` → `sb.from("calificaciones").insert({ estrellas })`.
  - `getSugerenciasAprobadas()` → `sb.from("sugerencias").select("nombre, texto, created_at").eq("estado","aprobada").order("created_at", { ascending:false })`.
  - `enviarSugerencia({ nombre, texto })` → `sb.from("sugerencias").insert({ nombre, texto, estado:"pendiente" })`.
- **Dónde:** `assets/interacciones.js`, importado desde `assets/main.js`.
- **Responde a:** spec *Comportamiento → Visitante* puntos 4-5.

### 3. Reescribir el widget de calificación (`initRatings` en `assets/main.js`)
- **Qué:**
  - Al cargar: llamar `getResumenCalificaciones()` y pintar `#avgScore` (p. ej. "4.6" o "—"), las estrellas de `#avgStars` y `#ratingCount` ("12 reseñas" / "Sé el primero en calificar"). Si falla, dejar el estado "—" sin romper la sección.
  - Al hacer clic en una estrella: si ya calificó en este dispositivo (`localStorage["dc_rated"]`), no hacer nada salvo mostrar `#ratingThanks`. Si no: `enviarCalificacion(valor)`; al ok → marcar `dc_rated`, mostrar `#ratingThanks`, volver a pedir el resumen y repintar. Al error → mensaje visible ("No se pudo registrar tu calificación, intenta de nuevo") y NO marcar `dc_rated`.
  - Quitar toda la lógica de `#ratingLog` (era el registro del Artifact).
- **Dónde:** `assets/main.js` (`initRatings`), `index.html` (quitar `<ul id="ratingLog">` y el atributo `artifact-local` de `.rating-summary`/`.rating-input`), `assets/styles.css` si hace falta un estilo de error.
- **Responde a:** spec *Visitante* punto 4; *Errores* — "falla guardar una calificación" y "visitante califica varias veces" (control local, riesgo aceptado).

### 4. Reescribir el formulario de sugerencias (`initSuggestions` en `assets/main.js`)
- **Qué:**
  - Al cargar: `getSugerenciasAprobadas()` y renderizar la lista (`#suggList`) con el mismo marcado que hoy (`.sugg-entry` con `.sugg-text` y `.sugg-meta` = nombre + fecha). Si no hay, mostrar `#suggEmpty`. Si falla la carga, dejar `#suggEmpty` con texto neutro.
  - Al enviar: validar texto no vacío; `enviarSugerencia({ nombre, texto })`. Al ok → limpiar el form, mostrar `#suggThanks` con texto ajustado ("¡Gracias! Tu sugerencia se publicará cuando la revisemos."). **No** añadir la sugerencia a la lista pública (queda pendiente de moderación). Al error → mensaje visible y conservar lo escrito.
  - Quitar el atributo `artifact-local` del form.
- **Dónde:** `assets/main.js` (`initSuggestions`), `index.html` (copia de `#suggThanks`, quitar `artifact-local`).
- **Responde a:** spec *Visitante* punto 5; *Errores* — "falla guardar" y "spam/ofensivo → no aparece hasta aprobación".

### 5. Quitar restos del Artifact en `assets/main.js`
- **Qué:** eliminar `document.addEventListener("claude:edit", …)` y cualquier referencia a `recomputeRatings`/`refreshSuggEmpty` que quede colgando tras la reescritura.
- **Dónde:** `assets/main.js`.
- **Responde a:** limpieza derivada de la Fase 1 (ya no somos Artifact).

### 6. Panel `/admin`: pestaña "Sugerencias" (moderación + resumen de reseñas)
- **Qué:** activar el ítem de nav "Sugerencias" (hoy `is-soon`). La pestaña muestra:
  - Arriba, una tarjeta con el **resumen de calificaciones**: promedio y total (vía `resumen_calificaciones()` o contando directamente, ya con sesión admin).
  - Debajo, la **lista de sugerencias** (todas: pendiente / aprobada / oculta), más recientes primero, cada una con nombre (o "Anónimo"), texto, fecha y estado. Acciones por fila: **Aprobar** (`estado='aprobada'`), **Ocultar** (`estado='oculta'`), **Borrar** (con `confirmar()`, es permanente). Filtro simple por estado (opcional; si no, mostrar todas con su etiqueta).
  - Estado vacío: "Aún no hay sugerencias."
- **Dónde:** `admin/index.html` (nav + panel de la pestaña), `admin/admin.js` (funciones `refreshSugerencias`, acciones), `admin/admin.css` si hace falta.
- **Responde a:** spec *Administrador* puntos 4-5; *Errores* — moderación previa de spam.

### 7. Ajustes de esquema si el volumen lo pide (opcional, solo si se ve necesario)
- **Qué:** índice en `calificaciones(created_at)` no hace falta para v1; `sugerencias_estado_idx` ya existe. No se prevé cambio de esquema. Si al implementar la función de resumen conviene un índice, se añade aquí.
- **Responde a:** rendimiento; no añade alcance.

### 8. Documentación
- **Qué:** actualizar `CLAUDE.md`: sección "Funcionalidad / interactividad" (estrellas y sugerencias ahora persisten en Supabase; moderación en `/admin`), tabla de secciones si aplica, y el estado por fases (Fase 3 hecha). Nota de que las sugerencias arrancan vacías y se llenan solo con lo aprobado.
- **Dónde:** `CLAUDE.md`.

### 9. Verificación (`verify-after-changes`)
- **Qué:** 5 casos: (a) calificar en el sitio → el promedio/þotal sube y persiste al recargar; (b) calificar de nuevo en el mismo navegador → bloqueado con "ya calificaste"; (c) enviar una sugerencia → "se publicará cuando la revisemos", y NO aparece en la lista pública; (d) en `/admin` → Sugerencias: la sugerencia aparece como pendiente, "Aprobar" la hace visible en el sitio, "Ocultar"/"Borrar" funcionan; (e) con Supabase forzado a fallar, calificar/enviar muestra error y no rompe la página. Requiere la sesión admin (ya existe).
- **Responde a:** todo el "Comportamiento esperado" de la Fase 3.

## Fuera de este plan (fases siguientes)

- Registro de clics de "Cotizar" → Fase 4.
- Textos del hero/atelier/ubicación editables → Fase 5.
- Notificar por correo al dueño cuando llega una sugerencia/calificación → fuera del alcance v1 (spec, "No incluye").
- Responder públicamente a una sugerencia, o mostrar el nombre del negocio junto a la respuesta → no contemplado en v1.
