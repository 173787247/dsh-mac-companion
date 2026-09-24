export function listDevices(devices) {
  return (Array.isArray(devices) ? devices : [])
    .map((x) => ({
      id: String(x.id || ""),
      baseUrl: String(x.baseUrl || "").replace(/\/$/, ""),
      kind: String(x.kind || "generic"),
      token: x.token ? String(x.token) : process.env.DSH_COMPANION_TOKEN || "",
      allowActions: Array.isArray(x.allowActions) ? x.allowActions.map(String) : null,
    }))
    .filter((x) => x.id && x.baseUrl);
}

export function resolveDevice(devices, id) {
  const list = listDevices(devices);
  if (!list.length) throw new Error("no devices configured");
  if (!id) {
    if (list.length === 1) return list[0];
    throw new Error(`deviceId required; known: ${list.map((d) => d.id).join(", ")}`);
  }
  const hit = list.find((d) => d.id === id);
  if (!hit) throw new Error(`unknown deviceId=${id}`);
  return hit;
}

export async function health(device, { timeoutMs = 10_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { Accept: "application/json" };
    if (device.token) headers.Authorization = `Bearer ${device.token}`;
    const res = await fetch(`${device.baseUrl}/v1/health`, { signal: ctrl.signal, headers });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && body.ok !== false, status: res.status, ...body };
  } finally {
    clearTimeout(t);
  }
}

export async function invoke(
  device,
  { action, args = {}, confirm = false, timeoutMs = 30_000, allowActions } = {},
) {
  const act = String(action || "");
  if (!act) throw new Error("action required");
  const allow = allowActions || device.allowActions;
  if (Array.isArray(allow) && allow.length && !allow.includes(act)) {
    throw new Error(`action not allowlisted: ${act}`);
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { Accept: "application/json", "Content-Type": "application/json" };
    if (device.token) headers.Authorization = `Bearer ${device.token}`;
    const res = await fetch(`${device.baseUrl}/v1/invoke`, {
      method: "POST",
      signal: ctrl.signal,
      headers,
      body: JSON.stringify({ action: act, args, confirm: confirm === true }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && body.ok !== false, status: res.status, action: act, ...body };
  } finally {
    clearTimeout(t);
  }
}
