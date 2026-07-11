/*
 * Mini-Spiel: BEOBACHTUNG — "Werde dein Lehrer"
 * ------------------------------------------------------------------
 * Vertrag:  window.gameBeobachtung = function(host){ return Promise }
 *   host  = leeres DIV (Klasse .game), weiße Karte auf Mint.
 *   Wird IN host gerendert. Promise löst mit {found:<n>} auf,
 *   sobald alle Runden gefunden sind.
 *
 * Idee: Zwei fast identische, abstrakte SVG-Köpfe mit Haar-Abteilungs-
 * linien liegen übereinander (mobil) bzw. nebeneinander. In der UNTEREN
 * Szene sitzt genau EIN Detail anders — eine Abteilungslinie kippt, ein
 * Segment fehlt, der Scheitelpunkt wandert. Lena tippt die Stelle an.
 * Treffer → sanftes "gut beobachtet!". 3 Runden, steigende Feinheit.
 * Trainiert bewusstes Hinschauen: "nur deine Beobachtung" wird übbar.
 *
 * Nach einigen Sekunden pulst ein weicher Hinweis-Ring an der Zielzone.
 * Zum Schluss: gutes Sehen ist die Grundlage guten Schneidens.
 *
 * Mobile-first (~300–340px), kein Nested-Scroll, reines SVG/DOM/CSS,
 * keine externen Libs. Alle Styles sind auf .bb- gescoped, damit das
 * vorhandene .game-CSS (fixe 300px-Höhe) nicht stört.
 */
