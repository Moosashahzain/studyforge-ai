/* StudyForge AI — export helpers: markdown/text/CSV downloads + print view */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const E = {};

  E.markdown = function (filename, title, sections) {
    // sections: [{heading, body}]
    let md = "# " + title + "\n\n_Exported from StudyForge AI on " + new Date().toLocaleString() + "_\n\n";
    for (const s of sections) {
      md += "## " + s.heading + "\n\n" + s.body + "\n\n";
    }
    SF.download(filename.replace(/\.(md|txt)$/, "") + ".md", md, "text/markdown;charset=utf-8");
  };

  E.text = function (filename, content) {
    SF.download(filename, content, "text/plain;charset=utf-8");
  };

  E.csv = function (filename, rows) {
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    SF.download(filename, rows.map((r) => r.map(q).join(",")).join("\n"), "text/csv;charset=utf-8");
  };

  E.json = function (filename, obj) {
    SF.download(filename, JSON.stringify(obj, null, 2), "application/json");
  };

  // Print: swap body into a print-only view, print, restore.
  E.print = function (title, html) {
    const body = document.body;
    const holder = document.createElement("div");
    holder.id = "printHolder";
    holder.innerHTML = `<div class="print-area"><div class="print-title">${SF.esc(title)}</div>${html}</div>`;
    const app = body.innerHTML;
    body.innerHTML = "";
    body.appendChild(holder);
    const css = ["css/tokens.css", "css/base.css", "css/components.css", "css/print.css"]
      .map((h) => `<link rel="stylesheet" href="${h}">`).join("");
    document.head.insertAdjacentHTML("beforeend", css);
    window.print();
    setTimeout(() => { location.reload(); }, 300);
  };

  SF.Export = E;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
