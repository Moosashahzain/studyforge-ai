/* StudyForge AI — Progress Dashboard (aggregates only real stored data) */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};

  const M = {
    render(el) {
      const attempts = SF.Store.list("quizAttempts").sort((a, b) => b.t - a.t);
      const decks = SF.Store.list("decks");
      const planner = SF.Store.get("planner", "data", { subjects: [], tasks: [], sessions: [] });
      const usage = SF.Store.get("stats", "usage", { studySecs: 0, sessions: 0 });
      const activity = SF.Store.get("stats", "activity", []).slice(0, 12);
      const notes = SF.Store.list("notes").length, docs = SF.Store.list("docs").length;

      const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.pct, 0) / attempts.length) : null;
      const reviews = decks.reduce((s, d) => s + d.cards.reduce((x, c) => x + (c.reviews || 0), 0), 0);
      const tasksDone = planner.tasks.filter((t) => t.done).length;
      const sessMins = planner.sessions.reduce((s, x) => s + (x.mins || 0), 0);

      // subject progress from quizzes
      const bySubj = {};
      for (const a of attempts) {
        bySubj[a.subject] = bySubj[a.subject] || { n: 0, sum: 0 };
        bySubj[a.subject].n++; bySubj[a.subject].sum += a.pct;
      }

      const stat = (label, val, sub) => `<div class="card"><p class="card-sub" style="margin:0">${label}</p>
        <h2 style="margin:4px 0">${val}</h2><p class="muted" style="margin:0;font-size:13px">${sub || ""}</p></div>`;

      el.innerHTML = `
        <div class="page-head"><h2>Progress Dashboard</h2><p>Computed only from your real activity — nothing is fabricated.</p></div>
        <div class="grid cols-4" style="margin-bottom:16px">
          ${stat("Quizzes taken", attempts.length, avg == null ? "No quizzes yet" : "Average " + avg + "%")}
          ${stat("Flashcard reviews", reviews, decks.length + " deck(s)")}
          ${stat("Tasks completed", tasksDone + "/" + planner.tasks.length, "in planner")}
          ${stat("Study time", SF.fmtDur(usage.studySecs + sessMins * 60), sessMins + " min logged sessions")}
        </div>
        <div class="grid cols-2">
          <div class="card"><h3 class="card-title">Subject quiz performance</h3>
            ${Object.keys(bySubj).length ? Object.entries(bySubj).map(([s, v]) => `
              <div class="row between" style="margin-bottom:8px"><span>${SF.esc(s)} <small class="muted">(${v.n})</small></span>
              <span style="min-width:160px"><span class="progress"><span style="width:${Math.round(v.sum / v.n)}%"></span></span></span>
              <strong>${Math.round(v.sum / v.n)}%</strong></div>`).join("")
            : `<div class="empty" style="padding:20px"><p>Take a quiz to see subject performance.</p></div>`}</div>
          <div class="card"><h3 class="card-title">Recent activity</h3>
            ${activity.length ? activity.map((a) => `
              <div class="row" style="padding:6px 0;border-bottom:1px solid var(--border);font-size:14px">
                <span class="badge neutral">${SF.esc(a.type)}</span><span style="flex:1">${SF.esc(a.label)}</span>
                <small class="muted">${SF.fmtDateTime(a.t)}</small></div>`).join("")
            : `<div class="empty" style="padding:20px"><p>No activity recorded yet.</p></div>`}</div>
        </div>
        <div class="card" style="margin-top:16px"><div class="row between"><h3 class="card-title">Study goals</h3>
          <button class="btn btn-ghost btn-sm" id="addGoal">${SF.icon("plus")} Add goal</button></div><div id="goals"></div></div>`;

      const renderGoals = () => {
        const goals = SF.Store.get("stats", "goals", []);
        el.querySelector("#goals").innerHTML = goals.length ? goals.map((g, i) => `
          <div class="row" style="padding:8px 0;border-bottom:1px solid var(--border);${g.done ? "opacity:.6" : ""}">
            <input type="checkbox" data-g="${i}" ${g.done ? "checked" : ""} aria-label="Goal done">
            <span style="flex:1;${g.done ? "text-decoration:line-through" : ""}">${SF.esc(g.title)}</span>
            <button class="icon-btn" data-dg="${i}">${SF.icon("trash")}</button></div>`).join("")
          : `<p class="muted">No goals yet. Example: "Score 80% on a Physics quiz".</p>`;
        el.querySelectorAll("[data-g]").forEach((c) => c.onchange = () => { goals[+c.dataset.g].done = c.checked; SF.Store.set("stats", "goals", goals); renderGoals(); });
        el.querySelectorAll("[data-dg]").forEach((b) => b.onclick = () => { goals.splice(+b.dataset.dg, 1); SF.Store.set("stats", "goals", goals); renderGoals(); });
      };
      el.querySelector("#addGoal").onclick = () => SF.modal({
        title: "New goal", bodyHTML: `<div class="field"><label>Goal</label><input type="text" id="gt" maxlength="120" placeholder="e.g. Finish Algebra chapter by Friday"></div>`,
        actions: [{ label: "Cancel" }, { label: "Add", kind: "btn-primary", onClick: (bd) => {
          const v = bd.querySelector("#gt").value.trim(); if (!v) return;
          const goals = SF.Store.get("stats", "goals", []); goals.push({ title: v, done: false, t: Date.now() });
          SF.Store.set("stats", "goals", goals); renderGoals();
        } }],
      });
      renderGoals();
    },
  };
  SF.Modules.dashboard = M;
})(typeof window !== "undefined" ? window : globalThis);
