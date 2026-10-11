/* StudyForge AI — optional backend (zero dependencies, Node 18+).
 *
 * Serves the static frontend and provides:
 *   GET  /api/health    -> { ok, ai: <model configured>, contact: <delivery configured> }
 *   POST /api/chat      -> proxies to an OpenAI-compatible API when
 *                          STUDYFORGE_AI_API_KEY is set; otherwise 501.
 *   POST /api/contact   -> validates and appends to CONTACT_LOG; 501 when disabled.
 *
 * The API key NEVER leaves the server: the browser only talks to /api/*.
 * Run:  node server/server.js        (from the project root)
 * Env:  see .env.example
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);
const AI_KEY = process.env.STUDYFORGE_AI_API_KEY || "";
const AI_BASE = (process.env.STUDYFORGE_AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const AI_MODEL = process.env.STUDYFORGE_AI_MODEL || "gpt-4o-mini";
const CONTACT_LOG = process.env.CONTACT_LOG || path.join(ROOT, "server", "inbox.jsonl");
const CONTACT_ENABLED = process.env.CONTACT_ENABLED === "1";

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
};

// --- tiny rate limiter: 60 req/min per IP on /api/* ---
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 60;
}

function send(res, code, body, type) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(code, { "Content-Type": type || "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  res.end(data);
}
function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on("data", (c) => { n += c.length; if (n > maxBytes) { reject(new Error("Body too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  // block traversal + hidden files
  const full = path.normalize(path.join(ROOT, p));
  if (!full.startsWith(ROOT) || path.basename(full).startsWith(".")) return send(res, 403, { error: "Forbidden" });
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: "Not found" }, "text/plain");
    const type = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
    // Never serve server internals or env files
    if (full.startsWith(path.join(ROOT, "server")) && !p.startsWith("/server/inbox")) return send(res, 403, { error: "Forbidden" });
    res.writeHead(200, { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600" });
    fs.createReadStream(full).pipe(res);
  });
}

async function handleChat(req, res) {
  if (!AI_KEY) return send(res, 501, { error: "AI not configured on this server. The app continues in demo mode." });
  let body;
  try { body = JSON.parse(await readBody(req, 256 * 1024)); }
  catch (e) { return send(res, 400, { error: "Invalid JSON body." }); }
  const messages = Array.isArray(body.messages) ? body.messages.filter((m) => m && typeof m.content === "string").slice(-20) : [];
  if (!messages.length) return send(res, 400, { error: "messages[] is required." });
  const maxTokens = Math.min(4000, Math.max(50, Number(body.maxTokens) || 1200));
  const stream = body.stream === true;
  const payload = JSON.stringify({ model: AI_MODEL, messages, max_tokens: maxTokens, stream });
  const target = new URL(AI_BASE + "/chat/completions");
  const lib = target.protocol === "https:" ? require("https") : require("http");
  const timeoutMs = 45000;
  const proxy = lib.request(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + AI_KEY, // never logged, never forwarded to clients
      "Content-Length": Buffer.byteLength(payload),
    },
    timeout: timeoutMs,
  }, (up) => {
    if (up.statusCode === 429) { send(res, 429, { error: "AI quota exhausted. Please try again later." }); up.resume(); return; }
    if (up.statusCode < 200 || up.statusCode >= 300) {
      let raw = "";
      up.on("data", (c) => (raw += c));
      up.on("end", () => send(res, 502, { error: "AI provider error. Please try again later." }));
      return;
    }
    if (stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
      up.on("data", (chunk) => {
        // forward only text deltas, strip everything else
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          if (m[1].trim() === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
          try {
            const d = JSON.parse(m[1]);
            const t = d.choices && d.choices[0] && d.choices[0].delta && d.choices[0].delta.content;
            if (t) res.write("data: " + JSON.stringify({ text: t }) + "\n\n");
          } catch (e) { /* ignore malformed chunk */ }
        }
      });
      up.on("end", () => res.end());
      up.on("error", () => res.end());
    } else {
      let raw = "";
      up.on("data", (c) => (raw += c));
      up.on("end", () => {
        try {
          const d = JSON.parse(raw);
          const text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
          send(res, 200, { text: text || "", model: AI_MODEL });
        } catch (e) { send(res, 502, { error: "AI provider returned an unreadable response." }); }
      });
    }
  });
  proxy.on("timeout", () => { proxy.destroy(); send(res, 504, { error: "AI request timed out." }); });
  proxy.on("error", () => send(res, 502, { error: "Could not reach the AI provider." }));
  proxy.end(payload);
}

async function handleContact(req, res) {
  if (!CONTACT_ENABLED) return send(res, 501, { error: "Contact delivery is not configured. The form runs in demo mode." });
  let body;
  try { body = JSON.parse(await readBody(req, 64 * 1024)); }
  catch (e) { return send(res, 400, { error: "Invalid JSON body." }); }
  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().slice(0, 120);
  const message = String(body.message || "").trim().slice(0, 2000);
  if (!name || !message) return send(res, 400, { error: "Name and message are required." });
  if (!isEmail(email)) return send(res, 400, { error: "A valid email address is required." });
  const line = JSON.stringify({ t: new Date().toISOString(), name, email, message }) + "\n";
  fs.appendFile(CONTACT_LOG, line, (err) => {
    if (err) return send(res, 500, { error: "Could not store the message." });
    send(res, 200, { ok: true });
  });
}

const server = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || "unknown";
  const pathname = new URL(req.url, "http://x").pathname;
  if (pathname.startsWith("/api/")) {
    if (rateLimited(ip)) return send(res, 429, { error: "Too many requests. Slow down." });
    if (req.method === "GET" && pathname === "/api/health")
      return send(res, 200, { ok: true, ai: AI_KEY ? true : false, contact: CONTACT_ENABLED, mode: AI_KEY ? "live" : "demo" });
    if (req.method === "POST" && pathname === "/api/chat") return handleChat(req, res);
    if (req.method === "POST" && pathname === "/api/contact") return handleContact(req, res);
    return send(res, 404, { error: "Unknown API endpoint." });
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" }, "text/plain");
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`StudyForge AI running at http://localhost:${PORT}`);
  console.log(`AI mode: ${AI_KEY ? "live (" + AI_MODEL + ")" : "demo (no STUDYFORGE_AI_API_KEY)"}`);
  console.log(`Contact delivery: ${CONTACT_ENABLED ? "enabled -> " + CONTACT_LOG : "disabled (demo form)"}`);
});
