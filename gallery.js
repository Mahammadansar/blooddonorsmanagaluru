(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const DEFAULT_TITLE = "BDM Memories";

  // Nav drawer
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

  // Loader + reveal
  const loader = $("#loader");
  const hideLoader = () => {
    if (!loader) return;
    loader.classList.add("loader--hide");
    window.setTimeout(() => loader.remove(), 700);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
    $$(".reveal").forEach((el) => el.classList.add("reveal--in"));
    window.setTimeout(hideLoader, 450);
  });

  const grid = $("#galleryGrid");
  const empty = $("#galleryEmpty");
  const count = $("#galleryCount");
  const query = $("#galleryQuery");
  const pager = $("#galleryPager");
  const prevPageBtn = $("#galleryPrevPage");
  const nextPageBtn = $("#galleryNextPage");
  const pageInfo = $("#galleryPageInfo");

  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lightboxCaption = $("#lightboxCaption");
  const lightboxClose = $("#lightboxClose");
  const lightboxPrev = $("#lightboxPrev");
  const lightboxNext = $("#lightboxNext");

  let items = [];
  let filtered = [];
  let activeIndex = -1;
  let pageIndex = 0;
  let pageSize = 12;

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function setCount(text) {
    if (!count) return;
    count.textContent = String(text || "");
  }

  function computePageSize() {
    // Smaller pages on phones so the gallery doesn't feel "endless"
    const w = document.documentElement.clientWidth || window.innerWidth || 0;
    return w <= 680 ? 6 : w <= 980 ? 9 : 12;
  }

  function clampPageIndex() {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    pageIndex = Math.min(Math.max(0, pageIndex), totalPages - 1);
  }

  function updatePager() {
    if (!pager || !prevPageBtn || !nextPageBtn || !pageInfo) return;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const showPager = filtered.length > pageSize;
    pager.hidden = !showPager;
    pageInfo.textContent = `Page ${totalPages ? pageIndex + 1 : 1} of ${totalPages}`;
    prevPageBtn.disabled = pageIndex <= 0;
    nextPageBtn.disabled = pageIndex >= totalPages - 1;
  }

  function render(list, offset = 0) {
    if (!grid || !empty) return;
    grid.innerHTML = "";
    empty.hidden = filtered.length !== 0;

    const total = filtered.length;
    const start = total ? offset + 1 : 0;
    const end = Math.min(offset + list.length, total);
    setCount(total ? `Showing ${start}–${end} of ${total} photos` : "0 photos");
    updatePager();

    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const src = encodeURI(String(it.src || ""));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "galleryItem";
      btn.setAttribute("aria-label", `Open photo: ${DEFAULT_TITLE}`);
      btn.dataset.index = String(offset + i);

      btn.innerHTML = `
        <img class="galleryItem__img" src="${src}" alt="${it.alt || ""}" loading="lazy" />
        <div class="galleryItem__overlay">
          <div class="galleryItem__title">${DEFAULT_TITLE}</div>
          <div class="galleryItem__meta">${[it.location, it.date].filter(Boolean).join(" • ")}</div>
        </div>
      `;

      grid.appendChild(btn);
    }
  }

  function applyFilter() {
    const q = norm(query?.value || "");
    if (!q) filtered = items.slice();
    else {
      filtered = items.filter((it) => {
        const hay = `${it.title || ""} ${it.location || ""} ${it.date || ""} ${it.alt || ""}`;
        return norm(hay).includes(q);
      });
    }
    pageIndex = 0;
    renderPage();
  }

  function renderPage() {
    pageSize = computePageSize();
    clampPageIndex();
    const start = pageIndex * pageSize;
    const page = filtered.slice(start, start + pageSize);
    render(page, start);
  }

  function openLightbox(i) {
    if (!lightbox || !lightboxImg || !lightboxCaption) return;
    if (i < 0 || i >= filtered.length) return;
    activeIndex = i;
    const it = filtered[i];
    lightboxImg.src = encodeURI(String(it.src || ""));
    lightboxImg.alt = it.alt || it.title || "";
    const cap = [DEFAULT_TITLE, it.location, it.date].filter(Boolean).join(" • ");
    lightboxCaption.textContent = cap;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.hidden = true;
    lightboxImg.src = "";
    activeIndex = -1;
    document.body.style.overflow = "";
  }

  function step(delta) {
    if (!filtered.length) return;
    const next = (activeIndex + delta + filtered.length) % filtered.length;
    openLightbox(next);
  }

  grid?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".galleryItem") : null;
    if (!btn) return;
    const idx = Number(btn.getAttribute("data-index") || "-1");
    if (!Number.isFinite(idx) || idx < 0) return;
    openLightbox(idx);
  });

  query?.addEventListener("input", applyFilter);

  prevPageBtn?.addEventListener("click", () => {
    pageIndex -= 1;
    renderPage();
    grid?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  nextPageBtn?.addEventListener("click", () => {
    pageIndex += 1;
    renderPage();
    grid?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  window.addEventListener("resize", () => {
    // Keep the current item range stable when page size changes across breakpoints.
    const firstIndex = pageIndex * pageSize;
    pageSize = computePageSize();
    pageIndex = pageSize ? Math.floor(firstIndex / pageSize) : 0;
    renderPage();
  });

  lightboxClose?.addEventListener("click", closeLightbox);
  lightboxPrev?.addEventListener("click", () => step(-1));
  lightboxNext?.addEventListener("click", () => step(1));
  lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!(e instanceof KeyboardEvent)) return;
    if (lightbox?.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  async function load() {
    try {
      const res = await fetch("./gallery/gallery.json", { cache: "no-store" });
      const data = await res.json();
      items = Array.isArray(data) ? data : [];
    } catch {
      items = [];
    }
    applyFilter();
  }

  load();
})();

