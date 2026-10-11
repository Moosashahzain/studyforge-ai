/* StudyForge AI — Math Solver page */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const NS = "mathHistory";
  const EXAMPLES = [
    "2x + 3 = 11", "x^2 + 5x + 6 = 0", "(2+3)*4^2", "sqrt(144) + 3^3",
    "x + y = 5; 2x - y = 1", "d/dx 3x^3 + 2x", "distance (1,2) (4,6)",
    "sin(30°)", "gcd(48, 18)", "[1,2,3] dot [4,5,6]",
  ];

  const M = {
    render(el) {
      el.innerHTML = `
        <div class="page-head"><h2>Math Solver</h2>
        <p>Step-by-step solutions with <span class="badge ok">Verified</span> computed answers — never guessed.</p></div>
        <div class="card" style="margin-bottom:16px">
          <form id="mf" class="row" style="align-items:stretch">
            <input type="text" id="mi" placeholder="e.g. x^2 + 5x + 6 = 0" aria-label="Math problem" style="flex:1" autocomplete="off">
            <button class="btn btn-primary" type="submit">${SF.icon("calc")} Solve</button>
          </form>
          <div class="row" style="flex-wrap:wrap;margin-top:12px;gap:8px" id="exChips"></div>
        </div>
        <div id="mOut"></div>
        <div class="grid cols-2" style="margin-top:16px">
          <div class="card"><h3 class="card-title">What the solver handles</h3>
            <ul style="padding-left:18px;font-size:14px">${SF.MathSolver.capabilities.map((c) => `<li>${SF.esc(c)}</li>`).join("")}</ul></div>
          <div class="card"><h3 class="card-title">Recent solutions</h3><div id="mHist"></div></div>
        </div>`;

      const out = el.querySelector("#mOut"), input = el.querySelector("#mi");
      el.querySelector("#exChips").innerHTML = EXAMPLES.map((e) => `<button class="btn btn-secondary btn-sm chip">${SF.esc(e)}</button>`).join("");
      el.querySelectorAll(".chip").forEach((c) => c.onclick = () => { input.value = c.textContent; el.querySelector("#mf").requestSubmit(); });

      function renderHist() {
        const h = SF.Store.list(NS).sort((a, b) => b.t - a.t).slice(0, 8);
        el.querySelector("#mHist").innerHTML = h.length ? h.map((x) =>
          `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border)">
            <button class="btn btn-ghost btn-sm" data-h="${SF.esc(x.q)}" style="justify-content:flex-start">${SF.esc(x.q)}</button>
            <small class="muted">${SF.fmtDateTime(x.t)}</small></div>`).join("")
          : `<p class="muted">No solved problems yet.</p>`;
        el.querySelectorAll("[data-h]").forEach((b) => b.onclick = () => { input.value = b.dataset.h; el.querySelector("#mf").requestSubmit(); });
      }

      el.querySelector("#mf").onsubmit = (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        const r = SF.MathSolver.solve(q);
        if (!r.ok) {
          out.innerHTML = `<div class="alert err"><strong>Can't solve this yet.</strong><br>${SF.esc(r.error)}</div>`;
          return;
        }
        out.innerHTML = `
          <div class="card">
            <div class="row between" style="margin-bottom:8px">
              <span class="badge info">${SF.esc(r.kind)}</span>
              <span class="badge ok">${SF.icon("check")} Verified calculation</span>
            </div>
            <div class="answer-box" style="margin-bottom:12px">${SF.esc(r.answer)}</div>
            <ol class="steps">${r.steps.map((s) => `<li>${SF.esc(s)}</li>`).join("")}</ol>
            <div class="row" style="margin-top:12px">
              <button class="btn btn-secondary btn-sm" id="copySol">${SF.icon("copy")} Copy solution</button>
            </div>
          </div>`;
        el.querySelector("#copySol").onclick = () =>
          SF.copyText(`${q}\nAnswer: ${r.answer}\n\nSteps:\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
        const hist = SF.Store.list(NS);
        hist.push({ id: SF.uid("m"), q, a: r.answer, t: Date.now() });
        SF.Store.set(NS, "all", hist.slice(-50));
        SF.logActivity("math", q.slice(0, 60));
        renderHist();
        out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
      renderHist();
    },
  };
  SF.Modules.math = M;
})(typeof window !== "undefined" ? window : globalThis);
