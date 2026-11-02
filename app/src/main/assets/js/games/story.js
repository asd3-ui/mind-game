/* عقلني — مولّد القصص: يبني الطفل قصته بنفسه ثم نقرأها له بصوت مسموع */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;

  var ctl = null;

  function boot(view, params) {
    var story = AQ.content.story;
    /* على الأقل 3 خيارات لكل جزء: نمدّ الخيارات الأولية ببديل عائم من المستوى */
    var steps = [
      { key: "hero", label: "من بطل قصتك؟", opts: story.hero, icon: "🦸" },
      { key: "place", label: "أين تجري القصة؟", opts: story.place, icon: "🗺️" },
      { key: "event", label: "ما الذي حدث فيها؟", opts: story.event, icon: "🌪️" },
      { key: "ending", label: "كيف نجح البطل؟", opts: story.ending, icon: "🌟" }
    ];
    var stepIdx = 0;
    var picks = [];
    var finished = false;

    var F = AQ.gz.frame("مغامرات القصة 📖", {});
    var screen = F.screen;

    var stepTitle = U.ce("h2", "", "");
    stepTitle.style.textAlign = "center";
    screen.appendChild(stepTitle);

    var optsBox = U.ce("div");
    optsBox.style.cssText = "display:grid;gap:10px;margin-top:14px;";
    screen.appendChild(optsBox);

    function showStep() {
      var step = steps[stepIdx];
      stepTitle.textContent = step.icon + " " + step.label;
      optsBox.innerHTML = "";
      step.opts.forEach(function (opt) {
        var b = U.ce("button", "btn ghost wide", step.icon + " " + opt);
        b.addEventListener("click", function () {
          AQ.audio.sfx("tap");
          picks.push(opt);
          stepIdx++;
          if (stepIdx >= steps.length) compose();
          else showStep();
        });
        optsBox.appendChild(b);
      });
    }

    function compose() {
      var text = picks[0] + " خرج يومًا إلى " + picks[1] + " وحصلت له مفاجأة: " + picks[2] +
        " — لم يتوقف عند أول عقبة، بل حاول وحاول مجددًا، وفي النهاية " + picks[3] + ". 🎉";
      screen.innerHTML = "";
      var card = U.ce("div", "card");
      var t = U.ce("h3", "", "📖 قصتك:" + " «" + picks[0] + "»");
      card.appendChild(t);
      var body = U.ce("div", "");
      body.style.cssText = "font-size:19px;line-height:1.8;";
      body.textContent = text;
      card.appendChild(body);
      screen.appendChild(card);

      /* أزرار */
      var actions = U.ce("div", "m-actions");
      var read = U.ce("button", "btn accent wide", "🔊 اقرأ لي القصة");
      read.addEventListener("click", function () {
        AQ.voice.speak(text);
        AQ.ui.toast("استمع جيدًا 🎧");
      });
      var stopB = U.ce("button", "btn ghost wide", "⏹ توقف عن القراءة");
      stopB.addEventListener("click", function () { AQ.voice.stop(); });
      var again = U.ce("button", "btn good wide", "💡 قصة جديدة");
      again.addEventListener("click", function () { AQ.router.go("story", params, true); });
      var back = U.ce("button", "btn ghost wide", "🏠 الرجوع");
      back.addEventListener("click", function () { AQ.router.back(); });
      actions.appendChild(read);
      actions.appendChild(stopB);
      actions.appendChild(again);
      actions.appendChild(back);
      screen.appendChild(actions);

      /* مكافأة القصة الأولى ثم كل قصة جديدة */
      AQ.store.addXP(12);
      AQ.store.addCoins(4);
      AQ.ui.refreshHUD();
      if (Math.random() < 0.4) {
        var sticker = AQ.store.stickerRandom();
        if (sticker) { AQ.store.addSticker(sticker); AQ.ui.toast("ستيكر جديد " + sticker + " 🎁"); }
      }
      AQ.audio.sfx("win");
      AQ.ui.confetti(35);
      /* اقترح الاستماع تلقائيًا إن كان القراءة الصوتية مفعلة */
      if (AQ.store.state.settings.autoread) setTimeout(function () { AQ.voice.speak(text); }, 700);
    }

    var controller = {
      pause: function () {
        if (finished) return false;
        /* في القصة: الاستراحة هي التنقل السابق */
        AQ.ui.modal({
          icon: "⏸",
          title: "استراحة قصيرة!",
          text: "تقدر تكمل قصتك وقت ما تريد 🌟",
          buttons: [
            { label: "متابعة اللعب", ico: "▶️", style: "good", action: function () { } },
            { label: "قصة جديدة", ico: "🔄", style: "accent", action: function () { AQ.router.go("story", params, true); } },
            { label: "الرجوع", ico: "🏠", style: "ghost", action: function () { AQ.router.back(); } }
          ]
        });
        return true;
      },
      cleanup: function () { AQ.voice.stop(); }
    };
    ctl = controller;

    showStep();
    return controller;
  }

  AQ.router.register("story", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
