import { kvGetJson, kvSetJson } from "./kv.js";

const KEY = "bdm:donors";

export function cleanDonor(d) {
  const name = String(d?.name || "").trim();
  const phone = String(d?.phone || "").replace(/\s+/g, "");
  const blood = String(d?.blood || "").trim();
  const area = String(d?.area || "").trim();
  return { name, phone, blood, area };
}

export function validateDonor(d) {
  if (!d.name || d.name.length < 2) return "Invalid name";
  if (!/^\d{10}$/.test(d.phone)) return "Invalid phone (must be 10 digits)";
  if (!d.blood) return "Invalid blood group";
  if (!d.area || d.area.length < 2) return "Invalid area";
  return null;
}

export async function readDonors() {
  const donors = await kvGetJson(KEY, []);
  return Array.isArray(donors) ? donors : [];
}

export async function writeDonors(list) {
  await kvSetJson(KEY, Array.isArray(list) ? list : []);
}

