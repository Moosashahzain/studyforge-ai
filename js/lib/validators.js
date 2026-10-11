/* StudyForge AI — input validators (browser + node) */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const V = {};
  V.isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());
  V.isURL = (s) => { try { const u = new URL(String(s)); return u.protocol === "http:" || u.protocol === "https:"; } catch (e) { return false; } };
  V.required = (s) => String(s == null ? "" : s).trim().length > 0;
  V.minLength = (s, n) => String(s || "").trim().length >= n;
  V.maxLength = (s, n) => String(s || "").length <= n;
  V.inRange = (n, lo, hi) => { const x = Number(n); return !isNaN(x) && x >= lo && x <= hi; };
  V.fileExtOk = (name, allowed) => {
    const ext = String(name || "").split(".").pop().toLowerCase();
    return allowed.map((a) => a.toLowerCase()).includes(ext);
  };
  V.fileSizeOk = (bytes, maxMB) => Number(bytes) <= maxMB * 1024 * 1024;
  V.safeFileName = (name) => String(name || "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
  V.noHTML = (s) => !/<[a-z][\s\S]*>/i.test(String(s || ""));
  SF.Validators = V;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
