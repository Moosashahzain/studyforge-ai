/* StudyForge AI — versioned localStorage store (single-device prototype) */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const PREFIX = "sf2:";
  const VERSION = 2;

  function memBackend() {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      keys: () => Array.from(m.keys()),
    };
  }
  let backend = null, hasLS = false;
  try {
    localStorage.setItem("__sf_probe", "1"); localStorage.removeItem("__sf_probe");
    hasLS = true;
  } catch (e) { hasLS = false; }
  backend = hasLS ? localStorage : memBackend();
  if (hasLS) {
    backend.keys = () => { const out = []; for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); return out; };
  }

  const Store = {
    _backend: backend,
    key(ns, id) { return PREFIX + ns + (id ? ":" + id : ""); },
    get(ns, id, fallback) {
      try {
        const raw = backend.getItem(this.key(ns, id));
        if (raw == null) return fallback;
        const parsed = JSON.parse(raw);
        return parsed && parsed.v === VERSION ? parsed.data : (parsed && parsed.data !== undefined ? parsed.data : fallback);
      } catch (e) { return fallback; }
    },
    set(ns, id, data) {
      try { backend.setItem(this.key(ns, id), JSON.stringify({ v: VERSION, data })); return true; }
      catch (e) { return false; }
    },
    del(ns, id) { try { backend.removeItem(this.key(ns, id)); } catch (e) {} },
    list(ns) {
      const p = PREFIX + ns + ":", out = [];
      for (const k of backend.keys()) {
        if (k.indexOf(p) === 0) {
          const item = this.get(ns, k.slice(p.length), null);
          if (item) out.push(item);
        }
      }
      return out;
    },
    exportAll() {
      const out = {};
      for (const k of backend.keys()) if (k.indexOf(PREFIX) === 0) out[k] = backend.getItem(k);
      return JSON.stringify(out, null, 2);
    },
    wipe() {
      for (const k of backend.keys()) if (k.indexOf(PREFIX) === 0) backend.removeItem(k);
      try { localStorage.removeItem("sf-theme"); } catch (e) {}
    },
    isPersistent() { return hasLS; },
  };

  SF.Store = Store;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
