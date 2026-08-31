---
name: verify-after-changes
description: Se usa cuando se considera terminada la implementación de un plan o desarrollo, para probarlo en el navegador antes de darlo por cerrado. Levanta el servidor local, elige 5 casos de prueba relevantes, los prueba directamente en el navegador, compara el resultado contra el plan/spec que originó el desarrollo, y con ese feedback corrige lo que falle o dé luz verde si todo cumple. A diferencia de brainstorming/design-spec/revision-final, esta skill SÍ corrige lo que encuentre. Usar al terminar de implementar algo, cuando el usuario pida "prueba esto", "verifica los cambios", "¿ya quedó bien?", o invoque /verify-after-changes.
---

# Verify after changes

Cierre de un ciclo de desarrollo: valida en el navegador real que lo recién implementado cumple el objetivo, antes de darlo por terminado. Complementa a [[brainstorming]] (define qué construir) y [[design-spec]] (lo documenta) — esta skill entra cuando el código ya está escrito y toca comprobar que funciona.

Diferencia clave con `revision-final`: esa es una auditoría periódica de todo el sitio y **solo reporta**; esta skill es específica a un cambio recién hecho, compara contra el objetivo de ese cambio puntual, y **sí corrige** lo que encuentre mal dentro del mismo ciclo.

## Cuándo usar
- Se acaba de terminar de implementar un plan, una funcionalidad o un cambio no trivial.
- El usuario pide explícitamente probar o verificar algo que se acaba de construir.

## Cuándo NO usar
- Cambios triviales de una línea sin casos de prueba reales que elegir (un typo, un ajuste de color puntual).
- Auditoría general del sitio sin relación a un cambio reciente → usar `revision-final`.

## Paso 1 — Reunir el objetivo contra el que se valida

Antes de probar nada, identifica el criterio de éxito:
1. El plan/objetivo acordado en esta conversación (qué se pidió construir y qué se dijo que iba a hacer).
2. Si existe, el spec relacionado en `docs/specs/` — busca el más reciente que aplique:
   ```
   ls docs/specs/ 2>/dev/null
   ```
3. Si no hay spec ni plan explícito por escrito, usa el pedido original del usuario en la conversación como criterio de éxito.

## Paso 2 — Levantar el servidor

Usa `preview_start` con la configuración `joyeria-dc` de `.claude/launch.json` (sirve el proyecto por HTTP en local — necesario porque el navegador integrado puede fallar al abrir `index.html` directo por su tamaño). Nunca uses Bash para esto. Si `.claude/launch.json` no existe o no tiene esa entrada, créala primero:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "joyeria-dc", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "8743"], "port": 8743 }
  ]
}
```

## Paso 3 — Elegir 5 casos de prueba

Elige los 5 casos más importantes para validar **este cambio específico** — no una lista genérica de checklist. Prioriza, en este orden de relevancia:
1. El camino feliz principal del cambio (lo que el usuario pidió que funcionara).
2. Un caso límite o de borde relevante para esa pieza (contenido vacío, texto largo, muchos elementos, etc., si aplica).
3. Interacción con algo ya existente que el cambio podría haber afectado sin querer (regresión).
4. Verificación visual en móvil si el cambio toca UI (viewport ~375px).
5. Verificación en modo oscuro si el cambio toca colores/fondos (el sitio soporta claro y oscuro).

Ajusta esta lista a lo que de verdad importa para el cambio en cuestión — no fuerces exactamente estos cinco temas si no aplican, pero mantente en el orden de ~5 casos: ni uno solo, ni una lista larga tipo auditoría completa.

## Paso 4 — Probar en el navegador real

Para cada caso: navega, interactúa (clics, formularios, scroll, resize según corresponda) y verifica con capturas de pantalla, `read_console_messages` (sin errores nuevos) y `read_network_requests` si aplica.

**Nota del entorno (ya vista en este proyecto):** el navegador integrado puede quedar con la pestaña "oculta" (compositing pausado) después de varias acciones seguidas, devolviendo capturas en blanco aunque el contenido esté bien. Si pasa esto:
- Cierra la pestaña (`tabs_close`) y reabre con `preview_start` para refrescar el compositing.
- Evita `scroll` con `repeat` alto de una vez — usa pasos cortos y repite.
- Si tras reintentar sigue fallando, cae a verificación por código (estructura del HTML, estilos computados vía `javascript_tool` con `getComputedStyle`/`getBoundingClientRect`) y dilo explícitamente en el reporte en vez de asumir que se vio bien.

## Paso 5 — Comparar contra el objetivo

Por cada uno de los casos, compara el resultado real contra lo que el plan/spec decía que debía pasar. Clasifica cada uno: ✅ cumple / ⚠️ cumple parcial / ❌ no cumple — con una razón breve en cada caso.

## Paso 6 — Actuar según el resultado

- Si **todo cumple**: dilo explícitamente ("luz verde") y cierra el ciclo — no sigas iterando sobre algo que ya está bien.
- Si **algo falla o queda parcial**: corrígelo directamente (esta skill sí implementa, a diferencia de `brainstorming`/`design-spec`/`revision-final`) y vuelve a probar ese caso puntual hasta que pase, o hasta acordar con el usuario que el riesgo/limitación es aceptable si es una decisión de producto y no solo un bug.
- Si `index.html` cambió durante la corrección, recuerda que hay que volver a publicar el Artifact para que el link se actualice (ver `CLAUDE.md`).
- No inventes que algo pasó si no se pudo verificar — repórtalo como no verificado, igual que en `revision-final`.

## Entrega

Resume en el chat: los casos probados y su resultado, qué se corrigió (si algo), y el veredicto final (luz verde, o pendiente de una decisión del usuario).
