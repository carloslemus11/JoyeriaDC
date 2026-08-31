# Plan — Fases 4, 5 y 6 de la migración a Supabase

Fecha: 2026-08-31

## Objetivo

Cerrar la migración: registrar el interés de los visitantes (clics de "Cotizar"), hacer editables desde `/admin` los textos del sitio, y añadir cuentas de cliente con lista de favoritos que se cotiza por WhatsApp.

## Contexto del problema

Con las Fases 1-3 el catálogo, las reseñas y las sugerencias ya viven en Supabase y el dueño administra todo desde `/admin`. Quedan tres piezas del spec: (4) hoy cada clic de "Cotizar" abre WhatsApp y no deja rastro — no se sabe qué piezas interesan más; (5) los textos del hero, atelier y ubicación siguen escritos en `index.html` y solo se cambian tocando código; (6) no hay forma de que un visitante guarde piezas que le gustaron para consultarlas o cotizarlas juntas.

## El spec de referencia

`docs/specs/2026-08-31-migracion-supabase.md` (aprobado el 2026-08-31). Fases 4, 5 y 6 de *Alcance v1 → Incluye*. El usuario autorizó explícitamente construir la Fase 6 (que el spec dejaba condicional) el 2026-08-31.

---

## Fase 4 — Registro de cotizaciones

Tabla `public.cotizaciones` ya existe (Fase 1): `id, pieza_id, etiqueta, origen, created_at`. RLS: anon inserta, admin consulta.

### Tareas

1. **Marcar los enlaces de cotización.** En `assets/main.js`, al renderizar la galería, añadir `data-cotiza` (nombre de la pieza) y `data-pieza-id` a cada `.gallery-item`. A las tarjetas de categoría, `data-cotiza` = "Categoría: {nombre}". A los `.wa-link` estáticos (hero, ubicación, footer, FAB, nav "Cotizar"), añadir `data-cotiza` con una etiqueta corta ("Hero", "Ubicación", "Footer", "FAB", "Nav") directamente en `index.html`.
   - Responde a: spec Fase 4 ("registra … la pieza (o sección)").
2. **Registrar el clic.** En `assets/main.js`, un listener de `click` (captura) sobre `.wa-link`: antes de que el navegador abra WhatsApp, `sb.from("cotizaciones").insert({ pieza_id, etiqueta, origen })` **sin `await`** (best effort). `origen` = un valor fijo por zona ("galeria", "categoria", "hero", "ubicacion", "footer", "fab", "nav"). Si falla, no se hace nada — WhatsApp se abre igual (`target="_blank"`, la página no se recarga).
   - Responde a: spec *Visitante* punto 3 y *Errores* fila "Falla el registro del clic de Cotizar".
3. **Módulo de datos.** Añadir a `assets/interacciones.js` `registrarCotizacion({ piezaId, etiqueta, origen })`.
4. **Panel: pestaña "Cotizaciones".** Activar el ítem de nav. Muestra: (a) ranking de etiquetas por número de clics (todo el histórico), (b) total de clics de los últimos 30 días, (c) listado cronológico (últimos 100). Sin filtros de fecha en v1.
   - Responde a: spec *Administrador* punto 6.
5. **Índice** `cotizaciones(created_at desc)` para el listado.
6. Doc: `CLAUDE.md`.

---

## Fase 5 — Textos del sitio editables

Tabla `public.contenido_sitio` ya existe (Fase 1): `clave text pk, valor text, actualizado_at`.

### Tareas

1. **Definir e insertar las claves** (migración `fase5_seed_contenido`), con el texto actual como valor:
   `hero_eyebrow, hero_titulo, hero_lede, stat1_num, stat1_label, stat2_num, stat2_label, stat3_num, stat3_label, atelier_titulo, atelier1_titulo, atelier1_texto, atelier2_titulo, atelier2_texto, atelier3_titulo, atelier3_texto, ubic_titulo, ubic_direccion, ubic_ciudad, footer_desc`.
   `hero_titulo` guarda `Joyas con *alma*,\nhechas para durar.` (convención: `*x*` → `<em>`, `\n` → `<br>`).
2. **Marcar el HTML.** En `index.html`, poner `data-cs="clave"` en cada elemento correspondiente (span de eyebrow, h1, lede, cada `.stat-num`/`.stat-label`, los h3/p de las tres `.story`, el h2 y `<h4>`/`<p>` de ubicación, el `<p>` del footer-brand). Los textos actuales quedan como fallback en el propio HTML.
3. **Aplicar desde la base.** Nuevo módulo `assets/contenido.js` con `getContenido()` → `{clave: valor}`. En `assets/main.js`, al cargar: traer el contenido y, por cada `[data-cs]`, setear `textContent` = valor (o, para `hero_titulo`, el mini-render `*`/`\n` con todo lo demás escapado). Si la carga falla, no tocar nada (se quedan los textos del HTML).
   - Responde a: spec Fase 5 y *Estados generales* ("si falla, se muestran los textos por defecto").
