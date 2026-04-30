import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "200kb" }));

const DATA_PATH =
  process.env.DONORS_JSON_PATH ||
  (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, "donors.json") : "") ||
  path.join(__dirname, "..", "data", "donors.json");
const CERT_TEMPLATE_PATH = path.join(__dirname, "..", "BDM_Certificate.pdf");

async function readDonors() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeDonors(list) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2) + "\n", "utf8");
}

function cleanDonor(d) {
  const name = String(d?.name || "").trim();
  const phone = String(d?.phone || "").replace(/\s+/g, "");
  const blood = String(d?.blood || "").trim();
  const area = String(d?.area || "").trim();
  return { name, phone, blood, area };
}

function validateDonor(d) {
  if (!d.name || d.name.length < 2) return "Invalid name";
  if (!/^\d{10}$/.test(d.phone)) return "Invalid phone (must be 10 digits)";
  if (!d.blood) return "Invalid blood group";
  if (!d.area || d.area.length < 2) return "Invalid area";
  return null;
}

// API
app.get("/api/donors", async (_req, res) => {
  const donors = await readDonors();
  res.json({ donors });
});

app.get("/api/donor", async (req, res) => {
  const phone = String(req.query.phone || "").replace(/\s+/g, "");
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: "Invalid phone (must be 10 digits)" });
  const donors = await readDonors();
  const donor = donors.find((d) => String(d?.phone || "").replace(/\s+/g, "") === phone) || null;
  if (!donor) return res.status(404).json({ error: "Donor not found" });
  res.json({ donor });
});

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

// Returns a filled PDF using the provided blank template.
async function buildCertificatePdf({ phone, title, bloodBank, donationDate, place, donor }) {
  const templateBytes = await fs.readFile(CERT_TEMPLATE_PATH);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const { width: W, height: H } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const issued = formatDate(new Date(donationDate || Date.now()));
  const certId = makeCertificateId(phone);

  // Coordinates tuned for your BDM_Certificate.pdf (A4 landscape).
  const yName = H * 0.56; // Mr./Mrs. ______ line
  const yAt = H * 0.49; // at ______ line (slightly up)
  const yOn = H * 0.425; // on ______ line (slightly up; shares row with Blood Bank)

  // Move text start to the right to avoid overlapping printed labels
  const xName = W * 0.275; // after "Mr./Mrs."
  const xBlood = W * 0.77; // after "Blood Group"
  const xAt = W * 0.18; // after "at"
  const xOn = W * 0.18; // after "on"
  const xBloodBank = W * 0.49; // after "Blood Bank"

  const nameText = `${String(title || "Mr.").trim()} ${String(donor?.name || "").trim()}`.trim();
  page.drawText(nameText, { x: xName, y: yName, size: 15, font: fontBold, color: rgb(0.12, 0.12, 0.12) });
  page.drawText(String(donor?.blood || ""), { x: xBlood, y: yName, size: 15, font: fontBold, color: rgb(0.12, 0.12, 0.12) });

  page.drawText(String(place || ""), { x: xAt, y: yAt, size: 13, font, color: rgb(0.12, 0.12, 0.12) });
  page.drawText(String(bloodBank || ""), { x: xBloodBank, y: yOn, size: 12, font, color: rgb(0.12, 0.12, 0.12) });

  // "on" date at left of last line
  page.drawText(String(issued), { x: xOn, y: yOn, size: 13, font, color: rgb(0.12, 0.12, 0.12) });

  // Small ID (optional)
  page.drawText(`ID: ${certId}`, { x: 42, y: 26, size: 9, font, color: rgb(0.35, 0.35, 0.35) });

  return await pdfDoc.save();
}

app.post("/api/certificate", async (req, res) => {
  const phone = String(req.body?.phone || "").replace(/\s+/g, "");
  const title = String(req.body?.title || "Mr.").trim();
  const bloodBank = String(req.body?.bloodBank || "").trim();
  const donationDate = String(req.body?.donationDate || "").trim(); // YYYY-MM-DD
  const place = String(req.body?.place || "").trim();

  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: "Invalid phone (must be 10 digits)" });
  if (!bloodBank) return res.status(400).json({ error: "Blood bank required" });
  if (!donationDate) return res.status(400).json({ error: "Donation date required" });

  const donors = await readDonors();
  const donor = donors.find((d) => String(d?.phone || "").replace(/\s+/g, "") === phone) || null;
  if (!donor) return res.status(404).json({ error: "Donor not found" });

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
    return res.status(500).json({ error: "Could not build certificate PDF" });
  }

  const fileName = `BDM_Certificate_${String(donor.name || "Donor").trim().replace(/\s+/g, "_")}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.send(Buffer.from(out));
});

app.post("/api/donors", async (req, res) => {
  const donor = cleanDonor(req.body);
  const err = validateDonor(donor);
  if (err) return res.status(400).json({ error: err });

  const donors = await readDonors();
  const existingIdx = donors.findIndex((d) => String(d?.phone || "") === donor.phone);

  if (existingIdx >= 0) donors[existingIdx] = { ...donors[existingIdx], ...donor };
  else donors.unshift(donor);

  await writeDonors(donors);
  res.status(201).json({ donor });
});

// Serve the static site from repo root
app.use(express.static(path.join(__dirname, "..")));

const port = Number(process.env.PORT || 5174);
app.listen(port, () => {
  console.log(`BDM server running at http://localhost:${port}`);
});

