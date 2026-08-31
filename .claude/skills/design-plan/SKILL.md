---
name: design-plan
description: Se usa después de que el usuario aprueba el spec (desde el approval gate de design-spec, o explícitamente en la conversación) para generar el plan de implementación. Genera el archivo en docs/plans/YYYY-MM-DD-titulo.md con cuatro secciones fijas (Objetivo, Contexto del problema, El spec de referencia, Lista de tareas a implementar con detalles). No implementa nada — solo el plan. Usar cuando el usuario apruebe un spec y quiera pasar a planear la implementación, o invoque /design-plan.
---

# Design plan

Traduce un spec ya aprobado (ver [[design-spec]]) en un plan de implementación concreto: la lista de tareas técnicas necesarias para construirlo. Es el paso entre "ya sabemos qué construir, documentado y aprobado" y "empezamos a picar código" — el plan es lo que se ejecuta paso a paso durante la implementación, y luego se valida con [[verify-after-changes]].

## Cuándo usar
- El usuario acaba de aprobar un spec (desde el approval gate de `design-spec`, o explícitamente en la conversación) y no hay plan todavía para esa pieza.
- El usuario pide directamente "haz el plan" o "planea la implementación" para algo que ya tiene spec.

## Cuándo NO usar
- No hay un spec aprobado todavía para esto — corresponde `design-spec` primero (con su approval gate) antes de planear.
- El cambio es tan trivial que no necesitó spec — ir directo a implementar, sin plan.
- Ya existe un plan vigente para la misma pieza y solo hay que ajustarlo — edita ese archivo en vez de crear uno nuevo (ver "Actualizar vs. crear").

## Antes de escribir

1. Confirma cuál es el spec de referencia — el que se acaba de aprobar en esta conversación, o el más reciente relevante en `docs/specs/`:
   ```
   ls docs/specs/ 2>/dev/null
   ```
   Si hay más de un spec candidato y no es obvio cuál aplica, pregúntale al usuario cuál es.
2. Si el spec de referencia no existe o no fue aprobado explícitamente, dilo y ofrece correr `design-spec` primero — no fabriques un plan sin un spec aprobado detrás.
3. Revisa si ya existe un plan relacionado en `docs/plans/`:
   ```
   ls docs/plans/ 2>/dev/null
   ```

## Actualizar vs. crear

- Si el spec de referencia cambió, o el pedido es una evolución de un plan ya existente para la misma pieza, **edita ese archivo** en vez de crear uno nuevo — evita planes duplicados/contradictorios para lo mismo.
- Si es una pieza nueva (spec nuevo, sin plan previo), crea un archivo nuevo.

## Nombre del archivo

`docs/plans/YYYY-MM-DD-titulo.md`

- `YYYY-MM-DD`: fecha de hoy.
- `titulo`: mismo slug que el spec de referencia cuando aplique, para relacionar ambos archivos a simple vista (ej. spec `docs/specs/2026-08-25-galeria-favoritos.md` → plan `docs/plans/2026-08-26-galeria-favoritos.md`).
- Crea la carpeta `docs/plans/` si no existe.

## Las cuatro secciones (siempre estas cuatro, en este orden)

1. **Objetivo** — qué se va a lograr con esta implementación, en 1-3 frases. Debe ser consistente con el Overview del spec, no un objetivo nuevo o distinto.
2. **Contexto del problema** — resume (no copies textual) el contexto del problema del spec: lo justo para que quien lea el plan sin haber leído el spec entienda por qué se está haciendo esto.
3. **El spec de referencia** — ruta exacta al archivo del spec (`docs/specs/YYYY-MM-DD-titulo.md`) del que se deriva este plan. Si por algún motivo excepcional no hay spec formal, dilo explícitamente aquí en vez de dejarlo vacío o inventar uno.
4. **Lista de tareas a implementar** — desglose de las tareas técnicas concretas, en el orden en que se harían. Para cada tarea incluye:
   - Qué se hace (acción concreta — ej. "agregar sección `#favoritos` a `index.html` con la estructura de tarjetas, reutilizando `.gallery-item`").
   - Dónde (archivo/sección del código afectada).
   - A qué parte del spec responde (qué punto de "Comportamiento esperado" o "Posibles errores y mitigaciones" cubre), para que el plan sea trazable al spec y no una lista suelta.
   - Detalle suficiente para ejecutarla sin tener que redecidir el enfoque a mitad de la implementación — sin bajar a código completo: el plan describe qué hacer, no lo escribe.

## Reglas

- **No implementes nada durante esta skill.** Es solo el documento del plan — ni código, ni edición de `index.html`.
- El plan debe ser trazable al spec — cada tarea relevante debería poder señalarse a qué parte del spec responde.
- No agregues tareas fuera del "Alcance v1" definido en el spec — si detectas que hace falta algo que el spec no contempló, dilo aparte (no lo cueles en la lista de tareas) y pregúntale al usuario si se ajusta el spec primero o se deja fuera.
- Sé concreto en cada tarea — evita ítems vagos tipo "mejorar el diseño"; cada tarea debe ser accionable tal cual está escrita.

## Entrega

1. Escribe el archivo en `docs/plans/`.
2. Muestra el contenido (o un resumen fiel) en el chat.
3. Cierra dejando claro que el plan está listo para ejecutarse, y pregunta si se procede a implementarlo o si hay ajustes al plan primero. Al terminar la implementación, corresponde `verify-after-changes` para cerrar el ciclo.
