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

  // Loader hide
  const loader = $("#loader");
  const hideLoader = () => {
    if (!loader) return;
    loader.classList.add("loader--hide");
    window.setTimeout(() => loader.remove(), 700);
  };
  document.addEventListener("DOMContentLoaded", () => {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
    // Certificate page uses the same `.reveal` CSS; ensure content is visible.
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("reveal--in"));
    window.setTimeout(hideLoader, 450);
  });

  // Form
  const form = $("#certForm");
  const phoneInput = $("#certPhone");
  const titleInput = $("#certTitle");
  const bloodBankInput = $("#certBloodBank");
  const dateInput = $("#certDate");
  const placeInput = $("#certPlace");
  const result = $("#certResult");
  const meta = $("#certMeta");
  const closeBtn = $("#certClose");
  const downloadA = $("#certDownload");
  const shareBtn = $("#certShare");

  let pdfBlob = null;
  let pdfName = "BDM_Certificate.pdf";
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
    revokeUrl();
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

  async function fetchCertificatePdf(phone) {
    // kept for backward compatibility (not used)
    const res = await fetch(`./api/certificate?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Certificate fetch failed");
    return await res.blob();
  }

  async function generateCertificateFromTemplate(payload) {
    const res = await fetch("./api/certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Certificate generate failed");
    return await res.blob();
  }

  function setActionsEnabled(on) {
    if (downloadA instanceof HTMLAnchorElement) {
      downloadA.style.pointerEvents = on ? "" : "none";
      downloadA.style.opacity = on ? "" : "0.65";
    }
    if (shareBtn instanceof HTMLButtonElement) {
      shareBtn.disabled = !on;
      shareBtn.style.opacity = on ? "" : "0.7";
    }
  }

  async function buildForPhone(phone) {
    revokeUrl();
    pdfBlob = null;
    setActionsEnabled(false);
    showToast("Fetching your registration…");

    const donor = await fetchDonorByPhone(phone);
    if (!donor) return null;

    const title = String(titleInput?.value || "Mr.").trim() || "Mr.";
    const bloodBank = String(bloodBankInput?.value || "").trim();
    const date = String(dateInput?.value || "").trim();
    const placeOverride = String(placeInput?.value || "").trim();
    const place = placeOverride || String(donor.area || "").trim();

    let ok = true;
    if (!bloodBank) {
      ok = false;
      setError("certBloodBank", "Enter blood bank name.");
    } else setError("certBloodBank", "");
    if (!date) {
      ok = false;
      setError("certDate", "Select donation date.");
    } else setError("certDate", "");
    if (!ok) return null;

    showToast("Generating certificate…");
    const blob = await generateCertificateFromTemplate({
      phone,
      title,
      bloodBank,
      donationDate: date,
      place,
    });
    if (!blob) return null;
    pdfBlob = blob;
    pdfName = `BDM_Certificate_${safeFilePart(donor.name)}.pdf`;
    objectUrl = URL.createObjectURL(pdfBlob);
    if (downloadA instanceof HTMLAnchorElement) {
      downloadA.href = objectUrl;
      downloadA.download = pdfName;
    }
    setActionsEnabled(true);
    return donor;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = String(phoneInput?.value || "").replace(/\s+/g, "");

    if (!/^\d{10}$/.test(phone)) {
      setError("certPhone", "Enter a valid 10-digit phone number.");
      return;
    }
    setError("certPhone", "");

    try {
      const donor = await buildForPhone(phone);
      if (!donor) {
        // Donor missing OR missing required fields is handled with per-field errors
        if (!/^\d{10}$/.test(phone)) showToast("Enter a valid phone.");
        else showToast("Could not generate certificate. Check inputs or registration.");
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
    } catch {
      showToast("Could not generate certificate. Is the server running?");
    }
  });

  shareBtn?.addEventListener("click", async () => {
    if (!pdfBlob) {
      showToast("Certificate not ready yet.");
      return;
    }
    const file = new File([pdfBlob], pdfName, { type: "application/pdf" });
    const shareData = {
      title: "Blood Donor Registration Certificate",
      text: "BLOOD DONORS MANGALURU (R) — DONATE BLOOD DONATE LIFE",
      files: [file],
    };

    try {
      if (navigator.canShare?.(shareData) && navigator.share) {
        await navigator.share(shareData);
        showToast("Shared successfully.");
        return;
      }
    } catch {
      // fall through
    }
    showToast("Sharing not supported here. Download and share manually.");
  });
})();

