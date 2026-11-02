/* عقلني — شاشة العالم: كل عالم يعرض أنشطته (اختبار تكيفي + ألعاب موجهة) */
"use strict";
window.AQ = window.AQ || {};

AQ.screens.world = (function () {
  var U = AQ.util;

  /* الأنشطة المتاحة لكل عالم */
  var ACTS = {
    math: [
      { kind: "quiz",   label: "أسألني 10 أسئلة", ico: "❓", note: "أسئلة تتكيف مع مستواك تلقائيًا" },
      { kind: "race",   label: "سباق الحساب 🏁", ico: "🏁", note: "60 ثانية — وصل 12 جوابًا صحيحًا" },
      { kind: "seq",    label: "ترتيب وتسلسل", ico: "🔢", note: "رتب الأعداد والأحرف بالتسلسل" }
    ],
    science: [
      { kind: "quiz",   label: "أسألني 10 أسئلة", ico: "❓", note: "الفضاء والجسم والطبيعة" }
    ],
    arabic: [
      { kind: "quiz",     label: "أسألني 10 أسئلة", ico: "❓", note: "قواعد وهجاء وقراءة" },
      { kind: "spelling", label: "تهجئة الكلمات ✍️", ico: "🔤", note: "كوّن الكلمة من حروف البنك" },
      { kind: "story",    label: "مولّد القصص 📖", ico: "📖", note: "ابن قصتك ثم أقرأها لك" }
    ],
    general: [
      { kind: "quiz",   label: "أسألني 10 أسئلة", ico: "❓", note: "عالمنا وأعلامه وتقنياته" },
      { kind: "pairs",  label: "مطابقة الأزواج 🧩", ico: "🐾", note: "صل الصورة بالكلمة" },
      { kind: "memory", label: "لعبة الذاكرة 🧠", ico: "🃏", note: "اقلب وابحث عن الأزواج" }
    ],
    brain: [
      { kind: "quiz",     label: "ألغاز 10", ico: "❓", note: "ألغاز ومنطق بأسلوب عجيب" },
      { kind: "simon",    label: "سلسلة الألوان 🎨", ico: "🔦", note: "كرر تسلسل الأضواء والنغمات" },
      { kind: "reaction", label: "برق التفاعل ⚡", ico: "⚡", note: "5 جولات سرعة من 600 مللي" },
      { kind: "memory",   label: "لعبة الذاكرة 🧠", ico: "🃏", note: "قلب البطاقات وابحث" }
    ],
    creative: [
      { kind: "draw",   label: "سبورة الألوان 🎨", ico: "🖍️", note: "رسم حر بألوان وأحجام فرش" },
      { kind: "story",  label: "مولّد القصص 📖", ico: "📖", note: "ابن قصتك ثم استمع إليها" },
      { kind: "rhythm", label: "مطرقة الإيقاع 🥁", ico: "🥁", note: "اضغط مع تساقط النوتات" },
      { kind: "seq",    label: "ترتيب وتسلسل 🔢", ico: "🔤", note: "رتّب الأحرف والأعداد" }
    ]
  };

  function launch(act, cat) {
    var st = AQ.store.state;
    if (act.kind === "quiz") {
      /* بنك عشوائي من 10 أسئلة من كل هذا العالم */
      var qs = [];
      var guard = 0;
      while (qs.length < 10 && guard++ < 60) {
        var q = AQ.engine.pick(cat, {});
        if (q && !qs.some(function (x) { return x.id === q.id; })) qs.push(q);
      }
      if (!qs.length) { AQ.ui.toast("بنك الأسئلة أقصر من 10 — سنجدك الأسئلة المتاحة فقط"); }
      var time = st.level === "advanced" || st.level === "expert" ? 25 : 35;
      AQ.router.go("quiz", {
        title: (AQ.engine.CAT_NAMES[cat] || cat) + " — جولة",
        questions: qs,
        timePerQ: time,
        icon: globeIcon(cat),
        treat: "world",
        replay: null
      });
      return;
    }
    AQ.router.go(act.kind, { cat: cat });
  }

  function globeIcon(cat) {
    return { math: "🔢", science: "🔬", arabic: "✍️", general: "🌍", brain: "🧠", creative: "🎨" }[cat] || "🎮";
  }

  function render(view, params) {
    var cat = params.cat || "math";
    var name = AQ.engine.CAT_NAMES[cat] || cat;
    var stat = AQ.store.state.stats.byCat[cat];

    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar(name, {}));

    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    /* رأس: إيموجي + إنجاز عالم */
    var hero = U.ce("div", "center");
    hero.appendChild(U.ce("div", "big", globeIcon(cat)));
    var accTxt = "لم نبدأ هذا العالم بعد — جرّب أول جولة!";
    if (stat && stat.asked >= 3) {
      var pct = Math.round((stat.correct / stat.asked) * 100);
      accTxt = "دقتك في " + name + ": " + pct + "٪ من " + stat.asked + " سؤالًا.";
      if (pct >= 85) accTxt += " ممتاز! 👏";
      else if (pct < 45) accTxt += " سنحسنها معًا 💪";
    }
    hero.appendChild(U.ce("p", "muted", accTxt));
    screen.appendChild(hero);

    /* بطاقات الأنشطة */
    (ACTS[cat] || ACTS.math).forEach(function (act) {
      var b = U.ce("button", "card btn-row");
      b.style.cssText = "width:100%;text-align:right;display:flex;align-items:center;gap:12px;margin-top:10px;cursor:pointer;";
      b.appendChild(U.ce("div", "emoji", act.ico));
      var t = U.ce("div", "");
      t.appendChild(U.ce("div", "", act.label));
      t.appendChild(U.ce("div", "muted", act.note));
      b.appendChild(t);
      b.addEventListener("click", function () { launch(act, cat); });
      screen.appendChild(b);
    });

    /* شرح كيف يعمل التكيّف */
    var note = U.ce("div", "card");
    note.innerHTML = "<b>🤖 كيف يتكيف معك؟</b><p class='muted'>نراقب دقتك: إن كان كل شيء سهلًا نرفع صعوبة السؤال بدرجة، وإن تعثرت نلطفه. جرب الآن!</p>";
    screen.appendChild(note);
  }

  return { register: function () {
    AQ.router.register("world", {
      render: function (view, params) { render(view, params || { cat: "math" }); }
    });
  }, render: render };
})();
