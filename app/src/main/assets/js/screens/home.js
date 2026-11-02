/* عقلني — الشاشة الرئيسية: تحية + تحدي يومي + شبكة العوالم + روابط الفرز */
"use strict";
window.AQ = window.AQ || {};

AQ.screens = AQ.screens || {};

AQ.screens.home = (function () {
  var U = AQ.util;

  function worldMeta() {
    return [
      { cat: "math",      title: "عالم الرياضيات",   ico: "🔢", desc: "حساب وتسلسلات وألغاز أرقام" },
      { cat: "science",   title: "عالم العلوم",      ico: "🔬", desc: "أجسادنا، الفضاء، الطبيعة والأدوات" },
      { cat: "arabic",    title: "عالم اللغة العربية", ico: "✍️", desc: "حروف وقواعد وتهجئة وقصص" },
      { cat: "general",   title: "المعلومات العامة", ico: "🌍", desc: "أسئلة من كل ما حولنا" },
      { cat: "brain",     title: "تدريب المخ",       ico: "🧠", desc: "ذاكرة وأنماط وسرعة تفاعل" },
      { cat: "creative",  title: "العالم الإبداعي",  ico: "🎨", desc: "رسم وقصص وإيقاع" }
    ];
  }

  function render(view, params) {
    var st = AQ.store.state;
    var name = st.profile.name || "بطلنا الصغير";
    var meta = AQ.engine.CAT_NAMES;

    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("عقلني 🎒", { backBtn: false }));

    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    /* تحية */
    var greet = U.ce("div", "center");
    var av = U.ce("div", "avatar-view", st.profile.avatar || "🤖");
    greet.appendChild(av);
    greet.appendChild(U.ce("h1", "", "أهلًا " + name + "! 👋"));
    greet.appendChild(U.ce("p", "muted", "مستواك " + st.playerLevel + " — اجمع نقاط الخبرة وافتح عوالم جديدة!"));
    screen.appendChild(greet);

    /* التحدي اليومي */
    var daily = U.ce("button", "card btn-row" + (st.dailyDone ? " done" : ""));
    daily.style.cssText = "width:100%;text-align:right;display:flex;align-items:center;gap:12px;margin-top:6px;cursor:pointer;";
    var dIco = U.ce("div", "emoji", st.dailyDone ? "✅" : "🔔");
    var dTxt = U.ce("div", "");
    dTxt.appendChild(U.ce("div", "", st.dailyDone ? "تحدي اليوم مكتمل!" : "تحدي اليوم بانتظارك"));
    dTxt.appendChild(U.ce("div", "muted", st.dailyDone ? "أعدنا غدًا للتحدي الجديد 🌙" : "10 أسئلة سريعة + عملة زيادة 🪙"));
    daily.appendChild(dIco);
    daily.appendChild(dTxt);
    daily.addEventListener("click", function () {
      if (st.dailyDone) { AQ.ui.toast("عدت غدًا للتحدي الجديد 🌙"); return; }
      AQ.screens.exams.daily();
    });
    screen.appendChild(daily);

    /* شبكة العوالم */
    var unlocked = AQ.engine.unlockedWorlds();
    var grid = U.ce("div", "world-grid");
    worldMeta().forEach(function (w) {
      var isLocked = unlocked.indexOf(w.cat) === -1;
      var card = U.ce("button", "world-card" + (isLocked ? " locked" : ""));
      card.appendChild(U.ce("div", "emoji", isLocked ? "🔒" : w.ico));
      card.appendChild(U.ce("div", "", w.title));
      card.appendChild(U.ce("div", "muted", isLocked ? "يفتح عند المستوى " + (w.cat === "creative" ? 2 : 3) : w.desc));
      card.addEventListener("click", function () {
        if (isLocked) {
          AQ.ui.modal({
            icon: "🔒",
            title: "عالمان مقفلان الآن",
            text: "اكسب نقاط الخبرة في العوالم المفتوحة لتصل للمستوى المطلوب ثم عُد هنا! 🌟",
            buttons: [{ label: "حسنًا، سنحقق معًا", style: "good", action: function () { } }]
          });
          return;
        }
        AQ.router.go("world", { cat: w.cat });
      });
      grid.appendChild(card);
    });
    screen.appendChild(grid);

    /* صف السرعة: المركز + لاعبين */
    var row = U.ce("div", "spread");
    row.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;";
    var exams = U.ce("button", "world-card", "");
    exams.appendChild(U.ce("div", "emoji", "🏆"));
    exams.appendChild(U.ce("div", "", "مركز الامتحانات والتحديات"));
    exams.appendChild(U.ce("div", "muted", "امتحانات كبيرة تعطي نجومًا وقيادات"));
    exams.addEventListener("click", function () { AQ.router.go("exams", {}); });
    row.appendChild(exams);
    var versus = U.ce("button", "world-card", "");
    versus.appendChild(U.ce("div", "emoji", "⚔️"));
    versus.appendChild(U.ce("div", "", "تحدّي لاعبَين"));
    versus.appendChild(U.ce("div", "muted", "أنت واخوك أو صديق — بالتناوب على جهاز واحد"));
    versus.addEventListener("click", function () { AQ.router.go("vs", {}); });
    row.appendChild(versus);
    screen.appendChild(row);

    /* شريط سفلي: ملف + إعدادات + والدي */
    var foot = U.ce("div", "foot-links");
    foot.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;";
    var mk = function (ico, label, screenName) {
      var b = U.ce("button", "btn ghost small", ico + " " + label);
      b.addEventListener("click", function () { AQ.router.go(screenName, {}); });
      return b;
    };
    foot.appendChild(mk("🧒", "ملفي", "profile"));
    foot.appendChild(mk("⚙️", "الإعدادات", "settings"));
    var parentB = U.ce("button", "btn ghost small", "👨‍👩‍👧 لوحة الوالدين");
    parentB.addEventListener("click", function () { AQ.screens.parent.open(); });
    foot.appendChild(parentB);
    screen.appendChild(foot);

    screen.appendChild(U.ce("p", "muted center", "يعمل كاملًا دون إنترنت — التقدم محفوظ في جهازك 💜"));
  }

  function register() {
    AQ.router.register("home", {
      render: function (view, params) { render(view, params || {}); },
      onBack: function () { AQ.router.requestExit(); return true; }
    });
  }

  return { register: register, render: render };
})();
