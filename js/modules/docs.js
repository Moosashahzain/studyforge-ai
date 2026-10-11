/* StudyForge AI — PDF/document study: upload, extract text (pdf.js), ask with
   page citations, summarize, document quizzes. Honest fallback if pdf.js fails. */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const NS = "docs";
  const MAX_MB = 10;
  let pdfjs = null, pdfFailed = false;

  // pdf.js loads from the vendored copy first (offline-safe); falls back to CDN
  // (e.g. on GitHub Pages where vendor/ is not committed).
  const PDF_SOURCES = [
    { lib: "vendor/pdf.min.js", worker: "vendor/pdf.worker.min.js" },
    { lib: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" },
  ];
  function loadPdfJs() {
    if (pdfjs) return Promise.resolve(pdfjs);
    if (pdfFailed) return Promise.resolve(null);
    return new Promise((resolve) => {
      let i = 0;
      const attempt = () => {
        if (i >= PDF_SOURCES.length) { pdfFailed = true; resolve(null); return; }
        const src = PDF_SOURCES[i++];
        const s = document.createElement("script");
        s.src = src.lib;
        s.onload = () => {
          try {
            pdfjs = window.pdfjsLib;
            pdfjs.GlobalWorkerOptions.workerSrc = src.worker;
            resolve(pdfjs);
          } catch (e) { attempt(); }
        };
        s.onerror = () => attempt();
        document.head.appendChild(s);
      };
      attempt();
    });
  }

  async function extractPdf(file) {
    const lib = await loadPdfJs();
    if (!lib) throw new Error("PDF engine could not be loaded. Try a .txt file instead, or check your connection and reload.");
    const buf = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let n = 1; n <= Math.min(pdf.numPages, 200); n++) {
      const page = await pdf.getPage(n);
      const tc = await page.getTextContent();
      const text = tc.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
      if (text) pages.push({ n, text });
    }
    return { pages, numPages: pdf.numPages };
  }
  async function extractTxt(file) {
    const text = (await file.text()).replace(/\s+/g, " ").trim();
    const chunks = [];
    for (let i = 0; i < text.length; i += 4000) chunks.push({ n: Math.floor(i / 4000) + 1, text: text.slice(i, i + 4000) });
    return { pages: chunks, numPages: chunks.length };
  }

  function searchPages(doc, query) {
    const terms = SF.Text.words(query).filter((w) => w.length > 2);
    if (!terms.length) return [];
    const scored = doc.pages.map((p) => {
      const low = p.text.toLowerCase();
      let score = 0;
      for (const t of terms) { const c = low.split(t).length - 1; score += c; }
      return { p, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    return scored.map(({ p, score }) => {
      const low = p.text.toLowerCase();
      let idx = -1;
      for (const t of terms) { const i = low.indexOf(t); if (i >= 0 && (idx < 0 || i < idx)) idx = i; }
      const start = Math.max(0, idx - 120);
      return { page: p.n, snippet: "…" + p.text.slice(start, start + 300).trim() + "…", score };
    });
  }

  const M = {
    render(el) {
      const params = new URLSearchParams((location.hash.split("?")[1] || ""));
      const docId = params.get("doc");
      if (docId) return this.renderDoc(el, docId);
      const docs = SF.Store.list(NS).sort((a, b) => b.uploaded - a.uploaded);
      el.innerHTML = `
        <div class="page-head"><h2>Documents</h2><p>Upload PDFs or text files, then ask questions with real page citations.</p></div>
        <div class="card" style="margin-bottom:16px">
          <div id="dz" style="border:2px dashed var(--border-strong);border-radius:12px;padding:32px;text-align:center;cursor:pointer">
            ${SF.icon("upload")}<h4>Drop a PDF or .txt here, or click to browse</h4>
            <p class="muted">PDF / TXT only · max ${MAX_MB} MB · text is extracted on-device</p>
            <input type="file" id="fileIn" accept=".pdf,.txt" hidden>
          </div><div id="upMsg" style="margin-top:8px"></div>
        </div>
        ${docs.length ? `<div class="grid cols-2">` + docs.map((d) => `
          <div class="card hoverable"><div class="row between">
            <h3 class="card-title" style="margin:0">${SF.esc(d.name)}</h3>
            <button class="icon-btn" data-del="${d.id}" title="Delete">${SF.icon("trash")}</button></div>
            <p class="card-sub">${d.numPages} pages · ${SF.fmtDate(d.uploaded)}</p>
            <button class="btn btn-primary btn-sm" data-open="${d.id}">Open & study</button></div>`).join("") + `</div>`
        : `<div class="empty">${SF.icon("doc")}<h4>No documents yet</h4><p>Upload a chapter or past paper to start.</p></div>`}`;

      const dz = el.querySelector("#dz"), fi = el.querySelector("#fileIn");
      dz.onclick = () => fi.click();
      ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.style.borderColor = "var(--violet-500)"; }));
      ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.style.borderColor = ""; }));
      dz.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
      fi.onchange = () => { if (fi.files[0]) handle(fi.files[0]); };

      async function handle(file) {
        const msg = el.querySelector("#upMsg");
        if (!SF.Validators.fileExtOk(file.name, ["pdf", "txt"])) { msg.innerHTML = `<div class="alert err">Only .pdf and .txt files are supported.</div>`; return; }
        if (!SF.Validators.fileSizeOk(file.size, MAX_MB)) { msg.innerHTML = `<div class="alert err">File exceeds the ${MAX_MB} MB limit.</div>`; return; }
        msg.innerHTML = `<div class="alert info">Extracting text…</div>`;
        try {
          const { pages, numPages } = file.name.toLowerCase().endsWith(".pdf") ? await extractPdf(file) : await extractTxt(file);
          if (!pages.length) { msg.innerHTML = `<div class="alert warn">No readable text found (scanned images need OCR, which isn't included).</div>`; return; }
          const doc = { id: SF.uid("doc"), name: SF.Validators.safeFileName(file.name), pages, numPages, uploaded: Date.now() };
          SF.Store.set(NS, doc.id, doc);
          SF.logActivity("docs", "Uploaded " + doc.name);
          SF.toast("Document ready — " + pages.length + " pages extracted", "ok");
          SF.navigate("/docs?doc=" + doc.id);
        } catch (e) {
          msg.innerHTML = `<div class="alert err">${SF.esc(e.message)}</div>`;
        }
      }
      el.querySelectorAll("[data-del]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); SF.confirm("Delete this document and its extracted text?", () => { SF.Store.del(NS, b.dataset.del); M.render(el); }); });
      el.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => SF.navigate("/docs?doc=" + b.dataset.open));
    },

    renderDoc(el, docId) {
      const doc = SF.Store.get(NS, docId, null);
      if (!doc) { SF.navigate("/docs"); return; }
      el.innerHTML = `
        <div class="page-head"><button class="btn btn-ghost btn-sm" id="backBtn">← All documents</button>
        <h2 style="margin-top:8px">${SF.esc(doc.name)}</h2><p>${doc.numPages} pages · text extracted on-device</p></div>
        <div class="tabs" role="tablist">
          <button class="tab" data-t="ask" aria-selected="true">Ask questions</button>
          <button class="tab" data-t="sum" aria-selected="false">Summarize</button>
          <button class="tab" data-t="quiz" aria-selected="false">Document quiz</button>
          <button class="tab" data-t="read" aria-selected="false">Read text</button>
        </div><div id="dBody"></div>`;
      const body = el.querySelector("#dBody");
      el.querySelector("#backBtn").onclick = () => SF.navigate("/docs");
      el.querySelectorAll(".tab").forEach((b) => b.onclick = () => {
        el.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", "false"));
        b.setAttribute("aria-selected", "true"); show(b.dataset.t);
      });

      function show(t) {
        if (t === "ask") {
          body.innerHTML = `<div class="card"><form id="aq" class="row">
              <input type="text" id="aqi" placeholder="Ask about this document…" style="flex:1" aria-label="Question">
              <button class="btn btn-primary">Ask</button></form><div id="aOut" style="margin-top:12px"></div>
              <p class="muted" style="font-size:13px">Keyword search over extracted text — answers cite real page numbers.</p></div>`;
          body.querySelector("#aq").onsubmit = (e) => {
            e.preventDefault();
            const q = body.querySelector("#aqi").value.trim();
            if (!q) return;
            const hits = searchPages(doc, q);
            body.querySelector("#aOut").innerHTML = hits.length ? hits.map((h) => `
              <div class="card" style="margin-bottom:8px;background:var(--surface-2)">
                <span class="badge info">Page ${h.page}</span>
                <p style="margin:8px 0 0">${SF.esc(h.snippet)}</p></div>`).join("")
              : `<div class="alert warn">No matching passages found. Try different keywords.</div>`;
            SF.logActivity("docs", "Asked doc: " + q.slice(0, 50));
          };
        } else if (t === "sum") {
          body.innerHTML = `<div class="card"><div class="row" style="margin-bottom:12px">
              <div class="field" style="margin:0"><label>Pages</label>
              <select id="pgR">${doc.pages.map((p) => `<option value="${p.n}">Page ${p.n}</option>`).join("")}<option value="all">Whole document</option></select></div>
              <button class="btn btn-primary" id="sumBtn" style="align-self:flex-end">Summarize</button></div>
              <div id="sOut"></div><p class="muted" style="font-size:13px">Extractive summary — top sentences by keyword coverage.</p></div>`;
          body.querySelector("#sumBtn").onclick = () => {
            const v = body.querySelector("#pgR").value;
            const pages = v === "all" ? doc.pages : doc.pages.filter((p) => p.n === +v);
            const { sentences, note } = SF.Text.summarize(pages.map((p) => p.text).join(" "), 6);
            body.querySelector("#sOut").innerHTML = `<div class="alert info">${SF.esc(note)}</div>` +
              sentences.map((s) => `<p>• ${SF.esc(s)}</p>`).join("");
          };
        } else if (t === "quiz") {
          const allText = doc.pages.map((p) => p.text).join(" ");
          const cards = SF.Text.clozeCards(allText, 8);
          body.innerHTML = cards.length ? `
            <div class="card"><p class="muted">Fill-in-the-blank questions generated from key sentences in this document. Answers are checked against the source text.</p>
            <div id="dq"></div><button class="btn btn-primary" id="dqSub" style="margin-top:12px">Check answers</button><div id="dqOut" style="margin-top:12px"></div></div>`
            : `<div class="alert warn">Not enough substantive text to build a quiz from this document.</div>`;
          if (!cards.length) return;
          body.querySelector("#dq").innerHTML = cards.map((c, i) => `
            <div class="field"><label>Q${i + 1}. ${SF.esc(c.front)}</label>
            <input type="text" data-a="${i}" placeholder="Your answer"></div>`).join("");
          body.querySelector("#dqSub").onclick = () => {
            let score = 0;
            const rows = cards.map((c, i) => {
              const given = body.querySelector(`[data-a="${i}"]`).value.trim().toLowerCase();
              const ok = given === c.back.toLowerCase();
              if (ok) score++;
              return `<p>${ok ? "✓" : "✗"} Q${i + 1}: ${SF.esc(c.front.replace("_____", "**" + c.back + "**"))} ${ok ? "" : `(you wrote: ${SF.esc(given || "—")})`}</p>`;
            });
            body.querySelector("#dqOut").innerHTML = `<div class="alert ${score >= cards.length / 2 ? "ok" : "warn"}">Score: ${score}/${cards.length}</div>` + rows.join("");
            SF.logActivity("docs", `Document quiz: ${score}/${cards.length}`);
          };
        } else {
          body.innerHTML = doc.pages.map((p) => `
            <div class="card" style="margin-bottom:10px"><span class="badge neutral">Page ${p.n}</span>
            <p style="margin-top:8px;font-size:14px">${SF.esc(p.text.slice(0, 1200))}${p.text.length > 1200 ? "…" : ""}</p></div>`).join("");
        }
      }
      show("ask");
    },
  };
  SF.Modules.docs = M;
})(typeof window !== "undefined" ? window : globalThis);
