/* عقلني — المسير (Router): إدارة الشاشات ومكدس الرجوع وزر الهاتف الراجع */
"use strict";
window.AQ = window.AQ || {};

AQ.router = (function () {
  var U = AQ.util;
  var stack = []; // [{name, params}]
  var screens = {};
  var exiting = false;
  var currentCleaner = null;

  function register(name, def) { screens[name] = def; }

  function render() {
    var view = document.getElementById("app");
    if (!view) return;
    var ctx = stack[stack.length - 1];
    if (!ctx) return;
    var def = screens[ctx.name];
    if (!def) { AQ.ui.toast("شاشة غير متوافرة"); return; }
    if (typeof currentCleaner === "function") {
      try { currentCleaner(); } catch (e) { /* ignore */ }
      currentCleaner = null;
    }
    AQ.voice.stop();
    view.innerHTML = "";
    try {
      currentCleaner = def.render(view, ctx.params || {}) || null;
    } catch (err) {
      console.error("Screen error:", ctx.name, err);
      view.innerHTML = "";
      var errCard = U.ce("div", "card");
      errCard.innerHTML = "<b>هناك خلل بسيط 😅</b><p class='muted'>أعد المحاولة أو ارجع للشاشة السابقة.</p>";
      view.appendChild(errCard);
      AQ.ui.toast("حدث خطأ غير متوقع، جرّب مرة أخرى");
    }
    if (AQ.store.state.settings.motion === "off") document.body.classList.add("nomotion");
    else document.body.classList.remove("nomotion");
  }

  function go(name, params, replace) {
    var def = screens[name];
    if (!def) return;
    if (def.locked && def.locked()) { def.onLockedClick && def.onLockedClick(); return; }
    if (replace) stack.pop();
    stack.push({ name: name, params: params || {} });
    render();
  }

  function back() {
    if (stack.length <= 1) { requestExit(); return; }
    stack.pop();
    render();
  }

  function home() {
    stack = [{ name: "home", params: {} }];
    render();
  }

  /* ---------- exit confirmation dialog (Arabic, requirements-exact) ---------- */
  function requestExit() {
    exiting = true; // prevents re-entry loops
    var veil = AQ.ui.modal({
      icon: "🤖",
      title: "هل تريد الخروج من اللعبة أو مواصلة اللعب؟",
      text: "مستند نجاحك محفوظ بالكامل ولن يضيع الإخفاء ✨",
      buttons: [
        {
          label: "الخروج من اللعبة",
          ico: "🚪",
          style: "bad",
          action: function () {
            AQ.store.save(false);
            var finish = function () {
              if (typeof window.AqApp !== "undefined" && window.AqApp.exitApp) {
                try { window.AqApp.exitApp(); } catch (e) { /* ignore */ }
              } else if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
              } else {
                // بيئة الويب/المتصفح: أغلق النشطة بأفضل تصرف
                try { window.close(); } catch (e2) { AQ.ui.toast("يمكنك إغلاق التطبيق من شريط الهاتف"); }
              }
            };
            finish();
          }
        },
        {
          label: "متابعة اللعب",
          ico: "🎮",
          style: "good",
          action: function () { exiting = false; }
        }
      ]
    });
    veil.addEventListener("click", function (ev) {
      if (ev.target === veil) { exiting = false; }
    });
  }

  /* ---------- back consumed by the Android system key ---------- */
  function hardwareBack() {
    if (AQ.ui.closeTop()) return true;       // 1) close any open dialog first
    var ctx = stack[stack.length - 1];
    if (!ctx) { requestExit(); return true; }
    var def = screens[ctx.name];
    if (def && def.onBack && def.onBack()) return true; // 2) game wants pause-handler
    if (stack.length > 1) { back(); return true; }       // 3) navigate to parent screen
    requestExit();                                        // 4) home menu -> exit dialog
    return true;
  }

  window.__handleBack = function () {
    try { return hardwareBack() ? "true" : "false"; }
    catch (e) { return "false"; }
  };

  return { register: register, go: go, back: back, home: home, render: render,
           requestExit: requestExit, hardwareBack: hardwareBack, size: function () { return stack.length; } };
})();
