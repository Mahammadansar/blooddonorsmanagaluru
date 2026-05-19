(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
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
    window.setTimeout(hideLoader, prefersReducedMotion ? 100 : 900);
  });
})();
