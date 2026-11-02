/* عقلني — لوحة الوالدين: تقارير التقدم لكل عالم (ببوابة رقمية سريعة) */
"use strict";
window.AQ = window.AQ || {};

AQ.screens.parent = (function () {
  var U = AQ.util;

  function gate(next) {
    var st = AQ.store.state;
    var saved = st.parentPin || "";
    var pinEl = null;
    if (!saved) {
      /* أول مرة: تعيين رمز */
      AQ.ui.modal({
        icon: "🔐",
        title: "تعيين رمز سري للوالدين",
        text: "أدخل رقمًا من 4 أرقام كي لا يعرفه طفلك.",
        extra: [function (m) {
          pinEl = U.ce("input", "");
          pinEl.type = "password";
          pinEl.inputMode = "numeric";
          pinEl.maxLength = 4;
          pinEl.style.cssText = "width:100%;padding:12px;border-radius:14px;border:2px solid var(--line);text-align:center;font-size:20px;letter-spacing:8px;";
          m.appendChild(pinEl);
        }],
        buttons: [
          { label: "تعيين", style: "good", action: function () {
            var v = (pinEl.value || "").trim();
            if (!/^\d{4}$/.test(v)) { AQ.ui.toast("أدخل 4 أرقام"); return; }
            st.parentPin = v;
            AQ.store.save(true);
            AQ.ui.toast("تم تعيين الرمز 🔐");
            setTimeout(next, 150);
          } }
        ]
      });
      return;
    }
    AQ.ui.modal({
      icon: "🔐",
      title: "أدخل رمز الوالدين",
      extra: [function (m) {
        pinEl = U.ce("input", "");
        pinEl.type = "password";
        pinEl.inputMode = "numeric";
        pinEl.maxLength = 4;
        pinEl.style.cssText = "width:100%;padding:12px;border-radius:14px;border:2px solid var(--line);text-align:center;font-size:20px;letter-spacing:8px;";
        m.appendChild(pinEl);
      }],
      buttons: [
        { label: "دخول", style: "good", action: function () {
          var v = (pinEl.value || "").trim();
          if (v !== saved) { AQ.ui.toast("الرمز غير صحيح"); return; }
          setTimeout(next, 150);
        } }
      ]
    });
  }

  function dashboard(view) {
    var st = AQ.store.state;
    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("لوحة الوالدين 👨‍👩‍👧", {}));

    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    /* ملخص عام */
    var days = Math.max(1, Math.round((Date.now() - st.createdAt) / 86400000));
    var mins = Math.round((st.playSeconds || 0) / 60);
    var qTotal = 0, qRight = 0;
    Object.keys(st.stats.byCat).forEach(function (cat) {
      qTotal += st.stats.byCat[cat].asked;
      qRight += st.stats.byCat[cat].correct;
    });
    var overall = qTotal ? Math.round((qRight / qTotal) * 100) : null;

    var head = U.ce("div", "card");
    head.innerHTML = "<b>👶 " + (st.profile.name || "الطفل") + "</b>" +
      "<p class='muted'>عمر معلن: " + st.profile.age + " سنة — أيام اللعب: " + days +
      " — دقائق المشاركة: " + mins + "</p>" +
      "<p class='muted'>أسئلة مواجهة: " + qTotal + " — صحيحة: " + qRight +
      (overall === null ? "" : " (" + overall + "٪ دقة كاملة)") + "</p>";
    screen.appendChild(head);

    /* مستوى عام */
    var lvlCard = U.ce("div", "card");
    var LVL_LABEL = { beginner: "مبتدئ 🌱", elementary: "أساسي 🌟", intermediate: "متوسط 🚀", advanced: "متقدم 🏅", expert: "خبير 👑" };
    lvlCard.innerHTML = "<b>مستوى التكيف الحالي: " + (LVL_LABEL[st.level] || st.level) + "</b>" +
      "<p class='muted'>يُعدل تلقائيًا حسب أداء طفلك في التقييم والجولات (مثل سياسة LevelPolicy في التطبيق الأصلي).</p>" +
      "<p class='muted'>مستوى اللاعب (النقاط): " + st.playerLevel + " — نقاط الخبرة " + st.xp + "</p>";
    screen.appendChild(lvlCard);

    /* تقرير لكل عالم */
    var rep = U.ce("div", "card");
    rep.appendChild(U.ce("h3", "", "📊 التقدم عبر العوالم"));
    var cats = ["math", "arabic", "science", "general", "brain"];
    var names = AQ.engine.CAT_NAMES;
    cats.forEach(function (cat) {
      var s = st.stats.byCat[cat];
      var bar = U.ce("div", "");
      bar.style.marginTop = "8px";
      var label = U.ce("div", "muted", (names[cat] || cat) + ": " + (s ? (s.correct + "/" + s.asked + " (" + Math.round((s.correct / s.asked) * 100) + "٪)") : "لم يبدأ بعد"));
      var track = U.ce("div", "progress");
      track.style.maxWidth = "420px";
      var fill = U.ce("i");
      fill.style.width = s && s.asked ? Math.round((s.correct / s.asked) * 100) + "%" : "0%";
      track.appendChild(fill);
      bar.appendChild(label);
      bar.appendChild(track);
      rep.appendChild(bar);
    });
    screen.appendChild(rep);

    /* نقاط القوة والضعف */
    var weak = AQ.store.weakAreas();
    if (weak.length) {
      var weakCard = U.ce("div", "card");
      weakCard.appendChild(U.ce("h3", "", "🧭 توصيات المحرك الذكي للوالدين"));
      weak.slice(0, 3).forEach(function (w) {
        var line = U.ce("div", "muted", names[w.cat] || w.cat);
        var tag = w.acc < 0.4 ? ("⚠️ يحتاج تدريبًا أساسيًا — " + Math.round(w.acc * 100) + "٪ دقة في أقسامه")
          : (w.acc < 0.6 ? "🔍 يحتاج مزيدًا من التكرار — " + Math.round(w.acc * 100) + "٪" : "✅ يتقنه جيدًا — " + Math.round(w.acc * 100) + "٪");
        weakCard.appendChild(line);
        weakCard.appendChild(U.ce("div", "", tag));
      });
      weakCard.appendChild(U.ce("p", "muted", "نراهن على جولة في كل عالم يوميًا لثمانية أيام كي تظهر تحسنًا واضحًا."));
      screen.appendChild(weakCard);
    }

    /* نصيحة زمنية */
    var xCard = U.ce("div", "card");
    xCard.innerHTML = "<b>🕐 نصيحة بإدارة الوقت</b>" +
      "<p class='muted'>ينصح بجلسات قصيرة (20-30 دقيقة) تليها استراحة، بدلًا من الجلسات الطويلة. التحدي اليومي مصمم ليناسب ذلك.</p>";
    screen.appendChild(xCard);

    /* أدوات */
    var tools = U.ce("div", "wrap" + " stack-gap");
    var pinB = U.ce("button", "btn ghost small", "🔐 تغيير الرمز");
    pinB.addEventListener("click", function () {
      st.parentPin = "";
      AQ.store.save(true);
      AQ.ui.toast("أُلغي الرمز — أعد تعيينه من الشاشة الرئيسية");
      AQ.router.home();
    });
    var resetB = U.ce("button", "btn bad small", "🗑️ تصفير كل التقدم");
    resetB.addEventListener("click", function () {
      AQ.ui.modal({
        icon: "⚠️",
        title: "هل نبدأ من الصفر تمامًا؟",
        text: "سيُمسح كل شيء بما فيه إنجازات طفلك ورسوماته.",
        buttons: [
          { label: "إلغاء", style: "good", action: function () { } },
          { label: "نعم، صفّر", style: "bad", action: function () {
            AQ.store.hardReset("");
            AQ.ui.toast("البداية من جديد");
            AQ.router.home();
          } }
        ]
      });
    });
    var backB = U.ce("button", "btn accent small", "🏠 رجوع");
    backB.addEventListener("click", function () { AQ.router.back(); });
    tools.appendChild(backB);
    tools.appendChild(pinB);
    tools.appendChild(resetB);
    screen.appendChild(tools);
  }

  return { register: function () {
    AQ.router.register("parent", {
      render: function (view, params) { dashboard(view, params || {}); }
    });
  }, open: function () {
    gate(function () { AQ.router.go("parent", {}); });
  } };
})();
