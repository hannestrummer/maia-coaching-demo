/* prinzipien-match.js — eigenständiges Mini-Spiel-Modul für die Coaching-Unit
   „Werde dein Lehrer" (Lernerin: Lena). Keine externen Libs.

   Vertrag:
     window.gamePrinzipienMatch = function(host){ return Promise }
   host = leeres DIV im Chat (Klasse `game`, weiße Karte auf Mint).
   Rendert IN host. Promise löst mit { pairs } auf, wenn alle drei
   Paare verbunden sind.

   Spielidee (Tap-to-Match): links „Loslassen"-Karten, rechts die
   „Dafür"-Prinzipien. Erst eine linke Karte antippen, dann die passende
   rechte. Richtig → sanftes Aufleuchten + Zusammenrücken; falsch →
   kurzes Wackeln, kein Strafgefühl. Am Ende: die drei Sätze schön
   zusammengesetzt.

   Verankert fest die drei Leitprinzipien:
     RICHTIG/FALSCH  ↔ ÜBEN
     WICHTIG/UNWICHTIG ↔ BEOBACHTUNG
     MISSERFOLG      ↔ EXPERIMENT
*/
(function () {
  "use strict";

  // Die drei Paare + der Satz, der beim Match zusammenwächst.
  const PAIRS = [
    {
      id: "ueben",
      left: "kein RICHTIG / FALSCH",
      right: "dein ÜBEN",
      sentence: 'Es gibt kein <b>RICHTIG / FALSCH</b> — nur dein <em>ÜBEN</em>.',
    },
    {
      id: "beobachtung",
      left: "kein WICHTIG / UNWICHTIG",
      right: "deine BEOBACHTUNG",
      sentence: 'Es gibt kein <b>WICHTIG / UNWICHTIG</b> — nur deine <em>BEOBACHTUNG</em>.',
    },
    {
      id: "experiment",
      left: "kein MISSERFOLG",
      right: "dein EXPERIMENT",
      sentence: 'Es gibt keinen <b>MISSERFOLG</b> — nur dein <em>EXPERIMENT</em>.',
    },
  ];

  const shuffle = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };

  // Eigene, gescopte Styles — Modul bleibt unabhängig vom Stylesheet.
  function injectStyles() {
    if (document.getElementById("pm-styles")) return;
    const css = `
    .pm{position:relative;display:flex;flex-direction:column;height:320px;
      background:var(--mint-soft,#e8f6f0);border-radius:16px;overflow:hidden;
      box-shadow:inset 0 0 0 1px rgba(0,0,0,.05);
      font-family:'DM Sans',system-ui,sans-serif;color:var(--ink,#15181b);
      -webkit-tap-highlight-color:transparent}
    .pm-head{flex:none;padding:11px 14px 8px;text-align:center}
    .pm-head b{font-family:'Syne',sans-serif;font-weight:700;font-size:13.5px;
      color:var(--mint-deep,#44885f);display:block;line-height:1.25}
    .pm-head span{font-size:11px;color:var(--mid,#4b5560);display:block;margin-top:2px}
    .pm-board{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;
      padding:2px 12px 12px;min-height:0}
    .pm-col{display:flex;flex-direction:column;gap:8px;justify-content:center;min-width:0}
    .pm-card{position:relative;background:#fff;border:none;border-radius:13px;
      padding:11px 10px;font-family:inherit;font-size:12.5px;font-weight:500;
      line-height:1.25;color:var(--ink,#15181b);cursor:pointer;text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,.09);transition:transform .28s cubic-bezier(.34,1.56,.64,1),
      box-shadow .28s ease,opacity .3s ease,background .28s ease,color .28s ease;
      will-change:transform;-webkit-appearance:none}
    .pm-card small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.06em;
      text-transform:uppercase;margin-bottom:3px;opacity:.55}
    .pm-l small{color:var(--rose5,#c4566f)}
    .pm-r small{color:var(--mint-deep,#44885f)}
    .pm-card.sel{transform:translateY(-2px) scale(1.03);
      box-shadow:0 4px 16px rgba(196,86,111,.28),0 0 0 2px var(--rose4,#e07c94)}
    .pm-card.matched{background:var(--mint,#C3EBD8);color:var(--mint-deep,#44885f);
      cursor:default;box-shadow:0 0 0 2px rgba(68,136,95,.35),0 2px 10px rgba(68,136,95,.22)}
    .pm-card.matched small{opacity:.7}
    .pm-card.glow{animation:pm-glow .7s ease-out}
    .pm-card.shake{animation:pm-shake .42s cubic-bezier(.36,.07,.19,.97)}
    .pm-card.gone{opacity:0;transform:scale(.6);pointer-events:none}
    @keyframes pm-glow{0%{box-shadow:0 0 0 2px rgba(68,136,95,.35),0 0 0 rgba(195,235,216,0)}
      45%{box-shadow:0 0 0 2px rgba(68,136,95,.5),0 0 22px 6px rgba(195,235,216,.9)}
      100%{box-shadow:0 0 0 2px rgba(68,136,95,.35),0 2px 10px rgba(68,136,95,.22)}}
    @keyframes pm-shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(3px)}
      30%,50%,70%{transform:translateX(-5px)}40%,60%{transform:translateX(5px)}}
    /* Endkarte: die drei zusammengesetzten Sätze */
    .pm-done{position:absolute;inset:0;background:var(--mint-soft,#e8f6f0);
      display:flex;flex-direction:column;justify-content:center;gap:9px;
      padding:16px 18px;opacity:0;transition:opacity .5s ease;pointer-events:none}
    .pm-done.in{opacity:1;pointer-events:auto}
    .pm-line{background:#fff;border-radius:12px;padding:10px 13px;font-size:13px;
      line-height:1.4;color:var(--ink,#15181b);box-shadow:0 2px 9px rgba(0,0,0,.08);
      opacity:0;transform:translateY(10px);transition:all .5s cubic-bezier(.16,1,.3,1)}
    .pm-line.in{opacity:1;transform:none}
    .pm-line b{color:var(--rose5,#c4566f)}
    .pm-line em{font-style:normal;font-family:'Syne',sans-serif;font-weight:700;
      color:var(--mint-deep,#44885f)}
    .pm-done p{text-align:center;font-family:'Syne',sans-serif;font-weight:700;
      font-size:13px;color:var(--mint-deep,#44885f);opacity:0;transition:opacity .5s ease}
    .pm-done p.in{opacity:1}
    .pm-spark{position:absolute;width:9px;height:9px;border-radius:50%;
      background:var(--rose4,#e07c94);opacity:0;pointer-events:none}
    .pm-spark.go{animation:pm-fly .7s ease-out forwards}
    @keyframes pm-fly{0%{opacity:1;transform:translate(0,0) scale(1)}
      100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3)}}
    `;
    const el = document.createElement("style");
    el.id = "pm-styles";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function sparkle(host, card, timers) {
    const hb = host.getBoundingClientRect();
    const cb = card.getBoundingClientRect();
    const cx = cb.left - hb.left + cb.width / 2;
    const cy = cb.top - hb.top + cb.height / 2;
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span");
      s.className = "pm-spark";
      s.style.left = cx + "px";
      s.style.top = cy + "px";
      s.style.setProperty("--dx", (Math.random() * 70 - 35) + "px");
      s.style.setProperty("--dy", (Math.random() * -50 - 15) + "px");
      s.style.animationDelay = (i * 30) + "ms";
      host.appendChild(s);
      void s.offsetHeight;
      s.classList.add("go");
      timers.push(setTimeout(() => s.remove(), 850));
    }
  }

  window.gamePrinzipienMatch = function (host) {
    return new Promise((resolve) => {
      injectStyles();

      // ---- Dispose-Sicherheit: Host wird beim „Überspringen"/Entfernen aus
      // dem DOM genommen -> keine Timer mehr auf abgetrenntem DOM feuern lassen.
      var disposed = false;
      var timers = [];
      const sleep = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));
      host.addEventListener("gamedispose", function () {
        disposed = true;
        timers.forEach(clearTimeout);
      }, { once: true });

      const leftOrder = shuffle(PAIRS);
      const rightOrder = shuffle(PAIRS);

      host.classList.add("pm");
      host.innerHTML =
        '<div class="pm-head"><b>Verbinde: Loslassen → Dafür</b>' +
        '<span>Tipp links an, dann das passende Prinzip rechts</span></div>' +
        '<div class="pm-board">' +
        '<div class="pm-col pm-left"></div>' +
        '<div class="pm-col pm-right"></div>' +
        "</div>";

      const leftCol = host.querySelector(".pm-left");
      const rightCol = host.querySelector(".pm-right");

      const mkCard = (side, item) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pm-card pm-" + (side === "left" ? "l" : "r");
        b.dataset.id = item.id;
        b.innerHTML =
          "<small>" + (side === "left" ? "loslassen" : "dafür") + "</small>" +
          (side === "left" ? item.left : item.right);
        return b;
      };

      leftOrder.forEach((it) => leftCol.appendChild(mkCard("left", it)));
      rightOrder.forEach((it) => rightCol.appendChild(mkCard("right", it)));

      let selected = null; // linke Karte, die gewählt wurde
      let matched = 0;
      let busy = false;

      function clearSel() {
        if (selected) selected.classList.remove("sel");
        selected = null;
      }

      async function tryMatch(rightCard) {
        busy = true;
        const leftCard = selected;
        const ok = leftCard.dataset.id === rightCard.dataset.id;
        clearSel();

        if (ok) {
          [leftCard, rightCard].forEach((c) => {
            c.classList.remove("sel");
            c.classList.add("matched", "glow");
            c.disabled = true;
          });
          sparkle(host, rightCard, timers);
          await sleep(720);
          if (disposed || !host.isConnected) return;
          matched++;
          if (matched === PAIRS.length) {
            await finish();
            return;
          }
        } else {
          // kein Strafgefühl: kurzes Wackeln, dann zurück
          [leftCard, rightCard].forEach((c) => c.classList.add("shake"));
          await sleep(430);
          if (disposed || !host.isConnected) return;
          [leftCard, rightCard].forEach((c) => c.classList.remove("shake"));
        }
        busy = false;
      }

      function onCard(side, card) {
        if (busy || card.classList.contains("matched")) return;
        if (side === "left") {
          if (selected === card) {
            clearSel();
            return;
          }
          clearSel();
          selected = card;
          card.classList.add("sel");
        } else {
          if (!selected) {
            // sanfter Hinweis: rechte Karte pulsiert kurz
            card.classList.add("shake");
            timers.push(setTimeout(() => {
              if (disposed || !host.isConnected) return;
              card.classList.remove("shake");
            }, 420));
            return;
          }
          tryMatch(card);
        }
      }

      leftCol.querySelectorAll(".pm-card").forEach((c) =>
        c.addEventListener("click", () => onCard("left", c))
      );
      rightCol.querySelectorAll(".pm-card").forEach((c) =>
        c.addEventListener("click", () => onCard("right", c))
      );

      async function finish() {
        const done = document.createElement("div");
        done.className = "pm-done";
        done.innerHTML =
          PAIRS.map((p) => '<div class="pm-line">' + p.sentence + "</div>").join("") +
          "<p>Das sind deine drei Leitsätze. 🌱</p>";
        host.appendChild(done);
        void done.offsetHeight;
        done.classList.add("in");

        const lines = done.querySelectorAll(".pm-line");
        for (let i = 0; i < lines.length; i++) {
          await sleep(i === 0 ? 200 : 260);
          if (disposed || !host.isConnected) return;
          void lines[i].offsetHeight;
          lines[i].classList.add("in");
        }
        const p = done.querySelector("p");
        await sleep(300);
        if (disposed || !host.isConnected) return;
        void p.offsetHeight;
        p.classList.add("in");

        await sleep(700);
        if (disposed || !host.isConnected) return;
        resolve({ pairs: matched });
      }
    });
  };
})();
