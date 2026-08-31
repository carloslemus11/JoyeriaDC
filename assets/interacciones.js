/* Joyería DC — sugerencias, registro de cotizaciones y registro de visitas
   (sitio público) contra Supabase. */
import { sb } from "./supabase-client.js";

export async function getSugerenciasAprobadas() {
  const { data, error } = await sb
    .from("sugerencias")
    .select("nombre, texto, created_at")
    .eq("estado", "aprobada")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function enviarSugerencia({ nombre, texto }) {
  const { error } = await sb
    .from("sugerencias")
    .insert({ nombre: nombre || null, texto, estado: "pendiente" });
  if (error) throw error;
}

/* Registro "best effort" de un clic de "Cotizar" (no bloquea, no lanza). */
export function registrarCotizacion({ piezaId, etiqueta, origen }) {
  try {
    sb.from("cotizaciones")
      .insert({ pieza_id: piezaId || null, etiqueta: etiqueta || null, origen: origen || null })
      .then(function () {}, function () {});
  } catch (e) { /* nada */ }
}

/* ------------------------------------------------------------------ */
/*  Registro de visitas (anónimo, best effort)                         */
/* ------------------------------------------------------------------ */

function dominioDe(url) {
  try { return new URL(url).hostname || null; } catch (e) { return null; }
}

/* Deriva la "fuente" de la visita a partir del dominio del referrer. */
function fuenteDe(dominio) {
  if (!dominio) return "directo";
  var d = dominio.toLowerCase();
  if (/(^|\.)instagram\.com$/.test(d)) return "instagram";
  if (/(^|\.)google\./.test(d)) return "google";
  if (/(^|\.)facebook\.com$/.test(d) || d === "lm.facebook.com") return "facebook";
  if (/(^|\.)whatsapp\.com$/.test(d) || d === "wa.me") return "whatsapp";
  return "otro";
}

/* Tipo de dispositivo a partir del user-agent (aproximado, sin guardar el UA). */
function dispositivoDe() {
  var ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return "tablet";
  if (/Mobi|Android|iPhone|iPod|Windows Phone/.test(ua)) return "movil";
  return "escritorio";
}

/* País aproximado: lo inyecta la Netlify Edge Function como <meta name="dc-pais">. */
function paisDe() {
  var m = document.querySelector('meta[name="dc-pais"]');
  var v = m && m.getAttribute("content");
  return v && v.trim() ? v.trim().toUpperCase() : null;
}

/* Inserta una fila por carga de página. No usa await, no lanza, no bloquea. */
export function registrarVisita() {
  try {
    var dom = dominioDe(document.referrer || "");
    // Referrer del propio sitio → navegación interna, se cuenta como "directo".
    var propio = !!dom && dom === location.hostname;
    sb.from("visitas")
      .insert({
        path: location.pathname || "/",
        seccion: (location.hash || "").replace(/^#/, "") || null,
        fuente: propio ? "directo" : fuenteDe(dom),
        referrer_dominio: propio ? null : dom,
        dispositivo: dispositivoDe(),
        pais: paisDe(),
      })
      .then(function () {}, function () {});
  } catch (e) { /* nada */ }
}
