/* Joyería DC — lectura del catálogo desde Supabase (sitio público). */
import { sb } from "./supabase-client.js";

const cfg = window.JOYERIA_CONFIG || {};

/** URL de una foto de pieza.
 * - http(s)://...            -> tal cual
 * - assets/... o /...        -> archivo del propio sitio (respaldo de arranque)
 * - resto (p. ej. catalogo/) -> objeto público del bucket "piezas" de Storage
 */
export function fotoUrl(storagePath) {
  if (!storagePath) return "";
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  if (/^\/|^assets\//.test(storagePath)) return storagePath;
  return `${cfg.SUPABASE_URL}/storage/v1/object/public/piezas/${storagePath}`;
}

/** Categorías activas, ordenadas. */
export async function getCategorias() {
  const { data, error } = await sb
    .from("categorias")
    .select("id, nombre, slug, descripcion, cta_label, cta_msg, orden")
    .eq("activa", true)
    .order("orden", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Piezas activas, ordenadas, cada una con sus fotos. */
export async function getPiezas() {
  const { data, error } = await sb
    .from("piezas")
    .select("id, nombre, descripcion, disponibilidad, orden, categoria_id, pieza_fotos(storage_path, alt, orden)")
    .eq("activa", true)
    .order("orden", { ascending: true });
  if (error) throw error;
  return (data || []).map((p) => {
    const fotos = (p.pieza_fotos || []).slice().sort((a, b) => a.orden - b.orden);
    return { ...p, fotos, foto: fotos[0] || null };
  });
}

/* Rechaza si la promesa no responde en `ms` (base colgada); el rechazo tardío queda atendido. */
function conLimite(promesa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("tiempo agotado")), ms);
    promesa.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

/** Catálogo completo: { categorias, piezas, respaldo }.
 * Primero intenta Supabase. Si falla (proyecto pausado, sin red, lento), usa la copia guardada
 * en assets/catalogo-respaldo.json — así el catálogo se sigue viendo y se puede cotizar por
 * WhatsApp aunque la base no responda. `respaldo: true` avisa a la interfaz para que no muestre
 * disponibilidad (la copia puede estar desactualizada). Se vuelve a generar cuando cambia el
 * catálogo (ver CLAUDE.md, "Copia de respaldo del catálogo"). */
export async function getCatalogo() {
  try {
    const [categorias, piezas] = await conLimite(Promise.all([getCategorias(), getPiezas()]), 5000);
    if (!piezas.length) throw new Error("catálogo vacío");
    return { categorias, piezas, respaldo: false };
  } catch (e) {
    console.warn("[Joyería DC] Supabase no respondió; se usa el catálogo de respaldo:", e && e.message);
    const res = await fetch("assets/catalogo-respaldo.json");
    if (!res.ok) throw new Error("respaldo no disponible (" + res.status + ")");
    const r = await res.json();
    return { categorias: r.categorias || [], piezas: r.piezas || [], respaldo: true };
  }
}
