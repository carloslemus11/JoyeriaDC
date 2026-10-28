/* Joyería DC — cliente de Supabase compartido por el sitio público y /admin.
 *
 * supabase-js vive en el propio sitio (assets/vendor/supabase-2.118.0.js, versión fija) y se
 * carga como script clásico ANTES de los módulos: define window.supabase. Antes se importaba
 * desde esm.sh sin versión fija: si ese servidor fallaba o cambiaba, todo el JS del sitio
 * (incluidos los botones de WhatsApp) dejaba de funcionar.
 * Requiere también assets/config.js (window.JOYERIA_CONFIG).
 */
const cfg = window.JOYERIA_CONFIG || {};
const { createClient } = window.supabase;

/* Las lecturas (GET/HEAD) se cortan a los 10 s para que una base lenta o recién reanudada no
 * deje la página esperando para siempre; el catálogo pasa entonces a su copia de respaldo.
 * Las escrituras (subida de fotos, login, etc.) no llevan tiempo límite. */
function fetchConTiempo(input, init) {
  const metodo = String((init && init.method) || "GET").toUpperCase();
  if ((metodo !== "GET" && metodo !== "HEAD") || (init && init.signal)) return fetch(input, init);
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, 10000);
  return fetch(input, Object.assign({}, init, { signal: ctl.signal }))
    .finally(function () { clearTimeout(t); });
}

export const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  /* Sin reintentos automáticos de lectura: con la base caída reintentaban 3 veces (1 s + 2 s +
   * 4 s) y el catálogo de respaldo tardaba ~8 s en aparecer. Con respaldo, no hacen falta. */
  db: { retry: false },
  global: { fetch: fetchConTiempo }
});

/* Chequeo de conexión discreto (solo consola, sin tocar la interfaz). */
export async function healthcheck() {
  try {
    const { error } = await sb
      .from("contenido_sitio")
      .select("clave", { count: "exact", head: true });
    if (error) {
      console.warn("[Joyería DC] Supabase respondió con error:", error.message);
      return false;
    }
    console.info("[Joyería DC] Supabase conectado ✓");
    return true;
  } catch (e) {
    console.warn("[Joyería DC] No se pudo contactar a Supabase:", e && e.message);
    return false;
  }
}
