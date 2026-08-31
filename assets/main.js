/* Joyería DC — script principal del sitio público. */
import { healthcheck } from "./supabase-client.js";
import { getCategorias, getPiezas, fotoUrl } from "./catalogo.js";

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
    var a = el("a", {
      class: "gallery-item wa-link", href: "#",
      "data-wa-msg": "Hola, quiero comprar/cotizar: " + pieza.nombre + ".",
      target: "_blank", rel: "noopener"
    });
    if (pieza.foto) {
      var img = el("img", {
        src: fotoUrl(pieza.foto.storage_path),
        alt: pieza.foto.alt || pieza.nombre,
        loading: "lazy"
      });
      img.addEventListener("error", function handler() {
        img.removeEventListener("error", handler);
        a.classList.add("no-photo");
        img.remove();
      });
      a.appendChild(img);
    } else {
      a.classList.add("no-photo");
    }
    var tag = el("span", { class: "gallery-tag" });
    tag.textContent = pieza.nombre;
    a.appendChild(tag);
    grid.appendChild(a);
  });
  grid.removeAttribute("data-estado");
  wireWaLinks(grid);
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

  var navWa = document.getElementById("navWa");
  if (navWa) navWa.setAttribute("href", waHref("Hola, quiero cotizar una joya de Joyería DC."));

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

  initRatings();
  initSuggestions();
  cargarCatalogo();
}

/* ---------- ratings (versión local; se conecta a Supabase en la Fase 3) ---------- */
function initRatings() {
  var STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z"/></svg>';
  var ratingLog = document.getElementById("ratingLog");
  var avgScore = document.getElementById("avgScore");
  var avgStars = document.getElementById("avgStars");
  var ratingCount = document.getElementById("ratingCount");
  var starButtons = Array.prototype.slice.call(document.querySelectorAll("#starsInput .star-btn"));
  var ratingThanks = document.getElementById("ratingThanks");
  if (!ratingLog || !avgStars) return;

  function renderAvgStars(avg) {
    avgStars.innerHTML = "";
    for (var i = 1; i <= 5; i++) {
      var span = document.createElement("span");
      span.style.color = i <= Math.round(avg) ? "var(--gold)" : "var(--star-off)";
      span.style.width = "20px"; span.style.height = "20px"; span.style.display = "inline-flex";
      span.innerHTML = STAR_SVG;
      avgStars.appendChild(span);
    }
  }
  function recomputeRatings() {
    var entries = ratingLog.querySelectorAll(".rating-entry");
    var count = entries.length;
    if (!count) {
      avgScore.textContent = "—";
      ratingCount.textContent = "Sé el primero en calificar";
      renderAvgStars(0);
      return;
    }
    var sum = 0;
    entries.forEach(function (li) { sum += parseInt(li.getAttribute("data-value"), 10) || 0; });
    var avg = sum / count;
    avgScore.textContent = avg.toFixed(1);
    ratingCount.textContent = count === 1 ? "1 reseña" : (count + " reseñas");
    renderAvgStars(avg);
  }
  function paintStarButtons(value) {
    starButtons.forEach(function (btn) {
      var on = parseInt(btn.getAttribute("data-value"), 10) <= value;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }
  var alreadyRated = false;
  try { alreadyRated = localStorage.getItem("dc_rated") === "1"; } catch (e) {}
  if (alreadyRated && ratingThanks) ratingThanks.hidden = false;

  starButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = parseInt(btn.getAttribute("data-value"), 10);
      paintStarButtons(value);
      var li = document.createElement("li");
      li.className = "rating-entry";
      li.setAttribute("data-value", String(value));
      var meta = document.createElement("span");
      meta.textContent = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
      li.appendChild(meta);
      ratingLog.appendChild(li);
      recomputeRatings();
      if (ratingThanks) ratingThanks.hidden = false;
      try { localStorage.setItem("dc_rated", "1"); } catch (e) {}
    });
  });
  recomputeRatings();
}

/* ---------- suggestions (versión local; se conecta a Supabase en la Fase 3) ---------- */
function initSuggestions() {
  var suggForm = document.getElementById("suggForm");
  var suggList = document.getElementById("suggList");
  var suggEmpty = document.getElementById("suggEmpty");
  var suggThanks = document.getElementById("suggThanks");
  if (!suggForm || !suggList) return;

  function refreshSuggEmpty() {
    var hasEntries = suggList.querySelectorAll(".sugg-entry").length > 0;
    if (suggEmpty) suggEmpty.hidden = hasEntries;
  }
  suggForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var textEl = document.getElementById("suggText");
    var nameEl = document.getElementById("suggName");
    var text = (textEl.value || "").trim();
    if (!text) return;
    var name = (nameEl.value || "").trim() || "Anónimo";
    var li = document.createElement("li");
    li.className = "sugg-entry";
    var span1 = document.createElement("span");
    span1.className = "sugg-text";
    span1.textContent = text;
    var span2 = document.createElement("span");
    span2.className = "sugg-meta";
    span2.textContent = name + " · " + new Date().toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
    li.appendChild(span1);
    li.appendChild(span2);
    suggList.appendChild(li);
    if (suggEmpty) suggEmpty.hidden = true;
    textEl.value = "";
    nameEl.value = "";
    if (suggThanks) suggThanks.hidden = false;
  });
  refreshSuggEmpty();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSitio);
} else {
  initSitio();
}
