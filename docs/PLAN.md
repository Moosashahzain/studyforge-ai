# StudyForge AI — Implementation Plan

## Environment findings (2026-10-11)
- Node v24.20.0, npm 10.9.4, Python 3.12.3, git 2.43.0, sqlite3 — all available.
- Network available; pdf.js 3.11.174 vendored into `vendor/` (works offline).
- No AI API keys in environment → AI runs in **DEMO MODE** (clearly labelled). Provider
  abstraction supports a real OpenAI-compatible backend via the optional zero-dependency
  Node server (`server/server.js`) when `STUDYFORGE_AI_API_KEY` is set.
- No database server required: single-device prototype uses versioned localStorage with
  export/delete. Documented honestly as such.

## Architecture
- **Static frontend, zero build step** — runs by double-clicking or any static host.
  - `index.html` — landing page
  - `app.html` — Study Assistant SPA (hash router, 10 modules)
  - `portfolio.html` — portfolio (config-driven)
- `css/` — design tokens, base, components, layout, modules, print.
- `js/core/` — utils, store (localStorage), router, icons (inline SVG), i18n (en/ur).
- `js/ai/` — provider abstraction (`demo` | `server`), deterministic demo engine.
- `js/lib/` — framework-free shared logic, Node-testable: math solver, quiz engine,
  text analysis (summarizer), validators.
- `data/` — question banks, glossary, formula sheets, curriculum (incl. FBISE, disclaimed).
- `server/server.js` — optional zero-dependency Node server: static hosting,
  `GET /api/health`, `POST /api/chat` (proxies when key configured, else 501),
  `POST /api/contact` (validates; delivers when configured, else 501). Never claims
  to work without configuration.
- `tests/` — `node --test` suite for math, quiz scoring, validators, summarizer, store.

## Honest capability map
| Feature | Implementation |
|---|---|
| AI Tutor chat | Demo engine: math→real solver, summarization/Q&A→deterministic extractive algorithms, smalltalk→canned study guidance. Labelled "Demo". Real provider via server when key set. |
| Math solver | Real deterministic solvers: linear/quadratic, 2×2 systems, expression eval (safe tokenizer), polynomial derivative/integral, vectors, coordinate geometry, trig at standard angles, number theory utils. Steps + verified badge. Unsupported → honest message. |
| Notes/flashcards | Extractive summarization, glossary lookup, formula sheets from data, cloze flashcards — all deterministic, labelled. |
| Quiz | Real question banks (Math/Physics/Chemistry/Biology/English/CS, difficulties 1–3), real scoring/review/retakes. Missing topics → honest notice. |
| PDF study | pdf.js text extraction with real page numbers; keyword Q&A with citations; extractive chapter summaries. Size/type limits enforced. |
| Planner/dashboard/history | Real CRUD + aggregates computed from stored data only. Study time = measured app-open time. |
| Portfolio admin | PIN gate (SHA-256+salted, localStorage) labelled prototype-grade; content in `js/portfolio/config.js`. |
| Contact form | Demo-labelled unless server + `CONTACT_*` configured. |

## Build order
1. CSS design system → 2. HTML shells → 3. core JS → 4. lib (math/quiz/text/validators)
   → 5. AI provider/demo → 6. modules → 7. portfolio → 8. server/docs → 9. tests → 10. verify.
