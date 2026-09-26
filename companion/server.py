#!/usr/bin/env python3
"""Minimal macOS companion for dsh-mac-companion (stdlib only).

  python3 companion/server.py --port 18765 --token secret
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CAPABILITIES = ["notify", "shortcut", "clipboard_read", "clipboard_write", "health"]


def run_osascript(script: str) -> str:
    out = subprocess.check_output(["osascript", "-e", script], stderr=subprocess.STDOUT, text=True)
    return out.strip()


class Handler(BaseHTTPRequestHandler):
    token = ""

    def _auth(self) -> bool:
        if not self.token:
            return True
        return self.headers.get("Authorization") == f"Bearer {self.token}"

    def _json(self, code: int, obj: dict) -> None:
        raw = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        if not self._auth():
            return self._json(401, {"ok": False, "error": "unauthorized"})
        if self.path.split("?")[0] != "/v1/health":
            return self._json(404, {"ok": False, "error": "not found"})
        self._json(
            200,
            {
                "ok": True,
                "kind": "mac",
                "version": "0.1.0",
                "capabilities": CAPABILITIES,
                "platform": sys.platform,
            },
        )

    def do_POST(self) -> None:  # noqa: N802
        if not self._auth():
            return self._json(401, {"ok": False, "error": "unauthorized"})
        if self.path.split("?")[0] != "/v1/invoke":
            return self._json(404, {"ok": False, "error": "not found"})
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n) or b"{}")
        action = str(body.get("action") or "")
        args = body.get("args") or {}
        confirm = bool(body.get("confirm"))
        try:
            if action == "notify":
                title = str(args.get("title") or "dsh")
                text = str(args.get("body") or "")
                script = f"display notification {json.dumps(text)} with title {json.dumps(title)}"
                run_osascript(script)
                return self._json(200, {"ok": True, "result": {"notified": True}})
            if action == "shortcut":
                if not confirm:
                    return self._json(400, {"ok": False, "error": "shortcut requires confirm=true"})
                name = str(args.get("name") or "")
                if not name:
                    return self._json(400, {"ok": False, "error": "name required"})
                cmd = ["shortcuts", "run", name]
                inp = args.get("input")
                if inp:
                    p = subprocess.run(cmd, input=str(inp), text=True, capture_output=True, check=False)
                else:
                    p = subprocess.run(cmd, text=True, capture_output=True, check=False)
                return self._json(
                    200,
                    {
                        "ok": p.returncode == 0,
                        "result": {
                            "code": p.returncode,
                            "stdout": (p.stdout or "")[-4000:],
                            "stderr": (p.stderr or "")[-2000:],
                        },
                    },
                )
            if action == "clipboard_read":
                text = run_osascript("the clipboard as text")
                return self._json(200, {"ok": True, "result": {"text": text[:8000]}})
            if action == "clipboard_write":
                if not confirm:
                    return self._json(400, {"ok": False, "error": "confirm=true required"})
                raw = str((args or {}).get("text") or "")[:8000]
                # Escape for AppleScript string literal
                esc = raw.replace("\\", "\\\\").replace('"', '\\"')
                run_osascript(f'set the clipboard to "{esc}"')
                return self._json(200, {"ok": True, "result": {"chars": len(raw)}})
            if action == "health":
                return self._json(200, {"ok": True, "result": {"capabilities": CAPABILITIES}})
            return self._json(400, {"ok": False, "error": f"unknown action: {action}"})
        except Exception as e:  # noqa: BLE001
            return self._json(500, {"ok": False, "error": str(e)})

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=18765)
    ap.add_argument("--token", default=os.environ.get("DSH_MAC_COMPANION_TOKEN", ""))
    args = ap.parse_args()
    Handler.token = args.token
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(
        f"dsh-mac-companion listening on http://{args.host}:{args.port} token={'set' if args.token else 'off'}",
        flush=True,
    )
    httpd.serve_forever()


if __name__ == "__main__":
    main()
