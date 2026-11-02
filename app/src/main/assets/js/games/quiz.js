/* عقلني — محرك الاختبارات العام (يُستعمل في المسابقات والامتحانات والتحدي اليومي) */
"use strict";
window.AQ = window.AQ || {};
AQ.games = window.AQ.games || {};

AQ.games.quiz = (function () {
  var U = AQ.util;

  var controller = null; // وحدة سطح الشاشة الحالية (للإيقاف المؤقت والتنظيف)

  /* إقلاع الاختبار داخل شاشة المسير */
  function boot(view, cfg) {
    var st = AQ.store.state;
    var qs = cfg.questions.slice(0, cfg.maxN || cfg.questions.length);
    var i = 0, correct = 0, streak = 0, bestStreak = 0, wrong = [];
    var xpGain = 0, coinsGain = 0;
    var repeatUsed = false;
    var finished = false;
    var paused = false, timer = null, timeLeft;

    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar(cfg.title, { backBtn: false }));

    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    var head = U.ce("div", "quiz-head");
    var prog = U.ce("div", "progress");
    var progFill = U.ce("i");
    progFill.style.width = "0%";
    prog.appendChild(progFill);
    head.appendChild(prog);
    var timerBox = U.ce("div", "timer", "⏱ " + (cfg.timePerQ || 0));
    if (cfg.timePerQ) head.appendChild(timerBox);
    screen.appendChild(head);

    var counter = U.ce("div", "muted", "السؤال 1 من " + qs.length);
    counter.style.margin = "0 0 8px";
    screen.appendChild(counter);

    var qCard = U.ce("div", "card q-card");
    var qEmoji = U.ce("div", "emoji");
    var qText = U.ce("div", "qtext");
    var qTools = U.ce("div", "q-tools");
    var repeatBtn = U.ce("button", "btn small ghost", "🔊 أعد السؤال");
    repeatBtn.addEventListener("click", function () {
      repeatUsed = true;
      var q = qs[i];
      if (q) speakQ(q);
    });
    qTools.appendChild(repeatBtn);
    qCard.appendChild(qEmoji);
    qCard.appendChild(qText);
    qCard.appendChild(qTools);
    screen.appendChild(qCard);

    var optsBox = U.ce("div", "options");
    screen.appendChild(optsBox);

    var extraBox = U.ce("div");
    screen.appendChild(extraBox);

    function stripHtml(html) {
      var tmp = document.createElement("div");
      tmp.innerHTML = html;
      return (tmp.textContent || tmp.innerText || "").trim();
    }

    function speakQ(q) {
      var spokenText = stripHtml(q.q) + ". الخيارات: " + stripHtml(q.o.join(". ")) + ".";
      AQ.voice.speak(spokenText);
    }

    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function startTimer() {
      stopTimer();
      timeLeft = cfg.timePerQ;
      timerBox.textContent = "⏱ " + timeLeft;
      timerBox.classList.remove("danger");
      timer = setInterval(function () {
        if (paused) return;
        timeLeft--;
        timerBox.textContent = "⏱ " + Math.max(0, timeLeft);
        if (timeLeft <= 5) timerBox.classList.add("danger");
        if (timeLeft <= 0) {
          stopTimer();
          locked = true;
          answer(null, false, qs[i]);
        }
      }, 1000);
    }

    var locked = false;

    function showQ() {
      locked = false;
      var q = qs[i];
      qEmoji.textContent = q.e || (cfg.icon || "❓");
      qText.innerHTML = q.q;
      counter.textContent = "السؤال " + (i + 1) + " من " + qs.length;
      progFill.style.width = Math.round((i / qs.length) * 100) + "%";

      if (st.settings.autoread && AQ.voice.available() !== "none") speakQ(q);

      extraBox.innerHTML = "";
      optsBox.innerHTML = "";
      var shuffledOptions = U.shuffle(q.o.map(function (o, idx) {
        return { t: o, correct: idx === q.a };
      }));
      shuffledOptions.forEach(function (opt) {
        var b = U.ce("button", "opt", opt.t);
        b.addEventListener("click", function () {
          if (locked || paused) return;
          locked = true;
          answer(b, opt.correct, q);
        });
        optsBox.appendChild(b);
      });
      if (cfg.timePerQ) startTimer();
    }

    function answer(btn, wasCorrect, q) {
      stopTimer();
      var isGood = !!wasCorrect;
      AQ.store.recordAnswer(q.cat || "general", q.d, isGood);

      if (isGood) {
        correct++;
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        AQ.audio.sfx("correct");
        try {
          if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(30);
        } catch (e) { /* noop */ }
        if (streak >= 3) showStreak(streak);
      } else {
        streak = 0;
        AQ.audio.sfx("wrong");
        try {
          if (window.AqApp && window.AqApp.vibrate) window.AqApp.vibrate(80);
        } catch (e2) { /* noop */ }
        wrong.push({ q: q.q, right: q.o[q.a], why: q.why });
      }

      /* تلوين الخيارات */
      var kids = Array.prototype.slice.call(optsBox.querySelectorAll(".opt"));
      kids.forEach(function (el) {
        if (el.textContent === q.o[q.a]) el.classList.add("correct");
        else if (el === btn && !isGood) el.classList.add("wrong");
        else el.classList.add("dim");
      });

      /* مكافأة لكل إجابة صحيحة (تُطبَّق فورًا) */
      if (isGood) {
        var xp = 10 + (q.d - 1) * 5;
        var coins = 2 + q.d;
        xpGain += xp;
        coinsGain += coins;
        AQ.store.addXP(xp);
        AQ.store.addCoins(coins);
        AQ.ui.refreshHUD();
      }

      /* شرح */
      var ex = U.ce("div", "explain " + (isGood ? "ok" : "no"));
      ex.innerHTML = (isGood ? "🎉 أحسنت! " : "لا بأس، تعلّم خطوة خطوة 🙂 ") + (q.why ? "<br><b>" + q.why + "</b>" : "");
      extraBox.innerHTML = "";
      extraBox.appendChild(ex);

      setTimeout(function () {
        if (paused) return; // لا نتقدم أثناء الاستراحة
        i++;
        if (i < qs.length) showQ();
        else finish();
      }, isGood ? 900 : 2300);
    }

    function showStreak(n) {
      Array.prototype.slice.call(document.querySelectorAll(".streak-flag")).forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      var f = U.ce("div", "streak-flag", "🔥 " + n + " متتالية!");
      document.body.appendChild(f);
      setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
    }

    function finish() {
      finished = true;
      stopTimer();
      AQ.voice.stop();
      var res = { total: qs.length, correct: correct, bestStreak: bestStreak, wrong: wrong, xp: xpGain, coins: coinsGain };
      finishScreen(cfg, res);
    }

    controller = {
      pause: function () {
        if (finished) return false;
        paused = true;
        AQ.gz.pauseModal({
          resume: function () { paused = false; },
          restart: function () { paused = false; AQ.router.go("quiz", cfg, true); },
          exit: function () { paused = false; AQ.router.back(); }
        });
        return true;
      },
      cleanup: stopTimer
    };

    showQ();
    return controller;
  }

  /* ---------------- شاشة النتيجة ---------------- */
  function finishScreen(cfg, res) {
    var pct = res.total ? Math.round((res.correct / res.total) * 100) : 0;
    var pass = pct >= (cfg.passPct || 70);
    var emoji = pass ? (pct === 100 ? "🏆" : "🎉") : "💪";
    var stars = pct === 100 ? "⭐⭐⭐" : pct >= 85 ? "⭐⭐" : pass ? "⭐" : "☆";

    var view = document.getElementById("app");
    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("النتيجة", { backBtn: false }));
    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    var hero = U.ce("div", "result-hero");
    hero.appendChild(U.ce("div", "big", emoji));
    hero.appendChild(U.ce("h2", "", pass ? "عمل رائع يا بطل!" : "جيد، خذ نفَسًا وحاول مرة أخرى!"));
    hero.appendChild(U.ce("div", "stars", stars));
    hero.appendChild(U.ce("p", "muted", "أجبت عن " + res.correct + " من " + res.total));
    screen.appendChild(hero);

    var stat = U.ce("div", "stat-row");
    [["النسبة", pct + "٪"], ["الخبرة", "XP +" + res.xp], ["جولة متتالية", res.bestStreak]].forEach(function (row) {
      var box = U.ce("div", "stat-box");
      box.appendChild(U.ce("b", "", row[1]));
      box.appendChild(U.ce("span", "", row[0]));
      stat.appendChild(box);
    });
    screen.appendChild(stat);

    /* مكافآت ختامية إضافية (مكافأة السؤال طُبّقت أثناء اللعب) */
    if (pct === 100) { AQ.store.addXP(30); res.xp += 30; }
    if (pass) { AQ.store.addCoins(10); res.coins += 10; }
    if (res.total >= 10 && !repeatUsed) AQ.store.award("no_hints");
    AQ.ui.refreshHUD();
    AQ.audio.sfx(pass ? "win" : "fail");
    if (pass) {
      AQ.ui.confetti(50 + pct);
      setTimeout(function () { AQ.ui.openChestSource(1200); }, 900);
    }

    /* إنجازات وقيادات */
    if (res.total >= 10 && res.correct === res.total) AQ.store.award("quiz_master");
    if (cfg.treat === "exam") {
      AQ.store.award("exam_done");
      if (pct >= 90) AQ.store.award("exam_star");
      AQ.store.submitScore("star_exam", pct);
    }
    if (cfg.treat === "daily") {
      AQ.store.bumpDaily(res.correct);
      AQ.store.submitScore("candle_daily", res.correct);
      res.coins += 15;
      AQ.store.addCoins(15);
    }

    /* مراجعة الأخطاء مع شرح */
    if (res.wrong.length) {
      var review = U.ce("div", "card");
      review.appendChild(U.ce("h3", "", "✏️ رحلت التعلّم — راجع ما فاتك"));
      res.wrong.slice(0, 6).forEach(function (w) {
        var item = U.ce("div", "review-item");
        item.classList.add("wrong");
        item.appendChild(U.ce("span", "mark", "❌"));
        var rightTxt = w.why ? (w.right + " — " + w.why) : w.right;
        item.appendChild(U.ce("div", "", "<b>" + w.q + "</b><br><span class='muted'>الصحيح: " + rightTxt + "</span>"));
        review.appendChild(item);
      });
      screen.appendChild(review);
    }

    /* توصيات ذكية */
    var recs = AQ.engine.recommendations();
    if (recs.length && pct < 100) {
      var rec = U.ce("div", "card");
      rec.appendChild(U.ce("b", "", "🤖 نصائح المحرك الذكي"));
      recs.forEach(function (r) {
        rec.appendChild(U.ce("div", "muted", "• " + r.word + " — " + r.advice));
      });
      screen.appendChild(rec);
    }

    /* أزرار */
    var actions = U.ce("div", "m-actions");
    var again = U.ce("button", "btn accent wide", "🔄 العب مرة أخرى");
    again.addEventListener("click", function () { AQ.router.go("quiz", cfg, true); });
    var back = U.ce("button", "btn ghost wide", "🏠 الرجوع");
    back.addEventListener("click", function () { AQ.router.back(); });
    actions.appendChild(again);
    actions.appendChild(back);
    screen.appendChild(actions);
  }

  /* التسجيل كمكوّن شاشة في المسير */
  AQ.router.register("quiz", {
    render: function (view, params) { controller = boot(view, params); return controller.cleanup; },
    onBack: function () { return controller ? controller.pause() : false; }
  });

  /* تشغيل برمجي: من الامتحانات أو التحدي اليومي */
  function play(cfg) { AQ.router.go("quiz", cfg); }
  function startQuiz(cfg) { return play(cfg); }

  return { play: play, startQuiz: startQuiz, boot: boot };
})();
