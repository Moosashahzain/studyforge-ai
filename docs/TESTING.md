# Testing Report — StudyForge AI

Date: 2026-10-11. Principle: no test is claimed passed unless it actually ran.

## 1. Automated tests — 47/47 PASS

`node --test tests/run.js tests/render-smoke.js`

| Suite | Tests | Result |
|---|---|---|
| MathSolver | 15 (quadratic, linear, no-solution, 2×2 system, expression eval, div-by-zero, derivative, integral, vectors, distance, trig, gcd, primality, unsupported-input, no-`eval`) | PASS |
| Quiz engine | 5 (filtering, seeded determinism, mcq+short grading, wrong answers, labels) | PASS |
| Validators | 4 (email, URL incl. `javascript:` rejection, file type/size, inline HTML) | PASS |
| Text analysis | 3 (extractive summary, keywords, cloze cards) | PASS |
| Store | 2 (CRUD round-trip, exportAll JSON) | PASS |
| Utils | 2 (HTML escaping, safe markdown) | PASS |
| Demo engine | 4 (NL math routing, `Define:` colon, formula sheets, demo labelling) | PASS |

Run: `cd studyforge-ai && node --test tests/run.js`

## 2. Static checks

- `node --check` on all 31 project JS files: PASS (two real syntax errors found and fixed in flashcards.js and docs.js — a transposed `` `} `` in nested template literals).
- All `<script src>` / CSS `href` references in index.html, app.html, portfolio.html resolve to existing files: verified.
- `grep` for `eval(` in math.js: none (safe tokenizer-based evaluator).

## 3. Server smoke test (live, 2026-10-11)

- `GET /api/health` → `{"ok":true,"ai":false,"contact":false,"mode":"demo"}` ✓
- `GET /`, `/app.html` → 200 ✓
- `POST /api/chat` without key → 501 with honest "not configured… demo mode" message ✓
- `POST /api/contact` when disabled → 501 with honest message ✓
- Path traversal (`/..%2F..%2Fetc%2Fpasswd`) → 403 ✓

## 4. Browser end-to-end QA — COULD NOT RUN (documented honestly)

A live-Chromium QA task was delegated to click through the landing page, tutor,
math solver, quiz, theme toggle and portfolio. It could not execute any steps:

- The browser task runs on a leased remote VM, not this machine, so
  `http://localhost:3000/` was unreachable from it.
- Workaround attempts failed: `cloudflared` quick-tunnel request was rejected
  by the sandbox egress proxy (`tls: first record does not look like a TLS
  handshake` from `api.trycloudflare.com`); `localtunnel` via npx timed out
  with no output.

No browser steps are claimed as passed. Instead, the next-best verification was
added: **render smoke tests** (`node --test tests/render-smoke.js`, 12/12 PASS)
which execute every module's `render()` against a DOM stub to catch
ReferenceErrors, typos and template bugs, plus a static check that every module
uses `SF.esc()` when injecting data.

## 5. Bugs found during verification (all fixed)

1. Demo engine did not route "Solve x^2 + 5x + 6 = 0 step by step" to the solver (natural-language wrapper) — added `extractMath()`.
2. "Define: photosynthesis" (with colon) missed the definition matcher — regex now allows the colon.
3. Dead no-op filter line in tutor `retryFrom` — removed.

## 6. Not tested / known limits

- Live-AI server mode (`/api/chat` proxy + SSE streaming): not tested — requires a real `STUDYFORGE_AI_API_KEY`, which is not available in this environment. Code paths are straightforward fetch/proxy logic; marked untested.
- Contact delivery (`CONTACT_ENABLED=1`): not tested end-to-end for the same reason (no SMTP configured by design; the implementation logs to a JSON-lines file).
- Full live-browser E2E (clicks, PDF upload, responsive screenshots): not possible here — see §4. Covered instead by 12 render-smoke tests + static checks.
- PDF upload in a real browser: pdf.js is vendored upstream code; extraction is exercised only via the Documents module UI, not automated.
- Push-style reminders: use the Notifications API only after user permission; background delivery while the app is closed is not implemented (documented in-app).
- Screen-reader pass and full keyboard walkthrough: semantic HTML, skip links, focus styles and ARIA roles are in place, but no assistive-tech run was performed.
