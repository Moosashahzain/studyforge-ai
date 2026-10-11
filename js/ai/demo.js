/* StudyForge AI — demo engine.
   IMPORTANT: every response produced here is deterministic on-device logic,
   NOT a large language model. All UI surfaces must label it "Demo". */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const D = {};

  D.suggestedPrompts = [
    "Solve x^2 + 5x + 6 = 0 step by step",
    "Summarize: paste a paragraph to get key points",
    "Define: photosynthesis",
    "Give me the formula sheet for Trigonometry",
    "How should I prepare for a physics exam?",
    "Quiz me on algebra basics",
  ];

  function looksLikeMath(s) {
    return /[0-9]/.test(s) && /[+\-*/^=√∫]|sin|cos|tan|gcd|lcm|vector|distance|midpoint|slope|derivative|integral|d\/dx|prime|factor/i.test(s);
  }

  // Pull a solvable expression out of natural language like
  // "Solve x^2 + 5x + 6 = 0 step by step" -> "x^2 + 5x + 6 = 0"
  function extractMath(s) {
    let t = String(s).trim()
      .replace(/^(?:please\s+)?(?:solve|calculate|compute|evaluate|simplify|work\s+out)\s*:?\s+/i, "")
      .replace(/\s*(?:step\s+by\s+step|please|for\s+me|with\s+steps)\s*[.?]*$/i, "")
      .trim();
    return t || s;
  }

  D.respond = async function (messages, opts) {
    opts = opts || {};
    const last = (messages.filter((m) => m.role === "user").pop() || {}).content || "";
    const text = String(last).trim();
    const bank = opts.bank || [];
    const glossary = opts.glossary || {};
    const formulas = opts.formulas || {};

    if (!text) return { text: "Ask me a study question to begin.", demo: true };

    // 1. Math → real solver
    if (looksLikeMath(text)) {
      const r = SF.MathSolver.solve(extractMath(text));
      if (r.ok) {
        let md = `**${r.answer}**\n\n`;
        r.steps.forEach((s, i) => { md += `${i + 1}. ${s}\n`; });
        md += `\n*Verified calculation — computed step by step, not guessed.*`;
        return { text: md, demo: true, kind: "math" };
      }
      return {
        text: `I couldn't solve that with the built-in solver.\n\n**The solver handles:**\n${SF.MathSolver.capabilities.map((c) => "- " + c).join("\n")}\n\n*Tip: open the Math Solver page for guided input and more examples.*`,
        demo: true, kind: "math-unsupported",
      };
    }

    // 2. Summarize pasted/long text
    const sumM = text.match(/^(?:summarize|summary|tl;dr)[:\s]+([\s\S]{80,})$/i);
    if (sumM || text.length > 600) {
      const body = sumM ? sumM[1] : text;
      const { sentences, note } = SF.Text.summarize(body, 5);
      const keys = SF.Text.keywords(body, 8);
      let md = `**Summary** (${note})\n\n`;
      sentences.forEach((s) => { md += `- ${s}\n`; });
      if (keys.length) md += `\n**Key terms:** ${keys.join(", ")}`;
      md += `\n\n*Extractive summary — top sentences picked by keyword coverage, generated on-device.*`;
      return { text: md, demo: true, kind: "summary" };
    }

    // 3. Definitions
    const defM = text.match(/^(?:define|definition of|what is|what's|explain)\s*:?\s*([a-zA-Z][a-zA-Z\s-]{1,40})\??$/i);
    if (defM) {
      const term = defM[1].trim();
      for (const subj of Object.keys(glossary)) {
        for (const [k, v] of Object.entries(glossary[subj])) {
          if (k.toLowerCase() === term.toLowerCase()) {
            return { text: `**${k}** (${subj})\n\n${v}\n\n*From the built-in glossary.*`, demo: true, kind: "definition" };
          }
        }
      }
      return { text: `I don't have a glossary entry for "${term}" yet.\n\nTry the **Notes** page → Definitions tab, or ask about a core term like *photosynthesis*, *derivative* or *algorithm*.\n\n*Demo glossary is intentionally small; connect a real AI model for open-ended explanations.*`, demo: true, kind: "definition-missing" };
    }

    // 4. Formula sheets
    const fM = text.match(/formula(?:s| sheet)?(?: for| of)?\s+([a-zA-Z][a-zA-Z\s&]*)/i);
    if (fM) {
      const topic = fM[1].trim().toLowerCase();
      const hit = Object.keys(formulas).find((k) => k.toLowerCase().includes(topic) || topic.includes(k.toLowerCase()));
      if (hit) {
        return { text: `**Formula sheet — ${hit}**\n\n${formulas[hit].map((f) => `- ${f}`).join("\n")}`, demo: true, kind: "formulas" };
      }
      return { text: `No formula sheet for "${fM[1].trim()}" yet. Available: ${Object.keys(formulas).join(", ")}.`, demo: true, kind: "formulas-missing" };
    }

    // 5. Quiz / flashcards pointers (real features live in their modules)
    if (/quiz|test me|mcq/i.test(text)) {
      return { text: `I can build you a real quiz right now — open the **Quiz** page, pick a subject, topic, difficulty and question count, and I'll generate it from the built-in question bank with instant scoring and review.\n\n*Quizzes are generated from verified question banks, not invented on the spot.*`, demo: true, kind: "pointer" };
    }
    if (/flashcard/i.test(text)) {
      return { text: `Head to the **Flashcards** page: create your own cards, or auto-generate cloze cards from any notes text, then review with shuffle and known/unknown tracking.`, demo: true, kind: "pointer" };
    }

    // 6. Study strategy (generic, honest guidance)
    if (/exam|study|prepare|revision|learn|how (do|can) i/i.test(text)) {
      return {
        text: `**Study strategy that actually works**\n\n1. **Active recall** — close the book and write what you remember, then check. Use the Flashcards page for this.\n2. **Spaced repetition** — review the same material after 1 day, 3 days, then a week.\n3. **Interleaving** — mix topics in one session instead of drilling one chapter for hours.\n4. **Practice under exam conditions** — generate a Quiz with a timer mindset and review every wrong answer.\n5. **Teach it** — explain the concept aloud as if teaching a friend; gaps in your explanation are gaps in understanding.\n\n*General evidence-based guidance. For subject-specific help, ask a concrete question or paste the material into Notes.*`,
        demo: true, kind: "strategy",
      };
    }

    // 7. Fallback — honest about limits
    return {
      text: `I'm running in **demo mode** on this device, so I can reliably help with:\n\n- **Math problems** — paste one, e.g. \`2x + 3 = 11\` or \`x^2 + 5x + 6 = 0\`\n- **Summaries** — start your message with \`Summarize:\` then paste text\n- **Definitions** — ask \`Define: <term>\` (built-in glossary)\n- **Formula sheets** — ask \`Formulas for <topic>\`\n- **Study strategy** — ask how to prepare for an exam\n\nFor open-ended tutoring, quizzes and PDF Q&A, use the dedicated pages in the sidebar — or connect a real AI model via Settings → AI Model.\n\n*Demo responses are deterministic on-device logic, not a language model.*`,
      demo: true, kind: "fallback",
    };
  };

  SF.Demo = D;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
