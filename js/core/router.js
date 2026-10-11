/* StudyForge AI — tiny hash router */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const routes = {};
  let current = null;

  SF.route = function (path, handler) { routes[path] = handler; return SF; };

  function parse() {
    const h = location.hash || "#/tutor";
    const [path, query] = h.slice(1).split("?");
    return { path: path || "/tutor", params: new URLSearchParams(query || "") };
  }
  SF.navigate = function (path) { location.hash = "#" + path; };

  function render() {
    const { path, params } = parse();
    const handler = routes[path] || routes["/tutor"];
    current = path;
    SF.$$("[data-nav]").forEach((a) => {
      const active = a.getAttribute("href") === "#" + path;
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    try { handler(params); } catch (e) {
      console.error(e);
      const main = SF.$("#page");
      if (main) main.innerHTML = `<div class="alert err">Something went wrong loading this page. ${SF.esc(e.message)}</div>`;
    }
    const titles = {
      "/tutor": "AI Tutor", "/math": "Math Solver", "/notes": "Study Notes",
      "/quiz": "Quiz Generator", "/docs": "Documents", "/planner": "Study Planner",
      "/flashcards": "Flashcards", "/dashboard": "Progress Dashboard",
      "/history": "Study History", "/settings": "Settings",
    };
    document.title = (titles[path] || "StudyForge AI") + " — StudyForge AI";
    window.scrollTo(0, 0);
  }

  SF.startRouter = function () {
    window.addEventListener("hashchange", render);
    render();
  };
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
