/* Joyería DC — panel /admin (Fase 2: login + CRUD de catálogo). */
import { sb } from "../assets/supabase-client.js";

const cfg = window.JOYERIA_CONFIG || {};
const $ = (id) => document.getElementById(id);

const views = { loading: $("loadingView"), login: $("loginView"), panel: $("panelView") };
function show(name) {
  Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, kind = "ok") {
  const t = $("globalMsg");
  t.textContent = msg;
  t.className = "admin-toast is-" + kind;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
}

/* ---------- auth ---------- */
async function isAdmin(userId) {
  const { data, error } = await sb.from("perfiles").select("rol").eq("id", userId).maybeSingle();
  return !error && !!data && data.rol === "admin";
}

async function routeFromSession(session, { fromLogin } = {}) {
  const user = session && session.user;
  if (!user) { show("login"); return; }
  if (await isAdmin(user.id)) {
    $("whoami").textContent = user.email || user.id;
    show("panel");
    initPanel();
  } else {
    // Sesión válida pero sin rol admin (p. ej. una cuenta de cliente).
    // Solo cerramos sesión si el intento vino del formulario de este panel;
    // si solo estaba navegando, no le tumbamos su sesión de cliente.
    if (fromLogin) await sb.auth.signOut();
    show("login");
    loginError("Esta cuenta no tiene acceso al panel de administración.");
  }
}

function loginError(msg) {
  const e = $("loginError");
  if (!msg) { e.hidden = true; return; }
  e.textContent = msg; e.hidden = false;
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError(null);
  const btn = $("loginBtn");
  btn.disabled = true; btn.textContent = "Entrando…";
  const email = $("email").value.trim();
  const password = $("password").value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = "Entrar";
  if (error) { loginError("Correo o contraseña incorrectos."); return; }
  await routeFromSession(data.session, { fromLogin: true });
});

$("logoutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
  $("loginForm").reset();
  loginError(null);
  show("login");
});

sb.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") show("login");
});

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  await routeFromSession(session);
})();

/* ================================================================= */
/*  Panel                                                             */
/* ================================================================= */
let panelReady = false;
function initPanel() {
  if (panelReady) { refreshPiezas(); refreshCategorias(); refreshSugerencias(); return; }
  panelReady = true;

  const tabs = [...document.querySelectorAll(".admin-tab[data-tab]")];
  const panes = ["piezas", "categorias", "sugerencias", "cotizaciones", "visitas", "textos"];
  tabs.forEach((b) => {
    b.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.toggle("is-active", x === b));
      panes.forEach((p) => { $("tab-" + p).hidden = b.dataset.tab !== p; });
      if (b.dataset.tab === "sugerencias") refreshSugerencias();
      if (b.dataset.tab === "cotizaciones") refreshCotizaciones();
      if (b.dataset.tab === "visitas") refreshVisitas();
      if (b.dataset.tab === "textos") refreshTextos();
    });
  });

  $("nuevaPiezaBtn").addEventListener("click", () => openPiezaForm(null));
  $("nuevaCatBtn").addEventListener("click", () => openCatForm(null));
  $("importFotosBtn").addEventListener("click", importarFotosIniciales);
  $("guardarTextosBtn").addEventListener("click", guardarTextos);
  $("modalClose").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });

  refreshCategorias();
  refreshPiezas();
  checkBucketVacio();
}

/* ---------- sugerencias ---------- */
async function refreshSugerencias() {
  const { data, error } = await sb
    .from("sugerencias")
    .select("*")
    .order("created_at", { ascending: false });
  const list = $("sugList");
  list.innerHTML = "";
  if (error) { list.innerHTML = `<p class="admin-empty">No se pudieron cargar: ${esc(error.message)}</p>`; return; }
  if (!data.length) { list.innerHTML = '<p class="admin-empty">Aún no hay sugerencias.</p>'; return; }

  const etiqueta = { pendiente: "Pendiente", aprobada: "Publicada", oculta: "Oculta" };
  data.forEach((s) => {
    const row = document.createElement("div");
    row.className = "admin-row" + (s.estado === "aprobada" ? "" : " is-inactive");
    row.innerHTML = `
      <div class="admin-row-main">
        <strong>${esc(s.nombre || "Anónimo")} <span class="admin-badge">${etiqueta[s.estado] || s.estado}</span></strong>
        <span class="admin-row-sub">${esc(s.texto)}</span>
        <span class="admin-mono">${new Date(s.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}</span>
      </div>
      <div class="admin-row-actions"></div>`;
    const acts = row.querySelector(".admin-row-actions");
    if (s.estado !== "aprobada") acts.appendChild(btn("Aprobar", () => moderarSugerencia(s, "aprobada")));
    if (s.estado !== "oculta") acts.appendChild(btn("Ocultar", () => moderarSugerencia(s, "oculta")));
    acts.appendChild(btn("Borrar", () => borrarSugerencia(s), "danger"));
    list.appendChild(row);
  });
}

