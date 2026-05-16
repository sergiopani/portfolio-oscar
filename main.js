/* =============================================================
   NORMIA · main.js
   IIFE pattern (no modules — works on file:// and any host)
   ============================================================= */
(function () {
  "use strict";

  const $  = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const escHTML = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* =========================================================
     1. Splash hide
     ========================================================= */
  function initSplash() {
    const splash = $("[data-splash]");
    if (!splash) return;
    const hide = () => splash.classList.add("is-out");
    if (document.readyState === "complete") setTimeout(hide, 500);
    else window.addEventListener("load", () => setTimeout(hide, 350));
    setTimeout(hide, 3500);
  }

  /* =========================================================
     2. Nav scroll + mobile toggle
     ========================================================= */
  function initNav() {
    const nav = $("[data-nav]");
    const toggle = $("[data-nav-toggle]");
    if (!nav) return;

    const onScroll = () => {
      if (window.scrollY > 24) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (toggle) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $$(".nav-links a").forEach(a => {
        a.addEventListener("click", () => {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* =========================================================
     3. Smooth scroll for anchors
     ========================================================= */
  function initSmoothScroll() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const navOffset = 80;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth",
      });
    });
  }

  /* =========================================================
     4. Split text — word level (preserves <br> and <em>)
     ========================================================= */
  function splitWords(el) {
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    const wrap = (text) => text.split(/(\s+)/).map(w =>
      /^\s+$/.test(w)
        ? w
        : `<span class="split-word" aria-hidden="true">${escHTML(w)}</span>`
    ).join("");
    const html = Array.from(el.childNodes).map(node => {
      if (node.nodeType === 3) return wrap(node.textContent);
      if (node.nodeName === "BR") return "<br>";
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        return `<${tag}>${wrap(node.textContent)}</${tag}>`;
      }
      return "";
    }).join("");
    el.innerHTML = html;
  }
  function initSplitText() {
    $$("[data-split]").forEach(el => {
      splitWords(el);
    });
  }

  /* =========================================================
     5. Reveals — IntersectionObserver
     ========================================================= */
  function initReveals() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add("is-visible");
          // Stagger split words
          if (el.hasAttribute("data-split")) {
            const words = el.querySelectorAll(".split-word");
            words.forEach((w, i) => {
              w.style.transitionDelay = (i * 0.04) + "s";
            });
          }
          io.unobserve(el);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: "0px 0px -4% 0px",
    });
    els.forEach(el => io.observe(el));

    // Safety net: reveal anything still hidden at 6s
    setTimeout(() => {
      $$(".reveal:not(.is-visible)").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight + 100) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* =========================================================
     6. Tilt 3D effect
     ========================================================= */
  function initTilt() {
    if (!fineHover) return;
    const cards = $$("[data-tilt]");
    cards.forEach(card => {
      let raf = null;
      let active = false;

      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const maxTilt = 7;
          card.style.transform =
            `perspective(800px) rotateY(${x * maxTilt}deg) rotateX(${-y * maxTilt}deg) translateZ(0)`;
        });
      };
      const onEnter = () => {
        active = true;
        card.style.transition = "transform .15s var(--ease-out)";
      };
      const onLeave = () => {
        active = false;
        if (raf) cancelAnimationFrame(raf);
        card.style.transition = "transform .6s var(--ease-out)";
        card.style.transform = "";
      };

      card.addEventListener("mouseover", e => {
        if (!card.contains(e.relatedTarget) && !active) onEnter();
      });
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseout", e => {
        if (!card.contains(e.relatedTarget) && active) onLeave();
      });
    });
  }

  /* =========================================================
     7. Count-up numbers
     ========================================================= */
  function initCountUp() {
    const els = $$("[data-count-to]");
    if (!els.length) return;
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.countTo);
      if (isNaN(target)) return;
      const original = el.textContent.trim();
      const hasPlus = /\+/.test(original);
      const hasPercent = /%/.test(original);
      const duration = 1500;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(target * eased);
        let display = String(val);
        if (hasPercent) display += "%";
        else if (hasPlus) display += "+";
        el.textContent = display;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  /* =========================================================
     8. FAQ — close others when one opens (optional one-open mode)
     ========================================================= */
  function initFaq() {
    const items = $$("[data-faq] .faq-item");
    items.forEach(item => {
      item.addEventListener("toggle", () => {
        if (item.open) {
          items.forEach(other => {
            if (other !== item && other.open) other.open = false;
          });
        }
      });
    });
  }

  /* =========================================================
     9. Year in footer
     ========================================================= */
  function initYear() {
    const y = $("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* =========================================================
     10. Contact form — native POST to FormSubmit.co
         El formulario envía directamente sin AJAX, evitando
         cualquier problema de CORS. FormSubmit redirige de vuelta
         a /?ok=1 cuando el envío es correcto.
     ========================================================= */
  function initForm() {
    const form = $("[data-form]");
    if (!form) return;
    const submit = $(".form-submit", form);
    const submitLabel = $(".form-submit-label", form);

    form.addEventListener("submit", (e) => {
      // Honeypot check: si el campo oculto tiene valor, es un bot
      const honey = form.querySelector('[name="_honey"]');
      if (honey && honey.value) { e.preventDefault(); return; }

      // Validación nativa del navegador
      if (!form.reportValidity()) { e.preventDefault(); return; }

      // Feedback visual mientras se envía
      if (submit) submit.disabled = true;
      if (submitLabel) submitLabel.textContent = "Enviando…";

      // Dejamos que el navegador haga el POST nativo a FormSubmit
      // (no hacemos preventDefault aquí para que el form se envíe)
    });
  }

  /* =========================================================
     11. URL ?ok=1 → show success message after redirect fallback
     ========================================================= */
  function initSuccessParam() {
    if (location.search.indexOf("ok=1") === -1) return;
    const status = $("[data-form-status]");
    if (status) {
      status.textContent = "¡Recibido! Te responderemos en menos de 24 horas laborables.";
      status.classList.add("is-success");
    }
    const target = $("#contacto");
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }

  /* =========================================================
     12. Subtle parallax on hero figure (mouse-reactive)
     ========================================================= */
  function initHeroParallax() {
    if (!fineHover) return;
    const figure = $(".hero-figure");
    if (!figure) return;
    const cards = $$(".hero-card-glass, .hero-card-stat, .hero-card-mini", figure);
    if (!cards.length) return;

    let raf = null;
    document.addEventListener("mousemove", (e) => {
      const cx = e.clientX / window.innerWidth - 0.5;
      const cy = e.clientY / window.innerHeight - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cards.forEach((card, i) => {
          const factor = (i + 1) * 8;
          card.style.setProperty("--mx", (cx * factor).toFixed(2) + "px");
          card.style.setProperty("--my", (cy * factor).toFixed(2) + "px");
        });
      });
    });
  }

  /* =========================================================
     Boot
     ========================================================= */
  function boot() {
    safe(initSplash, "initSplash");
    safe(initNav, "initNav");
    safe(initSmoothScroll, "initSmoothScroll");
    safe(initSplitText, "initSplitText");
    safe(initReveals, "initReveals");
    safe(initTilt, "initTilt");
    safe(initCountUp, "initCountUp");
    safe(initFaq, "initFaq");
    safe(initYear, "initYear");
    safe(initForm, "initForm");
    safe(initSuccessParam, "initSuccessParam");
    safe(initHeroParallax, "initHeroParallax");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
    }

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
