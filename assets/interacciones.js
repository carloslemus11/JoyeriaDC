/* Joyería DC — calificaciones y sugerencias (sitio público) contra Supabase. */
import { sb } from "./supabase-client.js";

/** { promedio: number|null, total: number } */
export async function getResumenCalificaciones() {
  const { data, error } = await sb.rpc("resumen_calificaciones");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    promedio: row && row.promedio != null ? Number(row.promedio) : null,
    total: row && row.total != null ? Number(row.total) : 0,
  };
}

export async function enviarCalificacion(estrellas) {
  const { error } = await sb.from("calificaciones").insert({ estrellas });
  if (error) throw error;
}

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
