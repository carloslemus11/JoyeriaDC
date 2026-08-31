# Plan — Reparación de base + manejo de visitas

## Objetivo

Dejar la base de datos consistente otra vez (recrear `perfiles` y su admin, con lo que
vuelven la galería y `/admin`), retirar del código las cuentas de cliente/favoritos
(Fase 6) y el widget de estrellas de Reseñas (Fase 3), y agregar una pestaña "Visitas" en
`/admin` que registra y resume el tráfico del sitio (por día, fuente, dispositivo y país)
sin cookies de rastreo ni datos personales.

## Contexto del problema

Una sesión previa sin terminar borró las tablas `perfiles`, `calificaciones` y
`favoritos` de Supabase pero dejó el sitio y el panel apuntando a ellas. Hoy en
producción: la galería de Colección muestra el estado de error (porque leer `pieza_fotos`
evalúa `private.is_admin()`, que revienta al no existir `perfiles`), `/admin` no deja
entrar, y el widget de reseñas falla. Además el working tree tiene cambios sin commitear
que empezaron a quitar Fase 6 y a introducir un registro de visitas (`main.js` importa
`registrarVisita`, que aún no existe → el sitio no arranca en local). Se decidió: reparar,
terminar de quitar Fase 6, quitar también Reseñas (nunca se usó), y montar el conteo de
visitas dentro del mismo Supabase (no una herramienta externa), con el país aproximado vía
una Netlify Edge Function.

## El spec de referencia

`docs/specs/2026-08-31-visitas-y-reparacion-perfiles.md` (aprobado por el usuario en esta
conversación).

## Lista de tareas a implementar

### A. Reparación de la base de datos (migraciones Supabase)

1. **Migración `reparar_perfiles`.** Recrear `public.perfiles` tal como en
   `supabase/schema.sql` (`id uuid pk → auth.users(id) on delete cascade`, `rol text not
   null default 'admin'`, `created_at`). Habilitar RLS y recrear la política
   `perfiles_admin_todo` (de `supabase/policies.sql`). Luego
   `insert into public.perfiles (id, rol) select id, 'admin' from auth.users` (hoy hay un
   solo usuario, `cjlr0318@gmail.com`, que es el dueño). Terminar la migración con un
   `select` de verificación que confirme que ese usuario quedó con `rol='admin'`.
   → Cubre spec §"Reparación" y §Errores ("la reparación no reasigna bien al admin").
2. **Verificar in situ** que la galería del sitio y el login de `/admin` vuelven a
   responder (lectura anon de `pieza_fotos`, `private.is_admin()` sin error).
   → Cubre spec §Contexto y §Comportamiento (dueño entra a `/admin`).

### B. Retirar Reseñas (Fase 3) y terminar de retirar Fase 6 — base de datos

3. **Migración `retirar_resenas`.** `drop function if exists public.resumen_calificaciones();`
   (la tabla `calificaciones` ya no existe; no se recrea). `favoritos` ya está eliminada
   por la migración previa `quitar_favoritos_agregar_visitas`; no hay nada más que borrar.
   → Cubre spec §Alcance ("quitar el widget de estrellas", "no reactivar reseñas").

### C. Manejo de visitas — base de datos (migración Supabase)

