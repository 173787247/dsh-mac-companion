import { listDevices, resolveDevice, health, invoke } from "./lib/companion_client.js";

export const name = "dsh-mac-companion";
export const inject = ["tools", "systemPrompt"];

function positive(v, d) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function macDevices(config) {
  if (Array.isArray(config.devices) && config.devices.length) return listDevices(config.devices);
  const baseUrl = config.baseUrl || process.env.DSH_MAC_COMPANION_URL || "http://127.0.0.1:18765";
  return listDevices([
    {
      id: "mac",
      baseUrl,
      kind: "mac",
      token: config.token || process.env.DSH_MAC_COMPANION_TOKEN || "",
      allowActions: config.allowActions,
    },
  ]);
}

export function apply(ctx, config = {}) {
  if (config.enabled === false) {
    console.log("[dsh-mac-companion] disabled");
    return;
  }
  const timeoutMs = positive(config.timeoutMs, 30_000);
  const devices = macDevices(config);
  const allowActions = Array.isArray(config.allowActions) ? config.allowActions.map(String) : [];
  console.log(`[dsh-mac-companion] devices=${devices.length} base=${devices[0]?.baseUrl || "-"}`);

  ctx.systemPrompt.section({
    name: "tool:mac-companion",
    order: 141,
    text: "dsh-mac-companion calls a macOS companion daemon over HTTP (/v1/health, /v1/invoke). Start companion/server.py on the Mac. Prefer mac_companion_status before notify/shortcut.",
  });

  ctx.tools.register({
    name: "mac_companion_status",
    description: "Probe macOS companion /v1/health.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { deviceId: { type: "string" } },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        const device = resolveDevice(devices, args.deviceId);
        const h = await health(device, { timeoutMs });
        return { ok: h.ok, device: { id: device.id, baseUrl: device.baseUrl, kind: device.kind }, health: h };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          hint: "Start companion/server.py on the Mac",
        };
      }
    },
    presentCall: () => ({ card: "generic", title: "mac companion status" }),
    presentResult: (_a, r) => ({ card: "generic", title: "mac companion status", content: r.content }),
  });

  ctx.tools.register({
    name: "mac_notify",
    description: "Show a macOS notification via companion action=notify.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["body"],
      properties: {
        deviceId: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
      },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        const device = resolveDevice(devices, args.deviceId);
        return await invoke(device, {
          action: "notify",
          args: { title: args.title || "dsh", body: String(args.body) },
          timeoutMs,
          allowActions,
        });
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "mac notify" }),
    presentResult: (_a, r) => ({ card: "generic", title: "mac notify", content: r.content }),
  });

  ctx.tools.register({
    name: "mac_run_shortcut",
    description: "Run a macOS Shortcut by name via companion action=shortcut.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        deviceId: { type: "string" },
        name: { type: "string", description: "Shortcuts app name" },
        input: { type: "string" },
        confirm: { type: "boolean" },
      },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        const device = resolveDevice(devices, args.deviceId);
        return await invoke(device, {
          action: "shortcut",
          args: { name: String(args.name), input: args.input || "" },
          confirm: args.confirm === true,
          timeoutMs,
          allowActions,
        });
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "mac shortcut" }),
    presentResult: (_a, r) => ({ card: "generic", title: "mac shortcut", content: r.content }),
  });
}
