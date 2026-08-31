---
name: brainstorming
description: Se usa SIEMPRE que se arranca un desarrollo nuevo en el sitio (una sección, función o cambio de diseño no trivial) antes de escribir código. Hace preguntas al usuario para eliminar ambigüedad sobre el pedido y, al final, presenta 2-3 alternativas concretas para elegir cómo abordarlo. No implementa nada — solo indaga y propone. Usar cuando el usuario pida algo nuevo con espacio a interpretarse de más de una forma, o invoque /brainstorming.
---

# Brainstorming antes de un desarrollo nuevo

Filtro de arranque para pedidos con más de una interpretación razonable. El objetivo es no empezar a picar código sobre un pedido ambiguo y terminar construyendo lo que el usuario no quería.

## Cuándo usar esta skill
- El usuario pide algo nuevo: una sección, un componente, una funcionalidad, un rediseño de una parte del sitio.
- El pedido deja abierto el alcance, el diseño, el comportamiento, o qué datos/contenido usar.

## Cuándo NO usar esta skill
- Pedidos triviales de una sola interpretación posible (cambiar un texto puntual, ajustar un color, un tamaño, un typo).
- Bugfixes con causa y solución claras.
- El usuario ya dio explícitamente todos los detalles necesarios (alcance, diseño, contenido) — en ese caso, confirma en una línea y pasa directo a trabajar, no repreguntes por repreguntar.
- Cuando el usuario ya está en medio de iterar sobre un desarrollo que arrancó con esta misma skill (no la vuelvas a correr para cada ajuste chico).

## Cómo trabajar

1. **Detecta la ambigüedad real.** Antes de preguntar nada, revisa qué ya es inferible de:
   - El código actual del sitio.
   - `CLAUDE.md` (paleta, tono, modelo de negocio, decisiones de diseño ya tomadas, preferencias del usuario).
   - Lo que el usuario ya dijo en la conversación.
   Solo pregunta lo que de verdad falta definir.

2. **Pregunta de forma concreta**, agrupando lo relacionado (usa `AskUserQuestion` cuando el formato lo permita — opciones claras en vez de preguntas abiertas sueltas). Ejes típicos a cubrir según aplique:
   - **Alcance**: ¿qué entra y qué no entra en esta primera versión?
   - **Contenido/datos**: ¿hay info real del negocio para esto, o falta y hay que pedirla? (nunca inventar precios, horarios, testimonios, etc. — ver `CLAUDE.md`)
   - **Diseño/ubicación**: ¿dónde va esto en el sitio? ¿se parece a algo que ya existe o es un patrón nuevo?
   - **Comportamiento**: ¿interactivo o estático? ¿lleva a WhatsApp como el resto del sitio, o es distinto?
   - **Prioridad**: si hay varias piezas, ¿cuál importa más resolver primero?

3. **Arma 2 o 3 alternativas** con las respuestas obtenidas. Cada alternativa debe tener:
   - Un nombre corto que la identifique.
   - Qué implica en 1-3 líneas (qué se construye, cómo se ve/comporta).
   - El trade-off principal frente a las otras opciones (más simple vs. más completo, más rápido de implementar vs. más pulido, etc.).

4. **Presenta las alternativas en el chat** (texto simple, sin implementar nada todavía) y espera a que el usuario elija una, pida una mezcla, o dé más contexto. Recién ahí — en el mismo turno si el usuario ya eligió, o en uno posterior — se pasa a implementar.

## Reglas

- **No escribas ni edites código durante esta skill.** Es indagación + propuesta, nada más.
- Las alternativas deben respetar lo ya establecido en `CLAUDE.md` (paleta pastel/seda, tipografías, modelo de cotización por WhatsApp sin checkout, no inventar precios/horarios/testimonios) — no propongas algo que choque con esas decisiones ya tomadas, salvo que el usuario esté pidiendo explícitamente cambiar una de ellas.
- Sé breve al preguntar: prioriza pocas preguntas bien elegidas sobre un cuestionario largo.
- Si tras preguntar el pedido sigue siendo claramente uno solo (no hay verdaderas alternativas de fondo, solo detalles de ejecución), está bien presentar una sola propuesta clara en vez de forzar 2-3 opciones artificiales.
