/* Joyería DC — script principal del sitio público.
 * Extraído del <script> inline de index.html en la Fase 1 de la migración.
 */
import { healthcheck } from "./supabase-client.js";

// Chequeo de conexión con Supabase (solo consola, no cambia la interfaz).
healthcheck();

(function(){
  var WA_NUMBER = "12405933943";
  function waHref(msg){ return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg); }
  document.querySelectorAll(".wa-link").forEach(function(el){
    el.setAttribute("href", waHref(el.getAttribute("data-wa-msg") || "Hola, quiero más información sobre Joyería DC."));
  });
  var navWa = document.getElementById("navWa");
  if(navWa){ navWa.setAttribute("href", waHref("Hola, quiero cotizar una joya de Joyería DC.")); }

  var comoLlegar = document.getElementById("comoLlegar");
  if(comoLlegar){
    var lat = comoLlegar.getAttribute("data-lat");
    var lng = comoLlegar.getAttribute("data-lng");
    var place = encodeURIComponent(comoLlegar.getAttribute("data-place") || "");
    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if(isIOS){
      comoLlegar.setAttribute("href", "https://maps.apple.com/?ll=" + lat + "," + lng + "&q=" + place);
    }
  }

  var nav = document.getElementById("siteNav");
  window.addEventListener("scroll", function(){
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive:true });

  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  toggle.addEventListener("click", function(){
    var open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.querySelectorAll("a").forEach(function(a){
    a.addEventListener("click", function(){
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  if("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .15 });
    document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function(el){ el.classList.add("is-visible"); });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- ratings ---------- */
  var STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z"/></svg>';
  var ratingLog = document.getElementById("ratingLog");
  var avgScore = document.getElementById("avgScore");
  var avgStars = document.getElementById("avgStars");
  var ratingCount = document.getElementById("ratingCount");
  var starButtons = Array.prototype.slice.call(document.querySelectorAll("#starsInput .star-btn"));
  var ratingThanks = document.getElementById("ratingThanks");

  function renderAvgStars(avg){
    avgStars.innerHTML = "";
    for(var i=1;i<=5;i++){
      var span = document.createElement("span");
      span.style.color = i <= Math.round(avg) ? "var(--gold)" : "var(--star-off)";
      span.style.width = "20px"; span.style.height = "20px"; span.style.display = "inline-flex";
      span.innerHTML = STAR_SVG;
      avgStars.appendChild(span);
    }
  }

  function recomputeRatings(){
    var entries = ratingLog.querySelectorAll(".rating-entry");
    var count = entries.length;
    if(!count){
      avgScore.textContent = "—";
      ratingCount.textContent = "Sé el primero en calificar";
      renderAvgStars(0);
      return;
    }
    var sum = 0;
    entries.forEach(function(li){ sum += parseInt(li.getAttribute("data-value"), 10) || 0; });
    var avg = sum / count;
    avgScore.textContent = avg.toFixed(1);
    ratingCount.textContent = count === 1 ? "1 reseña" : (count + " reseñas");
    renderAvgStars(avg);
  }

  function paintStarButtons(value){
    starButtons.forEach(function(btn){
      var on = parseInt(btn.getAttribute("data-value"),10) <= value;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  var alreadyRated = false;
  try{ alreadyRated = localStorage.getItem("dc_rated") === "1"; }catch(e){}
  if(alreadyRated){
    ratingThanks.hidden = false;
  }

  starButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      var value = parseInt(btn.getAttribute("data-value"), 10);
      paintStarButtons(value);
      var li = document.createElement("li");
      li.className = "rating-entry";
      li.setAttribute("data-value", String(value));
      var meta = document.createElement("span");
      meta.textContent = new Date().toLocaleDateString("es-CO", { year:"numeric", month:"short", day:"numeric" });
      li.appendChild(meta);
      ratingLog.appendChild(li);
      recomputeRatings();
      ratingThanks.hidden = false;
      try{ localStorage.setItem("dc_rated", "1"); }catch(e){}
    });
  });

  document.addEventListener("claude:edit", function(){ recomputeRatings(); refreshSuggEmpty(); });
  recomputeRatings();

  /* ---------- suggestions ---------- */
  var suggForm = document.getElementById("suggForm");
  var suggList = document.getElementById("suggList");
  var suggEmpty = document.getElementById("suggEmpty");
  var suggThanks = document.getElementById("suggThanks");

  function refreshSuggEmpty(){
    var hasEntries = suggList.querySelectorAll(".sugg-entry").length > 0;
    if(suggEmpty) suggEmpty.hidden = hasEntries;
  }

  suggForm.addEventListener("submit", function(e){
    e.preventDefault();
    var textEl = document.getElementById("suggText");
    var nameEl = document.getElementById("suggName");
    var text = (textEl.value || "").trim();
    if(!text) return;
    var name = (nameEl.value || "").trim() || "Anónimo";

    var li = document.createElement("li");
    li.className = "sugg-entry";
    var span1 = document.createElement("span");
    span1.className = "sugg-text";
    span1.textContent = text;
    var span2 = document.createElement("span");
    span2.className = "sugg-meta";
    span2.textContent = name + " · " + new Date().toLocaleDateString("es-CO", { year:"numeric", month:"short", day:"numeric" });
    li.appendChild(span1);
    li.appendChild(span2);
    suggList.appendChild(li);

    if(suggEmpty) suggEmpty.hidden = true;
    textEl.value = "";
    nameEl.value = "";
    suggThanks.hidden = false;
  });

  refreshSuggEmpty();
})();
