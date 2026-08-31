---
name: design-spec
description: Se usa después de tener claridad sobre el problema y qué se quiere construir (típicamente justo después de brainstorming, cuando el usuario ya eligió una alternativa) para redactar un documento de especificación desde el punto de vista del usuario, antes de escribir código. Genera el archivo en docs/specs/YYYY-MM-DD-titulo.md con seis secciones fijas (Overview, Usuarios objetivo, Contexto del problema, Alcance v1, Comportamiento esperado, Posibles errores y mitigaciones). Termina con un approval gate: iterar el spec o aprobarlo y continuar con design-plan. No implementa nada. Usar cuando el usuario pida "spec", "especificación", "documenta esto antes de construir", o invoque /design-spec.
---

# Design spec

Formaliza por escrito, desde el punto de vista del usuario, qué se va a construir — después de que ya hay claridad sobre el problema y el enfoque (normalmente al salir de [[brainstorming]] con una alternativa elegida). Es el paso entre "ya sabemos qué queremos" y "empezamos a picar código": el spec resultante debe quedar **aprobado explícitamente por el usuario** antes de pasar a [[design-plan]].

## Cuándo usar esta skill
- El usuario ya definió o eligió qué se va a construir (con o sin haber pasado por `brainstorming` antes) y pide dejarlo documentado antes de implementar.
- Un desarrollo lo bastante grande o ambiguo en el detalle como para que valga la pena un documento de referencia (una sección nueva, una funcionalidad, un flujo con varios estados).

## Cuándo NO usar esta skill
- Cambios triviales o de una sola línea — no ameritan un documento.
- El problema todavía no está claro o hay varias alternativas de fondo sin decidir — en ese caso corresponde `brainstorming` primero, no esta skill.
- Ya existe un spec vigente para esto y solo hay que ajustarlo — edita el archivo existente en `docs/specs/` en vez de crear uno nuevo (ver "Actualizar vs. crear" abajo).

## Antes de escribir

1. Reúne el contexto ya disponible: lo que el usuario pidió en esta conversación, la alternativa elegida si venía de `brainstorming`, y lo relevante de `CLAUDE.md` (modelo de negocio, paleta, tono, preferencias del usuario, decisiones ya tomadas).
2. Si falta algo indispensable para completar alguna de las seis secciones y no es inferible del contexto, pregúntalo — puntual y agrupado, no un cuestionario largo. No preguntes lo que `brainstorming` ya resolvió en la misma conversación.
3. Revisa si ya existe un spec relacionado en `docs/specs/`:
   ```
   ls docs/specs/ 2>/dev/null
   ```

## Actualizar vs. crear

- Si el pedido es una evolución de un spec ya existente para la misma pieza, **edita ese archivo** (agrega o ajusta secciones) en vez de crear uno nuevo — evita specs duplicados/contradictorios para lo mismo.
- Si es algo nuevo, crea un archivo nuevo.

## Nombre del archivo

`docs/specs/YYYY-MM-DD-titulo.md`

- `YYYY-MM-DD`: fecha de hoy.
- `titulo`: slug corto en minúsculas, palabras separadas por guiones, en español, que identifique la pieza (ej. `2026-08-25-galeria-favoritos.md`, no `2026-08-25-nueva-funcionalidad.md`).
- Crea la carpeta `docs/specs/` si no existe.

## Las seis secciones (siempre estas seis, en este orden)

1. **Overview** — qué se va a construir y por qué, en 2-4 frases. Suficiente para que alguien que no vio la conversación entienda de qué trata sin leer el resto.
2. **Usuarios objetivo** — quién usa esto y en qué situación (ej. "visitante en el celular decidiendo si cotizar una pieza", "el dueño del negocio revisando sugerencias recibidas"). Si hay más de un tipo de usuario, sepáralos.
3. **Contexto del problema** — qué falta o qué no funciona hoy que motiva esto. Conecta con la realidad del negocio (ver `CLAUDE.md`), no inventes un problema genérico.
4. **Alcance v1** — qué entra y qué explícitamente NO entra en esta primera versión. Dos listas separadas ("Incluye" / "No incluye por ahora") — la lista de "no incluye" es tan importante como la otra para evitar scope creep.
5. **Comportamiento esperado** — cómo lo vive el usuario, paso a paso: qué ve, qué puede hacer, qué pasa en cada acción, los distintos estados (vacío, con datos, cargando si aplica). Describe comportamiento, no implementación (nada de nombres de funciones, estructura de CSS, etc. — eso es para cuando se construya, no para el spec).
6. **Posibles errores y mitigaciones** — qué puede salir mal desde la perspectiva del usuario (datos faltantes, conexión lenta, WhatsApp no instalado, formulario vacío, etc.) y qué pasa en cada caso. Si algo queda sin mitigación clara porque se decide aceptar el riesgo, dilo explícitamente en vez de omitirlo.

## Reglas

- **No implementes nada durante esta skill.** Es solo el documento — ni código, ni edición de `index.html`.
- Todo el spec se escribe desde el punto de vista del usuario/negocio, no desde la implementación técnica.
- No inventes datos del negocio (precios, horarios, cifras) — si algo del spec depende de un dato real que no se tiene, dilo en el spec como pendiente en vez de rellenarlo.
- Sé concreto y breve por sección — un spec largo que nadie relee no sirve; prioriza claridad sobre exhaustividad.

## Entrega y approval gate

1. Escribe el archivo en `docs/specs/`.
2. Muestra el contenido (o un resumen fiel) en el chat.
3. **Gate de aprobación — no se pasa a `design-plan` ni a implementar sin esto.** Pregúntale al usuario explícitamente qué quiere hacer con el spec (usa `AskUserQuestion` cuando el formato lo permita, con opciones del estilo):
   - **Aprobar el spec y continuar con el plan** — si el usuario elige esto, invoca `design-plan` a continuación, usando este spec como referencia.
   - **Iterar el spec** — pide el feedback puntual (qué ajustar), edita el mismo archivo (no crees uno nuevo), muéstralo de nuevo y repite el gate hasta que se apruebe.
   - **Dejarlo así por ahora** — cierra el turno sin pasar a `design-plan`; el spec queda guardado en `docs/specs/` para retomarlo después.
4. Un spec no se da por aprobado implícitamente (que el usuario no objete no cuenta como aprobación) — necesita una elección explícita en el gate antes de seguir a `design-plan` o a escribir código.
