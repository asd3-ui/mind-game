/* عقلني — تحدّي اللاعبين: جولة أسئلة بالتناوب على جهاز واحد (لاعبين أو عائلة) */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var PER_PLAYER = 5;      /* أسئلة لكل لاعب */

  var ctl = null;

  function boot(view, params) {
    var cats = ["math", "science", "arabic", "general", "brain"];
    var players = [
      { name: "اللاعب الأول", score: 0 },
      { name: "اللاعب الثاني", score: 0 }
    ];
    var turn = 0;
    var qAsked = 0;          /* إجمالي الأسئلة حتى الآن */
    var current = null;
    var locked = false, finished = false, paused = false;
    var timer = null, timeLeft = 0;
    var TIME = 15;

    var F = AQ.gz.frame("تحدّي لاعبَين ⚔️", {});
    var screen = F.screen;

    /* لوحة الدرجات */
    var board = U.ce("div", "stat-row");
    var pBoxes = [];
    players.forEach(function (p, i) {
      var box = U.ce("div", "stat-box" + (i === turn ? " active" : ""));
      box.appendChild(U.ce("b", "", "0"));
      box.appendChild(U.ce("span", "", p.name));
      board.appendChild(box);
      pBoxes.push(box);
    });
    screen.appendChild(board);

    var counter = U.ce("div", "muted", "");
    screen.appendChild(counter);

    var card = U.ce("div", "card q-card");
    var qEmoji = U.ce("div", "emoji", "⚔️");
    var qText = U.ce("div", "qtext", "");
    card.appendChild(qEmoji);
    card.appendChild(qText);
    screen.appendChild(card);

    var optsBox = U.ce("div", "options");
    screen.appendChild(optsBox);

    function updateBoard() {
      pBoxes.forEach(function (b, i) {
        b.children[0].textContent = String(players[i].score);
        b.classList.toggle("active", i === turn);
      });
    }

    function stopClock() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function clockStart() {
      stopClock();
      timeLeft = TIME;
      renderClock();
      timer = setInterval(function () {
        if (paused) return;
        timeLeft--;
        renderClock();
        if (timeLeft <= 0) {
          stopClock();
          locked = true;
          reveal(null, null);
        }
      }, 1000);
    }

    var clockBox = U.ce("div", "timer", "");
    screen.appendChild(clockBox);
    function renderClock() { clockBox.textContent = "⏱ " + Math.max(0, timeLeft); }

    function nextQuestion() {
      if (finished || paused) return;
      if (qAsked >= PER_PLAYER * 2) { finish(); return; }
      locked = false;
      qAsked++;
      var cat = cats[(qAsked - 1) % cats.length];
      current = AQ.engine.pick(cat, {}) || AQ.engine.makeArithmetic(AQ.engine.levelNumber());
      counter.textContent = "سؤال " + qAsked + " من " + (PER_PLAYER * 2) + " — دور " + players[turn].name;
      qEmoji.textContent = current.e || "⚔️";
      qText.innerHTML = current.q;
      optsBox.innerHTML = "";
      clockBox.style.display = "";
      clockStart();
      U.shuffle(current.o.map(function (o, idx) { return { t: o, correct: idx === current.a }; }))
        .forEach(function (opt) {
          var b = U.ce("button", "opt", opt.t);
          b.addEventListener("click", function () {
            if (locked || paused) return;
            locked = true;
            stopClock();
            reveal(b, opt.correct);
          });
          optsBox.appendChild(b);
        });
    }

    function reveal(btn, wasCorrect) {
      var q = current;
      Array.prototype.slice.call(optsBox.querySelectorAll(".opt")).forEach(function (el) {
        if (el.textContent === q.o[q.a]) el.classList.add("correct");
        else if (el === btn) el.classList.add("wrong");
        else el.classList.add("dim");
      });
      if (wasCorrect) {
        players[turn].score += 10;
        AQ.audio.sfx("correct");
        AQ.gz.awardCorrect(q.d);
      } else {
        AQ.audio.sfx("wrong");
        try {
          if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(60);
        } catch (er) { /* noop */ }
      }
      updateBoard();
      /* تلميح بسيط بذلك الشرح */
      var ex = U.ce("div", "explain " + (wasCorrect ? "ok" : "no"));
      ex.innerHTML = (wasCorrect ? "🎉 نقاط لصالح " + players[turn].name + "!" : "الإجابة الصحيحة: " + q.o[q.a] + " " + (q.why ? "— " + q.why : ""));
      screen.appendChild(ex);
      ex.scrollIntoView({ block: "nearest" });
      setTimeout(function () {
        if (paused || finished) return;
        ex.parentNode.removeChild(ex);
        turn = (turn + 1) % 2;
        nextQuestion();
      }, 2000);
    }

    function finish() {
      finished = true;
      stopClock();
      var p0 = players[0].score, p1 = players[1].score;
      var winner = p0 === p1 ? null : (p0 > p1 ? 0 : 1);
      AQ.audio.sfx(winner === null ? "tap" : "win");
      AQ.ui.confetti(70);
      var s = AQ.gz.result({
        emoji: winner === null ? "🤝" : "🏆",
        title: winner === null ? "تعادل قوي! كلاهما نجم" : "فاز " + players[winner].name + "!",
        score: "⚔️",
        note: "النتيجة: " + p0 + " - " + p1,
        stats: [["أهداف", players[0].name + " = " + p0], ["", players[1].name + " = " + p1]]
      });
      var sticker = AQ.gz.finishSticker();
      if (sticker) AQ.ui.toast("ستيكر جديد " + sticker + " 🎁");
      var backB = U.ce("button", "btn ghost wide", "🏠 إلى الشاشة السابقة");
      backB.addEventListener("click", function () { AQ.router.back(); });
      s.appendChild(backB);
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        AQ.gz.pauseModal({
          resume: function () { paused = false; },
          restart: function () { paused = false; AQ.router.go("vs", params, true); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: stopClock
    };
    ctl = controller;

    updateBoard();
    nextQuestion();
    return controller;
  }

  AQ.router.register("vs", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
