/* StudyForge AI — Study Notes generator + library */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const NS = "notes";
  const G = () => (window.SF_DATA || {}).glossary || {};
  const F = () => (window.SF_DATA || {}).formulas || {};

  function generateNote(topic, text) {
    const sections = [];
    const glossary = G(), formulas = F();
    const t = topic.toLowerCase();
    // Definitions: glossary terms matching topic or text
    const defs = [];
    for (const [subj, terms] of Object.entries(glossary)) {
      for (const [k, v] of Object.entries(terms)) {
        if (t.includes(k.toLowerCase()) || (text && text.toLowerCase().includes(k.toLowerCase()))) {
          defs.push({ term: k, def: v, subj });
        }
      }
    }
    if (defs.length) sections.push({ heading: "Key definitions", body: defs.slice(0, 12).map((d) => `- **${d.term}** (${d.subj}): ${d.def}`).join("\n") });
    // Summary / key points from pasted text
    if (text && text.trim().length > 80) {
      const { sentences, note } = SF.Text.summarize(text, 6);
      sections.push({ heading: "Summary", body: sentences.map((s) => `- ${s}`).join("\n") + `\n\n_${note}_` });
      const keys = SF.Text.keywords(text, 10);
      if (keys.length) sections.push({ heading: "Key terms", body: keys.map((k) => `- ${k}`).join("\n") });
    } else {
      sections.push({ heading: "Overview", body: `Structured notes for **${topic}**.\n\n_Paste source text above for an auto-generated summary, key points and flashcards. Definitions and formula sheets below come from the built-in reference data._` });
    }
    // Formula sheets matching topic
    const fsheets = [];
    for (const [k, arr] of Object.entries(formulas)) {
      if (t.includes(k.toLowerCase()) || k.toLowerCase().includes(t)) fsheets.push({ k, arr });
    }
    if (fsheets.length) sections.push({ heading: "Formula sheet", body: fsheets.map((f) => `**${f.k}**\n${f.arr.map((x) => `- ${x}`).join("\n")}`).join("\n\n") });
    // Flashcards
    const cards = text && text.trim().length > 80 ? SF.Text.clozeCards(text, 8) : [];
    return { sections, cards, defs: defs.length, generatedAt: Date.now() };
  }

  const M = {
    generate: generateNote,
    render(el) {
      const tab = (location.hash.match(/tab=([a-z]+)/) || [])[1] || "gen";
      el.innerHTML = `
        <div class="page-head"><h2>Study Notes</h2><p>Generate structured notes, summaries, definitions and flashcards.</p></div>
        <div class="tabs" role="tablist">
          <button class="tab" data-tab="gen" aria-selected="${tab === "gen"}">Generator</button>
          <button class="tab" data-tab="lib" aria-selected="${tab === "lib"}">My notes <span class="badge neutral">${SF.Store.list(NS).length}</span></button>
        </div>
        <div id="tabBody"></div>`;
      const body = el.querySelector("#tabBody");
      el.querySelectorAll(".tab").forEach((b) => b.onclick = () => SF.navigate("/notes?tab=" + b.dataset.tab));

      if (tab === "gen") {
        body.innerHTML = `
          <div class="card" style="margin-bottom:16px">
            <div class="grid cols-2">
              <div class="field"><label for="nTopic">Topic</label>
                <input type="text" id="nTopic" placeholder="e.g. Trigonometry, Photosynthesis" maxlength="80"></div>
              <div class="field"><label for="nSubject">Subject (optional)</label>
                <select id="nSubject"><option value="">—</option>${["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science"].map((s) => `<option>${s}</option>`).join("")}</select></div>
            </div>
            <div class="field"><label for="nText">Source text (optional — paste chapter text for summaries & flashcards)</label>
              <textarea id="nText" placeholder="Paste text here…"></textarea>
              <div class="hint">Everything is generated on-device with deterministic logic — labelled as demo content.</div></div>
            <button class="btn btn-primary" id="genBtn">${SF.icon("spark")} Generate notes</button>
          </div>
          <div id="nOut"></div>`;
        body.querySelector("#genBtn").onclick = () => {
          const topic = body.querySelector("#nTopic").value.trim();
          const text = body.querySelector("#nText").value;
          if (!topic && !text.trim()) { SF.toast("Enter a topic or paste some text", "err"); return; }
          const note = generateNote(topic || "Untitled notes", text);
          const id = SF.uid("note");
          const rec = { id, title: topic || text.slice(0, 50), subject: body.querySelector("#nSubject").value, sections: note.sections, cards: note.cards, created: Date.now(), updated: Date.now() };
          SF.Store.set(NS, id, rec);
          SF.logActivity("notes", "Generated: " + rec.title);
          renderNote(body.querySelector("#nOut"), rec, true);
          SF.toast("Notes generated and saved", "ok");
        };
      } else {
        const notes = SF.Store.list(NS).sort((a, b) => b.updated - a.updated);
        body.innerHTML = notes.length ? `<div class="grid cols-2">` + notes.map((n) => `
          <div class="card hoverable">
            <div class="row between"><h3 class="card-title" style="margin:0">${SF.esc(n.title)}</h3>
              <button class="icon-btn" data-del="${n.id}" title="Delete">${SF.icon("trash")}</button></div>
            <p class="card-sub">${SF.esc(n.subject || "General")} · ${n.sections.length} sections${n.cards && n.cards.length ? ` · ${n.cards.length} flashcards` : ""} · ${SF.fmtDate(n.updated)}</p>
            <div class="row" style="margin-top:8px">
              <button class="btn btn-secondary btn-sm" data-view="${n.id}">Open</button>
              <button class="btn btn-ghost btn-sm" data-exp="${n.id}">${SF.icon("download")} Markdown</button>
              <button class="btn btn-ghost btn-sm" data-print="${n.id}">${SF.icon("printer")} Print</button>
            </div></div>`).join("") + `</div>`
          : `<div class="empty">${SF.icon("notes")}<h4>No saved notes yet</h4><p>Generate notes from the Generator tab and they'll appear here.</p></div>`;
        body.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => SF.confirm("Delete this note?", () => { SF.Store.del(NS, b.dataset.del); M.render(el); }));
        body.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => {
          const n = SF.Store.get(NS, b.dataset.view);
          if (n) SF.modal({ title: n.title, bodyHTML: `<div class="stack">${n.sections.map((s) => `<div><h4>${SF.esc(s.heading)}</h4>${SF.md(s.body)}</div>`).join("")}</div>`, actions: [{ label: "Close" }] });
        });
        body.querySelectorAll("[data-exp]").forEach((b) => b.onclick = () => {
          const n = SF.Store.get(NS, b.dataset.exp); if (!n) return;
          SF.Export.markdown(n.title, n.title, n.sections);
        });
        body.querySelectorAll("[data-print]").forEach((b) => b.onclick = () => {
          const n = SF.Store.get(NS, b.dataset.print); if (!n) return;
          SF.Export.print(n.title, n.sections.map((s) => `<h2>${SF.esc(s.heading)}</h2>${SF.md(s.body)}`).join(""));
        });
      }

      function renderNote(out, rec, fresh) {
        out.innerHTML = `<div class="card">
          <div class="row between"><h3>${SF.esc(rec.title)}</h3><span class="badge warn">Demo content</span></div>
          ${rec.sections.map((s) => `<h4 style="margin-top:16px">${SF.esc(s.heading)}</h4>${SF.md(s.body)}`).join("")}
          ${rec.cards && rec.cards.length ? `<h4 style="margin-top:16px">Flashcards (${rec.cards.length})</h4>
            <p class="muted">Saved — review them in the Flashcards module.</p>
            <button class="btn btn-secondary btn-sm" id="sendCards">${SF.icon("cards")} Send to Flashcards</button>` : ""}
          <div class="row" style="margin-top:16px">
            <button class="btn btn-secondary btn-sm" id="expMd">${SF.icon("download")} Export Markdown</button>
            <button class="btn btn-ghost btn-sm" id="prn">${SF.icon("printer")} Print</button>
          </div></div>`;
        if (rec.cards && rec.cards.length) {
          out.querySelector("#sendCards").onclick = () => {
            const deck = { id: SF.uid("deck"), title: rec.title + " (auto)", cards: rec.cards.map((c) => ({ id: SF.uid("fc"), front: c.front, back: c.back, known: false, reviews: 0 })), created: Date.now() };
            SF.Store.set("decks", deck.id, deck);
            SF.toast("Flashcards added — open the Flashcards module", "ok");
            SF.logActivity("flashcards", "Auto deck: " + rec.title);
          };
        }
        out.querySelector("#expMd").onclick = () => SF.Export.markdown(rec.title, rec.title, rec.sections);
        out.querySelector("#prn").onclick = () => SF.Export.print(rec.title, rec.sections.map((s) => `<h2>${SF.esc(s.heading)}</h2>${SF.md(s.body)}`).join(""));
        out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
  };
  SF.Modules.notes = M;
})(typeof window !== "undefined" ? window : globalThis);
