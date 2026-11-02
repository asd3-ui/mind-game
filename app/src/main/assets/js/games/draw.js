/* عقلني — السبورة الإبداعية: رسم حر بألوان وفرش، مع حفظ في معرض الرسومات */
"use strict";
window.AQ = window.AQ || {};

(function () {
  var U = AQ.util;
  var COLORS = ["#1E1B4B", "#DC2626", "#F59E0B", "#16A34A", "#2563EB", "#9333EA", "#DB2777", "#0891B2"];

  var ctl = null;

  function boot(view, params) {
    var F = AQ.gz.frame("سبورة الألوان 🎨", {});
    var screen = F.screen;

    var wrap = U.ce("div", "draw-wrap");
    var canvas = U.ce("canvas", "draw-canvas");
    var ctx = canvas.getContext("2d");
    wrap.appendChild(canvas);
    screen.appendChild(wrap);

    /* ألوان الفرش */
    var colors = U.ce("div", "dcolors");
    var brushColor = COLORS[0];
    var brushSize = 6;
    COLORS.forEach(function (c, i) {
      var b = U.ce("button", "dcolor" + (i === 0 ? " sel" : ""));
      b.style.background = c;
      b.setAttribute("aria-label", "لون");
      b.addEventListener("click", function () {
        Array.prototype.slice.call(colors.children).forEach(function (el) { el.classList.remove("sel"); });
        b.classList.add("sel");
        brushColor = c;
      });
      colors.appendChild(b);
    });
    screen.appendChild(colors);

    /* سماكة الفرش */
    var sizeRow = U.ce("div", "row");
    sizeRow.style.cssText = "justify-content:center;gap:10px;align-items:center;";
    var small = U.ce("button", "btn small ghost", "فرش رفيع");
    var medium = U.ce("button", "btn small ghost", "متوسط");
    var thick = U.ce("button", "btn small ghost", "عريض");
    function setThick(v) { brushSize = v; }
    small.addEventListener("click", function () { setThick(3); });
    medium.addEventListener("click", function () { setThick(7); });
    thick.addEventListener("click", function () { setThick(14); });
    medium.click();
    sizeRow.appendChild(small);
    sizeRow.appendChild(medium);
    sizeRow.appendChild(thick);
    screen.appendChild(sizeRow);

    /* أدوات */
    var tools = U.ce("div", "m-actions");
    var clearBtn = U.ce("button", "btn ghost small", "🧽 مسح");
    var undoBtn = U.ce("button", "btn ghost small", "↩️ تراجع");
    var saveBtn = U.ce("button", "btn accent small", "💾 احفظ في المعرض");
    tools.appendChild(undoBtn);
    tools.appendChild(clearBtn);
    tools.appendChild(saveBtn);
    screen.appendChild(tools);

    /* ضبط المقاسات مع شاشة الجهاز */
    function resize() {
      var rect = wrap.getBoundingClientRect();
      var px = Math.max(1, Math.round(rect.width)), py = Math.max(1, Math.round(rect.height));
      if (canvas.width === px && canvas.height === py) return;
      var hadWork = strokes.length > 0;
      var snap = hadWork ? canvas.toDataURL() : null;
      canvas.width = px;
      canvas.height = py;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, px, py);
      if (snap) {
        var img = new Image();
        img.onload = function () { repaint(); };
        img.onerror = function () { repaint(); };
        img.src = snap;
      }
    }

    var strokes = [];
    var drawing = false;
    var last = null;

    function pos(ev) {
      var rect = canvas.getBoundingClientRect();
      var t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      return {
        x: (t.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
        y: (t.clientY - rect.top) * (canvas.height / Math.max(1, rect.height))
      };
    }

    function startDraw(ev) {
      drawing = true;
      last = pos(ev);
      strokes.push({ color: brushColor, size: brushSize, pts: [last] });
      drawDot(last);
      ev.preventDefault();
    }

    function drawDot(p) {
      ctx.beginPath();
      ctx.fillStyle = brushColor;
      ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function moveDraw(ev) {
      if (!drawing) return;
      var p = pos(ev);
      var cur = strokes[strokes.length - 1];
      cur.pts.push(p);
      ctx.beginPath();
      ctx.strokeStyle = cur.color;
      ctx.lineWidth = cur.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      ev.preventDefault();
    }

    function endDraw() { drawing = false; last = null; }

    canvas.addEventListener("pointerdown", startDraw);
    canvas.addEventListener("pointermove", moveDraw);
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointerleave", endDraw);

    function repaint() {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      strokes.forEach(function (s) {
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        s.pts.forEach(function (p, i) {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });
    }

    clearBtn.addEventListener("click", function () {
      strokes = [];
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      AQ.audio.sfx("pop");
    });

    undoBtn.addEventListener("click", function () {
      strokes.pop();
      repaint();
      AQ.audio.sfx("tick");
    });

    saveBtn.addEventListener("click", function () {
      try {
        var scale = 320 / Math.max(1, canvas.width);
        var small = document.createElement("canvas");
        small.width = 320;
        small.height = Math.max(1, Math.round(canvas.height * scale));
        var sctx = small.getContext("2d");
        sctx.fillStyle = "#FFFFFF";
        sctx.fillRect(0, 0, small.width, small.height);
        sctx.drawImage(canvas, 0, 0, small.width, small.height);
        var url = small.toDataURL("image/png");
        var g = AQ.store.state.gallery;
        g.push({ d: url, ts: Date.now() });
        while (g.length > 12) g.shift();
        AQ.store.save(true);
        AQ.store.state.drawsDone = (AQ.store.state.drawsDone || 0) + 1;
        if (AQ.store.state.drawsDone >= 3) AQ.store.award("artist");
        AQ.audio.sfx("chest");
        AQ.ui.toast("حُفظت لوحتك في المعرض 🖼️");
        AQ.ui.confetti(30);
      } catch (e) {
        AQ.ui.toast("تعذر الحفظ، جرّب مرة أخرى");
      }
    });

    setTimeout(resize, 30);
    window.addEventListener("resize", resize);

    var controller = {      pause: function () {
        /* الرسم لا يُقف مؤقتًا — نعرض استراحة بسيطة فقط */
        AQ.gz.pauseModal({
          resume: function () { },
          restart: function () { AQ.router.go("draw", params, true); },
          exit: function () { AQ.router.back(); }
        });
        return true;
      },
      cleanup: function () {
        window.removeEventListener("resize", resize);
      }
    };
    return controller;
  }

  AQ.router.register("draw", {
    render: function (view, params) { return boot(view, params || {}); },
    onBack: function () { return ctl ? ctl.pause() : false; }
  });
})();
