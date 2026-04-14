# PE Current Affairs — 300 MCQ Web App

A polished, mobile-first study app for the **Capt → Maj Promotion Exam Part 1 · General Knowledge (Current Affairs)**, covering the Dec 2025 – Apr 2026 window. 300 MCQs (150 Bangladesh + 150 International) with two study modes.

## Features

- **Learn Mode** — one question per screen, instant answer reveal with a short explanation, bookmarks, keyboard shortcuts, and resumable progress.
- **Practice Mode** — configurable exam session (length / pool / order / timer / optional negative marking), question palette with mark-for-review, autosave so a refresh doesn't lose your session, auto-submit on timer end.
- **Result screen** — score ring, section + category breakdown, full review (filter by wrong / skipped / correct), retry same set, retry wrong only.
- **Premium UI** — glass-card design, dark/light theme toggle, mobile-first layout (tested to 360px), keyboard-accessible (A–D / 1–4 / ← → / B / M), respects safe-area insets on phones.
- **Zero build step** — plain HTML + CSS + vanilla JS modules. Open `index.html` directly or serve the folder.

## Run locally

Any static server works. For example:

```bash
# Python
python -m http.server 8080

# or Node
npx serve .
```

Then open http://localhost:8080.

> Note: browsers block `fetch()` from `file://` URLs, so use a static server (don't double-click `index.html`).

## Regenerate questions from the markdown source

`data/questions.json` is generated from `Current_Affairs_300_MCQ_Practice_Set.md`. If the markdown changes:

```bash
node scripts/parse-md.js
```

The parser cross-validates every answer against the Quick-Reference Answer Grid at the bottom of the markdown file.

## Deploy

Any static host will serve this — GitHub Pages, Hostinger VPS (drop the folder into your web root), Netlify, Cloudflare Pages, etc.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `A`–`D` / `1`–`4` | Pick option |
| `←` / `→` | Prev / Next |
| `B` | Bookmark (Learn) |
| `M` | Mark for review (Practice) |

## Structure

```
index.html   learn.html   practice.html   result.html
assets/css/styles.css
assets/js/{app,learn,practice,result}.js
data/questions.json           # generated
scripts/parse-md.js           # MD → JSON
Current_Affairs_300_MCQ_Practice_Set.md   # source
```
