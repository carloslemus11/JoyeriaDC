/* Joyería DC — script principal del sitio público. */
import { healthcheck } from "./supabase-client.js";
import { getCategorias, getPiezas, fotoUrl } from "./catalogo.js";
import {
  getResumenCalificaciones, enviarCalificacion,
  getSugerenciasAprobadas, enviarSugerencia, registrarCotizacion,
} from "./interacciones.js";
import { getContenido, aplicarContenido } from "./contenido.js";
import {
  sesionActual, onCambioSesion, registrarse, iniciarSesion, cerrarSesion,
  getFavoritos, getFavoritoIds, agregarFavorito, quitarFavorito,
} from "./cuenta.js";

healthcheck();

const WA_NUMBER = (window.JOYERIA_CONFIG && window.JOYERIA_CONFIG.WA_NUMBER) || "12405933943";
function waHref(msg) {
  return "https://wa.me/" + WA_NUMBER + "?text=" +
    encodeURIComponent(msg || "Hola, quiero más información sobre Joyería DC.");
}

/* Convierte los .wa-link de un subárbol en enlaces de WhatsApp. Reejecutable. */
function wireWaLinks(root) {
  (root || document).querySelectorAll(".wa-link").forEach(function (el) {
    el.setAttribute("href", waHref(el.getAttribute("data-wa-msg")));
  });
}

