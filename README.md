# calendar

Семейный календарь-круг: an offline PWA for a phone. It shows the year as a
circle of family events, like the printed version, highlights today and lets
you add, edit and delete events. No server and no accounts: the events live in
the phone's browser storage (`localStorage`, key `wheel.events.v1`).

## Files

| File | What it is |
| --- | --- |
| `index.html`, `app.js`, `style.css` | the app |
| `assets/seasons.webp` | season pictures in the centre |
| `manifest.webmanifest`, `icons/` | install as an app |
| `sw.js` | offline cache; a new version on the host is picked up on the next launch |
| `tools/make-link.py` | builds the one-time import link |
| `private/` | the family's events (git-ignored, never published) |

The circle's geometry and colours follow the printed version's generator
(`private/gen3.py`).

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Load the starting events

The repo and the site are public, so the app ships empty. The events travel in
a link, after `#`, which the browser never sends to the server:

```bash
python3 tools/make-link.py
```

Open the printed link **in Chrome** on the phone (not in a messenger's built-in
browser, which has its own storage). The app asks «Загрузить N событий?», saves
them and removes the data from the address bar. For a local test, add
`--base http://localhost:8000/`.

## Install on the phone

- Android: Chrome → menu → «Установить приложение».
- iPhone: Safari → «Поделиться» → «На экран Домой».
