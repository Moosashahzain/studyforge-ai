/* StudyForge AI — searchable study history */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};

  const M = {
    render(el) {
      el.innerHTML = `
        <div class="page-head"><h2>Study History</h2><p>Search everything you've done — chats, quizzes, notes and activity.</p></div>
        <div class="card" style="margin-bottom:16px"><div class="row">
          <input type="text" id="hq" placeholder="Search history…" style="flex:1" aria-label="Search history">
          <select id="ht" style="width:auto"><option value="">All types</option><option value="chat">Chats</option><option value="quiz">Quizzes</option><option value="note">Notes</option><option value="activity">Activity</option></select>
        </div></div>
        <div id="hOut"></div>`;

      const q = el.querySelector("#hq"), t = el.querySelector("#ht"), out = el.querySelector("#hOut");
      const draw = SF.debounce(() => {
        const term = q.value.trim().toLowerCase(), type = t.value;
        const rows = [];
        if (!type || type === "chat") for (const c of SF.Store.list("chats")) {
          const hay = (c.title + " " + c.messages.map((m) => m.content).join(" ")).toLowerCase();
          if (!term || hay.includes(term)) rows.push({ type: "chat", title: c.title, sub: c.messages.length + " messages · " + SF.fmtDateTime(c.updated), id: c.id });
        }
        if (!type || type === "quiz") for (const a of SF.Store.list("quizAttempts")) {
          const hay = (a.subject + " " + a.topic).toLowerCase();
          if (!term || hay.includes(term)) rows.push({ type: "quiz", title: `${a.subject} — ${a.score}/${a.total} (${a.pct}%)`, sub: SF.fmtDateTime(a.t), id: a.id });
        }
        if (!type || type === "note") for (const n of SF.Store.list("notes")) {
          const hay = (n.title + " " + n.sections.map((s) => s.body).join(" ")).toLowerCase();
          if (!term || hay.includes(term)) rows.push({ type: "note", title: n.title, sub: SF.fmtDateTime(n.updated), id: n.id });
        }
        if (!type || type === "activity") for (const a of SF.Store.get("stats", "activity", [])) {
          if (!term || (a.type + " " + a.label).toLowerCase().includes(term)) rows.push({ type: "activity", title: a.label, sub: a.type + " · " + SF.fmtDateTime(a.t) });
        }
        rows.sort((a, b) => 0);
        out.innerHTML = rows.length ? rows.slice(0, 60).map((r) => `
          <div class="card" style="margin-bottom:8px;padding:12px 16px"><div class="row between">
            <div><span class="badge neutral">${r.type}</span> <strong>${SF.esc(r.title)}</strong><br><small class="muted">${SF.esc(r.sub)}</small></div>
            ${r.id && (r.type === "chat" || r.type === "quiz" || r.type === "note") ? `<button class="icon-btn" data-rdel="${r.type}:${r.id}" title="Delete">${SF.icon("trash")}</button>` : ""}
          </div></div>`).join("")
          : `<div class="empty">${SF.icon("search")}<h4>No results</h4><p>Try a different search term or filter.</p></div>`;
        out.querySelectorAll("[data-rdel]").forEach((b) => b.onclick = () => {
          const [ty, id] = b.dataset.rdel.split(":");
          SF.confirm("Delete this record?", () => {
            SF.Store.del(ty === "chat" ? "chats" : ty === "quiz" ? "quizAttempts" : "notes", id);
            draw();
          });
        });
      }, 200);
      q.oninput = draw; t.onchange = draw; draw();
    },
  };
  SF.Modules.history = M;
})(typeof window !== "undefined" ? window : globalThis);
