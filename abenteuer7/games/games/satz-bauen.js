/*
 * Mini-Spiel: SATZ BAUEN — "Werde dein Lehrer"
 * ------------------------------------------------------------------
 * Vertrag:  window.gameSatzBauen = function(host){ return Promise }
 *   host  = leeres DIV (Klasse .game), weiße Karte auf Mint.
 *   Wird IN host gerendert. Promise löst mit {done:true} auf,
 *   sobald alle Kern-Sätze korrekt zusammengesetzt sind.
 *
 * Idee: Durcheinandergewürfelte Wort-Chips antippen, um sie der Reihe
 * nach in die Ziel-Slots zu legen. Richtige Reihenfolge rastet ein und
 * leuchtet sanft; danach erscheint der fertige Satz groß (Syne).
 * Aktives Zusammensetzen verankert die Leitbotschaft tiefer als Lesen.
 *
 * Mobile-first (~300–340px), kein Nested-Scroll, keine externen Libs.
 * Alle Styles sind auf .sb- gescoped, um vorhandenes .game-CSS nicht zu stören.
 */
window.gameSatzBauen = function (host) {
  return new Promise((resolve) => {
    // ---- Kern-Sätze (Leitbotschaften der Unit) ----
    const ROUNDS = [
      { words: ["Werde", "dein", "eigener", "Lehrer"] },
      { words: ["Es gibt", "keinen", "Misserfolg", "nur", "dein", "Experiment"] },
    ];

    // ---- Scoped Styles (einmalig injizieren) ----
    if (!document.getElementById("sb-style")) {
      const st = document.createElement("style");
      st.id = "sb-style";
      st.textContent = `
      .sb{display:flex;flex-direction:column;gap:14px;padding:16px 15px 17px;
        font-family:'DM Sans',system-ui,sans-serif;color:var(--ink)}
      .sb-step{font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;
        color:var(--mint-deep);align-self:flex-start}
      .sb-hint{font-size:13px;color:var(--mid);line-height:1.35;margin:-6px 0 0}
      /* Ziel-Slots: Satz entsteht hier */
      .sb-target{display:flex;flex-wrap:wrap;gap:7px;min-height:46px;align-items:center;
        padding:10px;border-radius:14px;background:var(--mint-soft);
        box-shadow:inset 0 0 0 1.5px rgba(68,136,95,.16);transition:box-shadow .4s ease}
      .sb-slot{min-width:30px;min-height:30px;border-radius:10px;
        border:1.5px dashed rgba(68,136,95,.35);flex:0 0 auto}
      .sb-slot.filled{border:none}
      .sb-target.solved{box-shadow:inset 0 0 0 1.5px var(--mint-deep),0 0 0 3px rgba(195,235,216,.55)}
      /* Vorrats-Chips */
      .sb-bank{display:flex;flex-wrap:wrap;gap:8px;min-height:40px}
      .sb-chip{background:#fff;color:var(--rose5);border:none;border-radius:50px;
        padding:9px 15px;font-size:14px;font-weight:500;font-family:inherit;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.11);will-change:transform;
        transition:transform .28s cubic-bezier(.16,1,.3,1),opacity .25s ease,box-shadow .2s ease}
      .sb-chip:active{transform:scale(.94)}
      .sb-chip.placed{color:var(--mint-deep);box-shadow:0 1px 4px rgba(0,0,0,.1)}
      .sb-chip.pop{animation:sbPop .34s cubic-bezier(.16,1,.3,1)}
      .sb-chip.wrong{animation:sbShake .34s ease}
      @keyframes sbPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
      @keyframes sbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}
        75%{transform:translateX(5px)}}
      /* Fertiger Satz groß */
      .sb-done{font-family:'Syne',sans-serif;font-weight:800;font-size:22px;line-height:1.25;
        color:var(--ink);opacity:0;transform:translateY(10px);
        transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}
      .sb-done.in{opacity:1;transform:translateY(0)}
      .sb-done b{color:var(--mint-deep)}
      .sb-cta{align-self:stretch;background:var(--rose5);color:#fff;border:none;border-radius:50px;
        padding:12px;font-size:15px;font-weight:500;font-family:inherit;cursor:pointer;
        box-shadow:0 3px 10px rgba(196,86,111,.4);opacity:0;transform:translateY(8px);
        transition:opacity .4s ease,transform .4s ease}
      .sb-cta.in{opacity:1;transform:translateY(0)}
      .sb-reset{align-self:flex-start;background:none;border:none;color:var(--light);
        font-family:inherit;font-size:12px;cursor:pointer;padding:2px 0;text-decoration:underline}
      `;
      document.head.appendChild(st);
    }

    // ---- Grundgerüst ----
    const root = document.createElement("div");
    root.className = "sb";
    root.innerHTML = `
      <div class="sb-step">Bring die Wörter in die richtige Reihenfolge</div>
      <div class="sb-target" role="list" aria-label="Satz"></div>
      <div class="sb-hint"></div>
      <div class="sb-bank" role="list" aria-label="Wörter"></div>
      <button class="sb-reset" type="button">Neu mischen</button>
    `;
    host.appendChild(root);

    const targetEl = root.querySelector(".sb-target");
    const bankEl = root.querySelector(".sb-bank");
    const hintEl = root.querySelector(".sb-hint");
    const resetEl = root.querySelector(".sb-reset");

    let ri = 0; // aktuelle Runde

    const shuffle = (a) => {
      const b = a.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      // sicherstellen, dass es nicht zufällig schon korrekt liegt
      if (b.every((w, i) => w === a[i]) && b.length > 1) return shuffle(a);
      return b;
    };

    function renderRound() {
      const round = ROUNDS[ri];
      const solution = round.words;
      let next = 0; // Index des als Nächstes erwarteten Slots

      hintEl.textContent =
        ri === 0
          ? "Tipp: Es beginnt mit einer Aufforderung an dich."
          : "Tipp: Kein Scheitern — nur ein Versuch.";

      // Ziel-Slots (leer)
      targetEl.className = "sb-target";
      targetEl.innerHTML = solution
        .map(() => `<span class="sb-slot" role="listitem"></span>`)
        .join("");
      const slots = Array.from(targetEl.querySelectorAll(".sb-slot"));

      // Vorrats-Chips (gemischt)
      bankEl.innerHTML = "";
      shuffle(solution).forEach((word) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "sb-chip pop";
        chip.textContent = word;
        chip.dataset.word = word;
        chip.setAttribute("role", "listitem");
        chip.addEventListener("click", () => onPick(chip));
        bankEl.appendChild(chip);
      });

      function onPick(chip) {
        if (chip.classList.contains("placed")) return;
        const expected = solution[next];
        if (chip.dataset.word !== expected) {
          // Falsches Wort: kurz wackeln, kein Fortschritt
          chip.classList.remove("wrong");
          void chip.offsetHeight;
          chip.classList.add("wrong");
          return;
        }
        // Richtig: Chip in den Slot einrasten
        const slot = slots[next];
        chip.classList.add("placed");
        chip.classList.remove("pop");
        slot.classList.add("filled");
        // Chip physisch in den Slot verschieben (rastet ein)
        void chip.offsetHeight;
        slot.appendChild(chip);
        next++;

        if (next === solution.length) solveRound(solution);
      }
    }

    function solveRound(solution) {
      // sanftes Leuchten
      targetEl.classList.add("solved");
      resetEl.style.display = "none";

      // Fertiger Satz groß (Syne), Kernwörter hervorgehoben
      const emphasis = ri === 0 ? ["Lehrer"] : ["Misserfolg", "Experiment"];
      const pretty = solution
        .map((w) => (emphasis.includes(w) ? `<b>${w}</b>` : w))
        .join(" ");

      const done = document.createElement("div");
      done.className = "sb-done";
      done.textContent = ""; // vermeiden von HTML-Flash
      done.innerHTML = `„${pretty}"`;
      root.appendChild(done);
      void done.offsetHeight;
      done.classList.add("in");

      const last = ri === ROUNDS.length - 1;
      const cta = document.createElement("button");
      cta.type = "button";
      cta.className = "sb-cta";
      cta.textContent = last ? "Verinnerlicht ✓" : "Nächster Satz";
      root.appendChild(cta);
      void cta.offsetHeight;
      cta.classList.add("in");

      cta.addEventListener("click", () => {
        if (last) {
          resolve({ done: true });
          return;
        }
        // nächste Runde vorbereiten
        done.remove();
        cta.remove();
        resetEl.style.display = "";
        ri++;
        renderRound();
      });
    }

    resetEl.addEventListener("click", () => renderRound());

    renderRound();
  });
};
