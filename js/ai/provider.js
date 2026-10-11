/* StudyForge AI — AI provider abstraction.
   Modes: 'demo' (on-device deterministic logic, always available, clearly labelled)
          'server' (same-origin /api/chat proxy; only used when the optional
          backend reports a configured model — API keys never touch the client). */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const AI = { _mode: null, _checked: 0 };

  AI.detectMode = async function (force) {
    if (!force && AI._mode && Date.now() - AI._checked < 60000) return AI._mode;
    AI._mode = "demo"; AI._checked = Date.now();
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch("/api/health", { signal: ctl.signal });
      clearTimeout(t);
      if (r.ok) {
        const h = await r.json();
        if (h && h.ai === true) { AI._mode = "server"; }
      }
    } catch (e) { /* offline or no backend → demo */ }
    return AI._mode;
  };

  AI.mode = () => AI._mode || "demo";

  // messages: [{role:'user'|'assistant'|'system', content}]
  AI.chat = async function (messages, opts) {
    opts = opts || {};
    const mode = await AI.detectMode();
    if (mode === "server") {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), opts.timeoutMs || 45000);
      try {
        const r = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messages.slice(-20), maxTokens: opts.maxTokens || 1200 }),
          signal: ctl.signal,
        });
        clearTimeout(t);
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || ("Server error " + r.status));
        return { text: data.text || "", demo: false, model: data.model || "server" };
      } catch (e) {
        clearTimeout(t);
        return { text: "", demo: false, error: e.message || "Request failed" };
      }
    }
    return SF.Demo.respond(messages, opts);
  };

  // Simulated streaming for demo mode (chunks real demo text); server mode tries SSE.
  AI.streamChat = async function (messages, opts, onChunk) {
    opts = opts || {};
    const mode = await AI.detectMode();
    if (mode === "server" && opts.allowSSE !== false) {
      try {
        const r = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
          body: JSON.stringify({ messages: messages.slice(-20), stream: true, maxTokens: opts.maxTokens || 1200 }),
        });
        if (r.ok && r.body && (r.headers.get("content-type") || "").includes("text/event-stream")) {
          const reader = r.body.getReader(); const dec = new TextDecoder(); let text = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              const m = line.match(/^data:\s*(.*)$/);
              if (m && m[1] !== "[DONE]") { try { const d = JSON.parse(m[1]); if (d.text) { text += d.text; onChunk(d.text); } } catch (e) {} }
            }
          }
          return { text, demo: false };
        }
      } catch (e) { /* fall through to demo */ }
    }
    const res = await SF.Demo.respond(messages, opts);
    const words = res.text.split(/(\s+)/);
    let i = 0;
    await new Promise((resolve) => {
      const step = () => {
        if (opts.cancelled && opts.cancelled()) return resolve();
        const batch = words.slice(i, i + 4).join("");
        i += 4;
        if (batch) onChunk(batch);
        if (i < words.length) setTimeout(step, 18); else resolve();
      };
      step();
    });
    return res;
  };

  SF.AI = AI;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
