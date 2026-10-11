# Architecture — StudyForge AI

## Layout

```
index.html            landing page
app.html              study assistant SPA shell (hash router)
portfolio.html        portfolio shell
css/                  tokens, base, components, layout, print
js/core/              utils, store, icons, i18n, router
js/lib/               math, validators, text, quiz  (browser + node testable)
js/ai/                provider (demo|server), demo engine
js/modules/           tutor, math-ui, notes, quiz-ui, docs, planner,
                      flashcards, dashboard, history, settings, export
js/portfolio/         config, app (renderer + PIN admin)
data/                 questions/glossary/formulas/curriculum (.json source, .js built)
vendor/               pdf.js + worker (vendored, offline-safe)
server/server.js      optional zero-dependency backend
tests/                node --test suite
```

## Key decisions

- **No build step, no framework.** Classic `<script>` files under a `window.SF` namespace; works from `file://` and any static host. Data ships as `.js` (not fetched JSON) for the same reason.
- **Hash router** (`#/tutor`, `#/quiz`…). Each module exposes `render(el)`.
- **Store**: versioned `localStorage` wrapper (`sf2:<ns>[:<id>]`), in-memory fallback when storage is unavailable, `exportAll()`/`wipe()` for data management.
- **AI provider abstraction**: `SF.AI.chat/streamChat` → `demo` (deterministic `SF.Demo` engine, always labelled) or `server` (same-origin `/api/chat`; keys never reach the client). Detection via `/api/health` with 60s cache.
- **Math**: hand-written tokenizer + shunting-yard evaluator, polynomial parser, per-type solvers. Every success returns `{steps, answer, verified:true}`.
- **PDF**: pdf.js loaded lazily on the Documents page only; per-page text kept in memory + localStorage; Q&A is keyword search with real page citations.
- **Security**: all dynamic text escaped (`SF.esc`) or rendered through the safe mini-markdown renderer; no `innerHTML` with untrusted HTML; uploads limited by type/size and never executed; contact form validated client + server; server has rate limiting, body caps, path-traversal guards, and never logs keys.
- **Portfolio admin**: SHA-256(salt + PIN) gate, device-local, explicitly labelled prototype-grade.