async function moderarSugerencia(s, estado) {
  const { error } = await sb.from("sugerencias").update({ estado }).eq("id", s.id);
  if (error) { toast("No se pudo: " + error.message, "err"); return; }
  toast(estado === "aprobada" ? "Sugerencia publicada." : "Sugerencia oculta.");
  refreshSugerencias();
}
async function borrarSugerencia(s) {
  if (!(await confirmar("Borrar esta sugerencia. Es permanente.", { danger: true, ok: "Borrar" }))) return;
  const { error } = await sb.from("sugerencias").delete().eq("id", s.id);
  if (error) { toast("No se pudo borrar: " + error.message, "err"); return; }
  toast("Sugerencia borrada."); refreshSugerencias();
}

/* ---------- cotizaciones (Fase 4) ---------- */
async function refreshCotizaciones() {
  const { data, error } = await sb
    .from("cotizaciones")
    .select("etiqueta, origen, created_at, piezas(nombre)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) { toast("No se pudieron cargar las cotizaciones: " + error.message, "err"); return; }
  const rows = data || [];
  const hace30 = Date.now() - 30 * 864e5;
  $("cotizTotal").textContent = rows.length >= 500 ? "500+" : String(rows.length);
  $("cotiz30").textContent = String(rows.filter((r) => new Date(r.created_at).getTime() >= hace30).length);

  const nombreDe = (r) => (r.piezas && r.piezas.nombre) || r.etiqueta || "(sin etiqueta)";
  const conteo = {};
  rows.forEach((r) => { const k = nombreDe(r); conteo[k] = (conteo[k] || 0) + 1; });
  const ranking = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const rk = $("cotizRanking");
  rk.innerHTML = ranking.length
    ? ranking.map(([k, n]) => `<div class="admin-row"><div class="admin-row-main"><strong>${esc(k)}</strong></div><div class="admin-mono">${n} clic${n === 1 ? "" : "s"}</div></div>`).join("")
    : '<p class="admin-empty">Aún no hay clics de "Cotizar" registrados.</p>';

  const lg = $("cotizLog");
  lg.innerHTML = rows.length
    ? rows.slice(0, 100).map((r) => `<div class="admin-row"><div class="admin-row-main"><strong>${esc(nombreDe(r))}</strong><span class="admin-mono">${esc(r.origen || "")} · ${new Date(r.created_at).toLocaleString("es-CO")}</span></div></div>`).join("")
    : '<p class="admin-empty">Sin registros.</p>';
}

/* ---------- visitas ---------- */
const VISITAS_ETIQUETAS = {
  instagram: "Instagram", google: "Google", facebook: "Facebook",
  whatsapp: "WhatsApp", directo: "Directo", otro: "Otro",
  movil: "Móvil", tablet: "Tablet", escritorio: "Escritorio", desconocido: "Desconocido",
};

async function refreshVisitas() {
  const bloques = ["visitasPorDia", "visitasPorFuente", "visitasPorDispositivo", "visitasPorPais"];
  const { data, error } = await sb.rpc("resumen_visitas");
  if (error || !data) {
    $("visitasHoy").textContent = "—";
    $("visitas30").textContent = "—";
    const msg = `<p class="admin-empty">No se pudieron cargar las visitas${error ? ": " + esc(error.message) : ""}.</p>`;
    bloques.forEach((id) => { $(id).innerHTML = msg; });
    return;
  }

  const r = data;
  $("visitasHoy").textContent = String(r.total_hoy || 0);
  $("visitas30").textContent = String(r.total_30d || 0);

  const vacio = '<p class="admin-empty">Aún no hay visitas registradas.</p>';
  const sinVisitas = !r.total_30d;
  const lista = (arr, campo) => (arr && arr.length)
    ? arr.map((x) => `<div class="admin-row"><div class="admin-row-main"><strong>${esc(VISITAS_ETIQUETAS[x[campo]] || x[campo])}</strong></div><div class="admin-mono">${x.n} visita${x.n === 1 ? "" : "s"}</div></div>`).join("")
    : vacio;

  $("visitasPorDia").innerHTML = sinVisitas ? vacio : (r.por_dia || [])
    .map((x) => {
      const f = new Date(x.fecha + "T00:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
      return `<div class="admin-row"><div class="admin-row-main"><strong>${esc(f)}</strong></div><div class="admin-mono">${x.n}</div></div>`;
    }).join("");
  $("visitasPorFuente").innerHTML = sinVisitas ? vacio : lista(r.por_fuente, "fuente");
  $("visitasPorDispositivo").innerHTML = sinVisitas ? vacio : lista(r.por_dispositivo, "dispositivo");
  $("visitasPorPais").innerHTML = sinVisitas ? vacio : lista(r.por_pais, "pais");
}

/* ---------- textos del sitio (Fase 5) ---------- */
const TEXTOS_GRUPOS = [
  ["Hero", [
    ["hero_eyebrow", "Eyebrow", "input"],
    ["hero_titulo", "Título (usa *palabra* para cursiva, salto de línea para <br>)", "textarea"],
    ["hero_lede", "Bajada", "textarea"],
  ]],
  ["Stats", [
    ["stat1_num", "Stat 1 — número", "input"], ["stat1_label", "Stat 1 — texto", "input"],
    ["stat2_num", "Stat 2 — número", "input"], ["stat2_label", "Stat 2 — texto", "input"],
    ["stat3_num", "Stat 3 — número", "input"], ["stat3_label", "Stat 3 — texto", "input"],
  ]],
  ["Atelier", [
    ["atelier_titulo", "Título de la sección", "input"],
    ["atelier1_titulo", "Bloque 1 — título", "input"], ["atelier1_texto", "Bloque 1 — texto", "textarea"],
    ["atelier2_titulo", "Bloque 2 — título", "input"], ["atelier2_texto", "Bloque 2 — texto", "textarea"],
    ["atelier3_titulo", "Bloque 3 — título", "input"], ["atelier3_texto", "Bloque 3 — texto", "textarea"],
  ]],
  ["Ubicación", [
    ["ubic_titulo", "Título", "input"],
    ["ubic_direccion", "Dirección (línea 1)", "input"],
    ["ubic_ciudad", "Ciudad / país (línea 2)", "input"],
    ["ubic_horario", "Horario de atención", "input"],
  ]],
  ["Franja de confianza", [
    ["trust1", "Mensaje 1", "input"], ["trust2", "Mensaje 2", "input"],
    ["trust3", "Mensaje 3", "input"], ["trust4", "Mensaje 4", "input"],
    ["trust5", "Mensaje 5", "input"],
  ]],
  ["FAQ", [
    ["faq_horario", "Respuesta — horario", "textarea"],
    ["faq_pagos", "Respuesta — formas de pago", "textarea"],
    ["faq_envios", "Respuesta — envíos", "textarea"],
  ]],
  ["Garantía", [
    ["garantia_titulo", "Título de la sección", "input"],
    ["garantia_p1", "Punto 1 — autenticidad", "textarea"],
    ["garantia_p2", "Punto 2 — defectos de fabricación", "textarea"],
    ["garantia_p3", "Punto 3 — exclusiones", "textarea"],
    ["garantia_p4", "Punto 4 — mantenimiento", "textarea"],
  ]],
  ["Footer", [
    ["footer_desc", "Descripción de marca", "textarea"],
  ]],
];
let textosCache = {};

async function refreshTextos() {
  const { data, error } = await sb.from("contenido_sitio").select("clave, valor");
  if (error) { toast("No se pudieron cargar los textos: " + error.message, "err"); return; }
  textosCache = {};
  (data || []).forEach((r) => { textosCache[r.clave] = r.valor || ""; });
  const form = $("textosForm");
  form.innerHTML = TEXTOS_GRUPOS.map(([grupo, campos]) => `
    <fieldset class="admin-textos-grupo">
      <legend>${grupo}</legend>
      ${campos.map(([clave, label, tipo]) => {
        const v = esc(textosCache[clave] || "");
        return `<label class="admin-field"><span>${label}</span>${
          tipo === "textarea"
            ? `<textarea name="${clave}" rows="3">${v}</textarea>`
            : `<input type="text" name="${clave}" value="${v}">`
        }</label>`;
      }).join("")}
    </fieldset>`).join("");
}

async function guardarTextos() {
  const form = $("textosForm");
  const fd = new FormData(form);
  const cambios = [];
  for (const [clave, valor] of fd.entries()) {
    if ((textosCache[clave] || "") !== valor) {
      cambios.push({ clave, valor, actualizado_at: new Date().toISOString() });
    }
  }
  if (!cambios.length) { toast("No hay cambios que guardar."); return; }
  const btn = $("guardarTextosBtn");
  btn.disabled = true; btn.textContent = "Guardando…";
  const { error } = await sb.from("contenido_sitio").upsert(cambios, { onConflict: "clave" });
  btn.disabled = false; btn.textContent = "Guardar cambios";
  if (error) { toast("No se pudo guardar: " + error.message, "err"); return; }
  cambios.forEach((c) => { textosCache[c.clave] = c.valor; });
  toast(`${cambios.length} texto(s) guardado(s). Recarga el sitio para verlos.`);
}

let categoriasCache = [];

async function refreshCategorias() {
  const { data, error } = await sb.from("categorias").select("*").order("orden");
  if (error) { toast("No se pudieron cargar las categorías: " + error.message, "err"); return; }
  categoriasCache = data || [];
  const list = $("catList");
  list.innerHTML = "";
  if (!categoriasCache.length) {
    list.innerHTML = '<p class="admin-empty">Aún no hay categorías. Crea la primera.</p>';
    return;
  }
  categoriasCache.forEach((c) => {
    const row = document.createElement("div");
    row.className = "admin-row" + (c.activa ? "" : " is-inactive");
    row.innerHTML = `
      <div class="admin-row-main">
        <strong>${esc(c.nombre)}</strong>
        <span class="admin-mono">/${esc(c.slug)} · orden ${c.orden}${c.activa ? "" : " · inactiva"}</span>
        ${c.descripcion ? `<span class="admin-row-sub">${esc(c.descripcion)}</span>` : ""}
      </div>
      <div class="admin-row-actions"></div>`;
    const acts = row.querySelector(".admin-row-actions");
    acts.appendChild(btn("Editar", () => openCatForm(c)));
    acts.appendChild(btn(c.activa ? "Desactivar" : "Activar", () => toggleActiva("categorias", c)));
    acts.appendChild(btn("Borrar", () => borrarCategoria(c), "danger"));
    list.appendChild(row);
  });
}

async function refreshPiezas() {
  const { data, error } = await sb
    .from("piezas")
    .select("*, categorias(nombre), pieza_fotos(id, storage_path, alt, orden)")
    .order("orden");
  if (error) { toast("No se pudieron cargar las piezas: " + error.message, "err"); return; }
  const list = $("piezasList");
  list.innerHTML = "";
  if (!data || !data.length) {
    list.innerHTML = '<p class="admin-empty">Aún no hay piezas. Crea la primera.</p>';
    return;
  }
  data.forEach((p) => {
    const foto = (p.pieza_fotos || []).slice().sort((a, b) => a.orden - b.orden)[0];
    const row = document.createElement("div");
    row.className = "admin-row" + (p.activa ? "" : " is-inactive");
    row.innerHTML = `
      <div class="admin-thumb">${foto ? `<img src="${fotoSrc(foto.storage_path)}" alt="">` : '<span>—</span>'}</div>
      <div class="admin-row-main">
        <strong>${esc(p.nombre)}</strong>
        <span class="admin-mono">${p.categorias ? esc(p.categorias.nombre) : "sin categoría"} · orden ${p.orden}${p.disponibilidad && p.disponibilidad !== "disponible" ? " · " + (p.disponibilidad === "encargo" ? "por encargo" : "agotada") : ""}${p.activa ? "" : " · inactiva"}</span>
        ${p.descripcion ? `<span class="admin-row-sub">${esc(p.descripcion)}</span>` : ""}
      </div>
      <div class="admin-row-actions"></div>`;
    const acts = row.querySelector(".admin-row-actions");
    acts.appendChild(btn("Editar", () => openPiezaForm(p)));
    acts.appendChild(btn("Foto", () => openFotoForm(p, foto)));
    acts.appendChild(btn(p.activa ? "Desactivar" : "Activar", () => toggleActiva("piezas", p)));
    acts.appendChild(btn("Borrar", () => borrarPieza(p), "danger"));
    list.appendChild(row);
  });
}

/* ---------- formularios (modal) ---------- */
function openModal(title, fieldsHtml, onSubmit) {
  $("modalTitle").textContent = title;
  const form = $("modalForm");
  form.innerHTML = fieldsHtml + `
    <div class="admin-form-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-cancel>Cancelar</button>
      <button type="submit" class="btn btn-fill btn-sm">Guardar</button>
    </div>`;
  form.querySelector("[data-cancel]").addEventListener("click", closeModal);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const sb2 = form.querySelector('button[type="submit"]');
    sb2.disabled = true; sb2.textContent = "Guardando…";
    try {
      await onSubmit(new FormData(form));
      closeModal();
    } catch (err) {
      toast("No se pudo guardar: " + (err.message || err), "err");
      sb2.disabled = false; sb2.textContent = "Guardar";
    }
  };
  $("modal").hidden = false;
}
let modalCloseCb = null;
function closeModal() {
  $("modal").hidden = true;
  $("modalForm").innerHTML = "";
  const cb = modalCloseCb; modalCloseCb = null;
  if (cb) cb();
}

/* Confirmación in-app (window.confirm no es fiable en todos los navegadores). */
function confirmar(mensaje, { danger = false, ok = "Sí, continuar" } = {}) {
  return new Promise((resolve) => {
    $("modalTitle").textContent = "Confirmar";
    const form = $("modalForm");
    form.onsubmit = null;
    form.innerHTML = `
      <p class="admin-note">${esc(mensaje)}</p>
      <div class="admin-form-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-no>Cancelar</button>
        <button type="button" class="btn ${danger ? "btn-ghost is-danger" : "btn-fill"} btn-sm" data-yes>${esc(ok)}</button>
      </div>`;
    let settled = false;
    const done = (v) => { if (settled) return; settled = true; modalCloseCb = null; closeModal(); resolve(v); };
    modalCloseCb = () => { if (!settled) { settled = true; resolve(false); } };
    form.querySelector("[data-no]").addEventListener("click", () => done(false));
    form.querySelector("[data-yes]").addEventListener("click", () => done(true));
    $("modal").hidden = false;
  });
}

function field(label, name, value, opts = {}) {
  const v = value == null ? "" : String(value);
  if (opts.type === "textarea")
    return `<label class="admin-field"><span>${label}</span><textarea name="${name}" rows="3">${esc(v)}</textarea></label>`;
  if (opts.type === "checkbox")
    return `<label class="admin-check"><input type="checkbox" name="${name}" ${value ? "checked" : ""}><span>${label}</span></label>`;
  if (opts.type === "select")
    return `<label class="admin-field"><span>${label}</span><select name="${name}">${opts.options.map(o =>
      `<option value="${esc(o.value)}" ${String(o.value) === v ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></label>`;
  return `<label class="admin-field"><span>${label}</span><input type="${opts.type || "text"}" name="${name}" value="${esc(v)}" ${opts.required ? "required" : ""}></label>`;
}

function openCatForm(c) {
  const isNew = !c;
  openModal(isNew ? "Nueva categoría" : "Editar categoría",
    field("Nombre", "nombre", c?.nombre, { required: true }) +
    field("Slug (URL, sin espacios)", "slug", c?.slug, { required: true }) +
    field("Descripción", "descripcion", c?.descripcion, { type: "textarea" }) +
    field("Texto del botón", "cta_label", c?.cta_label) +
    field("Mensaje de WhatsApp del botón", "cta_msg", c?.cta_msg, { type: "textarea" }) +
    field("Orden", "orden", c?.orden ?? nextOrden(categoriasCache), { type: "number" }) +
    field("Activa", "activa", c ? c.activa : true, { type: "checkbox" }),
    async (fd) => {
      const payload = {
        nombre: fd.get("nombre").trim(),
        slug: fd.get("slug").trim().toLowerCase().replace(/\s+/g, "-"),
        descripcion: emptyNull(fd.get("descripcion")),
        cta_label: emptyNull(fd.get("cta_label")),
        cta_msg: emptyNull(fd.get("cta_msg")),
        orden: parseInt(fd.get("orden"), 10) || 0,
        activa: fd.get("activa") === "on",
      };
      const q = isNew
        ? sb.from("categorias").insert(payload)
        : sb.from("categorias").update(payload).eq("id", c.id);
      const { error } = await q;
      if (error) throw error;
      toast(isNew ? "Categoría creada." : "Categoría actualizada.");
      refreshCategorias();
    });
}

function openPiezaForm(p) {
  const isNew = !p;
  openModal(isNew ? "Nueva pieza" : "Editar pieza",
    field("Nombre", "nombre", p?.nombre, { required: true }) +
    field("Categoría", "categoria_id", p?.categoria_id, {
      type: "select",
      options: [{ value: "", label: "— sin categoría —" }].concat(
        categoriasCache.map((c) => ({ value: c.id, label: c.nombre }))),
    }) +
    field("Descripción", "descripcion", p?.descripcion, { type: "textarea" }) +
    field("Disponibilidad", "disponibilidad", p?.disponibilidad ?? "disponible", {
      type: "select",
      options: [
        { value: "disponible", label: "Disponible en tienda" },
        { value: "encargo", label: "Por encargo" },
        { value: "agotada", label: "Agotada" },
      ],
    }) +
    field("Orden", "orden", p?.orden ?? 100, { type: "number" }) +
    field("Activa", "activa", p ? p.activa : true, { type: "checkbox" }),
    async (fd) => {
      const payload = {
        nombre: fd.get("nombre").trim(),
        categoria_id: fd.get("categoria_id") || null,
        descripcion: emptyNull(fd.get("descripcion")),
        disponibilidad: fd.get("disponibilidad") || "disponible",
        orden: parseInt(fd.get("orden"), 10) || 0,
        activa: fd.get("activa") === "on",
      };
      const q = isNew
        ? sb.from("piezas").insert(payload)
        : sb.from("piezas").update(payload).eq("id", p.id);
      const { error } = await q;
      if (error) throw error;
      toast(isNew ? "Pieza creada." : "Pieza actualizada.");
      refreshPiezas();
    });
}

function openFotoForm(p, foto) {
  openModal("Foto de « " + p.nombre + " »",
    (foto ? `<div class="admin-thumb admin-thumb-lg"><img src="${fotoSrc(foto.storage_path)}" alt=""></div>` : "") +
    `<label class="admin-field"><span>Nueva foto (JPG, PNG o WebP · máx 5 MB)</span>
       <input type="file" name="archivo" accept="image/jpeg,image/png,image/webp"></label>` +
    field("Texto alternativo", "alt", foto?.alt || p.nombre),
    async (fd) => {
      const file = fd.get("archivo");
      const alt = emptyNull(fd.get("alt"));
      if (file && file.size) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw new Error("Formato no soportado.");
        if (file.size > 5 * 1024 * 1024) throw new Error("La foto supera los 5 MB.");
        const ext = file.name.split(".").pop().toLowerCase();
        const path = `catalogo/${p.id}-${Date.now()}.${ext}`;
        const up = await sb.storage.from("piezas").upload(path, file, { upsert: true, contentType: file.type });
        if (up.error) throw up.error;
        if (foto) {
          const { error } = await sb.from("pieza_fotos").update({ storage_path: path, alt }).eq("id", foto.id);
          if (error) throw error;
        } else {
          const { error } = await sb.from("pieza_fotos").insert({ pieza_id: p.id, storage_path: path, alt, orden: 0 });
          if (error) throw error;
        }
        toast("Foto actualizada.");
      } else if (foto && alt !== foto.alt) {
        const { error } = await sb.from("pieza_fotos").update({ alt }).eq("id", foto.id);
        if (error) throw error;
        toast("Texto alternativo actualizado.");
      }
      refreshPiezas();
      checkBucketVacio();
    });
}

/* ---------- acciones sueltas ---------- */
async function toggleActiva(tabla, row) {
  const { error } = await sb.from(tabla).update({ activa: !row.activa }).eq("id", row.id);
  if (error) { toast("No se pudo cambiar: " + error.message, "err"); return; }
  tabla === "piezas" ? refreshPiezas() : refreshCategorias();
}
async function borrarCategoria(c) {
  if (!(await confirmar(`Borrar la categoría « ${c.nombre} ». Es permanente. Las piezas quedan sin categoría, no se borran.`, { danger: true, ok: "Borrar" }))) return;
  const { error } = await sb.from("categorias").delete().eq("id", c.id);
  if (error) { toast("No se pudo borrar: " + error.message, "err"); return; }
  toast("Categoría borrada."); refreshCategorias(); refreshPiezas();
}
async function borrarPieza(p) {
  if (!(await confirmar(`Borrar la pieza « ${p.nombre} ». Es permanente (no hay papelera). Considera desactivarla en su lugar.`, { danger: true, ok: "Borrar" }))) return;
  const { error } = await sb.from("piezas").delete().eq("id", p.id);
  if (error) { toast("No se pudo borrar: " + error.message, "err"); return; }
  toast("Pieza borrada."); refreshPiezas();
}

/* ---------- importar fotos iniciales a Storage ---------- */
async function checkBucketVacio() {
  const { data, error } = await sb.storage.from("piezas").list("catalogo", { limit: 1 });
  const { count } = await sb.from("pieza_fotos")
    .select("id", { count: "exact", head: true })
    .like("storage_path", "assets/piezas/%");
  const pendientes = count || 0;
  $("importFotosBtn").hidden = !(pendientes > 0 && (error || !data || data.length === 0));
}

async function importarFotosIniciales() {
  if (!(await confirmar("Subir las fotos del catálogo actual a Storage. Se hace una sola vez.", { ok: "Importar" }))) return;
  const btn = $("importFotosBtn");
  btn.disabled = true; btn.textContent = "Importando…";
  const { data: rows, error } = await sb.from("pieza_fotos").select("id, storage_path").like("storage_path", "assets/piezas/%");
  if (error) { toast("Error: " + error.message, "err"); btn.disabled = false; btn.textContent = "Importar fotos iniciales"; return; }
  let ok = 0, fail = 0;
  for (const r of rows) {
    try {
      const base = r.storage_path.split("/").pop();
      const res = await fetch("../assets/piezas/" + base);
      if (!res.ok) throw new Error("no se encontró " + base);
      const blob = await res.blob();
      const dest = "catalogo/" + base;
      const up = await sb.storage.from("piezas").upload(dest, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
      if (up.error) throw up.error;
      const { error: uerr } = await sb.from("pieza_fotos").update({ storage_path: dest }).eq("id", r.id);
      if (uerr) throw uerr;
      ok++;
    } catch (e) { fail++; console.warn("import", r.storage_path, e); }
  }
  btn.disabled = false; btn.textContent = "Importar fotos iniciales";
  toast(`Importadas ${ok} foto(s)${fail ? `, ${fail} con error` : ""}.`, fail ? "err" : "ok");
  refreshPiezas(); checkBucketVacio();
}

/* ---------- helpers ---------- */
function btn(label, onClick, kind) {
  const b = document.createElement("button");
  b.className = "btn btn-ghost btn-sm" + (kind === "danger" ? " is-danger" : "");
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function emptyNull(v) { v = (v || "").trim(); return v === "" ? null : v; }
function nextOrden(arr) { return (arr.reduce((m, x) => Math.max(m, x.orden || 0), 0) || 0) + 1; }
function fotoSrc(storagePath) {
  if (!storagePath) return "";
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  if (/^\/|^assets\//.test(storagePath)) return "../" + storagePath.replace(/^\//, "");
  return `${cfg.SUPABASE_URL}/storage/v1/object/public/piezas/${storagePath}`;
}