4. **Migración `visitas_v2`.** La tabla `public.visitas` existe con
   `id, path, referrer, created_at` y 0 filas. Redefinirla (drop + create, al estar
   vacía) con: `id uuid pk default gen_random_uuid()`, `path text`, `seccion text`,
   `fuente text` (check en `('instagram','google','facebook','whatsapp','directo','otro')`
   o null), `referrer_dominio text` (solo el host, nunca la URL completa), `dispositivo
   text` (check en `('movil','tablet','escritorio')` o null), `pais text` (código ISO de
   2 letras o null), `created_at timestamptz not null default now()`. Índice
   `visitas_created_idx on visitas (created_at desc)`. RLS on. Políticas: `visitas_insert_publico`
   `for insert with check (true)`; `visitas_admin_select` `for select using (private.is_admin())`.
   → Cubre spec §Alcance ("registrar una fila por cada carga") y §Errores ("guardar solo
   dominio, no URL"; "no guardar IP ni datos personales").
5. **Función `public.resumen_visitas()`** (en la misma migración o una aparte
   `resumen_visitas`). `SECURITY INVOKER`, `stable`, devuelve un JSON con: `total_hoy`,
   `total_30d`, `por_dia` (array `{fecha, n}` de los últimos 30 días), `por_fuente`
   (array `{fuente, n}`), `por_dispositivo` (array `{dispositivo, n}`), `por_pais`
   (array `{pais, n}` ordenado desc). Todos los desgloses sobre los últimos 30 días.
   `grant execute ... to authenticated` (no a `anon`). Al ser INVOKER, la política
   `visitas_admin_select` sigue protegiendo los datos.
   → Cubre spec §Comportamiento (dueño ve dos números + lista por día + tres desgloses) y
   §Alcance ("solo el administrador puede verla").

### D. Manejo de visitas — sitio público

6. **`assets/interacciones.js`:** quitar los exports `getResumenCalificaciones` y
   `enviarCalificacion`. Agregar `registrarVisita()` con el mismo patrón "best effort" de
   `registrarCotizacion` (sin `await`, `try/catch`, `.then(ok, fail)` que no hace nada).
   Arma la fila así: `path` = `location.pathname`; `seccion` = `location.hash.slice(1)` o
   null; `referrer_dominio` = host de `document.referrer` o null; `fuente` = derivada del
   host del referrer (instagram/l.instagram.com → `instagram`; google.* → `google`;
   facebook/l.facebook.com/lm.facebook.com → `facebook`; wa.me/whatsapp → `whatsapp`;
   referrer vacío → `directo`; cualquier otro → `otro`); `dispositivo` = de
   `navigator.userAgent` (`/iPad|Tablet/` → `tablet`; `/Mobi|Android/` → `movil`; resto →
   `escritorio`); `pais` = `content` del `<meta name="dc-pais">` si existe y no está
   vacío, si no null.
   → Cubre spec §Comportamiento (visitante) y §Errores (registro best-effort; referrer
   sucio → directo/otro; país en blanco si no hay meta).
7. **`assets/main.js`:** en el bloque de imports, quitar `getResumenCalificaciones,
   enviarCalificacion` y todo el `import { ... } from "./cuenta.js"`. En `initSitio()`
   quitar las llamadas `initRatings()` e `initCuenta()` y agregar `registrarVisita()`
   (una sola vez, al cargar). Borrar las funciones `initRatings` e `initCuenta` completas y
   la constante `STAR_SVG` si queda sin uso. En `renderPiezas()` quitar la creación del
   botón `.fav-heart` y la línea `if (window.__dcMarcarFavoritos) ...`.
   → Cubre spec §Alcance ("quitar corazón, modales, widget de estrellas") y §Comportamiento
   (registro en segundo plano al abrir la página).
8. **Borrar `assets/cuenta.js`** (queda sin ninguna referencia tras la tarea 7).
   → Cubre spec §Alcance ("quitar cuentas de cliente").
9. **`index.html`:** quitar los dos `<li><a href="#resenas">Reseñas</a></li>` (nav
   ~línea 28 y footer ~línea 243) y la `<section id="resenas"> … </section>` completa
   (~líneas 121–150). Confirmar que los cambios ya presentes sin commitear (botón "Cuenta"
   y modales `#cuentaModal` / `#favModal` ya removidos) están bien y completos.
   → Cubre spec §Alcance ("quitar la sección Reseñas del menú, footer y cuerpo").
10. **`assets/styles.css`:** eliminar las reglas de Fase 6 y de rating que quedan muertas:
    `.nav-cuenta`, `.fav-heart*`, `.dc-modal*`, `.dc-modal-box/-x/-title`, `.dc-tabs/.dc-tab*`,
    `.dc-form*`, `.dc-field*`, `.dc-hola`, `.dc-msg`, `.dc-nota`, `.fav-list/.fav-row/
    .fav-thumb/.fav-name/.fav-quitar/.fav-empty`, y el bloque "reviews / rating"
    (`.rating-panel`, `.rating-summary`, `.avg-score`, `.avg-stars`, `.rating-count`,
    `.rating-input`, `.stars-input`, `.star-btn*`, `.rating-thanks*`). Quitar también las
    tres declaraciones de `--star-off` (`:root`, `@media dark`, `:root[data-theme=dark]`)
    si ya no se usan.
    → Cubre spec §Alcance (limpieza de lo retirado).

### E. Manejo de visitas — panel `/admin`

11. **`admin/index.html`:** en la barra de pestañas agregar
    `<button class="admin-tab" data-tab="visitas">Visitas</button>` (después de
    "Cotizaciones" o al final). En la pestaña de sugerencias: quitar el bloque
    `#resumenResenas` (los dos `<div>` de promedio/calificaciones) y cambiar el `<h2>` de
    "Reseñas y sugerencias" a "Sugerencias". Agregar
    `<section id="tab-visitas" class="admin-tabpane" hidden>` con: un `.admin-resumen` de
    dos casillas (`Hoy` / `Últimos 30 días`), y cuatro bloques con `<h3 class="admin-sub">`
    + contenedor `.admin-list`: "Por día", "Por fuente", "Por dispositivo", "Por país".
    → Cubre spec §Comportamiento (dueño en `/admin`: pestañas y contenido de "Visitas") y
    §Alcance ("la pestaña pasa a llamarse solo Sugerencias").
12. **`admin/admin.js`:** agregar `"visitas"` al array `panes`; en el listener de tabs
    agregar `if (b.dataset.tab === "visitas") refreshVisitas();`. Quitar de
    `refreshSugerencias()` la llamada `sb.rpc("resumen_calificaciones")` y el pintado de
    `#resenasProm` / `#resenasTotal`. Nueva `refreshVisitas()` que llama
    `sb.rpc("resumen_visitas")` y pinta: las dos casillas, la lista por día (fecha + n), y
    las tres listas de desglose (etiqueta + n) reutilizando el patrón de filas de las otras
    pestañas. Si `total_30d` es 0 (o el RPC falla), mostrar en cada bloque el texto "Aún no
    hay visitas registradas".
    → Cubre spec §Comportamiento (números, lista por día, tres desgloses; estado vacío) y
    §Errores (RPC falla → mensaje, no tabla vacía).
13. **`admin/admin.css`:** si hace falta, un mínimo de estilo para las filas de la lista
    "por día" (fecha a la izquierda, número a la derecha) reutilizando variables y clases
    existentes (`.admin-row`, `.admin-list`, `.admin-sub`, `.admin-resumen`). Sin patrón
    visual nuevo.
    → Cubre spec §Comportamiento (que la pestaña se lea bien, en línea con las demás).

### F. País aproximado — Netlify Edge Function

14. **Crear `netlify/edge-functions/geo-pais.js`.** Función de borde (Deno) que: obtiene
    `context.geo?.country?.code`; hace `const res = await context.next()`; si el
    `content-type` es HTML, lee el cuerpo e inyecta
    `<meta name="dc-pais" content="XX">` justo antes de `</head>` (si no hay código, no
    inyecta nada); devuelve la respuesta (posiblemente modificada). No usa cookies.
    → Cubre spec §Alcance ("función de borde mínima que expone el país… sin terceros ni
    exponer la IP") y §Errores ("si Netlify no da dato, país en blanco").
15. **`netlify.toml`:** declarar la edge function:
    `[[edge_functions]]` con `path = "/"` y `function = "geo-pais"` (y `path =
    "/index.html"` si aplica). No tocar las cabeceras existentes.
    → Cubre spec §Alcance (registrar el país) y §Errores (degradación si falta la carpeta
    al desplegar).

### G. Documentación

16. **`supabase/schema.sql`:** quitar las tablas `calificaciones` y `favoritos`; dejar
    `perfiles`; reemplazar la definición de `visitas` por la nueva (tarea 4). Nota de
    estado con la fecha.
17. **`supabase/policies.sql`:** quitar las políticas de `calificaciones` y `favoritos` y
    su `alter table … enable row level security`; agregar las dos políticas de `visitas`.
18. **`supabase/funciones.sql`:** quitar `resumen_calificaciones()`; agregar
    `resumen_visitas()` (tarea 5).
19. **`supabase/setup.md`:** agregar como pendiente manual "volver a **desactivar el
    registro público de usuarios**" (se había activado en Fase 6) y recordar el Site URL =
    `https://joyeriadc.netlify.app`. Nota: al re-desplegar en Netlify hay que incluir la
    carpeta `netlify/edge-functions/` o el país deja de registrarse.
20. **`CLAUDE.md`:** actualizar "Estado de la migración por fases" y las secciones de
    estructura/tablas/funcionalidad: Fase 6 revertida, Reseñas (Fase 3) retiradas, nueva
    pieza "Visitas" (tabla, `resumen_visitas()`, `registrarVisita`, pestaña en `/admin`,
    edge function). Quitar de la tabla de secciones la fila "Reseñas". Actualizar la lista
    de archivos de `assets/` (sin `cuenta.js`) y de `supabase/`. Anotar la nota de deploy
    de la edge function.
    → Todas las tareas de G cubren spec §Alcance ("actualizar la documentación para que
    refleje el estado real").

### H. Pasos manuales del usuario (fuera del código; se listan para el cierre)

21. En el panel de Supabase → Authentication: **desactivar "Allow new users to sign up"**
    y confirmar Site URL. (No se puede por API.)
22. **Re-desplegar el sitio** en Netlify incluyendo `netlify/edge-functions/`
    (arrastrando la carpeta completa a Netlify Drop, o —mejor— conectando el repo
    `carloslemus11/JoyeriaDC`).
    → Cubre spec §Errores ("re-despliegue sin la carpeta de la función").

## Estado: IMPLEMENTADO (2026-08-31)

Grupos A–G hechos. Migraciones aplicadas: `reparar_perfiles`, `retirar_resenas`,
`visitas_v2`. Verificado en local (`localhost:8743`): galería carga con fotos desde
Storage, `/admin` con las 6 pestañas (incl. "Visitas") y sin `#resumenResenas`, se
registra una visita por carga (`fuente`/`dispositivo` correctos; `pais` null en local
por no haber Edge Function), anon no puede leer `visitas` ni ejecutar `resumen_visitas`
(probado por SQL), sin errores de consola. Datos de prueba (visitas + 2 cotizaciones de
Fase 4) limpiados.

Pendiente: Grupo H (pasos manuales del usuario) — desactivar registro público en Supabase
Auth y re-desplegar a Netlify con `netlify/edge-functions/`.

## Verificación al terminar

Con `verify-after-changes`: (1) galería de Colección carga con fotos; (2) `/admin` deja
entrar y se ve la pestaña "Visitas"; (3) abrir el sitio inserta una fila en `visitas` con
`fuente`/`dispositivo` correctos y no bloquea la página; (4) un usuario anon no puede leer
`visitas` ni llamar `resumen_visitas`; (5) el sitio ya no muestra botón "Cuenta", corazón
ni sección Reseñas, y no hay errores de consola por imports.
