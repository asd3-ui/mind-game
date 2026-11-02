/* عقلني — لعبة الذاكرة: قلب البطاقات واقتراح الأزواج */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var POOL = ["⭐", "🌈", "🦊", "🐬", "🦄", "🐝", "🦋", "🌻", "🍉", "🚀", "🌙", "🎈", "🐙", "🦖", "🍰", "🎸", "⚽", "🎨", "🧩", "🐢", "🍩", "🪐"];

  var ctl = null;

  function boot(view, params) {
    var lvl = AQ.engine.levelNumber();
    var pairsCount = U.clamp(4 + Math.round(lvl / 2), 4, 10);

    var F = AQ.gz.frame("لعبة الذاكرة 🧠", {});
    var screen = F.screen;

    var headRow = U.ce("div", "quiz-head");
    var label = U.ce("div", "muted", "اقلب بطاقتين لتجد زوجًا متطابقًا!");
    headRow.appendChild(label);
    var flipsBox = U.ce("div", "timer", "قلبات: 0");
    headRow.appendChild(flipsBox);
    screen.appendChild(headRow);

    var grid = U.ce("div", "mem-grid");
    grid.style.gridTemplateColumns = "repeat(" + Math.min(4, pairsCount) + ", minmax(56px,1fr))";
    screen.appendChild(grid);

    var picks = U.shuffledUnique(POOL, pairsCount);
    var cells = [];
    picks.forEach(function (p) { cells.push({ v: p }); cells.push({ v: p }); });
    U.shuffle(cells).forEach(function (c) { c.el = null; });

    var openIdx = -1, matched = 0, flips = 0, missed = 0, busy = false;
    var finished = false, paused = false;

    cells.forEach(function (c, idx) {
      var cell = U.ce("button", "mem-cell", "❓");
      cell.setAttribute("aria-label", "بطاقة");
      c.el = cell;
      c.open = false;
      c.done = false;
      cell.addEventListener("click", function () {
        if (busy || paused || finished || c.open || c.done) return;
        flip(idx);
      });
      grid.appendChild(cell);
    });

    function flip(idx) {
      var c = cells[idx];
      c.open = true;
      c.el.textContent = c.v;
      c.el.classList.add("open");
      AQ.audio.sfx("flip");
      flips++;
      flipsBox.textContent = "قلبات: " + flips;

      if (openIdx === -1) { openIdx = idx; return; }
      var other = cells[openIdx];
      if (other.v === c.v && openIdx !== idx) {
        /* زوج صحيح */
        c.done = true; other.done = true;
        c.el.classList.add("done"); other.el.classList.add("done");
        matched++;
        openIdx = -1;
        AQ.audio.sfx("correct");
        AQ.store.addXP(5);
        AQ.store.addCoins(1);
        AQ.ui.refreshHUD();
        if (matched >= pairsCount) setTimeout(finish, 650);
      } else {
        /* غير متطابق: خدها تغلق بعد لحظة */
        busy = true;
        missed++;
        AQ.audio.sfx("wrong");
        setTimeout(function () {
          c.open = false; c.el.textContent = "❓"; c.el.classList.remove("open", "wrong");
          other.open = false; other.el.textContent = "❓"; other.el.classList.remove("open", "wrong");
          openIdx = -1;
          busy = false;
        }, 850);
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      AQ.audio.sfx("win");
      AQ.ui.confetti(60);
      AQ.store.addXP(15);
      AQ.store.addCoins(5);
      AQ.ui.refreshHUD();
      if (missed === 0) AQ.store.award("memory_hero");

      var s = AQ.gz.result({
        emoji: missed === 0 ? "🧠" : "🌟",
        title: missed === 0 ? "ذاكرة من الأولى كلاس!" : "أنجزت كل الأزواج!",
        score: missed === 0 ? "🏆" : "⭐",
        note: "جمعت " + pairsCount + " أزواج.",
        stats: [["عدد القلبات", String(flips)], ["الأزواج", String(matched) + "/" + pairsCount]]
      });
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      AQ.gz.resultActions(s, function () { AQ.router.back(); }, function () { AQ.router.go("memory", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        busy = false;
        /* إغلاق البطاقة المفتوحة وحيدة كي لا يُكشف زوج أثناء الاستراحة */
        cells.forEach(function (c) {
          if (c.open && !c.done) { c.open = false; c.el.textContent = "❓"; c.el.classList.remove("open"); }
        });
        openIdx = -1;
        AQ.gz.pauseModal({
          resume: function () { paused = false; },
          restart: function () { paused = false; AQ.router.go("memory", params, true); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () { }
    };
    ctl = controller;

    return controller;
  }

  AQ.router.register("memory", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
