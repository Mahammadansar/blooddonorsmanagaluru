import crypto from "node:crypto";

/** Access phrase required to generate certificates. Edit this value for your org. */
const HARDCODED_CERTIFICATE_ACCESS_CODE = "BDM@13";

export function expectedCertificateAccessCode() {
  const fromEnv = process.env.CERTIFICATE_ACCESS_CODE;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return HARDCODED_CERTIFICATE_ACCESS_CODE;
}

/** @param {string} entered */
export function certificateAccessCodeValid(entered) {
  const exp = expectedCertificateAccessCode();
  const got = String(entered || "").trim();
  if (!got || !exp || got.length !== exp.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got, "utf8"), Buffer.from(exp, "utf8"));
  } catch {
    return false;
  }
}
