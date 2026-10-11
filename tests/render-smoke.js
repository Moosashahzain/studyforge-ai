/* StudyForge AI — render smoke tests.
   Executes every module's render() against a universal DOM stub to catch
   ReferenceErrors, typos and bad template code without a browser.
   Run: node --test tests/render-smoke.js */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// ---- universal stub: any property get returns a stub, any call returns a stub ----
function makeStub() {
  const fn = function () {};
  return new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => "";
      if (p === "then") return undefined;
      if (p === "value") return "";
      if (p === "checked") return false;
      if (p === "length") return 0;
      return makeStub();
    },
    set() { return true; },
    apply() { return makeStub(); },
    has() { return true; },
  });
}

global.window = globalThis;
global.window.SF_DATA = {
  questions: JSON.parse(fs.readFileSync(path.join(__dirname, "../data/questions.json"), "utf8")),
  glossary: JSON.parse(fs.readFileSync(path.join(__dirname, "../data/glossary.json"), "utf8")),
  formulas: JSON.parse(fs.readFileSync(path.join(__dirname, "../data/formulas.json"), "utf8")),
  curriculum: JSON.parse(fs.readFileSync(path.join(__dirname, "../data/curriculum.json"), "utf8")),
};
global.location = { hash: "#/tutor", reload() {} };
global.document = makeStub();
global.document.documentElement = makeStub();
global.navigator = {};

// load core + libs + modules (order matters)
const SF = require("../js/core/utils.js");
require("../js/core/store.js");
require("../js/core/icons.js");
require("../js/core/i18n.js");
require("../js/core/router.js");
require("../js/lib/math.js");
require("../js/lib/validators.js");
require("../js/lib/text.js");
require("../js/lib/quiz.js");
require("../js/ai/demo.js");
require("../js/ai/provider.js");
for (const m of ["export", "tutor", "math-ui", "notes", "quiz-ui", "docs", "planner", "flashcards", "dashboard", "history", "settings"]) {
  require("../js/modules/" + m + ".js");
}

function renderEl() {
  let html = "";
  const listeners = {};
  return {
    set innerHTML(v) { html += String(v); },
    get innerHTML() { return html; },
    querySelector() { return makeStub(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    get _html() { return html; },
  };
}

describe("Module render smoke", () => {
  const cases = [
    ["tutor", "#/tutor"],
    ["math", "#/math"],
    ["notes", "#/notes"],
    ["notes", "#/notes?tab=lib"],
    ["quiz", "#/quiz"],
    ["docs", "#/docs"],
    ["planner", "#/planner"],
    ["flashcards", "#/flashcards"],
    ["dashboard", "#/dashboard"],
    ["history", "#/history"],
    ["settings", "#/settings"],
  ];
  for (const [name, hash] of cases) {
    it(`${name} renders without throwing (${hash})`, () => {
      global.location.hash = hash;
      const el = renderEl();
      SF.Modules[name].render(el);
      assert.ok(el._html.length > 200, "render produced HTML");
    });
  }
  it("all renders escape user-ish content (spot check esc usage)", () => {
    // every module file should use SF.esc when injecting data
    for (const m of ["tutor", "notes", "quiz-ui", "docs", "planner", "flashcards", "dashboard", "history"]) {
      const src = fs.readFileSync(path.join(__dirname, "../js/modules/" + m + ".js"), "utf8");
      assert.ok(src.includes("SF.esc("), m + " should use SF.esc");
    }
  });
});
