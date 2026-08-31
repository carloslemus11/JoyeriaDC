# Spec — Migración de Joyería DC a Supabase

Fecha: 2026-08-31
Estado: en revisión (approval gate pendiente)

## 1. Overview

El sitio de Joyería DC es hoy un único `index.html` publicado como Claude Artifact. Toda su información (catálogo de piezas, textos, reseñas, sugerencias) vive dentro del archivo o dentro de la "capability" del Artifact, y solo el usuario puede cambiarla editando código o republicando.

Este desarrollo migra el sitio a una base de datos real (Supabase: PostgreSQL + Auth + Storage) y a un hosting propio (Netlify), para que el dueño pueda administrar el contenido desde un panel privado sin tocar código, y para que las reseñas, sugerencias y el interés de los visitantes queden guardados de forma persistente y consultable. Se hace **en 6 fases**; cada fase deja el sitio en línea y funcionando.

## 2. Usuarios objetivo

- **Visitante del sitio** (mayoría en celular): entra a ver el catálogo, mira fotos de piezas, deja una calificación o una sugerencia, y toca "Cotizar" para hablar por WhatsApp. No inicia sesión. No nota ningún cambio respecto al sitio actual, salvo que ahora todo carga desde una base de datos.
- **Dueño / administrador del negocio**: entra a una zona privada del sitio (`/admin`) con correo y contraseña. Desde ahí agrega, edita, reordena y oculta piezas del catálogo y categorías; sube y cambia fotos; edita textos del sitio (hero, stats, textos de secciones); lee y modera las sugerencias recibidas; ve el resumen de calificaciones; y consulta el historial de cotizaciones (qué piezas generan más clics de "Cotizar").
- **Cliente registrado** (solo si se aprueba la Fase 6): visitante que crea una cuenta para guardar piezas favoritas. Uso limitado mientras no haya checkout — se decide en su momento si se construye.

## 3. Contexto del problema

Hoy:

- **El contenido está congelado en el código.** Cambiar una pieza, una foto, un precio de descripción o un texto exige editar `index.html` (un archivo de ~940 KB con base64 embebido) y republicar el Artifact. El dueño no puede hacerlo solo.
- **Las reseñas y sugerencias dependen del Artifact.** Funcionan con la capability de Claude, no con una base de datos; no se pueden consultar, filtrar ni exportar fuera del Artifact, y están atadas a que el sitio siga siendo un Artifact.
- **No hay registro del interés de los visitantes.** Cada clic de "Cotizar" abre WhatsApp y se pierde; no queda rastro de qué piezas se cotizan más.
- **El Artifact no puede conectarse a Supabase.** La CSP del Artifact bloquea todo `fetch`/websocket a hosts externos. Para usar una base de datos, el sitio debe dejar de ser un Artifact y pasar a un hosting real.

## 4. Alcance v1

"v1" aquí = el conjunto completo de las 6 fases. Dentro de cada fase, el detalle fino se define en su `design-plan`.

### Incluye

**Fase 1 — Fundación**
- Proyecto Supabase configurado: esquema de base de datos (todas las tablas de las fases siguientes), políticas de seguridad (RLS), bucket de Storage para imágenes, y Auth por correo/contraseña.
- El sitio actual movido a Netlify, funcionando igual que hoy (sin cambios visibles), ya con `supabase-js` cargado y conectado.
- Estructura del proyecto reorganizada: deja de ser un archivo único; se separa en sitio público + carpeta `admin/`, sin framework ni paso de build.
- El proyecto pasa a ser un repositorio git.

**Fase 2 — Catálogo + panel admin**
- Las piezas y categorías salen del HTML y pasan a Supabase; las fotos pasan a Storage.
- El sitio público renderiza catálogo y categorías leyéndolos de la base.
- Panel `/admin` con login: crear / editar / reordenar / activar-desactivar piezas y categorías, subir y reemplazar fotos, editar nombre y descripción.
- Cada pieza sigue teniendo su botón "Cotizar" que abre WhatsApp con el mensaje de esa pieza.

**Fase 3 — Reseñas y sugerencias en base de datos**
- El widget de calificación (1–5 estrellas) guarda cada calificación en Supabase; el promedio mostrado se calcula desde la base.
- El formulario de sugerencias guarda en Supabase.
- En `/admin`: lista de sugerencias con opción de marcarlas como aprobadas/ocultas; resumen de calificaciones (promedio y conteo).
- Las listas arrancan vacías (no se migra nada: hoy no hay datos reales).

