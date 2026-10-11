/* StudyForge AI — automated tests. Run: node --test tests/ */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const SF = require("../js/lib/math.js");
require("../js/lib/quiz.js");
require("../js/lib/validators.js");
require("../js/lib/text.js");
require("../js/lib/../core/utils.js");
require("../js/lib/../core/store.js");
require("../js/ai/demo.js");

describe("MathSolver", () => {
  it("solves quadratic x^2 + 5x + 6 = 0", () => {
    const r = SF.MathSolver.solve("x^2 + 5x + 6 = 0");
    assert.equal(r.ok, true);
    assert.match(r.answer, /-2/); assert.match(r.answer, /-3/);
    assert.equal(r.verified, true);
    assert.ok(r.steps.length >= 3);
  });
  it("solves linear 2x + 3 = 11", () => {
    const r = SF.MathSolver.solve("2x + 3 = 11");
    assert.equal(r.ok, true); assert.match(r.answer, /4/); assert.equal(r.verified, true);
  });
  it("detects no-solution linear", () => {
    const r = SF.MathSolver.solve("0x + 5 = 0");
    // 0x+5=0 -> parsePoly gives [5], degree 0, contradiction
    assert.equal(r.ok, true); assert.match(r.answer, /no solution/i);
  });
  it("solves 2x2 system", () => {
    const r = SF.MathSolver.solve("x + y = 5; 2x - y = 1");
    assert.equal(r.ok, true);
    assert.match(r.answer, /x = 2/); assert.match(r.answer, /y = 3/);
  });
  it("evaluates expressions safely", () => {
    assert.equal(SF.MathSolver.solve("(2+3)*4^2").answer, "80");
    assert.equal(SF.MathSolver.solve("sqrt(144)").answer, "12");
  });
  it("rejects division by zero with a clear error", () => {
    const r = SF.MathSolver.solve("1/0");
    assert.equal(r.ok, false); assert.match(r.error, /division by zero/);
  });
  it("differentiates polynomials", () => {
    const r = SF.MathSolver.solve("d/dx 3x^3 + 2x");
    assert.equal(r.ok, true); assert.match(r.answer, /9x\^2/);
  });
  it("integrates polynomials", () => {
    const r = SF.MathSolver.solve("integral 2x");
    assert.equal(r.ok, true); assert.match(r.answer, /x\^2/); assert.match(r.answer, /C/);
  });
  it("computes vector dot product", () => {
    const r = SF.MathSolver.solve("[1,2,3] dot [4,5,6]");
    assert.equal(r.ok, true); assert.match(r.answer, /32/);
  });
  it("computes distance", () => {
    const r = SF.MathSolver.solve("distance (1,2) (4,6)");
    assert.equal(r.ok, true); assert.match(r.answer, /5/);
  });
  it("trig at standard angle", () => {
    const r = SF.MathSolver.solve("sin(30°)");
    assert.equal(r.ok, true); assert.match(r.answer, /0\.5/);
  });
  it("gcd with Euclid steps", () => {
    const r = SF.MathSolver.solve("gcd(48, 18)");
    assert.equal(r.ok, true); assert.match(r.answer, /6/); assert.ok(r.steps.length > 1);
  });
  it("primality test", () => {
    assert.match(SF.MathSolver.solve("29 prime").answer, /is prime/);
    assert.match(SF.MathSolver.solve("21 prime").answer, /not prime/);
  });
  it("rejects unsupported input honestly", () => {
    const r = SF.MathSolver.solve("solve the riemann hypothesis");
    assert.equal(r.ok, false); assert.match(r.error, /can't solve that yet/i);
  });
  it("does not use eval", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "../js/lib/math.js"), "utf8");
    assert.ok(!/\beval\s*\(/.test(src), "math.js must not use eval()");
  });
});

describe("Quiz engine", () => {
  const bank = [
    { subject: "Mathematics", topic: "Algebra", difficulty: 1, type: "mcq", q: "Q1", options: ["a", "b", "c"], answer: 2, explanation: "e1" },
    { subject: "Mathematics", topic: "Algebra", difficulty: 2, type: "mcq", q: "Q2", options: ["a", "b"], answer: 0, explanation: "e2" },
    { subject: "Physics", topic: "Mechanics", difficulty: 1, type: "short", q: "Q3", answer: ["yes"], explanation: "e3" },
  ];
  it("builds filtered quizzes", () => {
    const b = SF.Quiz.build(bank, { subject: "Mathematics", count: 10, seed: 42 });
    assert.equal(b.questions.length, 2);
    assert.equal(b.available, 2);
  });
  it("is deterministic with a seed", () => {
    const a = SF.Quiz.build(bank, { count: 3, seed: 7 }).questions.map((q) => q.q);
    const bq = SF.Quiz.build(bank, { count: 3, seed: 7 }).questions.map((q) => q.q);
    assert.deepEqual(a, bq);
  });
  it("grades mcq and short answers", () => {
    const built = SF.Quiz.build(bank, { count: 3, seed: 1 });
    const answers = {};
    for (const q of built.questions) {
      answers["q" + q.n] = q.type === "mcq" ? q.answerIndex : (Array.isArray(q.answer) ? q.answer[0] : q.answer);
    }
    const res = SF.Quiz.grade(built.questions, answers);
    assert.equal(res.score, 3); assert.equal(res.pct, 100);
  });
  it("marks wrong answers incorrect", () => {
    const built = SF.Quiz.build(bank, { subject: "Mathematics", count: 2, seed: 1 });
    const res = SF.Quiz.grade(built.questions, { q1: 999, q2: 999 });
    assert.equal(res.score, 0);
    assert.equal(res.per[0].correct, false);
  });
  it("grade labels are sane", () => {
    assert.equal(SF.Quiz.gradeLabel(95), "Outstanding");
    assert.equal(SF.Quiz.gradeLabel(10), "Keep practicing");
  });
});

