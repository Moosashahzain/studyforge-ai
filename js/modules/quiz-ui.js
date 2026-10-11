/* StudyForge AI — Quiz Generator page */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const bank = () => (window.SF_DATA || {}).questions || [];

  const M = {
    render(el) {
      const subjects = [...new Set(bank().map((q) => q.subject))];
      el.innerHTML = `
        <div class="page-head"><h2>Quiz Generator</h2><p>Real questions from verified banks — with scoring, review and retakes.</p></div>
        <div class="card" style="margin-bottom:16px" id="setupCard">
          <div class="grid cols-2">
            <div class="field"><label for="qSub">Subject</label><select id="qSub">${subjects.map((s) => `<option>${s}</option>`).join("")}</select></div>
            <div class="field"><label for="qTopic">Topic</label><select id="qTopic"></select></div>
            <div class="field"><label for="qDiff">Difficulty</label>
              <select id="qDiff"><option value="">Mixed</option><option value="1">1 — Easy</option><option value="2">2 — Medium</option><option value="3">3 — Hard</option></select></div>
            <div class="field"><label for="qType">Question type</label>
              <select id="qType"><option value="mixed">Mixed</option><option value="mcq">Multiple choice</option><option value="short">Short answer</option></select></div>
            <div class="field"><label for="qCount">Number of questions</label>
              <input type="number" id="qCount" value="5" min="1" max="20"></div>
          </div>
          <p class="muted" id="qAvail" style="font-size:13px"></p>
          <button class="btn btn-primary" id="startQuiz">${SF.icon("quiz")} Start quiz</button>
        </div>
        <div id="qBody"></div>`;

      const sub = el.querySelector("#qSub"), topic = el.querySelector("#qTopic");
      const refreshTopics = () => {
        const topics = [...new Set(bank().filter((q) => q.subject === sub.value).map((q) => q.topic))];
        topic.innerHTML = `<option value="">All topics</option>` + topics.map((t) => `<option>${t}</option>`).join("");
        updateAvail();
      };
      const updateAvail = () => {
        const n = SF.Quiz.build(bank(), { subject: sub.value, topic: topic.value || undefined, difficulty: el.querySelector("#qDiff").value || undefined, type: el.querySelector("#qType").value }).available;
        el.querySelector("#qAvail").textContent = n ? `${n} question(s) available in the bank for this selection.` : "No questions in the bank for this selection yet — try another topic.";
      };
      sub.onchange = refreshTopics;
      [topic, el.querySelector("#qDiff"), el.querySelector("#qType")].forEach((x) => x.onchange = updateAvail);
      refreshTopics();

      el.querySelector("#startQuiz").onclick = () => {
        const count = Math.min(20, Math.max(1, +el.querySelector("#qCount").value || 5));
        const built = SF.Quiz.build(bank(), {
          subject: sub.value, topic: topic.value || undefined,
          difficulty: el.querySelector("#qDiff").value || undefined,
          type: el.querySelector("#qType").value, count,
        });
        if (!built.questions.length) { SF.toast("No questions available for this selection", "err"); return; }
        runQuiz(el.querySelector("#qBody"), built.questions, { subject: sub.value, topic: topic.value || "All" });
        el.querySelector("#setupCard").style.display = "none";
      };

      function runQuiz(body, questions, meta) {
        const answers = {};
        let idx = 0;
        const t0 = Date.now();
        function show() {
          const q = questions[idx];
          const pct = Math.round(((idx) / questions.length) * 100);
          body.innerHTML = `
            <div class="card">
              <div class="row between"><span class="badge brand">Question ${idx + 1} of ${questions.length}</span>
                <span class="badge neutral">${SF.esc(meta.subject)} · ${SF.esc(meta.topic)}</span></div>
              <div class="progress" style="margin:12px 0"><span style="width:${pct}%"></span></div>
              <h3 style="margin-bottom:16px">${SF.esc(q.q)}</h3>
              ${q.type === "mcq"
                ? q.shuffled.map((o, i) => `<label class="check-row card" style="padding:10px 12px;margin-bottom:8px;cursor:pointer">
                    <input type="radio" name="ans" value="${i}" ${answers["q" + q.n] == i ? "checked" : ""}> <span>${SF.esc(o)}</span></label>`).join("")
                : `<input type="text" id="shortAns" placeholder="Type your answer" value="${SF.esc(answers["q" + q.n] || "")}" style="margin-bottom:8px">`}
              <div class="row between" style="margin-top:16px">
                <button class="btn btn-secondary btn-sm" id="qBack" ${idx === 0 ? "disabled" : ""}>Back</button>
                ${idx < questions.length - 1
                  ? `<button class="btn btn-primary" id="qNext">Next</button>`
                  : `<button class="btn btn-primary" id="qSubmit">${SF.icon("check")} Submit quiz</button>`}
              </div></div>`;
          const collect = () => {
            if (q.type === "mcq") { const r = body.querySelector('input[name="ans"]:checked'); if (r) answers["q" + q.n] = +r.value; }
            else answers["q" + q.n] = body.querySelector("#shortAns").value;
          };
          body.querySelector("#qBack").onclick = () => { collect(); idx--; show(); };
          const next = body.querySelector("#qNext"), sub2 = body.querySelector("#qSubmit");
          if (next) next.onclick = () => { collect(); idx++; show(); };
          if (sub2) sub2.onclick = () => { collect(); finish(); };
        }
        function finish() {
          const res = SF.Quiz.grade(questions, answers);
          const secs = Math.round((Date.now() - t0) / 1000);
          const attempt = { id: SF.uid("qa"), subject: meta.subject, topic: meta.topic, score: res.score, total: res.total, pct: res.pct, secs, t: Date.now(), questions, answers, per: res.per };
          SF.Store.set("quizAttempts", attempt.id, attempt);
          SF.logActivity("quiz", `${meta.subject}: ${res.score}/${res.total} (${res.pct}%)`);
          body.innerHTML = `
            <div class="card" style="text-align:center;margin-bottom:16px">
              <h2>${res.score} / ${res.total}</h2>
              <p><span class="badge ${res.pct >= 60 ? "ok" : "warn"}" style="font-size:14px">${res.pct}% — ${SF.Quiz.gradeLabel(res.pct)}</span></p>
              <p class="muted">Completed in ${SF.fmtDur(secs)}</p>
              <div class="row" style="justify-content:center">
                <button class="btn btn-primary" id="retake">${SF.icon("refresh")} Retake</button>
                <button class="btn btn-secondary" id="newSetup">New quiz</button>
              </div></div>
            <h3 style="margin-bottom:12px">Answer review</h3>
            ${res.per.map((p, i) => { const q = questions[i]; return `
              <div class="card" style="margin-bottom:10px;border-left:4px solid ${p.correct ? "var(--green-500)" : "var(--red-500)"}">
                <p><strong>Q${q.n}.</strong> ${SF.esc(q.q)}</p>
                <p style="font-size:14px">Your answer: <strong>${SF.esc(String(p.got == null || p.got === "" ? "—" : p.got))}</strong>
                ${p.correct ? `<span class="badge ok">Correct</span>` : `<span class="badge err">Incorrect</span> · Correct: <strong>${SF.esc(String(p.expected))}</strong>`}</p>
                ${p.explanation ? `<p class="muted" style="font-size:13px;margin:0">Why: ${SF.esc(p.explanation)}</p>` : ""}
              </div>`; }).join("")}`;
          body.querySelector("#retake").onclick = () => runQuiz(body, SF.Quiz.build(bank(), { subject: meta.subject === "All" ? undefined : meta.subject, count: questions.length, seed: Date.now() % 100000 }).questions, meta);
          body.querySelector("#newSetup").onclick = () => M.render(el);
        }
        show();
      }
    },
  };
  SF.Modules.quiz = M;
})(typeof window !== "undefined" ? window : globalThis);
