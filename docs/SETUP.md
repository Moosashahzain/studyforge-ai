# Setup Guide — StudyForge AI

## Option A — static only (recommended start)

No installation needed. Serve the `studyforge-ai` folder with any static server, or open `index.html` directly. All features work in demo mode.

```bash
cd studyforge-ai
python3 -m http.server 8080
```

## Option B — with the Node backend (live AI + contact delivery)

Requirements: Node.js 18+.

```bash
cd studyforge-ai
cp .env.example .env
# edit .env (see below)
node server/server.js
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no (default 3000) | HTTP port |
| `STUDYFORGE_AI_API_KEY` | for live AI | Secret key for an OpenAI-compatible chat API. **Never put this in client code.** |
| `STUDYFORGE_AI_BASE_URL` | no | Defaults to `https://api.openai.com/v1`; point at any compatible endpoint |
| `STUDYFORGE_AI_MODEL` | no | Model name, default `gpt-4o-mini` |
| `CONTACT_ENABLED` | for contact delivery | Set to `1` to enable the portfolio contact form |
| `CONTACT_LOG` | no | JSON-lines file where contact messages are stored (default `./server/inbox.jsonl`) |

Verify: `curl http://localhost:3000/api/health` → `{"ok":true,"ai":true,"contact":true,...}` when configured.

### How the app detects the backend

The frontend calls same-origin `/api/health`. If it reports `"ai": true`, the tutor uses the live model (labelled "Live AI"); otherwise it stays in clearly-labelled demo mode. The portfolio contact form behaves the same way via `"contact": true`.

## Personalising the portfolio

Edit `js/portfolio/config.js` — every field has a labelled placeholder. Or use the **Edit portfolio** button on the portfolio page (sets a device-local PIN; prototype-grade protection, not real authentication).

To show a CV download button, set `profile.resumeUrl` (e.g. `"files/resume.pdf"`) **and** place the actual file there — the button only appears when the file exists.

## Deploying

- **Static hosts** (GitHub Pages / Netlify / Vercel): upload the folder as-is. Demo mode works; `/api/*` calls fail gracefully back to demo.
- **Node hosts** (Render / Railway / VPS): run `node server/server.js` with the env vars above. The same process serves the frontend.

## Data & privacy

All user data lives in the browser's localStorage (`sf2:` keys). Export everything from **Settings → Data management**; delete it there too. The demo AI sends nothing anywhere.
