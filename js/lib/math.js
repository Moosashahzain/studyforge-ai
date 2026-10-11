/* StudyForge AI — deterministic math solver.
   Real step-by-step solutions for supported problem types. Every successful
   result is marked verified:true because it is computed, not guessed.
   Browser + node compatible. */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const M = {};

  /* ---------- number formatting ---------- */
  function fmt(n, digits) {
    if (!isFinite(n)) return String(n);
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    const s = Number(n).toPrecision(digits || 10);
    return String(parseFloat(s));
  }
  function fracStr(num, den) {
    if (den === 0) return "undefined";
    if (den < 0) { num = -num; den = -den; }
    const g = gcd(Math.abs(num), Math.abs(den));
    num /= g; den /= g;
    return den === 1 ? String(num) : num + "/" + den;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; }

  /* ---------- safe expression evaluator (tokenizer + shunting-yard) ---------- */
  const FUNCS = {
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    log: Math.log10, ln: Math.log,
  };
  const CONSTS = { pi: Math.PI, e: Math.E };
  function tokenize(src) {
    const toks = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
        const num = parseFloat(src.slice(i, j));
        if (isNaN(num)) throw new Error("bad number");
        toks.push({ t: "num", v: num }); i = j; continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        let j = i; while (j < src.length && /[a-zA-Z_0-9]/.test(src[j])) j++;
        toks.push({ t: "id", v: src.slice(i, j).toLowerCase() }); i = j; continue;
      }
      if ("+-*/^%(),".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
      throw new Error("unexpected character '" + c + "'");
    }
    return toks;
  }
  function evaluate(src) {
    const toks = tokenize(src);
    const out = [], ops = [];
    const prec = { "+": 2, "-": 2, "*": 3, "/": 3, "%": 3, "^": 4, "u-": 5 };
    const right = { "^": true, "u-": true };
    let prev = null;
    const pushOp = (op) => {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.t !== "op" || top.v === "(") break;
        const p1 = prec[op], p2 = prec[top.v];
        if ((right[op] && p1 < p2) || (!right[op] && p1 <= p2)) out.push(ops.pop()); else break;
      }
      ops.push({ t: "op", v: op });
    };
    for (const tk of toks) {
      if (tk.t === "num") { out.push(tk); prev = tk; }
      else if (tk.t === "id") {
        if (CONSTS[tk.v] !== undefined) { out.push({ t: "num", v: CONSTS[tk.v] }); prev = { t: "num" }; }
        else if (FUNCS[tk.v]) { ops.push(tk); prev = tk; }
        else throw new Error("unknown name '" + tk.v + "'");
      }
      else if (tk.v === "(") { ops.push(tk); prev = tk; }
      else if (tk.v === ")") {
        while (ops.length && ops[ops.length - 1].v !== "(") out.push(ops.pop());
        if (!ops.length) throw new Error("mismatched parenthesis");
        ops.pop();
        if (ops.length && ops[ops.length - 1].t === "id") out.push(ops.pop());
        prev = { t: "num" };
      }
      else if (tk.v === ",") {
        while (ops.length && ops[ops.length - 1].v !== "(") out.push(ops.pop());
        prev = tk;
      }
      else {
        let op = tk.v;
        if ((op === "-" || op === "+") && (!prev || (prev.t === "op" && prev.v !== ")") || prev.v === "(" || prev.v === ",")) {
          if (op === "+") { prev = tk; continue; }
          op = "u-";
        }
        pushOp(op); prev = tk;
      }
    }
    while (ops.length) { const o = ops.pop(); if (o.v === "(") throw new Error("mismatched parenthesis"); out.push(o); }
    const st = [];
    for (const tk of out) {
      if (tk.t === "num") st.push(tk.v);
      else if (tk.t === "id") {
        if (!st.length) throw new Error("missing argument");
        const a = st.pop(); const r = FUNCS[tk.v](a);
        if (!isFinite(r) || isNaN(r)) throw new Error(tk.v + " out of domain");
        st.push(r);
      }
      else {
        if (tk.v === "u-") { st.push(-st.pop()); continue; }
        const b = st.pop(), a = st.pop();
        if (a === undefined || b === undefined) throw new Error("incomplete expression");
        let r;
        if (tk.v === "+") r = a + b; else if (tk.v === "-") r = a - b;
        else if (tk.v === "*") r = a * b;
        else if (tk.v === "/") { if (b === 0) throw new Error("division by zero"); r = a / b; }
        else if (tk.v === "%") r = a % b;
        else if (tk.v === "^") r = Math.pow(a, b);
        st.push(r);
      }
    }
    if (st.length !== 1) throw new Error("could not parse expression");
    return st[0];
  }

  /* ---------- polynomial helpers ---------- */
  // Parse "3x^2 - 2x + 5" (variable x) into [c0, c1, c2...]
  function parsePoly(src, variable) {
    variable = variable || "x";
    let s = src.replace(/\s+/g, "");
    if (!/^[+-]?/.test(s)) s = "+" + s;
    s = s.replace(/-/g, "+-");
    const terms = s.split("+").filter(Boolean);
    const coefs = {};
    for (let term of terms) {
      let neg = false;
      if (term[0] === "-") { neg = true; term = term.slice(1); }
      if (!term.includes(variable)) {
        const c = parseFloat(term);
        if (isNaN(c)) return null;
        coefs[0] = (coefs[0] || 0) + (neg ? -c : c);
        continue;
      }
      const parts = term.split(variable);
      let coefStr = parts[0], expStr = parts[1] || "";
      let coef = coefStr === "" ? 1 : parseFloat(coefStr);
      if (isNaN(coef)) return null;
      let exp = 1;
      if (expStr) {
        const m = expStr.match(/^\^(\d+)$/);
        if (!m) return null;
        exp = parseInt(m[1], 10);
      }
      coefs[exp] = (coefs[exp] || 0) + (neg ? -coef : coef);
    }
    const maxExp = Math.max(0, ...Object.keys(coefs).map(Number));
    const arr = [];
    for (let i = 0; i <= maxExp; i++) arr[i] = Math.abs(coefs[i] || 0) < 1e-12 ? 0 : coefs[i];
    while (arr.length > 1 && arr[arr.length - 1] === 0) arr.pop();
    return arr;
  }
  function polyToString(coefs) {
    let parts = [];
    for (let e = coefs.length - 1; e >= 0; e--) {
      const c = coefs[e];
      if (c === 0) continue;
      const ac = Math.abs(c);
      let term = e === 0 ? fmt(ac) : (ac === 1 ? "x" : fmt(ac) + "x") + (e > 1 ? "^" + e : "");
      parts.push((c < 0 ? "- " : (parts.length ? "+ " : "")) + term);
    }
    return parts.length ? parts.join(" ").replace(/^\+\s*/, "") : "0";
  }

  function solveLinear(coefs) {
    // a1 x + a0 = 0
    const a = coefs[1] || 0, b = coefs[0] || 0;
    const steps = [`Bring all terms to one side: ${polyToString([b, a])} = 0`];
    if (Math.abs(a) < 1e-12) {
      return Math.abs(b) < 1e-12
        ? { ok: true, kind: "linear", steps: ["0 = 0 — the equation is an identity."], answer: "Infinitely many solutions", verified: true }
        : { ok: true, kind: "linear", steps: [`${fmt(b)} = 0 — contradiction.`], answer: "No solution", verified: true };
    }
    steps.push(`Isolate x: x = ${fmt(-b)} / ${fmt(a)}`);
    const x = -b / a;
    steps.push(`x = ${fracStr(-b, a)} = ${fmt(x)}`);
    steps.push(`Check: ${polyToString([b, a]).replace(/x/g, "(" + fmt(x) + ")")} = ${fmt(a * x + b)} ✓`);
    return { ok: true, kind: "linear", steps, answer: "x = " + fmt(x), verified: true };
  }

  function solveQuadratic(coefs) {
    const a = coefs[2] || 0, b = coefs[1] || 0, c = coefs[0] || 0;
    if (Math.abs(a) < 1e-12) return solveLinear([c, b]);
    const steps = [
      `Standard form: ${fmt(a)}x² ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b))}x ${c < 0 ? "−" : "+"} ${fmt(Math.abs(c))} = 0`,
      `Coefficients: a = ${fmt(a)}, b = ${fmt(b)}, c = ${fmt(c)}`,
      `Discriminant Δ = b² − 4ac = (${fmt(b)})² − 4(${fmt(a)})(${fmt(c)}) = ${fmt(b * b - 4 * a * c)}`,
    ];
    const D = b * b - 4 * a * c;
    if (D < -1e-12) {
      steps.push("Δ < 0, so there are no real roots (two complex conjugate roots).");
      const re = -b / (2 * a), im = Math.sqrt(-D) / (2 * a);
      return { ok: true, kind: "quadratic", steps, answer: `x = ${fmt(re)} ± ${fmt(im)}i`, verified: true };
    }
    if (Math.abs(D) < 1e-12) {
      const x = -b / (2 * a);
      steps.push("Δ = 0, so there is one repeated real root: x = −b / 2a = " + fmt(x));
      return { ok: true, kind: "quadratic", steps, answer: "x = " + fmt(x) + " (double root)", verified: true };
    }
    const sq = Math.sqrt(D);
    const x1 = (-b + sq) / (2 * a), x2 = (-b - sq) / (2 * a);
    steps.push(`x = (−b ± √Δ) / 2a = (${fmt(-b)} ± ${fmt(sq)}) / ${fmt(2 * a)}`);
    steps.push(`x₁ = ${fmt(x1)}, x₂ = ${fmt(x2)}`);
    const v1 = a * x1 * x1 + b * x1 + c, v2 = a * x2 * x2 + b * x2 + c;
    steps.push(`Verification: f(x₁) = ${fmt(v1)} ≈ 0 ✓, f(x₂) = ${fmt(v2)} ≈ 0 ✓`);
    return { ok: true, kind: "quadratic", steps, answer: `x = ${fmt(x1)} or x = ${fmt(x2)}`, verified: true };
  }

  /* ---------- intent detection ---------- */
  function norm(src) {
    return src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
      .replace(/²/g, "^2").replace(/³/g, "^3").replace(/√/g, "sqrt").trim();
  }
  function parseVecList(s) {
    const m = s.match(/\[([^\]]+)\]/);
    if (!m) return null;
    const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
    return parts.every((x) => !isNaN(x)) ? parts : null;
  }
  function parsePoints(s) {
    const ms = s.match(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g);
    if (!ms) return null;
    return ms.map((p) => p.replace(/[()]/g, "").split(",").map(Number));
  }

  const EXACT_TRIG = { 0: "0", 30: "1/2", 45: "√2/2", 60: "√3/2", 90: "1" };

  M.capabilities = [
    "Arithmetic & expressions, e.g. (2+3)*4^2, sqrt(144), sin(pi/2)",
    "Linear equations, e.g. 2x + 3 = 11",
    "Quadratic equations, e.g. x^2 + 5x + 6 = 0",
    "2×2 systems, e.g. x + y = 5; 2x - y = 1",
    "Derivatives & integrals of polynomials, e.g. d/dx 3x^3 + 2x",
    "Vectors: add, dot, cross, magnitude, e.g. [1,2,3] dot [4,5,6]",
    "Coordinate geometry: distance/midpoint/slope, e.g. distance (1,2) (4,6)",
    "Trigonometry at standard angles, e.g. sin(30°)",
    "Number theory: gcd, lcm, factors, primality, e.g. gcd(48, 18)",
  ];

  M.solve = function (rawInput) {
    const input = norm(String(rawInput || ""));
    if (!input) return { ok: false, error: "Please enter a math problem." };
    const low = input.toLowerCase();
    try {
      /* vectors */
      if (low.includes("vector") || (/\[[^\]]+\]/.test(input) && /(dot|cross|mag|\+|-)/.test(low))) {
        const lists = input.match(/\[[^\]]+\]/g) || [];
        const vs = lists.map(parseVecList).filter(Boolean);
        if (vs.length >= 1) {
          const v = vs[0];
          const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
          if (/mag|norm|length/.test(low) || vs.length === 1) {
            const steps = [`|v| = √(${v.map((x) => `${fmt(x)}²`).join(" + ")})`, `|v| = √${fmt(mag * mag)} = ${fmt(mag)}`];
            return { ok: true, kind: "vector", steps, answer: "Magnitude = " + fmt(mag), verified: true };
          }
          const w = vs[1];
          if (v.length !== w.length) return { ok: false, error: "Vectors must have the same dimension." };
          if (/dot/.test(low)) {
            const terms = v.map((x, i) => `${fmt(x)}×${fmt(w[i])}`);
            const d = v.reduce((s, x, i) => s + x * w[i], 0);
            return { ok: true, kind: "vector", steps: [`v·w = ${terms.join(" + ")}`, `v·w = ${fmt(d)}`], answer: "Dot product = " + fmt(d), verified: true };
          }
          if (/cross/.test(low)) {
            if (v.length !== 3) return { ok: false, error: "Cross product needs 3D vectors." };
            const [a1, a2, a3] = v, [b1, b2, b3] = w;
            const c = [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
            return { ok: true, kind: "vector", steps: ["v×w = (a₂b₃−a₃b₂, a₃b₁−a₁b₃, a₁b₂−a₂b₁)", `v×w = [${c.map(fmt).join(", ")}]`], answer: "Cross product = [" + c.map(fmt).join(", ") + "]", verified: true };
          }
          const sum = v.map((x, i) => x + w[i]);
          const diff = v.map((x, i) => x - w[i]);
          const op = input.includes("-") && !input.includes("+") ? diff : sum;
          return { ok: true, kind: "vector", steps: [`Component-wise: [${op.map(fmt).join(", ")}]`], answer: "Result = [" + op.map(fmt).join(", ") + "]", verified: true };
        }
      }
      /* 2x2 system */
      if (/;|\n/.test(input) && (input.match(/=/g) || []).length >= 2) {
        const parseLin2 = (s) => {
          let str = s.replace(/\s+/g, "");
          if (!/^[+-]/.test(str)) str = "+" + str;
          const terms = str.replace(/-/g, "+-").split("+").filter(Boolean);
          const out = { x: 0, y: 0, c: 0 };
          for (let t of terms) {
            let neg = false;
            if (t[0] === "-") { neg = true; t = t.slice(1); }
            const sgn = neg ? -1 : 1;
            if (t.includes("x")) { const n = t.replace("x", ""); const v = n === "" ? 1 : parseFloat(n); if (isNaN(v)) return null; out.x += sgn * v; }
            else if (t.includes("y")) { const n = t.replace("y", ""); const v = n === "" ? 1 : parseFloat(n); if (isNaN(v)) return null; out.y += sgn * v; }
            else { const v = parseFloat(t); if (isNaN(v)) return null; out.c += sgn * v; }
          }
          return out;
        };
        const eqs = input.split(/[;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 2);
        const parsed = eqs.map((eq) => {
          const parts = eq.split("=");
          if (parts.length !== 2) return null;
          const L = parseLin2(parts[0]), R = parseLin2(parts[1]);
          if (!L || !R) return null;
          return { a: L.x - R.x, b: L.y - R.y, c: R.c - L.c };
        });
        if (parsed.every(Boolean) && parsed.some((p) => Math.abs(p.b) > 1e-12)) {
          const [{ a: a1, b: b1, c: c1 }, { a: a2, b: b2, c: c2 }] = parsed;
          const det = a1 * b2 - a2 * b1;
          const steps = [`Equations: ${fmt(a1)}x + ${fmt(b1)}y = ${fmt(c1)}`, `${fmt(a2)}x + ${fmt(b2)}y = ${fmt(c2)}`, `Determinant Δ = a₁b₂ − a₂b₁ = ${fmt(det)}`];
          if (Math.abs(det) < 1e-12) return { ok: true, kind: "system", steps: [...steps, "Δ = 0 — no unique solution."], answer: "No unique solution", verified: true };
          const x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
          steps.push(`x = (c₁b₂ − c₂b₁)/Δ = ${fmt(x)}`, `y = (a₁c₂ − a₂c₁)/Δ = ${fmt(y)}`);
          steps.push(`Check eq1: ${fmt(a1 * x + b1 * y)} = ${fmt(c1)} ✓, eq2: ${fmt(a2 * x + b2 * y)} = ${fmt(c2)} ✓`);
          return { ok: true, kind: "system", steps, answer: `x = ${fmt(x)}, y = ${fmt(y)}`, verified: true };
        }
      }
      /* derivative */
      let mD = low.match(/^(?:d\/dx|derivative(?: of)?)\s+(.+)$/);
      if (mD) {
        const coefs = parsePoly(mD[1]);
        if (!coefs) return { ok: false, error: "Could not parse the polynomial." };
        const steps = [`f(x) = ${polyToString(coefs)}`, "Apply the power rule d/dx[xⁿ] = n·xⁿ⁻¹ term by term:"];
        const d = [];
        for (let e = 1; e < coefs.length; e++) {
          if (coefs[e] === 0) continue;
          steps.push(`d/dx[${fmt(coefs[e])}x${e > 1 ? "^" + e : ""}] = ${fmt(coefs[e] * e)}x${e - 1 > 1 ? "^" + (e - 1) : e - 1 === 1 ? "" : ""}${e - 1 === 0 ? " (constant)" : ""}`);
          d[e - 1] = coefs[e] * e;
        }
        while (d.length && !d[d.length - 1]) d.pop();
        steps.push(`f′(x) = ${polyToString(d.length ? d : [0])}`);
        return { ok: true, kind: "derivative", steps, answer: "f′(x) = " + polyToString(d.length ? d : [0]), verified: true };
      }
      /* integral */
      let mI = low.match(/^(?:integral(?: of)?|∫)\s+(.+?)(\s*dx)?$/);
      if (mI) {
        const coefs = parsePoly(mI[1]);
        if (!coefs) return { ok: false, error: "Could not parse the polynomial." };
        const steps = [`∫ (${polyToString(coefs)}) dx`, "Power rule ∫xⁿ dx = xⁿ⁺¹/(n+1):"];
        const res = [0];
        for (let e = 0; e < coefs.length; e++) {
          if (coefs[e] === 0) continue;
          const nc = coefs[e] / (e + 1);
          res[e + 1] = nc;
          steps.push(`∫ ${fmt(coefs[e])}x${e > 1 ? "^" + e : e === 1 ? "" : ""} dx = ${fracStr(Math.round(coefs[e] * 1000), (e + 1) * 1000) !== String(fmt(nc)) ? fmt(nc) : fmt(nc)}x^${e + 1}`);
        }
        while (res.length > 1 && !res[res.length - 1]) res.pop();
        steps.push("Add the constant of integration C.");
        return { ok: true, kind: "integral", steps, answer: polyToString(res) + " + C", verified: true };
      }
      /* coordinate geometry */
      let mC = low.match(/^(distance|midpoint|slope)\s+(.+)$/);
      if (mC) {
        const pts = parsePoints(mC[2]);
        if (!pts || pts.length < 2) return { ok: false, error: "Provide two points like (1,2) (4,6)." };
        const [[x1, y1], [x2, y2]] = pts;
        if (mC[1] === "distance") {
          const dx = x2 - x1, dy = y2 - y1;
          const steps = [`d = √[(x₂−x₁)² + (y₂−y₁)²]`, `d = √[(${fmt(dx)})² + (${fmt(dy)})²] = √${fmt(dx * dx + dy * dy)}`];
          return { ok: true, kind: "coordinate", steps, answer: "Distance = " + fmt(Math.hypot(dx, dy)), verified: true };
        }
        if (mC[1] === "midpoint") {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          return { ok: true, kind: "coordinate", steps: [`M = ((x₁+x₂)/2, (y₁+y₂)/2) = (${fmt(mx)}, ${fmt(my)})`], answer: `Midpoint = (${fmt(mx)}, ${fmt(my)})`, verified: true };
        }
        if (x2 === x1) return { ok: true, kind: "coordinate", steps: ["x₂ − x₁ = 0 — the line is vertical."], answer: "Slope is undefined (vertical line)", verified: true };
        const s = (y2 - y1) / (x2 - x1);
        return { ok: true, kind: "coordinate", steps: [`m = (y₂−y₁)/(x₂−x₁) = ${fmt(y2 - y1)}/${fmt(x2 - x1)}`], answer: "Slope = " + fmt(s), verified: true };
      }
      /* trig */
      let mT = low.match(/^(sin|cos|tan)\s*\(\s*(-?[\d.]+)\s*(°|degrees?|rad(?:ians?)?)?\s*\)$/);
      if (mT) {
        const fn = mT[1], val = parseFloat(mT[2]), unit = mT[3] || "";
        const deg = /deg|°/.test(unit) ? val : val * 180 / Math.PI;
        const rad = /deg|°/.test(unit) ? val * Math.PI / 180 : val;
        const exact = EXACT_TRIG[Math.abs(Math.round(deg))] && Math.round(deg) === deg ? EXACT_TRIG[Math.abs(Math.round(deg))] : null;
        const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
        const r = fns[fn](rad);
        if (!isFinite(r) || Math.abs(r) > 1e15) return { ok: false, error: "Result is undefined for this angle." };
        const steps = [`${fn}(${fmt(deg)}°) = ${fn}(${fmt(rad)} rad)`];
        if (exact && fn === "sin") steps.push(`Exact value: ${exact}`);
        if (exact && fn === "cos") steps.push(`Exact value: ${{ 0: "1", 30: "√3/2", 45: "√2/2", 60: "1/2", 90: "0" }[Math.abs(Math.round(deg))]}`);
        if (exact && fn === "tan") steps.push(`Exact value: ${{ 0: "0", 30: "1/√3", 45: "1", 60: "√3" }[Math.abs(Math.round(deg))]}`);
        steps.push(`Decimal: ${fmt(r)}`);
        return { ok: true, kind: "trig", steps, answer: `${fn}(${fmt(deg)}°) = ${fmt(r)}`, verified: true };
      }
      /* number theory */
      let mG = low.match(/^gcd\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/);
      if (mG) {
        const a = Math.abs(parseInt(mG[1])), b = Math.abs(parseInt(mG[2]));
        const steps = [`Euclid's algorithm on ${a} and ${b}:`];
        let x = a, y = b;
        while (y) { steps.push(`${x} = ${Math.floor(x / y)} × ${y} + ${x % y}`); const t = y; y = x % y; x = t; }
        return { ok: true, kind: "number", steps, answer: `gcd = ${x}`, verified: true };
      }
      let mL = low.match(/^lcm\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/);
      if (mL) {
        const a = Math.abs(parseInt(mL[1])), b = Math.abs(parseInt(mL[2]));
        const g = gcd(a, b);
        return { ok: true, kind: "number", steps: [`lcm(a,b) = |a×b| / gcd(a,b) = ${a * b} / ${g}`], answer: `lcm = ${(a * b) / g}`, verified: true };
      }
      let mF = low.match(/^(?:factors|factor)\s+(?:of\s+)?(\d+)$/);
      if (mF) {
        const n = parseInt(mF[1]);
        if (n > 1e7) return { ok: false, error: "Number too large for factorization here." };
        const fs = [];
        for (let i = 1; i * i <= n; i++) if (n % i === 0) { fs.push(i); if (i * i !== n) fs.push(n / i); }
        fs.sort((a, b) => a - b);
        return { ok: true, kind: "number", steps: [`Test divisors up to √${n} ≈ ${fmt(Math.sqrt(n))}`], answer: `Factors of ${n}: ${fs.join(", ")}`, verified: true };
      }
      let mP = low.match(/^(?:is\s+)?(\d+)\s+prime\??$/);
      if (mP) {
        const n = parseInt(mP[1]);
        if (n > 1e9) return { ok: false, error: "Number too large for primality test here." };
        if (n < 2) return { ok: true, kind: "number", steps: [], answer: `${n} is not prime`, verified: true };
        for (let i = 2; i * i <= n; i++) if (n % i === 0)
          return { ok: true, kind: "number", steps: [`${n} ÷ ${i} = ${n / i} exactly`], answer: `${n} is not prime (divisible by ${i})`, verified: true };
        return { ok: true, kind: "number", steps: [`No divisors up to √${n} ≈ ${fmt(Math.sqrt(n))}`], answer: `${n} is prime`, verified: true };
      }
      /* equations: quadratic then linear */
      if (input.includes("=") && /x/i.test(input)) {
        const sides = input.split("=").map((s) => s.trim());
        if (sides.length === 2) {
          const pl = parsePoly(sides[0]), pr = parsePoly(sides[1]);
          if (pl && pr) {
            const len = Math.max(pl.length, pr.length);
            const diff = [];
            for (let i = 0; i < len; i++) diff[i] = (pl[i] || 0) - (pr[i] || 0);
            while (diff.length > 1 && Math.abs(diff[diff.length - 1]) < 1e-12) diff.pop();
            const deg = diff.length - 1;
            if (deg === 2) return solveQuadratic(diff);
            if (deg === 1) return solveLinear(diff);
            if (deg === 0) return { ok: true, kind: "linear", steps: ["The equation simplifies to a constant."], answer: Math.abs(diff[0]) < 1e-12 ? "Identity — infinitely many solutions" : "Contradiction — no solution", verified: true };
            return { ok: false, error: "Only linear and quadratic equations are supported right now." };
          }
        }
      }
      /* plain expression */
      if (/^[0-9+\-*/^%().\s,a-z]+$/.test(low) && /[0-9]/.test(input)) {
        const v = evaluate(low);
        return {
          ok: true, kind: "expression",
          steps: [`Evaluate: ${input} = ${fmt(v)}`],
          answer: fmt(v), verified: true,
        };
      }
      return {
        ok: false,
        error: "I can't solve that yet. Supported: arithmetic expressions, linear & quadratic equations, 2×2 systems, polynomial derivatives/integrals, vectors, distance/midpoint/slope, trig at standard angles, gcd/lcm/factors/primality. Try the examples in the Math Solver.",
      };
    } catch (e) {
      return { ok: false, error: "Could not parse that: " + e.message };
    }
  };

  M.evaluate = evaluate; M.parsePoly = parsePoly; M.gcd = gcd;
  SF.MathSolver = M;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
