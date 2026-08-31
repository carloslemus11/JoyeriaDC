// Joyería DC — inyecta el país aproximado del visitante como <meta name="dc-pais">
// en el HTML de la portada, usando el geo que ya provee Netlify. No usa cookies
// ni expone la IP; el sitio (assets/interacciones.js) lee ese meta al registrar
// la visita. Si Netlify no da país, no inyecta nada y el registro queda sin país.

export default async (request, context) => {
  const res = await context.next();

  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("text/html")) return res;

  const code = context.geo && context.geo.country && context.geo.country.code;
  if (!code) return res;

  const html = await res.text();
  if (!html.includes("</head>")) return new Response(html, res);

  const meta = `<meta name="dc-pais" content="${String(code).slice(0, 2).toUpperCase()}">`;
  const out = html.replace("</head>", `  ${meta}\n</head>`);

  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(out, { status: res.status, headers });
};

export const config = { path: ["/", "/index.html"] };
