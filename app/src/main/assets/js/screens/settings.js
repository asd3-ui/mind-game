/* عقلني — الإعدادات: الصوت والموسيقى والقراءة الصوتية والحركة والثيم */
"use strict";
window.AQ = window.AQ || {};

AQ.screens.settings = (function () {
  var U = AQ.util;

  function row(title, opts) {
    var r = U.ce("div", "card");
    r.style.cssText = "width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;";
    r.appendChild(U.ce("div", "", title));
    var sw = U.ce("label", "switch");
    var input = U.ce("input");
    input.type = "checkbox";
    input.checked = !!opts.get();
    input.addEventListener("change", function () {
      opts.set(input.checked);
      AQ.store.save(true);
      if (opts.apply) opts.apply(input.checked);
      AQ.audio.sfx("tap");
    });
    var knob = U.ce("span", "knob");
    sw.appendChild(input);
    sw.appendChild(knob);
    r.appendChild(sw);
    return r;
  }

  function render(view, params) {
    var st = AQ.store.state;
    view.innerHTML = "";
    view.appendChild(AQ.ui.topbar("الإعدادات ⚙️", {}));

    var screen = U.ce("div", "screen");
    view.appendChild(screen);

    screen.appendChild(row("🔊 المؤثرات الصوتية", {
      get: function () { return st.settings.sound; },
      set: function (v) { st.settings.sound = v; }
    }));

    screen.appendChild(row("🎵 الموسيقى الهادئة", {
      get: function () { return st.settings.music; },
      set: function (v) { st.settings.music = v; },
      apply: function () { AQ.audio.musicSync(); }
    }));

    screen.appendChild(row("🗣️ القراءة الصوتية للأسئلة", {
      get: function () { return st.settings.autoread; },
      set: function (v) { st.settings.autoread = v; }
    }));

    screen.appendChild(row("🪄 الحركات والاحتفالات", {
      get: function () { return st.settings.motion !== "off"; },
      set: function (v) { st.settings.motion = v ? "auto" : "off"; },
      apply: function (v) {
        document.body.classList.toggle("nomotion", !v);
      }
    }));

    /* ثيم الليالي والضوء */
    var themeCard = U.ce("div", "card");
    themeCard.style.cssText = "width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;";
    themeCard.appendChild(U.ce("div", "", "🌓 الوضع الليلي"));
    var themeB = U.ce("button", "btn small " + (st.settings.theme === "dark" ? "accent" : "ghost"),
      st.settings.theme === "dark" ? "تشغيل حاليًا 🌙" : "مطفأة ☀️");
    themeB.addEventListener("click", function () {
      var dark = st.settings.theme !== "dark";
      st.settings.theme = dark ? "dark" : "light";
      document.body.setAttribute("data-theme", st.settings.theme);
      themeB.textContent = dark ? "تشغيل حاليًا 🌙" : "مطفأة ☀️";
      themeB.className = "btn small " + (dark ? "accent" : "ghost");
      AQ.store.save(true);
    });
    themeCard.appendChild(themeB);
    screen.appendChild(themeCard);

    /* سرعة القراءة والنبرة */
    var voiceCard = U.ce("div", "card");
    voiceCard.appendChild(U.ce("h3", "", "🗣️ خصائص الصوت الناطق"));
    [["سرعة القراءة", "rate", 0.5, 1.4, 0.1], ["طبقة الصوت", "pitch", 0.5, 1.6, 0.1]].forEach(function (spec) {
      var row2 = U.ce("div", "range-row");
      row2.appendChild(U.ce("div", "", spec[0] + ": " + st.settings[spec[1]]));
      var input = U.ce("input");
      input.type = "range";
      input.min = String(spec[2]);
      input.max = String(spec[3]);
      input.step = String(spec[4]);
      input.value = String(st.settings[spec[1]]);
      input.style.flex = "1";
      input.addEventListener("input", function () {
        st.settings[spec[1]] = parseFloat(input.value);
        row2.children[0].textContent = spec[0] + ": " + input.value;
        AQ.store.save(true);
      });
      row2.appendChild(input);
      voiceCard.appendChild(row2);
    });
    var testB = U.ce("button", "btn small accent", "🔊 جرّب الصوت");
    testB.addEventListener("click", function () {
      AQ.voice.speak("أهلًا بك في عقلني! جاهزين لجولة رائعة؟");
    });
    voiceCard.appendChild(testB);
    screen.appendChild(voiceCard);

    /* معلومات */
    var info = U.ce("div", "card");
    var ver = "1.0.0";
    try {
      if (window.AqApp && window.AqApp.appVersion) ver = window.AqApp.appVersion();
    } catch (e) { /* بيئة ويب */ }
    info.innerHTML = "<b>عقلني</b><p class='muted'>نسخة " + ver + " — تعلّم ولعب بذكاء، بلا إنترنت." +
      "<br>مبني لطفل عربي: رياضيات، علوم، لغة، معلومات، ذهن، وإبداع.</p>";
    screen.appendChild(info);
  }

  return { register: function () {
    AQ.router.register("settings", {
      render: function (view, params) { render(view, params || {}); }
    });
  }, render: render };
})();
