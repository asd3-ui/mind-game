/* عقلني — مطابقة الأزواج: نصل صورة بكل كلمة بديلاً عنها مألوفة */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;

  var ctl = null;

  function boot(view, params) {
    var sets = AQ.content.pairs;
    var set = sets[0];
    if (params && params.set !== undefined) set = sets[params.set] || sets[0];
    var items = set.pairs.slice(); // [emoji, word]
    var finished = false, paused = false;

    var F = AQ.gz.frame(set.name, {});
    var screen = F.screen;

    var head = U.ce("div", "muted", "اضغط الصورة ثم الكلمة التي تعبر عنها");
    screen.appendChild(head);

    var grid = U.ce("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;";
    screen.appendChild(grid);

    var colE = U.ce("div");
    var colW = U.ce("div");
    colE.style.cssText = "display:grid;gap:10px;";
    colW.style.cssText = "display:grid;gap:10px;";
    grid.appendChild(colE);
    grid.appendChild(colW);

    var selE = null, selW = null, solved = 0;
    var status = U.ce("div", "muted", "أزواج صحيحة: 0 من " + items.length);
    status.style.marginTop = "12px";
    screen.appendChild(status);

    var emojis = items.map(function (p) { return p[0]; });
    var wordsOrder = U.shuffle(items.map(function (p, i) { return i; }));

    emojis.forEach(function (em, i) {
      var b = U.ce("button", "opt pair-e", em);
      b.style.fontSize = "30px";
      b.setAttribute("data-i", String(i));
      b.addEventListener("click", function () {
        if (paused || finished) return;
        if (b.disabled) return;
        clearSel(colE);
        selE = { i: i, el: b };
        b.classList.add("correct");
        AQ.audio.sfx("tap");
        tryMatch();
      });
      colE.appendChild(b);
    });

    wordsOrder.forEach(function (i) {
      var b = U.ce("button", "opt pair-w", items[i][1]);
      b.setAttribute("data-i", String(i));
      b.addEventListener("click", function () {
        if (paused || finished) return;
        if (b.disabled) return;
        clearSel(colW);
        selW = { i: i, el: b };
        b.classList.add("correct");
        AQ.audio.sfx("tap");
        tryMatch();
      });
      colW.appendChild(b);
    });

    function clearSel(col) {
      Array.prototype.slice.call(col.children).forEach(function (el) {
        if (!el.disabled) el.classList.remove("correct", "wrong");
      });
    }

    function tryMatch() {
      if (!selE || !selW) return;
      if (selE.i === selW.i) {
        selE.el.disabled = true;
        selW.el.disabled = true;
        selE.el.classList.add("done");
        selW.el.classList.add("done");
        selE.el.classList.remove("correct");
        selW.el.classList.remove("correct");
        solved++;
        status.textContent = "أزواج صحيحة: " + solved + " من " + items.length;
        AQ.gz.awardCorrect(set.d);
        AQ.audio.sfx("correct");
        selE = null; selW = null;
        if (solved >= items.length) setTimeout(finish, 550);
      } else {
        var eE = selE.el, eW = selW.el;
        AQ.audio.sfx("wrong");
        try {
          if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(50);
        } catch (er) { /* noop */ }
        eE.classList.add("wrong"); eW.classList.add("wrong");
        setTimeout(function () {
          eE.classList.remove("wrong", "correct");
          eW.classList.remove("wrong", "correct");
          selE = null; selW = null;
        }, 450);
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      AQ.audio.sfx("win");
      AQ.ui.confetti(55);
      var s = AQ.gz.result({
        emoji: "🧩",
        title: "مطابقة مثالية!",
        score: "⭐⭐⭐",
        note: "أنهيت جميع أزواج «" + set.name + "».",
        stats: [["الأزواج", String(solved) + "/" + items.length]]
      });
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      AQ.gz.resultActions(s, function () { AQ.router.back(); }, function () { AQ.router.go("pairs", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        AQ.gz.pauseModal({
          resume: function () { paused = false; },
          restart: function () { paused = false; AQ.router.go("pairs", params, true); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () { }
    };
    ctl = controller;

    return controller;
  }

  AQ.router.register("pairs", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
