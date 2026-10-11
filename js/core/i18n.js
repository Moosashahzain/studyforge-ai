/* StudyForge AI — minimal i18n (English + Urdu) for app chrome */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const STR = {
    en: {
      appName: "StudyForge AI", tutor: "AI Tutor", math: "Math Solver", notes: "Notes",
      quiz: "Quiz", docs: "Documents", planner: "Planner", flashcards: "Flashcards",
      dashboard: "Dashboard", history: "History", settings: "Settings",
      newChat: "New chat", send: "Send", typeMessage: "Ask anything…",
      demoBadge: "Demo", light: "Light", dark: "Dark", system: "System",
      save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", close: "Close",
      search: "Search", retry: "Retry", copy: "Copy", download: "Download",
      study: "Study", portfolio: "Portfolio",
    },
    ur: {
      appName: "اسٹڈی فورج اے آئی", tutor: "اے آئی ٹیوٹر", math: "ریاضی حل کنندہ",
      notes: "نوٹس", quiz: "کوئز", docs: "دستاویزات", planner: "منصوبہ ساز",
      flashcards: "فلیش کارڈز", dashboard: "ڈیش بورڈ", history: "ریکارڈ",
      settings: "ترتیبات", newChat: "نئی گفتگو", send: "بھیجیں",
      typeMessage: "کچھ پوچھیں…", demoBadge: "ڈیمو", light: "روشن", dark: "تاریک",
      system: "سسٹم", save: "محفوظ کریں", cancel: "منسوخ", delete: "حذف کریں",
      edit: "ترمیم", close: "بند کریں", search: "تلاش", retry: "دوبارہ",
      copy: "کاپی", download: "ڈاؤن لوڈ", study: "پڑھائی", portfolio: "پورٹ فولیو",
    },
  };
  SF.t = function (key) {
    const lang = SF.Store ? SF.Store.get("prefs", "ui", {}).lang || "en" : "en";
    return (STR[lang] && STR[lang][key]) || STR.en[key] || key;
  };
  SF.applyI18n = function (rootEl) {
    (rootEl || document).querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = SF.t(el.dataset.i18n);
    });
    const lang = SF.Store ? SF.Store.get("prefs", "ui", {}).lang || "en" : "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  };
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
