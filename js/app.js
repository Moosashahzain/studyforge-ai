/* StudyForge AI — app bootstrap: nav, router, theme, session tracking */
(function () {
  const SF = window.SF;
  SF.Modules = SF.Modules || {};
  const NAV = [
    { path: "/tutor", icon: "chat", key: "tutor" },
    { path: "/math", icon: "calc", key: "math" },
    { path: "/notes", icon: "notes", key: "notes" },
    { path: "/quiz", icon: "quiz", key: "quiz" },
    { path: "/docs", icon: "doc", key: "docs" },
    { path: "/planner", icon: "plan", key: "planner" },
    { path: "/flashcards", icon: "cards", key: "flashcards" },
    { path: "/dashboard", icon: "dash", key: "dashboard" },
    { path: "/history", icon: "history", key: "history" },
    { path: "/settings", icon: "gear", key: "settings" },
  ];
  const TITLES = { tutor: "AI Tutor", math: "Math Solver", notes: "Study Notes", quiz: "Quiz Generator", docs: "Documents", planner: "Study Planner", flashcards: "Flashcards", dashboard: "Progress Dashboard", history: "Study History", settings: "Settings" };

  function buildNav() {
    const mk = (n) => `<li><a class="nav-link" data-nav href="#${n.path}">${SF.icon(n.icon)}<span class="lbl" data-i18n="${n.key}">${SF.t(n.key)}</span></a></li>`;
    const heads = `<li class="nav-head">Study</li>` + NAV.slice(0, 8).map(mk).join("") + `<li class="nav-head">Manage</li>` + NAV.slice(8).map(mk).join("");
    document.getElementById("sideNav").innerHTML = heads;
    document.getElementById("mobileNav").innerHTML = NAV.map(mk).join("");
    SF.applyI18n();
  }

  function themeIcon() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.getElementById("themeBtn").innerHTML = SF.icon(dark ? "sun" : "moon");
  }

  function trackSession() {
    const t0 = Date.now();
    const save = () => {
      const secs = Math.round((Date.now() - t0) / 1000);
      if (secs < 20) return;
      const s = SF.Store.get("stats", "usage", { studySecs: 0, sessions: 0 });
      s.studySecs += secs; s.sessions += 1; s.lastActive = Date.now();
      SF.Store.set("stats", "usage", s);
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
  }

  function logActivity(type, label) {
    const log = SF.Store.get("stats", "activity", []);
    log.unshift({ t: Date.now(), type, label: String(label || "").slice(0, 120) });
    SF.Store.set("stats", "activity", log.slice(0, 200));
  }
  SF.logActivity = logActivity;

  window.addEventListener("DOMContentLoaded", () => {
    SF.initTheme(); buildNav(); themeIcon(); trackSession();
    document.getElementById("themeBtn").onclick = () => {
      const cur = document.documentElement.dataset.theme;
      SF.setTheme(cur === "dark" ? "light" : "dark"); themeIcon();
    };
    document.getElementById("langBtn").onclick = () => {
      const p = SF.Store.get("prefs", "ui", {});
      p.lang = (p.lang || "en") === "en" ? "ur" : "en";
      SF.Store.set("prefs", "ui", p); buildNav();
      SF.toast(p.lang === "ur" ? "زبان اردو میں تبدیل" : "Language set to English");
    };

    const R = SF.Modules;
    SF.route("/tutor", () => R.tutor.render(SF.$("#page")))
      .route("/math", () => R.math.render(SF.$("#page")))
      .route("/notes", () => R.notes.render(SF.$("#page")))
      .route("/quiz", () => R.quiz.render(SF.$("#page")))
      .route("/docs", () => R.docs.render(SF.$("#page")))
      .route("/planner", () => R.planner.render(SF.$("#page")))
      .route("/flashcards", () => R.flashcards.render(SF.$("#page")))
      .route("/dashboard", () => R.dashboard.render(SF.$("#page")))
      .route("/history", () => R.history.render(SF.$("#page")))
      .route("/settings", () => R.settings.render(SF.$("#page")));
    const origRender = location.hash;
    SF.startRouter();
    // keep topbar title in sync
    const syncTitle = () => {
      const h = (location.hash || "#/tutor").slice(2).split("?")[0];
      const key = NAV.find((n) => n.path === "/" + h);
      document.getElementById("topTitle").textContent = key ? (TITLES[key.key] || key.key) : "StudyForge AI";
    };
    window.addEventListener("hashchange", syncTitle); syncTitle();

    SF.AI.detectMode().then((m) => {
      const b = document.getElementById("modeBadge");
      b.textContent = m === "server" ? "Live AI" : "Demo";
      b.title = m === "server" ? "Connected to a configured AI model" : "Demo mode — on-device logic, no AI model connected";
    });
    if (!location.hash) location.hash = "#/tutor";
  });
})(typeof window !== "undefined" ? window : globalThis);
