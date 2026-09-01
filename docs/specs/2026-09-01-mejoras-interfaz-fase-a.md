# Mejoras de interfaz — Fase A

## Overview

Ronda de mejoras a la interfaz del sitio público de Joyería DC, orientada a que un
visitante entienda más rápido qué se vende, sienta más confianza y llegue a WhatsApp con
menos fricción — sobre todo en el celular. Esta Fase A agrupa todo lo que se puede hacer
**sin datos comerciales nuevos**: rediseño de las tarjetas de pieza, vista ampliada de cada
pieza, una franja de confianza con mensajes ya verificables, foto protagonista en el hero,
mejor legibilidad y contraste, una llamada a la acción móvil permanente, página más
compacta, y la reubicación de "Sugerencias" para dejar el lugar principal a un bloque de
preguntas frecuentes. El sitio sigue **sin publicar precios** y todo botón de compra sigue
abriendo WhatsApp.

## Usuarios objetivo

- **Visitante en el celular** (mayoría del tráfico según el panel de Visitas) decidiendo si
  una pieza le interesa y si vale la pena escribir por WhatsApp. Hoy tiene que adivinar que
  las fotos se pueden tocar y leer nombres muy pequeños.
- **Visitante en escritorio** explorando la colección con más calma; le sirve ver la pieza
  en grande y con su descripción antes de cotizar.
- **Visitante que llega por Instagram** sin conocer el local: necesita señales rápidas de
  que es un negocio real en Ibagué con oro 18K y atención personal.

## Contexto del problema

El sitio actual se ve premium pero funciona como una vitrina pasiva:

- En la galería, cada pieza es una foto con el nombre en una etiqueta chica; no hay pista de
  que la imagen sea interactiva y no hay un botón visible de "cotizar esta pieza". El enlace
  a WhatsApp está oculto sobre la foto.
- No hay forma de ver una pieza en grande ni de leer su descripción sin salir a WhatsApp.
- El hero lo domina la seda oscura y el monograma DC; no hay una fotografía potente de una
  joya que genere deseo inmediato.
- Textos pequeños en varios lugares (eyebrows, etiquetas de stats, navegación,
  descripciones) que, combinados con el marrón oscuro sobre seda, pierden legibilidad.
- La página es muy larga, especialmente en móvil, por espacios verticales grandes y
  repetición entre secciones.
- El botón circular de WhatsApp (FAB) es discreto y a veces tapa parte de las fotos; una
  barra inferior fija comunicaría mejor "cotiza por WhatsApp".
- La sección "Sugerencias" ocupa un lugar central y grande, interrumpiendo el recorrido de
  compra, cuando aporta poco a un visitante nuevo.
- Aparece una insignia flotante tipo "Powered by Netlify" que en móvil cubre parte de las
  fotos y hace ver el sitio menos terminado.

## Alcance v1

### Incluye

1. **Tarjeta de pieza rediseñada** (galería de `#coleccion`):
   - Nombre de la pieza visible y legible (no una etiqueta diminuta sobre la foto).
   - Material "Oro 18K" y categoría de la pieza visibles en la tarjeta.
   - Botón visible **"Cotizar esta pieza"** en cada tarjeta, que abre WhatsApp con el
     mensaje que menciona esa pieza (comportamiento actual del enlace oculto, ahora
     explícito).
   - Señal visual clara de que la tarjeta se puede abrir para ver más (afordancia de
     "ampliar": ícono o texto "Ver pieza").
2. **Vista ampliada de la pieza** (modal / panel): al tocar una tarjeta se abre la pieza en
   grande con su foto, nombre, categoría, material y descripción (si la tiene), más un botón
   "Cotizar esta pieza". Se cierra con la X, con Escape o tocando fuera.
3. **Franja de confianza**: banda horizontal con 3 mensajes cortos, cada uno con un ícono:
   - "Oro 18K en cada pieza"
   - "Compra presencial en Ibagué — C.C. Los Panches, local 53"
   - "Atención y cotización personalizada por WhatsApp"
   Se ubica entre el hero y la colección (o al inicio de la colección).
