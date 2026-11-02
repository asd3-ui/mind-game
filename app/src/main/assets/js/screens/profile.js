/* عقلني — الملف الشخصي: الصورة الرمزية، الإنجازات، الستيكرات، معرض الرسومات */
"use strict";
window.AQ = window.AQ || {};

AQ.screens.profile = (function () {
  var U = AQ.util;

  var AVATARS = ["🤖", "🦊", "🐼", "🦄", "🐯", "🐙", "🚀", "🧠", "🦖", "🐝"];
  var COLORS = ["#7C3AED", "#2563EB", "#059669", "#DC2626", "#F59E0B", "#DB2777", "#0891B2"];
  var HATS = ["", "👗", "👔", "🧢", "👑", "🎩"];

  function render(view, params) {
    var st = AQ.store.state;
    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("ملفي 🧒", {}));

    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    /* التمثال: صورة + اسم قابل للتعديل */
    var hero = U.ce("div", "card center");
    var av = U.ce("div", "avatar-view", st.profile.avatar);
    hero.appendChild(av);
    var nameRow = U.ce("div", "row");
    var nameInput = U.ce("input", "");
    nameInput.type = "text";
    nameInput.value = st.profile.name || "";
    nameInput.placeholder = "اكتب اسمك هنا";
    nameInput.maxLength = 14;
    nameInput.style.cssText = "flex:1;padding:12px;border-radius:14px;border:2px solid var(--line);font-size:16px;";
    var saveB = U.ce("button", "btn small accent", "حفظ");
    saveB.addEventListener("click", function () {
      st.profile.name = nameInput.value.trim();
      AQ.store.save(true);
      AQ.ui.toast("حفظنا اسمك يا " + (st.profile.name || "بطل") + " 🎉");
    });
    nameRow.appendChild(nameInput);
    nameRow.appendChild(saveB);
    hero.appendChild(nameRow);
    screen.appendChild(hero);

    /* مختصر الإنجاز */
    var summary = U.ce("div", "stat-row");
    [["المستوى", String(st.playerLevel)], ["الخبرة", String(st.xp)], ["العملات", String(st.coins)]].forEach(function (r) {
      var box = U.ce("div", "stat-box");
      box.appendChild(U.ce("b", "", r[1]));
      box.appendChild(U.ce("span", "", r[0]));
      summary.appendChild(box);
    });
    screen.appendChild(summary);
    var progBox = U.ce("div", "muted center", "للوصول إلى المستوى " + (st.playerLevel + 1) + ": " +
      Math.max(0, AQ.store.xpForLevel(st.playerLevel + 1) - st.xp) + " نقطة خبرة");
    screen.appendChild(progBox);

    /* تخصيص التمثال */
    var avCard = U.ce("div", "card");
    avCard.appendChild(U.ce("h3", "", "🎨 غيّر صورتك وشعارك"));

    var avRow = U.ce("div", "badge-grid");
    AVATARS.forEach(function (a) {
      var b = U.ce("button", "badge", a);
      if (a === st.profile.avatar) b.style.borderColor = "var(--primary)";
      b.style.fontSize = "26px";
      b.addEventListener("click", function () {
        st.profile.avatar = a;
        av.textContent = a;
        AQ.store.save(true);
        AQ.audio.sfx("pop");
      });
      avRow.appendChild(b);
    });
    avCard.appendChild(avRow);

    var colorRow = U.ce("div", "dcolors");
    COLORS.forEach(function (c) {
      var b = U.ce("button", "dcolor" + (c === st.profile.color ? " sel" : ""));
      b.style.background = c;
      b.addEventListener("click", function () {
        Array.prototype.slice.call(colorRow.children).forEach(function (el) { el.classList.remove("sel"); });
        b.classList.add("sel");
        st.profile.color = c;
        document.body.style.setProperty("--primary", c); /* لمسة لونية للملف */
        AQ.store.save(true);
      });
      colorRow.appendChild(b);
    });
    avCard.appendChild(colorRow);
    screen.appendChild(avCard);

    /* الإنجازات */
    var achCard = U.ce("div", "card");
    achCard.appendChild(U.ce("h3", "", "🏅 إنجازاتي (" +
      Object.keys(st.achievements).length + "/" + AQ.store.ACHIEVEMENTS.length + ")"));
    var grid = U.ce("div", "badge-grid");
    AQ.store.ACHIEVEMENTS.forEach(function (a) {
      var won = !!st.achievements[a.id];
      var b = U.ce("div", "badge" + (won ? " won" : ""));
      b.style.cursor = "pointer";
      b.appendChild(U.ce("div", "emoji", won ? a.ico : "🔒"));
      b.appendChild(U.ce("div", "", won ? a.name : "مقفل"));
      b.appendChild(U.ce("div", "muted", a.desc));
      b.addEventListener("click", function () {
        AQ.ui.modal({
          icon: won ? a.ico : "🔒",
          title: a.name,
          text: a.desc + (won ? " — فزت به في " + String(st.achievements[a.id]).slice(0, 10) : " — أكمل تحديه لتحصل عليه"),
          buttons: [{ label: "رائع ✨", style: "good", action: function () { } }]
        });
      });
      grid.appendChild(b);
    });
    achCard.appendChild(grid);
    screen.appendChild(achCard);

    /* الستيكرات */
    var stCard = U.ce("div", "card");
    stCard.appendChild(U.ce("h3", "", "🧳 ألبوم الستيكرات (" + st.stickers.length + ")"));
    var stGrid = U.ce("div", "badge-grid");
    if (!st.stickers.length) stGrid.appendChild(U.ce("p", "muted", "جمع الستيكرات من صناديق الكنوز والانتصارات! 🎁"));
    st.stickers.forEach(function (s) {
      var b = U.ce("div", "badge", s);
      b.style.fontSize = "28px";
      stGrid.appendChild(b);
    });
    stCard.appendChild(stGrid);
    screen.appendChild(stCard);

    /* معرض الرسومات */
    var galCard = U.ce("div", "card");
    galCard.appendChild(U.ce("h3", "", "🖼️ معرض رسوماتي (" + st.gallery.length + ")"));
    if (!st.gallery.length) galCard.appendChild(U.ce("p", "muted", "ارسم من العالم الإبداعي واضغط حفظ كي تظهر هنا"));
    else {
      var gal = U.ce("div", "badge-grid");
      st.gallery.slice().reverse().forEach(function (item, i) {
        var img = U.ce("img", "");
        img.src = item.d;
        img.style.cssText = "width:100%;border-radius:14px;border:2px solid var(--line);cursor:pointer;";
        img.addEventListener("click", function () {
          AQ.ui.modal({
            icon: "🖼️",
            title: "لوحتك الجميلة",
            extra: [function (m) {
              var big = U.ce("img", "");
              big.src = item.d;
              big.style.cssText = "width:100%;border-radius:12px;";
              m.appendChild(big);
            }],
            buttons: [
              { label: "🗑️ احذف", style: "bad", action: function () {
                var idx = st.gallery.indexOf(item);
                if (idx >= 0) st.gallery.splice(idx, 1);
                AQ.store.save(true);
                AQ.router.go("profile", {}, true);
              } },
              { label: "حسنًا", style: "good", action: function () { } }
            ]
          });
        });
        gal.appendChild(img);
      });
      galCard.appendChild(gal);
    }
    screen.appendChild(galCard);

    /* زر إعادة الضبط (مع تأكيد) */
    var danger = U.ce("button", "btn ghost small", "🔗 صفّر تقدمي (حذر!)");
    danger.addEventListener("click", function () {
      AQ.ui.modal({
        icon: "⚠️",
        title: "هل تريد إعادة التقدم من الصفر؟",
        text: "ستُمسح النقاط والإنجاز والصور. لا رجوع بعد الحذف.",
        buttons: [
          { label: "لا، أبقِ تقدمي", style: "good", action: function () { } },
          { label: "نعم، صفّر", style: "bad", action: function () {
            AQ.store.hardReset(st.profile.name);
            AQ.ui.toast("بدأنا من جديد — رحلة جديدة! 🚀");
            AQ.router.home();
          } }
        ]
      });
    });
    screen.appendChild(danger);
  }

  return { register: function () {
    AQ.router.register("profile", {
      render: function (view, params) { render(view, params || {}); }
    });
  }, render: render };
})();
