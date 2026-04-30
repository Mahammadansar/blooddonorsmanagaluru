import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readDonors } from "./_lib/donors.js";
import { sendError } from "./_lib/kv.js";

function formatDate(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

function makeCertificateId(phone) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const last4 = String(phone).slice(-4);
  return `BDM-${y}${m}${day}-${last4}`;
}

async function buildCertificatePdf({ phone, title, bloodBank, donationDate, place, donor }) {
  const templatePath = path.join(process.cwd(), "BDM_Certificate.pdf");
  const templateBytes = await fs.readFile(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const { width: W, height: H } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const issued = formatDate(new Date(donationDate || Date.now()));
  const certId = makeCertificateId(phone);

  // Coordinates tuned for your BDM_Certificate.pdf (A4 landscape).
  const yName = H * 0.56;
  const yAt = H * 0.49;
  const yOn = H * 0.425;

  const xName = W * 0.275;
  const xBlood = W * 0.77;
  const xAt = W * 0.18;
  const xOn = W * 0.18;
  const xBloodBank = W * 0.49;

  const nameText = `${String(title || "Mr.").trim()} ${String(donor?.name || "").trim()}`.trim();
  page.drawText(nameText, { x: xName, y: yName, size: 15, font: fontBold, color: rgb(0.12, 0.12, 0.12) });
  page.drawText(String(donor?.blood || ""), { x: xBlood, y: yName, size: 15, font: fontBold, color: rgb(0.12, 0.12, 0.12) });

  page.drawText(String(place || ""), { x: xAt, y: yAt, size: 13, font, color: rgb(0.12, 0.12, 0.12) });
  page.drawText(String(bloodBank || ""), { x: xBloodBank, y: yOn, size: 12, font, color: rgb(0.12, 0.12, 0.12) });
  page.drawText(String(issued), { x: xOn, y: yOn, size: 13, font, color: rgb(0.12, 0.12, 0.12) });

  page.drawText(`ID: ${certId}`, { x: 42, y: 26, size: 9, font, color: rgb(0.35, 0.35, 0.35) });

  return await pdfDoc.save();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "Method Not Allowed");
  }

  const phone = String(req.body?.phone || "").replace(/\s+/g, "");
  const title = String(req.body?.title || "Mr.").trim();
  const bloodBank = String(req.body?.bloodBank || "").trim();
  const donationDate = String(req.body?.donationDate || "").trim(); // YYYY-MM-DD
  const place = String(req.body?.place || "").trim();

  if (!/^\d{10}$/.test(phone)) return sendError(res, 400, "Invalid phone (must be 10 digits)");
  if (!bloodBank) return sendError(res, 400, "Blood bank required");
  if (!donationDate) return sendError(res, 400, "Donation date required");

  const donors = await readDonors();
  const donor = donors.find((d) => String(d?.phone || "").replace(/\s+/g, "") === phone) || null;
  if (!donor) return sendError(res, 404, "Donor not found");

  let out;
  try {
    out = await buildCertificatePdf({
      phone,
      title,
      bloodBank,
      donationDate,
      place: place || donor.area,
      donor,
    });
  } catch {
    return sendError(res, 500, "Could not build certificate PDF");
  }

  const fileName = `BDM_Certificate_${String(donor.name || "Donor").trim().replace(/\s+/g, "_")}.pdf`;
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.end(Buffer.from(out));
}

