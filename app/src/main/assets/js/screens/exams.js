/* عقلني — مركز الامتحانات: امتحان شامل، امتحان رياضيات سريع، والتحدي اليومي */
"use strict";
window.AQ = window.AQ || {};

AQ.screens.exams = (function () {
  var U = AQ.util;

  /* داخلي: أبناء بنك متكيف لا يتكرر بسرعة */
  function buildList(cats, count, opts) {
    opts = opts || {};
    var out = [], ids = {}, guard = 0;
    while (out.length < count && guard++ < count * 12) {
      var cat = cats[out.length % cats.length];
      var q = AQ.engine.pick(cat, {});
      if (q && !ids[q.id]) { ids[q.id] = true; out.push(q); }
    }
    if (opts.genMathRatio) {
      var genN = Math.max(0, Math.round(count * opts.genMathRatio));
      for (var i = 0; i < genN; i++) {
        var gen = AQ.engine.makeArithmetic(AQ.engine.levelNumber());
        out[i] = gen; /* نستبدل بدائل حساب مختلفة كي لا يتوقف التنوع */
      }
    }
    return U.shuffle(out).slice(0, count);
  }

  function daily() {
    var st = AQ.store.state;
    if (st.dailyDone) { AQ.ui.toast("تحدي اليوم اكتمل — عُد غدًا 🌙"); return; }
    var qs = buildList(["math", "arabic", "science", "general", "brain"], 10, { genMathRatio: 0.3 });
    AQ.router.go("quiz", {
      title: "☀️ تحدي اليوم",
      questions: qs,
      timePerQ: 30,
      treat: "daily",
      icon: "☀️",
      passPct: 60
    });
  }

  function fullExam() {
    var count = 12;
    var qs = buildList(["math", "arabic", "science", "general", "brain"], count);
    AQ.router.go("quiz", {
      title: "🏆 الامتحان الشامل",
      questions: qs,
      timePerQ: 35,
      treat: "exam",
      icon: "🏆",
      passPct: 70
    });
  }

  function mathExam() {
    var count = 12;
    var qs = buildList(["math"], count, { genMathRatio: 0.5 });
    AQ.router.go("quiz", {
      title: "🧮 امتحان الرياضيات السريع",
      questions: qs,
      timePerQ: 25,
      treat: "exam",
      icon: "🧮",
      passPct: 70
    });
  }

  function render(view, params) {
    var st = AQ.store.state;
    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("مركز التحديات 🏆", {}));

    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    /* ملخص اليوم */
    var dailyCard = U.ce("button", "card btn-row" + (st.dailyDone ? " done" : ""));
    dailyCard.style.cssText = "width:100%;text-align:right;display:flex;align-items:center;gap:12px;cursor:pointer;";
    dailyCard.appendChild(U.ce("div", "emoji", st.dailyDone ? "✅" : "☀️"));
    var dTxt = U.ce("div", "");
    dTxt.appendChild(U.ce("div", "", st.dailyDone ? "تحدي اليوم مكتمل!" : "تحدي اليوم"));
    dTxt.appendChild(U.ce("div", "muted", st.dailyDone
      ? ("عدد إجاباتك الصحيحة: " + st.dailyResult + " — عد غدًا 🌙")
      : "10 أسئلة سريعة، مكافأة عملات إضافية"));
    dailyCard.appendChild(dTxt);
    dailyCard.addEventListener("click", daily);
    screen.appendChild(dailyCard);

    /* امتحانات */
    var ex1 = U.ce("button", "card btn-row");
    ex1.style.cssText = "width:100%;text-align:right;display:flex;align-items:center;gap:12px;margin-top:10px;cursor:pointer;";
    ex1.appendChild(U.ce("div", "emoji", "🏆"));
    var t1 = U.ce("div", "");
    t1.appendChild(U.ce("div", "", "الامتحان الشامل (12 سؤالًا)"));
    t1.appendChild(U.ce("div", "muted", "كل العوالم — أعلى نتيجة: " + AQ.store.bestScore("star_exam") + "٪"));
    ex1.appendChild(t1);
    ex1.addEventListener("click", fullExam);
    screen.appendChild(ex1);

    var ex2 = U.ce("button", "card btn-row");
    ex2.style.cssText = "width:100%;text-align:right;display:flex;align-items:center;gap:12px;margin-top:10px;cursor:pointer;";
    ex2.appendChild(U.ce("div", "emoji", "🧮"));
    var t2 = U.ce("div", "");
    t2.appendChild(U.ce("div", "", "امتحان الرياضيات السريع"));
    t2.appendChild(U.ce("div", "muted", "12 سؤال حساب متجدد — أعلى نتيجة: " + AQ.store.bestScore("star_exam") + "٪"));
    ex2.appendChild(t2);
    ex2.addEventListener("click", mathExam);
    screen.appendChild(ex2);

    /* لوحة نجوم الامتحان */
    var best = AQ.store.bestScore("star_exam");
    var badge = U.ce("div", "card");
    badge.innerHTML = "<b>🌟 قيادة الامتحانات</b><p class='muted'>أفضل نتيجتك الشاملة: " + (best || 0) + "٪ " +
      (best >= 90 ? "— أنت نجم! استمر 💪" : "— اهدف إلى 90٪ لنجمة مميزة") + "</p>";
    screen.appendChild(badge);
  }

  function register() {
    AQ.router.register("exams", {
      render: function (view, params) { render(view, params || {}); }
    });
  }

  return { register: register, render: render, daily: daily, fullExam: fullExam, mathExam: mathExam };
})();
