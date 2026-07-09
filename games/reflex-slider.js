/* reflex-slider.js — Reflexions-/Selbsteinschätzungs-Spiel für die Coaching-Unit
 * "Werde dein Lehrer". Eigenständig, keine externen Libs.
 *
 * Vertrag:  window.gameReflexSlider = function(host){ return Promise }
 *   host   = leeres DIV (Klasse .game) im Chat-Stream.
 *   Promise löst mit den gesetzten Slider-Werten auf, z. B.
 *     { selbstlehrer: 0-100, fehler: 0-100, tempo: 0-100 }
 *
 * Pädagogik: macht Selbstreflexion sichtbar und verankert die Haltung
 * "ich steuere mein Lernen". Reine Selbstverortung — kein Werturteil,
 * nur ein warmer Spiegel. Andockpunkt: Reflexions-/Abschlussphase.
 */
(function () {
  "use strict";

  // Ein Slider-Item = eine sanfte Selbstverortungs-Skala.
  // labels: 5 Stufen (Wert-Buckets) — ermutigend, kein Richtig/Falsch.
  // mirror(v): warme Rückmeldung je nach Position, spiegelnd statt bewertend.
  const ITEMS = [
    {
      key: "selbstlehrer",
      frage: "Wie sehr fühlst du dich schon als dein eigener Lehrer?",
      links: "fremdbestimmt",
      rechts: "selbstbestimmt",
      start: 30,
      labels: [
        "Noch lehnst du dich gern an andere an — auch das ist ein Anfang.",
        "Du beginnst, eigene Wege zu erspüren.",
        "Halb geführt, halb selbst am Steuer — schöner Übergang.",
        "Du übernimmst zunehmend das Ruder.",
        "Du führst dich schon ziemlich selbst — stark.",
      ],
      mirror: [
        "Du startest noch mit viel Anlehnung — genau da darf man loslaufen. Jeder eigene Schritt zählt schon.",
        "Du tastest dich in die Selbstführung — spür ruhig weiter, was für dich stimmt.",
        "Du stehst schön dazwischen: teils geführt, teils selbst am Steuer. Ein ehrlicher, guter Ort.",
        "Du übernimmst mehr und mehr die Führung über dein Lernen — das trägt dich weit.",
        "Du fühlst dich schon sehr als deine eigene Lehrerin — wunderbar, dass du dir das zutraust.",
      ],
    },
    {
      key: "fehler",
      frage: "Wie gehst du mit Fehlern um?",
      links: "streng",
      rechts: "neugierig",
      start: 45,
      labels: [
        "Fehler sind dir noch unangenehm — verständlich.",
        "Du wirst milder mit dir.",
        "Mal streng, mal neugierig — ganz menschlich.",
        "Du schaust immer öfter neugierig hin.",
        "Fehler sind für dich Einladungen zum Entdecken.",
      ],
      mirror: [
        "Du gehst noch streng mit dir um. Denk dran: hier gibt es kein Falsch, nur dein Üben.",
        "Du wirst schon milder mit dir — das öffnet Raum zum Ausprobieren.",
        "Mal streng, mal neugierig — genau so ist es echt. Du darfst beides fühlen.",
        "Du schaust bei Fehlern immer öfter neugierig hin — das ist die Haltung, die dich wachsen lässt.",
        "Fehler sind für dich schon Experimente statt Urteile — herrlich, dieser freie Blick.",
      ],
    },
    {
      key: "tempo",
      frage: "In welchem Tempo möchtest du lernen?",
      links: "geführt",
      rechts: "im eigenen Rhythmus",
      start: 55,
      labels: [
        "Du magst noch klare Führung — das gibt Halt.",
        "Du wünschst dir etwas mehr Spielraum.",
        "Ein Mix aus Führung und Freiraum fühlt sich gut an.",
        "Du willst mehr deinen eigenen Takt gehen.",
        "Du lernst am liebsten ganz in deinem Rhythmus.",
      ],
      mirror: [
        "Du magst noch klare Führung — die gibt Sicherheit, und von hier aus wächst dein eigener Takt.",
        "Du wünschst dir etwas mehr Spielraum — ein feines Signal, dass du dir mehr zutraust.",
        "Führung und Freiraum in Balance — ein stimmiger Rhythmus für dich.",
        "Du willst zunehmend deinen eigenen Takt gehen — hör ruhig auf dieses Tempo.",
        "Du lernst am liebsten ganz in deinem Rhythmus — genau so wird Lernen leicht.",
      ],
    },
  ];

  // Ordnet einen 0-100-Wert einer der 5 Stufen zu (0..4).
  function bucket(v) {
    return Math.min(4, Math.floor(v / 20));
  }

  // Scoped Styles — einmal pro Seite injizieren, damit die geteilte
  // styles.css unangetastet bleibt. Alles unter .rs- Präfix.
  function injectStyles() {
    if (document.getElementById("rs-style")) return;
    const css = `
    .rs-wrap{
      /* .game ist im Stylesheet auf height:300px/overflow:hidden fixiert —
         hier bewusst überschreiben: eigener Fluss, kein Nested-Scroll. */
      height:auto!important;overflow:visible!important;background:var(--white)!important;
      box-shadow:0 3px 12px rgba(0,0,0,.10),0 1px 3px rgba(0,0,0,.07)!important;
      border-radius:16px!important;padding:18px 16px 16px;
      display:flex;flex-direction:column;gap:16px;color:var(--ink);
    }
    .rs-head{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;line-height:1.3;color:var(--mint-deep);text-align:center}
    .rs-hint{font-size:12px;color:var(--light);text-align:center;margin-top:-10px}
    .rs-item{display:flex;flex-direction:column;gap:9px}
    .rs-q{font-family:'Syne',sans-serif;font-weight:700;font-size:14.5px;line-height:1.35;color:var(--ink)}
    .rs-ends{display:flex;justify-content:space-between;font-size:11px;color:var(--light);font-weight:500}
    .rs-track{position:relative;height:26px;display:flex;align-items:center}
    .rs-range{
      -webkit-appearance:none;appearance:none;width:100%;height:8px;border-radius:50px;margin:0;
      background:linear-gradient(90deg,var(--rose1),var(--rose2));
      outline:none;cursor:pointer;position:relative;z-index:2;
    }
    .rs-range::-webkit-slider-thumb{
      -webkit-appearance:none;appearance:none;width:26px;height:26px;border-radius:50%;
      background:var(--rose5);border:3px solid #fff;cursor:pointer;
      box-shadow:0 2px 8px rgba(196,86,111,.5);transition:transform .18s cubic-bezier(.34,1.56,.64,1);
    }
    .rs-range::-webkit-slider-thumb:active{transform:scale(1.18)}
    .rs-range::-moz-range-thumb{
      width:26px;height:26px;border-radius:50%;background:var(--rose5);border:3px solid #fff;cursor:pointer;
      box-shadow:0 2px 8px rgba(196,86,111,.5);
    }
    .rs-range::-moz-range-progress{background:var(--rose4);height:8px;border-radius:50px}
    .rs-range::-moz-range-track{background:var(--rose2);height:8px;border-radius:50px}
    .rs-fill{position:absolute;left:0;top:50%;transform:translateY(-50%);height:8px;border-radius:50px;
      background:linear-gradient(90deg,var(--rose4),var(--rose5));z-index:1;transition:width .5s cubic-bezier(.16,1,.3,1);pointer-events:none}
    .rs-live{font-size:12.5px;line-height:1.4;color:var(--mid);min-height:18px;
      opacity:0;transform:translateY(4px);transition:opacity .35s ease,transform .35s ease}
    .rs-live.in{opacity:1;transform:none}
    .rs-cta{
      width:100%;background:var(--rose5);color:#fff;border:none;border-radius:50px;padding:12px;
      font-size:15px;font-weight:500;font-family:inherit;cursor:pointer;
      box-shadow:0 3px 10px rgba(196,86,111,.4);transition:transform .12s ease,opacity .3s ease;
    }
    .rs-cta:active{transform:scale(.99)}
    .rs-cta:disabled{opacity:.55;cursor:default}
    .rs-mirror{display:flex;flex-direction:column;gap:12px}
    .rs-line{
      display:flex;flex-direction:column;gap:3px;padding:11px 13px;border-radius:14px;
      background:var(--mint-soft);border-left:3px solid var(--mint-deep);
      opacity:0;transform:translateY(8px);transition:opacity .5s cubic-bezier(.16,1,.3,1),transform .5s cubic-bezier(.16,1,.3,1);
    }
    .rs-line.in{opacity:1;transform:none}
    .rs-line b{font-family:'Syne',sans-serif;font-weight:700;font-size:12.5px;color:var(--mint-deep)}
    .rs-line span{font-size:13px;line-height:1.45;color:var(--ink)}
    .rs-close{font-size:12.5px;color:var(--rose5);text-align:center;font-weight:500;
      opacity:0;transition:opacity .5s ease}
    .rs-close.in{opacity:1}
    `;
    const el = document.createElement("style");
    el.id = "rs-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  window.gameReflexSlider = function (host) {
    injectStyles();
    host.classList.add("rs-wrap");
    host.innerHTML = "";

    // Kopf
    const head = document.createElement("div");
    head.className = "rs-head";
    head.textContent = "Kurz innehalten: Wo stehst du gerade?";
    const hint = document.createElement("div");
    hint.className = "rs-hint";
    hint.textContent = "Schieb jeden Regler dahin, wo es sich für dich stimmig anfühlt.";
    host.appendChild(head);
    host.appendChild(hint);

    const values = {};

    // Slider bauen
    ITEMS.forEach((item) => {
      values[item.key] = item.start;

      const wrap = document.createElement("div");
      wrap.className = "rs-item";

      const q = document.createElement("div");
      q.className = "rs-q";
      q.textContent = item.frage;

      const ends = document.createElement("div");
      ends.className = "rs-ends";
      ends.innerHTML = `<span>${item.links}</span><span>${item.rechts}</span>`;

      const track = document.createElement("div");
      track.className = "rs-track";
      const fill = document.createElement("div");
      fill.className = "rs-fill";
      const range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      range.max = "100";
      range.className = "rs-range";
      range.setAttribute("aria-label", item.frage);
      track.appendChild(fill);
      track.appendChild(range);

      const live = document.createElement("div");
      live.className = "rs-live";

      const paint = (v) => {
        values[item.key] = v;
        fill.style.width = v + "%";
        const txt = item.labels[bucket(v)];
        if (live.textContent !== txt) {
          // Live-Label sanft wechseln: raus -> reflow -> rein.
          live.classList.remove("in");
          void live.offsetHeight;
          live.textContent = txt;
          live.classList.add("in");
        }
      };

      range.addEventListener("input", () => paint(+range.value));

      wrap.appendChild(q);
      wrap.appendChild(ends);
      wrap.appendChild(track);
      wrap.appendChild(live);
      host.appendChild(wrap);

      // Startwert -> reflow -> Endwert: die Fill-Bar wächst animiert ein.
      range.value = String(item.start);
      fill.style.width = "0%";
      void fill.offsetHeight;
      paint(item.start);
    });

    const cta = document.createElement("button");
    cta.className = "rs-cta";
    cta.type = "button";
    cta.textContent = "Bestätigen";
    host.appendChild(cta);

    return new Promise((resolve) => {
      // Dispose-Sicherheit: wird der host aus dem DOM entfernt (z. B.
      // "überspringen"), feuert coaching.js playGame() ein "gamedispose"-Event
      // direkt vor host.remove(). Dann keine Timer mehr auf abgehängtem DOM.
      var disposed = false;
      var timers = [];
      var onConfirmRef = null;
      host.addEventListener("gamedispose", function () {
        disposed = true;
        timers.forEach(clearTimeout);
        if (onConfirmRef) {
          try { cta.removeEventListener("click", onConfirmRef); } catch (e) {}
          onConfirmRef = null;
        }
      }, { once: true });

      cta.addEventListener("click", onConfirmRef = function onConfirm() {
        cta.removeEventListener("click", onConfirm);
        onConfirmRef = null;
        if (disposed || !host.isConnected) return;
        cta.disabled = true;
        cta.style.display = "none";
        head.textContent = "Danke, dass du ehrlich hingeschaut hast.";
        hint.style.display = "none";

        // Slider einfrieren (nur noch Spiegel, keine Änderung mehr).
        host.querySelectorAll(".rs-range").forEach((r) => (r.disabled = true));

        // Warme, spiegelnde Rückmeldung je Position — zeitversetzt eingeblendet.
        const mirror = document.createElement("div");
        mirror.className = "rs-mirror";
        host.appendChild(mirror);

        ITEMS.forEach((item, i) => {
          const line = document.createElement("div");
          line.className = "rs-line";
          const b = document.createElement("b");
          b.textContent = item.links + " ↔ " + item.rechts;
          const span = document.createElement("span");
          span.textContent = item.mirror[bucket(values[item.key])];
          line.appendChild(b);
          line.appendChild(span);
          mirror.appendChild(line);
          void line.offsetHeight;
          timers.push(setTimeout(() => {
            if (disposed || !host.isConnected) return;
            line.classList.add("in");
          }, 120 + i * 320));
        });

        const close = document.createElement("div");
        close.className = "rs-close";
        close.textContent = "Kein Richtig, kein Falsch — nur dein ehrlicher Standort. 🌱";
        host.appendChild(close);
        void close.offsetHeight;
        const closeDelay = 120 + ITEMS.length * 320 + 200;
        timers.push(setTimeout(() => {
          if (disposed || !host.isConnected) return;
          close.classList.add("in");
        }, closeDelay));

        // Promise auflösen, wenn der Spiegel fertig eingeblendet ist.
        timers.push(setTimeout(() => { if (disposed || !host.isConnected) return; resolve({ ...values }); }, closeDelay + 500));
      });
    });
  };
})();