**Fase 4 — Registro de cotizaciones**
- Cada clic en un botón "Cotizar" / "Comprar" registra en Supabase la pieza (o sección) y la fecha/hora, antes de abrir WhatsApp.
- En `/admin`: vista de "piezas más cotizadas" y listado cronológico de clics.

**Fase 5 — Textos editables**
- Los textos clave del sitio (eyebrow + titular + bajada del hero, las 3 stats, textos de las secciones Atelier y Ubicación, datos de contacto) se guardan en Supabase y se editan desde `/admin`.
- El sitio público los lee de la base, con los textos actuales como valor inicial.

**Fase 6 — Cuentas de clientes (condicional)**
- Solo se construye si en su momento se aprueba. Registro/login de visitante y guardado de piezas favoritas.
- Si no se aprueba, se cierra el desarrollo en la Fase 5.

### No incluye por ahora

- Pasarela de pago / checkout / carrito. El negocio sigue vendiendo por WhatsApp (decisión de `CLAUDE.md`).
- Precios ni horarios publicados en el sitio (no se tiene el dato confirmado).
- Testimonios o calificaciones de relleno — todo arranca vacío.
- Migración de datos históricos de reseñas/sugerencias (no existen).
- Multi-usuario admin con roles distintos (permisos por rol): en v1 hay un solo tipo de admin con acceso total. Varios correos admin sí es posible, pero todos con los mismos permisos.
- Panel de administración para móvil optimizado — el `/admin` debe funcionar en móvil pero se diseña pensando en escritorio.
- Notificaciones por correo al dueño cuando llega una sugerencia o calificación.
- Dominio propio (`joyeriadc.com` u otro). Se usa el subdominio gratuito de Netlify; comprar dominio se puede hacer después sin rehacer nada.
- Internacionalización / segundo idioma.
- Analítica de visitas (Google Analytics, Plausible, etc.) más allá del registro de cotizaciones.

## 5. Comportamiento esperado

### Visitante (sitio público)

1. Abre el sitio (URL de Netlify). Ve lo mismo que hoy: hero, colección, atelier, reseñas, sugerencias, ubicación, footer, botón flotante de WhatsApp.
2. **Catálogo:** las categorías y las piezas se cargan desde Supabase al abrir la página. Mientras cargan, se ve un estado de carga breve (esqueleto o spinner sutil) en la zona de la galería; el resto del sitio se ve de inmediato. Si la carga falla, esa zona muestra un mensaje corto ("No pudimos cargar el catálogo, escríbenos por WhatsApp") con el botón de WhatsApp general, y el resto del sitio sigue usable.
3. **Cotizar:** toca "Cotizar" en una pieza → se registra el clic en segundo plano → se abre WhatsApp con el mensaje pre-escrito de esa pieza. Si el registro falla, igual se abre WhatsApp (no se bloquea al visitante por un error de base de datos).
4. **Calificación:** toca una estrella (1–5) → se guarda en Supabase → el promedio y el conteo mostrados se actualizan. Si ya calificó en esta sesión/dispositivo, se le indica que ya dejó su calificación (no se fuerza login para esto). Si el guardado falla, se muestra "No se pudo registrar, intenta de nuevo".
5. **Sugerencia:** llena el formulario (nombre opcional + texto) y envía → se guarda en Supabase → ve confirmación ("¡Gracias por tu sugerencia!"). La sugerencia **no** aparece pública automáticamente: solo se muestra en la lista pública si el dueño la aprueba desde `/admin` (evita spam/contenido ofensivo visible sin filtro). Si el envío falla, el texto escrito no se pierde y se muestra un error.
6. **Textos del sitio (Fase 5 en adelante):** los textos editables se cargan de la base; si falla, se muestran los textos por defecto (los actuales) para que el sitio nunca se vea "roto" o vacío.

### Administrador (`/admin`)

1. Entra a `/admin` → si no tiene sesión, ve una pantalla de login (correo + contraseña). No hay opción de "crear cuenta" en esta pantalla: los correos admin los da de alta el usuario en Supabase directamente.
2. Login correcto → entra al panel. Login incorrecto → mensaje de error, sin dar pistas de si el correo existe.
3. **Catálogo:** ve la lista de piezas (activas e inactivas) y de categorías. Puede:
   - Crear una pieza: nombre, categoría, descripción, orden, estado (activa/inactiva), una o varias fotos.
   - Editar cualquier campo de una pieza existente.
   - Reordenar piezas y categorías (definir el orden en que aparecen en el sitio).
   - Desactivar una pieza: deja de verse en el sitio público pero no se borra.
   - Borrar una pieza: pide confirmación; advierte que es permanente.
   - Subir foto: se guarda en Storage; se muestra vista previa. Reemplazar o quitar fotos de una pieza.
