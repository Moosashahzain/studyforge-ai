/* StudyForge AI — core utilities (browser + node compatible) */
(function (root) {
  const SF = (root.SF = root.SF || {});

  SF.uid = function (prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  SF.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  // Minimal markdown-ish renderer: paragraphs, **bold**, *italic*, `code`, - lists, ## headings.
  // Output is escaped first, so no HTML injection from user/AI text.
  SF.md = function (src) {
    const lines = SF.esc(src).split("\n");
    let html = "", inList = false, inCode = false;
    const inline = (t) => t
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
    for (const line of lines) {
      if (/^```/.test(line)) { inCode = !inCode; html += inCode ? "<pre class='code'>" : "</pre>"; continue; }
      if (inCode) { html += line + "\n"; continue; }
      const m = line.match(/^(#{1,4})\s+(.*)/);
      if (m) { if (inList) { html += "</ul>"; inList = false; } html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; continue; }
      if (/^\s*[-*]\s+/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + inline(line.replace(/^\s*[-*]\s+/, "")) + "</li>"; continue;
      }
      if (/^\s*$/.test(line)) { if (inList) { html += "</ul>"; inList = false; } continue; }
      if (inList) { html += "</ul>"; inList = false; }
      html += "<p>" + inline(line) + "</p>";
    }
    if (inList) html += "</ul>";
    if (inCode) html += "</pre>";
    return html;
  };

  SF.fmtDate = function (ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  SF.fmtDateTime = function (ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };
  SF.fmtDur = function (secs) {
    secs = Math.max(0, Math.round(secs));
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    if (h) return h + "h " + m + "m";
    if (m) return m + "m";
    return secs + "s";
  };

  SF.debounce = function (fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  SF.download = function (filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };

  SF.copyText = async function (text) {
    try { await navigator.clipboard.writeText(text); SF.toast("Copied to clipboard", "ok"); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); SF.toast("Copied to clipboard", "ok"); }
      catch (_) { SF.toast("Copy failed — select the text manually", "err"); }
      ta.remove();
    }
  };

  SF.toast = function (msg, kind) {
    const box = document.getElementById("toasts");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 320); }, 3200);
  };

  SF.modal = function ({ title, bodyHTML, actions }) {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop";
    bd.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${SF.esc(title)}">
      <div class="row between" style="margin-bottom:12px"><h3 style="margin:0">${SF.esc(title)}</h3>
      <button class="icon-btn" data-close aria-label="Close">${SF.icon("x")}</button></div>
      <div class="modal-body"></div><div class="row" style="justify-content:flex-end;margin-top:20px" data-actions></div></div>`;
    bd.querySelector(".modal-body").innerHTML = bodyHTML;
    const actBox = bd.querySelector("[data-actions]");
    (actions || [{ label: "Close" }]).forEach((a) => {
      const b = document.createElement("button");
      b.className = "btn " + (a.kind || "btn-secondary"); b.textContent = a.label;
      b.onclick = () => { if (a.onClick) a.onClick(bd); if (a.keepOpen !== true) bd.remove(); };
      actBox.appendChild(b);
    });
    bd.querySelector("[data-close]").onclick = () => bd.remove();
    bd.addEventListener("mousedown", (e) => { if (e.target === bd) bd.remove(); });
    document.body.appendChild(bd);
    const f = bd.querySelector("input,textarea,select,button.btn"); if (f) f.focus();
    return bd;
  };

  SF.confirm = function (message, onYes) {
    SF.modal({
      title: "Please confirm",
      bodyHTML: `<p>${SF.esc(message)}</p>`,
      actions: [
        { label: "Cancel" },
        { label: "Confirm", kind: "btn-primary", onClick: () => onYes() },
      ],
    });
  };

  SF.initTheme = function () {
    let theme = "light";
    try { theme = localStorage.getItem("sf-theme") || "light"; } catch (e) {}
    if (theme === "system") {
      theme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    }
    document.documentElement.dataset.theme = theme;
  };
  SF.setTheme = function (theme) {
    try { localStorage.setItem("sf-theme", theme); } catch (e) {}
    SF.initTheme();
  };

  // Browser DOM helpers (no-ops in node)
  if (typeof document !== "undefined") {
    SF.$ = (sel, el) => (el || document).querySelector(sel);
    SF.$$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
    SF.el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
