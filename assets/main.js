/* Joyería DC — script principal del sitio público. */
import { healthcheck } from "./supabase-client.js";
import { getCategorias, getPiezas, fotoUrl } from "./catalogo.js";
import {
  getSugerenciasAprobadas, enviarSugerencia, registrarCotizacion, registrarVisita,
} from "./interacciones.js";
import { getContenido, aplicarContenido } from "./contenido.js";

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
    }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
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

function metaPieza(catNombre) {
  return catNombre ? catNombre + " · Oro 18K" : "Oro 18K";
}

var DISPONIBILIDAD = {
  disponible: { label: "Disponible en tienda", cls: "is-ok" },
  encargo: { label: "Por encargo", cls: "is-encargo" },
  agotada: { label: "Agotada", cls: "is-agotada" },
};
function dispDe(pieza) {
  return DISPONIBILIDAD[pieza && pieza.disponibilidad] || DISPONIBILIDAD.disponible;
}
function textoCta(pieza) {
  return (pieza && pieza.disponibilidad === "agotada")
    ? "Consultar por WhatsApp"
    : "Cotizar esta pieza";
}

function renderPiezas(grid, piezas, catMap) {
  grid.innerHTML = "";
  piezas.forEach(function (pieza) {
    var catNombre = (catMap && catMap[pieza.categoria_id]) || "";
    var disp = dispDe(pieza);
    var cell = el("article", {
      class: "gallery-item" + (pieza.disponibilidad === "agotada" ? " is-agotada" : ""),
      "data-pieza-id": pieza.id
    });

    var trigger = el("button", {
      class: "gallery-open", type: "button",
      "aria-haspopup": "dialog",
      "aria-label": "Ver " + pieza.nombre
    });

    var media = el("span", { class: "gallery-media" });
    if (pieza.foto) {
      var img = el("img", {
        src: fotoUrl(pieza.foto.storage_path),
        alt: pieza.foto.alt || pieza.nombre,
        loading: "lazy"
      });
      img.addEventListener("error", function handler() {
        img.removeEventListener("error", handler);
        media.classList.add("is-empty");
        img.remove();
      });
      media.appendChild(img);
    } else {
      media.classList.add("is-empty");
    }
    trigger.appendChild(media);

    var name = el("span", { class: "gallery-name" });
    name.textContent = pieza.nombre;
    trigger.appendChild(name);

    var meta = el("span", { class: "gallery-meta" });
    meta.textContent = metaPieza(catNombre);
    trigger.appendChild(meta);

    var stock = el("span", { class: "gallery-stock " + disp.cls });
    stock.textContent = disp.label;
    trigger.appendChild(stock);

    var hint = el("span", { class: "gallery-hint" }, "Ver pieza");
    trigger.appendChild(hint);

    trigger.addEventListener("click", function () {
      abrirPieza(pieza, catNombre, trigger);
    });
    cell.appendChild(trigger);

    grid.appendChild(cell);
  });
  grid.removeAttribute("data-estado");
  wireWaLinks(grid);
}

/* ---------- vista ampliada de una pieza (modal) ---------- */
var piezaModal = null;
var piezaModalReturnFocus = null;

function initPiezaModal() {
  piezaModal = document.getElementById("piezaModal");
  if (!piezaModal) return;
  piezaModal.querySelectorAll("[data-close]").forEach(function (n) {
    n.addEventListener("click", cerrarPieza);
  });
  var closeBtn = document.getElementById("piezaModalClose");
  if (closeBtn) closeBtn.addEventListener("click", cerrarPieza);
  document.addEventListener("keydown", function (e) {
    if (piezaModal.hidden) return;
    if (e.key === "Escape") { cerrarPieza(); return; }
    if (e.key === "Tab") {
      var foco = piezaModal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!foco.length) return;
      var primero = foco[0], ultimo = foco[foco.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }
  });
}

function abrirPieza(pieza, catNombre, returnFocusEl) {
  if (!piezaModal) return;
  piezaModalReturnFocus = returnFocusEl || null;

  var media = document.getElementById("piezaModalMedia");
  media.innerHTML = "";
  if (pieza.foto) {
    media.classList.remove("is-empty");
    media.appendChild(el("img", {
      src: fotoUrl(pieza.foto.storage_path),
      alt: pieza.foto.alt || pieza.nombre
    }));
  } else {
    media.classList.add("is-empty");
  }

  document.getElementById("piezaModalMeta").textContent = metaPieza(catNombre);
  document.getElementById("piezaModalName").textContent = pieza.nombre;

  var disp = dispDe(pieza);
  var stock = document.getElementById("piezaModalStock");
  if (stock) {
    stock.textContent = disp.label;
    stock.className = "pieza-modal__stock " + disp.cls;
  }

  var desc = document.getElementById("piezaModalDesc");
  if (pieza.descripcion) { desc.textContent = pieza.descripcion; desc.hidden = false; }
  else { desc.textContent = ""; desc.hidden = true; }

  var cta = document.getElementById("piezaModalCta");
  cta.setAttribute("data-wa-msg", "Hola, quiero comprar/cotizar: " + pieza.nombre + ".");
  cta.setAttribute("data-cotiza", pieza.nombre);
  cta.setAttribute("data-pieza-id", pieza.id);
  cta.textContent = textoCta(pieza);
  wireWaLinks(piezaModal);

  piezaModal.hidden = false;
  document.body.classList.add("modal-open");
  var closeBtn = document.getElementById("piezaModalClose");
  if (closeBtn) closeBtn.focus();
}

function cerrarPieza() {
  if (!piezaModal || piezaModal.hidden) return;
  piezaModal.hidden = true;
  document.body.classList.remove("modal-open");
  if (piezaModalReturnFocus && piezaModalReturnFocus.focus) piezaModalReturnFocus.focus();
  piezaModalReturnFocus = null;
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
    var catMap = {};
    categorias.forEach(function (c) { catMap[c.id] = c.nombre; });
    if (catGrid) renderCategorias(catGrid, categorias);
    if (galleryGrid) renderPiezas(galleryGrid, piezas, catMap);
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

  initPiezaModal();
  cargarContenido();
  initSuggestions();
  cargarCatalogo();
  registrarVisita();
}

async function cargarContenido() {
  try {
    aplicarContenido(await getContenido());
  } catch (e) {
    console.warn("[Joyería DC] textos del sitio:", e && e.message);
  }
}

function fmtFecha(iso) {
  var d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSitio);
} else {
  initSitio();
}
