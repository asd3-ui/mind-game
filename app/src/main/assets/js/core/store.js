/* عقلني — حفظ وتحميل الحالة (localStorage) مع الإنجازات والقيادات */
"use strict";
window.AQ = window.AQ || {};

AQ.store = (function () {
  var U = AQ.util;
  var KEY = "aqlni.save.v1";
  var state = null;

  var DEFAULT_ACHIEVEMENTS = [
    { id: "first_correct", ico: "✨", name: "أول خطوة", desc: "أجبت عن أول سؤال صحيح" },
    { id: "streak5",       ico: "🔥", name: "متتالي ٥", desc: "٥ إجابات صحيحة متتالية" },
    { id: "streak10",      ico: "⚡", name: "سلسلة نارية", desc: "١٠ إجابات صحيحة متتالية" },
    { id: "first_chest",   ico: "🎁", name: "أول كنز", desc: "فتحت أول صندوق كنز" },
    { id: "quiz_master",   ico: "🎯", name: "دقيق", desc: "سلسلة كاملة بلا خطأ (١٠ أسئلة)" },
    { id: "race100",       ico: "🏁", name: "سرعة حسابية", desc: "١٢ جوابًا صحيحًا في سباق الحساب" },
    { id: "memory_hero",   ico: "🧠", name: "ذاكرة بطل", desc: "أكملت بطاقات الذاكرة بلا خطأ" },
    { id: "simon7",        ico: "🎵", name: "إيقاع الذكاء", desc: "وصلت إلى تسلسل من ٧ ألوان" },
    { id: "reaction_fast", ico: "💨", name: "برق", desc: "متوسط تفاعل أقل من ٦٠٠ مللي ثانية" },
    { id: "speller",       ico: "✍️", name: "مهذب", desc: "كوّنت ١٥ كلمة صحيحة" },
    { id: "artist",        ico: "🎨", name: "فنان", desc: "أنجزت ٣ رسومات" },
    { id: "rhythm_90",     ico: "🎼", name: "موسيقي", desc: "دقة ٩٠٪ في لعبة الإيقاع" },
    { id: "exam_star",     ico: "🌟", name: "نجم الامتحان", desc: "متوسط امتحان ٩٠٪ فأعلى" },
    { id: "exam_done",     ico: "📝", name: "متوكّل", desc: "أنجزت أي امتحان كامل" },
    { id: "daily3",        ico: "📅", name: "التزام", desc: "٣ أيام متتالية للتحدي اليومي" },
    { id: "daily5",        ico: "🏆", name: "فارس اليومي", desc: "٥ أيام متتالية للتحدي اليومي" },
    { id: "words50",       ico: "📚", name: "قارئ نهم", desc: "اجتزت ٥٠ سؤالًا صحيحًا" },
    { id: "level5",        ico: "🚀", name: "مستويات عالية", desc: "وصلت إلى المستوى ٥" },
    { id: "no_hints",      ico: "🦁", name: "بشجاعة", desc: "أكملت لعبة ١٠ أسئلة بدون تكرار صوتي" },
    { id: "chest5",        ico: "💰", name: "جامع الكنوز", desc: "فتحت ٥ صناديق كنز" }
  ];

  function defaults() {
    return {
      version: 1,
      createdAt: Date.now(),
      onboarded: false,
      profile: { name: "", age: 8, avatar: "🤖", color: "#7C3AED", hatColor: "", accessory: "" },
      level: "elementary",
      assessed: false,
      playerLevel: 1,
      xp: 0,
      coins: 0,
      gems: 0,
      streakDays: 0,
      lastDaily: "",
      chestsOpened: 0,
      drawsDone: 0,
      wordsBuilt: 0,
      questionsCorrect: 0,
      playSeconds: 0,
      sessions: 0,
      achievements: {}, // id -> date
      stickers: [],     // collectible emoji
      gallery: [],      // drawings [{d: dataURL, ts}] — drawing save (keeps drawings offline)
      parentPin: "",    // رمز دخول الوالدين (4 أرقام)
      bestScores: {},   // label -> [{score, date}]
      stats: {
        byCat: {}, // cat -> {asked, correct, streak}
      },
      recentPool: [],
      usedQuestions: {},
      dailyDone: false,
      dailyResult: 0,
      settings: {
        sound: true, music: false, voice: true,
        rate: 0.9, pitch: 1.0,
        theme: "light", lang: "ar",
        autoread: true, motion: "auto"
      }
    };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
    var base = defaults();
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        Object.keys(base).forEach(function (k) {
          if (parsed && Object.prototype.hasOwnProperty.call(parsed, k)) base[k] = parsed[k];
        });
        // deep-ish merge for nested objects
        ["profile", "settings", "stats"].forEach(function (k2) {
          Object.keys(base[k2]).forEach(function (k3) {
            if (parsed && parsed[k2] && Object.prototype.hasOwnProperty.call(parsed[k2], k3)) {
              base[k2][k3] = parsed[k2][k3];
            }
          });
        });
      } catch (e2) { /* corrupt save -> fresh start, never crash */ }
    }
    state = base;
    if (!Array.isArray(state.stickers)) state.stickers = [];
    if (!Array.isArray(state.gallery)) state.gallery = [];
    if (typeof state.chestsOpened !== "number") state.chestsOpened = 0;
    // daily flags cleanup
    if (state.lastDaily !== U.todayStr()) { state.dailyDone = false; state.dailyResult = 0; }
  }

  var saveTimer = null;
  function save(soon) {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) { /* storage full: game still playable in session */ }
    }, soon ? 700 : 0); // debounced saves keep gameplay buttery
  }

  /* ---------------- progress ---------------- */
  function xpForLevel(lvl) { return lvl <= 1 ? 0 : (lvl - 1) * 150; }
  function addXP(n) {
    state.xp = Math.max(0, state.xp + n);
    var before = state.playerLevel;
    while (state.playerLevel < 30 && state.xp >= xpForLevel(state.playerLevel + 1)) state.playerLevel++;
    if (state.playerLevel > before) {
      if (state.playerLevel >= 5) award("level5");
    }
    save(true);
  }
  function addCoins(n) { state.coins += n; save(true); }

  /* ---------------- learning stats ---------------- */
  function _catStat(cat) {
    if (!state.stats.byCat[cat]) {
      state.stats.byCat[cat] = { asked: 0, correct: 0, streak: 0, byDiff: { 1: { a: 0, c: 0 }, 2: { a: 0, c: 0 }, 3: { a: 0, c: 0 }, 4: { a: 0, c: 0 }, 5: { a: 0, c: 0 } } };
    }
    return state.stats.byCat[cat];
  }
  function recordAnswer(cat, diff, correct) {
    var s = _catStat(cat);
    s.asked++; s.byDiff[diff].a++;
    if (correct) {
      s.correct++; s.byDiff[diff].c++;
      s.streak = Math.max(0, s.streak) + 1;
      state.questionsCorrect++;
      if (state.questionsCorrect >= 50) award("words50");
      if (state.questionsCorrect === 1) award("first_correct");
      var streak = state.stats.byCat[cat].streak;
      if (streak >= 10) award("streak10");
      else if (streak >= 5) award("streak5");
    } else {
      s.streak = 0;
    }
    save(true);
  }
  function categoryAccuracy(cat) {
    var s = state.stats.byCat[cat];
    if (!s || s.asked < 3) return null; // not enough signal yet
    return s.correct / s.asked;
  }
  function weakAreas() {
    var list = [];
    Object.keys(state.stats.byCat).forEach(function (cat) {
      var s = state.stats.byCat[cat];
      if (s.asked >= 4) list.push({ cat: cat, acc: s.correct / s.asked, asked: s.asked });
    });
    list.sort(function (a, b) { return a.acc - b.acc; });
    return list;
  }

  /* ---------------- used-questions memory (anti-repetition) ---------------- */
  function markUsed(qId) {
    var used = state.usedQuestions;
    used[qId] = Date.now();
    var keys = Object.keys(used);
    if (keys.length > 400) {
      keys.sort(function (a, b) { return used[a] - used[b]; });
      var toRemove = keys.slice(0, keys.length - 400);
      toRemove.forEach(function (k) { delete used[k]; });
    }
  }
  function recentlyUsed(qId) {
    return state.usedQuestions[qId] && (Date.now() - state.usedQuestions[qId] < 1000 * 60 * 60 * 24 * 3);
  }

  /* ---------------- achievements ---------------- */
  function award(id) {
    if (state.achievements[id]) return false;
    state.achievements[id] = new Date().toISOString();
    save(true);
    AQ.ui.achievementPopup(id);
    return true;
  }
  function hasAchievement(id) { return !!state.achievements[id]; }

  /* ---------------- leaderboard + collectibles ---------------- */
  function submitScore(label, score) {
    if (!state.bestScores[label]) state.bestScores[label] = [];
    state.bestScores[label].push({ score: score, date: U.todayStr() });
    state.bestScores[label].sort(function (a, b) { return b.score - a.score; });
    state.bestScores[label] = state.bestScores[label].slice(0, 5);
    save(true);
  }
  function bestScore(label) {
    var list = state.bestScores[label] || [];
    return list.length ? list[0].score : 0;
  }

  var STICKERS = ["⭐", "🌈", "🦊", "🐬", "🦄", "🐝", "🦋", "🌻", "🍉", "🚀", "🌙", "🎈",
    "🐙", "🦖", "🍰", "🎸", "⚽", "🎨", "🧩", "🐢", "🦉", "🐋", "🍩", "🪐"];
  function stickerRandom() {
    var owned = state.stickers;
    var missing = STICKERS.filter(function (s) { return owned.indexOf(s) === -1; });
    if (!missing.length) return null;
    return U.rand(missing);
  }
  function addSticker(s) {
    if (s && state.stickers.indexOf(s) === -1) { state.stickers.push(s); save(true); }
  }

  /* ---------------- daily streak ---------------- */
  function todayDateStamp() { return U.todayStr(); }
  function bumpDaily(okScore) {
    var today = todayDateStamp();
    var yesterday = dateOffset(-1);
    state.lastDaily = today;
    state.dailyDone = true;
    state.dailyResult = okScore;
    if (state.lastStreakUpdated === yesterday) state.streakDays += 1;
    else if (state.lastStreakUpdated !== today) state.streakDays = 1;
    state.lastStreakUpdated = today;
    if (state.streakDays >= 5) award("daily5");
    else if (state.streakDays >= 3) award("daily3");
    save(true);
  }
  function dateOffset(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (dd < 10 ? "0" + dd : dd);
  }

  load();

  return {
    get state() { return state; },
    defaults: defaults,
    save: save,
    /* تصفير كامل للتقدم مع إبقاء الاسم */
    hardReset: function (keepName) {
      var name = keepName || "";
      state = defaults();
      state.profile.name = name;
      state.assessed = false;
      state.onboarded = false;
      save(false);
    },
    addXP: addXP, addCoins: addCoins, xpForLevel: xpForLevel,
    recordAnswer: recordAnswer, categoryAccuracy: categoryAccuracy, weakAreas: weakAreas,
    markUsed: markUsed, recentlyUsed: recentlyUsed,
    award: award, hasAchievement: hasAchievement, ACHIEVEMENTS: DEFAULT_ACHIEVEMENTS,
    submitScore: submitScore, bestScore: bestScore,
    stickerRandom: stickerRandom, addSticker: addSticker, STICKERS: STICKERS,
    bumpDaily: bumpDaily, dateOffset: dateOffset, todayDateStamp: todayDateStamp,
    reload: load
  };
})();
