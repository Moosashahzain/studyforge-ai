# StudyForge AI

An AI study assistant **and** a professional student developer portfolio — a complete, working web application. No build step, no database server, no account needed.

## What it is

- **Study Assistant** (`app.html`) — AI tutor chat, step-by-step math solver, study notes generator, quiz generator with real scoring, PDF/document study with page citations, study planner, flashcards, progress dashboard, searchable history, and settings (themes, English/اردو, FBISE curriculum option).
- **Portfolio** (`portfolio.html`) — hero, about, skills, education, achievements, certificates, projects (with a real StudyForge AI feature page), contact form, and a device-local admin editor. Content lives in `js/portfolio/config.js`.
- **Landing page** (`index.html`) — entry points to both.

## Honest capability summary

| Area | Status |
|---|---|
| Everything listed above | Works fully in the browser, offline after first load |
| AI Tutor | **Demo mode** by default: deterministic on-device logic, clearly labelled. Connect a real model via the optional server |
| PDF text extraction | Real (pdf.js vendored locally). Scanned-image PDFs need OCR — not included, and the app says so |
| Math solver | Real computed solutions with step-by-step working and verification badges |
| Portfolio contact form | Demo mode unless the server is configured (see SETUP.md) |
| Portfolio admin | PIN gate, prototype-grade (device-local), labelled as such |

## Run locally (no server)

Open `index.html` in any modern browser — or serve the folder:

```bash
cd studyforge-ai
python3 -m http.server 8080
# then open http://localhost:8080
```

## Run with the optional backend

```bash
cp .env.example .env   # then edit .env
node server/server.js
# open http://localhost:3000
```

The server adds: `/api/health`, `/api/chat` (live AI when `STUDYFORGE_AI_API_KEY` is set), `/api/contact` (when `CONTACT_ENABLED=1`). Without keys it serves the same demo-mode app.

## Tests

```bash
node --test tests/run.js tests/render-smoke.js   # 47 tests
```

See `docs/TESTING.md` for what is covered and what was actually run.

## Deploy

Any static host (GitHub Pages, Netlify, Vercel, nginx) can serve the folder as-is. For the live-AI and contact features, deploy `server/server.js` on Node hosting with environment variables from `.env.example`.

## Docs

- `docs/PLAN.md` — implementation plan and environment findings
- `docs/SETUP.md` — setup, env vars, enabling the real AI and contact delivery
- `docs/ARCHITECTURE.md` — code structure and data model
- `docs/TESTING.md` — test report
