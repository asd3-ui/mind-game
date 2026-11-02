/* عقلني — لعبة الإيقاع: نوتات تسقط مع النغمة، اضغط عندما تصل إلى المنطقة المضيئة */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var NOTES_TOTAL = 14;

  var ctl = null;

  function boot(view, params) {
    var lvl = AQ.engine.levelNumber();
    var bpm = 84 + lvl * 8;                        /* نبضات الدقيقة */
    var interval = Math.round(60000 / bpm);        /* زمن بين نوتة وأخري */
    var fallMs = Math.max(1200, Math.round(2100 - lvl * 130)); /* زمن سقوط نوتة */

    var hits = 0, tapped = 0;
    var finished = false, paused = false;
    var scheduled = 0;         /* كم نوتة أُنطلقت */
    var timers = [];
    var notes = [];            /* النوتات الحية */
    var raf = 0;

    var F = AQ.gz.frame("مطرقة الإيقاع 🥁", {});
    var screen = F.screen;

    var head = U.ce("div", "muted", "اضغط عندما تدخل النوتة المنطقة المضيئة!");
    screen.appendChild(head);

    var prog = U.ce("div", "progress");
    var progFill = U.ce("i");
    progFill.style.width = "0%";
    prog.appendChild(progFill);
    screen.appendChild(prog);

    var track = U.ce("div", "rhythm-track");
    var zone = U.ce("div", "hit-zone");
    track.appendChild(zone);
    screen.appendChild(track);

    var pad = U.ce("button", "btn accent wide", "🥁 اضغط");
    screen.appendChild(pad);

    var status = U.ce("div", "muted", "إصابات: 0");
    status.style.marginTop = "8px";
    screen.appendChild(status);

    function spawnNote() {
      scheduled++;
      progFill.style.width = Math.round((scheduled / NOTES_TOTAL) * 100) + "%";
      var el = U.ce("div", "note", U.rand(["🎵", "🎶", "🔔"]));
      notes.push({ el: el, spawn: Date.now(), arrive: Date.now() + fallMs, hit: false, dead: false });
      track.appendChild(el);
      var hz = [330, 392, 494][U.rint(0, 2)];
      AQ.audio.note(hz * 2, 0.14);
    }

    function scheduleRest() {
      /* جدول النوتات التي لم تُنطلَق بعد */
      stopTimers();
      var i = scheduled;
      var step = 0;
      while (i < NOTES_TOTAL) {
        (function (delay) {
          timers.push(setTimeout(function () {
            if (!paused && !finished) spawnNote();
          }, delay));
        })(400 + step * interval);
        i++; step++;
      }
      timers.push(setTimeout(function () {
        if (!paused && !finished) finish();
      }, 400 + (NOTES_TOTAL - scheduled) * interval + fallMs + 500));
    }

    function stopTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function loop() {
      /* تحريك النوتات يدويًا (كي يتوقف السقوط أثناء الاستراحة) */
      var now = Date.now();
      notes.forEach(function (n) {
        if (n.dead) return;
        var t = (now - n.spawn) / (n.arrive - n.spawn);
        if (t >= 1.12) {
          n.dead = true;
          if (n.el.parentNode) n.el.parentNode.removeChild(n.el);
          return;
        }
        n.el.style.top = Math.round(t * 100) + "%";
      });
      notes = notes.filter(function (n) { return !n.dead; });
      if (!finished && !paused) raf = requestAnimationFrame(loop);
    }

    function tap() {
      if (paused || finished) return;
      var now = Date.now();
      var bestN = null, bestDist = 1e9;
      notes.forEach(function (n) {
        if (n.hit || n.dead) return;
        var d = Math.abs(n.arrive - now);
        if (d < bestDist) { bestDist = d; bestN = n; }
      });
      tapped++;
      if (bestN && bestDist <= 280) {
        bestN.hit = true;
        bestN.dead = true;
        if (bestN.el.parentNode) bestN.el.parentNode.removeChild(bestN.el);
        hits++;
        AQ.audio.sfx("pop");
        AQ.store.addXP(3);
      } else {
        AQ.audio.sfx("tick");
      }
      AQ.ui.refreshHUD();
      status.textContent = "إصابات: " + hits + " من " + NOTES_TOTAL;
    }

    pad.addEventListener("click", tap);

    function finish() {
      if (finished) return;
      finished = true;
      stopTimers();
      if (raf) cancelAnimationFrame(raf);
      var pct = Math.round((hits / NOTES_TOTAL) * 100);
      AQ.store.submitScore("rhythm", pct);
      if (pct >= 90) AQ.store.award("rhythm_90");
      AQ.audio.sfx(pct >= 70 ? "win" : "fail");
      var s = AQ.gz.result({
        emoji: "🎼",
        title: pct >= 70 ? "إيقاعك منتظم وجميل!" : "قليل التدريب ويتقن الإيقاع",
        score: pct >= 90 ? "🏆" : "⭐",
        note: "أصبت " + hits + " نوتة من " + NOTES_TOTAL + " نوتات.",
        stats: [["الدقة", pct + "٪"], ["النبضات", bpm + " في الدقيقة"]]
      });
      AQ.ui.confetti(pct >= 70 ? 60 : 30);
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      AQ.gz.resultActions(s, function () { AQ.router.back(); }, function () { AQ.router.go("rhythm", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        stopTimers();
        if (raf) cancelAnimationFrame(raf);
        /* نُسقط النوتات الحية بلا عقاب، ثم نُعيد الجدول بعد الاستراحة */
        notes.forEach(function (n) {
          if (n.el.parentNode) n.el.parentNode.removeChild(n.el);
          n.dead = true;
        });
        notes = [];
        /* النوتات التي لم تصل بعد قد فاتت وسقوطها بلا ضغط لا يُحسب إصابة */
        AQ.gz.pauseModal({
          resume: function () { paused = false; scheduleRest(); loop(); },
          restart: function () { paused = false; AQ.router.go("rhythm", params, true); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () {
        finished = true;
        stopTimers();
        if (raf) cancelAnimationFrame(raf);
      }
    };
    ctl = controller;

    loop();
    scheduleRest();
    return controller;
  }

  AQ.router.register("rhythm", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
