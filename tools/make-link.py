#!/usr/bin/env python3
"""Build the one-time import link from the private events file.

The events never go into the public repo: they travel in the part of the URL
after '#', which the browser does not send to the server. Open the printed
link in Chrome on the phone; the app asks to load the events and then removes
them from the address bar.

    python3 tools/make-link.py                       # private/events.json, GitHub Pages
    python3 tools/make-link.py --base http://localhost:8000/
"""
import argparse
import base64
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_BASE = 'https://rsakovich.github.io/calendar/'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('file', nargs='?', default=str(ROOT / 'private' / 'events.json'))
    ap.add_argument('--base', default=DEFAULT_BASE, help=f'app address (default {DEFAULT_BASE})')
    args = ap.parse_args()

    events = json.loads(pathlib.Path(args.file).read_text(encoding='utf-8'))
    if not isinstance(events, list):
        raise SystemExit('expected a JSON list of events')
    raw = json.dumps(events, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    data = base64.urlsafe_b64encode(raw).decode('ascii').rstrip('=')
    print(f'{args.base}#data={data}')


if __name__ == '__main__':
    main()
