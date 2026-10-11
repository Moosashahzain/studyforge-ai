/* StudyForge AI — Settings: theme, language, education profile, AI model, privacy, data */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const CUR = () => (window.SF_DATA || {}).curriculum || { boards: [], levels: [], subjectsByLevel: {} };

  const M = {
    render(el) {
      const prefs = SF.Store.get("prefs", "ui", {});
      const edu = SF.Store.get("prefs", "edu", {});
      const cur = CUR();
      el.innerHTML = `
        <div class="page-head"><h2>Settings</h2><p>Appearance, language, education profile, AI model and your data.</p></div>
        <div class="grid cols-2">
          <div class="card"><h3 class="card-title">Appearance</h3>
            <div class="field"><label>Theme</label><select id="sTheme">
              <option value="light" ${prefs.theme !== "dark" && prefs.theme !== "system" ? "selected" : ""}>Light</option>
              <option value="dark" ${prefs.theme === "dark" ? "selected" : ""}>Dark</option>
              <option value="system" ${prefs.theme === "system" ? "selected" : ""}>System</option></select></div>
            <div class="field"><label>Language / زبان</label><select id="sLang">
              <option value="en" ${(prefs.lang || "en") === "en" ? "selected" : ""}>English</option>
              <option value="ur" ${prefs.lang === "ur" ? "selected" : ""}>اردو (Urdu)</option></select>
              <div class="hint">Translates the app navigation and main labels.</div></div>
          </div>
          <div class="card"><h3 class="card-title">Education profile</h3>
            <div class="field"><label>Board</label><select id="sBoard">
              ${cur.boards.map((b) => `<option value="${b.id}" ${edu.board === b.id ? "selected" : ""}>${SF.esc(b.name)}</option>`).join("")}</select>
              <div class="hint" id="boardNote"></div></div>
            <div class="field"><label>Level</label><select id="sLevel">
              ${cur.levels.map((l) => `<option value="${l.id}" ${edu.level === l.id ? "selected" : ""}>${SF.esc(l.name)}</option>`).join("")}</select></div>
            <div class="field"><label>Subjects</label><div id="sSubs" class="row" style="flex-wrap:wrap"></div>
              <div class="hint">Used to pre-fill subject pickers across the app.</div></div>
          </div>
          <div class="card"><h3 class="card-title">AI model</h3>
            <p><span class="badge warn" id="aiMode">Demo</span></p>
            <p class="muted" style="font-size:14px">This app runs in <strong>demo mode</strong>: tutor answers come from deterministic on-device logic, clearly labelled. No data leaves your device.</p>
            <p class="muted" style="font-size:14px">To connect a real model, run the optional Node server with <code>STUDYFORGE_AI_API_KEY</code> set — see <a href="docs/SETUP.md">docs/SETUP.md</a>. Keys stay on the server and are never sent to the browser.</p>
          </div>
          <div class="card"><h3 class="card-title">Privacy</h3>
            <ul style="font-size:14px;padding-left:18px">
              <li>All data is stored <strong>only in this browser</strong> (localStorage)${SF.Store.isPersistent() ? "" : " — actually, persistent storage was unavailable, so data lasts only for this session"}.</li>
              <li>PDF text extraction happens on-device; documents never upload anywhere.</li>
              <li>No analytics, no tracking, no third-party requests except the optional CDN fallback (pdf.js is vendored locally).</li>
            </ul></div>
          <div class="card"><h3 class="card-title">Data management</h3>
            <div class="row" style="flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" id="expAll">${SF.icon("download")} Export all data (JSON)</button>
              <button class="btn btn-danger btn-sm" id="wipeAll">${SF.icon("trash")} Delete all data</button>
            </div><p class="muted" style="font-size:13px;margin-top:8px">Export first if you want a backup — deletion is permanent.</p></div>
        </div>`;

      const boardNote = () => {
        const b = cur.boards.find((x) => x.id === el.querySelector("#sBoard").value);
        el.querySelector("#boardNote").textContent = b ? (b.disclaimer || b.note || "") : "";
      };
      const renderSubs = () => {
        const lvl = el.querySelector("#sLevel").value;
        const subs = (cur.subjectsByLevel[lvl] || []);
        const sel = new Set(edu.subjects || []);
        el.querySelector("#sSubs").innerHTML = subs.map((s) =>
          `<label class="check-row" style="border:1px solid var(--border);border-radius:999px;padding:4px 10px">
            <input type="checkbox" data-sub="${SF.esc(s)}" ${sel.has(s) ? "checked" : ""}> ${SF.esc(s)}</label>`).join("");
        el.querySelectorAll("[data-sub]").forEach((c) => c.onchange = () => {
          const e2 = SF.Store.get("prefs", "edu", {});
          const set = new Set(e2.subjects || []);
          c.checked ? set.add(c.dataset.sub) : set.delete(c.dataset.sub);
          e2.subjects = [...set]; SF.Store.set("prefs", "edu", e2);
        });
      };
      el.querySelector("#sTheme").onchange = (e) => { SF.setTheme(e.target.value); SF.toast("Theme updated", "ok"); };
      el.querySelector("#sLang").onchange = (e) => {
        const p = SF.Store.get("prefs", "ui", {}); p.lang = e.target.value;
        SF.Store.set("prefs", "ui", p); SF.applyI18n(); location.reload();
      };
      el.querySelector("#sBoard").onchange = (e) => {
        const e2 = SF.Store.get("prefs", "edu", {}); e2.board = e.target.value;
        SF.Store.set("prefs", "edu", e2); boardNote();
      };
      el.querySelector("#sLevel").onchange = (e) => {
        const e2 = SF.Store.get("prefs", "edu", {}); e2.level = e.target.value; e2.subjects = [];
        SF.Store.set("prefs", "edu", e2); renderSubs();
      };
      el.querySelector("#expAll").onclick = () => SF.Export.json("studyforge-backup.json", JSON.parse(SF.Store.exportAll()));
      el.querySelector("#wipeAll").onclick = () => SF.confirm("Delete ALL StudyForge data on this device? This cannot be undone.", () =>
        SF.confirm("Final confirmation — permanently erase everything?", () => { SF.Store.wipe(); location.reload(); }));
      SF.AI.detectMode(true).then((m) => {
        const b = el.querySelector("#aiMode");
        b.textContent = m === "server" ? "Live AI" : "Demo";
        b.className = "badge " + (m === "server" ? "ok" : "warn");
      });
      boardNote(); renderSubs();
    },
  };
  SF.Modules.settings = M;
})(typeof window !== "undefined" ? window : globalThis);
