#!/usr/bin/env python3
"""Life OS strežnik: streže zgrajeno aplikacijo (www/) in hrani podatke v enem JSON.

GET  /api/data  -> {"version": N, "data": {...}}
PUT  /api/data  <- {"version": N, "data": {...}}
     200 {"version": N+1}            če se N ujema s trenutno verzijo
     409 {"version": M, "data": ...} če je nekdo vmes shranil (odjemalec ponovi)
"""
import json
import os
import shutil
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WWW = os.environ.get("LIFEOS_WWW", "/opt/lifeos/www")
STATE = os.environ.get("STATE_DIRECTORY", "/var/lib/lifeos")
DATA = os.path.join(STATE, "data.json")
HISTORY = os.path.join(STATE, "zgodovina")
KEEP_DAYS = 60
MAX_BODY = 5 * 1024 * 1024

lock = threading.Lock()


def load():
    try:
        with open(DATA, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"version": 0, "data": None}


def snapshot():
    """Ena kopija na dan, hranjenih zadnjih KEEP_DAYS dni."""
    os.makedirs(HISTORY, exist_ok=True)
    target = os.path.join(HISTORY, time.strftime("%Y-%m-%d") + ".json")
    if os.path.exists(DATA) and not os.path.exists(target):
        shutil.copy2(DATA, target)
    days = sorted(os.listdir(HISTORY))
    for old in days[:-KEEP_DAYS]:
        os.remove(os.path.join(HISTORY, old))


def save(doc):
    snapshot()
    tmp = DATA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, DATA)


class Handler(SimpleHTTPRequestHandler):
    server_version = "LifeOS"
    sys_version = ""

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WWW, **kw)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/") and self.command == "GET":
            return
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        if not self.path.startswith("/api/"):
            if self.path.startswith("/assets/"):
                self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            else:
                self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/data":
            with lock:
                return self.send_json(200, load())
        if path in ("/tablica", "/tablica/"):
            self.path = "/tablica.html"
        elif not os.path.exists(os.path.join(WWW, path.lstrip("/"))):
            self.path = "/index.html"  # SPA
        return super().do_GET()

    def do_HEAD(self):
        self.do_GET()

    def do_PUT(self):
        if self.path.split("?", 1)[0] != "/api/data":
            return self.send_json(404, {"error": "ni"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.send_json(413, {"error": "velikost"})
        try:
            req = json.loads(self.rfile.read(length).decode("utf-8"))
            version, data = int(req["version"]), req["data"]
            if not isinstance(data, dict):
                raise ValueError
        except (ValueError, KeyError, TypeError):
            return self.send_json(400, {"error": "napačen zahtevek"})
        with lock:
            cur = load()
            if version != cur["version"]:
                return self.send_json(409, cur)
            new = {"version": cur["version"] + 1, "data": data, "saved": time.strftime("%Y-%m-%dT%H:%M:%S")}
            save(new)
        return self.send_json(200, {"version": new["version"]})


def main():
    host = os.environ.get("LIFEOS_HOST", "0.0.0.0")
    port = int(os.environ.get("LIFEOS_PORT", "8090"))
    os.makedirs(STATE, exist_ok=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