4. **Foto protagonista en el hero**: una fotografía potente de una pieza (o pieza en mano)
   junto al texto del titular, del lado donde hoy está el monograma grande. El fondo de
   seda continuo **no se toca**. El monograma con diamante se mantiene en un tamaño menor o
   se reubica, sin desaparecer la identidad.
5. **Legibilidad y contraste**: subir el tamaño mínimo de eyebrows, etiquetas de stats,
   enlaces de navegación y textos de descripción; reforzar el contraste del texto marrón
   sobre la seda (color y/o peso), respetando la paleta pastel ya definida en `CLAUDE.md`.
6. **Llamada a la acción móvil permanente**: en pantallas de móvil, una barra inferior fija
   discreta con "Cotizar por WhatsApp" en lugar del botón circular actual. En escritorio se
   mantiene el botón flotante o se oculta la barra, según se vea mejor.
7. **Quitar la insignia flotante** "Powered by Netlify" (o equivalente) para que no tape
   fotos ni reste terminación.
8. **Página más compacta**: reducir aproximadamente 25–35 % el espacio vertical entre
   secciones y dentro de ellas, más agresivo en móvil, conservando la sensación de aire y
   lujo.
9. **Reubicar "Sugerencias" y shell de FAQ**:
   - El formulario de Sugerencias y su lista pasan a un bloque compacto justo antes del
     footer.
   - En el lugar que ocupaba se coloca una sección de **Preguntas frecuentes** con las
     preguntas visibles y un texto provisional en las respuestas ("Próximamente" o un
     resumen corto ya verificable), a completar en Fase B.

### No incluye por ahora (Fase B u otro momento)

- Precios o "Desde $…" en cualquier forma — decisión explícita de mantener el sitio sin
  precios.
- Campo de **disponibilidad** por pieza (requiere dato por pieza + cambio de esquema +
  panel admin).
- Respuestas reales del FAQ y su contenido definitivo.
- Franja de confianza completa con garantía, métodos de pago y envíos (requiere datos
  comerciales).
- Sección de información comercial concreta: horarios, teléfono adicional, formas de pago,
  envíos dentro de Colombia, garantía y cuidado del oro.
- Mapa real de Google Maps incrustado o fotografía del local.
- Franja / sección de testimonios de clientes (requiere reseñas reales verificables).
- Más fotografías por pieza en la vista ampliada (requiere subir fotos adicionales a
  Storage).
- Cambios en el panel `/admin`.

## Comportamiento esperado

### Colección — galería de piezas

- **Estado cargando**: mientras llega el catálogo de Supabase, se ven tarjetas con efecto
  shimmer (como hoy).
- **Estado con datos**: cada pieza es una tarjeta con su foto arriba y, debajo o
  sobrepuesto con buena legibilidad: nombre de la pieza (grande), categoría + "Oro 18K", y
  un botón "Cotizar esta pieza". La tarjeta completa es clicable para abrir la vista
  ampliada; el botón de cotizar actúa aparte (no abre el modal, va directo a WhatsApp).
