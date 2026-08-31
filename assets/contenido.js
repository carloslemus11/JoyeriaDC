/* Joyería DC — textos editables del sitio (Fase 5). */
import { sb } from "./supabase-client.js";

/** { clave: valor } de todos los textos del sitio. */
export async function getContenido() {
  const { data, error } = await sb.from("contenido_sitio").select("clave, valor");
  if (error) throw error;
  const out = {};
  (data || []).forEach((r) => { out[r.clave] = r.valor || ""; });
  return out;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/** Convierte *texto* -> <em>texto</em> y saltos de línea -> <br>, escapando todo lo demás. */
export function miniFormato(valor) {
  return escapeHtml(valor)
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

/** Aplica los textos a los elementos [data-cs] del documento. */
export function aplicarContenido(mapa) {
  document.querySelectorAll("[data-cs]").forEach((elm) => {
    const clave = elm.getAttribute("data-cs");
    if (!(clave in mapa)) return;
    if (elm.hasAttribute("data-cs-html")) elm.innerHTML = miniFormato(mapa[clave]);
    else elm.textContent = mapa[clave];
  });
}
