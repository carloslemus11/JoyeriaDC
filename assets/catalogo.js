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
