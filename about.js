(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  // Mobile nav
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
  navDrawer?.addEventListener("click", (e) => {
    const a = (e.target instanceof Element && e.target.closest("a")) || null;
    if (!a) return;
    setDrawer(false);
  });

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  function staggerReveal() {
    const els = document.querySelectorAll(".reveal");
    if (prefersReducedMotion) {
      els.forEach((el) => el.classList.add("reveal--in"));
      return;
    }
    els.forEach((el, i) => {
      window.setTimeout(() => el.classList.add("reveal--in"), i * 85);
    });
  }

  // Loader hide + reveal content (after loader fades so animations are visible)
  const loader = $("#loader");
  const hideLoader = () => {
    if (!loader) {
      staggerReveal();
      return;
    }
    loader.classList.add("loader--hide");
    window.setTimeout(staggerReveal, 120);
    window.setTimeout(() => loader.remove(), 700);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
    // Ensure flag emojis render consistently (some systems show SA/AE codes instead).
    window.twemoji?.parse(document.body, { folder: "svg", ext: ".svg" });
    window.setTimeout(hideLoader, prefersReducedMotion ? 100 : 900);
  });
})();

