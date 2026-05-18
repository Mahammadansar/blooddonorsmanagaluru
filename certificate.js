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
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("reveal--in"));
    window.setTimeout(hideLoader, 900);
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
    if (shareBtn instanceof HTMLButtonElement) {
      shareBtn.disabled = !on;
      shareBtn.style.opacity = on ? "" : "0.7";
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
