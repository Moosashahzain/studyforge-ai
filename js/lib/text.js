/* StudyForge AI — deterministic text analysis: extractive summarizer,
   keyword extraction, cloze flashcard generation. No AI claims. */
(function (root) {
  const SF = (root.SF = root.SF || {});
  const T = {};
  const STOP = new Set(("a,an,the,and,or,but,if,then,else,for,to,of,in,on,at,by,with,from,as,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,can,could,should,may,might,must,this,that,these,those,it,its,they,them,their,we,our,you,your,he,she,his,her,not,no,so,such,than,too,very,just,into,over,after,before,between,through,during,each,other,some,any,all,both,only,own,same,which,who,whom,what,where,when,why,how,because,until,while,about,also,there,here,more,most,less,least,many,much,one,two,first,second,new,used,use,using,often,every").split(","));

  T.sentences = function (text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
  };
  T.words = function (text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
  };
  T.keywords = function (text, n) {
    const freq = {};
    for (const w of T.words(text)) {
      if (STOP.has(w) || w.length < 3) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n || 10).map((e) => e[0]);
  };
  // Extractive summary: score sentences by keyword frequency + position bonus.
  T.summarize = function (text, maxSentences) {
    const sents = T.sentences(text);
    if (!sents.length) return { sentences: [], method: "extractive", note: "No sentences found." };
    const freq = {};
    for (const w of T.words(text)) { if (!STOP.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1; }
    const scored = sents.map((s, i) => {
      const ws = T.words(s).filter((w) => !STOP.has(w));
      const score = ws.reduce((t, w) => t + (freq[w] || 0), 0) / Math.sqrt(ws.length || 1);
      return { s, score: score + (i < 3 ? 0.5 : 0) - i * 0.01, i };
    });
    const n = Math.min(maxSentences || 5, sents.length);
    const picked = scored.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i);
    return { sentences: picked.map((p) => p.s), method: "extractive", note: "Top " + n + " of " + sents.length + " sentences by keyword coverage." };
  };
  T.readingTimeMin = function (text) {
    return Math.max(1, Math.round(T.words(text).length / 200));
  };
  // Cloze flashcards: blank out a keyword in key sentences.
  T.clozeCards = function (text, maxCards) {
    const { sentences } = T.summarize(text, (maxCards || 8) * 2);
    const keys = T.keywords(text, 30);
    const cards = [];
    for (const s of sentences) {
      if (cards.length >= (maxCards || 8)) break;
      const hit = keys.find((k) => new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(s));
      if (!hit) continue;
      const front = s.replace(new RegExp("\\b" + hit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i"), "_____");
      if (front === s) continue;
      cards.push({ front, back: hit, source: "auto" });
    }
    return cards;
  };
  SF.Text = T;
  if (typeof module !== "undefined" && module.exports) module.exports = SF;
})(typeof window !== "undefined" ? window : globalThis);
