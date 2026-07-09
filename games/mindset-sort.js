/* ============================================================================
 * MAIA · Mini-Spiel-Modul  ·  MINDSET-SORT
 * ----------------------------------------------------------------------------
 * Coaching-Unit „Werde dein Lehrer" (autodidaktisches Lernen).
 * Die Lernerin (Lena) sortiert Aussagen in „Fester Blick" (fixed mindset)
 * vs. „Wachstums-Blick" (growth mindset) – per Tap ODER Drag.
 * Kein hartes „falsch": sanftes Erkennen statt Verurteilen, ganz im Geist
 * der Unit. Growth Mindset = Fundament, um dein eigener Lehrer zu werden.
 *
 * VERTRAG:  window.gameMindsetSort = function(host){ ...; return Promise }
 *   host  = leeres DIV (Klasse .game), bereits im Chat, feste Höhe, mint-Karte.
 *   Auflösung: { correct, total }  → damit der Chat weiterläuft.
 *
 * Keine externen Libraries. Alles inline. Mobile-first (≤400px).
 * ==========================================================================*/
(function () {
  "use strict";

  // Kartendeck: label = Aussage, growth = true|false (Zielspalte).
  // insight = sanfter, wertschätzender Ein-Satz-Impuls pro Zuordnung.
  var CARDS = [
    { t: "Talent hat man oder nicht.",              growth: false,
      fix: "Klingt endgültig, oder? Als wär die Tür schon zu.",
      grow: "Genau – Können wächst, es ist kein fertiges Geschenk." },
    { t: "Fehler zeigen mir, wo ich üben kann.",    growth: true,
      fix: "Hm – ein Fehler ist hier ja eher ein Wegweiser als ein Urteil.",
      grow: "Ja! Fehler sind Hinweise, keine Endstationen." },
    { t: "Wenn's schwer ist, bin ich schlecht.",    growth: false,
      fix: "Merkst du's? Schwer heißt oft nur: hier wächst gerade was.",
      grow: "Schwer heißt eher: hier lerne ich gerade wirklich etwas." },
    { t: "Noch nicht heißt nicht nie.",             growth: true,
      fix: "Dieses kleine „noch nicht“ hält die Tür weit offen.",
      grow: "Schön – „noch nicht“ ist der Satz des Wachstums." },
    { t: "Andere sind einfach besser.",             growth: false,
      fix: "Vielleicht sind sie nur weiter im Üben – nicht anders geboren.",
      grow: "Andere hatten oft nur mehr Wiederholungen, nicht mehr Talent." },
    { t: "Übung formt Können.",                     growth: true,
      fix: "Hier steckt schon der ganze Wachstums-Blick drin.",
      grow: "Genau das ist das Fundament: Üben formt dich." }
  ];

  window.gameMindsetSort = function (host) {
    return new Promise(function (resolve) {

      /* ---- lokaler Style, gescopt via [data-ms] ------------------------- */
      var CSS = "" +
      "[data-ms]{position:absolute;inset:0;display:flex;flex-direction:column;" +
        "font-family:'DM Sans',system-ui,sans-serif;color:var(--ink);" +
        "background:var(--white,#fff);border-radius:16px;overflow:hidden}" +
      "[data-ms] *{box-sizing:border-box}" +
      "[data-ms] .ms-head{flex:none;text-align:center;padding:10px 12px 4px}" +
      "[data-ms] .ms-title{font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:var(--mint-deep)}" +
      "[data-ms] .ms-count{font-size:11px;color:var(--light);margin-top:1px}" +
      /* Bühne für die aktuelle Karte */
      "[data-ms] .ms-stage{flex:1;position:relative;display:flex;align-items:center;justify-content:center;padding:4px 10px}" +
      "[data-ms] .ms-card{position:relative;max-width:88%;background:#fff;border:1.5px solid var(--rose2);" +
        "border-radius:14px;padding:14px 16px;font-size:15px;line-height:1.35;font-weight:500;text-align:center;" +
        "box-shadow:0 4px 14px rgba(0,0,0,.10);cursor:grab;user-select:none;touch-action:none;" +
        "transition:transform .32s cubic-bezier(.16,1,.3,1),opacity .32s ease}" +
      "[data-ms] .ms-card.drag{cursor:grabbing;transition:none;box-shadow:0 8px 22px rgba(0,0,0,.16)}" +
      "[data-ms] .ms-hint{font-size:11px;color:var(--light);margin-top:7px;font-weight:400}" +
      /* Zwei Zonen */
      "[data-ms] .ms-zones{flex:none;display:flex;gap:8px;padding:8px 10px 10px}" +
      "[data-ms] .ms-zone{flex:1;border-radius:13px;padding:11px 8px;text-align:center;cursor:pointer;" +
        "border:1.5px dashed transparent;transition:transform .15s ease,box-shadow .2s ease,background .2s ease}" +
      "[data-ms] .ms-zone:active{transform:scale(.98)}" +
      "[data-ms] .ms-zone.fixed{background:var(--rose1);color:var(--rose5)}" +
      "[data-ms] .ms-zone.growth{background:var(--mint-soft);color:var(--mint-deep)}" +
      "[data-ms] .ms-zone.hot.fixed{border-color:var(--rose4);box-shadow:0 0 0 3px rgba(224,124,148,.25)}" +
      "[data-ms] .ms-zone.hot.growth{border-color:var(--mint-deep);box-shadow:0 0 0 3px rgba(68,136,95,.25)}" +
      "[data-ms] .ms-zico{font-size:19px;line-height:1}" +
      "[data-ms] .ms-zlbl{font-family:'Syne',sans-serif;font-weight:700;font-size:12.5px;margin-top:3px}" +
      "[data-ms] .ms-zsub{font-size:10px;opacity:.75;margin-top:1px}" +
      /* Feedback-Toast */
      "[data-ms] .ms-fb{position:absolute;left:10px;right:10px;bottom:78px;z-index:6;" +
        "background:#fff;border-radius:13px;padding:10px 13px;font-size:12.5px;line-height:1.4;" +
        "box-shadow:0 6px 18px rgba(0,0,0,.15);opacity:0;transform:translateY(10px);" +
        "transition:opacity .3s ease,transform .3s cubic-bezier(.16,1,.3,1);pointer-events:none;text-align:center}" +
      "[data-ms] .ms-fb.in{opacity:1;transform:none}" +
      "[data-ms] .ms-fb b{color:var(--mint-deep)}" +
      /* Ende-Screen */
      "[data-ms] .ms-end{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;" +
        "align-items:center;justify-content:center;text-align:center;padding:18px 22px;gap:6px;" +
        "background:var(--white,#fff);opacity:0;transition:opacity .4s ease}" +
      "[data-ms] .ms-end.in{opacity:1}" +
      "[data-ms] .ms-end .ms-em{font-size:34px}" +
      "[data-ms] .ms-end h3{font-family:'Syne',sans-serif;font-weight:800;font-size:17px;color:var(--mint-deep)}" +
      "[data-ms] .ms-end p{font-size:13px;color:var(--mid);line-height:1.45;max-width:280px}" +
      "[data-ms] .ms-cta{margin-top:6px;background:var(--rose5);color:#fff;border:none;border-radius:50px;" +
        "padding:10px 22px;font-size:14px;font-weight:500;font-family:inherit;cursor:pointer;" +
        "box-shadow:0 3px 10px rgba(196,86,111,.4)}" +
      "[data-ms] .ms-cta:active{transform:scale(.98)}";

      /* ---- DOM aufbauen ------------------------------------------------- */
      host.innerHTML = "";
      var root = document.createElement("div");
      root.setAttribute("data-ms", "");
      var style = document.createElement("style");
      style.textContent = CSS;
      root.appendChild(style);

      root.insertAdjacentHTML("beforeend",
        '<div class="ms-head">' +
          '<div class="ms-title">Fester Blick oder Wachstums-Blick?</div>' +
          '<div class="ms-count" data-count></div>' +
        '</div>' +
        '<div class="ms-stage" data-stage></div>' +
        '<div class="ms-zones">' +
          '<div class="ms-zone fixed" data-zone="fixed">' +
            '<div class="ms-zico">🔒</div><div class="ms-zlbl">Fester Blick</div>' +
            '<div class="ms-zsub">„so bin ich halt"</div></div>' +
          '<div class="ms-zone growth" data-zone="growth">' +
            '<div class="ms-zico">🌱</div><div class="ms-zlbl">Wachstums-Blick</div>' +
            '<div class="ms-zsub">„ich kann wachsen"</div></div>' +
        '</div>');

      host.appendChild(root);

      var stage   = root.querySelector("[data-stage]");
      var counter = root.querySelector("[data-count]");
      var zoneFixed  = root.querySelector('[data-zone="fixed"]');
      var zoneGrowth = root.querySelector('[data-zone="growth"]');

      var i = 0, correct = 0, total = CARDS.length;
      var busy = false;

      // ---- Dispose-Sicherheit: playGame() feuert "gamedispose" auf host,
      // kurz bevor der Host aus dem DOM entfernt wird. Danach dürfen keine
      // Timer mehr auf einem abgetrennten DOM feuern.
      var disposed = false;
      var timers = [];
      host.addEventListener("gamedispose", function () {
        disposed = true;
        timers.forEach(clearTimeout);
      }, { once: true });

      /* ---- Feedback-Toast ---------------------------------------------- */
      function toast(html, cb) {
        var fb = document.createElement("div");
        fb.className = "ms-fb";
        fb.innerHTML = html;
        root.appendChild(fb);
        void fb.offsetHeight;          // Reflow -> Transition greift
        fb.classList.add("in");
        timers.push(setTimeout(function () {
          if (disposed || !host.isConnected) return;
          fb.classList.remove("in");
          timers.push(setTimeout(function () {
            if (disposed || !host.isConnected) return;
            fb.remove(); if (cb) cb();
          }, 320));
        }, 1450));
      }

      /* ---- eine Karte zeigen ------------------------------------------- */
      function showCard() {
        counter.textContent = "Aussage " + (i + 1) + " von " + total;
        var data = CARDS[i];

        var card = document.createElement("div");
        card.className = "ms-card";
        card.innerHTML = data.t + '<div class="ms-hint">Tippe eine Seite – oder zieh mich hin.</div>';
        // Startzustand -> Reflow -> Einblenden (kein Teleport)
        card.style.opacity = "0";
        card.style.transform = "translateY(14px) scale(.96)";
        stage.appendChild(card);
        void card.offsetHeight;
        card.style.opacity = "1";
        card.style.transform = "translateY(0) scale(1)";

        wireCard(card, data);
      }

      /* ---- Zuordnung auflösen ------------------------------------------ */
      function place(card, data, choiceGrowth) {
        if (busy) return;
        busy = true;
        card.querySelector(".ms-hint") && (card.querySelector(".ms-hint").style.display = "none");

        var right = (choiceGrowth === data.growth);
        if (right) correct++;

        // Karte sanft Richtung gewählter Zone schieben (kein hartes Snap)
        card.classList.remove("drag");
        card.style.transition = "transform .34s cubic-bezier(.16,1,.3,1),opacity .34s ease";
        void card.offsetHeight;
        card.style.transform = "translate(" + (choiceGrowth ? 46 : -46) + "%, 60px) scale(.7)";
        card.style.opacity = "0";

        // Zielzone kurz aufleuchten
        var zone = choiceGrowth ? zoneGrowth : zoneFixed;
        zone.classList.add("hot");
        timers.push(setTimeout(function () {
          if (disposed || !host.isConnected) return;
          zone.classList.remove("hot");
        }, 500));

        // Sanftes Feedback: bei „passt zusammen" bestätigen,
        // sonst NICHT „falsch", sondern zum Umdeuten einladen.
        var isGrowthStatement = data.growth;
        var msg;
        if (right) {
          msg = "<b>Erkannt.</b> " + (isGrowthStatement ? data.grow : data.fix);
        } else if (isGrowthStatement) {
          // Wachstums-Satz landete im festen Blick -> sanft öffnen
          msg = "Schau nochmal mit mir: " + data.grow;
        } else {
          // Fester-Blick-Satz landete im Wachstum -> würdigen, dann einordnen
          msg = "Schöner Impuls – " + data.fix;
        }

        timers.push(setTimeout(function () {
          if (disposed || !host.isConnected) return;
          card.remove();
          toast(msg, function () {
            if (disposed || !host.isConnected) return;
            busy = false;
            i++;
            if (i < total) showCard(); else finish();
          });
        }, 340));
      }

      /* ---- Tap + Drag verdrahten --------------------------------------- */
      function wireCard(card, data) {
        // Tap auf Zone
        var tapFixed  = function () { if (!busy) place(card, data, false); };
        var tapGrowth = function () { if (!busy) place(card, data, true); };
        zoneFixed.onclick  = tapFixed;
        zoneGrowth.onclick = tapGrowth;

        // Drag (Pointer Events – deckt Maus + Touch ab)
        var dragging = false, startX = 0, startY = 0, moved = false;

        function zoneUnder(clientX, clientY) {
          var el = document.elementFromPoint(clientX, clientY);
          while (el && el !== root) {
            if (el.dataset && el.dataset.zone) return el.dataset.zone;
            el = el.parentElement;
          }
          return null;
        }
        function hover(clientX, clientY) {
          var z = zoneUnder(clientX, clientY);
          zoneFixed.classList.toggle("hot", z === "fixed");
          zoneGrowth.classList.toggle("hot", z === "growth");
        }

        function down(e) {
          if (busy) return;
          dragging = true; moved = false;
          startX = e.clientX; startY = e.clientY;
          card.classList.add("drag");
          card.setPointerCapture && card.setPointerCapture(e.pointerId);
        }
        function move(e) {
          if (!dragging) return;
          var dx = e.clientX - startX, dy = e.clientY - startY;
          if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
          card.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (dx * 0.03) + "deg)";
          hover(e.clientX, e.clientY);
        }
        function up(e) {
          if (!dragging) return;
          dragging = false;
          card.classList.remove("drag");
          zoneFixed.classList.remove("hot");
          zoneGrowth.classList.remove("hot");
          var z = zoneUnder(e.clientX, e.clientY);
          if (moved && (z === "fixed" || z === "growth")) {
            place(card, data, z === "growth");
          } else if (!moved) {
            // reiner Tap auf die Karte -> sanft zurückfedern, Zonen-Tap nutzen
            card.style.transition = "transform .3s cubic-bezier(.16,1,.3,1)";
            void card.offsetHeight;
            card.style.transform = "translateY(0) scale(1)";
          } else {
            // losgelassen daneben -> zurückfedern
            card.style.transition = "transform .3s cubic-bezier(.16,1,.3,1)";
            void card.offsetHeight;
            card.style.transform = "translateY(0) scale(1)";
          }
        }

        card.addEventListener("pointerdown", down);
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerup", up);
        card.addEventListener("pointercancel", up);
      }

      /* ---- Abschluss: 1 Satz Erkenntnis -------------------------------- */
      function finish() {
        zoneFixed.onclick = null;
        zoneGrowth.onclick = null;

        var end = document.createElement("div");
        end.className = "ms-end";
        end.innerHTML =
          '<div class="ms-em">🌱</div>' +
          '<h3>' + correct + ' von ' + total + ' erkannt</h3>' +
          '<p>Deine Erkenntnis: Ein fester Blick sagt „so bin ich" – ein Wachstums-Blick sagt „noch nicht". ' +
          'Genau dieser Blick macht dich zu deinem eigenen Lehrer.</p>' +
          '<button class="ms-cta" data-done>Verstanden 💛</button>';
        root.appendChild(end);
        void end.offsetHeight;
        end.classList.add("in");

        var done = end.querySelector("[data-done]");
        var finished = false;
        function doDone() {
          if (finished) return;
          finished = true;
          resolve({ correct: correct, total: total });
        }
        done.onclick = doDone;
      }

      /* ---- Los ---------------------------------------------------------- */
      showCard();
    });
  };
})();
