/* atem.js — SOURANCE-Atemübung (echtes Tap-and-Hold) für MAIA-Coaching.
 * Vertrag:  window.gameAtem = function(host){ return Promise }
 *   host  = leeres DIV (Klasse "gamehost") im Chat-Stream.
 *   Rendert IN host; Promise löst nach abgeschlossener Übung auf: { breaths }.
 * Keine externen Libs, kein Nested-Scroll, mobile-first (~300–340px).
 *
 * Interaktion (NEU, echt fingergesteuert per setTimeout-Stepper):
 *   Halten  -> Kreis WÄCHST in Echtzeit (Einatmen), bis er den Zielring füllt.
 *   Loslassen -> Kreis SINKT wieder (Ausatmen).
 *   Ein voller Zyklus (wachsen bis oben + zurück auf Ruhe) = 1 Atemzug.
 *   Nach BREATHS Atemzügen: warmer Abschluss, dann resolve({breaths}).
 * So folgt der Kreis wirklich dem Finger — das ist der Punkt der Übung.
 */
(function () {
  "use strict";

  var BREATHS = 4;     // Anzahl geführter Atemzüge bis Abschluss
  var MAX = 1.5;       // maximale Skalierung des Kreises (voll eingeatmet)
  var IN_MS = 3500;    // Referenz-Tempo Einatmen (nur Wachstums-Geschwindigkeit)
  var OUT_MS = 5000;   // Referenz-Tempo Ausatmen (nur Schrumpf-Geschwindigkeit)
  var TICK = 50;       // Stepper-Intervall (setTimeout, nicht rAF -> läuft auch
                       // bei verstecktem Tab weiter, statt einzufrieren)
  var TOP = MAX - 0.03;   // ab hier gilt "voll eingeatmet"
  var BASE = 1.03;        // bis hier zurück gilt "ausgeatmet"
  var HOLD_MS = 1400;     // kurz oben halten, dann Aufforderung zum Loslassen
  var NUDGE_MS = 2800;    // hält er weiter -> deutlicher Hinweis „jetzt loslassen"

  window.gameAtem = function (host) {
    return new Promise(function (resolve) {
      // ---- eindeutiger Scope, damit Styles nicht mit dem Chat kollidieren ----
      var uid = "atem-" + Math.random().toString(36).slice(2, 8);
      host.classList.add(uid);

      var style = document.createElement("style");
      style.textContent = css(uid);
      host.appendChild(style);

      // ---- DOM (weiße Karte auf Mint) --------------------------------------
      var wrap = el("div", "atem-wrap");
      var title = el("div", "atem-title", "Kurz ankommen");
      var sub = el("div", "atem-sub",
        "Halte den Kreis gedrückt zum <b>Einatmen</b> — er wächst zum Zielring. " +
        "Lass los zum <b>Ausatmen</b> — er sinkt. Ich zähle mit, folge einfach.");

      var stage = el("div", "atem-stage");
      var guide = el("div", "atem-guide");      // fixer Zielring (Atemziel)
      var glow = el("div", "atem-glow");        // sanfter Puls hinter dem Kreis
      var ring = el("div", "atem-ring");        // atmender Kreis (fingergesteuert)
      var word = el("div", "atem-word", "");    // „Einatmen … Halten … Ausatmen …"
      ring.appendChild(word);
      stage.appendChild(guide);
      stage.appendChild(glow);
      stage.appendChild(ring);

      var count = el("div", "atem-count", "");  // z. B. „Atemzug 1 / 4"
      var start = el("button", "atem-start", "Los — sanft ankommen");

      wrap.appendChild(title);
      wrap.appendChild(sub);
      wrap.appendChild(stage);
      wrap.appendChild(count);
      wrap.appendChild(start);
      host.appendChild(wrap);

      // ---- Zustand ----------------------------------------------------------
      var armed = false;        // Übung gestartet (Audio-Geste erfolgt)?
      var done = false;
      var holding = false;      // Finger/Maus liegt gerade an?
      var scale = 1;            // aktuelle Kreisgröße
      var reachedTop = false;   // in DIESEM Zyklus schon voll eingeatmet?
      var holdSince = 0;        // Zeitstempel, seit wann oben gehalten wird
      var breaths = 0;
      var lastPhase = "";       // "in" | "hold" | "release" | "nudge" | "out" | "rest"
      var lastTs = 0;
      var timer = 0;            // setTimeout-Handle des Steppers
      var startHideTimer = 0;   // one-shot: Start-Button ausblenden

      // ---- Kreis in Echtzeit setzen (kein CSS-Transition während des Spiels)-
      function paint() {
        ring.style.transform = "scale(" + scale.toFixed(4) + ")";
        glow.style.transform = "scale(" + (scale * 1.08).toFixed(4) + ")";
        var t = (scale - 1) / (MAX - 1);        // 0..1 Füllgrad
        glow.style.opacity = (0.35 + t * 0.55).toFixed(3);
      }

      function say(text, cls) {
        if (word.dataset.t === text) return;    // nicht bei jedem Frame neu setzen
        word.dataset.t = text;
        word.className = "atem-word " + (cls || "");
        void word.offsetHeight;
        word.textContent = text;
        if (text) word.classList.add("show");
        else word.classList.remove("show");
      }

      // Optionales, sehr leises Puls-Feedback (WebAudio, best effort).
      var actx = null;
      function resumeAudio() {
        try {
          if (actx && actx.state === "suspended") {
            var pr = actx.resume(); if (pr && pr.catch) pr.catch(function () {});
          }
        } catch (e) {}
      }
      function ping(freq) {
        try {
          if (!actx || actx.state === "closed") return;
          resumeAudio();
          var o = actx.createOscillator(), g = actx.createGain();
          o.type = "sine"; o.frequency.value = freq;
          g.gain.setValueAtTime(0.0001, actx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.05, actx.currentTime + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.9);
          o.connect(g); g.connect(actx.destination);
          o.start(); o.stop(actx.currentTime + 0.95);
        } catch (e) { /* Ton ist optional */ }
      }

      // ---- Herzstück: setTimeout-Stepper, folgt dem Finger ------------------
      // Bewusst KEIN requestAnimationFrame: rAF friert ein, sobald der Tab in
      // den Hintergrund geht. setTimeout läuft (gedrosselt) weiter, deshalb
      // arbeiten wir delta-basiert mit performance.now().
      function loop() {
        if (done) return;
        // Host aus dem DOM entfernt (z. B. „überspringen") -> sauber aufhören.
        if (host && !host.isConnected) { abort(); return; }
        var ts = (window.performance && performance.now) ? performance.now() : Date.now();
        if (!lastTs) lastTs = ts;
        var dt = Math.min(ts - lastTs, 120);    // ms, gegen Sprünge nach Tab-Wechsel
        lastTs = ts;

        if (holding) {
          scale += (dt / IN_MS) * (MAX - 1);
          if (scale > MAX) scale = MAX;
        } else {
          scale -= (dt / OUT_MS) * (MAX - 1);
          if (scale < 1) scale = 1;
        }
        paint();

        // Phasen-Text + Zählung
        if (holding && scale >= TOP) {
          // Voll eingeatmet: kurz halten, dann aktiv zum Loslassen führen —
          // sonst hält man unbewusst die ganze Zeit die Luft an.
          reachedTop = true;
          if (!holdSince) holdSince = ts;
          var held = ts - holdSince;
          if (held < HOLD_MS) setPhase("hold");
          else if (held < HOLD_MS + NUDGE_MS) setPhase("release");
          else setPhase("nudge");
        } else if (holding) {
          setPhase("in");
        } else if (reachedTop && scale > BASE) {
          holdSince = 0;
          setPhase("out");
        } else if (reachedTop && scale <= BASE) {
          holdSince = 0;
          // ein vollständiger Atemzug (hoch + runter) ist geschafft
          reachedTop = false;
          breaths += 1;
          count.textContent = breaths >= BREATHS
            ? "Geschafft"
            : "Atemzug " + (breaths + 1) + " / " + BREATHS;
          if (breaths >= BREATHS) return finish();
          setPhase("rest");
        } else {
          setPhase("rest");
        }

        timer = setTimeout(loop, TICK);
      }

      function setPhase(p) {
        if (p === lastPhase) return;
        lastPhase = p;
        wrap.classList.toggle("hint-hold", p === "rest" || p === "in");
        if (p === "in")   { say("Einatmen …", "in"); ping(392); }
        else if (p === "hold") say("Halten …", "hold");
        else if (p === "release") { say("Und loslassen …", "out"); ping(294); } // Signal: jetzt ausatmen
        else if (p === "nudge") say("Lass jetzt locker los 🌬️", "out");
        else if (p === "out")  { say("Ausatmen …", "out"); ping(294); }
        else say("Halte den Kreis gedrückt", "rest");
      }

      // ---- Abschluss: 1 warmer Satz, dann Promise auflösen -----------------
      function finish() {
        done = true;
        if (timer) clearTimeout(timer);
        if (startHideTimer) clearTimeout(startHideTimer);
        cleanup();
        holding = false;
        wrap.classList.remove("hint-hold");
        wrap.classList.add("atem-done");
        // sanfter Schluss-Puls über echte CSS-Transition
        ring.style.transition = "transform 1200ms ease-in-out";
        glow.style.transition = "transform 1200ms ease-in-out, opacity 1200ms ease";
        void ring.offsetHeight;
        scale = 1.12; paint();
        say("", "");
        title.textContent = "Da bist du.";
        sub.innerHTML = "Spürst du, wie sich alles ein wenig geweitet hat? " +
          "Diese Ruhe kannst du jederzeit selbst holen — sie gehört dir. 🌱";
        setTimeout(function () {
          try { if (actx && actx.state !== "closed") { var pc = actx.close(); if (pc && pc.catch) pc.catch(function () {}); } } catch (e) {}
          resolve({ breaths: breaths });
        }, 1500);
      }

      // ---- Start (Audio-Geste) + Interaktion --------------------------------
      function arm() {
        if (armed) return;
        armed = true;
        try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { actx = null; }
        start.classList.add("gone");
        startHideTimer = setTimeout(function () { start.style.display = "none"; }, 260);
        count.textContent = "Atemzug 1 / " + BREATHS;
        setPhase("rest");
        lastTs = 0;
        timer = setTimeout(loop, TICK);
      }

      var activePointer = null;
      var listeners = [];
      function on(target, type, fn, opts) { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); }
      function cleanup() {
        for (var i = 0; i < listeners.length; i++) {
          try { listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]); } catch (e) {}
        }
        listeners = [];
      }
      // Sofortiger Abbruch, auch wenn loop() nie lief (z. B. Überspringen vor
      // dem ersten Griff) -> keine hängenden Listener, Promise sauber aufgelöst.
      function abort() {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        if (startHideTimer) clearTimeout(startHideTimer);
        cleanup();
        try { if (actx && actx.state !== "closed") { var pc = actx.close(); if (pc && pc.catch) pc.catch(function () {}); } } catch (e) {}
        resolve({ breaths: breaths, aborted: true });
      }

      function press(e) {
        if (e && e.cancelable) e.preventDefault();
        if (done) return;
        // Zweiter Finger, während einer schon hält -> ignorieren (kein Klau).
        if (e && e.pointerId != null && activePointer != null && e.pointerId !== activePointer) return;
        if (e && e.pointerId != null) {
          activePointer = e.pointerId;
          try { stage.setPointerCapture(e.pointerId); } catch (e3) {}
        }
        if (!armed) arm();          // erster Griff startet auch (kein idle-Blocker)
        holding = true;
        ring.classList.add("pressed");
        resumeAudio();
      }
      // Nur der aktive Finger beendet den Halt (kein Abbruch durch 2. Finger).
      function release(e) {
        if (e && e.pointerId != null && activePointer != null && e.pointerId !== activePointer) return;
        forceRelease();
      }
      // Pointer verloren (blur / Tab versteckt) -> Halt lösen, nicht bei „Halten" hängen.
      function forceRelease() {
        if (activePointer != null) { try { stage.releasePointerCapture(activePointer); } catch (e) {} }
        activePointer = null;
        if (!holding) return;
        holding = false;
        holdSince = 0;   // sonst „Loslassen" zu früh bei Loslassen+Sofort-Neudruck im selben Tick
        ring.classList.remove("pressed");
      }
      function onVis() { if (document.hidden) forceRelease(); }

      on(host, "gamedispose", abort);   // playGame() feuert das vor host.remove()
      on(start, "click", arm);
      on(stage, "pointerdown", press);
      on(window, "pointerup", release);
      on(window, "pointercancel", release);
      on(window, "blur", forceRelease);
      on(document, "visibilitychange", onVis);
      // Fallback für ältere Browser ohne Pointer-Events:
      if (!("onpointerdown" in window)) {
        on(stage, "touchstart", press, { passive: false });
        on(stage, "mousedown", press);
        on(window, "touchend", release);
        on(window, "touchcancel", release);
        on(window, "mouseup", release);
      }

      paint();
    });
  };

  // ---- Helpers ------------------------------------------------------------
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // Auf den Scope-Klassennamen begrenzte Styles (keine Kollision mit dem Chat).
  function css(uid) {
    var s = ".";
    return [
      // Karte: weiß auf Mint, flach & ruhig.
      s + uid + " .atem-wrap{box-sizing:border-box;width:100%;max-width:340px;margin:0 auto;",
      "background:var(--white,#fff);border-radius:16px;padding:20px 18px 18px;",
      "display:flex;flex-direction:column;align-items:center;text-align:center;",
      "font-family:'DM Sans',system-ui,sans-serif;color:var(--ink,#15181b);",
      "box-shadow:0 4px 16px rgba(0,0,0,.10)}",

      s + uid + " .atem-title{font-family:'Syne',sans-serif;font-weight:700;",
      "font-size:17px;color:var(--mint-deep,#44885f);margin-bottom:6px;",
      "transition:color .5s ease}",
      s + uid + " .atem-sub{font-size:13px;line-height:1.5;color:var(--mid,#4b5560);",
      "max-width:280px;transition:opacity .4s ease}",
      s + uid + " .atem-sub b{color:var(--mint-deep,#44885f);font-weight:600}",

      // Bühne mit fixer Höhe -> kein Layout-Springen, kein Nested-Scroll.
      s + uid + " .atem-stage{position:relative;width:100%;height:200px;",
      "display:flex;align-items:center;justify-content:center;margin:14px 0 4px;",
      "touch-action:none;-webkit-user-select:none;user-select:none;",
      "-webkit-tap-highlight-color:transparent}",

      // Zielring: zeigt, wie weit "voll eingeatmet" ist (152px ≈ 104*1.46).
      s + uid + " .atem-guide{position:absolute;width:152px;height:152px;border-radius:50%;",
      "border:1.5px dashed rgba(68,136,95,.35);pointer-events:none}",

      // Atmender Kreis: skaliert live via transform (rAF, GPU-freundlich).
      s + uid + " .atem-ring{position:relative;width:104px;height:104px;border-radius:50%;",
      "background:radial-gradient(circle at 38% 34%,var(--mint-soft,#e8f6f0),var(--mint,#C3EBD8));",
      "box-shadow:inset 0 0 0 1.5px rgba(68,136,95,.28),0 6px 18px rgba(68,136,95,.20);",
      "display:flex;align-items:center;justify-content:center;cursor:pointer;",
      "transform:scale(1);will-change:transform}",
      s + uid + " .atem-ring.pressed{filter:brightness(1.04)}",

      // Weicher Puls-Halo dahinter.
      s + uid + " .atem-glow{position:absolute;width:104px;height:104px;border-radius:50%;",
      "background:radial-gradient(circle,rgba(159,208,183,.55),transparent 70%);",
      "opacity:.4;transform:scale(1.08);pointer-events:none;will-change:transform,opacity}",

      // Leittext im Kreis.
      s + uid + " .atem-word{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;",
      "color:var(--mint-deep,#44885f);opacity:0;transform:translateY(4px);",
      "transition:opacity .4s ease,transform .4s ease;pointer-events:none;padding:0 6px;",
      "max-width:90px;line-height:1.2}",
      s + uid + " .atem-word.show{opacity:1;transform:translateY(0)}",
      s + uid + " .atem-word.out{color:var(--rose5,#c4566f)}",
      s + uid + " .atem-word.rest{font-size:11px;font-weight:600;color:var(--light,#8a939b)}",

      // Ganz sanfter Ruhe-Puls am Zielring, solange noch nicht gehalten wird.
      s + uid + " .hint-hold .atem-guide{animation:" + uid + "-hint 2.6s ease-in-out infinite}",
      "@keyframes " + uid + "-hint{0%,100%{opacity:.5}50%{opacity:1}}",

      s + uid + " .atem-count{font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;",
      "color:var(--light,#8a939b);font-weight:500;min-height:14px;margin-top:2px}",

      // Start-Button im CI (Rose-CTA), verschwindet weich nach Klick/Griff.
      s + uid + " .atem-start{margin-top:12px;width:100%;max-width:280px;border:none;",
      "background:var(--rose5,#c4566f);color:#fff;border-radius:50px;padding:12px;",
      "font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;",
      "box-shadow:0 3px 10px rgba(196,86,111,.40);transition:opacity .25s ease,transform .25s ease}",
      s + uid + " .atem-start:active{transform:scale(.98)}",
      s + uid + " .atem-start.gone{opacity:0;transform:scale(.96);pointer-events:none}",

      // Abschluss-Stimmung.
      s + uid + " .atem-done .atem-ring{box-shadow:inset 0 0 0 1.5px rgba(68,136,95,.28),0 10px 26px rgba(68,136,95,.28)}",
      s + uid + " .atem-done .atem-guide{opacity:0;transition:opacity .6s ease}"
    ].join("");
  }
})();
