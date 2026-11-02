/* عقلني — مكونات الواجهة: الشريط العلوي، النوافذ، التنبيهات، الاحتفالات */
"use strict";
window.AQ = window.AQ || {};

AQ.ui = (function () {
  var U = AQ.util;
  var modals = [];
  var toasts = [];

  /* ---------------- HUD (news topbar) ---------------- */
  function topbar(title, opts) {
    var bar = U.ce("div", "topbar");
    var hooker = (opts && opts.backBtn !== false) ? { btn: "\u2192", act: goBackBtn } : { btn: "", act: null };

    function goBackBtn() { AQ.router.back(); }

    if (opts && opts.backBtn !== false) {
      var b = U.ce("button", "iconbtn", hooker.btn);
      b.setAttribute("aria-label", "رجوع");
      b.addEventListener("click", hooker.act);
      bar.appendChild(b);
    }
    var t = U.ce("div", "title", title);
    t.id = "topbar-title";
    bar.appendChild(t);

    var st = AQ.store.state;
    var chipXP = U.ce("span", "chip", "✨ " + st.xp);
    chipXP.title = "نقاط الخبرة";
    chipXP.id = "chip-xp";
    var chipCoins = U.ce("span", "chip", "🪙 " + st.coins);
    chipCoins.id = "chip-coins";
    var chipLvl = U.ce("span", "chip", "🎖️ " + st.playerLevel);
    chipLvl.id = "chip-lvl";
    var chipStreak = U.ce("span", "chip", "🔥 " + st.streakDays);
    chipStreak.id = "chip-streak";
    bar.appendChild(chipXP);
    bar.appendChild(chipCoins);
    if (st.streakDays > 0) bar.appendChild(chipStreak);
    bar.appendChild(chipLvl);
    return bar;
  }

  function refreshHUD() {
    var st = AQ.store.state;
    var set = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
    set("chip-xp", "✨ " + st.xp);
    set("chip-coins", "🪙 " + st.coins);
    set("chip-lvl", "🎖️ " + st.playerLevel);
    set("chip-streak", "🔥 " + st.streakDays);
  }

  /* ---------------- modal ---------------- */
  function modal(opts) {
    var veil = U.ce("div", "modal-veil");
    var m = U.ce("div", "modal");
    if (opts.icon) m.appendChild(U.ce("div", "m-ico", opts.icon));
    if (opts.title) m.appendChild(U.ce("h3", "", opts.title));
    if (opts.text) m.appendChild(U.ce("p", "muted", opts.text));
    (opts.extra || []).forEach(function (fn) { fn(m); });
    var actions = U.ce("div", "m-actions");
    (opts.buttons || []).forEach(function (b) {
      var btn = U.ce("button", "btn " + (b.style || "primary"), (b.ico ? b.ico + " " : "") + b.label);
      btn.addEventListener("click", function () {
        /* ننفذ الإجراء أولًا ثم نغلق — إجراء قد يحتاج عناصر النافذة نفسها (مثل حقول الإدخال) */
        try { if (b.action) b.action(); } finally { close(veil); }
      });
      actions.appendChild(btn);
    });
    m.appendChild(actions);
    veil.appendChild(m);
    veil.setAttribute("role", "dialog");
    document.body.appendChild(veil);
    modals.push(veil);
    // زر الرجوع يغلق النافذة أولاً — يتعامل معها الزر الواحد
    return veil;
  }
  function close(veil) {
    var i = modals.indexOf(veil);
    if (i >= 0) modals.splice(i, 1);
    if (veil.parentNode) veil.parentNode.removeChild(veil);
  }
  function closeTop() {
    var veil = modals[modals.length - 1];
    if (veil) { close(veil); return true; }
    return false;
  }
  function anyModalOpen() { return modals.length > 0; }

  /* ---------------- toast ---------------- */
  function toast(msg, ms) {
    if (toasts.length > 2) { var old = toasts.shift(); if (old.parentNode) old.parentNode.removeChild(old); }
    var t = U.ce("div", "toast", msg);
    document.body.appendChild(t);
    toasts.push(t);
    setTimeout(function () {
      var i = toasts.indexOf(t);
      if (i >= 0) toasts.splice(i, 1);
      if (t.parentNode) t.parentNode.removeChild(t);
    }, ms || 2600);
  }

  /* ---------------- celebratory effects ---------------- */
  var COLORS = ["#FCD34D", "#F87171", "#34D399", "#60A5FA", "#A78BFA", "#F472B6"];
  function confetti(count) {
    if (AQ.store.state.settings.motion === "off" || document.body.classList.contains("nomotion")) return;
    var box = U.ce("div", "confetti");
    var n = count || 50;
    for (var i = 0; i < n; i++) {
      var p = U.ce("i", "");
      p.textContent = "";
      p.style.left = (U.rint(2, 98)) + "%";
      p.style.background = U.rand(COLORS);
      p.style.animationDuration = (U.rint(15, 28) / 10) + "s";
      p.style.animationDelay = (U.rint(0, 8) / 10) + "s";
      p.style.transform = "rotate(" + U.rint(0, 360) + "deg)";
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 3600);
  }

  function achievementPopup(id) {
    var def = AQ.store.ACHIEVEMENTS.filter(function (a) { return a.id === id; })[0];
    if (!def) return;
    if (AQ.store.state.settings.motion !== "off") confetti(20);
    modal({
      icon: def.ico,
      title: "إنجاز جديد! " + def.name,
      text: def.desc + " — +20 نقطة خبرة",
      buttons: [{ label: "خطّ شجاع", style: "good", action: function () { } }]
    });
    AQ.store.addXP(20);
  }

  function flyCoins(source) {
    if (!source) return;
    var rect = source.getBoundingClientRect();
    for (var i = 0; i < 5; i++) {
      var c = U.ce("div", "coin-fly", "🪙");
      c.style.left = (rect.left + U.rint(-16, 16)) + "px";
      c.style.top = (rect.top + U.rint(-10, 10)) + "px";
      document.body.appendChild(c);
      setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }, 850, c);
    }
  }

  function openChestSource(afterMs) {
    modal({
      icon: '\u{1F381}',
      title: "صندوق الكنز!",
      text: "الصندوق يهتز… المفاجأة تُفتح ✨",
      buttons: []
    });
    setTimeout(function () {
      if (anyModalOpen()) closeTop();
      var coinsN = U.rint(8, 30);
      AQ.store.addCoins(coinsN);
      AQ.store.chestsOpened = (AQ.store.chestsOpened || 0) + 1;
      if (AQ.store.chestsOpened >= 1) AQ.store.award("first_chest");
      if (AQ.store.chestsOpened >= 5) AQ.store.award("chest5");
      var sticker = AQ.store.stickerRandom();
      if (sticker) AQ.store.addSticker(sticker);
      AQ.audio.sfx("chest");
      refreshHUD();
      modal({
        icon: '\u{1F381}',
        title: "كنز حلو!",
        text: "حصلت على 🪙 " + coinsN + " عملة" + (sticker ? " + ستيكر جديد " + sticker : "") + "!",
        buttons: [{ label: "راك! 🎉", style: "good", action: function () { } }]
      });
      confetti(60);
    }, afterMs || 1500);
  }

  return {
    topbar: topbar, refreshHUD: refreshHUD,
    modal: modal, closeTop: closeTop, anyModalOpen: anyModalOpen, close: close,
    toast: toast, confetti: confetti, achievementPopup: achievementPopup,
    flyCoins: flyCoins, openChestSource: openChestSource
  };
})();
