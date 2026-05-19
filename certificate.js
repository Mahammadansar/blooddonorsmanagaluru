(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  // Toast
  const toast = $("#toast");
  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove("toast--show");
    void toast.offsetWidth;
    toast.classList.add("toast--show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove("toast--show");
    }, 1800);
  }

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

  // Loader hide (reveal after loader fades so animations are visible)
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

  // Form
  const form = $("#certForm");
  const phoneInput = $("#certPhone");
  const titleInput = $("#certTitle");
  const bloodBankInput = $("#certBloodBank");
  const dateInput = $("#certDate");
  const placeInput = $("#certPlace");
  const accessCodeInput = $("#certAccessCode");
  const result = $("#certResult");
  const meta = $("#certMeta");
  const closeBtn = $("#certClose");
  const downloadA = $("#certDownload");
  const downloadPngBtn = $("#certDownloadPng");
  const downloadJpgBtn = $("#certDownloadJpg");
  const shareBtn = $("#certShare");

  const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";
  let pdfjsReady = null;

  let pdfBlob = null;
  let pdfName = "BDM_Certificate.pdf";
  let imageBaseName = "BDM_Certificate";
  let pngBlob = null;
  let jpgBlob = null;
  let objectUrl = null;

  function setError(id, message) {
    const err = $(`[data-error-for="${id}"]`);
    const input =
      id === "certPhone"
        ? phoneInput
        : id === "certTitle"
          ? titleInput
          : id === "certBloodBank"
            ? bloodBankInput
            : id === "certDate"
              ? dateInput
              : id === "certPlace"
                ? placeInput
                : id === "certAccessCode"
                  ? accessCodeInput
                  : null;
    input?.closest(".field")?.classList.toggle("field--invalid", Boolean(message));
    if (err) err.textContent = message || "";
  }

  function revokeUrl() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }

  function closeReady() {
    if (!result) return;
    result.hidden = true;
    if (meta) meta.textContent = "";
    pdfBlob = null;
    pngBlob = null;
    jpgBlob = null;
    revokeUrl();
  }

  function ensurePdfJs() {
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise((resolve, reject) => {
      const lib = globalThis.pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
        resolve(lib);
        return;
      }
      const script = document.createElement("script");
      script.src = `${PDFJS_CDN}/pdf.min.js`;
      script.onload = () => {
        const loaded = globalThis.pdfjsLib;
        if (!loaded) {
          reject(new Error("PDF renderer failed to load"));
          return;
        }
        loaded.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
        resolve(loaded);
      };
      script.onerror = () => reject(new Error("PDF renderer failed to load"));
      document.head.appendChild(script);
    });
    return pdfjsReady;
  }

  async function pdfBlobToCanvas(blob, scale = 2) {
    const pdfjs = await ensurePdfJs();
    const data = await blob.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  }

  function canvasToBlob(canvas, type, quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image export failed"))),
        type,
        quality,
      );
    });
  }

  async function getImageBlob(format) {
    if (!pdfBlob) throw new Error("Certificate not ready");
    if (format === "png" && pngBlob) return pngBlob;
    if (format === "jpeg" && jpgBlob) return jpgBlob;
    const canvas = await pdfBlobToCanvas(pdfBlob, 2);
    const type = format === "png" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, type, 0.92);
    if (format === "png") pngBlob = blob;
    else jpgBlob = blob;
    return blob;
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadImage(format) {
    if (!pdfBlob) {
      showToast("Certificate not ready yet.");
      return;
    }
    const ext = format === "png" ? "png" : "jpg";
    const label = format === "png" ? "PNG" : "JPG";
    try {
      showToast(`Preparing ${label}…`);
      const blob = await getImageBlob(format);
      triggerDownload(blob, `${imageBaseName}.${ext}`);
      showToast(`${label} downloaded.`);
    } catch {
      showToast(`Could not create ${label}. Try PDF download.`);
    }
  }

  const SHARE_TITLE = "Blood Donor Registration Certificate";
  const SHARE_TEXT = "BLOOD DONORS MANGALURU (R) — DONATE BLOOD DONATE LIFE";

  function prewarmShareImage() {
    if (!pdfBlob) return;
    getImageBlob("jpeg").catch(() => {});
  }

  async function tryNativeShare(file) {
    if (!navigator.share) return false;
    const payloads = [
      { title: SHARE_TITLE, text: SHARE_TEXT, files: [file] },
      { files: [file] },
    ];
    for (const shareData of payloads) {
      try {
        if (navigator.canShare && !navigator.canShare(shareData)) continue;
        await navigator.share(shareData);
        return true;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") throw e;
      }
    }
    return false;
  }

  async function shareCertificate() {
    if (!pdfBlob) {
      showToast("Certificate not ready yet.");
      return;
    }

    const filePlans = [
      async () => {
        const blob = await getImageBlob("jpeg");
        return new File([blob], `${imageBaseName}.jpg`, { type: "image/jpeg" });
      },
      async () => {
        const blob = await getImageBlob("png");
        return new File([blob], `${imageBaseName}.png`, { type: "image/png" });
      },
      async () => new File([pdfBlob], pdfName, { type: "application/pdf" }),
    ];

    showToast("Preparing to share…");

    for (const buildFile of filePlans) {
      try {
        const file = await buildFile();
        const shared = await tryNativeShare(file);
        if (shared) {
          showToast("Shared successfully.");
          return;
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    showToast("Sharing not supported here. Download PNG/JPG and share manually.");
  }

  closeBtn?.addEventListener("click", closeReady);
  document.addEventListener("keydown", (e) => {
    if (!(e instanceof KeyboardEvent)) return;
    if (e.key === "Escape") closeReady();
  });

  function safeFilePart(s) {
    return String(s || "")
      .trim()
      .replace(/[^\w\- ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40) || "Donor";
  }

  async function fetchDonorByPhone(phone) {
    const res = await fetch(`./api/donor?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    return data?.donor || null;
  }

  async function readApiErrorMessage(res) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => ({}));
      return String(j?.error || j?.message || res.statusText || "Request failed");
    }
    const t = await res.text().catch(() => "");
    return t || res.statusText || "Request failed";
  }

  async function assertBlobIsPdf(blob) {
    const head = await blob.slice(0, 5).arrayBuffer();
    const sig = new TextDecoder("ascii", { fatal: false }).decode(head);
    if (!sig.startsWith("%PDF-")) {
      throw new Error("Invalid access code or server error (unexpected response).");
    }
  }

  async function generateCertificateFromTemplate(payload) {
    const res = await fetch("./api/certificate", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 404) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok) {
      const msg = await readApiErrorMessage(res);
      throw new Error(msg);
    }
    if (!ct.includes("application/pdf")) {
      const msg = await readApiErrorMessage(res);
      throw new Error(msg || "Invalid access code or server error.");
    }
    const blob = await res.blob();
    await assertBlobIsPdf(blob);
    return blob;
  }

  function setActionsEnabled(on) {
    if (downloadA instanceof HTMLAnchorElement) {
      downloadA.style.pointerEvents = on ? "" : "none";
      downloadA.style.opacity = on ? "" : "0.65";
    }
    for (const btn of [downloadPngBtn, downloadJpgBtn, shareBtn]) {
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = !on;
        btn.style.opacity = on ? "" : "0.7";
      }
    }
  }

  function validateCertFields() {
    const bloodBank = String(bloodBankInput?.value || "").trim();
    const date = String(dateInput?.value || "").trim();
    let ok = true;
    if (!bloodBank) {
      ok = false;
      setError("certBloodBank", "Enter blood bank name.");
    } else setError("certBloodBank", "");
    if (!date) {
      ok = false;
      setError("certDate", "Select donation date.");
    } else setError("certDate", "");
    return ok;
  }

  async function buildForPhone(phone) {
    revokeUrl();
    pdfBlob = null;
    pngBlob = null;
    jpgBlob = null;
    setActionsEnabled(false);
    if (result instanceof HTMLElement) result.hidden = true;
    if (meta) meta.textContent = "";

    const donor = await fetchDonorByPhone(phone);
    if (!donor) return null;

    if (!validateCertFields()) return null;

    const accessRaw = String(accessCodeInput?.value || "").trim();
    if (!accessRaw) {
      setError("certAccessCode", "Enter the access code.");
      showToast("Enter the access code.");
      return null;
    }
    setError("certAccessCode", "");

    const title = String(titleInput?.value || "Mr.").trim() || "Mr.";
    const bloodBank = String(bloodBankInput?.value || "").trim();
    const date = String(dateInput?.value || "").trim();
    const placeOverride = String(placeInput?.value || "").trim();
    const place = placeOverride || String(donor.area || "").trim();

    showToast("Generating certificate…");
    const blob = await generateCertificateFromTemplate({
      phone,
      title,
      bloodBank,
      donationDate: date,
      place,
      certCode: accessRaw,
    });
    if (!blob) return null;
    pdfBlob = blob;
    imageBaseName = `BDM_Certificate_${safeFilePart(donor.name)}`;
    pdfName = `${imageBaseName}.pdf`;
    objectUrl = URL.createObjectURL(pdfBlob);
    if (downloadA instanceof HTMLAnchorElement) {
      downloadA.href = objectUrl;
      downloadA.download = pdfName;
    }
    setActionsEnabled(true);
    prewarmShareImage();
    return donor;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (result instanceof HTMLElement) result.hidden = true;
    if (meta) meta.textContent = "";

    const phone = String(phoneInput?.value || "").replace(/\s+/g, "");

    if (!/^\d{10}$/.test(phone)) {
      setError("certPhone", "Enter a valid 10-digit phone number.");
      return;
    }
    setError("certPhone", "");

    if (!validateCertFields()) return;

    try {
      const donor = await buildForPhone(phone);
      if (!donor) {
        showToast("Could not generate certificate. Check access code, inputs, or registration.");
        return;
      }
      const placeOverride = String(placeInput?.value || "").trim();
      const place = placeOverride || String(donor.area || "").trim();
      if (meta) {
        meta.innerHTML = `<div><strong>Name:</strong> ${String(donor.name || "")}</div>
<div><strong>Blood group:</strong> ${String(donor.blood || "")}</div>
<div><strong>Place:</strong> ${place}</div>
<div><strong>Blood bank:</strong> ${String(bloodBankInput?.value || "")}</div>
<div><strong>Date:</strong> ${String(dateInput?.value || "")}</div>
<div><strong>Phone:</strong> ${phone}</div>`;
      }
      if (result) result.hidden = false;
      showToast("Certificate ready.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      showToast(msg || "Could not generate certificate. Is the server running?");
    }
  });

  downloadPngBtn?.addEventListener("click", () => downloadImage("png"));
  downloadJpgBtn?.addEventListener("click", () => downloadImage("jpeg"));

  shareBtn?.addEventListener("click", () => shareCertificate());
})();
