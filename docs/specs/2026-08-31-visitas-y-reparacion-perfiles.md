# Reparación de base + manejo de visitas

## 1. Overview

El sitio quedó con la base de datos a medias tras una sesión previa sin terminar: se
borraron las tablas `perfiles`, `calificaciones` y `favoritos`, pero el sitio y el panel
siguen esperándolas. Hoy eso tiene **caída la galería de Colección y el panel `/admin` en
producción**. Este desarrollo: (a) repara esa ruptura recreando `perfiles` y su usuario
administrador; (b) retira definitivamente las cuentas de cliente con favoritos (Fase 6) y
el widget de reseñas por estrellas (Fase 3), que no se van a usar; y (c) agrega una
pestaña **"Visitas"** en `/admin` que registra y resume el tráfico del sitio (cuántas
visitas, por día, de dónde llegan, con qué dispositivo y de qué país), sin cookies de
rastreo ni datos que identifiquen a nadie.

## 2. Usuarios objetivo

- **El dueño del negocio**, entrando a `/admin` desde el celular o el computador, que
  quiere saber si el sitio recibe visitas, si crecen con el tiempo, y de dónde llega la
  gente (Instagram, Google, un enlace directo) para entender qué está funcionando.
- **El visitante del sitio** (público): no ve nada nuevo. Su visita se cuenta de forma
  anónima y en segundo plano, sin pedirle permiso, porque no se guarda nada que lo
  identifique.

## 3. Contexto del problema

- **La base quedó inconsistente.** Ahora mismo en joyeriadc.netlify.app: la galería de
  piezas muestra el mensaje de error ("Escríbenos por WhatsApp") porque al leer las fotos
  se evalúa una regla de permisos que depende de `perfiles`, que ya no existe; y el panel
  `/admin` no deja iniciar sesión por el mismo motivo. El widget de reseñas también falla
  al cargar.
- **Cuentas de cliente + favoritos (Fase 6): se retiran.** Se construyeron y se decidió
  quitarlas: agregaban registro de usuarios, un modal y mantenimiento, para un beneficio
  bajo en un negocio que vende 100% por WhatsApp. La tabla ya se borró; falta limpiar el
  código y cerrar el registro público de usuarios.
- **Widget de estrellas "califica tu experiencia" (Fase 3): se retira.** Nunca recibió
  calificaciones reales. El formulario de **sugerencias** es otra cosa y se queda.
- **No hay forma de medir el tráfico.** El negocio publica el enlace en Instagram y lo
  comparte por WhatsApp, y quiere saber si eso trae visitas y de dónde vienen. Se decidió
  resolverlo dentro del mismo Supabase (no una herramienta externa) para tener todo en un
  solo lugar y sin costo adicional.

## 4. Alcance v1

### Incluye

- Recrear la tabla `perfiles` con su regla de acceso y volver a marcar como administrador
  al único usuario que existe en el sistema de login. Con esto vuelven la galería y el
  panel.
- Quitar del **sitio público**: el botón "Cuenta", los modales de cuenta y de favoritos,
  el corazón de "guardar" en cada pieza, y el widget de estrellas de la sección Reseñas.
- Quitar la **sección "Reseñas"** completa: del menú de navegación, del pie de página y del
  cuerpo de la página. (El formulario de sugerencias está en su propia sección aparte y no
  se toca.)
- Quitar del **panel `/admin`** el resumen de "promedio / calificaciones"; la pestaña pasa
  a llamarse solo "Sugerencias".
- **Registrar una fila por cada carga de página** del sitio público en una tabla
  `visitas`, con: ruta visitada, sección, fuente de la visita (Instagram / Google /
  Facebook / WhatsApp / Directo / Otro), dominio de procedencia, tipo de dispositivo
  (móvil / tablet / escritorio) y país aproximado (código de 2 letras).
- Una **función de borde en Netlify** (Edge Function) mínima que expone el país aproximado
  que ya provee Netlify, para que el sitio lo registre sin consultar servicios de terceros
  ni exponer la IP del visitante.
- Nueva **pestaña "Visitas" en `/admin`** con: total de visitas de hoy y de los últimos 30
  días; listado de visitas por día (últimos 30); y tres desgloses del mismo período (por
  fuente, por dispositivo, por país). Solo el administrador puede verla.
- Actualizar la documentación del proyecto (`CLAUDE.md`, archivos SQL de referencia,
  `supabase/setup.md`) para que refleje el estado real.

### No incluye por ahora

- Distinguir "visitantes únicos" de "vistas de página": v1 cuenta vistas, no personas.
- Gráficas visuales (barras, líneas). Los desgloses son tablas/listas numéricas, como se
  ven hoy las otras pestañas del panel.
