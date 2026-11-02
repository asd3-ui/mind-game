/* عقلني — الصوت: مؤثرات (WebAudio)، موسيقى خلفية، والصوت الناطق العربي */
"use strict";
window.AQ = window.AQ || {};

AQ.audio = (function () {
  var ctx = null;
  var musicOn = false;
  var musicTimer = null;
  var nextNote = 0;
  var step = 0;

  function ensureCtx() {
    if (ctx) { if (ctx.state === "suspended") resume(); return ctx; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      resume();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }

  document.addEventListener("pointerdown", function () { ensureCtx(); }, { passive: true });

  function settings() { return AQ.store.state.settings; }
  function sfxAllowed() { return settings().sound && ctx; }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!sfxAllowed()) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, when + dur);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(vol || 0.15, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + dur + 0.05);
    } catch (e) { /* audio unavailable */ }
  }

  var sfxLib = {
    tap: function (t) { tone(660, 0.08, "triangle", 0.12, t); },
    correct: function (t) { tone(660, 0.12, "sine", 0.16, t); tone(880, 0.16, "sine", 0.16, t + 0.09); tone(1320, 0.2, "sine", 0.14, t + 0.18); },
    wrong: function (t) { tone(240, 0.2, "sawtooth", 0.1, t, 150); },
    coin: function (t) { tone(1200, 0.09, "square", 0.1, t); tone(1600, 0.12, "square", 0.1, t + 0.08); },
    win: function (t) { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.18, "triangle", 0.15, t + i * 0.11); }); },
    fail: function (t) { tone(320, 0.25, "sine", 0.13, t, 260); tone(260, 0.3, "sine", 0.11, t + 0.2, 180); },
    flip: function (t) { tone(500, 0.06, "square", 0.08, t, 700); },
    tick: function (t) { tone(880, 0.05, "square", 0.07, t); },
    pop: function (t) { tone(900, 0.07, "sine", 0.12, t, 1400); },
    chest: function (t) { tone(523, 0.14, "triangle", 0.14, t); tone(784, 0.14, "triangle", 0.14, t + 0.12); tone(1046, 0.22, "triangle", 0.15, t + 0.24); tone(1318, 0.3, "triangle", 0.15, t + 0.38); }
  };

  function sfx(name) {
    var ctxOk = ensureCtx();
    if (!ctxOk || !settings().sound) return;
    var fn = sfxLib[name];
    if (fn) fn(ctx.currentTime);
  }

  /* نغمة حرة (تُستعمل في الألعاب الموسيقية: سايمون، الإيقاع) */
  function note(hz, dur) {
    var c = ensureCtx();
    if (!c || !settings().sound) return;
    tone(hz, dur || 0.22, "sine", 0.16, c.currentTime);
  }

  /* -------- background music: gentle pentatonic loop, very low volume -------- */
  var melody = [0, 4, 7, 12, 7, 4, 0, -5, 0, 5, 9, 5, 0, -3, 0, 2]; // semitone offsets from C4
  var baseHz = 262;
  function scheduleMusic() {
    while (nextNote < ctx.currentTime + 0.35) {
      var semi = melody[step % melody.length];
      var hz = baseHz * Math.pow(2, semi / 12);
      tone(hz, 0.34, "sine", 0.05, nextNote);
      if (step % 4 === 0) tone(hz / 2, 0.42, "sine", 0.045, nextNote);
      nextNote += 0.42;
      step++;
    }
    musicTimer = setTimeout(scheduleMusic, 160);
  }
  function musicAllowed() { return settings().music; }
  function musicSync() {
    var want = musicAllowed();
    if (want && !musicOn) { ensureCtx(); if (!ctx) return; musicOn = true; nextNote = ctx.currentTime + 0.1; scheduleMusic(); }
    if (!want && musicOn) { musicOn = false; if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; } }
  }

  return { sfx: sfx, note: note, ensureCtx: ensureCtx, musicSync: musicSync, resume: resume };
})();

/* ---------- الصوت الناطق (TTS) — محرك أندرويد أولاً ثم الوِب ---------- */
AQ.voice = (function () {
  var mode = "none"; // "android" | "web" | "none"
  var webReady = ("speechSynthesis" in window);

  function tryNative() {
    return typeof window.AqApp !== "undefined" && window.AqApp && typeof window.AqApp.ttsSpeak === "function";
  }

  function speak(text, opts) {
    if (!text || !AQ.store.state.settings.voice) return;
    var s = AQ.store.state.settings;
    if (tryNative()) {
      mode = "android";
      try { window.AqApp.ttsSpeak(String(text), s.rate, s.pitch); } catch (e) { /* ignore */ }
      return;
    }
    if (!webReady) return;
    mode = "web";
    try {
      var synth = window.speechSynthesis;
      synth.cancel();
      var utt = new SpeechSynthesisUtterance(String(text));
      utt.lang = "ar-SA";
      utt.rate = s.rate;
      utt.pitch = s.pitch;
      var voices = synth.getVoices() || [];
      var arVoice = null;
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.indexOf("ar") === 0) { arVoice = voices[i]; break; }
      }
      if (arVoice) utt.voice = arVoice;
      synth.speak(utt);
    } catch (e2) { /* ignore */ }
  }

  function stop() {
    try {
      if (tryNative()) window.AqApp.ttsStop();
      else if (webReady) window.speechSynthesis.cancel();
    } catch (e) { /* ignore */ }
  }

  /** يُستدعى من Kotlin عند جاهزية محرك النطق أو عدمه */
  function nativeState(ready) {
    if (ready) mode = "android";
    else if (tryNative()) mode = "none";
    document.dispatchEvent(new CustomEvent("aq-voice-state", { detail: { mode: mode } }));
  }

  function available() {
    if (tryNative()) return "android";
    return webReady ? "web" : "none";
  }

  return { speak: speak, stop: stop, nativeState: nativeState, available: available };
})();

window.__ttsState = function (ready) { AQ.voice.nativeState(ready === "true" || ready === true); };
