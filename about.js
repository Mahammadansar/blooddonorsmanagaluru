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

  // Loader hide + reveal content
  const loader = $("#loader");
  const hideLoader = () => {
    if (!loader) return;
    loader.classList.add("loader--hide");
    window.setTimeout(() => loader.remove(), 700);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
    // Ensure flag emojis render consistently (some systems show SA/AE codes instead).
    window.twemoji?.parse(document.body, { folder: "svg", ext: ".svg" });
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("reveal--in"));
    window.setTimeout(hideLoader, 450);
  });
})();

