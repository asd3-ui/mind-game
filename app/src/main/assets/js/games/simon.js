/* عقلني — لعبة الألوان الإيقاعية (سايمون): كرر تسلسل الأضواء والنغمات */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var PADS = [
    { color: "#EF4444", hz: 330 },
    { color: "#22C55E", hz: 392 },
    { color: "#3B82F6", hz: 494 },
    { color: "#EAB308", hz: 587 }
  ];
  var GOAL = 7; // الإنجاز simon7 عند تسلسل من 7

  var ctl = null;

  function boot(view, params) {
    var seq = [];
    var inputIdx = 0;
    var best = 0;
    var finished = false, paused = false, accepting = false;

    var F = AQ.gz.frame("سلسلة الألوان 🎨", {});
    var screen = F.screen;

    var head = U.ce("div", "muted", "راقب الأضواء ثم كرر التسلسل بنفس الترتيب");
    screen.appendChild(head);
    var levelBox = U.ce("div", "timer", "المستوى 1");
    screen.appendChild(levelBox);

    var grid = U.ce("div", "simon-grid");
    var padEls = [];
    PADS.forEach(function (p) {
      var pad = U.ce("button", "simon-pad");
      pad.style.background = p.color;
      pad.addEventListener("click", function () {
        if (!accepting || paused || finished) return;
        press(padEls.indexOf(pad));
      });
      padEls.push(pad);
      grid.appendChild(pad);
    });
    screen.appendChild(grid);

    var hint = U.ce("div", "muted", "شاهد أولًا 👀");
    hint.style.textAlign = "center";
    screen.appendChild(hint);

    function lit(idx, ms) {
      var pad = padEls[idx];
      pad.classList.add("lit");
      AQ.audio.note(PADS[idx].hz, 0.24);
      setTimeout(function () { pad.classList.remove("lit"); }, ms || 320);
    }

    function playback() {
      accepting = false;
      hint.textContent = "شاهد أولًا 👀";
      var t = 500;
      seq.forEach(function (idx) {
        setTimeout(function () {
          if (finished || paused) return;
          lit(idx, 340);
        }, t);
        t += 480;
      });
      setTimeout(function () {
        if (finished || paused) return;
        accepting = true;
        inputIdx = 0;
        hint.textContent = "دورك الآن! 🎯";
      }, t + 120);
    }

    function extend() {
      seq.push(U.rint(0, 3));
      levelBox.textContent = "المستوى " + seq.length;
      playback();
    }

    function press(idx) {
      lit(idx, 180);
      if (seq[inputIdx] === idx) {
        inputIdx++;
        if (inputIdx >= seq.length) {
          accepting = false;
          best = Math.max(best, seq.length);
          AQ.audio.sfx("correct");
          AQ.store.addXP(4 + seq.length);
          AQ.store.addCoins(2);
          AQ.ui.refreshHUD();
          if (seq.length >= GOAL) AQ.store.award("simon7");
          setTimeout(function () {
            if (finished || paused) return;
            extend();
          }, 750);
        }
      } else {
        accepting = false;
        AQ.audio.sfx("wrong");
        try {
          if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(90);
        } catch (e) { /* noop */ }
        setTimeout(finish, 700);
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      AQ.audio.sfx(best >= 4 ? "win" : "fail");
      AQ.store.submitScore("simon", best);
      var s = AQ.gz.result({
        emoji: "🎨",
        title: best >= 4 ? "ذاكرتك للنغم قوية!" : "جيد! جرب مرة أخرى لترتفع أعلى",
        score: best >= GOAL ? "🏆" : "⭐",
        note: "وصلت إلى تسلسل من " + Math.max(1, best) + " أضواء.",
        stats: [["أطول تسلسل", String(best)], ["للإنجاز", "7 أضواء"]]
      });
      AQ.ui.confetti(best >= GOAL ? 70 : 35);
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      AQ.gz.resultActions(s, function () { AQ.router.back(); }, function () { AQ.router.go("simon", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        accepting = false;
        AQ.gz.pauseModal({
          resume: function () { paused = false; extend(); },
          restart: function () { paused = false; seq = []; extend(); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () { finished = true; }
    };
    ctl = controller;

    setTimeout(extend, 700);
    return controller;
  }

  AQ.router.register("simon", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
