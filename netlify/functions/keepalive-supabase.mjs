// Mantiene activo el proyecto de Supabase.
//
// El plan Free pausa el proyecto si en 7 días no recibe "suficiente actividad de usuarios en la
// base de datos" (docs: "Project Pausing"; "típicamente unas pocas consultas al día"). Con una
// sola lectura cada 2 días NO bastó: el proyecto se pausó el 2026-10-28 aunque la función corrió
// el 27. Ahora corre cada 3 horas (8 veces al día) y en cada pasada hace 3 lecturas del
// catálogo/textos (las mismas que usa el sitio) y 1 escritura en la tabla `keepalive`
// (ver supabase/schema.sql y policies.sql). La escritura es "mejor esfuerzo": si fallara, las
// lecturas igual cuentan. La clave es la publishable: pública por diseño.
const SUPABASE_URL = "https://ardfyksmwwwignoejaft.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_mxaighjTzkTes_A_WSL3Mg_DorwIQRE";

const LECTURAS = [
  "piezas?select=id&activa=eq.true&limit=1",
  "categorias?select=id&activa=eq.true&limit=1",
  "contenido_sitio?select=clave&limit=1",
];

async function llamar(ruta, init) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
      ...init,
      headers: { apikey: PUBLISHABLE_KEY, ...(init && init.headers) },
      signal: AbortSignal.timeout(20000),
    });
    return res.status;
  } catch (e) {
    return "ERR";
  }
}

export default async () => {
  const resultados = [];
  let lecturasOk = true;
  for (const ruta of LECTURAS) {
    const estado = await llamar(ruta);
    resultados.push(`${ruta.split("?")[0]}:${estado}`);
    if (estado !== 200) lecturasOk = false;
  }
  const escritura = await llamar("keepalive?on_conflict=id", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, ultimo: new Date().toISOString() }),
  });
  resultados.push(`keepalive(escritura):${escritura}`);

  console.log(`[keepalive] ${resultados.join(" · ")}`);
  return new Response(JSON.stringify({ ok: lecturasOk, resultados }), {
    status: lecturasOk ? 200 : 502,
    headers: { "content-type": "application/json" },
  });
};

export const config = { schedule: "0 */3 * * *" };
