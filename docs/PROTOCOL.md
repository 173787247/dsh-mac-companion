# Companion protocol (v1)

Shared by **dsh-mac-companion** and **dsh-device-bridge**.

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/v1/health` | Liveness + capability list |
| POST | `/v1/invoke` | Run one allowlisted action |

### GET /v1/health

```json
{ "ok": true, "kind": "mac", "version": "0.1.0", "capabilities": ["notify", "shortcut", "clipboard_read"] }
```

`kind` examples: `mac`, `phone`, `aix-agent`, `generic`.

### POST /v1/invoke

```json
{ "action": "notify", "args": { "title": "dsh", "body": "done" }, "confirm": false }
```

```json
{ "ok": true, "result": {} }
```

Destructive actions require `confirm: true` on both the dsh plugin and the companion.
