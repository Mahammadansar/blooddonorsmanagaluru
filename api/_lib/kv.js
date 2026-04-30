function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function getEnv(name) {
  const v = process.env[name];
  if (typeof v === "string" && v) return v;

  // Vercel Storage integrations can add a custom prefix, e.g.
  // `KV213_KV_REST_API_URL`. Detect that automatically.
  const suffix = `_${name}`;
  for (const k of Object.keys(process.env || {})) {
    if (!k.endsWith(suffix)) continue;
    const vv = process.env[k];
    if (typeof vv === "string" && vv) return vv;
  }

  return "";
}

async function kvFetch(path, init) {
  const urlBase = getEnv("KV_REST_API_URL");
  const token = getEnv("KV_REST_API_TOKEN");
  if (!urlBase || !token) return null;

  const res = await fetch(`${urlBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KV request failed (${res.status}) ${text}`);
  }
  return await res.json();
}

export async function kvGetJson(key, fallback) {
  const out = await kvFetch(`/get/${encodeURIComponent(key)}`);
  if (!out) return fallback;
  const val = out?.result ?? null;
  if (val == null) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

export async function kvSetJson(key, value) {
  const body = JSON.stringify({ key, value: JSON.stringify(value) });
  const out = await kvFetch("/set", { method: "POST", body });
  if (!out) return false;
  return true;
}

export function sendError(res, status, message) {
  return json(res, status, { error: message });
}

export function sendJson(res, data) {
  return json(res, 200, data);
}

export function sendJsonStatus(res, status, data) {
  return json(res, status, data);
}

