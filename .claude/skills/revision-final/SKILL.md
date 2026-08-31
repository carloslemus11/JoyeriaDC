---
name: revision-final
description: Audita el sitio de Joyería DC contra un checklist fijo (móvil, botones, texto de relleno, imágenes, tono) y entrega una lista de problemas priorizada. NUNCA arregla nada por su cuenta — solo reporta, hasta que el usuario apruebe. Usar cuando el usuario pida "revisión final", "revisa el sitio", "audita la página", o invoque /revision-final.
---

# Revisión final del sitio

Auditoría de calidad para cualquier archivo `.html` del proyecto (hoy solo `index.html`, pero el sitio puede crecer a más páginas — no asumas un solo archivo). Esta skill **audita y reporta. No corrige nada** hasta que el usuario lo apruebe explícitamente, ni siquiera arreglos "obvios" o de una línea.

## Antes de empezar

1. Encuentra todos los `.html` del proyecto (raíz y subcarpetas, ignora `node_modules` si algún día existe):
   ```
   find . -iname "*.html" -not -path "*/node_modules/*"
   ```
2. Si hay más de un archivo, audita cada uno por separado pero entrega **un solo reporte consolidado** al final, agrupado por archivo.
3. Revisa `CLAUDE.md` en la raíz antes de empezar — ahí está documentada la estructura del sitio, la paleta, las secciones y las decisiones de diseño ya tomadas. Úsalo como contexto, no lo repitas en el reporte.

## Método: navegador real, no solo lectura de código

Esto es intencional: leer el HTML no basta para detectar cómo se ve o se comporta de verdad. Para cada archivo:

1. Ábrelo en el navegador integrado (`preview_start` con la ruta `file://...`, o `navigate` si ya hay una pestaña abierta).
   - **Advertencia conocida de este entorno:** el navegador integrado puede fallar en abrir archivos locales grandes (se ha visto fallar con `index.html` una vez pasó de ~500 KB, por las imágenes en base64 embebidas). Si `preview_start`/`navigate` da error de "couldn't open" o similar:
     - Reinténtalo una vez.
     - Si sigue fallando, cae a análisis estático de código para ese archivo (lee el HTML/CSS/JS directamente) y dilo explícitamente en el reporte: qué puntos del checklist no se pudieron verificar visualmente y por qué, en vez de omitirlo en silencio o inventar que sí se probó.
2. Con el sitio abierto, recorre cada punto del checklist (abajo) en orden.

## El checklist (en este orden de prioridad)

### 1. Botones y enlaces — ¿llevan a donde deben?
Para cada elemento clicable (botones, links del nav, tarjetas de la galería, FAB de WhatsApp, footer):
- Si es un link de WhatsApp (`wa-link`, `data-wa-msg`): confirma que el `href` resultante apunta al número correcto (revisa `WA_NUMBER` en el `<script>`) y que el mensaje pre-escrito (`data-wa-msg`) tiene sentido con el contexto del botón (ej. el botón de "Anillo con esmeralda" no debe mandar el mensaje de "Pulsera tricolor").
- Si es un ancla interna (`#seccion`): confirma que esa sección existe en el documento (`id="seccion"`).
- Si es un link externo (Instagram, Google Maps): haz clic o revisa el `href` y confirma que la URL es correcta y usa `target="_blank" rel="noopener"`.
- Prueba al menos los botones del nav, el CTA del hero, un par de tarjetas de categoría, un par de fotos de la galería, el widget de estrellas, el formulario de sugerencias, y el FAB — no hace falta clicar los 20+ si varios comparten la misma lógica, pero sí cubre cada *tipo* de botón al menos una vez.

