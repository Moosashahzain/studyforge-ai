/* StudyForge AI — AI Tutor chat module */
(function (root) {
  const SF = (root.SF = root.SF || {});
  SF.Modules = SF.Modules || {};
  const NS = "chats";

  function allChats() {
    return SF.Store.list(NS).sort((a, b) => b.updated - a.updated);
  }
  function getChat(id) { return SF.Store.get(NS, id, null); }
  function saveChat(c) { c.updated = Date.now(); SF.Store.set(NS, c.id, c); }
  function newChat() {
    const c = { id: SF.uid("chat"), title: "New conversation", messages: [], created: Date.now(), updated: Date.now() };
    saveChat(c); return c;
  }

  const M = {
    render(el) {
      let activeId = SF.Store.get("prefs", "activeChat", null);
      let chat = (activeId && getChat(activeId)) || newChat();
      let generating = false, cancelFlag = false;

      el.innerHTML = `
        <div class="page-head row between">
          <div><h2>AI Tutor</h2><p>Ask questions, get explanations. <span class="badge warn" id="tutorMode">Demo</span></p></div>
          <button class="btn btn-primary btn-sm" id="newChatBtn">${SF.icon("plus")} New chat</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <div style="display:flex;min-height:62vh">
            <aside id="chatList" style="width:260px;flex:none;border-right:1px solid var(--border);padding:12px;overflow-y:auto" aria-label="Conversations"></aside>
            <div style="flex:1;display:flex;flex-direction:column;min-width:0">
              <div id="chatLog" class="chat-log" style="flex:1;overflow-y:auto;padding:20px" aria-live="polite"></div>
              <div id="chips" class="row" style="padding:0 20px 8px;flex-wrap:wrap;gap:8px"></div>
              <form id="chatForm" class="row" style="padding:12px 20px;border-top:1px solid var(--border);gap:8px">
                <input type="text" id="chatInput" data-i18n-ph="typeMessage" placeholder="${SF.t("typeMessage")}" autocomplete="off" aria-label="Message" style="flex:1">
                <button type="submit" class="btn btn-primary" id="sendBtn" aria-label="${SF.t("send")}">${SF.icon("send")}</button>
                <button type="button" class="btn btn-secondary" id="stopBtn" hidden aria-label="Stop">${SF.icon("stop")}</button>
              </form>
            </div>
          </div>
        </div>`;

      const log = el.querySelector("#chatLog"), list = el.querySelector("#chatList"),
        form = el.querySelector("#chatForm"), input = el.querySelector("#chatInput"),
        sendBtn = el.querySelector("#sendBtn"), stopBtn = el.querySelector("#stopBtn"),
        chips = el.querySelector("#chips");

      SF.AI.detectMode().then((m) => {
        el.querySelector("#tutorMode").textContent = m === "server" ? "Live AI" : "Demo";
        el.querySelector("#tutorMode").className = "badge " + (m === "server" ? "ok" : "warn");
      });

      function renderList() {
        const chats = allChats();
        list.innerHTML = chats.length ? chats.map((c) => `
          <div class="row between chat-item" data-id="${c.id}" style="padding:8px;border-radius:8px;${c.id === chat.id ? "background:var(--brand-soft)" : ""}">
            <button class="btn btn-ghost btn-sm" data-open style="flex:1;justify-content:flex-start;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${SF.esc(c.title)}">${SF.esc(c.title)}</button>
            <button class="icon-btn" data-rename title="Rename">${SF.icon("edit")}</button>
            <button class="icon-btn" data-del title="Delete">${SF.icon("trash")}</button>
          </div>`).join("")
          : `<div class="empty" style="padding:20px"><p>No conversations yet.</p></div>`;
        list.querySelectorAll(".chat-item").forEach((row) => {
          const id = row.dataset.id;
          row.querySelector("[data-open]").onclick = () => { const c = getChat(id); if (c) { chat = c; SF.Store.set("prefs", "activeChat", id); renderList(); renderLog(); } };
          row.querySelector("[data-rename]").onclick = () => {
            const c = getChat(id); if (!c) return;
            SF.modal({ title: "Rename conversation", bodyHTML: `<div class="field"><input type="text" id="rn" value="${SF.esc(c.title)}" maxlength="80"></div>`,
              actions: [{ label: "Cancel" }, { label: "Save", kind: "btn-primary", onClick: (bd) => { const v = bd.querySelector("#rn").value.trim(); if (v) { c.title = v; saveChat(c); renderList(); } } }] });
          };
          row.querySelector("[data-del]").onclick = () => SF.confirm("Delete this conversation?", () => {
            SF.Store.del(NS, id);
            if (chat.id === id) { chat = newChat(); SF.Store.set("prefs", "activeChat", chat.id); }
            renderList(); renderLog();
          });
        });
      }

      function msgHTML(m, idx) {
        const isUser = m.role === "user";
        const badge = !isUser && m.demo ? `<span class="badge warn" style="margin-left:8px">Demo</span>` : (!isUser && m.model ? `<span class="badge ok" style="margin-left:8px">${SF.esc(m.model)}</span>` : "");
        return `<div class="msg ${isUser ? "user" : "assistant"}">
          <div class="avatar">${isUser ? "You".slice(0, 1) : "SF"}</div>
          <div style="min-width:0"><div class="bubble">${SF.md(m.content)}${badge}</div>
          ${!isUser ? `<div class="msg-actions">
            <button class="icon-btn" data-copy="${idx}" title="Copy">${SF.icon("copy")}</button>
            <button class="icon-btn" data-retry="${idx}" title="Retry">${SF.icon("refresh")}</button>
          </div>` : ""}</div></div>`;
      }

      function renderLog() {
        if (!chat.messages.length) {
          log.innerHTML = `<div class="empty"><h4>Start a conversation</h4><p>Ask a math problem, request a summary, or pick a suggestion below.</p></div>`;
        } else {
          log.innerHTML = chat.messages.map(msgHTML).join("");
          log.querySelectorAll("[data-copy]").forEach((b) => b.onclick = () => SF.copyText(chat.messages[+b.dataset.copy].content));
          log.querySelectorAll("[data-retry]").forEach((b) => b.onclick = () => retryFrom(+b.dataset.retry));
        }
        log.scrollTop = log.scrollHeight;
        chips.innerHTML = SF.Demo.suggestedPrompts.slice(0, 4).map((p) => `<button class="btn btn-secondary btn-sm chip">${SF.esc(p)}</button>`).join("");
        chips.querySelectorAll(".chip").forEach((c) => c.onclick = () => { input.value = c.textContent; form.requestSubmit(); });
      }

      async function ask(messages, targetIdx) {
        generating = true; cancelFlag = false;
        sendBtn.hidden = true; stopBtn.hidden = false;
        const holder = SF.el(`<div class="msg assistant"><div class="avatar">SF</div><div style="min-width:0"><div class="bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div></div></div>`);
        log.appendChild(holder); log.scrollTop = log.scrollHeight;
        const bubble = holder.querySelector(".bubble");
        const apiMsgs = messages.map((m) => ({ role: m.role, content: m.content }));
        let full = "";
        try {
          const res = await SF.AI.streamChat(apiMsgs, {
            cancelled: () => cancelFlag,
            bank: (window.SF_DATA || {}).questions || [],
            glossary: (window.SF_DATA || {}).glossary || {},
            formulas: (window.SF_DATA || {}).formulas || {},
          }, (chunk) => { full += chunk; bubble.innerHTML = SF.md(full); log.scrollTop = log.scrollHeight; });
          full = res.text || full;
          const entry = { role: "assistant", content: full, demo: !!res.demo, model: res.model, t: Date.now() };
          if (targetIdx != null) chat.messages[targetIdx] = entry; else chat.messages.push(entry);
          if (chat.messages.filter((m) => m.role === "user").length === 1 && chat.title === "New conversation") {
            chat.title = chat.messages[0].content.slice(0, 42) + (chat.messages[0].content.length > 42 ? "…" : "");
          }
          saveChat(chat); SF.Store.set("prefs", "activeChat", chat.id);
          SF.logActivity("tutor", "Asked: " + chat.messages.filter((m) => m.role === "user").pop().content.slice(0, 60));
        } catch (e) {
          full = full || "Sorry — something went wrong generating a response. Please try again.";
          chat.messages.push({ role: "assistant", content: full, demo: true, t: Date.now() });
          saveChat(chat);
        }
        generating = false; sendBtn.hidden = false; stopBtn.hidden = true;
        renderList(); renderLog();
      }

      function retryFrom(idx) {
        // idx = assistant message index; resend from the previous user message
        chat.messages = chat.messages.slice(0, idx);
        ask(chat.messages, null);
      }

      form.onsubmit = (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v || generating) return;
        input.value = "";
        chat.messages.push({ role: "user", content: v, t: Date.now() });
        saveChat(chat); renderLog();
        ask(chat.messages, null);
      };
      stopBtn.onclick = () => { cancelFlag = true; };
      el.querySelector("#newChatBtn").onclick = () => {
        chat = newChat(); SF.Store.set("prefs", "activeChat", chat.id);
        renderList(); renderLog(); input.focus();
      };

      renderList(); renderLog();
    },
  };
  SF.Modules.tutor = M;
})(typeof window !== "undefined" ? window : globalThis);
