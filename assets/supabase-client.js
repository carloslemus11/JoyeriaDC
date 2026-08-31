/* Joyería DC — cliente de Supabase compartido por el sitio público y /admin.
 *
 * Se carga como módulo ES. Requiere que assets/config.js se haya cargado antes
 * (script clásico) para tener window.JOYERIA_CONFIG.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.JOYERIA_CONFIG || {};

export const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

/* Chequeo de conexión discreto (solo consola, sin tocar la interfaz).
 * Sirve para validar la Fase 1; se puede quitar al empezar la Fase 2. */
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
