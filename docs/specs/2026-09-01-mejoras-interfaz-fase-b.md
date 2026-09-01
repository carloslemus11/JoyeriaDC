# Mejoras de interfaz — Fase B

## Overview

Segunda ronda de mejoras de interfaz, la que **sí depende de contenido comercial** que el
dueño confirmó el 2026-09-01. Cubre: disponibilidad por pieza (campo nuevo en Supabase +
control en `/admin`, y señal visible en la galería y el modal), respuestas reales en el
FAQ (horario, pagos, envíos, garantía), franja de confianza completa, una sección formal
de **Garantía**, información comercial concreta en "Ubicación" (horario y teléfono
visibles), y un **mapa real de Google Maps** en lugar del pin decorativo. El sitio sigue
sin precios y sin checkout; todo botón de compra abre WhatsApp. No se agregan testimonios
(el negocio no tiene reseñas verificables todavía).

## Usuarios objetivo

- **Visitante decidiendo una compra** (móvil sobre todo): quiere saber si la pieza está
  disponible ya o es por encargo, cómo paga, si le pueden enviar, qué garantía tiene y a
  qué hora puede ir al local — antes de escribir por WhatsApp.
- **Visitante que llega por Instagram sin conocer el negocio**: necesita señales concretas
  (garantía, local físico con horario, mapa real) para confiar.
- **El dueño** administrando el catálogo en `/admin`: marca cada pieza como disponible en
  tienda, por encargo o agotada, sin tocar código.

## Contexto del problema

Fase A dejó el catálogo más usable y un FAQ con preguntas visibles pero **respuestas
provisionales** ("estamos completando esta información"). El sitio todavía no dice:

- Si una pieza está disponible para llevar hoy o hay que encargarla — el visitante tiene
  que preguntar por todo.
- El horario de atención (se pierde gente que llega al local cerrado).
- Formas de pago y si hay envíos dentro de Colombia.
- Qué garantía respalda la compra — clave para una pieza de oro que cuesta lo que cuesta.
- Dónde queda exactamente el local: hoy hay un pin dibujado, no un mapa real.

El dueño ya confirmó los datos, así que se puede reemplazar todo lo provisional por
información real.

## Alcance v1

### Incluye

1. **Disponibilidad por pieza:**
   - Campo nuevo `disponibilidad` en `public.piezas` con tres valores: **disponible en
     tienda**, **por encargo**, **agotada**. Valor por defecto: disponible en tienda (las 9
     piezas actuales quedan así).
   - Control en `/admin` → pestaña "Piezas": un selector en el formulario de crear/editar
     pieza, y el estado visible en cada fila de la lista.
   - En el sitio público: una etiqueta en la tarjeta de la pieza y una línea en el modal.
     "Disponible en tienda" se muestra discreto; "Por encargo" y "Agotada" como etiqueta
     destacada. "Agotada" además atenúa levemente la tarjeta. En los tres casos el botón
     "Cotizar esta pieza" sigue funcionando (abre WhatsApp).
2. **FAQ con respuestas reales** (reemplaza el texto provisional de Fase A):
   - Horario: **lunes a viernes, 9:00 a.m. a 5:00 p.m.**
   - Formas de pago: **efectivo y transferencia / Nequi / Daviplata.**
   - Envíos: **sí, a todo el país; el envío se coordina por WhatsApp (transportadora,
     costo y tiempo según destino). También hay recogida en el local.**
   - Garantía: resumen corto + enlace a la sección de Garantía.
   - Se mantienen las respuestas ya reales de Fase A (oro 18K, verlas en persona).
3. **Sección de Garantía** (`#garantia`): bloque con el texto formal de la garantía de
   Joyería DC (autenticidad del oro, defectos de fabricación por 6 meses, exclusiones,
   mantenimiento). Texto editable desde `/admin` → "Textos".
4. **Franja de confianza completa:** pasa de 3 a 5 mensajes. Los 3 de Fase A más:
   - "Garantía de 6 meses por defectos de fabricación"
   - "Envíos a todo Colombia · pago en efectivo o transferencia"
5. **Información comercial en "Ubicación":**
   - Ítem nuevo de **Horario** (L–V, 9 a.m.–5 p.m.).
   - El ítem de WhatsApp muestra el **número visible** (+1 240 593 3943) además del enlace.
   - Mensajería de pagos/envíos se cubre en el FAQ, no se duplica aquí.
6. **Mapa real de Google Maps:** el recuadro decorativo con el pin (`.loc-visual`) se
   reemplaza por un mapa incrustado de Google Maps centrado en C.C. Los Panches, Ibagué.
   Carga diferida. El botón "Cómo llegar" se mantiene como acción principal.

### No incluye por ahora

- Precios en cualquier forma (decisión firme de no publicarlos).
- Testimonios / reseñas de clientes (no hay material verificable).
- Más fotografías por pieza en el modal (requiere subir fotos adicionales a Storage — queda
  para una Fase C si se decide).
- Pasarela de pago, carrito, reserva online o inventario con cantidades — "disponibilidad"
  es solo un estado de tres opciones, no un stock numérico.