/* Scroll-reveal. Reejecutable para contenido inyectado luego. */
var revealObserver = null;
function observeReveal(els) {
  if (!("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .15 });
  }
  els.forEach(function (el) { revealObserver.observe(el); });
}

/* ------------------------------------------------------------------ */
/*  Catálogo desde Supabase                                            */
/* ------------------------------------------------------------------ */

var CAT_ICONS = {
  anillos: '<svg class="cat-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="24" r="12"/><path d="M13 14l7-8 7 8"/></svg>',
  cadenas: '<svg class="cat-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="14" cy="14" r="5"/><circle cx="26" cy="20" r="5"/><circle cx="14" cy="26" r="5"/></svg>',
  pulseras: '<svg class="cat-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 20c6-8 22-8 28 0"/><path d="M6 20c6 8 22 8 28 0"/><circle cx="20" cy="20" r="2.4" fill="currentColor" stroke="none"/></svg>',
  "dijes-accesorios": '<svg class="cat-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 6v6"/><circle cx="20" cy="22" r="10"/></svg>'
};
var CAT_ICON_FALLBACK = '<svg class="cat-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 5l9 9-9 21-9-21z"/><path d="M11 14h18"/></svg>';

function el(tag, attrs, html) {
  var node = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
  if (html != null) node.innerHTML = html;
  return node;
}

function renderCategorias(grid, categorias) {
  grid.innerHTML = "";
  categorias.forEach(function (c) {
    var card = el("article", { class: "cat-card" });
    card.innerHTML = CAT_ICONS[c.slug] || CAT_ICON_FALLBACK;
    card.appendChild(el("h3", null, ""));
    card.lastChild.textContent = c.nombre;
    if (c.descripcion) {
      var p = el("p"); p.textContent = c.descripcion; card.appendChild(p);
    }
    var msg = c.cta_msg || ("Hola, quiero cotizar " + c.nombre.toLowerCase() + " en oro 18K.");
    var label = c.cta_label || ("Cotizar " + c.nombre.toLowerCase() + " →");
    var link = el("a", {
      class: "cat-link wa-link", href: "#", "data-wa-msg": msg,
      "data-cotiza": "Categoría: " + c.nombre, "data-cotiza-origen": "categoria",
      target: "_blank", rel: "noopener"
    });
    link.textContent = label;
    card.appendChild(link);
    grid.appendChild(card);
  });
  grid.removeAttribute("data-estado");
  wireWaLinks(grid);
}

function renderPiezas(grid, piezas) {
  grid.innerHTML = "";
  piezas.forEach(function (pieza) {
    var cell = el("div", { class: "gallery-item", "data-pieza-id": pieza.id });
    if (pieza.foto) {
      var img = el("img", {
        src: fotoUrl(pieza.foto.storage_path),
        alt: pieza.foto.alt || pieza.nombre,
        loading: "lazy"
      });
      img.addEventListener("error", function handler() {
        img.removeEventListener("error", handler);
        cell.classList.add("no-photo");
        img.remove();
      });
      cell.appendChild(img);
    } else {
      cell.classList.add("no-photo");
    }

    var link = el("a", {
      class: "gallery-link wa-link", href: "#",
      "aria-label": "Cotizar " + pieza.nombre + " por WhatsApp",
      "data-wa-msg": "Hola, quiero comprar/cotizar: " + pieza.nombre + ".",
      "data-cotiza": pieza.nombre, "data-cotiza-origen": "galeria",
      "data-pieza-id": pieza.id,
      target: "_blank", rel: "noopener"
    });
    cell.appendChild(link);

    var heart = el("button", {
      class: "fav-heart", type: "button",
      "aria-label": "Guardar " + pieza.nombre + " en favoritos",
      "data-pieza-id": pieza.id
    });
    heart.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9C1 8.5 2.5 5 6 5c2 0 3.4 1.2 4 2.3C10.6 6.2 12 5 14 5c3.5 0 5 3.5 3.5 7-2.5 4.5-9.5 9-9.5 9z"/></svg>';
    cell.appendChild(heart);

    var tag = el("span", { class: "gallery-tag" });
    tag.textContent = pieza.nombre;
    cell.appendChild(tag);

    grid.appendChild(cell);
  });
  grid.removeAttribute("data-estado");
  wireWaLinks(grid);
  if (window.__dcMarcarFavoritos) window.__dcMarcarFavoritos();
}

function renderCatalogoError(catGrid, galleryGrid) {
  [catGrid, galleryGrid].forEach(function (g) { if (g) g.innerHTML = ""; });
  if (!galleryGrid) return;
  galleryGrid.setAttribute("data-estado", "error");
  var box = el("div", { class: "catalogo-error" });
  box.appendChild(el("p", null, "No pudimos cargar el catálogo en este momento."));
  var link = el("a", {
    class: "btn btn-fill wa-link", href: "#",
    "data-wa-msg": "Hola, quiero ver las joyas de Joyería DC.",
    target: "_blank", rel: "noopener"
  });
  link.textContent = "Escríbenos por WhatsApp";
  box.appendChild(link);
  galleryGrid.appendChild(box);
  wireWaLinks(galleryGrid);
}

async function cargarCatalogo() {
  var catGrid = document.getElementById("catGrid");
  var galleryGrid = document.getElementById("galleryGrid");
  if (!catGrid && !galleryGrid) return;
  try {
    var [categorias, piezas] = await Promise.all([getCategorias(), getPiezas()]);
    if (catGrid) renderCategorias(catGrid, categorias);
    if (galleryGrid) renderPiezas(galleryGrid, piezas);
    observeReveal([].slice.call(document.querySelectorAll("#coleccion .reveal:not(.is-visible)")));
  } catch (e) {
    console.warn("[Joyería DC] No se pudo cargar el catálogo:", e && e.message);
    renderCatalogoError(catGrid, galleryGrid);
  }
}

/* ------------------------------------------------------------------ */
/*  Resto de la interactividad (igual que antes)                       */
/* ------------------------------------------------------------------ */

function initSitio() {
  wireWaLinks(document);

  // Fase 4: registrar cada clic de "Cotizar" antes de abrir WhatsApp (best effort).
  document.addEventListener("click", function (e) {
    var link = e.target && e.target.closest ? e.target.closest(".wa-link") : null;
    if (!link) return;
    var etiqueta = link.getAttribute("data-cotiza")
      || (link.getAttribute("data-wa-msg") || "").slice(0, 120)
      || "Cotizar";
    registrarCotizacion({
      piezaId: link.getAttribute("data-pieza-id") || null,
      etiqueta: etiqueta,
      origen: link.getAttribute("data-cotiza-origen") || "otro",
    });
  }, true);

  var comoLlegar = document.getElementById("comoLlegar");
  if (comoLlegar) {
    var lat = comoLlegar.getAttribute("data-lat");
    var lng = comoLlegar.getAttribute("data-lng");
    var place = encodeURIComponent(comoLlegar.getAttribute("data-place") || "");
    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) comoLlegar.setAttribute("href", "https://maps.apple.com/?ll=" + lat + "," + lng + "&q=" + place);
  }

  var nav = document.getElementById("siteNav");
  window.addEventListener("scroll", function () {
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });

  var toggle = document.getElementById("navToggle");
  var linksEl = document.getElementById("navLinks");
  toggle.addEventListener("click", function () {
    var open = linksEl.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  linksEl.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      linksEl.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  observeReveal([].slice.call(document.querySelectorAll(".reveal")));

  document.getElementById("year").textContent = new Date().getFullYear();

  cargarContenido();
  initRatings();
  initSuggestions();
  cargarCatalogo();
  initCuenta();
}

async function cargarContenido() {
  try {
    aplicarContenido(await getContenido());
  } catch (e) {
    console.warn("[Joyería DC] textos del sitio:", e && e.message);
  }
}

var STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z"/></svg>';

function fmtFecha(iso) {
  var d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

/* ---------- calificaciones (Supabase) ---------- */
function initRatings() {
  var avgScore = document.getElementById("avgScore");
  var avgStars = document.getElementById("avgStars");
  var ratingCount = document.getElementById("ratingCount");
  var starButtons = Array.prototype.slice.call(document.querySelectorAll("#starsInput .star-btn"));
  var ratingThanks = document.getElementById("ratingThanks");
  var ratingError = document.getElementById("ratingError");
  if (!avgStars || !starButtons.length) return;

  function renderAvgStars(avg) {
    avgStars.innerHTML = "";
    for (var i = 1; i <= 5; i++) {
      var span = document.createElement("span");
      span.style.color = i <= Math.round(avg || 0) ? "var(--gold)" : "var(--star-off)";
      span.style.width = "20px"; span.style.height = "20px"; span.style.display = "inline-flex";
      span.innerHTML = STAR_SVG;
      avgStars.appendChild(span);
    }
  }
  function pintarResumen(promedio, total) {
    if (!total) {
      avgScore.textContent = "—";
      ratingCount.textContent = "Sé el primero en calificar";
      renderAvgStars(0);
      return;
    }
    avgScore.textContent = Number(promedio).toFixed(1);
    ratingCount.textContent = total === 1 ? "1 reseña" : (total + " reseñas");
    renderAvgStars(promedio);
  }
  function paintStarButtons(value) {
    starButtons.forEach(function (btn) {
      var on = parseInt(btn.getAttribute("data-value"), 10) <= value;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }
  async function refrescarResumen() {
    try {
      var r = await getResumenCalificaciones();
      pintarResumen(r.promedio, r.total);
    } catch (e) {
      console.warn("[Joyería DC] resumen de calificaciones:", e && e.message);
      pintarResumen(null, 0);
    }
  }

  var yaCalifico = false;
  try { yaCalifico = localStorage.getItem("dc_rated") === "1"; } catch (e) {}
  if (yaCalifico && ratingThanks) ratingThanks.hidden = false;

  starButtons.forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var value = parseInt(btn.getAttribute("data-value"), 10);
      if (ratingError) ratingError.hidden = true;
      paintStarButtons(value);
      if (yaCalifico) { if (ratingThanks) ratingThanks.hidden = false; return; }
      starButtons.forEach(function (b) { b.disabled = true; });
      try {
        await enviarCalificacion(value);
        yaCalifico = true;
        try { localStorage.setItem("dc_rated", "1"); } catch (e) {}
        if (ratingThanks) ratingThanks.hidden = false;
        await refrescarResumen();
      } catch (e) {
        console.warn("[Joyería DC] enviar calificación:", e && e.message);
        if (ratingError) ratingError.hidden = false;
        paintStarButtons(0);
        starButtons.forEach(function (b) { b.disabled = false; });
      }
    });
  });

  refrescarResumen();
}

/* ---------- sugerencias (Supabase, con moderación previa) ---------- */
function initSuggestions() {
  var suggForm = document.getElementById("suggForm");
  var suggList = document.getElementById("suggList");
  var suggEmpty = document.getElementById("suggEmpty");
  var suggThanks = document.getElementById("suggThanks");
  var suggError = document.getElementById("suggError");
  if (!suggForm || !suggList) return;

  async function cargarLista() {
    try {
      var items = await getSugerenciasAprobadas();
      suggList.querySelectorAll(".sugg-entry").forEach(function (n) { n.remove(); });
      items.forEach(function (s) {
        var li = document.createElement("li");
        li.className = "sugg-entry";
        var t = document.createElement("span");
        t.className = "sugg-text";
        t.textContent = s.texto;
        var m = document.createElement("span");
        m.className = "sugg-meta";
        m.textContent = (s.nombre || "Anónimo") + " · " + fmtFecha(s.created_at);
        li.appendChild(t); li.appendChild(m);
        suggList.appendChild(li);
      });
      if (suggEmpty) suggEmpty.hidden = items.length > 0;
    } catch (e) {
      console.warn("[Joyería DC] cargar sugerencias:", e && e.message);
      if (suggEmpty) suggEmpty.hidden = false;
    }
  }

  suggForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var textEl = document.getElementById("suggText");
    var nameEl = document.getElementById("suggName");
    var texto = (textEl.value || "").trim();
    if (!texto) return;
    var nombre = (nameEl.value || "").trim();
    if (suggError) suggError.hidden = true;
    var submitBtn = suggForm.querySelector('button[type="submit"], [type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await enviarSugerencia({ nombre: nombre, texto: texto });
      textEl.value = "";
      nameEl.value = "";
      if (suggThanks) suggThanks.hidden = false;
    } catch (err) {
      console.warn("[Joyería DC] enviar sugerencia:", err && err.message);
      if (suggError) suggError.hidden = false;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  cargarLista();
}

/* ---------- cuentas de cliente + favoritos (Fase 6) ---------- */
function initCuenta() {
  var btn = document.getElementById("cuentaBtn");
  var modal = document.getElementById("cuentaModal");
  var favModal = document.getElementById("favModal");
  if (!btn || !modal) return;

  var anonView = document.getElementById("cuentaAnon");
  var authView = document.getElementById("cuentaAuth");
  var form = document.getElementById("cuentaForm");
  var emailEl = document.getElementById("ctaEmail");
  var passEl = document.getElementById("ctaPass");
  var submitBtn = document.getElementById("ctaSubmit");
  var msgEl = document.getElementById("ctaMsg");
  var whoEl = document.getElementById("ctaWho");
  var modo = "entrar";
  var favIds = new Set();

  function abrir(m) { m.hidden = false; }
  function cerrar(m) { m.hidden = true; }
  function msg(text, kind) {
    if (!text) { msgEl.hidden = true; return; }
    msgEl.textContent = text;
    msgEl.style.color = kind === "ok" ? "var(--gold-strong)" : "#B3261E";
    msgEl.hidden = false;
  }

  document.querySelectorAll("[data-cerrar]").forEach(function (x) {
    x.addEventListener("click", function () { cerrar(modal); cerrar(favModal); });
  });
  [modal, favModal].forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m) cerrar(m); });
  });

  document.querySelectorAll(".dc-tab").forEach(function (t) {
    t.addEventListener("click", function () {
      modo = t.getAttribute("data-modo");
      document.querySelectorAll(".dc-tab").forEach(function (x) { x.classList.toggle("is-active", x === t); });
      submitBtn.textContent = modo === "crear" ? "Crear cuenta" : "Entrar";
      passEl.setAttribute("autocomplete", modo === "crear" ? "new-password" : "current-password");
      msg(null);
    });
  });

  async function pintarSesion(session) {
    var hay = !!session;
    anonView.hidden = hay;
    authView.hidden = !hay;
    btn.textContent = hay ? "Mi cuenta" : "Cuenta";
    if (hay) {
      whoEl.textContent = session.user.email || "";
      try { favIds = await getFavoritoIds(); } catch (e) { favIds = new Set(); }
    } else {
      favIds = new Set();
    }
    marcarFavoritos();
  }

  function marcarFavoritos() {
    document.querySelectorAll(".fav-heart").forEach(function (h) {
      h.classList.toggle("is-on", favIds.has(h.getAttribute("data-pieza-id")));
    });
  }
  window.__dcMarcarFavoritos = marcarFavoritos;

  btn.addEventListener("click", async function () {
    msg(null);
    await pintarSesion(await sesionActual());
    abrir(modal);
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    msg(null);
    submitBtn.disabled = true;
    var email = emailEl.value.trim();
    var pass = passEl.value;
    try {
      if (modo === "crear") {
        var r = await registrarse(email, pass);
        if (r.necesitaConfirmar) {
          msg("Cuenta creada. Revisa tu correo para confirmarla y luego entra.", "ok");
          submitBtn.disabled = false;
          return;
        }
      } else {
        await iniciarSesion(email, pass);
      }
      form.reset();
      await pintarSesion(await sesionActual());
    } catch (err) {
      var m = (err && err.message) || "";
      if (/already registered/i.test(m)) msg("Ese correo ya tiene cuenta. Entra con tu contraseña.");
      else if (/Invalid login/i.test(m)) msg("Correo o contraseña incorrectos.");
      else if (/should be at least|password.*6/i.test(m)) msg("La contraseña debe tener al menos 6 caracteres.");
      else if (/signups? not allowed|signup_disabled/i.test(m)) msg("El registro de cuentas está deshabilitado en este momento.");
      else if (/Email not confirmed/i.test(m)) msg("Confirma tu correo antes de entrar (revisa tu bandeja).");
      else msg("No se pudo completar. Intenta de nuevo.");
      submitBtn.disabled = false;
      return;
    }
    submitBtn.disabled = false;
  });

  document.getElementById("ctaLogout").addEventListener("click", async function () {
    await cerrarSesion();
    await pintarSesion(null);
  });

  document.getElementById("verFavsBtn").addEventListener("click", async function () {
    cerrar(modal);
    await renderFavoritos();
    abrir(favModal);
  });

  async function renderFavoritos() {
    var list = document.getElementById("favList");
    var empty = document.getElementById("favEmpty");
    var cta = document.getElementById("favCotizar");
    list.innerHTML = "";
    var items = [];
    try { items = await getFavoritos(); } catch (e) { /* nada */ }
    empty.hidden = items.length > 0;
    cta.hidden = items.length === 0;
    items.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "fav-row";
      var src = p.foto ? fotoUrl(p.foto.storage_path) : "";
      row.innerHTML =
        '<div class="fav-thumb">' + (src ? '<img src="' + src + '" alt="">' : "") + "</div>" +
        '<span class="fav-name"></span>' +
        '<button class="fav-quitar" type="button" aria-label="Quitar">Quitar</button>';
      row.querySelector(".fav-name").textContent = p.nombre;
      row.querySelector(".fav-quitar").addEventListener("click", async function () {
        try {
          await quitarFavorito(p.id);
          favIds.delete(p.id);
          marcarFavoritos();
          await renderFavoritos();
        } catch (e) { /* nada */ }
      });
      list.appendChild(row);
    });
    if (items.length) {
      var nombres = items.map(function (p) { return "• " + p.nombre; }).join("\n");
      cta.setAttribute("data-wa-msg", "Hola, me interesan estas piezas de Joyería DC:\n" + nombres);
      cta.setAttribute("href", waHref(cta.getAttribute("data-wa-msg")));
    }
  }

  // clic en un corazón (delegado)
  document.addEventListener("click", async function (e) {
    var heart = e.target && e.target.closest ? e.target.closest(".fav-heart") : null;
    if (!heart) return;
    e.preventDefault();
    var piezaId = heart.getAttribute("data-pieza-id");
    var session = await sesionActual();
    if (!session) { await pintarSesion(null); abrir(modal); return; }
    heart.disabled = true;
    try {
      if (favIds.has(piezaId)) {
        await quitarFavorito(piezaId);
        favIds.delete(piezaId);
      } else {
        await agregarFavorito(piezaId);
        favIds.add(piezaId);
      }
      marcarFavoritos();
    } catch (err) {
      console.warn("[Joyería DC] favorito:", err && err.message);
    }
    heart.disabled = false;
  });

  onCambioSesion(function (session) { pintarSesion(session); });
  sesionActual().then(pintarSesion);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSitio);
} else {
  initSitio();
}
