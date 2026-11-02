/* عقلني — لعبة التهجئة: كوّن الكلمة من حروف البنك (صورة مساندة + خانات) */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;

  var ctl = null;

  function boot(view, params) {
    var words = AQ.content.words;
    var lvl = AQ.engine.levelNumber();
    /* 8 كلمات تناسب مستوى اللاعب */
    var pool = words.filter(function (w) { return Math.abs(w.d - lvl) <= 1; });
    if (pool.length < 8) pool = words.slice();
    var chosen = U.shuffledUnique(pool, Math.min(8, pool.length));

    var wordIdx = 0, builtAll = 0;
    var target = "", placed = [], bank = [];
    var finished = false, paused = false;
    var hintCount = 0;

    var F = AQ.gz.frame("تهجئة الكلمات ✍️", {});
    var screen = F.screen;

    var counter = U.ce("div", "muted", "كلمة 1 من " + chosen.length);
    screen.appendChild(counter);

    var card = U.ce("div", "card q-card");
    var emoji = U.ce("div", "emoji", chosen[0].e);
    var prompt = U.ce("div", "qtext", "كوّن الكلمة الممثلة بالصورة");
    card.appendChild(emoji);
    card.appendChild(prompt);
    screen.appendChild(card);

    var slots = U.ce("div", "word-slots");
    screen.appendChild(slots);

    var bankBox = U.ce("div", "letter-bank");
    screen.appendChild(bankBox);

    var tools = U.ce("div", "m-actions");
    var helpBtn = U.ce("button", "btn small ghost", "🆘 تلميح حرف");
    tools.appendChild(helpBtn);
    screen.appendChild(tools);

    function freshBankLetters(word) {
      /* حروف الكلمة الحقيقية + ضوضاء من حروف كلمات أخرى، ثم خلط — بالترتيب العربي مستقل */
      var extras = "ابهتدموسري".split("");
      var letters = word.split("");
      var noiseN = Math.max(2, Math.min(5, word.length - 2));
      letters = U.shuffledUnique(letters, letters.length); /* أخف التكرار إن وجد */
      for (var i = 0; i < noiseN; i++) letters.push(U.rand(extras));
      return U.shuffle(letters.map(function (l, i2) { return { ch: l, used: false, ref: i2 }; }));
    }

    function renderWord() {
      target = chosen[wordIdx].w;
      emoji.textContent = chosen[wordIdx].e;
      counter.textContent = "كلمة " + (wordIdx + 1) + " من " + chosen.length;
      prompt.textContent = "كوّن الكلمة الممثلة بالصورة";
      placed = [];
      bank = freshBankLetters(target);
      slots.innerHTML = "";
      bankBox.innerHTML = "";
      for (var i = 0; i < target.length; i++) {
        var s = U.ce("div", "slot", "　");
        s.setAttribute("aria-label", "خانة حرف " + (i + 1));
        slots.appendChild(s);
      }
      bank.forEach(function (b) {
        var el = U.ce("button", "opt", b.ch);
        el.addEventListener("click", function () {
          if (paused || finished || b.used) return;
          placeLetter(b, el);
        });
        b.el = el;
        bankBox.appendChild(el);
      });
    }

    function placeLetter(b, el) {
      if (placed.length >= target.length) return;
      var need = target[placed.length];
      placed.push(b.ch);
      var slotEl = slots.children[placed.length - 1];
      slotEl.textContent = b.ch;
      slotEl.classList.add("filled");
      b.used = true;
      el.disabled = true;
      if (b.ch === need) {
        AQ.audio.sfx("flip");
        if (placed.length === target.length) wordComplete();
      } else {
        /* خطأ: أعد الحرف إلى البنك */
        AQ.audio.sfx("wrong");
        try {
          if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(50);
        } catch (e) { /* noop */ }
        setTimeout(function () {
          placed.pop();
          slotEl.textContent = "　";
          slotEl.classList.remove("filled");
          b.used = false;
          el.disabled = false;
        }, 420);
      }
    }

    function placeHint() {
      if (paused || finished) return;
      if (placed.length >= target.length) return;
      var need = target[placed.length];
      for (var i = 0; i < bank.length; i++) {
        if (!bank[i].used && bank[i].ch === need) {
          hintCount++;
          placeLetter(bank[i], bank[i].el);
          return;
        }
      }
    }

    function wordComplete() {
      builtAll++;
      var hintPenalty = Math.max(5, 14 - hintCount * 3);
      AQ.store.addXP(hintPenalty);
      AQ.store.addCoins(2);
      AQ.ui.refreshHUD();
      if (hintCount === 0 && placed.length >= 2) AQ.store.state.wordsBuilt = (AQ.store.state.wordsBuilt || 0) + 1;
      else AQ.store.state.wordsBuilt = (AQ.store.state.wordsBuilt || 0) + 0.5;
      if (AQ.store.state.wordsBuilt >= 15) AQ.store.award("speller");
      AQ.audio.sfx("correct");
      AQ.ui.toast("أحسنت! " + chosen[wordIdx].e + " " + chosen[wordIdx].w);
      hintCount = 0;
      wordIdx++;
      if (wordIdx >= chosen.length) { setTimeout(finish, 700); }
      else setTimeout(renderWord, 850);
    }

    function finish() {
      if (finished) return;
      finished = true;
      AQ.audio.sfx("win");
      AQ.ui.confetti(60);
      var wordList = chosen.map(function (w) { return w.w; }).join("، ");
      var s = AQ.gz.result({
        emoji: "✍️",
        title: "بطل التهجئة!",
        score: "⭐⭐",
        note: "كوّنت " + builtAll + " كلمات: " + wordList,
        stats: [["عداد الكلمات", String(Math.floor(AQ.store.state.wordsBuilt))], ["الكلمات فيه", String(chosen.length)]]
      });
      AQ.gz.resultActions(s, function () { AQ.router.back(); }, function () { AQ.router.go("spelling", params, true); });
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        AQ.gz.pauseModal({
          resume: function () { paused = false; },
          restart: function () { paused = false; wordIdx = 0; renderWord(); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () { }
    };
    ctl = controller;

    helpBtn.addEventListener("click", placeHint);

    renderWord();
    return controller;
  }

  AQ.router.register("spelling", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
