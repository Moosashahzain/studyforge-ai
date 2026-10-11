/* StudyForge AI — Portfolio renderer + prototype admin editor */
(function () {
  const SF = window.SF;
  const base = window.SF_PORTFOLIO || {};
  function cfg() {
    const over = SF.Store.get("portfolio", "override", null);
    if (!over) return base;
    return {
      profile: Object.assign({}, base.profile, over.profile),
      skills: over.skills || base.skills, education: over.education || base.education,
      achievements: over.achievements || base.achievements,
      certificates: over.certificates || base.certificates,
      projects: over.projects || base.projects,
    };
  }

  async function sha256(s) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  function getSalt() {
    let s = null;
    try { s = localStorage.getItem("sf-pf-salt"); } catch (e) {}
    if (!s) { s = SF.uid("salt"); try { localStorage.setItem("sf-pf-salt", s); } catch (e) {} }
    return s;
  }

  function avatarHTML(p) {
    return p.avatarUrl
      ? `<img class="pf-avatar" src="${SF.esc(p.avatarUrl)}" alt="Profile photo of ${SF.esc(p.name)}" onerror="this.outerHTML='${SF.icon("user").replace(/'/g, "\\'")}'">`
      : `<div class="pf-avatar" style="display:flex;align-items:center;justify-content:center;color:#fff">${SF.icon("user")}</div>`;
  }

  function projectCard(p) {
    return `<div class="card hoverable proj-card">
      <div class="thumb" style="height:150px;border-radius:12px;background:var(--grad-brand);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;margin-bottom:12px">${SF.esc(p.title.slice(0, 2).toUpperCase())}</div>
      <h3 class="card-title">${SF.esc(p.title)}</h3><p class="card-sub">${SF.esc(p.tagline || "")}</p>
      <div style="margin:8px 0">${(p.tech || []).map((t) => `<span class="tag">${SF.esc(t)}</span>`).join("")}</div>
      <div class="row"><a class="btn btn-primary btn-sm" href="#/project/${p.id}">Details</a>
      ${p.demoUrl ? `<a class="btn btn-secondary btn-sm" href="${SF.esc(p.demoUrl)}" target="_blank" rel="noopener">Live demo</a>` : ""}
      ${p.repoUrl ? `<a class="btn btn-ghost btn-sm" href="${SF.esc(p.repoUrl)}" target="_blank" rel="noopener">Source</a>` : ""}</div></div>`;
  }

  function homeHTML(c) {
    const p = c.profile;
    return `
    <section class="pf-hero"><div class="row" style="align-items:center;gap:24px;flex-wrap:wrap">
      ${avatarHTML(p)}
      <div style="flex:1;min-width:240px">
        <h1 style="margin-bottom:4px">${SF.esc(p.name)}</h1>
        <p style="font-size:18px;color:#c9d4f5;margin-bottom:8px">${SF.esc(p.role)}</p>
        <p style="color:#c9d4f5;max-width:560px">${SF.esc(p.tagline)}</p>
        <div class="row" style="margin-top:12px;flex-wrap:wrap">
          <a class="btn btn-primary" href="#/contact">Contact me</a>
          <span id="resumeSlot"></span>
          <button class="btn" id="editPf" style="background:rgba(255,255,255,.12);color:#fff">${SF.icon("edit")} Edit portfolio</button>
        </div></div></div></section>

    <section class="card" style="margin-top:24px"><h2>About me</h2><p>${SF.esc(p.about)}</p>
      <p class="muted">${SF.icon("user")} ${SF.esc(p.location || "")} · ${SF.icon("mail")} <a href="mailto:${SF.esc(p.email)}">${SF.esc(p.email)}</a></p>
      <div class="row" style="flex-wrap:wrap">${(p.socials || []).map((s) => `<a class="btn btn-secondary btn-sm" href="${SF.esc(s.url)}" target="_blank" rel="noopener">${SF.esc(s.label)}</a>`).join("")}</div></section>

    <section style="margin-top:24px"><h2>Skills</h2><div class="card"><div class="grid cols-2">
      ${c.skills.map((s) => `<div><div class="row between"><strong>${SF.esc(s.name)}</strong><small class="muted">${s.level}%</small></div><div class="progress"><span style="width:${s.level}%"></span></div></div>`).join("")}
    </div></div></section>

    <section style="margin-top:24px"><h2>Projects</h2><div class="grid cols-2">
      ${c.projects.map(projectCard).join("")}</div></section>

    <div class="grid cols-2" style="margin-top:24px">
      <section class="card"><h2>Education</h2>${c.education.map((e) => `
        <div style="margin-bottom:12px"><strong>${SF.esc(e.degree)}</strong><br><span class="muted">${SF.esc(e.school)} · ${SF.esc(e.years)}</span><p style="font-size:14px">${SF.esc(e.detail || "")}</p></div>`).join("")}</section>
      <section class="card"><h2>Achievements</h2>${c.achievements.map((a) => `
        <div style="margin-bottom:10px"><strong>${SF.esc(a.title)}</strong><p style="font-size:14px" class="muted">${SF.esc(a.detail || "")}</p></div>`).join("")}
        <h2 style="margin-top:16px">Certificates</h2>${c.certificates.map((x) => `
        <div style="margin-bottom:10px"><strong>${SF.esc(x.title)}</strong> <span class="muted">— ${SF.esc(x.issuer || "")}${x.year ? ", " + SF.esc(x.year) : ""}</span>
        ${x.url ? ` <a href="${SF.esc(x.url)}" target="_blank" rel="noopener">Verify</a>` : ""}</div>`).join("")}</section>
    </div>`;
  }

  function projectHTML(c, id) {
    const p = c.projects.find((x) => x.id === id);
    if (!p) return `<div class="alert err">Project not found.</div>`;
    return `<a class="btn btn-ghost btn-sm" href="#/">← All projects</a>
      <section class="card" style="margin-top:12px">
        <h1>${SF.esc(p.title)}</h1><p class="muted">${SF.esc(p.tagline || "")}</p>
        <div style="margin:8px 0">${(p.tech || []).map((t) => `<span class="tag">${SF.esc(t)}</span>`).join("")}</div>
        <p>${SF.esc(p.description || "")}</p>
        ${(p.features || []).length ? `<h3>Implemented features</h3><ul>${p.features.map((f) => `<li>${SF.esc(f)}</li>`).join("")}</ul>` : ""}
        <div class="row" style="margin-top:12px">
          ${p.demoUrl ? `<a class="btn btn-primary" href="${SF.esc(p.demoUrl)}" target="_blank" rel="noopener">Live demo</a>` : ""}
          ${p.repoUrl ? `<a class="btn btn-secondary" href="${SF.esc(p.repoUrl)}" target="_blank" rel="noopener">Source code</a>` : `<span class="badge neutral">No public repo linked</span>`}
        </div></section>`;
  }

  function contactHTML(c) {
    const p = c.profile;
    return `<a class="btn btn-ghost btn-sm" href="#/">← Back</a>
      <section class="card" style="margin-top:12px;max-width:640px">
        <h1>Contact</h1>
        <p class="muted">Prefer email? <a href="mailto:${SF.esc(p.email)}">${SF.esc(p.email)}</a></p>
        <div id="cMode"></div>
        <form id="cForm">
          <div class="field"><label for="cn">Name</label><input id="cn" type="text" maxlength="80" required></div>
          <div class="field"><label for="ce">Email</label><input id="ce" type="email" maxlength="120" required></div>
          <div class="field"><label for="cm">Message</label><textarea id="cm" maxlength="2000" required></textarea></div>
          <button class="btn btn-primary" type="submit">${SF.icon("send")} Send message</button>
        </form><div id="cOut" style="margin-top:12px"></div></section>`;
  }

  function wireContact() {
    const out = document.getElementById("cOut"), mode = document.getElementById("cMode");
    SF.AI.detectMode().then(async (m) => {
      let contactLive = false;
      if (m === "server") {
        try { const r = await fetch("/api/health"); const h = await r.json(); contactLive = !!h.contact; } catch (e) {}
      }
      mode.innerHTML = contactLive
        ? `<div class="alert ok">Contact form is connected — messages are delivered to the site owner.</div>`
        : `<div class="alert warn"><strong>Demo form:</strong> messages are validated in your browser but not sent anywhere yet. To receive messages, configure the server (see docs/SETUP.md) or email directly.</div>`;
      document.getElementById("cForm").onsubmit = async (e) => {
        e.preventDefault();
        const n = document.getElementById("cn").value.trim(), em = document.getElementById("ce").value.trim(), msg = document.getElementById("cm").value.trim();
        if (!SF.Validators.required(n) || !SF.Validators.required(msg)) { out.innerHTML = `<div class="alert err">Name and message are required.</div>`; return; }
        if (!SF.Validators.isEmail(em)) { out.innerHTML = `<div class="alert err">Please enter a valid email address.</div>`; return; }
        if (contactLive) {
          try {
            const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, email: em, message: msg }) });
            const d = await r.json();
            out.innerHTML = r.ok ? `<div class="alert ok">Message sent — thank you!</div>` : `<div class="alert err">${SF.esc(d.error || "Delivery failed.")}</div>`;
            if (r.ok) e.target.reset();
          } catch (err) { out.innerHTML = `<div class="alert err">Delivery failed: ${SF.esc(err.message)}</div>`; }
        } else {
          out.innerHTML = `<div class="alert info"><strong>Demo mode:</strong> your message passed validation but was not sent. Email <a href="mailto:${SF.esc(cfg().profile.email)}">${SF.esc(cfg().profile.email)}</a> directly.</div>`;
        }
      };
    });
  }

  function wireEdit() {
    const btn = document.getElementById("editPf");
    if (btn) btn.onclick = () => pinGate();
  }
  async function pinGate() {
    let stored = null;
    try { stored = localStorage.getItem("sf-pf-pin"); } catch (e) {}
    if (!stored) {
      SF.modal({ title: "Set an admin PIN", bodyHTML: `<p class="muted" style="font-size:14px">Prototype-grade protection for this device only — not real authentication.</p><div class="field"><label>PIN (min 4 characters)</label><input type="password" id="pin1" maxlength="32"></div><div class="field"><label>Confirm PIN</label><input type="password" id="pin2" maxlength="32"></div>`,
        actions: [{ label: "Cancel" }, { label: "Set PIN", kind: "btn-primary", onClick: async (bd) => {
          const a = bd.querySelector("#pin1").value, b = bd.querySelector("#pin2").value;
          if (a.length < 4 || a !== b) { SF.toast("PINs must match and be at least 4 characters", "err"); return; }
          try { localStorage.setItem("sf-pf-pin", await sha256(getSalt() + a)); } catch (e) {}
          bd.remove(); openEditor();
        } }] });
    } else {
      SF.modal({ title: "Enter admin PIN", bodyHTML: `<div class="field"><label>PIN</label><input type="password" id="pin" maxlength="32"></div>`,
        actions: [{ label: "Cancel" }, { label: "Unlock", kind: "btn-primary", onClick: async (bd) => {
          const v = bd.querySelector("#pin").value;
          if (await sha256(getSalt() + v) === stored) { bd.remove(); openEditor(); }
          else SF.toast("Incorrect PIN", "err");
        } }] });
    }
  }
  function openEditor() {
    const c = cfg();
    SF.modal({ title: "Edit portfolio", bodyHTML: `
      <p class="muted" style="font-size:13px">Changes are stored on this device and override js/portfolio/config.js. Use "Reset" to go back to the file.</p>
      <div class="field"><label>Name</label><input type="text" id="ep-name" value="${SF.esc(c.profile.name)}" maxlength="80"></div>
      <div class="field"><label>Role</label><input type="text" id="ep-role" value="${SF.esc(c.profile.role)}" maxlength="80"></div>
      <div class="field"><label>Tagline</label><input type="text" id="ep-tag" value="${SF.esc(c.profile.tagline)}" maxlength="160"></div>
      <div class="field"><label>About</label><textarea id="ep-about" rows="3">${SF.esc(c.profile.about)}</textarea></div>
      <div class="field"><label>Email</label><input type="email" id="ep-email" value="${SF.esc(c.profile.email)}" maxlength="120"></div>
      <div class="field"><label>Avatar URL (optional)</label><input type="text" id="ep-av" value="${SF.esc(c.profile.avatarUrl || "")}" maxlength="200"></div>
      <div class="field"><label>Resume URL (optional — button shows only if the file exists)</label><input type="text" id="ep-res" value="${SF.esc(c.profile.resumeUrl || "")}" maxlength="200"></div>`,
      actions: [{ label: "Reset to file", onClick: () => { SF.Store.del("portfolio", "override"); location.reload(); } },
        { label: "Cancel" }, { label: "Save", kind: "btn-primary", onClick: (bd) => {
          const email = bd.querySelector("#ep-email").value.trim();
          if (email && !SF.Validators.isEmail(email)) { SF.toast("Invalid email", "err"); return; }
          const over = SF.Store.get("portfolio", "override", {});
          over.profile = Object.assign({}, (over.profile || {}), {
            name: bd.querySelector("#ep-name").value.trim(), role: bd.querySelector("#ep-role").value.trim(),
            tagline: bd.querySelector("#ep-tag").value.trim(), about: bd.querySelector("#ep-about").value.trim(),
            email, avatarUrl: bd.querySelector("#ep-av").value.trim(), resumeUrl: bd.querySelector("#ep-res").value.trim(),
          });
          SF.Store.set("portfolio", "override", over);
          SF.toast("Portfolio updated", "ok"); location.reload();
        } }] });
  }

  async function wireResume() {
    const slot = document.getElementById("resumeSlot");
    if (!slot) return;
    const url = cfg().profile.resumeUrl;
    if (!url) { slot.innerHTML = `<span class="badge neutral">Resume: not provided</span>`; return; }
    try {
      const r = await fetch(url, { method: "HEAD" });
      slot.innerHTML = r.ok ? `<a class="btn btn-secondary" href="${SF.esc(url)}" download>${SF.icon("download")} Download CV</a>`
        : `<span class="badge warn">Resume link set but file not found</span>`;
    } catch (e) { slot.innerHTML = `<span class="badge warn">Resume link set but file not found</span>`; }
  }

  function render() {
    const h = (location.hash || "#/").slice(1);
    const c = cfg();
    const main = document.getElementById("pfMain");
    if (h.startsWith("/project/")) main.innerHTML = projectHTML(c, h.split("/")[2]);
    else if (h === "/contact") { main.innerHTML = contactHTML(c); wireContact(); }
    else { main.innerHTML = homeHTML(c); wireEdit(); wireResume(); }
    SF.applyI18n();
    window.scrollTo(0, 0);
  }

  window.addEventListener("DOMContentLoaded", () => {
    SF.initTheme();
    window.addEventListener("hashchange", render);
    render();
  });
})();
