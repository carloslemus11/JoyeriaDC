# Historial de revisiones finales — Joyería DC

Cada sección la agrega el skill `revision-final`. Solo reporta; no corrige nada.

## Revisión — 2026-10-11 23:41

**Alcance:** sitio en producción (https://joyeriadc.netlify.app) — `index.html`, `admin/index.html`, `404.html` — en móvil (375px) y escritorio (1280px), claro y oscuro, más análisis estático del repo. Commit auditado: `35326b1`.

### Crítico

1. **El catálogo está caído: el proyecto de Supabase está pausado otra vez.**
   - Evidencia: `ardfyksmwwwignoejaft.supabase.co` da `NXDOMAIN` desde 1.1.1.1 y 8.8.8.8 (otros dominios de Supabase resuelven bien); la REST API y Storage no responden; las consultas SQL por MCP dan timeout; la consola del sitio muestra `TypeError: Failed to fetch` en catálogo, textos y sugerencias.
   - Qué ve el visitante hoy: **no aparece ninguna foto ni pieza** (solo el mensaje "No pudimos cargar el catálogo en este momento" + botón de WhatsApp); las 4 tarjetas de categoría quedan como un **recuadro gris vacío sin mensaje**; las sugerencias aprobadas no cargan; los textos editables caen al texto del HTML (por eso no se nota). Además `/admin` no puede iniciar sesión.
   - Por qué importa: es el corazón del sitio (el catálogo). Es el mismo incidente del 2026-10-01 (ver `CLAUDE.md`), y volvió a pasar a los ~10 días de reanudarlo — el plan Free se pausa por inactividad, probablemente cada ~7 días, no ~1 mes como se creía.
   - Sugerencia: reanudar el proyecto desde el dashboard de Supabase y **esperar unos minutos** antes de correr cualquier migración (lección ya documentada). Para que no se repita: pasar a plan Pro, o programar un "ping" periódico (p. ej. una tarea que consulte `piezas` cada 2-3 días).

### Alto

2. **La insignia "Powered by Netlify" tapa el botón principal de WhatsApp.**
   - Verificado por geometría: en escritorio cubre el FAB de WhatsApp (badge 1078–1280 × 736–800 vs FAB 1198–1256 × 718–776); en móvil cubre el texto de la barra "Cotizar por WhatsApp".
   - Por qué importa: tapa el CTA que genera todas las cotizaciones.
   - Sugerencia: apagarla en Netlify → Project configuration → General → "Powered by Netlify badge" → off (ya está en "Pendiente" de `CLAUDE.md`; no se puede quitar por CSS).

3. **Las 4 tarjetas de categoría no tienen estado de error.** Cuando falla Supabase, `#catGrid` queda vacío (0 hijos) y se ve un recuadro gris en blanco, mientras que la galería sí muestra mensaje + WhatsApp. Sugerencia: reutilizar el mismo mensaje de error, u ocultar el contenedor si no cargó.

### Medio

4. **Contraste bajo en modo claro** (WCAG AA pide 4.5:1 en texto chico):
   - `--muted #AB9284` → 2.5:1 sobre `--bg` y 2.8:1 sobre `--surface`. Se usa en etiquetas de estadísticas (11.5px), descripción de las tarjetas de categoría, mensaje de error del catálogo, meta de sugerencias.
   - `--gold #BC9268` → 2.4–2.7:1; se usa como color de texto en eyebrows, números de estadísticas, enlaces "Cotizar … →", índices 01/02/03 y el mensaje de gracias.
   - `--ink-soft #83685B` → 4.35:1 sobre `--bg` (rozando el límite).
   - Modo oscuro: sin problemas (9.4–12.9:1).
   - Sugerencia: oscurecer un poco `--muted` y usar `--gold-strong` para texto chico (cuidando la estética pastel).

5. **Sin vista previa al compartir el enlace.** No hay etiquetas `og:title` / `og:image` / `og:description`. Como el negocio vive en WhatsApp/Instagram, al pegar el link el mensaje sale sin foto ni título. Sugerencia: agregar Open Graph con `assets/hero-joya.jpeg`.

6. **Sin favicon declarado** (`<link rel="icon">` ausente). `/favicon.ico` responde 200 con un archivo que no está en el repo (probablemente genérico de Netlify). Sugerencia: declarar un favicon con el monograma DC.

7. **Afirmaciones del negocio que no pude verificar** (revisar que sean ciertas, o editarlas desde `/admin` → Textos):
   - "Síguenos para ver piezas nuevas cada semana" (Ubicación) — promete publicar cada semana.
   - "1.700+ seguidores en Instagram" — cifra fija que se desactualiza.
   - "Cada compra se respalda con su factura" y "primera limpieza sin costo" (Garantía/FAQ). `CLAUDE.md` indica que los términos de garantía los confirmó el usuario; la parte de la factura no aparece confirmada.

### Bajo

8. **Sin `robots.txt` ni `sitemap.xml`** (ambos 404). Útil para SEO; `/admin/` ya tiene `noindex`.
9. **Blancos táctiles chicos** en móvil: enlaces del footer de ~20px de alto (Colección, Atelier, Preguntas frecuentes, Garantía, Sugerencias, WhatsApp, Instagram, Ubicación) y de ~21px en el menú desplegable (con buen espaciado entre sí). Sugerencia: agregar padding vertical.
10. **Limpieza de repo:** dos worktrees viejos en `.claude/worktrees/` (`frosty-archimedes-7cd038`, `jewelry-interface-improvements-fdc74c`) con copias del sitio; no se despliegan (404 en producción). Y 7 imágenes sueltas sin versionar en `IMAGENES JOYAS/` (6 con nombre de generador de IA + 1 captura de WhatsApp del 2026-09-30) — las 6 piezas nuevas ya salieron de ahí.

### Sin problemas encontrados
- **Botones y enlaces:** los 10 `.wa-link` apuntan a `wa.me/12405933943?text=…` con mensajes coherentes por contexto (nav, hero, galería, garantía, ubicación, footer, FAB, barra móvil); las 8 anclas internas tienen destino; los 3 enlaces externos (Maps, Instagram ×2) llevan `target="_blank" rel="noopener"`; "Cómo llegar" usa coordenadas (Apple Maps en iOS, Google Maps en el resto); el menú hamburguesa abre/cierra y actualiza `aria-expanded`; el FAQ abre; el formulario de sugerencias tiene `required` y límites (40/280). Los botones de las tarjetas de categoría y el modal de pieza **no se pudieron probar** (dependen del catálogo caído) — ver "No verificado".
- **Móvil:** sin scroll horizontal (ancho 375 = 375), sin desbordes de contenido, texto mínimo 12.5px, secciones legibles.
- **Texto de relleno:** ninguno (los únicos `placeholder` son los de los campos del formulario; "todo/Todo" son palabras normales).
- **Marca y tono:** "Joyería DC" escrito igual en los 16 usos; sin "usted"; tuteo consistente y tono cálido en todas las secciones.
- **Imágenes estáticas:** el hero carga (723×1086) y tiene `alt` descriptivo. La corrección de scroll-reveal (`35326b1`) **está desplegada** en producción.
- **Seguridad básica:** `/admin/` con `noindex, nofollow`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`; página 404 propia funcionando; `.claude/` no se expone en producción.

### No verificado (y por qué)
- **Fotos del catálogo, tarjetas de categoría, modal de pieza, botones "Cotizar esta pieza" y lista de sugerencias:** no se pudieron probar en producción porque Supabase no responde (hallazgo 1). La verificación del 2026-10-01 en local mostró que las 15 piezas y sus fotos cargaban bien; hay que repetirla cuando se reanude el proyecto.
- **Mapa incrustado de Google Maps y tipografías de Google Fonts:** el navegador integrado bloquea los recursos de terceros (`ERR_BLOCKED_BY_CLIENT`), así que no se vio el mapa ni las fuentes reales.
- **Envío del formulario de sugerencias:** no se envió (escribiría en la base de datos y, además, está caída).
- **Login de `/admin`:** solo se vio que la pantalla carga; no se probó el inicio de sesión (credenciales del dueño + Supabase caído).
