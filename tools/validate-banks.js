/* فحص جودة بنوك الأسئلة: يُشغّل محليًا فقط (قياس لا يُشحن مع التطبيق) */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "app", "src", "main", "assets", "js", "data");
const banks = {};
global.window = {};
global.AQ = { engine: { register: (cat, list) => (banks[cat] = list) } };
// يُقلّد document بما يكفي لتوفر AQ.content
["bank_math.js", "bank_science.js", "bank_arabic.js", "bank_general.js", "bank_brain.js", "content.js"]
  .forEach(f => require(path.join(DIR, f)));

let fail = 0;
const CATS = Object.keys(banks);
CATS.forEach(cat => {
  const list = banks[cat];
  if (!Array.isArray(list) || !list.length) { console.log("FAIL: بنك فارغ:", cat); fail++; return; }
  const perDiff = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const ids = new Set();
  list.forEach(q => {
    if (!q.id) { console.log("FAIL: سؤال بلا معرّف في", cat); fail++; }
    if (ids.has(q.id)) { console.log("FAIL: معرّف مكرر:", cat, q.id); fail++; }
    ids.add(q.id);
    if (!Array.isArray(q.o) || q.o.length < 3) { console.log("FAIL: خيارات < 3:", cat, q.id, "n=" + (q.o || []).length); fail++; }
    if (typeof q.a !== "number" || q.a < 0 || q.a >= (q.o || []).length) { console.log("FAIL: فهرس الإجابة خارج النطاق:", cat, q.id, "a=" + q.a); fail++; }
    if (!q.q || !q.why) { console.log("FAIL: نص/تعليل مفقود:", cat, q.id); fail++; }
    if (typeof q.d !== "number" || q.d < 1 || q.d > 5) { console.log("FAIL: صعوبة غير صالحة:", cat, q.id, "d=" + q.d); fail++; }
    else perDiff[q.d]++;
    const set = new Set((q.o || []).map(o => String(o).trim()));
    if (set.size !== (q.o || []).length) { console.log("FAIL: خيارات مكررة:", cat, q.id, JSON.stringify(q.o)); fail++; }
    if (!q.o[0] || String(q.o[0]).trim() !== String((q.o || [])[q.a]).trim()) { console.log("FAIL: الإجابة ليست الخيار الأول (المطلوب a=0):", cat, q.id, JSON.stringify(q.o), "a=" + q.a); fail++; }
    if (/[\uFFFD]/.test(JSON.stringify(q))) { console.log("FAIL: رمز تالٍ:", cat, q.id); fail++; }
  });
  const covered = Object.keys(perDiff).filter(d => perDiff[d] > 0);
  console.log(cat + ": " + list.length + " سؤال | توزيع الصعوبة " + JSON.stringify(perDiff));
});

// فحص AQ.content
if (!global.AQ.content) { console.log("FAIL: AQ.content غير موجود"); fail++; }
else {
  const c = global.AQ.content;
  ["words", "pairs", "sentences"].forEach(k => {
    if (!Array.isArray(c[k]) || !c[k].length) { console.log("FAIL: content." + k + " فارغ"); fail++; }
  });
  if (!c.story || !c.story.hero || !c.rhythm) { console.log("FAIL: content.story/rhythm ناقص"); fail++; }
  if (global.AQ.content.words) global.AQ.content.words.forEach(w => {
    if (!w.w || !w.e) { console.log("FAIL: كلمة ناقصة", JSON.stringify(w)); fail++; }
  });
}

console.log(fail === 0 ? "ALL BANKS OK ✅" : "TOTAL FAILURES: " + fail);
process.exit(fail === 0 ? 0 : 1);
