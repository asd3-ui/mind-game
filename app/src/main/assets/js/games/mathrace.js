/* عقلني — سباق الحساب: 60 ثانية من المعادلات المتشابكة (تتولد بلا تكرار) */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var DURATION = 60; // ثواني
  var GOAL = 12;     // عدد الإجابات الصحيحة لبلوغ خط النهاية

  var ctl = null;

  function boot(view, params) {
    var diff = AQ.engine.levelNumber();
    var score = 0, shown = 0, wrongCount = 0;
    var paused = false, finished = false, asked = [], lock = false;
    var timeLeft = DURATION;
    var timer = null;

    var F = AQ.gz.frame("سباق الحساب 🏁", {});
    var screen = F.screen;

    var track = U.ce("div", "race-track");
    track.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin:8px 0;gap:6px;";
    var heroLine = U.ce("div", "", "🚀");
    heroLine.style.cssText = "font-size:34px;transition:transform .3s;";
    var oppLine = U.ce("div", "", "🐢");
    oppLine.style.cssText = "font-size:30px;opacity:.8;";
    var midLine = U.ce("div", "muted", "🏁");
    track.appendChild(heroLine);
    track.appendChild(midLine);
    track.appendChild(oppLine);
    screen.appendChild(track);

    var clock = U.ce("div", "timer", "⏱ " + DURATION);
    clock.style.alignSelf = "center";
    screen.appendChild(clock);

    var qCard = U.ce("div", "card q-card");
    var qText = U.ce("div", "qtext", "استعد…");
    qCard.appendChild(qText);
    screen.appendChild(qCard);

    var optsBox = U.ce("div", "options");
    screen.appendChild(optsBox);

    function buildQ() {
      var q = AQ.engine.makeArithmetic(U.clamp(diff + (score > GOAL * 0.7 ? 1 : 0), 1, 5));
      asked.push(q);
      shown++;
      qText.innerHTML = q.q;
      lock = false;
      optsBox.innerHTML = "";
      U.shuffle(q.o.map(function (o, idx) { return { t: o, correct: idx === q.a }; }))
        .forEach(function (opt) {
          var b = U.ce("button", "opt", opt.t);
          b.addEventListener("click", function () {
            if (lock || paused || finished) return;
            lock = true;
            resolve(b, opt.correct);
          });
          optsBox.appendChild(b);
        });
    }

    function resolve(btn, wasCorrect) {
      var q = asked[asked.length - 1];
      if (wasCorrect) {
        score++;
        AQ.audio.sfx("correct");
        AQ.gz.awardCorrect(q.d);
        heroLine.style.transform = "scale(1.4)";
        setTimeout(function () { heroLine.style.transform = "scale(1)"; }, 250);
      } else {
        wrongCount++;
        AQ.audio.sfx("wrong");
        try {
          if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(60);
        } catch (e) { /* noop */ }
      }
      /* السلحفاة تتقدم على الأخطاء وعلى الوقت */
      Array.prototype.slice.call(optsBox.querySelectorAll(".opt")).forEach(function (el) {
        var isRight = el.textContent === q.o[q.a];
        if (isRight) el.classList.add("correct");
        else if (el === btn && !wasCorrect) el.classList.add("wrong");
        else el.classList.add("dim");
      });
      heroLine.style.paddingRight = Math.min(40, score * 3) + "%";
      oppLine.style.paddingLeft = Math.min(40, Math.round(((DURATION - timeLeft) / DURATION) * 22) + wrongCount * 2) + "%";
      setTimeout(function () {
        if (finished) return;
        if (score >= GOAL) { finish(); return; }
        buildQ();
      }, wasCorrect ? 450 : 900);
    }

    function startClock() {
      timer = setInterval(function () {
        if (paused || finished) return;
        timeLeft--;
        clock.textContent = "⏱ " + Math.max(0, timeLeft);
        if (timeLeft <= 8) clock.classList.add("danger");
        if (timeLeft <= 0) finish();
      }, 1000);
    }

    function finish() {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      AQ.audio.sfx(score >= GOAL ? "win" : "fail");
      AQ.store.recordAnswer("math", diff, score >= (shown ? 1 : 0) && score > 0);
      if (score >= GOAL) AQ.store.award("race100");
      AQ.store.submitScore("race", score);

      var won = score >= GOAL;
      var s = AQ.gz.result({
        emoji: won ? (score === GOAL * 2 ? "🏎️" : "🚀") : "🐢",
        title: won ? "سبقت! خط النهاية لك!" : "وقت السباق انتهى!",
        score: won ? "🏆" : "⭐",
        note: wrongCount ? ("أخطاء: " + wrongCount + " — المرة القادمة أسرع!") : "بلا أي خطأ، بطل حسابي!",
        stats: [["نقاط السباق", String(score)], ["الهدف", String(GOAL)], ["الخبرة متاحة", "XP"]]
      });
      AQ.ui.confetti(won ? 70 : 40);
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      var outFn = function () { AQ.router.back(); };
      AQ.gz.resultActions(s, outFn, function () { AQ.router.go("race", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        AQ.gz.pauseModal({
          resume: function () { paused = false; },
          restart: function () { paused = false; AQ.router.go("race", params, true); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () { if (timer) clearInterval(timer); }
    };
    ctl = controller;

    buildQ();
    startClock();
    return controller;
  }

  AQ.router.register("race", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
