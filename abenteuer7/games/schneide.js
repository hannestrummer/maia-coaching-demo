/* schneide.js — "Schneide Papier": Präzisions-Mini-Spiel für MAIA-Coaching.
 * Vertrag:  window.gameSchneide = function(host){ return Promise }
 *   host  = leeres DIV (Klasse "game"/"gamehost") im Chat-Stream.
 *   Rendert IN host; Promise löst nach einer Runde auf: { precision: 0-100 }.
 *   Bei Dispose (Überspringen) löst sie sanft mit dem Zwischenstand auf.
 * Keine externen Libs, kein Nested-Scroll, mobile-first (~410px Karte).
 *
 * Idee (passt zum Lernschritt „Schneide Papier" — ruhige Hand üben):
 *   Eine sanft geschwungene, gestrichelte FÜHRUNGSLINIE läuft von links
 *   nach rechts über „Papier". Lena drückt auf die Schere und fährt sie an
 *   der Linie entlang nach rechts. Jeder Tick misst die Abweichung von der
 *   Linie -> daraus wächst eine Live-Präzisionsanzeige. Warm & verzeihend,
 *   kein hartes Scheitern. 1 kurze Runde (bis ans Linienende, max ~20 s).
 *
 * WICHTIG — Preview-Renderer: requestAnimationFrame UND CSS-Transitions/
 * -Animationen sind hier eingefroren. Deshalb läuft ALLE Bewegung über
 * einen setTimeout-Stepper (~50 ms), Deltas via performance.now(), und die
 * Positionen werden pro Tick DIREKT gesetzt (SVG-transform/-Attribute).
 * Pointer-Events (down/move/up + Touch-Fallback) sind erlaubt und treiben
 * nur die Ziel-Fingerposition; der Stepper malt.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // Internes Koordinatensystem (SVG-viewBox). Skaliert responsiv per CSS.
  var W = 360, H = 200;
  var LX = 30, RX = 330;      // Start-/End-x der Linie
  var MID = H * 0.5;          // Ruhelage
  var AMP = 44;               // Wellen-Amplitude (sanft)
  var TOL = 34;               // Abweichung (in viewBox-Einheiten) -> Präzision 0
  var TICK = 50;              // Stepper-Intervall (kein rAF!)
  var MAX_MS = 20000;         // Sicherheits-Deckel für die Rundenlänge
  var DONE_AT = 0.985;        // ab hier gilt die Linie als gefahren

  // Sanft geschwungene Führungslinie: y als Funktion von x (viewBox-Koords).
  function lineY(x) {
    var t = (x - LX) / (RX - LX);
    if (t < 0) t = 0; else if (t > 1) t = 1;
    return MID + AMP * Math.sin(t * Math.PI * 1.85);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function htmlEl(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  window.gameSchneide = function (host) {
    return new Promise(function (resolve) {
      // ---- Eindeutiger Scope, damit Styles nicht in den Chat lecken ----
      var uid = "sc-" + Math.random().toString(36).slice(2, 8);
      host.classList.add(uid);

      var style = document.createElement("style");
      style.textContent = css(uid);
      host.appendChild(style);

      // ---- DOM: weiße Karte auf Mint ------------------------------------
      var wrap = htmlEl("div", "sc-wrap");
      var title = htmlEl("div", "sc-title", "Führe die Schere an der Linie");
      var sub = htmlEl("div", "sc-sub",
        "Drück auf die <b>Schere</b> und fahr sie ruhig an der Linie entlang nach rechts.");
      var stage = htmlEl("div", "sc-stage");

      var svg = svgEl("svg", {
        viewBox: "0 0 " + W + " " + H,
        "aria-label": "Papier mit Schnittlinie",
      });

      // Papier-Hintergrund + zarte Hilfslinien (Notizblock-Anmutung)
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: W, height: H, rx: 12, fill: "var(--white,#ffffff)" }));
      for (var gy = 40; gy < H; gy += 40) {
        svg.appendChild(svgEl("line", {
          x1: 14, y1: gy, x2: W - 14, y2: gy,
          stroke: "var(--mint,#C3EBD8)", "stroke-width": "1", opacity: "0.35",
        }));
      }

      // Führungslinie (gestrichelt = Perforation) + Schnitt-Spur (wächst mit)
      var d = buildPath();
      svg.appendChild(svgEl("path", {
        d: d, fill: "none", stroke: "var(--light,#8a939b)",
        "stroke-width": "2.6", "stroke-linecap": "round",
        "stroke-dasharray": "1.5 8", opacity: "0.7",
      }));
      var trail = svgEl("path", {
        d: d, fill: "none", stroke: "var(--mint-deep,#44885f)",
        "stroke-width": "4", "stroke-linecap": "round", "stroke-linejoin": "round",
      });
      svg.appendChild(trail);
      var trailLen = 0;
      try { trailLen = trail.getTotalLength(); } catch (e) { trailLen = RX - LX; }
      trail.style.strokeDasharray = trailLen;
      trail.style.strokeDashoffset = trailLen; // erst verborgen

      // Start- und Ziel-Marker
      svg.appendChild(svgEl("circle", {
        cx: LX, cy: lineY(LX), r: "4.5", fill: "var(--mint-deep,#44885f)",
      }));
      svg.appendChild(svgEl("circle", {
        cx: RX, cy: lineY(RX), r: "8", fill: "none",
        stroke: "var(--rose5,#c4566f)", "stroke-width": "2", "stroke-dasharray": "2 3",
      }));

      // Schere (bewegt sich pro Tick per transform)
      var sciss = svgEl("g", { class: "sc-sciss" });
      sciss.appendChild(svgEl("circle", {
        r: "15", fill: "var(--rose5,#c4566f)", stroke: "#ffffff", "stroke-width": "3",
      }));
      var scText = svgEl("text", {
        x: "0", y: "0.5", "text-anchor": "middle", "dominant-baseline": "central",
        "font-size": "16",
      });
      scText.textContent = "✂️"; // ✂️
      sciss.appendChild(scText);
      svg.appendChild(sciss);

      stage.appendChild(svg);

      // Live-Präzisionsanzeige (Spans direkt bauen -> direkte Referenz auf valEl)
      var meter = htmlEl("div", "sc-meter");
      var mtop = htmlEl("div", "sc-meter-top");
      mtop.appendChild(htmlEl("span", null, "Präzision"));
      var valEl = htmlEl("span", "sc-val", "–");
      mtop.appendChild(valEl);
      var bar = htmlEl("div", "sc-bar");
      var fill = htmlEl("div", "sc-fill");
      bar.appendChild(fill);
      meter.appendChild(mtop);
      meter.appendChild(bar);

      var cheer = htmlEl("div", "sc-cheer", "&nbsp;");

      wrap.appendChild(title);
      wrap.appendChild(sub);
      wrap.appendChild(stage);
      wrap.appendChild(meter);
      wrap.appendChild(cheer);
      host.appendChild(wrap);

      // ---- Zustand -------------------------------------------------------
      var done = false;
      var armed = false;         // Runde gestartet (erster Griff)?
      var holding = false;       // Finger liegt an?
      var activePointer = null;
      var fingerX = LX, fingerY = MID;
      var sciX = LX, sciY = MID;  // aktuelle Scheren-Position
      var lastSX = LX;            // letzte x-Position (für Vorwärts-Delta)
      var cutX = LX;              // wie weit ist geschnitten (nur vorwärts)
      var devSum = 0, devW = 0;   // gewichtete Präzisions-Summe / Gewicht (dx)
      var elapsed = 0;
      var lastTs = 0;
      var timer = 0;
      var lastCheer = "";

      // ---- Zeichnen ------------------------------------------------------
      function setSciss(x, y) {
        sciX = x; sciY = y;
        sciss.setAttribute("transform", "translate(" + x.toFixed(2) + "," + y.toFixed(2) + ")");
      }
      function paintTrail() {
        var prog = (cutX - LX) / (RX - LX);
        if (prog < 0) prog = 0; else if (prog > 1) prog = 1;
        trail.style.strokeDashoffset = (trailLen * (1 - prog)).toFixed(2);
      }
      // verzeihende Kurve: hebt mittlere Werte an, kein hartes Scheitern
      function shape(p) { return Math.pow(clamp(p, 0, 1), 0.85); }
      function updateMeter(running) {
        var pct = Math.round(shape(running) * 100);
        fill.style.width = pct + "%";
        valEl.textContent = pct + "%";
      }
      function setCheer(txt) {
        if (txt === lastCheer) return;
        lastCheer = txt;
        cheer.textContent = txt;
      }
      function cheerFor(running) {
        var p = shape(running);
        if (p >= 0.85) return "Stark! ✂️";
        if (p >= 0.65) return "Ruhige Hand!";
        if (p >= 0.42) return "Bleib auf der Linie";
        return "Ganz sanft nachführen";
      }

      // ---- Stepper: einziger Bewegungs-Treiber ---------------------------
      function loop() {
        if (done) return;
        if (!host.isConnected) { abort(); return; } // Host entfernt -> sauber raus
        var ts = now();
        if (!lastTs) lastTs = ts;
        var dt = Math.min(ts - lastTs, 120); // ms, gegen Sprünge nach Tab-Wechsel
        lastTs = ts;

        if (!armed) {
          // Idle: Schere wippt sanft am Start (zieht den Blick, auch wenn
          // CSS-Animationen eingefroren sind — wir malen selbst).
          var bob = Math.sin(ts / 480) * 5;
          setSciss(LX, lineY(LX) + bob);
          timer = setTimeout(loop, TICK);
          return;
        }

        elapsed += dt;

        if (holding) {
          var sx = clamp(fingerX, LX, RX);
          var sy = clamp(fingerY, 8, H - 8);
          setSciss(sx, sy);

          var dxf = sx - lastSX;          // nur Vorwärtsbewegung zählt
          if (dxf > 0) {
            var dev = Math.abs(sy - lineY(sx));
            var p = 1 - dev / TOL; if (p < 0) p = 0;
            devSum += p * dxf;
            devW += dxf;
          }
          lastSX = sx;

          if (sx > cutX) { cutX = sx; paintTrail(); }

          var running = devW > 0 ? devSum / devW : 1;
          updateMeter(running);
          setCheer(cheerFor(running));

          var prog = (cutX - LX) / (RX - LX);
          if (prog >= DONE_AT) { finish(); return; }
        }

        if (elapsed >= MAX_MS) { finish(); return; }
        timer = setTimeout(loop, TICK);
      }

      // ---- Abschluss -----------------------------------------------------
      function finalPrecision() {
        var running = devW > 0 ? devSum / devW : 0;
        return Math.round(shape(running) * 100);
      }
      function finish() {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        cleanup();
        holding = false;

        var pct = finalPrecision();
        // Schere ans Linienende setzen, Spur voll zeigen
        cutX = RX; paintTrail();
        setSciss(clamp(sciX, LX, RX), lineY(clamp(sciX, LX, RX)));
        fill.style.width = pct + "%";
        valEl.textContent = pct + "%";
        wrap.classList.add("sc-finished");

        title.textContent = "Präzision: " + pct + "%";
        sub.style.display = "none";
        cheer.textContent =
          pct >= 85 ? "Traumhaft ruhige Hand! ✂️" :
          pct >= 65 ? "Richtig sauber geführt." :
          pct >= 45 ? "Schön gleichmäßig — das wird immer feiner." :
          "Guter erster Schnitt — Übung macht die ruhige Hand.";

        var cta = htmlEl("button", "sc-cta");
        cta.type = "button";
        cta.textContent = "Weiter ✂️";
        wrap.appendChild(cta);
        cta.addEventListener("click", function () {
          resolve({ precision: pct });
        });
      }

      // ---- Dispose / Abbruch --------------------------------------------
      function abort() {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        cleanup();
        resolve({ precision: finalPrecision(), aborted: true });
      }

      // ---- Pointer-Handling ---------------------------------------------
      var listeners = [];
      function on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        listeners.push([target, type, fn, opts]);
      }
      function cleanup() {
        for (var i = 0; i < listeners.length; i++) {
          try { listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]); } catch (e) {}
        }
        listeners = [];
      }

      function toCoords(pt) {
        var rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        fingerX = (pt.clientX - rect.left) / rect.width * W;
        fingerY = (pt.clientY - rect.top) / rect.height * H;
      }

      function press(e) {
        if (done) return;
        if (e && e.cancelable) e.preventDefault();
        // zweiter Finger, während einer schon führt -> ignorieren
        if (e && e.pointerId != null && activePointer != null && e.pointerId !== activePointer) return;
        var pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
        toCoords(pt);
        if (e && e.pointerId != null) {
          activePointer = e.pointerId;
          try { svg.setPointerCapture(e.pointerId); } catch (e2) {}
        }
        armed = true;
        holding = true;
        lastSX = clamp(fingerX, LX, RX); // kein Sprung-Bonus beim (Neu-)Greifen
        sciss.classList.add("grab");
        if (sub.style.display !== "none") sub.textContent = "Schön ruhig …";
      }
      function move(e) {
        if (done || !holding) return;
        if (e && e.pointerId != null && activePointer != null && e.pointerId !== activePointer) return;
        if (e && e.cancelable) e.preventDefault();
        var pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
        toCoords(pt);
      }
      function release(e) {
        if (e && e.pointerId != null && activePointer != null && e.pointerId !== activePointer) return;
        if (activePointer != null) { try { svg.releasePointerCapture(activePointer); } catch (e3) {} }
        activePointer = null;
        holding = false;
        sciss.classList.remove("grab");
      }

      on(host, "gamedispose", abort); // playGame() feuert das vor host.remove()
      if ("onpointerdown" in window) {
        on(svg, "pointerdown", press);
        on(svg, "pointermove", move);
        on(window, "pointerup", release);
        on(window, "pointercancel", release);
      } else {
        on(svg, "touchstart", press, { passive: false });
        on(svg, "touchmove", move, { passive: false });
        on(window, "touchend", release);
        on(window, "touchcancel", release);
        on(svg, "mousedown", press);
        on(window, "mousemove", move);
        on(window, "mouseup", release);
      }
      on(window, "blur", release);

      // Startbild zeichnen + Stepper anwerfen
      setSciss(LX, lineY(LX));
      updateMeter(0);
      timer = setTimeout(loop, TICK);
    });
  };

  // Führungslinien-Pfad als Polyline aus lineY() (SVG stimmt so mit der
  // Messung im Stepper exakt überein).
  function buildPath() {
    var d = "M " + LX.toFixed(1) + " " + lineY(LX).toFixed(1);
    var N = 48;
    for (var i = 1; i <= N; i++) {
      var x = LX + (RX - LX) * (i / N);
      d += " L " + x.toFixed(1) + " " + lineY(x).toFixed(1);
    }
    return d;
  }

  // Auf den uid-Scope begrenzte Styles (keine Kollision mit dem Chat-CSS).
  function css(uid) {
    var s = "." + uid;
    return [
      // Host: das geteilte .game-CSS (fixe Höhe/overflow) bewusst überschreiben.
      s + "{height:auto!important;overflow:visible!important;display:block!important;background:transparent!important}",

      s + " .sc-wrap{box-sizing:border-box;width:100%;max-width:410px;margin:0 auto;",
      "background:var(--white,#fff);border-radius:16px;padding:16px 15px 15px;",
      "display:flex;flex-direction:column;gap:10px;",
      "font-family:'DM Sans',system-ui,sans-serif;color:var(--ink,#15181b);",
      "box-shadow:0 4px 16px rgba(0,0,0,.10),0 1px 3px rgba(0,0,0,.06)}",

      s + " .sc-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;",
      "line-height:1.25;color:var(--mint-deep,#44885f);text-align:center}",
      s + " .sc-sub{font-size:12.5px;line-height:1.45;color:var(--light,#8a939b);",
      "text-align:center;margin-top:-3px}",
      s + " .sc-sub b{color:var(--rose5,#c4566f);font-weight:600}",

      // Bühne: „Papier" mit weichem Rahmen, feste Ratio via SVG (keine Höhe nötig).
      s + " .sc-stage{position:relative;width:100%;border-radius:14px;overflow:hidden;",
      "box-shadow:inset 0 0 0 1.5px rgba(68,136,95,.14);background:var(--mint-soft,#e8f6f0)}",
      s + " .sc-stage svg{display:block;width:100%;height:auto;",
      "touch-action:none;-webkit-user-select:none;user-select:none;",
      "-webkit-tap-highlight-color:transparent;cursor:crosshair}",
      s + " .sc-sciss{cursor:grab}",
      s + " .sc-sciss.grab{cursor:grabbing}",

      // Präzisions-Anzeige
      s + " .sc-meter{display:flex;flex-direction:column;gap:5px;margin-top:1px}",
      s + " .sc-meter-top{display:flex;justify-content:space-between;align-items:baseline;",
      "font-size:11.5px;letter-spacing:.03em;text-transform:uppercase;",
      "color:var(--light,#8a939b);font-weight:600}",
      s + " .sc-val{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;",
      "color:var(--mint-deep,#44885f);letter-spacing:0}",
      s + " .sc-bar{position:relative;height:9px;border-radius:50px;overflow:hidden;",
      "background:var(--rose2,#f6d3db)}",
      // Kein CSS-Transition (im Preview eingefroren) — Breite wird direkt gesetzt.
      s + " .sc-fill{height:100%;width:0%;border-radius:50px;",
      "background:linear-gradient(90deg,var(--mint,#C3EBD8),var(--mint-deep,#44885f))}",

      s + " .sc-cheer{min-height:18px;text-align:center;font-size:13px;font-weight:600;",
      "font-family:'Syne',sans-serif;color:var(--rose5,#c4566f);line-height:1.3}",

      // Abschluss
      s + " .sc-finished .sc-title{color:var(--ink,#15181b)}",
      s + " .sc-cta{margin-top:4px;width:100%;border:none;background:var(--rose5,#c4566f);",
      "color:#fff;border-radius:50px;padding:12px;font-family:inherit;font-size:15px;",
      "font-weight:500;cursor:pointer;box-shadow:0 3px 10px rgba(196,86,111,.40)}",
      s + " .sc-cta:active{transform:scale(.99)}"
    ].join("");
  }
})();
