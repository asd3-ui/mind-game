/* عقلني — أدوات عامة (ES2017-safe for old Android WebViews) */
"use strict";
window.AQ = window.AQ || {};

AQ.util = (function () {
  function ce(tag, cls, html, styles) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined && html !== null) el.innerHTML = html;
    if (styles) {
      for (var k in styles) { if (Object.prototype.hasOwnProperty.call(styles, k)) el.style[k] = styles[k]; }
    }
    return el;
  }
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rint(min, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
  }
  function pickExcept(arr, not) {
    if (arr.length === 1) return arr[0];
    var v = not;
    var guard = 0;
    while (v === not && guard++ < 30) v = rand(arr);
    return v;
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function shuffledUnique(arr, n) {
    return shuffle(arr).slice(0, n);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function uniqId(prefix) { return prefix + "x" + Date.now().toString(36) + rint(100, 999).toString(36); }

  /* Draw distractor options: [correct] + 3 wrong unique values. */
  function optionsFrom(correct, wrongs) {
    var set = [correct];
   for (var i = 0; i < wrongs.length && set.length < 4; i++) {
      if (wrongs[i] !== correct && set.indexOf(wrongs[i]) === -1) set.push(wrongs[i]);
    }
    for (var j = 0; set.length < 4; j++) {
      var alt = (String(correct) === "نعم") ? "لا" : String(correct) + "؟";
      if (set.indexOf(alt) === -1) set.push(alt);
    }
    return shuffle(set);
  }

  var numbersDict = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  return {
    ce: ce, rand: rand, rint: rint, pickExcept: pickExcept,
    shuffle: shuffle, shuffledUnique: shuffledUnique,
    clamp: clamp, todayStr: todayStr, uniqId: uniqId,
    optionsFrom: optionsFrom, numbersDict: numbersDict
  };
})();
