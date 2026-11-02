/* عقلني — أدوات مشتركة للألعاب: إطار الشاشة، زر الإيقاف، نافذة الاستراحة، شاشة النتيجة */
"use strict";
window.AQ = window.AQ || {};

AQ.gz = (function () {
  var U = AQ.util;

  /* إطار لعبة: شريط علوي بلا زر رجوع + زر إيقاف مؤقت + حاوية الشاشة */
  function frame(title, opts) {
    var view = document.getElementById("app");
    view.innerHTML = "";
    var bar = AQ.ui.topbar(title, { backBtn: false });
    var pause = U.ce("button", "iconbtn", "⏸");
    pause.setAttribute("aria-label", "إيقاف مؤقت");
    pause.addEventListener("click", function () { AQ.router.hardwareBack(); });
    bar.appendChild(pause);
    view.appendChild(bar);
    var screen = U.ce("div", "screen");
    view.appendChild(screen);
    return { bar: bar, screen: screen };
  }

  /* نافذة الاستراحة (الإيقاف المؤقت) — تظهر عند زر الهاتف الراجع أثناء اللعب */
  function pauseModal(opts) {
    AQ.ui.modal({
      icon: "⏸",
      title: "استراحة قصيرة!",
      text: "اللعبة متوقفة مؤقتًا. تقدر تكمل وقت ما تريد 🌟",
      buttons: [
        { label: "متابعة اللعب", ico: "▶️", style: "good", action: opts.resume || function () { } },
        { label: "إعادة اللعب", ico: "🔄", style: "accent", action: opts.restart || function () { } },
        { label: "الرجوع", ico: "🏠", style: "ghost", action: opts.exit || function () { } }
      ]
    });
  }

  /* مكافأة إجابة صحيحة حسب المستوى (متسقة مع محرّك الاختبار) */
  function awardCorrect(d) {
    var xp = 10 + (d - 1) * 5;
    var coins = 2 + d;
    AQ.store.addXP(xp);
    AQ.store.addCoins(coins);
    AQ.ui.refreshHUD();
  }

  function finishSticker() {
    if (Math.random() < 0.35) {
      var s = AQ.store.stickerRandom();
      if (s) AQ.store.addSticker(s);
      return s;
    }
    return null;
  }

  /* شاشة نتيجة موحدة للألعاب */
  function result(opts) {
    var view = document.getElementById("app");
    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("النتيجة", { backBtn: false }));
    var s = U.ce("div", "screen");
    view.appendChild(s);
    var hero = U.ce("div", "result-hero");
    hero.appendChild(U.ce("div", "big", opts.emoji || "🏆"));
    hero.appendChild(U.ce("h2", "", opts.title || "أحسنت!"));
    if (opts.score !== undefined) hero.appendChild(U.ce("div", "stars", opts.score));
    if (opts.note) hero.appendChild(U.ce("p", "muted", opts.note));
    s.appendChild(hero);

    if (opts.stats && opts.stats.length) {
      var stat = U.ce("div", "stat-row");
      opts.stats.forEach(function (row) {
        var box = U.ce("div", "stat-box");
        box.appendChild(U.ce("b", "", row[1]));
        box.appendChild(U.ce("span", "", row[0]));
        stat.appendChild(box);
      });
      s.appendChild(stat);
    }
    return s;
  }

  function resultActions(s, out, restart) {
    var actions = U.ce("div", "m-actions");
    if (restart) {
      var again = U.ce("button", "btn accent wide", "🔄 العب مرة أخرى");
      again.addEventListener("click", restart);
      actions.appendChild(again);
    }
    var back = U.ce("button", "btn ghost wide", "🏠 الرجوع");
    back.addEventListener("click", out);
    actions.appendChild(back);
    s.appendChild(actions);
  }

  return {
    frame: frame,
    pauseModal: pauseModal,
    awardCorrect: awardCorrect,
    finishSticker: finishSticker,
    result: result,
    resultActions: resultActions
  };
})();