- **Estado de error**: si el catálogo no carga, se mantiene el mensaje actual ("No pudimos
  cargar el catálogo…") con botón a WhatsApp.
- **Abrir vista ampliada**: al tocar la tarjeta (fuera del botón), se abre un modal
  centrado con la foto en grande, nombre, categoría, material y descripción, y un botón
  "Cotizar esta pieza". Fondo de la página atenuado detrás.
- **Cerrar vista ampliada**: con la X, tecla Escape, o tocando fuera del modal. El foco
  vuelve a la tarjeta desde la que se abrió. Se respeta `prefers-reduced-motion` (sin
  animación de entrada/salida si está activo).
- **Cotizar desde el modal o la tarjeta**: abre WhatsApp en pestaña nueva con el mensaje
  pre-escrito que menciona la pieza; se registra la cotización igual que hoy
  (`data-cotiza`, origen).

### Hero

- El visitante ve el titular, la bajada y los CTAs a la izquierda, y una fotografía
  protagonista de una pieza a la derecha (en escritorio) o debajo del texto (en móvil).
- La seda de fondo se ve continua igual que hoy, sin costuras.
- La identidad DC (monograma + "18K" + tagline) sigue presente, en menor tamaño o
  integrada con la foto.
- La fila de stats (18K / seguidores IG / local) sigue, con texto más legible.

### Franja de confianza

- Aparece como una banda horizontal con 3 ítems (ícono + texto corto). En móvil los ítems
  se apilan o se muestran en scroll horizontal, sin romper el layout.
- No es interactiva (no lleva a ningún lado); es señal de confianza.

### Llamada a la acción móvil

- En móvil, al cargar la página se ve una barra fija en el borde inferior con el texto
  "Cotizar por WhatsApp" y el ícono de WhatsApp. Al tocarla abre WhatsApp con un mensaje
  genérico y registra la cotización (origen "cta-movil" o similar).
- La barra no tapa el contenido: el pie de página y el último bloque dejan espacio
  suficiente para que nada quede oculto detrás de la barra.
- En escritorio la barra no se muestra; el visitante usa los CTAs de cada sección y, si se
  mantiene, el botón flotante.

### Preguntas frecuentes (shell)

- El visitante ve una sección "Preguntas frecuentes" con una lista de preguntas
  (acordeón o lista simple). Cada pregunta se puede abrir para ver su respuesta.
- En Fase A las respuestas muestran un texto provisional claro ("Estamos completando esta
  información — escríbenos por WhatsApp mientras tanto", con enlace a WhatsApp) o un
  resumen corto ya verificable donde exista.

### Sugerencias (reubicada)

- El formulario de Sugerencias y la lista de sugerencias aprobadas siguen funcionando
  igual (envío a moderación, solo se listan las aprobadas), pero en un bloque más compacto
  justo antes del footer.
- Estado vacío: mismo mensaje actual ("Aún no hay sugerencias — ¡sé el primero…!").

### Página más compacta

- El visitante percibe la misma estética, pero necesita menos scroll para recorrer todo,
  especialmente en móvil. Ninguna sección se elimina (salvo el movimiento de Sugerencias).

## Posibles errores y mitigaciones

- **El catálogo no carga (Supabase caído / sin conexión):** la galería muestra el mensaje
  de error actual con botón a WhatsApp; la vista ampliada simplemente no está disponible
  porque no hay tarjetas. Sin cambio respecto a hoy.
- **Una pieza no tiene descripción:** la vista ampliada muestra nombre, categoría y
  material sin bloque de descripción; no se inventa texto.
- **Una pieza no tiene foto o la foto falla:** la tarjeta y el modal muestran el estado
  "sin foto" (como hoy en la galería), con el resto de la info y el botón de cotizar
  igualmente disponibles.
- **WhatsApp no instalado / bloqueado:** `wa.me` abre la versión web de WhatsApp; mismo
  comportamiento que hoy en todo el sitio.
- **La insignia flotante no se puede quitar por CSS (la inyecta Netlify de forma no
  editable):** se documenta como pendiente y se intenta la vía de configuración de Netlify;
  no se considera bloqueante para el resto de la Fase A.
- **`prefers-reduced-motion` activo:** la vista ampliada y la franja aparecen sin
  animación; nada depende de la animación para ser usable.
- **Barra CTA móvil tapando contenido en pantallas muy pequeñas:** se reserva espacio
  inferior (padding) en el layout para que el último contenido y el footer nunca queden
  ocultos; se verifica a 375 px de ancho.
- **La foto protagonista del hero pesa demasiado y ralentiza la carga:** se usa una versión
  optimizada (WebP/JPEG comprimido) de las que ya están en `IMAGENES JOYAS/Versiones para
  web/`; se verifica el tamaño antes de cerrar.
- **FAQ con respuestas provisionales que se ven "vacías":** el texto provisional es una
  frase útil con enlace a WhatsApp, no un "Lorem ipsum" ni un espacio en blanco.
