/* عقلني — محرك التعلّم التكيّفي (بدون إنترنت 100%)
 * 1. يتتبع الدقة لكل مجال ولكل مستوى صعوبة.
 * 2. يوجّه عهدة المستوى المستهدف ديناميكياً.
 * 3. يمنع التكرار عبر ذاكرة الأسئلة المستهلكة.
 * 4. يولّد أسئلة حساب وأرقام متجددة (سلاسل لا نهائية).
 * 5. يقترح مجالات التحسين ويرشّح مواد التنقيح.
 */
"use strict";
window.AQ = window.AQ || {};

AQ.engine = (function () {
  var U = AQ.util;
  var banks = {}; // cat -> [q]
  var index = {}; // cat -> {byDiff: {1: [], ...}, topics: {}}

  /* ------------------------------------------------------------------ */
  function register(cat, questions) {
    banks[cat] = questions;
    var byDiff = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    var topics = {};
    questions.forEach(function (q) {
      if (!byDiff[q.d]) byDiff[q.d] = [];
      byDiff[q.d].push(q);
      topics[q.topic || "عام"] = (topics[q.topic || "عام"] || 0) + 1;
    });
    index[cat] = { byDiff: byDiff, topics: topics };
  }

  function levelNumber() {
    var map = { beginner: 1, elementary: 2, intermediate: 3, advanced: 4, expert: 5 };
    return map[AQ.store.state.level] || 2;
  }

  function hasBank(cat) { return !!(banks[cat] && banks[cat].length); }

  /* ------------------------------------------------------------------ *
   * اختيار سؤال بتكيّف                                                   *
   * ------------------------------------------------------------------ */
  function targetDiff(cat) {
    var base = levelNumber();
    var stat = AQ.store.state.stats.byCat[cat];
    if (!stat || stat.asked < 3) return base;
    var acc = stat.correct / stat.asked;
    var recent = stat.streak || 0;
    var diff = base;
    if (acc >= 0.85 && recent >= 3) diff += 1;   // يتقن: نرفع التحدي
    else if (acc < 0.45) diff += -1;             // يتعثّر: نلطّف التحدي
    return U.clamp(diff, 1, 5);
  }

  function pick(cat, cfg) {
    if (!isAvailableCat(cat)) cat = "math";
    var opts = cfg || {};
    var d = opts.diff || targetDiff(cat);
    var round = function (v) { return U.clamp(Math.round(v), 1, 5); };
    // اختيار من ثلاث درجات حول المستهدف لتوسيع التنوع والتغطية
    var candidates = [];
    var spread = [round(d), round(d) - 1, round(d) + 1];
    spread.forEach(function (dd) {
      if (dd >= 1 && dd <= 5) {
        var lst = index[cat].byDiff[dd] || [];
        lst.forEach(function (q) { candidates.push(q); });
      }
    });
    if (!opts.topic) {
      var fresh = candidates.filter(function (q) { return !AQ.store.recentlyUsed(q.id); });
      var pool = fresh.length ? fresh : candidates;
      if (!pool.length) return null;
      var q = U.rand(pool);
      if (opts.topicOnly) {
        var withTopic = pool.filter(function (x) { return x.topic === opts.topicOnly; });
        if (withTopic.length) q = U.rand(withTopic);
      }
      return q;
    }
    var filtered = candidates.filter(function (q) { return q.topic === opts.topic; });
    var fresh2 = filtered.filter(function (q) { return !AQ.store.recentlyUsed(q.id); });
    var pool2 = fresh2.length ? fresh2 : filtered;
    return pool2.length ? U.rand(pool2) : null;
  }

  /* ------------------------------------------------------------------ *
   * مولّد أسئلة حساب (تسلسل لا نهائي - لا تكرار)                        *
   * ------------------------------------------------------------------ */
  function opName(op) { return { "+": "زائد", "-": "ناقص", "×": "ضرب", "÷": "مقسومًا على" }[op] || ""; }

  function makeArithmetic(diff) {
    var ops = ["+", "-"];
    if (diff >= 2) ops.push("×");
    if (diff >= 3) ops.push("÷");
    var op = U.rand(ops);
    var hi = [10, 20, 50, 100, 1000][Math.min(diff - 1, 4)];
    var a, b, ans;
    if (op === "÷") {
      b = U.rint(2, 10);
      ans = U.rint(2, diff >= 4 ? 12 : 8);
      a = b * ans;
    } else {
      var tries = 0;
      do {
        a = U.rint(1, hi); b = U.rint(1, hi);
        ans = (op === "+") ? (a + b) : (a - b);
        tries++;
      } while (tries < 40 && ans < 0);
      if (op === "×") { a = U.rint(2, diff >= 4 ? 12 : 9); b = U.rint(2, diff >= 4 ? 9 : 6); ans = a * b; }
    }
    var text = (op === "÷") ? ("كم يساوي " + a + " ÷ " + b + "؟")
      : (op === "×" ? ("كم يساوي " + a + " × " + b + "؟") : ("كم يساوي " + a + " " + op + " " + b) + "؟");
    var distractors = [];
    if (op === "×" || op === "+") {
      distractors.push(ans + U.rint(2, 10), Math.max(0, ans - U.rint(2, 10)), ans + 1);
    } else {
      distractors.push(ans + 1, Math.max(0, ans - U.rint(2, 6)), Math.max(0, ans + U.rint(3, 10)));
    }
    var opts = U.optionsFrom(String(ans), distractors.map(String));
    return {
      id: U.uniqId("gen"),
      cat: "math",
      topic: "عمليات",
      d: U.clamp(diff, 1, 5),
      q: text,
      o: opts,
      a: opts.indexOf(String(ans)),
      why: "الحساب: " + a + " " + op + " " + b + " = " + ans,
      gen: true
    };
  }

  function makeSequence(diff) {
    var kinds = ["add", "geo", "fib", "sq"];
    if (diff <= 2) kinds = ["add"];
    var kind = U.rand(kinds);
    var seq = [], step, ans;
    if (kind === "add") {
      step = U.rint(2, 3 + diff * 2);
      var start = U.rint(1, 9);
      for (var i = 0; i < 5; i++) seq.push(start + step * i);
    } else if (kind === "geo") {
      var r = U.rint(2, 3);
      var s0 = U.rint(1, 4);
      for (var j = 0; j < 5; j++) seq.push(s0 * Math.pow(r, j));
    } else if (kind === "fib") {
      var s1 = U.rint(1, 3), s2 = s1 + U.rint(1, 3);
      seq = [s1, s2];
      for (var k = 2; k < 5; k++) seq.push(seq[k - 1] + seq[k - 2]);
    } else {
      for (var m = 1; m <= 5; m++) seq.push(m * m);
    }
    ans = seq[seq.length - 1];
    seq = seq.slice(0, 4);
    var opts = U.optionsFrom(ans, [ans + U.rint(1, 4), ans - U.rint(1, 4), ans + U.rint(5, 9)]);
    return {
      id: U.uniqId("seq"), cat: "math", topic: "أنماط",
      d: U.clamp(diff, 1, 5),
      q: "ما هو العدد الذي يكمل هذه المتتالية؟ 🔢<div style='font-size:27px;direction:ltr;margin:8px 0'>" + seq.join("، ") + "، </div>",
      o: opts, a: opts.indexOf(String(ans)), why: "المتتالية تتقدم بالقاعدة: " + (kind === "geo" ? "ضرب في نفس العدد" : (kind === "fib" ? "حاصل جمع العددين قبل" : "زيادة بنفس القيمة")) + ".",
      gen: true
    };
  }

  /* ------------------------------------------------------------------ *
   * تقييم مستوى الطفل                                                   *
   * ------------------------------------------------------------------ */
  function assessmentList() {
    var out = [];
    ["math", "arabic", "science", "general"].forEach(function (cat) {
      var list = banks[cat] || [];
      var picked = U.shuffledUnique(list.filter(function (q) { return q.d <= 2; }), 3);
      picked.forEach(function (q) { out.push(q); });
    });
    var brainPicked = U.shuffledUnique(banks.brain.filter(function (q) { return q.d <= 3; }), 2);
    brainPicked.forEach(function (q) { out.push(q); });
    return U.shuffle(out).slice(0, 12);
  }

  /* ------------------------------------------------------------------ *
   * امتحانات (بنوك عشوائية مختلطة + مرجّحة حسب نقاط الضعف)              *
   * ------------------------------------------------------------------ */
  function examBuild(cfg) {
    var cats = cfg.cats || ["math", "arabic", "science", "general", "brain"];
    var n = cfg.count || 12;
    var weaks = {};
    AQ.store.weakAreas().slice(0, 2).forEach(function (w) { weaks[w.cat] = true; });
    var ids = {};
    var list = [];
    var perCat = Math.ceil(n / cats.length);
    cats.forEach(function (c) {
      var used = 0, guard = 0;
      var weight = weaks[c] ? perCat + 2 : perCat;
      while (used < weight && guard++ < weight * 8) {
        var q = pick(c, { diff: levelNumber() });
        if (!q) break;
        if (ids[q.id]) continue;
        ids[q.id] = true;
        list.push(q);
        used++;
      }
    });
    list = U.shuffle(list).slice(0, n);
    if (cfg.genMathRatio) {
      var genCount = Math.max(2, Math.round(n * cfg.genMathRatio));
      for (var i = 0; i < genCount; i++) {
        var idx = U.rint(0, list.length - 1);
        if (!list[idx].gen) list[idx] = makeArithmetic(levelNumber());
      }
    }
    return list;
  }

  /* ------------------------------------------------------------------ *
   * توصيات التحسين                                                      *
   * ------------------------------------------------------------------ */
  var CAT_NAMES = { math: "عالم الرياضيات", science: "عالم العلوم", arabic: "عالم اللغة العربية", general: "المعلومات العامة", brain: "تدريب المخ", creative: "العالم الإبداعي", exams: "المركز" };
  function recommendTopic(cat) {
    var stat = AQ.store.state.stats.byCat[cat];
    if (!stat || stat.asked < 4) return null;
    var acc = stat.correct / stat.asked;
    if (acc < 0.6) return { cat: cat, word: CAT_NAMES[cat] || cat, advice: acc < 0.35 ? "يحتاج تصميطاً من البداية — نبدأ بطعسه بأعلى مستوى صعوبة 1." : "يحتاج مزيداً من التدريب ليصل للإتقان." };
    return null;
  }
  function recommendations() {
    var out = [];
    ["arabic", "math", "science", "general", "brain"].forEach(function (c) {
      var r = recommendTopic(c);
      if (r) out.push(r);
    });
    return out.slice(0, 3);
  }

  function isAvailableCat(cat) { return hasBank(cat) && index[cat] && index[cat].byDiff && Object.keys(index[cat].byDiff).length > 0; }

  /* سياسة فتح العوالم — نفس منطق LevelPolicy.kt في أندرويد */
  function unlockedWorlds(playerLevel) {
    var lvl = playerLevel || AQ.store.state.playerLevel;
    var set = ["math", "arabic", "science", "general"];
    if (lvl >= 2) set.push("creative");
    if (lvl >= 3) set.push("brain");
    return set;
  }

  function worldLocked(cat, playerLevel) {
    return unlockedWorlds(playerLevel).indexOf(cat) === -1;
  }

  /* ------------------------------------------------------------------ */
  return {
    register: register,
    banks: banks,
    hasBank: hasBank,
    levelNumber: levelNumber,
    pick: pick,
    targetDiff: targetDiff,
    makeArithmetic: makeArithmetic,
    makeSequence: makeSequence,
    assessmentList: assessmentList,
    examBuild: examBuild,
    recommendations: recommendations,
    unlockedWorlds: unlockedWorlds,
    worldLocked: worldLocked,
    CAT_NAMES: CAT_NAMES,
    opName: opName
  };
})();
