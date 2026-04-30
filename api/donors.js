import { cleanDonor, readDonors, validateDonor, writeDonors } from "./_lib/donors.js";
import { sendError, sendJson, sendJsonStatus } from "./_lib/kv.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const donors = await readDonors();
    return sendJson(res, { donors });
  }

  if (req.method === "POST") {
    const donor = cleanDonor(req.body);
    const err = validateDonor(donor);
    if (err) return sendError(res, 400, err);

    const donors = await readDonors();
    const existingIdx = donors.findIndex((d) => String(d?.phone || "") === donor.phone);

    if (existingIdx >= 0) donors[existingIdx] = { ...donors[existingIdx], ...donor };
    else donors.unshift(donor);

    await writeDonors(donors);
    return sendJsonStatus(res, 201, { donor });
  }

  res.setHeader("Allow", "GET, POST");
  return sendError(res, 405, "Method Not Allowed");
}

