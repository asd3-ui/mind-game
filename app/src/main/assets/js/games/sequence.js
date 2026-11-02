/* عقلني — لعبة الترتيب: رتب الأرقام أو الحروف العربية من الصغير إلى الكبير */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var LETTERS = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");

  var ctl = null;

  function boot(view, params) {
    var lvl = AQ.engine.levelNumber();
    var round = 0, total = 5, perfectRounds = 0;
    var paused = false, finished = false;

    var F = AQ.gz.frame("ترتيب وتسلسل 🔢", {});
    var screen = F.screen;

    var head = U.ce("div", "muted", "اضغط العناصر بالترتيب الصحيح");
    screen.appendChild(head);
    var progress = U.ce("div", "progress");
    var fill = U.ce("i");
    fill.style.width = "0%";
    progress.appendChild(fill);
    screen.appendChild(progress);

    var board = U.ce("div");
    board.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:18px 0;direction:rtl;";
    screen.appendChild(board);

    var feedback = U.ce("div", "explain ok hidden");
    screen.appendChild(feedback);

    function roundTargets() {
      var n = Math.min(3 + round, 7);
      var useLetters = lvl >= 4 && round % 2 === 1;
      var items = [];
      if (useLetters) {
        /* لسنا نفعله مع كل حروف، بل خذ متتالية مرتبة من الحروف من موضع عشوائي */
        var start = U.rint(0, LETTERS.length - n);
        for (var i = 0; i < n; i++) items.push(LETTERS[start + i]);
      } else {
        var hi = [9, 20, 50, 99, 99, 999, 999][Math.min(lvl - 1, 6)];
        var step = [1, 1, 5, 10, 10, 50, 100][Math.min(lvl - 1, 6)];
        var s0 = U.rint(1, Math.max(2, hi - n * step - 1));
        for (var j = 0; j < n; j++) items.push(s0 + step * j);
      }
      return { items: items, letters: useLetters, d: U.clamp(1 + round, 1, 5) };
    }

    function buildRound() {
      var cfg2 = roundTargets();
      var targets = cfg2.items;
      var order = U.shuffle(targets.slice());
      board.innerHTML = "";
      feedback.className = "explain ok hidden";
      feedback.innerHTML = "";
      var want = 0; // الرقم في ترتيب المطلوب

      if (cfg2.letters) head.textContent = "رتب الحروف بحسب الأبجدية (من اليمين):";
      else head.textContent = "رتب الأعداد من الأصغر إلى الأكبر:";

      order.forEach(function (val) {
        var b = U.ce("button", "opt", String(val));
        b.style.minWidth = "64px";
        b.addEventListener("click", function () {
          if (paused || finished) return;
          if (String(targets[want]) === String(val)) {
            b.disabled = true;
            b.classList.add("correct");
            AQ.audio.sfx("pop");
            want++;
            if (want >= targets.length) roundDone(cfg2, b);
          } else {
            b.classList.add("wrong");
            AQ.audio.sfx("wrong");
            try {
              if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(50);
            } catch (e) { /* noop */ }
            setTimeout(function () { b.classList.remove("wrong"); }, 500);
          }
        });
        board.appendChild(b);
      });
    }

    function roundDone(cfg2, doneTile) {
      AQ.gz.awardCorrect(cfg2.d);
      perfectRounds++;
      feedback.className = "explain ok";
      feedback.innerHTML = "🎉 ترتيب سليم! اكتملت الجولة.";
      AQ.ui.confetti(24);
      round++;
      fill.style.width = Math.round((round / total) * 100) + "%";
      setTimeout(function () {
        if (finished) return;
        if (round >= total) finish();
        else buildRound();
      }, 1400);
    }

    function finish() {
      finished = true;
      AQ.audio.sfx("win");
      AQ.ui.confetti(60);
      var s = AQ.gz.result({
        emoji: "🧮",
        title: "أتممت جولات الترتيب كلها!",
        score: "⭐⭐⭐",
        note: "رتبت " + perfectRounds + " جولات كاملة.",
        stats: [["الجولات", String(perfectRounds) + "/" + total], ["الصعوبة", String(Math.min(5, AQ.engine.levelNumber() + 2))]]
      });
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      AQ.gz.resultActions(s, function () { AQ.router.back(); }, function () { AQ.router.go("seq", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        AQ.gz.pauseModal({
          resume: function () { paused = false; },
          restart: function () { paused = false; round = 0; fill.style.width = "0%"; buildRound(); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () { }
    };
    ctl = controller;

    buildRound();
    return controller;
  }

  AQ.router.register("seq", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