describe("Validators", () => {
  it("validates emails", () => {
    assert.equal(SF.Validators.isEmail("a@b.com"), true);
    assert.equal(SF.Validators.isEmail("not-an-email"), false);
  });
  it("validates urls", () => {
    assert.equal(SF.Validators.isURL("https://example.com"), true);
    assert.equal(SF.Validators.isURL("javascript:alert(1)"), false);
  });
  it("checks file types and sizes", () => {
    assert.equal(SF.Validators.fileExtOk("doc.pdf", ["pdf", "txt"]), true);
    assert.equal(SF.Validators.fileExtOk("doc.exe", ["pdf", "txt"]), false);
    assert.equal(SF.Validators.fileSizeOk(5 * 1024 * 1024, 10), true);
    assert.equal(SF.Validators.fileSizeOk(11 * 1024 * 1024, 10), false);
  });
  it("detects inline html", () => {
    assert.equal(SF.Validators.noHTML("plain text"), true);
    assert.equal(SF.Validators.noHTML('<img src=x onerror=1>'), false);
  });
});

describe("Text analysis", () => {
  const txt = "Photosynthesis converts light energy into chemical energy. Plants use chlorophyll to capture sunlight. Mitochondria produce energy for the cell. Photosynthesis occurs in the chloroplasts of plant cells.";
  it("summarizes extractively", () => {
    const r = SF.Text.summarize(txt, 2);
    assert.equal(r.method, "extractive");
    assert.equal(r.sentences.length, 2);
  });
  it("extracts keywords", () => {
    const ks = SF.Text.keywords(txt, 5);
    assert.ok(ks.includes("photosynthesis") || ks.includes("energy"));
  });
  it("builds cloze cards", () => {
    const cards = SF.Text.clozeCards(txt, 4);
    assert.ok(cards.length > 0);
    assert.ok(cards[0].front.includes("_____"));
    assert.ok(cards[0].back.length > 0);
  });
});

describe("Store", () => {
  it("round-trips set/get/list/del", () => {
    SF.Store.set("t", "a", { x: 1 });
    assert.deepEqual(SF.Store.get("t", "a"), { x: 1 });
    assert.equal(SF.Store.list("t").length, 1);
    SF.Store.del("t", "a");
    assert.equal(SF.Store.get("t", "a", null), null);
  });
  it("exportAll produces parseable JSON", () => {
    SF.Store.set("t", "b", { y: 2 });
    const j = JSON.parse(SF.Store.exportAll());
    assert.ok(Object.keys(j).some((k) => k.includes("sf2:t:b")));
    SF.Store.wipe();
  });
});

describe("Utils", () => {  it("escapes HTML", () => {
    assert.equal(SF.esc('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
  it("renders mini-markdown safely", () => {
    const h = SF.md("**bold** and <script>evil</script>");
    assert.ok(h.includes("<strong>bold</strong>"));
    assert.ok(!h.includes("<script>"));
  });
});

describe("Demo engine", () => {
  const glossary = { Biology: { Photosynthesis: "Plants convert light." } };
  const formulas = { Trigonometry: ["sin²θ + cos²θ = 1"] };
  it("routes natural-language math to the solver", async () => {
    const r = await SF.Demo.respond([{ role: "user", content: "Solve x^2 + 5x + 6 = 0 step by step" }]);
    assert.equal(r.demo, true);
    assert.equal(r.kind, "math");
    assert.match(r.text, /-2/);
  });
  it("answers Define: <term> with colon", async () => {
    const r = await SF.Demo.respond([{ role: "user", content: "Define: photosynthesis" }], { glossary });
    assert.equal(r.kind, "definition");
    assert.match(r.text, /Photosynthesis/);
  });
  it("serves formula sheets", async () => {
    const r = await SF.Demo.respond([{ role: "user", content: "Formulas for trigonometry" }], { formulas });
    assert.equal(r.kind, "formulas");
  });
  it("labels every response as demo", async () => {
    for (const q of ["hello", "quiz me", "how do I study for exams?"]) {
      const r = await SF.Demo.respond([{ role: "user", content: q }]);
      assert.equal(r.demo, true, q);
    }
  });
});
