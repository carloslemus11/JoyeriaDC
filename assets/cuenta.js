/* Joyería DC — cuentas de cliente y favoritos (Fase 6). */
import { sb } from "./supabase-client.js";

export async function sesionActual() {
  const { data: { session } } = await sb.auth.getSession();
  return session || null;
}

export function onCambioSesion(cb) {
  sb.auth.onAuthStateChange((_evt, session) => cb(session || null));
}

export async function registrarse(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  // Si el proyecto exige confirmación de correo, no habrá sesión todavía.
  return { necesitaConfirmar: !data.session, session: data.session || null };
}

export async function iniciarSesion(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function cerrarSesion() {
  await sb.auth.signOut();
}

/** Devuelve las piezas favoritas del usuario, con su primera foto. */
export async function getFavoritos() {
  const { data, error } = await sb
    .from("favoritos")
    .select("pieza_id, created_at, piezas(id, nombre, activa, pieza_fotos(storage_path, alt, orden))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || [])
    .filter((f) => f.piezas && f.piezas.activa)
    .map((f) => {
      const fotos = (f.piezas.pieza_fotos || []).slice().sort((a, b) => a.orden - b.orden);
      return { id: f.piezas.id, nombre: f.piezas.nombre, foto: fotos[0] || null };
    });
}

export async function getFavoritoIds() {
  const { data, error } = await sb.from("favoritos").select("pieza_id");
  if (error) throw error;
  return new Set((data || []).map((r) => r.pieza_id));
}

export async function agregarFavorito(piezaId) {
  const s = await sesionActual();
  if (!s) throw new Error("Sin sesión");
  const { error } = await sb.from("favoritos").insert({ usuario_id: s.user.id, pieza_id: piezaId });
  if (error && error.code !== "23505") throw error; // 23505 = ya existe
}

export async function quitarFavorito(piezaId) {
  const { error } = await sb.from("favoritos").delete().eq("pieza_id", piezaId);
  if (error) throw error;
}
