/* Frag Maia — always-available pull-up chat for Abenteuer 7.
   Self-contained: injects its own CSS + DOM, reuses the Maia chat backend.
   Wrapped in an IIFE so it never collides with abenteuer7.js top-level consts
   (NAME / SESSION / MAIA_API are re-derived locally here). */
(function () {
  "use strict";
  if (window.__maiaChatMounted) return;
  window.__maiaChatMounted = true;

  var NAME = "Lena";
  var MAIA_API = window.MAIA_API || "";

  // Same session key as the guided flow, so history stays continuous.
  var SESSION = (function () {
    try {
      var s = localStorage.getItem("maiaSession");
      if (!s) {
        s = (self.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : (Date.now() + "-" + Math.random().toString(16).slice(2));
        localStorage.setItem("maiaSession", s);
      }
      return s;
    } catch (e) { return "sess-" + Date.now(); }
  })();

  // Warm free-chat persona: Maia knows the learner is mid-Abenteuer-7.
  var CHAT_SYSTEM =
    "Du bist Maia, die KI-Mentorin der Hairdressing.school. Du chattest gerade frei mit der Lernenden " + NAME +
    ", die mitten in „Abenteuer 7“ des Kurses „Basic Cut I“ steckt (am Papier üben, den Mentor imitieren, am Übungskopf schneiden – Ziel: einmal gerade um den Kopf, die Außenlinie). " +
    "Antworte auf Deutsch, warm und ermutigend wie eine gute Freundin, die textet: 1-3 kurze Sätze, höchstens 1-2 Emojis. " +
    "Bleib hilfreich und thematisch beim Friseur-Handwerk, dem Kurs und ihrer Motivation; wenn etwas gar nicht dazu passt, lenke freundlich zurück. Antworte NUR mit Maias Nachricht.";

  function logTurn(role, text) {
    if (!MAIA_API || !text) return;
    try {
      fetch(MAIA_API + "/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: SESSION, role: role, text: text, adventure: "abenteuer-7" }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- styles ---------- */
  var css = [
    ".mc-handle{position:fixed;left:0;right:0;margin-inline:auto;width:max-content;max-width:calc(100% - 28px);",
    "bottom:var(--mc-handle-bottom,66px);z-index:35;display:inline-flex;align-items:center;gap:8px;",
    "background:var(--mint-deep,#44885f);color:#fff;border:none;border-radius:50px;padding:9px 18px;",
    "font-family:'Syne',sans-serif;font-weight:700;font-size:13.5px;letter-spacing:.01em;cursor:pointer;",
    "box-shadow:0 4px 16px rgba(68,136,95,.42);transition:transform .18s,box-shadow .2s,opacity .25s;}",
    ".mc-handle:hover{box-shadow:0 6px 22px rgba(68,136,95,.52)}",
    ".mc-handle:active{transform:scale(.97)}",
    ".mc-handle:focus-visible{outline:3px solid var(--rose2,#f6d3db);outline-offset:2px}",
    ".mc-handle .mc-chev{width:15px;height:15px;stroke:#fff;stroke-width:2.6;fill:none;stroke-linecap:round;stroke-linejoin:round;animation:mc-bob 1.9s ease-in-out infinite}",
    ".mc-handle.mc-hidden{opacity:0;pointer-events:none;transform:translateY(24px)}",
    "@keyframes mc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}",

    ".mc-scrim{position:fixed;inset:0;background:rgba(21,24,27,.42);backdrop-filter:blur(2px);z-index:45;",
    "opacity:0;pointer-events:none;transition:opacity .3s}",
    ".mc-scrim.mc-open{opacity:1;pointer-events:auto}",

    ".mc-sheet{position:fixed;left:0;right:0;margin-inline:auto;max-width:440px;bottom:0;",
    "height:72vh;max-height:660px;z-index:50;background:linear-gradient(180deg,var(--mint-soft,#e8f6f0),#fff 130px);",
    "border-radius:22px 22px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.22);display:flex;flex-direction:column;",
    "overflow:hidden;transform:translateY(105%);transition:transform .34s cubic-bezier(.16,1,.3,1);will-change:transform}",
    ".mc-sheet.mc-open{transform:translateY(0)}",
    ".mc-grab{width:40px;height:5px;border-radius:50px;background:var(--g2,#e9ebed);margin:9px auto 2px;flex:none;cursor:grab;touch-action:none}",
    ".mc-head{display:flex;align-items:center;gap:10px;padding:8px 15px 12px;border-bottom:1px solid var(--g2,#e9ebed);touch-action:none}",
    ".mc-head .mc-ava{width:38px;height:38px;border-radius:50%;flex:none;box-shadow:0 2px 6px rgba(196,86,111,.35)}",
    ".mc-head h2{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;line-height:1.1}",
    ".mc-head p{font-size:11.5px;color:var(--light,#8a939b)}",
    ".mc-x{margin-left:auto;width:34px;height:34px;border-radius:50%;border:none;background:var(--g1,#f4f5f6);",
    "color:var(--mid,#4b5560);cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".mc-x:active{transform:scale(.94)}.mc-x svg{width:17px;height:17px;stroke:currentColor;stroke-width:2.4;fill:none;stroke-linecap:round}",
    ".mc-msgs{flex:1;min-height:0;overflow-y:auto;padding:16px 15px 18px;display:flex;flex-direction:column;gap:12px;overflow-anchor:none}",
    ".mc-foot{padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--g2,#e9ebed);background:rgba(255,255,255,.96)}",
    // slightly smaller Maia avatar inside the sheet's message rows
    ".mc-msgs .mava{background:url('img/maia-warm.svg') center/cover no-repeat}"
  ].join("");

  var st = document.createElement("style");
  st.id = "mc-style";
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- DOM ---------- */
  var handle = document.createElement("button");
  handle.type = "button";
  handle.className = "mc-handle mc-hidden";
  handle.setAttribute("aria-label", "Frag Maia – Chat mit Maia öffnen");
  handle.setAttribute("aria-expanded", "false");
  handle.innerHTML =
    '<span aria-hidden="true">🎧</span><span>Frag Maia</span>' +
    '<svg class="mc-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';

  var scrim = document.createElement("div");
  scrim.className = "mc-scrim";

  var sheet = document.createElement("div");
  sheet.className = "mc-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Frag Maia");
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML =
    '<div class="mc-grab" aria-hidden="true"></div>' +
    '<div class="mc-head">' +
      '<img class="mc-ava" src="img/maia-warm.svg" alt="Maia">' +
      '<div><h2>Maia</h2><p>Immer für dich da</p></div>' +
      '<button type="button" class="mc-x" aria-label="Schließen">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="mc-msgs" id="mc-msgs"></div>' +
    '<div class="mc-foot">' +
      '<div class="inputbar">' +
        '<input id="mc-input" placeholder="Frag Maia irgendwas …" autocomplete="off" aria-label="Nachricht an Maia">' +
        '<button id="mc-send" type="button" aria-label="Senden">' +
          '<svg viewBox="0 0 24 24" fill="#fff" width="19" height="19" aria-hidden="true"><path d="M4 12l16-8-6 16-2-6-8-2z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
  document.body.appendChild(handle);

  var msgs = sheet.querySelector("#mc-msgs");
  var input = sheet.querySelector("#mc-input");
  var sendBtn = sheet.querySelector("#mc-send");
  var closeBtn = sheet.querySelector(".mc-x");
  var grab = sheet.querySelector(".mc-grab");
  var head = sheet.querySelector(".mc-head");

  /* ---------- message helpers (reuse global .row/.bub/.mava/.typing) ---------- */
  function scrollMsgs() {
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(function () { msgs.scrollTop = msgs.scrollHeight; }, 30);
  }
  function addBubble(who, text) {
    var row = document.createElement("div");
    row.className = "row" + (who === "user" ? " user" : "");
    if (who === "maia") {
      var av = document.createElement("div");
      av.className = "mava";
      row.appendChild(av);
    }
    var b = document.createElement("div");
    b.className = "bub";
    b.textContent = text; // escape user + reply text safely
    row.appendChild(b);
    msgs.appendChild(row);
    scrollMsgs();
    return row;
  }
  function addTyping() {
    var t = document.createElement("div");
    t.className = "typing";
    t.innerHTML = '<div class="mava"></div><div class="d"><i></i><i></i><i></i></div>';
    msgs.appendChild(t);
    scrollMsgs();
    return t;
  }

  var busy = false;
  var greeted = false;

  async function send() {
    var v = input.value.trim();
    if (!v || busy) return;
    input.value = "";
    addBubble("user", v);
    logTurn("user", v);
    busy = true;
    sendBtn.disabled = true;
    var t = addTyping();
    var reply = "Ich bin gerade kurz nicht durchgekommen – aber ich bin da. Sag's mir gleich nochmal, ja? 💛";
    try {
      var ctl = new AbortController();
      var to = setTimeout(function () { ctl.abort(); }, 8000);
      var r = await fetch((MAIA_API || "") + "/api/maia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: NAME, adventure: "abenteuer-7", context: v, session: SESSION }),
        signal: ctl.signal
      });
      clearTimeout(to);
      var j = await r.json();
      if (j && j.reply) reply = j.reply;
    } catch (e) {}
    t.remove();
    addBubble("maia", reply);
    logTurn("maia", reply);
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  /* ---------- open / close ---------- */
  var isOpen = false;

  function open() {
    if (isOpen) return;
    isOpen = true;
    if (!greeted) {
      greeted = true;
      addBubble("maia", "Hey " + NAME + "! Ich bin die ganze Zeit an deiner Seite 💛 Frag mich alles – zur Übung, zur Schere oder wenn's kurz hakt.");
    }
    sheet.style.transform = ""; // clear any drag offset
    scrim.classList.add("mc-open");
    sheet.classList.add("mc-open");
    sheet.setAttribute("aria-hidden", "false");
    handle.classList.add("mc-hidden");
    handle.setAttribute("aria-expanded", "true");
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, 320);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    sheet.style.transform = ""; // let CSS slide it back down
    scrim.classList.remove("mc-open");
    sheet.classList.remove("mc-open");
    sheet.setAttribute("aria-hidden", "true");
    handle.classList.remove("mc-hidden");
    handle.setAttribute("aria-expanded", "false");
    try { handle.focus({ preventScroll: true }); } catch (e) { handle.focus(); }
  }

  handle.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  scrim.addEventListener("click", close);
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) close(); });

  /* ---------- swipe / drag up on the handle to open ---------- */
  handle.addEventListener("touchstart", function (e) {
    handle.__y = e.touches[0].clientY;
  }, { passive: true });
  handle.addEventListener("touchmove", function (e) {
    if (isOpen || handle.__y == null) return;
    if (handle.__y - e.touches[0].clientY > 28) { handle.__y = null; open(); }
  }, { passive: true });

  /* ---------- drag the sheet header/grabber down to close ---------- */
  var dragY = null;
  function dragStart(e) {
    dragY = (e.touches ? e.touches[0].clientY : e.clientY);
    sheet.style.transition = "none";
  }
  function dragMove(e) {
    if (dragY == null) return;
    var y = (e.touches ? e.touches[0].clientY : e.clientY);
    var dy = y - dragY;
    if (dy > 0) sheet.style.transform = "translateY(" + dy + "px)";
  }
  function dragEnd(e) {
    if (dragY == null) return;
    var y = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
    var dy = y - dragY;
    dragY = null;
    sheet.style.transition = "";
    sheet.style.transform = "";
    if (dy > 90) close();
  }
  [grab, head].forEach(function (el) {
    el.addEventListener("touchstart", dragStart, { passive: true });
    el.addEventListener("touchmove", dragMove, { passive: true });
    el.addEventListener("touchend", dragEnd);
  });

  /* ---------- keep the handle hovering just above dock + tabs ---------- */
  var tabs = document.querySelector(".tabs");
  var dock = document.getElementById("dock");
  function positionHandle() {
    var b = 10 + (tabs ? tabs.offsetHeight : 0) + (dock ? dock.offsetHeight : 0);
    handle.style.setProperty("--mc-handle-bottom", b + "px");
  }
  positionHandle();
  window.addEventListener("resize", positionHandle);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(positionHandle);
    if (dock) ro.observe(dock);
    if (tabs) ro.observe(tabs);
  } else {
    setInterval(positionHandle, 800);
  }

  // Reveal the handle once mounted.
  requestAnimationFrame(function () { handle.classList.remove("mc-hidden"); });
})();
