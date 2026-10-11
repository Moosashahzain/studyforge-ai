/* StudyForge AI — Flashcards module: decks, CRUD, review with shuffle + known/unknown */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const NS = "decks";

  const M = {
    render(el) {
      const params = new URLSearchParams((location.hash.split("?")[1] || ""));
      const deckId = params.get("deck");
      if (deckId) return this.renderDeck(el, deckId);
      const decks = SF.Store.list(NS).sort((a, b) => b.created - a.created);
      el.innerHTML = `
        <div class="page-head row between"><div><h2>Flashcards</h2><p>Active recall with shuffle and known/unknown tracking.</p></div>
        <button class="btn btn-primary btn-sm" id="newDeck">${SF.icon("plus")} New deck</button></div>
        ${decks.length ? `<div class="grid cols-3">` + decks.map((d) => {
          const known = d.cards.filter((c) => c.known).length;
          const pct = d.cards.length ? Math.round((known / d.cards.length) * 100) : 0;
          return `<div class="card hoverable">
            <h3 class="card-title">${SF.esc(d.title)}</h3>
            <p class="card-sub">${d.cards.length} cards · ${known} known</p>
            <div class="progress" style="margin:8px 0"><span style="width:${pct}%"></span></div>
            <div class="row"><button class="btn btn-primary btn-sm" data-open="${d.id}">${SF.icon("play")} Review</button>
            <button class="btn btn-ghost btn-sm" data-manage="${d.id}">Manage</button></div></div>`; }).join("") + `</div>`
        : `<div class="empty">${SF.icon("cards")}<h4>No decks yet</h4><p>Create a deck, or generate one automatically from the Notes page.</p></div>`}`;
      el.querySelector("#newDeck").onclick = () => SF.modal({
        title: "New deck", bodyHTML: `<div class="field"><label>Deck title</label><input type="text" id="dt" maxlength="80"></div>`,
        actions: [{ label: "Cancel" }, { label: "Create", kind: "btn-primary", onClick: (bd) => {
          const v = bd.querySelector("#dt").value.trim() || "Untitled deck";
          const d = { id: SF.uid("deck"), title: v, cards: [], created: Date.now() };
          SF.Store.set(NS, d.id, d); M.render(el);
        } }],
      });
      el.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => SF.navigate("/flashcards?deck=" + b.dataset.open + "&mode=review"));
      el.querySelectorAll("[data-manage]").forEach((b) => b.onclick = () => SF.navigate("/flashcards?deck=" + b.dataset.manage));
    },

    renderDeck(el, deckId) {
      const deck = SF.Store.get(NS, deckId, null);
      if (!deck) { SF.navigate("/flashcards"); return; }
      const params = new URLSearchParams((location.hash.split("?")[1] || ""));
      if (params.get("mode") === "review") return this.renderReview(el, deck);

      el.innerHTML = `
        <div class="page-head"><button class="btn btn-ghost btn-sm" id="backBtn">← All decks</button>
        <div class="row between" style="margin-top:8px"><div><h2>${SF.esc(deck.title)}</h2><p>${deck.cards.length} cards</p></div>
        <div class="row"><button class="btn btn-secondary btn-sm" id="csvBtn">${SF.icon("download")} CSV</button>
        <button class="btn btn-primary btn-sm" id="addCard">${SF.icon("plus")} Add card</button>
        <button class="btn btn-secondary btn-sm" id="reviewBtn">${SF.icon("play")} Review</button></div></div></div>
        <div id="cardList">${deck.cards.length ? `<div class="stack">` + deck.cards.map((c) => `
          <div class="card"><div class="row between">
            <div><strong>Q:</strong> ${SF.esc(c.front)}<br><span class="muted"><strong>A:</strong> ${SF.esc(c.back)}</span></div>
            <div class="row"><span class="badge ${c.known ? "ok" : "neutral"}">${c.known ? "Known" : "Learning"}</span>
            <button class="icon-btn" data-edit="${c.id}" title="Edit">${SF.icon("edit")}</button>
            <button class="icon-btn" data-del="${c.id}" title="Delete">${SF.icon("trash")}</button></div></div></div>`).join("") + `</div>`
        : `<div class="empty">${SF.icon("cards")}<h4>No cards in this deck</h4><p>Add your first card to start reviewing.</p></div>`}</div>`;
      el.querySelector("#backBtn").onclick = () => SF.navigate("/flashcards");
      el.querySelector("#reviewBtn").onclick = () => SF.navigate("/flashcards?deck=" + deck.id + "&mode=review");
      el.querySelector("#csvBtn").onclick = () => SF.Export.csv(deck.title + "-flashcards.csv", [["Front", "Back", "Known"], ...deck.cards.map((c) => [c.front, c.back, c.known ? "yes" : "no"])]);
      const save = () => SF.Store.set(NS, deck.id, deck);
      el.querySelector("#addCard").onclick = () => cardModal(null);
      el.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => cardModal(deck.cards.find((c) => c.id === b.dataset.edit)));
      el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => SF.confirm("Delete this card?", () => {
        deck.cards = deck.cards.filter((c) => c.id !== b.dataset.del); save(); M.renderDeck(el, deck.id);
      }));
      function cardModal(card) {
        SF.modal({ title: card ? "Edit card" : "New card",
          bodyHTML: `<div class="field"><label>Front (question)</label><textarea id="cf" rows="2">${SF.esc(card ? card.front : "")}</textarea></div>
                     <div class="field"><label>Back (answer)</label><textarea id="cb" rows="2">${SF.esc(card ? card.back : "")}</textarea></div>`,
          actions: [{ label: "Cancel" }, { label: "Save", kind: "btn-primary", onClick: (bd) => {
            const f = bd.querySelector("#cf").value.trim(), b2 = bd.querySelector("#cb").value.trim();
            if (!f || !b2) { SF.toast("Both sides are required", "err"); return; }
            if (card) { card.front = f; card.back = b2; }
            else deck.cards.push({ id: SF.uid("fc"), front: f, back: b2, known: false, reviews: 0 });
            save(); SF.logActivity("flashcards", (card ? "Edited card in " : "Added card to ") + deck.title);
            M.renderDeck(el, deck.id);
          } }] });
      }
    },

    renderReview(el, deck) {
      let order = SF.Store.get("prefs", "fc_" + deck.id, {}).shuffle
        ? deck.cards.slice().sort(() => Math.random() - 0.5).map((c) => c.id)
        : deck.cards.map((c) => c.id);
      let i = 0, sessionKnown = 0;
      const t0 = Date.now();
      if (!order.length) { el.innerHTML = `<div class="empty"><h4>Deck is empty</h4><button class="btn btn-secondary" onclick="location.hash='#/flashcards?deck=${deck.id}'">Manage cards</button></div>`; return; }

      function draw() {
        const c = deck.cards.find((x) => x.id === order[i]);
        const done = i >= order.length;
        el.innerHTML = `
          <div class="page-head"><button class="btn btn-ghost btn-sm" id="backBtn">← ${SF.esc(deck.title)}</button></div>
          ${done ? `
            <div class="card" style="text-align:center;max-width:560px;margin:0 auto">
              <h2>Session complete</h2>
              <p><span class="badge ok">${sessionKnown} known</span> <span class="badge warn">${order.length - sessionKnown} still learning</span></p>
              <p class="muted">${SF.fmtDur((Date.now() - t0) / 1000)} · Deck progress: ${deck.cards.filter((x) => x.known).length}/${deck.cards.length} known</p>
              <div class="row" style="justify-content:center"><button class="btn btn-primary" id="again">Review again</button>
              <button class="btn btn-secondary" id="doneBtn">Back to decks</button></div></div>`
          : `
          <div class="row between" style="max-width:560px;margin:0 auto 12px"><span class="muted">Card ${i + 1} of ${order.length}</span>
            <button class="btn btn-ghost btn-sm" id="shuffleBtn">${SF.icon("shuffle")} ${SF.Store.get("prefs", "fc_" + deck.id, {}).shuffle ? "Shuffled" : "Shuffle"}</button></div>
          <div class="flashcard" id="fc" role="button" tabindex="0" aria-label="Flashcard — activate to flip">
            <div class="flashcard-inner"><div class="flash-face">${SF.esc(c.front)}</div><div class="flash-face flash-back">${SF.esc(c.back)}</div></div></div>
          <p class="muted" style="text-align:center;margin-top:12px">Tap the card to flip</p>
          <div class="row" style="justify-content:center;margin-top:8px">
            <button class="btn btn-secondary" id="unknownBtn">${SF.icon("x")} Still learning</button>
            <button class="btn btn-primary" id="knownBtn">${SF.icon("check")} I knew it</button></div>`}`;
        el.querySelector("#backBtn").onclick = () => SF.navigate("/flashcards?deck=" + deck.id);
        if (done) {
          el.querySelector("#again").onclick = () => M.renderReview(el, deck);
          el.querySelector("#doneBtn").onclick = () => SF.navigate("/flashcards");
          return;
        }
        const fc = el.querySelector("#fc");
        const flip = () => fc.classList.toggle("flipped");
        fc.onclick = flip;
        fc.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
        el.querySelector("#shuffleBtn").onclick = () => {
          const p = SF.Store.get("prefs", "fc_" + deck.id, {});
          p.shuffle = !p.shuffle; SF.Store.set("prefs", "fc_" + deck.id, p);
          M.renderReview(el, deck);
        };
        const mark = (known) => {
          c.known = known; c.reviews = (c.reviews || 0) + 1; c.lastReview = Date.now();
          if (known) sessionKnown++;
          SF.Store.set(NS, deck.id, deck);
          SF.logActivity("flashcards", `Reviewed "${deck.title}": ${known ? "known" : "learning"}`);
          i++; draw();
        };
        el.querySelector("#knownBtn").onclick = () => mark(true);
        el.querySelector("#unknownBtn").onclick = () => mark(false);
      }
      draw();
    },
  };
  SF.Modules.flashcards = M;
})(typeof window !== "undefined" ? window : globalThis);
