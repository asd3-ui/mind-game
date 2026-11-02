/* أداة إلحاق أسئلة جديدة بالبنوك — تقرأ أسطر JSON من ملفات ins-*.jsonl
 * كل سطر: {"id","topic","d","e","q","o":[4 خيارات، الأول صحيح],"why"}
 * يُدرج النص قبل سطر الإلحاق المحدد لكل ملف.
 */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "app", "src", "main", "assets", "js", "data");

const JOBS = [
  { jsonl: "ins-brain.jsonl",   bank: "bank_brain.js",   maker: "addB",  anchor: /^AQ\.engine\.register\(/ },
  { jsonl: "ins-science.jsonl", bank: "bank_science.js", maker: "addSc", anchor: /^AQ\.engine\.register\(/ },
  { jsonl: "ins-general.jsonl", bank: "bank_general.js", maker: "addG",  anchor: /^AQ\.engine\.register\(/ },
  { jsonl: "ins-arabic.jsonl",  bank: "bank_arabic.js",  maker: "addAr", anchor: /^\/\* نهاية البنك/ }
];

JOBS.forEach(function (job) {
  const raw = fs.readFileSync(path.join(__dirname, job.jsonl), "utf8")
    .split(/\r?\n/).filter(Boolean);
  const firstId = JSON.parse(raw[0]).id;
  const lines = raw.map(function (s) {
    const q = JSON.parse(s);
    return job.maker + '("' + q.id + '", "' + q.topic + '", ' + q.d + ', "' + q.e + '", "' +
      q.q + '", [' + q.o.map(function (o) { return '"' + o + '"'; }).join(", ") +
      '], "' + q.why + '");';
  });

  const target = path.join(DIR, job.bank);
  const text = fs.readFileSync(target, "utf8");
  if (text.indexOf(firstId) !== -1) { console.log("SKIP (إلحاق سابق):", job.bank); return; }

  const src = text.split(/\r?\n/);
  const idx = src.findIndex(function (l) { return job.anchor.test(l); });
  if (idx < 0) { console.error("FAIL: لا يوجد سطر الإلحاق في", job.bank); process.exit(1); }
  src.splice.apply(src, [idx, 0].concat(lines, [""]));
  fs.writeFileSync(target, src.join("\n"), "utf8");
  console.log("OK: أُلحقت", lines.length, "سؤالًا في", job.bank);
});