### 2. Se ve bien en móvil
- Cambia el viewport a tamaño móvil (375px de ancho aprox.) con `resize_window`.
- Recarga la página después de cambiar el viewport (algunos estilos dependen de detectar el tamaño al cargar).
- Recorre el sitio de arriba a abajo por captura de pantalla, revisando: texto cortado o desbordado, imágenes que se salen del contenedor, botones o tarjetas amontonados, el menú hamburguesa (ábrelo y ciérralo), tamaño de los botones para dedo (no deberían quedar minúsculos), scroll horizontal no intencional.

### 3. Sin texto de relleno
Busca en el código fuente (no solo visualmente) patrones como: `lorem ipsum`, `Lorem`, `placeholder`, `TODO`, `TBD`, `texto de ejemplo`, `contenido de prueba`, `[nombre]`, `[dirección]`, o cualquier dato que suene inventado/genérico en vez de real (precios inventados, horarios inventados, número de teléfono de ejemplo, direcciones falsas). Si encuentras algo así, repórtalo como crítico — es contenido que no debería estar en producción.

### 4. Las imágenes cargan
- Para imágenes embebidas como `data:image/...;base64,...`: decodifica el base64 y confirma que son bytes de imagen válidos (cabecera PNG/JPEG reconocible) — no hace falta abrir el navegador para esto, es más rápido en código.
- Para imágenes con `src` externo (si las hay): confírmalo en el navegador — usa `read_network_requests` para ver si algún request de imagen falló (404, etc.) y `read_console_messages` para errores de carga.
- Revisa también que cada `<img>` tenga `alt` descriptivo (no vacío, no genérico tipo "imagen1.jpg").

### 5. El copy usa mi tono
Referencia: **consistencia interna del sitio**, no una fuente externa. Lee todo el texto visible del sitio de corrido y evalúa:
- ¿El nivel de formalidad es el mismo en todas las secciones? (si el hero es cercano/cálido, que no haya un bloque que suene corporativo/frío, o viceversa)
- ¿Se usa "tú" de forma consistente (no mezclar con "usted")?
- ¿El nombre de la marca se escribe igual en todos lados ("Joyería DC" vs "JOYERIA.DC" vs "DC Joyería")?
- ¿Hay frases que se sientan genéricas de plantilla en vez de específicas del negocio?
No es una revisión gramatical exhaustiva — es detectar quiebres de tono, no errores de ortografía (aunque si ves un error obvio, inclúyelo igual, con prioridad baja).

## Formato del reporte

Prioriza los hallazgos en este orden (de más a menos grave):
1. **Crítico** — algo roto: link muerto, imagen que no carga, botón que no hace nada, texto de relleno visible en producción.
2. **Alto** — funciona pero se ve mal o es difícil de usar en móvil.
3. **Medio** — quiebre de tono, copy inconsistente, detalles de contenido.
4. **Bajo** — pulido menor, sugerencias opcionales.

Para cada hallazgo: qué archivo/sección, qué está mal, por qué importa, y una sugerencia breve de cómo arreglarlo (sin arreglarlo). Si un punto del checklist no se pudo verificar (por la limitación del navegador con archivos grandes u otra razón), dilo explícitamente en su propia línea — no lo mezcles con los hallazgos reales ni lo omitas.

Si no se encuentra ningún problema en una categoría, dilo brevemente ("Botones: sin problemas encontrados") en vez de omitir la categoría — así se sabe que sí se revisó.

## Entrega

1. Muestra el reporte completo en el chat.
2. Además, guárdalo en `revision-final.md` en la raíz del proyecto:
   - Si el archivo no existe, créalo.
   - Si ya existe, **agrega** una nueva sección al final con fecha y hora (`## Revisión — YYYY-MM-DD HH:MM`), no sobrescribas revisiones anteriores — el archivo es un historial acumulado.

## Regla innegociable

**No corrijas nada.** Ni errores tipográficos obvios, ni un link mal escrito, ni nada — por más pequeño o evidente que parezca. Entrega el reporte, espera a que el usuario diga qué quiere que se arregle, y solo entonces actúa (en una conversación/turno aparte, no como parte de esta skill).
