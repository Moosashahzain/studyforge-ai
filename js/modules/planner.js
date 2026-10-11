/* StudyForge AI — Study Planner: subjects, tasks, sessions, weekly calendar, reminders */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const NS = "planner";
  const COLORS = ["#6a4dff", "#4f8cff", "#14b8a6", "#f59e0b", "#ef4444", "#22c55e"];

  function data() {
    return SF.Store.get(NS, "data", { subjects: [], tasks: [], sessions: [] });
  }
  function save(d) { SF.Store.set(NS, "data", d); }

  const M = {
    render(el) {
      const d = data();
      el.innerHTML = `
        <div class="page-head row between"><div><h2>Study Planner</h2><p>Subjects, tasks, deadlines and your week at a glance.</p></div>
        <button class="btn btn-primary btn-sm" id="addTask">${SF.icon("plus")} New task</button></div>
        <div id="remind"></div>
        <div class="grid cols-2" style="margin-bottom:16px">
          <div class="card"><div class="row between"><h3 class="card-title">Subjects</h3>
            <button class="btn btn-ghost btn-sm" id="addSub">${SF.icon("plus")} Add</button></div><div id="subList"></div></div>
          <div class="card"><h3 class="card-title">Log study session</h3>
            <form id="sessForm" class="grid cols-2">
              <div class="field"><label>Subject</label><select id="ss"></select></div>
              <div class="field"><label>Date</label><input type="date" id="sd" value="${new Date().toISOString().slice(0, 10)}"></div>
              <div class="field"><label>Minutes</label><input type="number" id="sm" value="45" min="5" max="600"></div>
              <div class="field"><label>Topic (optional)</label><input type="text" id="st" maxlength="80"></div>
            </form><button class="btn btn-primary btn-sm" id="logSess" style="margin-top:8px">Log session</button></div>
        </div>
        <div class="card" style="margin-bottom:16px"><h3 class="card-title">This week</h3><div id="week"></div></div>
        <div class="card"><div class="row between"><h3 class="card-title">Tasks</h3>
          <select id="taskFilter" style="width:auto"><option value="">All</option><option value="open">Open</option><option value="done">Done</option></select></div>
          <div id="taskList"></div></div>`;

      const subSel = el.querySelector("#ss");
      const renderSubs = () => {
        subSel.innerHTML = d.subjects.map((s) => `<option value="${s.id}">${SF.esc(s.name)}</option>`).join("") || `<option value="">—</option>`;
        el.querySelector("#subList").innerHTML = d.subjects.length ? d.subjects.map((s) => {
          const open = d.tasks.filter((t) => t.subject === s.id && !t.done).length;
          return `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border)">
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:8px"></span>${SF.esc(s.name)} <small class="muted">${open} open</small></span>
            <button class="icon-btn" data-delsub="${s.id}">${SF.icon("trash")}</button></div>`;
        }).join("") : `<p class="muted">No subjects yet — add your first.</p>`;
        el.querySelectorAll("[data-delsub]").forEach((b) => b.onclick = () => SF.confirm("Delete subject and its tasks?", () => {
          d.subjects = d.subjects.filter((s) => s.id !== b.dataset.delsub);
          d.tasks = d.tasks.filter((t) => t.subject !== b.dataset.delsub);
          save(d); M.render(el);
        }));
      };
      el.querySelector("#addSub").onclick = () => SF.modal({
        title: "New subject", bodyHTML: `<div class="field"><label>Name</label><input type="text" id="sn" maxlength="40"></div>`,
        actions: [{ label: "Cancel" }, { label: "Add", kind: "btn-primary", onClick: (bd) => {
          const v = bd.querySelector("#sn").value.trim(); if (!v) return;
          d.subjects.push({ id: SF.uid("sub"), name: v, color: COLORS[d.subjects.length % COLORS.length] });
          save(d); renderSubs();
        } }],
      });

      const renderTasks = () => {
        const f = el.querySelector("#taskFilter").value;
        const list = d.tasks.filter((t) => !f || (f === "done" ? t.done : !t.done))
          .sort((a, b) => (a.done - b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
        el.querySelector("#taskList").innerHTML = list.length ? list.map((t) => {
          const s = d.subjects.find((x) => x.id === t.subject);
          const overdue = !t.done && t.due && t.due < new Date().toISOString().slice(0, 10);
          return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--border);${t.done ? "opacity:.6" : ""}">
            <input type="checkbox" data-t="${t.id}" ${t.done ? "checked" : ""} aria-label="Mark done">
            <div style="flex:1"><strong style="${t.done ? "text-decoration:line-through" : ""}">${SF.esc(t.title)}</strong><br>
            <small class="muted">${s ? `<span style="color:${s.color}">●</span> ${SF.esc(s.name)} · ` : ""}${t.due ? "Due " + SF.esc(t.due) : "No deadline"}${overdue ? ` · <span class="badge err">Overdue</span>` : ""}${t.done && t.doneAt ? " · done " + SF.fmtDate(t.doneAt) : ""}</small></div>
            <button class="icon-btn" data-delt="${t.id}">${SF.icon("trash")}</button></div>`;
        }).join("") : `<div class="empty" style="padding:24px"><p>No tasks here. Enjoy the calm — or add one above.</p></div>`;
        el.querySelectorAll("[data-t]").forEach((c) => c.onchange = () => {
          const t = d.tasks.find((x) => x.id === c.dataset.t);
          t.done = c.checked; t.doneAt = c.checked ? Date.now() : null;
          save(d); SF.logActivity("planner", (c.checked ? "Completed: " : "Reopened: ") + t.title);
          renderTasks(); renderWeek();
        });
        el.querySelectorAll("[data-delt]").forEach((b) => b.onclick = () => SF.confirm("Delete this task?", () => {
          d.tasks = d.tasks.filter((x) => x.id !== b.dataset.delt); save(d); renderTasks(); renderWeek();
        }));
      };
      el.querySelector("#taskFilter").onchange = renderTasks;
      el.querySelector("#addTask").onclick = () => {
        if (!d.subjects.length) { SF.toast("Add a subject first", "err"); return; }
        SF.modal({ title: "New task",
          bodyHTML: `<div class="field"><label>Title</label><input type="text" id="tt" maxlength="120"></div>
            <div class="grid cols-2"><div class="field"><label>Subject</label><select id="ts">${d.subjects.map((s) => `<option value="${s.id}">${SF.esc(s.name)}</option>`).join("")}</select></div>
            <div class="field"><label>Deadline</label><input type="date" id="td"></div></div>
            <div class="field"><label>Priority</label><select id="tp"><option>Normal</option><option>High</option><option>Low</option></select></div>`,
          actions: [{ label: "Cancel" }, { label: "Add task", kind: "btn-primary", onClick: (bd) => {
            const v = bd.querySelector("#tt").value.trim(); if (!v) { SF.toast("Title is required", "err"); return; }
            d.tasks.push({ id: SF.uid("task"), title: v, subject: bd.querySelector("#ts").value, due: bd.querySelector("#td").value || null, priority: bd.querySelector("#tp").value, done: false, created: Date.now() });
            save(d); SF.logActivity("planner", "New task: " + v); renderTasks(); renderWeek();
          } }] });
      };
      el.querySelector("#logSess").onclick = () => {
        const mins = Math.min(600, Math.max(5, +el.querySelector("#sm").value || 45));
        d.sessions.push({ id: SF.uid("sess"), subject: subSel.value || null, date: el.querySelector("#sd").value, mins, topic: el.querySelector("#st").value.trim(), t: Date.now() });
        save(d); SF.logActivity("planner", `Study session: ${mins} min`);
        SF.toast("Session logged", "ok"); renderWeek();
      };

      function renderWeek() {
        const now = new Date(); const dow = (now.getDay() + 6) % 7;
        const mon = new Date(now); mon.setDate(now.getDate() - dow);
        const days = [...Array(7)].map((_, i) => { const dt = new Date(mon); dt.setDate(mon.getDate() + i); return dt; });
        const key = (dt) => dt.toISOString().slice(0, 10);
        el.querySelector("#week").innerHTML = `<div class="cal-grid">` + days.map((dt) => {
          const k = key(dt), isToday = k === key(now);
          const evs = [
            ...d.tasks.filter((t) => t.due === k).map((t) => ({ label: "◻ " + t.title, done: t.done })),
            ...d.sessions.filter((s) => s.date === k).map((s) => ({ label: `▣ ${s.mins}m${s.topic ? " " + s.topic : ""}` })),
          ];
          return `<div class="cal-day ${isToday ? "today" : ""}"><div class="dnum">${dt.toLocaleDateString(undefined, { weekday: "short" })} ${dt.getDate()}</div>
            ${evs.slice(0, 3).map((e) => `<div class="cal-event" style="${e.done ? "opacity:.5;text-decoration:line-through" : ""}">${SF.esc(e.label)}</div>`).join("")}
            ${evs.length > 3 ? `<span class="count" style="display:none">${evs.length - 3} more</span><small class="muted">+${evs.length - 3}</small>` : ""}</div>`;
        }).join("") + `</div>`;
      }

      // Reminders: surface tasks due within 24h; offer browser notification permission
      const soon = d.tasks.filter((t) => !t.done && t.due && t.due <= new Date(Date.now() + 864e5).toISOString().slice(0, 10));
      if (soon.length) {
        el.querySelector("#remind").innerHTML = `<div class="alert warn"><strong>${soon.length} task(s) due within 24 hours:</strong> ${soon.map((t) => SF.esc(t.title)).join(", ")}
          <button class="btn btn-secondary btn-sm" id="notifBtn" style="margin-left:8px">Enable reminders</button></div>`;
        el.querySelector("#notifBtn").onclick = async () => {
          if (!("Notification" in window)) { SF.toast("Notifications not supported in this browser", "err"); return; }
          const p = await Notification.requestPermission();
          SF.toast(p === "granted" ? "Reminders enabled for this device" : "Reminder permission: " + p, p === "granted" ? "ok" : "err");
        };
      }

      renderSubs(); renderTasks(); renderWeek();
    },
  };
  SF.Modules.planner = M;
})(typeof window !== "undefined" ? window : globalThis);
