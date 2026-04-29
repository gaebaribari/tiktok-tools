#!/usr/bin/env python3
import sys
import json
import time
from curl_cffi import requests

IMPERSONATE_PROFILES = [
    "safari17_2_ios",
    "safari18_0_ios",
    "chrome131",
    "chrome124",
]

MIN_VALID_LENGTH = 10_000
MAX_ATTEMPTS = 5


def fetch(url: str):
    for attempt in range(MAX_ATTEMPTS):
        profile = IMPERSONATE_PROFILES[attempt % len(IMPERSONATE_PROFILES)]
        try:
            r = requests.get(url, impersonate=profile, timeout=15)
        except Exception as e:
            sys.stderr.write(f"attempt {attempt+1} ({profile}) error: {e}\n")
            time.sleep(0.5 + attempt * 0.5)
            continue
        if (
            r.status_code == 200
            and len(r.text) >= MIN_VALID_LENGTH
            and "UNIVERSAL_DATA_FOR_REHYDRATION" in r.text
        ):
            return r.text
        sys.stderr.write(
            f"attempt {attempt+1} ({profile}) blocked: status={r.status_code} len={len(r.text)}\n"
        )
        time.sleep(0.5 + attempt * 0.5)
    return None


def daemon():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            url = req.get("url", "")
            if not url:
                resp = {"ok": False, "error": "missing url"}
            else:
                html = fetch(url)
                resp = {"ok": True, "html": html} if html else {"ok": False, "error": "fetch failed"}
        except Exception as e:
            resp = {"ok": False, "error": str(e)}
        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--daemon":
        daemon()
        return
    if len(sys.argv) < 2:
        sys.stderr.write("usage: fetch_tiktok_html.py <url> | --daemon\n")
        sys.exit(2)
    html = fetch(sys.argv[1])
    if html is None:
        sys.exit(1)
    sys.stdout.write(html)


if __name__ == "__main__":
    main()
