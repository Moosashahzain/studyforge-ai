/* StudyForge AI — quiz engine: build from banks, shuffle, grade (browser + node) */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const Q = {};

  function shuffle(arr, rand) {
    const a = arr.slice(); const r = rand || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // Deterministic PRNG for tests
  Q.seeded = function (seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };

  // bank: array of {subject, topic, difficulty 1-3, type:'mcq'|'short', q, options[], answer, explanation}
  Q.build = function (bank, opts) {
    opts = opts || {};
    let pool = bank.filter((q) => !opts.subject || q.subject === opts.subject);
    if (opts.topic) pool = pool.filter((q) => q.topic === opts.topic);
    if (opts.difficulty) pool = pool.filter((q) => q.difficulty === Number(opts.difficulty));
    if (opts.type && opts.type !== "mixed") pool = pool.filter((q) => q.type === opts.type);
    const rand = opts.seed != null ? Q.seeded(opts.seed) : Math.random;
    pool = shuffle(pool, rand);
    const picked = pool.slice(0, Math.min(opts.count || 10, pool.length)).map((q, i) => {
      const c = JSON.parse(JSON.stringify(q));
      c.n = i + 1;
      if (c.type === "mcq" && c.options) {
        const order = shuffle(c.options.map((_, idx) => idx), rand);
        c.shuffled = order.map((oi) => c.options[oi]);
        c.answerIndex = order.indexOf(c.answer);
      }
      return c;
    });
    return { questions: picked, available: pool.length, requested: opts.count || 10 };
  };

  // answers: {questionN: selectedIndex} for mcq, {questionN: text} for short
  Q.grade = function (questions, answers) {
    let score = 0;
    const per = questions.map((q) => {
      const given = answers["q" + q.n];
      let correct = false, expected = "", got = "";
      if (q.type === "mcq") {
        correct = Number(given) === q.answerIndex;
        expected = q.shuffled[q.answerIndex]; got = q.shuffled[Number(given)];
      } else {
        const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
        const keys = Array.isArray(q.answer) ? q.answer : [q.answer];
        correct = keys.some((k) => norm(given) === norm(k) || (norm(given).length > 3 && norm(k).includes(norm(given))));
        expected = keys[0]; got = given;
      }
      if (correct) score++;
      return { n: q.n, correct, expected, got, explanation: q.explanation || "" };
    });
    const total = questions.length;
    return { score, total, pct: total ? Math.round((score / total) * 100) : 0, per };
  };

  Q.gradeLabel = function (pct) {
    if (pct >= 90) return "Outstanding"; if (pct >= 75) return "Good";
    if (pct >= 60) return "Satisfactory"; if (pct >= 40) return "Needs work"; return "Keep practicing";
  };

  SF.Quiz = Q;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