- Crédito / financiación (Addi, Sistecrédito): el dueño no lo ofrece.
- Cambiar el flujo de WhatsApp o el registro de cotizaciones.
- Página o sección de "cuidado del oro" extensa: basta el punto de mantenimiento dentro de
  la Garantía.

## Comportamiento esperado

### Disponibilidad — sitio público

- **Tarjeta de pieza:** debajo de la línea "Categoría · Oro 18K" aparece el estado:
  - *Disponible en tienda* → texto discreto en color suave (o sin etiqueta, solo un punto
    verde tenue), para no recargar.
  - *Por encargo* → etiqueta en tono oro: "Por encargo".
  - *Agotada* → etiqueta gris "Agotada"; la tarjeta se ve levemente atenuada (opacidad).
- **Modal:** misma información como una línea bajo el nombre y la categoría.
- **Botón cotizar:** siempre visible y funcional. Si la pieza está agotada, el texto puede
  cambiar a "Consultar por WhatsApp" pero el destino es el mismo.
- **Estado por defecto:** si una pieza no tuviera valor (no debería pasar tras la
  migración), se trata como "disponible en tienda" y no se muestra etiqueta.

### Disponibilidad — panel `/admin`

- Al crear o editar una pieza, hay un selector "Disponibilidad" con las tres opciones. Por
  defecto "Disponible en tienda".
- En la lista de piezas, cada fila muestra el estado junto a la categoría y el orden.
- Guardar actualiza el sitio público en la siguiente carga (igual que el resto del CRUD).

### FAQ

- El visitante abre cada pregunta (acordeón) y ve la respuesta real. Las de horario, pagos
  y envíos ya no dicen "estamos completando"; dan el dato concreto.
- La pregunta de garantía da un resumen de dos líneas y un enlace "Ver garantía completa"
  que lleva a `#garantia`.

### Sección Garantía

- Bloque con título "Garantía" y el texto formal en 4 puntos numerados. Estático, no
  interactivo. Incluye un botón "Cotizar por WhatsApp" al final (consulta sobre garantía).
- El texto viene de `contenido_sitio` si existe la clave; si no, del HTML.

### Ubicación

- Se ve un ítem de Horario nuevo con el ícono de reloj: "Lunes a viernes, 9:00 a.m. –
  5:00 p.m."
- El ítem de WhatsApp muestra el número "+1 240 593 3943" como texto, además del enlace de
  siempre.
- Donde estaba el pin dibujado, ahora hay un mapa de Google Maps interactivo (se puede
  arrastrar y hacer zoom dentro del recuadro). Debajo o al lado, el botón "Cómo llegar"
  abre la app de mapas del teléfono como hasta ahora.

### Franja de confianza

- Cinco ítems en lugar de tres. En escritorio en una fila (con wrap); en móvil apilados,
  sin romper el layout ni tapar contenido.

## Posibles errores y mitigaciones

- **La migración del campo `disponibilidad` no se aplica antes de desplegar el front:** la
  lectura del catálogo pediría una columna inexistente y fallaría toda la galería. Mitigación:
  aplicar la migración en Supabase **primero**, verificar, y recién entonces desplegar el
  HTML/JS que la usa. La lectura de `catalogo.js` incluye el campo solo después de que la
  columna existe.
- **Una pieza con valor de disponibilidad inesperado (dato viejo o manual):** el front lo
  trata como "disponible en tienda" y no muestra etiqueta, en vez de romperse.
- **El dueño marca todo "Agotada" por error:** las tarjetas se atenúan pero siguen
  clicables y el botón de WhatsApp funciona; no se pierde ninguna venta potencial, solo se
  comunica el estado. Reversible desde `/admin`.
- **El mapa de Google no carga (sin conexión, bloqueado por el navegador, o política de
  privacidad):** el recuadro queda vacío o con el fondo de respaldo, pero el botón "Cómo
  llegar" —que no depende de Google embebido— sigue llevando a Google/Apple Maps. Se acepta
  que el iframe de Google puede fijar cookies de Google; es una concesión que el dueño
  eligió a cambio de un mapa real.
- **El iframe del mapa ralentiza la carga de la página:** se carga con `loading="lazy"` y
  queda debajo del pliegue en la sección Ubicación, así que no bloquea el primer pintado.
- **El texto de la garantía es un compromiso del negocio y podría necesitar ajuste legal:**
  queda editable desde `/admin` → "Textos"; si cambian los términos (plazo, coberturas), se
  actualizan sin tocar código.
- **`prefers-reduced-motion`:** ni la franja ampliada ni la sección de garantía dependen de
  animación; el mapa de Google es estático hasta que el usuario interactúa.
- **Horario desactualizado en temporada (festivos, diciembre):** el horario vive en
  `contenido_sitio`, editable; además el FAQ y el WhatsApp siguen siendo el canal para
  confirmar el horario de un día puntual.
- **Móvil 375 px:** la franja de 5 ítems apilada, el mapa embebido y la sección de garantía
  se verifican a ese ancho para que no haya scroll horizontal ni solapamiento con la barra
  CTA fija.
