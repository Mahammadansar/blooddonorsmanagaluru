import { readDonors } from "./_lib/donors.js";
import { sendError, sendJson } from "./_lib/kv.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "Method Not Allowed");
  }

  const phone = String(req.query?.phone || "").replace(/\s+/g, "");
  if (!/^\d{10}$/.test(phone)) return sendError(res, 400, "Invalid phone (must be 10 digits)");

  const donors = await readDonors();
  const donor = donors.find((d) => String(d?.phone || "").replace(/\s+/g, "") === phone) || null;
  if (!donor) return sendError(res, 404, "Donor not found");
  return sendJson(res, { donor });
}

