// Mantiene activo el proyecto de Supabase.
// El plan Free pausa el proyecto si en 7 días casi no hay consultas a la base (ver CLAUDE.md,
// "Incidentes — proyecto pausado"). Esta función programada hace una consulta real (lectura
// del catálogo, la misma que usa el sitio) cada 2 días. La clave es la publishable: pública por diseño.
const SUPABASE_URL = "https://ardfyksmwwwignoejaft.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_mxaighjTzkTes_A_WSL3Mg_DorwIQRE";

export default async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/piezas?select=id&activa=eq.true&limit=1`, {
      headers: { apikey: PUBLISHABLE_KEY },
    });
    console.log(`[keepalive] Supabase respondió ${res.status}`);
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      status: res.ok ? 200 : 502,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[keepalive] No se pudo contactar a Supabase:", e && e.message);
    return new Response(JSON.stringify({ ok: false }), { status: 502 });
  }
};

export const config = { schedule: "0 15 */2 * *" };