window.gameBeobachtung = function (host) {
  return new Promise((resolve) => {
    // ---- Dispose-Sicherheit: playGame() feuert "gamedispose" vor host.remove().
    //      Danach dürfen keine Timer mehr auf abgehängtem DOM feuern. ----
    let disposed = false;
    const timers = [];
    host.addEventListener("gamedispose", function () {
      disposed = true;
      timers.forEach(clearTimeout);
    }, { once: true });

    const NS = "http://www.w3.org/2000/svg";
    // Sichtfenster der Szenen-SVGs (muss zum viewBox unten passen).
    const VB = { x: 10, y: 4, w: 80, h: 78 };
    // SVG-Koordinate → CSS-Prozent innerhalb der Szene.
    const pctX = (x) => ((x - VB.x) / VB.w) * 100;
    const pctY = (y) => ((y - VB.y) / VB.h) * 100;

    // ---- Runden: je ein Unterschied zwischen "links" (Vorlage) und
    //      "rechts" (verändert). target = Klick-Ziel in SVG-Koordinaten
    //      (viewBox 0 0 100 116), r = Trefferradius. hint = kurzer Text. ----
    const ROUNDS = [
      {
        step: "Runde 1 · gut sichtbar",
        hint: "Eine Abteilungslinie sitzt woanders. Wo?",
        // Unterschied: mittlere Scheitel-Linie kippt nach rechts
        diff: (s) => {
          s.parting.setAttribute("d", "M50 22 L50 74");
          if (s === RIGHT) s.parting.setAttribute("d", "M50 22 L62 74");
        },
        target: { x: 56, y: 60 }, r: 20,
      },
      {
        step: "Runde 2 · genauer hinsehen",
        hint: "Ein Haar-Segment fehlt auf einer Seite.",
        // Unterschied: eine der seitlichen Strähnen fehlt rechts
        diff: (s) => {
          s.strand.setAttribute("opacity", s === RIGHT ? "0" : "1");
        },
        target: { x: 74, y: 52 }, r: 18,
      },
      {
        step: "Runde 3 · ganz fein",
        hint: "Nur eine Winzigkeit ist verschoben.",
        // Unterschied: der Scheitelpunkt (Krone) wandert minimal
        diff: (s) => {
          if (s === RIGHT) s.crown.setAttribute("cx", "44");
        },
        target: { x: 44, y: 22 }, r: 14,
      },
    ];

    // ---- Scoped Styles (einmalig injizieren) ----
    if (!document.getElementById("bb-style")) {
      const st = document.createElement("style");
      st.id = "bb-style";
      st.textContent = `
      .bb{display:flex;flex-direction:column;gap:9px;padding:13px 14px 14px;
        font-family:'DM Sans',system-ui,sans-serif;color:var(--ink)}
      .bb-step{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;
        color:var(--mint-deep);align-self:flex-start}
      .bb-hint{font-size:13px;color:var(--mid);line-height:1.3;margin:-3px 0 0}
      /* Fortschrittspunkte */
      .bb-dots{display:flex;gap:6px;align-self:flex-start;margin-top:-1px}
      .bb-dot{width:8px;height:8px;border-radius:50%;background:var(--rose2);
        transition:background .4s ease,transform .4s cubic-bezier(.16,1,.3,1)}
      .bb-dot.on{background:var(--mint-deep);transform:scale(1.12)}
      /* Szenen-Paar: nebeneinander, damit beide in die Karte passen */
      .bb-scenes{display:flex;flex-direction:row;gap:8px;align-items:stretch}
      .bb-scene{position:relative;flex:1 1 0;min-width:0;background:var(--mint-soft);
        border-radius:14px;box-shadow:inset 0 0 0 1.5px rgba(68,136,95,.14);overflow:hidden}
      .bb-scene svg{display:block;width:100%;height:auto}
      .bb-tag{position:absolute;top:6px;left:8px;font-size:9.5px;font-weight:600;
        letter-spacing:.03em;color:var(--mint-deep);opacity:.75;pointer-events:none;
        max-width:calc(100% - 16px)}
      /* rechte (aktive) Szene ist klickbar */
      .bb-scene.pick{cursor:crosshair}
      .bb-scene.pick svg{touch-action:manipulation}
      /* Treffer-Ring */
      .bb-ring{position:absolute;border-radius:50%;border:2.5px solid var(--mint-deep);
        transform:translate(-50%,-50%) scale(.4);opacity:0;pointer-events:none;
        transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .5s ease}
      .bb-ring.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
      /* Hinweis-Puls (nach Wartezeit) */
      .bb-pulse{position:absolute;border-radius:50%;background:rgba(224,124,148,.28);
        transform:translate(-50%,-50%) scale(.5);pointer-events:none;opacity:0}
      .bb-pulse.on{animation:bbPulse 1.6s ease-out infinite}
      @keyframes bbPulse{0%{transform:translate(-50%,-50%) scale(.5);opacity:.55}
        70%{opacity:0}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
      /* Miss-Feedback (kurzes Wackeln der aktiven Szene) */
      .bb-scene.miss{animation:bbShake .34s ease}
      @keyframes bbShake{0%,100%{transform:translateX(0)}
        25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
      /* Lob */
      .bb-praise{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;
        color:var(--mint-deep);align-self:center;opacity:0;transform:translateY(6px);
        transition:opacity .45s ease,transform .45s cubic-bezier(.16,1,.3,1);min-height:20px}
      .bb-praise.in{opacity:1;transform:translateY(0)}
      /* Abschluss */
      .bb-done{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;line-height:1.28;
        color:var(--ink);opacity:0;transform:translateY(10px);
        transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}
      .bb-done.in{opacity:1;transform:translateY(0)}
      .bb-done b{color:var(--mint-deep)}
      .bb-cta{align-self:stretch;background:var(--rose5);color:#fff;border:none;border-radius:50px;
        padding:12px;font-size:15px;font-weight:500;font-family:inherit;cursor:pointer;
        box-shadow:0 3px 10px rgba(196,86,111,.4);opacity:0;transform:translateY(8px);
        transition:opacity .4s ease,transform .4s ease}
      .bb-cta.in{opacity:1;transform:translateY(0)}
      `;
      document.head.appendChild(st);
    }

    // ---- Grundgerüst ----
    const root = document.createElement("div");
    root.className = "bb";
    root.innerHTML = `
      <div class="bb-step"></div>
      <div class="bb-hint"></div>
      <div class="bb-dots" role="list" aria-label="Fortschritt"></div>
      <div class="bb-scenes">
        <div class="bb-scene" data-role="ref"><span class="bb-tag">Vorlage</span></div>
        <div class="bb-scene pick" data-role="pick"><span class="bb-tag">Tipp drauf</span></div>
      </div>
      <div class="bb-praise" aria-live="polite"></div>
    `;
    host.appendChild(root);

    const stepEl = root.querySelector(".bb-step");
    const hintEl = root.querySelector(".bb-hint");
    const dotsEl = root.querySelector(".bb-dots");
    const refBox = root.querySelector('[data-role="ref"]');
    const pickBox = root.querySelector('[data-role="pick"]');
    const praiseEl = root.querySelector(".bb-praise");

    // Fortschrittspunkte
    ROUNDS.forEach(() => {
      const d = document.createElement("span");
      d.className = "bb-dot";
      d.setAttribute("role", "listitem");
      dotsEl.appendChild(d);
    });
    const dots = Array.from(dotsEl.querySelectorAll(".bb-dot"));

    // Marker: welche SVG-Instanz gerade aufgebaut wird (für diff-Fn)
    let LEFT = null;
    let RIGHT = null;

    // ---- Einen abstrakten Kopf mit Haar-Abteilungslinien bauen ----
    // Gibt ein Objekt mit Referenzen auf die veränderbaren Elemente zurück.
    function buildHead() {
      const svg = document.createElementNS(NS, "svg");
      // Auf die Haar-/Abteilungs-Region zugeschnitten (kein Hals), damit
      // beide Köpfe nebeneinander groß genug in die Karte passen.
      svg.setAttribute("viewBox", "10 4 80 78");
      svg.setAttribute("aria-hidden", "true");

      const el = (tag, attrs) => {
        const n = document.createElementNS(NS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        return n;
      };

      // Kopf-Silhouette (weiche Form)
      svg.appendChild(el("path", {
        d: "M50 8 C70 8 82 24 82 48 C82 78 68 100 50 100 C32 100 18 78 18 48 C18 24 30 8 50 8 Z",
        fill: "#fff", stroke: "rgba(21,24,27,.12)", "stroke-width": "1.5",
      }));
      // Haar-Kappe (oberer Bogen) = Arbeitsfeld der Abteilungen
      svg.appendChild(el("path", {
        d: "M22 46 C24 20 40 10 50 10 C60 10 76 20 78 46 C64 36 36 36 22 46 Z",
        fill: "var(--mint)", opacity: "0.55",
      }));

      const strokeAttrs = {
        stroke: "var(--mint-deep)", "stroke-width": "2",
        "stroke-linecap": "round", fill: "none",
      };

      // Krone / Scheitelpunkt (kleiner Knoten oben)
      const crown = el("circle", { cx: "50", cy: "22", r: "3.2", fill: "var(--mint-deep)" });

      // Mittlere Scheitel-Linie (senkrecht)
      const parting = el("path", Object.assign({ d: "M50 22 L50 74" }, strokeAttrs));

      // Feste seitliche Abteilungslinien (Kontext)
      const sideL = el("path", Object.assign({ d: "M50 30 C40 40 34 54 34 70" }, strokeAttrs));
      const sideR = el("path", Object.assign({ d: "M50 30 C60 40 66 54 66 70" }, strokeAttrs));

      // Eine optionale Strähne (kann fehlen = Unterschied in Runde 2)
      const strand = el("path", Object.assign({ d: "M66 44 C72 48 74 54 72 62" }, strokeAttrs));

      svg.appendChild(sideL);
      svg.appendChild(sideR);
      svg.appendChild(strand);
      svg.appendChild(parting);
      svg.appendChild(crown);

      return { svg, crown, parting, strand, sideL, sideR };
    }

    let ri = 0;              // aktuelle Runde
    let hintTimer = null;    // Timer für Hinweis-Puls
    let pulseEl = null;      // aktives Puls-Element
    let locked = false;      // während Übergängen keine Klicks

    function clearScenes() {
      // SVGs entfernen, Tags behalten
      refBox.querySelectorAll("svg").forEach((n) => n.remove());
      pickBox.querySelectorAll("svg,.bb-ring,.bb-pulse").forEach((n) => n.remove());
      if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
      pulseEl = null;
    }

    function renderRound() {
      locked = false;
      clearScenes();
      const round = ROUNDS[ri];
      stepEl.textContent = round.step;
      hintEl.textContent = round.hint;
      praiseEl.classList.remove("in");
      praiseEl.textContent = "";

      // Beide Köpfe bauen; Marker setzen, damit diff() die richtige Seite trifft
      const left = buildHead();
      const right = buildHead();
      LEFT = left; RIGHT = right;
      // Unterschied anwenden (diff bekommt jede Szene einzeln)
      round.diff(left);
      round.diff(right);
      refBox.appendChild(left.svg);
      pickBox.appendChild(right.svg);

      const svg = right.svg;

      // Klick / Tap-Handling auf der aktiven Szene.
      // viewBox = "VB_X VB_Y VB_W VB_H" → Klick-Fraktion in SVG-Koords zurückrechnen.
      const onPick = (ev) => {
        if (locked) return;
        const rect = svg.getBoundingClientRect();
        const pt = ev.touches ? ev.touches[0] : ev;
        const px = VB.x + ((pt.clientX - rect.left) / rect.width) * VB.w;
        const py = VB.y + ((pt.clientY - rect.top) / rect.height) * VB.h;
        const dx = px - round.target.x;
        const dy = py - round.target.y;
        if (Math.hypot(dx, dy) <= round.r) hit();
        else miss();
      };
      svg.addEventListener("click", onPick);

      // Hinweis-Puls nach 6 s an der Zielzone einblenden
      hintTimer = setTimeout(() => {
        if (disposed || !host.isConnected) return;
        showPulse();
      }, 6000);
      timers.push(hintTimer);
    }

    function showPulse() {
      if (locked) return;
      const round = ROUNDS[ri];
      const size = (round.r * 2 * 1.4) / VB.w * 100; // etwas größer als Trefferzone
      pulseEl = document.createElement("div");
      pulseEl.className = "bb-pulse on";
      // Prozent-Positionierung relativ zur Szene
      pulseEl.style.left = pctX(round.target.x) + "%";
      pulseEl.style.top = pctY(round.target.y) + "%";
      pulseEl.style.width = size + "%";
      pulseEl.style.paddingBottom = size + "%";
      pickBox.appendChild(pulseEl);
    }

    function miss() {
      pickBox.classList.remove("miss");
      void pickBox.offsetHeight;
      pickBox.classList.add("miss");
    }

    function hit() {
      locked = true;
      if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
      if (pulseEl) { pulseEl.remove(); pulseEl = null; }

      const round = ROUNDS[ri];
      // Treffer-Ring an der Zielstelle
      const ring = document.createElement("div");
      ring.className = "bb-ring";
      const size = (round.r * 2) / VB.w * 100;
      ring.style.left = pctX(round.target.x) + "%";
      ring.style.top = pctY(round.target.y) + "%";
      ring.style.width = size + "%";
      ring.style.height = "0";
      ring.style.paddingBottom = size + "%";
      pickBox.appendChild(ring);
      void ring.offsetHeight;
      ring.classList.add("show");

      // Fortschrittspunkt füllen
      dots[ri].classList.add("on");

      // Sanftes Lob
      const praises = ["gut beobachtet!", "genau hingeschaut!", "scharfes Auge!"];
      praiseEl.textContent = praises[ri] || "gut beobachtet!";
      void praiseEl.offsetHeight;
      praiseEl.classList.add("in");

      // Weiter oder Abschluss
      timers.push(setTimeout(() => {
        if (disposed || !host.isConnected) return;
        if (ri < ROUNDS.length - 1) {
          ri++;
          renderRound();
        } else {
          finish();
        }
      }, 1150));
    }

    function finish() {
      clearScenes();
      root.querySelector(".bb-scenes").style.display = "none";
      hintEl.style.display = "none";
      stepEl.textContent = "Fertig";
      praiseEl.classList.remove("in");
      praiseEl.textContent = "";

      const done = document.createElement("div");
      done.className = "bb-done";
      done.innerHTML = `Gutes <b>Sehen</b> ist die Grundlage guten Schneidens.`;
      root.appendChild(done);
      void done.offsetHeight;
      done.classList.add("in");

      const cta = document.createElement("button");
      cta.type = "button";
      cta.className = "bb-cta";
      cta.textContent = "Weiter beobachten ✓";
      root.appendChild(cta);
      void cta.offsetHeight;
      cta.classList.add("in");

      cta.addEventListener("click", () => resolve({ found: ROUNDS.length }));
    }

    renderRound();
  });
};
