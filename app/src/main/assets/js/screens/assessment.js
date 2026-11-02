/* عقلني — مرحلة التقييم: تعريف سريع (اسم وعمر وصورة) + اختبار تحديد المستوى (12 سؤالًا) */
"use strict";
window.AQ = window.AQ || {};

AQ.screens.assessment = (function () {
  var U = AQ.util;

  var AVATARS = ["🤖", "🦊", "🐼", "🦄", "🐯", "🐙"];
  var AGES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  function welcome(view) {
    var st = AQ.store.state;
    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("أهلًا بك في عقلني 🎒", { backBtn: false }));

    var screen = U.ce("div", "screen onboard");
    view.appendChild(screen);

    screen.appendChild(U.ce("div", "avatar-view", "🤖"));
    screen.appendChild(U.ce("h2", "", "هيّا نتعرف عليك 😊"));
    screen.appendChild(U.ce("p", "muted", "ما اسمك؟ كم سنة عمرك؟ واختر صورة تعبر عنك!"));

    var nameInput = U.ce("input", "");
    nameInput.type = "text";
    nameInput.placeholder = "اسمك";
    nameInput.maxLength = 14;
    nameInput.style.cssText = "width:100%;padding:14px;border-radius:16px;border:2px solid var(--line);font-size:18px;text-align:center;";
    screen.appendChild(nameInput);

    screen.appendChild(U.ce("h3", "", "عمرك؟"));
    var ageGrid = U.ce("div", "age-grid");
    var pickedAge = st.profile.age || 8;
    AGES.forEach(function (a) {
      var b = U.ce("button", "agesel" + (a === pickedAge ? " sel" : ""), String(a));
      b.addEventListener("click", function () {
        Array.prototype.slice.call(ageGrid.children).forEach(function (el) { el.classList.remove("sel"); });
        b.classList.add("sel");
        pickedAge = a;
        AQ.audio.sfx("tap");
      });
      ageGrid.appendChild(b);
    });
    screen.appendChild(ageGrid);

    screen.appendChild(U.ce("h3", "", "اختر صورتك"));
    var avRow = U.ce("div", "badge-grid");
    var picked = st.profile.avatar || "🤖";
    AVATARS.forEach(function (a) {
      var b = U.ce("button", "badge" + (a === picked ? " won" : ""), a);
      b.style.fontSize = "28px";
      b.addEventListener("click", function () {
        Array.prototype.slice.call(avRow.children).forEach(function (el) { el.classList.remove("won"); });
        b.classList.add("won");
        picked = a;
        AQ.audio.sfx("pop");
      });
      avRow.appendChild(b);
    });
    screen.appendChild(avRow);

    var start = U.ce("button", "btn accent wide", "🚀 نبدأ تقييم المستوى!");
    start.addEventListener("click", function () {
      st.profile.name = (nameInput.value || "").trim().slice(0, 14);
      st.profile.age = pickedAge;
      st.profile.avatar = picked;
      AQ.store.save(true);
      quizStage();
    });
    screen.appendChild(start);
    screen.appendChild(U.ce("p", "muted center", "نجيب معًا على 12 سؤالًا فقط، كي يبدأ اللعب على مستواك الصحيح."));
  }

  function quizStage() {
    var used = [];
    var i = 0;
    var correct = 0;
    var picked = null;

    function qList() { return AQ.engine.assessmentList(); }
    var qs = qList();

    var F = AQ.gz.frame("تقييم المستوى 🧭", {});
    var screen = F.screen;
    var view = document.getElementById("app");
    var dimBox = U.ce("div", "muted", "السؤال 1 من " + qs.length);
    screen.appendChild(dimBox);
    var prog = U.ce("div", "progress");
    var fill = U.ce("i");
    fill.style.width = "0%";
    prog.appendChild(fill);
    screen.appendChild(prog);

    var card = U.ce("div", "card q-card");
    var qEmoji = U.ce("div", "emoji", "🧭");
    var qText = U.ce("div", "qtext", "");
    card.appendChild(qEmoji);
    card.appendChild(qText);
    screen.appendChild(card);

    var optsBox = U.ce("div", "options");
    screen.appendChild(optsBox);

    function showIdx() {
      var q = qs[i];
      dimBox.textContent = "السؤال " + (i + 1) + " من " + qs.length;
      fill.style.width = Math.round((i / qs.length) * 100) + "%";
      qEmoji.textContent = q.e || "🧭";
      qText.innerHTML = q.q;
      optsBox.innerHTML = "";
      used.push(q.id);
      U.shuffle(q.o.map(function (o, idx) { return { t: o, correct: idx === q.a }; }))
        .forEach(function (opt) {
          var b = U.ce("button", "opt", opt.t);
          b.addEventListener("click", function () {
            if (picked) return;
            picked = opt.correct;
            Array.prototype.slice.call(optsBox.querySelectorAll(".opt")).forEach(function (el2) {
              if (el2.textContent === q.o[q.a]) el2.classList.add("correct");
              else if (el2 === b && !picked) el2.classList.add("wrong");
              else el2.classList.add("dim");
            });
            if (!opt.correct) {
              b.classList.add("wrong");
              AQ.audio.sfx("wrong");
            } else {
              correct++;
              AQ.audio.sfx("correct");
            }
            setTimeout(function () {
              picked = null;
              i++;
              if (i < qs.length) showIdx();
              else finalize();
            }, 800);
          });
          optsBox.appendChild(b);
        });
      /* قراءة تلقائية خفيفة */
      if (AQ.voice.available() !== "none") {
        var tmp = document.createElement("div");
        tmp.innerHTML = q.q;
        AQ.voice.speak((tmp.textContent || "") + " الخيارات: " + q.o.join(", "));
      }
    }

    function finalize() {
      var ratio = correct / Math.max(1, used.length);
      var st2 = AQ.store.state;
      /* نفس سياسة LevelPolicy في أندرويد — تقييم كامل بلا خطأ = خبير */
      var lvlKey = "beginner";
      if (ratio >= 1) lvlKey = "expert";
      else if (ratio >= 0.9) lvlKey = "advanced";
      else if (ratio >= 0.75) lvlKey = "expert";
      else if (ratio >= 0.6) lvlKey = "intermediate";
      else if (ratio >= 0.4) lvlKey = "elementary";
      st2.level = lvlKey;
      st2.assessed = true;
      st2.onboarded = true;
      AQ.store.save(false);

      var LVL = {
        beginner: ["🌱", "مستوى مبتدئ", "سنبدأ خطوات أولى سهلة ونرتفع معك"],
        elementary: ["🌟", "مستوى أساسي", "أساس جيد — عوالم متنوعة بانتظارك"],
        intermediate: ["🚀", "مستوى متوسط", "أنت بارع — سنجعلها أعمق وأمتع"],
        advanced: ["🏅", "مستوى متقدم", "أداء عالٍ — تحديات كبيرة قادمة"],
        expert: ["👑", "مستوى خبير", "مذهل! على بنك ألغاز للبراعة"]
      };
      var L = LVL[lvlKey];
      var s = AQ.gz.result({
        emoji: L[0],
        title: "حددنا مستواك: " + L[1],
        score: correct + "/" + used.length + " ✓",
        note: L[2] + " — يكفي التقييم مرة واحدة، ويتكيف اللعب لاحقًا تلقائيًا.",
        stats: [["الأجوبة الصحيحة", String(correct)], ["من", String(used.length)]]
      });
      AQ.ui.confetti(50);
      var go = U.ce("button", "btn accent wide", "🎮 إلى العالم!");
      go.addEventListener("click", function () { AQ.router.home(); });
      s.appendChild(go);
    }

    showIdx();
  }

  function register() {
    AQ.router.register("onboard", {
      render: function (view, params) { welcome(view, params || {}); }
    });
    AQ.router.register("assess", {
      render: function (view, params) { quizStage(); },
      onBack: function () { return false; } /* التقييم يجري بلا إيقاف */
    });
  }

  return { register: register, quizStage: quizStage, welcome: welcome, _run: quizStage };
})();