4. **Sugerencias:** lista cronológica de todas las sugerencias recibidas (nombre si lo dejaron, texto, fecha). Cada una se puede marcar como "aprobada" (aparece en la lista pública) u "oculta". Puede borrar una sugerencia (confirmación previa).
5. **Calificaciones:** ve el promedio y la cantidad total de calificaciones. No hay acción sobre calificaciones individuales (son anónimas).
6. **Cotizaciones (Fase 4):** ve un ranking de piezas por cantidad de clics de "Cotizar" en un rango de fechas, y un listado cronológico.
7. **Textos (Fase 5):** formulario con cada texto editable del sitio; guarda y el cambio se refleja en el sitio público al recargar.
8. **Cerrar sesión:** botón visible; vuelve a la pantalla de login.
9. Estados vacíos: cada sección del panel, sin datos, muestra un mensaje guía ("Aún no hay piezas. Crea la primera.") en vez de una tabla vacía.

### Estados generales

- **Cargando:** el sitio público prioriza mostrar la estructura y rellena los datos al llegar; nunca pantalla en blanco esperando a la base.
- **Sin conexión a Supabase:** sitio público → cae a un estado degradado usable con WhatsApp siempre disponible. Panel admin → mensaje claro de que no hay conexión y no se puede administrar ahora.
- **Sesión admin expirada:** al hacer una acción, se redirige a login sin perder de forma silenciosa lo que se estaba haciendo (avisa).

## 6. Posibles errores y mitigaciones

| Situación | Qué ve el usuario | Mitigación |
|---|---|---|
| Supabase caído o sin red al cargar el sitio | Catálogo con mensaje de error + WhatsApp general; resto del sitio funciona | El sitio público degrada por secciones, no falla entero; WhatsApp nunca depende de la base |
| Falla el registro del clic de "Cotizar" | Nada — WhatsApp se abre igual | El registro es "best effort", no bloquea la acción del visitante |
| Falla guardar una calificación o sugerencia | Mensaje "no se pudo, intenta de nuevo"; el texto escrito no se pierde | Reintento manual; el formulario conserva el contenido |
| Visitante califica varias veces | Se le indica que ya calificó | Control por marca local en el dispositivo (no login). Se acepta que es evadible (no es dato crítico) — **riesgo aceptado** |
| Sugerencia con spam / contenido ofensivo | No aparece en el sitio hasta que el dueño la apruebe | Moderación previa obligatoria desde `/admin` |
| Alguien intenta escribir en la base sin ser admin (API pública) | La operación es rechazada | Políticas RLS: público solo puede insertar reseñas/sugerencias/cotizaciones y leer contenido activo; todo lo demás exige sesión admin |
| La `anon key` queda visible en el JS del cliente | — | Es pública por diseño; la seguridad real está en RLS, no en ocultar la key |
| Admin borra una pieza o sugerencia por error | Confirmación previa con aviso de que es permanente | Preferir "desactivar" sobre "borrar" para piezas; el borrado duro se reserva y se advierte. Sin papelera en v1 — **riesgo aceptado** |
| Foto subida muy pesada o en formato raro | Aviso de tamaño/formato no soportado antes de guardar | Límite de tamaño y lista de formatos aceptados (JPG/PNG/WebP) validados en el panel |
| Imagen de Storage no carga en el sitio público | Espacio de la foto con un fondo de seda (placeholder), no un ícono roto | `alt` siempre presente; fallback visual |
| Sesión admin robada / contraseña débil | — | Contraseña fuerte obligatoria en Supabase Auth; sesión con expiración; se puede activar 2FA en Supabase más adelante |
| Se pierde el acceso al correo admin | No puede entrar al panel | El usuario mantiene acceso al proyecto Supabase, donde puede resetear la contraseña o dar de alta otro correo admin |
| El sitio queda a medias entre fase y fase | — | Cada fase se define para dejar el sitio publicado y coherente; no se sube a producción una fase incompleta |
| Datos reales de reseñas/sugerencias existentes se pierden en la migración | — | No aplica: hoy no hay datos reales (arrancan vacías por decisión de negocio) |

## Pendientes / datos que faltan

- URL del proyecto Supabase y `anon key` (para implementar Fase 1).
- Confirmar cuenta de Netlify y si el proyecto puede pasar a git + GitHub.
- Correo(s) que serán admin.
- Decisión final sobre la Fase 6 (cuentas de clientes) — se retoma al cerrar la Fase 5.