- Filtrar bots ni rastreadores automáticos.
- Guardar cualquier dato que identifique al visitante: IP, identificador persistente,
  navegador completo, ciudad exacta.
- Histórico anterior a la puesta en marcha: el conteo arranca en cero el día que se
  publique.
- Reactivar reseñas o cuentas de cliente (se retiran; si algún día se quieren, es otro
  desarrollo).
- Exportar los datos de visitas a Excel/CSV.
- Rango de fechas configurable en el panel (queda fijo en "hoy" y "últimos 30 días").

## 5. Comportamiento esperado

### Visitante del sitio (público)

1. Abre cualquier página del sitio. Todo se ve y funciona igual que antes.
2. En segundo plano, sin bloquear nada, el sitio registra la visita: qué ruta abrió, de
   qué enlace venía (Instagram, Google, etc.), si está en móvil o escritorio, y de qué
   país (dato aproximado de la red, no su ubicación exacta).
3. Si ese registro falla (sin conexión, permiso, lo que sea), el visitante no se entera y
   el sitio sigue normal.
4. No aparece ningún aviso de cookies nuevo, porque no se usan cookies de rastreo ni se
   guarda nada personal.
5. Ya no ve el botón "Cuenta" en el menú, ni el corazón para guardar piezas, ni la sección
   de calificar con estrellas. El formulario de sugerencias sigue donde estaba.

### Dueño del negocio en `/admin`

1. Entra a `/admin` e inicia sesión con su correo y contraseña (vuelve a funcionar tras la
   reparación).
2. Ve las pestañas: Piezas, Categorías, Sugerencias, Cotizaciones, Textos y **Visitas**
   (nueva).
3. Entra a "Visitas" y ve de inmediato:
   - Dos números grandes: **visitas de hoy** y **visitas de los últimos 30 días**.
   - Una lista **"por día"** de los últimos 30 días: cada fila con la fecha y el número de
     visitas.
   - **"Por fuente"**: Instagram, Google, Facebook, WhatsApp, Directo, Otro — cada uno con
     su conteo de los últimos 30 días.
   - **"Por dispositivo"**: Móvil, Tablet, Escritorio, con su conteo.
   - **"Por país"**: lista de países ordenada de más a menos visitas.
4. **Estado vacío:** si todavía no hay visitas, cada bloque muestra un texto tipo "Aún no
   hay visitas registradas" en vez de tablas vacías.
5. Nadie que no sea administrador puede ver estos datos (si alguien consulta la base
   directamente, la regla de acceso se lo niega).

### Reparación (ocurre una sola vez, no es una acción del usuario)

- Al aplicar el cambio se recrea `perfiles`, se reasigna el rol admin al usuario
  existente, y la galería del sitio y el login del panel vuelven a funcionar sin más
  intervención. Queda verificado que el usuario quedó con rol admin antes de cerrar.

## 6. Posibles errores y mitigaciones

- **El registro de la visita falla o va lento:** se hace en segundo plano y sin esperar
  respuesta; nunca retrasa ni rompe la carga de la página. Se pierde ese conteo y ya.
- **La función de país de Netlify no responde o no da dato:** la visita se registra igual,
  con el país en blanco. El panel agrupa esas visitas como "Desconocido".
- **El sitio se re-despliega en Netlify sin incluir la carpeta de la función de borde:**
  el país deja de registrarse (todo cae en "Desconocido") pero el resto del conteo sigue.
  Queda anotado en la documentación como paso obligatorio al re-desplegar.
- **La reparación de `perfiles` no reasigna bien al admin:** el dueño no podría entrar a
  `/admin`. Mitigación: el paso de reparación verifica que el usuario quedó con rol admin;
  si no, se corrige a mano en el mismo momento.
- **Referrer ausente o "sucio":** muchos navegadores no mandan de dónde viene el visitante,
  o Instagram usa un intermediario. Esas visitas se registran como "Directo" u "Otro"; se
  asume ese margen de error.
- **Doble conteo por recargas o navegación interna:** v1 cuenta cada carga de página como
  una visita; recargar cuenta doble. Riesgo aceptado en v1 (no se mide "visitante único").
- **Datos de prueba de la sesión previa** (2 cotizaciones de prueba): se dejan documentados
  como prueba o se limpian; no afectan el conteo de visitas nuevo.
- **Sesiones de cliente viejas (Fase 6):** ya no hay funciones de cliente; esa sesión no
  sirve para nada y no estorba. El registro público de usuarios queda cerrado en el
  sistema de login (paso manual en el panel de Supabase).
