/*
  Blood Donors Mangalore — Interactions
  - Loader fade
  - Mobile nav drawer
  - Live search filtering + interactive donor cards
  - Form validation + success overlay
  - Scroll reveal + count-up
  - Ambient particle canvas
  - Micro-interactions (spark on click, toast, copy)
*/

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  let perfMode = false;

  function setPerfMode(on) {
    perfMode = Boolean(on);
    document.body.classList.toggle("perfMode", perfMode);
    if (perfMode) {
      stopParticles?.();
    } else {
      startParticles?.();
    }
  }

  // --- Loader ---------------------------------------------------------------
  const loader = $("#loader");
  const hideLoader = () => {
    if (!loader) return;
    loader.classList.add("loader--hide");
    window.setTimeout(() => loader.remove(), 700);
  };

  // --- Toast ---------------------------------------------------------------
  const toast = $("#toast");
  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove("toast--show");
    // restart animation
    void toast.offsetWidth;
    toast.classList.add("toast--show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove("toast--show");
    }, 1600);
  }

  // --- Micro spark on clicks ----------------------------------------------
  function sparkAt(x, y) {
    if (prefersReducedMotion) return;
    const s = document.createElement("span");
    s.style.position = "fixed";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.width = "10px";
    s.style.height = "10px";
    s.style.borderRadius = "999px";
    s.style.pointerEvents = "none";
    s.style.zIndex = "80";
    s.style.transform = "translate(-50%, -50%)";
    s.style.background =
      "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.65), rgba(255,42,58,0.35) 55%, rgba(255,42,58,0) 70%)";
    s.style.boxShadow = "0 0 22px rgba(255,42,58,0.35)";
    s.style.opacity = "0.95";
    s.style.transition = "transform 420ms ease, opacity 420ms ease, filter 420ms ease";
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = "translate(-50%, -50%) scale(3.6)";
      s.style.opacity = "0";
      s.style.filter = "blur(1px)";
    });
    window.setTimeout(() => s.remove(), 480);
  }

  document.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".btn, .resultCard, .iconBtn, .nav__toggle, .toTop")) sparkAt(e.clientX, e.clientY);
  });

  // --- Mobile nav ----------------------------------------------------------
  const navToggle = $("#navToggle");
  const navDrawer = $("#navDrawer");
  function setDrawer(open) {
    if (!navToggle || !navDrawer) return;
    navToggle.setAttribute("aria-expanded", String(open));
    navDrawer.hidden = !open;
  }

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") !== "true";
    setDrawer(open);
  });

  // Close drawer when a link is clicked
  navDrawer?.addEventListener("click", (e) => {
    const a = (e.target instanceof Element && e.target.closest("a")) || null;
    if (!a) return;
    setDrawer(false);
  });

  // --- Smooth anchor scroll with offset -----------------------------------
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = $(".navWrap")?.getBoundingClientRect().height ?? 0;
    const top = window.scrollY + el.getBoundingClientRect().top - navHeight - 10;
    window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    const id = href.slice(1);
    if (!id) return;
    e.preventDefault();
    scrollToId(id);
    history.pushState(null, "", href);
    setDrawer(false);
  });

  // --- Back to top ---------------------------------------------------------
  const toTop = $("#toTop");
  toTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  function updateToTop() {
    if (!toTop) return;
    const show = window.scrollY > 540;
    toTop.classList.toggle("toTop--show", show);
  }
  window.addEventListener("scroll", updateToTop, { passive: true });

  // --- Scroll reveal -------------------------------------------------------
  const revealEls = $$(".reveal");
  const revealIO =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const ent of entries) {
              if (!ent.isIntersecting) continue;
              ent.target.classList.add("reveal--in");
              revealIO.unobserve(ent.target);
            }
          },
          { threshold: 0.12 }
        )
      : null;

  revealEls.forEach((el) => {
    if (!revealIO || prefersReducedMotion) el.classList.add("reveal--in");
    else revealIO.observe(el);
  });

  // --- Count up ------------------------------------------------------------
  function animateCount(el, target, ms = 1100) {
    const start = 0;
    const t0 = performance.now();
    const fmt = new Intl.NumberFormat("en-IN");
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(start + (target - start) * eased);
      el.textContent = fmt.format(val);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const countupEls = $$("[data-countup], [data-counter]");
  const countIO =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const ent of entries) {
              if (!ent.isIntersecting) continue;
              const el = ent.target;
              const target = Number(el.getAttribute("data-target") || "0");
              if (!Number.isFinite(target)) continue;
              if (prefersReducedMotion) el.textContent = String(target);
              else animateCount(el, target);
              countIO.unobserve(el);
            }
          },
          { threshold: 0.3 }
        )
      : null;

  countupEls.forEach((el) => {
    if (!countIO) {
      const target = Number(el.getAttribute("data-target") || "0");
      el.textContent = String(target);
      return;
    }
    countIO.observe(el);
  });

  // --- Live Blood Search ---------------------------------------------------
  const donors = [];

  async function loadDonorsFromServer() {
    try {
      const res = await fetch("./api/donors", { cache: "no-store" });
      if (!res.ok) throw new Error("Bad response");
      const data = await res.json();
      const list = Array.isArray(data?.donors) ? data.donors : [];
      donors.length = 0;
      for (const d of list) {
        if (!d) continue;
        donors.push({
          name: String(d.name || "").trim(),
          phone: String(d.phone || "").trim(),
          blood: String(d.blood || "").trim(),
          area: String(d.area || "").trim(),
        });
      }
      runSearch();
      return true;
    } catch {
      return false;
    }
  }

  const searchForm = $("#searchForm");
  const filterBlood = $("#filterBlood");
  const filterArea = $("#filterArea");
  const filterName = $("#filterName");
  const resetSearch = $("#resetSearch");
  const resultsGrid = $("#resultsGrid");
  const resultsCount = $("#resultsCount");
  const noResults = $("#noResults");
  const resultsToggle = $("#resultsToggle");

  const RESULTS_LIMIT = 5;
  let resultsExpanded = false;
  let lastResults = [];

  function iconSvg(type) {
    if (type === "phone") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 2h4l2 6-3 2c1.5 3 3.5 5 6.5 6.5l2-3 6 2v4c0 1-1 2-2 2C10 22 2 14 2 4c0-1 1-2 2-2h2z" fill="currentColor"/>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c3 4 7 8 7 13a7 7 0 1 1-14 0c0-5 4-9 7-13z" fill="currentColor"/>
      </svg>
    `;
  }

  function renderResults(list) {
    if (!resultsGrid || !resultsCount || !noResults) return;
    resultsGrid.innerHTML = "";

    lastResults = list;
    const total = list.length;
    const shown = resultsExpanded ? total : Math.min(RESULTS_LIMIT, total);
    resultsCount.textContent =
      total <= RESULTS_LIMIT
        ? `${total} result${total === 1 ? "" : "s"}`
        : `Showing ${shown} of ${total} results`;

    if (resultsToggle) {
      const shouldShowToggle = total > RESULTS_LIMIT;
      resultsToggle.hidden = !shouldShowToggle;
      const label = resultsToggle.querySelector("span");
      if (label) label.textContent = resultsExpanded ? "Show less" : "Show more";
    }
    noResults.hidden = list.length !== 0;

    for (const d of list.slice(0, shown)) {
      const card = document.createElement("article");
      card.className = "resultCard";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Copy ${d.name} contact`);
      card.dataset.phone = d.phone;

      card.innerHTML = `
        <div class="resultCard__top">
          <div class="chip">${d.blood}</div>
          <div class="tiny">${d.area}</div>
        </div>
        <div class="resultCard__name">${d.name}</div>
        <div class="resultCard__meta">
          <span>${iconSvg("phone")} ${d.phone}</span>
          <span>${iconSvg("drop")} Tap to copy</span>
        </div>
      `;

      resultsGrid.appendChild(card);
    }
  }

  function getFiltered() {
    const blood = (filterBlood?.value || "all").trim();
    const area = (filterArea?.value || "all").trim();
    const name = (filterName?.value || "").trim().toLowerCase();

    return donors.filter((d) => {
      const okBlood = blood === "all" || d.blood === blood;
      const okArea = area === "all" || d.area === area;
      const okName = !name || d.name.toLowerCase().includes(name);
      return okBlood && okArea && okName;
    });
  }

  function runSearch() {
    renderResults(getFiltered());
  }

  resultsToggle?.addEventListener("click", () => {
    resultsExpanded = !resultsExpanded;
    renderResults(lastResults);
  });

  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    resultsExpanded = false;
    runSearch();
  });

  resetSearch?.addEventListener("click", () => {
    if (filterBlood) filterBlood.value = "all";
    if (filterArea) filterArea.value = "all";
    if (filterName) filterName.value = "";
    resultsExpanded = false;
    runSearch();
  });

  // Live update name typing
  filterName?.addEventListener("input", () => {
    resultsExpanded = false;
    runSearch();
  });

  // Copy on click / enter
  resultsGrid?.addEventListener("click", async (e) => {
    const card = e.target instanceof Element ? e.target.closest(".resultCard") : null;
    if (!card) return;
    const phone = card.getAttribute("data-phone") || "";
    try {
      await navigator.clipboard.writeText(phone);
      showToast("Phone number copied.");
    } catch {
      showToast("Copy failed. Tap and hold to copy manually.");
    }
  });

  resultsGrid?.addEventListener("keydown", async (e) => {
    if (!(e instanceof KeyboardEvent)) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target instanceof Element ? e.target.closest(".resultCard") : null;
    if (!card) return;
    e.preventDefault();
    const phone = card.getAttribute("data-phone") || "";
    try {
      await navigator.clipboard.writeText(phone);
      showToast("Phone number copied.");
    } catch {
      showToast("Copy failed. Tap and hold to copy manually.");
    }
  });

  // Donor registration has been moved to register.html
  // --- Donor form (homepage) ----------------------------------------------
  const donorForm = $("#donorForm");
  const successOverlay = $("#successOverlay");
  const successClose = $("#successClose");

  const fields = {
    donorName: $("#donorName"),
    donorPhone: $("#donorPhone"),
    donorBlood: $("#donorBlood"),
    donorLocation: $("#donorLocation"),
  };

  function setError(id, message) {
    const input = fields[id];
    if (!(input instanceof HTMLElement)) return;
    const field = input.closest(".field");
    const err = $(`[data-error-for="${id}"]`);
    field?.classList.toggle("field--invalid", Boolean(message));
    if (err) err.textContent = message || "";
  }

  function validateDonorForm() {
    let ok = true;
    const name = (fields.donorName?.value || "").trim();
    const phone = (fields.donorPhone?.value || "").replace(/\s+/g, "");
    const blood = (fields.donorBlood?.value || "").trim();
    const loc = (fields.donorLocation?.value || "").trim();

    if (name.length < 2) {
      ok = false;
      setError("donorName", "Please enter your name.");
    } else setError("donorName", "");

    if (!/^\d{10}$/.test(phone)) {
      ok = false;
      setError("donorPhone", "Enter a valid 10-digit phone number.");
    } else setError("donorPhone", "");

    if (!blood) {
      ok = false;
      setError("donorBlood", "Select your blood group.");
    } else setError("donorBlood", "");

    if (loc.length < 2) {
      ok = false;
      setError("donorLocation", "Enter your location/area.");
    } else setError("donorLocation", "");

    return ok;
  }

  donorForm?.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.id;
    if (id && id in fields) validateDonorForm();
  });

  function closeSuccess() {
    if (!successOverlay) return;
    successOverlay.hidden = true;
  }

  successClose?.addEventListener("click", closeSuccess);
  successOverlay?.addEventListener("click", (e) => {
    if (e.target === successOverlay) closeSuccess();
  });
  document.addEventListener("keydown", (e) => {
    if (!(e instanceof KeyboardEvent)) return;
    if (e.key === "Escape") closeSuccess();
  });

  donorForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateDonorForm()) {
      showToast("Please fix highlighted fields.");
      return;
    }

    const newDonor = {
      name: (fields.donorName?.value || "").trim(),
      phone: (fields.donorPhone?.value || "").replace(/\s+/g, ""),
      blood: (fields.donorBlood?.value || "").trim(),
      area: (fields.donorLocation?.value || "").trim(),
    };

    // Save to JSON "database" via server, then reload donor list
    (async () => {
      try {
        const res = await fetch("./api/donors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDonor),
        });
        if (!res.ok) throw new Error("Save failed");
        await loadDonorsFromServer();
        if (successOverlay) successOverlay.hidden = false;
        showToast("Registered. Your details are now searchable.");
      } catch {
        // Fallback (no server): keep it visible locally for this session
        donors.unshift(newDonor);
        runSearch();
        showToast("Saved locally (server not running). Start the server to store in JSON.");
      }
    })();

    donorForm.reset();
    setError("donorName", "");
    setError("donorPhone", "");
    setError("donorBlood", "");
    setError("donorLocation", "");
  });

  // --- Year ---------------------------------------------------------------
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // --- Particles -----------------------------------------------------------
  const canvas = $("#bgParticles");
  const ctx = canvas instanceof HTMLCanvasElement ? canvas.getContext("2d") : null;
  let raf = 0;
  let vignette = null;
  let particlesRunning = false;

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Use clientWidth/Height to avoid tiny overflows on mobile browsers
    // where `innerWidth` can include visual viewport quirks.
    const cssW = document.documentElement.clientWidth;
    const cssH = document.documentElement.clientHeight;
    const w = Math.floor(cssW * dpr);
    const h = Math.floor(cssH * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vignette = null;
  }

  const particles = [];
  function initParticles() {
    if (!canvas || !ctx) return;
    particles.length = 0;
    // Keep this intentionally light (canvas + shadows can get expensive on low-end GPUs).
    const count = Math.max(14, Math.min(38, Math.floor(window.innerWidth / 34)));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.8 + Math.random() * 2.1,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        a: 0.18 + Math.random() * 0.35,
      });
    }
  }

  function getVignette() {
    if (!ctx) return null;
    if (vignette) return vignette;
    const g = ctx.createRadialGradient(
      window.innerWidth * 0.2,
      window.innerHeight * 0.15,
      40,
      window.innerWidth * 0.5,
      window.innerHeight * 0.6,
      Math.max(window.innerWidth, window.innerHeight)
    );
    g.addColorStop(0, "rgba(255,42,58,0.045)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    vignette = g;
    return g;
  }

  function drawParticles() {
    if (!canvas || !ctx) return;
    if (perfMode) {
      particlesRunning = false;
      cancelAnimationFrame(raf);
      return;
    }
    if (document.hidden) {
      particlesRunning = false;
      cancelAnimationFrame(raf);
      return;
    }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // soft vignette
    const grad = getVignette();
    if (grad) ctx.fillStyle = grad;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Per-particle glow is costly; keep it subtle.
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(255,42,58,0.18)";

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = window.innerWidth + 20;
      if (p.x > window.innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = window.innerHeight + 20;
      if (p.y > window.innerHeight + 20) p.y = -20;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 42, 58, ${p.a})`;
      ctx.fill();
    }

    // Subtle links for depth (intentionally capped to avoid O(n^2) cost).
    ctx.shadowBlur = 0;
    const maxLinksPerParticle = 6;
    for (let i = 0; i < particles.length; i++) {
      let links = 0;
      for (let j = i + 1; j < particles.length; j++) {
        if (links >= maxLinksPerParticle) break;
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 110) continue;
        const alpha = (1 - dist / 110) * 0.06;
        ctx.strokeStyle = `rgba(255, 42, 58, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        links++;
      }
    }

    particlesRunning = true;
    raf = requestAnimationFrame(drawParticles);
  }

  function startParticles() {
    if (prefersReducedMotion) return;
    if (!canvas || !ctx) return;
    if (perfMode) return;
    if (particlesRunning) return;
    resizeCanvas();
    initParticles();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawParticles);
  }

  function stopParticles() {
    particlesRunning = false;
    cancelAnimationFrame(raf);
  }

  window.addEventListener(
    "resize",
    () => {
      if (!canvas || !ctx) return;
      resizeCanvas();
      initParticles();
      vignette = null;
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopParticles();
    else startParticles();
  });

  // --- Lightweight perf monitor -------------------------------------------
  // If the page can't hold a reasonable framerate shortly after load,
  // switch off the heaviest effects automatically.
  function measureAndAdaptPerf() {
    if (prefersReducedMotion) {
      setPerfMode(true);
      return;
    }

    const sampleMs = 1200;
    const start = performance.now();
    let frames = 0;
    let last = start;
    let worstDt = 0;

    function tick(now) {
      frames++;
      const dt = now - last;
      last = now;
      if (dt > worstDt) worstDt = dt;
      if (now - start < sampleMs) {
        requestAnimationFrame(tick);
        return;
      }

      const fps = (frames * 1000) / sampleMs;
      // Heuristic: < 45fps or large stutters => enable perf mode.
      if (fps < 45 || worstDt > 55) setPerfMode(true);
    }

    requestAnimationFrame(tick);
  }

  // --- Boot ---------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    updateToTop();
    runSearch();
    startParticles();
    measureAndAdaptPerf();
    loadDonorsFromServer();

    // Let the pulse land for a moment, then fade loader.
    window.setTimeout(hideLoader, prefersReducedMotion ? 100 : 650);
  });
})();