4. **Panel: pestaña "Textos".** Activar el ítem de nav. Formulario con todas las claves agrupadas (Hero / Stats / Atelier / Ubicación / Footer), cada una un `input`/`textarea` con su valor actual; botón "Guardar cambios" que hace `upsert` de las que cambiaron y setea `actualizado_at = now()`.
   - Responde a: spec *Administrador* punto 7.
5. **Módulo admin:** operaciones de lectura/guardado de `contenido_sitio` en `admin/admin.js`.
6. Doc: `CLAUDE.md`.

---

## Fase 6 — Cuentas de cliente + favoritos

### Cambio que requiere acción del usuario en el dashboard

Para que los visitantes se registren hay que **volver a activar "Allow new users to sign up"** en Supabase → Authentication (se había desactivado en la Fase 1 por seguridad del panel). Esto es seguro: un registro nuevo no obtiene fila en `perfiles`, así que **no** puede entrar al panel admin. Opcional: dejar "Confirm email" activo (más seguro) o desactivarlo (registro sin fricción); el front maneja ambos casos.

### Tareas

1. **Tabla `public.favoritos`** (migración `fase6_favoritos`): `usuario_id uuid references auth.users on delete cascade, pieza_id uuid references piezas on delete cascade, created_at timestamptz default now(), primary key (usuario_id, pieza_id)`. RLS: `enable`; política `for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid())` — cada quien ve y gestiona solo lo suyo. Índice en `usuario_id`.
2. **Módulo `assets/cuenta.js`:** `registrarse`, `iniciarSesion`, `cerrarSesion`, `sesionActual`, `onCambioSesion`, `getFavoritos()` (con datos de la pieza + foto), `agregarFavorito(piezaId)`, `quitarFavorito(piezaId)`.
3. **UI de cuenta en la nav.** En `index.html`, junto al botón "Cotizar", un botón "Cuenta". Abre un modal (`#cuentaModal` en `index.html` + estilos en `styles.css`):
   - Sin sesión: pestañas "Entrar" / "Crear cuenta" (correo + contraseña). Al registrarse, si Supabase pide confirmación → mensaje "Revisa tu correo para confirmar". Al entrar → cerrar modal, actualizar UI.
   - Con sesión: "Hola, {correo}", enlace "Mis favoritos", botón "Salir".
   - Errores de auth con mensajes claros y genéricos.
4. **Corazón en cada pieza.** Al renderizar la galería (`assets/main.js`), añadir a cada `.gallery-item` un botón ♥ (encima de la foto, no dispara el enlace de WhatsApp). Sin sesión → al pulsar abre el modal de cuenta. Con sesión → alterna favorito (`agregarFavorito`/`quitarFavorito`) y pinta el corazón. Al cargar con sesión, marcar los que ya son favoritos.
5. **Vista "Mis favoritos".** Un panel/modal (`#favModal`) que lista las piezas favoritas (foto + nombre + quitar) y un botón grande **"Cotizar mis N favoritos por WhatsApp"** que arma un mensaje con la lista de nombres y abre `wa.me`. Estado vacío: "Aún no has guardado piezas. Toca el corazón en las que te gusten."
6. **Estilos** para corazón, modales de cuenta y favoritos, coherentes con la paleta.
7. Doc: `CLAUDE.md` (incluida la nota de reactivar signups y el modelo de por qué las cuentas no chocan con el panel admin).

---

## Verificación (`verify-after-changes`, al final de las tres)

5 casos, además de revisar que nada de lo anterior se rompió:
1. Clic en "Cotizar" de una pieza y de una categoría → fila en `cotizaciones` con la etiqueta correcta; WhatsApp se abre igual aunque se fuerce el fallo del insert.
2. Panel → Cotizaciones: el ranking y el listado muestran esos clics.
3. Panel → Textos: cambiar el eyebrow del hero y una stat → recargar el sitio → se ven los nuevos; con Supabase caído, se ven los de siempre.
4. Crear cuenta de cliente, entrar, marcar 2 piezas como favoritas → recargar → siguen marcadas; "Cotizar mis favoritos" abre WhatsApp con los 2 nombres.
5. Esa cuenta de cliente entra a `/admin` → "no tiene acceso" (no es admin).

## Fuera de alcance (no se construye)

- Notificaciones por correo al dueño. Recuperación de contraseña más allá de la de Supabase. Perfil de cliente editable (nombre, teléfono). Compartir lista de favoritos por enlace. Roles de admin diferenciados. Todo lo que el spec ya marca como "No incluye".
