/* عقلني — لعبة سرعة التفاعل: انتظر الضوء ثم اضغط بأقصى سرعة */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var ROUNDS = 5;
  var FAST_MS = 600; // إنجاز reaction_fast عند أقل من هذا المتوسط

  var ctl = null;

  function boot(view, params) {
    var round = 0;
    var times = [];
    var finished = false, paused = false;
    var waiting = false;   // ننتظر ظهور الهدف
    var go = false;        // الهدف ظهر — اضغط!
    var spawnTimer = null;
    var goTime = 0;

    var F = AQ.gz.frame("برق التفاعل ⚡", {});
    var screen = F.screen;

    var pad = U.ce("div", "react-pad");
    pad.style.cssText = "display:flex;";
    var bigText = U.ce("div", "", "استعد…");
    bigText.style.cssText = "margin:auto;color:#fff;font-weight:800;font-size:28px;text-align:center;";
    pad.appendChild(bigText);
    screen.appendChild(pad);

    var statRow = U.ce("div", "muted", "");
    statRow.style.marginTop = "10px";
    screen.appendChild(statRow);

    function clearTarget() {
      go = false;
      var t = pad.querySelector(".react-target");
      if (t && t.parentNode) t.parentNode.removeChild(t);
    }

    function updateStats() {
      if (times.length) {
        var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
        statRow.textContent = "متوسط سرعتك: " + avg + " مللي ثانية — جولة " + (round + 1) + " من " + ROUNDS;
      }
    }

    function waitForIt() {
      if (finished || paused) return;
      waiting = true;
      go = false;
      bigText.textContent = "انتظر اللون الأخضر… 🟢";
      pad.style.background = "linear-gradient(180deg,#6D28D9,#4C1D95)";
      var delay = U.rint(1100, 3000);
      spawnTimer = setTimeout(spawnTarget, delay);
    }

    function spawnTarget() {
      if (finished || paused || !waiting) return;
      pad.style.background = "linear-gradient(180deg,#22C55E,#15803D)";
      var target = U.ce("div", "react-target", "⚡");
      target.style.right = U.rint(10, 65) + "%";
      target.style.top = U.rint(18, 62) + "%";
      target.addEventListener("click", tapNow);
      pad.appendChild(target);
      go = true;
      goTime = Date.now();
      bigText.textContent = "اضغط الآن! ⚡";
    }

    function tapNow() {
      if (!go || !waiting || finished || paused) return;
      var ms = Date.now() - goTime;
      times.push(Math.max(80, ms));
      round++;
      AQ.audio.sfx("correct");
      AQ.store.addXP(4);
      AQ.ui.refreshHUD();
      clearTarget();
      updateStats();
      if (round >= ROUNDS) setTimeout(finish, 500);
      else setTimeout(waitForIt, 700);
    }

    pad.addEventListener("click", function () {
      if (paused || finished) return;
      if (waiting && !go) {
        /* إطلاق مبكر: خسارة الجولة الحالية */
        AQ.audio.sfx("wrong");
        bigText.textContent = "وقعت مبكرًا! 🙂 انتظر الأخضر";
        times.push(1200);
        waiting = false;
        if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
        round++;
        updateStats();
        if (round >= ROUNDS) setTimeout(finish, 600);
        else setTimeout(waitForIt, 1000);
      }
    });

    function finish() {
      if (finished) return;
      finished = true;
      waiting = false;
      var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
      AQ.store.submitScore("reaction", ROUNDS * 1000 - avg);
      if (avg < FAST_MS) AQ.store.award("reaction_fast");
      AQ.audio.sfx(avg < FAST_MS ? "win" : "fail");
      var s = AQ.gz.result({
        emoji: avg < FAST_MS ? "💨" : "⏱",
        title: avg < FAST_MS ? "سرعة برق يا طالب!" : "سرعتك في التحسن!",
        score: avg < FAST_MS ? "🏆" : "⭐",
        note: "متوسط " + avg + " مللي ثانية.",
        stats: [["المتوسط", avg + " ms"], ["الجولات", String(ROUNDS)]]
      });
      AQ.ui.confetti(avg < FAST_MS ? 70 : 40);
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      AQ.gz.resultActions(s, function () { AQ.router.back(); }, function () { AQ.router.go("reaction", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        waiting = false;
        if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
        clearTarget();
        AQ.gz.pauseModal({
          resume: function () { paused = false; waitForIt(); },
          restart: function () { paused = false; AQ.router.go("reaction", params, true); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () {
        finished = true;
        if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
      }
    };
    ctl = controller;

    waitForIt();
    return controller;
  }

  AQ.router.register("reaction", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
