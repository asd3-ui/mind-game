/* عقلني — إقلاع اللعبة: تجهيز الصوت والإعدادات وتسجيل الشاشات واختيار الشاشة الأولى */
"use strict";
window.AQ = window.AQ || {};

(function () {
  /* تسجيل الشاشات */
  AQ.screens.home.register();
  AQ.screens.world.register();
  AQ.screens.exams.register();
  AQ.screens.profile.register();
  AQ.screens.settings.register();
  AQ.screens.parent.register();
  AQ.screens.assessment.register();

  /* مزامنة الثيم والإعدادات من الحفظ */
  function applySettings() {
    var st = AQ.store.state;
    document.body.setAttribute("data-theme", st.settings.theme || "light");
    document.body.classList.toggle("nomotion", st.settings.motion === "off");
    AQ.audio.musicSync();
    /* لون الملف يغذي شعار اللعبة */
    try {
      var c = st.profile.color;
      if (c) document.body.style.setProperty("--primary", c);
    } catch (e) { /* تجاهل */ }
  }
  applySettings();

  document.addEventListener("visibilitychange", function () {
    /* عند العودة من الخلفية: نستأنف الصوت ونحفظ الحالة */
    if (!document.hidden) { AQ.audio.resume(); }
    AQ.store.save(true);
  });

  window.addEventListener("beforeunload", function () { AQ.store.save(false); });

  /* شاشة البداية: التعريف أول مرة ثم الرئيسية */
  var st = AQ.store.state;
  if (st.onboarded) {
    /* عودة لاعب: نتأكد أن العوالم تعرف على آخر مستوى */
    AQ.router.home();
  } else {
    AQ.router.go("onboard", {}, false);
  }

  /* مصافحة الجسر الأصلية في أندرويد */
  window.__aqReady = function (version) {
    try {
      window.__aqVersion = version || "؟";
    } catch (e) { /* noop */ }
    AQ.audio.musicSync();
  };
})();
