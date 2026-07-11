/* Abenteuer 7 — Basic Cut I — chat-first in Maia-Optik.
   Inhalt 1:1 aus LIVE-WordPress (faithful, nichts erfunden). Form = Maia-Chat-Engine + Spiele.
   Assets (Audio/Bilder/Videos) via window.MAIA_* (aus config.js, gefüllt aus den echten Quellen). */
const NAME = "Lena";
const stream = document.getElementById("stream");
const dock = document.getElementById("dock");
const progbar = document.getElementById("progbar");
const VBASE = window.MAIA_VBASE || "";
const IMG = window.MAIA_IMG || {};        // stepKey -> Bild-URL (R2)
const AUDIO = window.MAIA_AUDIO || {};    // playerId -> [{title,url}]
const PHOTO = window.MAIA_PHOTO || "";    // Mentors-Check Beispielfoto (R2)

const MAIA_SYSTEM = `Du bist Maia, die KI-Mentorin der Hairdressing.school. Sprich Deutsch, warm und ermutigend, wie eine gute Freundin, die textet: 1-2 kurze Sätze, höchstens 1-2 Emojis. Die Lernende heißt ${NAME}. Kurs "Basic Cut I", Lektion "Abenteuer 7": am Papier üben, Mentor imitieren, Haare schneiden, Ziel = einmal gerade um den Kopf (Außenlinie). Antworte NUR mit Maias Nachricht.`;

const MAIA_API = window.MAIA_API || "";
const SESSION = (()=>{try{let s=localStorage.getItem("maiaSession"); if(!s){s=(self.crypto&&crypto.randomUUID?crypto.randomUUID():(Date.now()+"-"+Math.random().toString(16).slice(2))); localStorage.setItem("maiaSession",s);} return s;}catch(e){return "sess-"+Date.now();}})();
function logTurn(role,text){ if(!MAIA_API||!text) return; try{ fetch(MAIA_API+"/api/log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session:SESSION,role,text,adventure:"abenteuer-7"}),keepalive:true}).catch(()=>{});}catch(e){} }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* Auto-Folgen mit Sinn: nur nach unten scrollen, wenn der Nutzer ohnehin (fast) unten ist.
   Liest er weiter oben nach, bleibt die Position stehen (kein Ruck). Fühlt sich „Apple" an. */
let autoFollow = true;
stream.addEventListener("scroll", () => { autoFollow = (stream.scrollHeight - stream.scrollTop - stream.clientHeight) < 90; }, { passive: true });
let scrollPending = false;   // viele scroll()-Aufrufe pro Frame zu EINEM Layout-Read/Write bündeln (kein Thrashing, kein Timer-Sturm)
const scroll = () => {
  if (!autoFollow || scrollPending) return;
  scrollPending = true;
  setTimeout(() => { scrollPending = false; if (autoFollow) stream.scrollTop = stream.scrollHeight; }, 32);
};
function add(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); const n = d.firstChild; stream.appendChild(n); scroll(); return n; }
function prog(p) { progbar.style.width = p + "%"; }
function chapter(t) { add(`<div class="chapter">${t}</div>`); }   /* Kopf zeigt dauerhaft „Basic Cut I · Abenteuer 7"; der aktuelle Schritt steht als Chip im Verlauf */

/* ---- EIN durchgehender Chat ----
   Alle Maia-Äußerungen (geführt wie frei) laufen durch EINE FIFO-Turn-Queue (turnChain):
   sie verschachteln sich nie und erscheinen immer in Absende-Reihenfolge. Geführte Steuer-
   elemente (Chips / Weiter) stehen INLINE im Verlauf; die Eingabe unten ist IMMER da.
   Reflexions-Schritte nutzen askAnswer(frage, placeholder): Frage stellen UND Composer scharf
   schalten im SELBEN Queue-Turn — der Antwort-Modus ist damit erst aktiv, wenn die Frage an der
   Reihe ist (nach evtl. davor eingereihten freien Antworten), aber schon während sie tippt.
   Sonst erreicht getippter Text Maia als freie Frage inline, ohne den Kurs zu überspringen. */
let turnChain = Promise.resolve();   // serialisiert alle Maia-Turns (FIFO)
let answerResolver = null;           // gesetzt, wenn der Kurs auf eine getippte Antwort wartet
let sending = false;                 // true, solange eine freie Frage unterwegs ist (Backpressure)
const DEFAULT_PH = "Frag mich alles …";
function enqueue(task) { const p = turnChain.then(task).catch((e) => { console.error("maia turn error", e); }); turnChain = p; return p; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function typingRow() { return add('<div class="typing"><div class="mava"></div><div class="d"><i></i><i></i><i></i></div></div>'); }
function maiaBubble(text) {  // Text/Reply IMMER via textContent → kein HTML aus Modell-Antworten (XSS zu)
  const row = document.createElement("div"); row.className = "row";
  const av = document.createElement("div"); av.className = "mava";
  const b = document.createElement("div"); b.className = "bub"; b.textContent = text;
  row.appendChild(av); row.appendChild(b); stream.appendChild(row); scroll();
}
function typeMaia(text) {
  return enqueue(async () => {
    const t = typingRow();
    await sleep(Math.min(420 + text.length * 10, 1400)); t.remove();
    maiaBubble(text); logTurn("maia", text); await sleep(190);
  });
}
function addUser(text) { const row = document.createElement("div"); row.className = "row user"; const b = document.createElement("div"); b.className = "bub"; b.textContent = text; row.appendChild(b); stream.appendChild(row); scroll(); logTurn("user", text); }
function callMaia(context) {
  return enqueue(async () => {
    const t = typingRow();
    let reply = "Das nehme ich mit — schön, dass du drangeblieben bist. 💛";
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch((MAIA_API || "") + "/api/maia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: NAME, adventure: "abenteuer-7", context, session: SESSION }), signal: ctl.signal });
      reply = (await r.json()).reply || reply;   // Abort deckt auch json(); danach erst clearTimeout
    } catch (e) {} finally { clearTimeout(to); }
    t.remove(); maiaBubble(reply); logTurn("maia", reply); await sleep(190);
  });
}

/* ---- Permanente Eingabe (der frühere „dock" ist jetzt der Composer, immer sichtbar) ---- */
function setPlaceholder(t) { const i = dock.querySelector("#ft"); if (i) i.placeholder = t; }
function setAnswering(on) { const c = dock.querySelector(".composer"); if (c) c.classList.toggle("answering", !!on); }
function freeContext(v) { return `${NAME} schreibt gerade frei im Kurs-Chat (Abenteuer 7, Basic Cut I): "${v}". Antworte warm und hilfreich in 1-2 Sätzen, bleib beim Friseur-Handwerk, dem Kurs und ihrer Motivation. Passt es gar nicht, lenk sie sanft zurück. Danach macht sie einfach weiter.`; }
function setSendEnabled(on) { const b = dock.querySelector("#sb"); if (b) b.disabled = !on; const i = dock.querySelector("#ft"); if (i) i.readOnly = !on; }   // readonly während des Sendens → kein alter Entwurf, der später als Antwort fehlrouten könnte
function onComposerSubmit() {
  const inp = dock.querySelector("#ft"); if (!inp) return;
  const v = inp.value.trim(); if (!v) return;
  if (answerResolver) {   // Reflexions-Schritt wartet auf DIESE Antwort → erfüllt den Schritt
    inp.value = ""; addUser(v);
    const r = answerResolver; answerResolver = null; setPlaceholder(DEFAULT_PH); setAnswering(false);
    r(v); return;
  }
  if (sending) return;    // nur EINE freie Frage zugleich → keine Queue-Starvation, Kurs bleibt vorn
  inp.value = ""; addUser(v);
  sending = true; setSendEnabled(false);
  callMaia(freeContext(v)).then(() => { sending = false; setSendEnabled(true); });
}
function mountComposer() {
  dock.innerHTML = `<div class="composer inputbar"><input id="ft" placeholder="${DEFAULT_PH}" autocomplete="off" aria-label="Nachricht an Maia"><button id="sb" type="button" aria-label="Senden"><svg viewBox="0 0 24 24" fill="#fff" width="19" height="19"><path d="M4 12l16-8-6 16-2-6-8-2z"/></svg></button></div>`;
  dock.querySelector("#sb").onclick = onComposerSubmit;
  dock.querySelector("#ft").addEventListener("keydown", (e) => { if (e.key === "Enter") onComposerSubmit(); });
}

/* ---- Geführte Steuerelemente INLINE im Verlauf (statt im dock) ---- */
// Stellt die Frage UND schaltet den Composer als Antwort scharf — beides im SELBEN Queue-Turn.
// Dadurch ist der Antwort-Modus erst aktiv, wenn die Frage tatsächlich an der Reihe ist (nach
// evtl. davor eingereihten freien Antworten), aber bereits während sie tippt. → Eine früh
// getippte Antwort geht nicht verloren, und eine freie Frage davor wird nicht fehlgeroutet.
function askAnswer(question, ph) {
  return new Promise((resolve) => {
    enqueue(async () => {
      answerResolver = resolve;
      const i0 = dock.querySelector("#ft"); if (i0) i0.value = "";   // ungesendeten freien Entwurf verwerfen, bevor der Antwort-Modus greift (sonst würde er als Antwort fehlrouten)
      setPlaceholder(ph || DEFAULT_PH); setAnswering(true);
      const t = typingRow();
      await sleep(Math.min(420 + question.length * 10, 1400)); t.remove();
      maiaBubble(question); logTurn("maia", question);
      const i = dock.querySelector("#ft"); if (i) { try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); } }
    });
  });
}
function chipsInline(options) {
  return new Promise((res) => {
    const row = add(`<div class="inline-chips">${options.map((o, i) => `<button class="inline-chip" type="button" data-i="${i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${esc(o)}</button>`).join("")}</div>`);
    row.querySelectorAll(".inline-chip").forEach((c) => c.onclick = () => {
      const i = +c.dataset.i;
      row.querySelectorAll(".inline-chip").forEach((x) => { x.disabled = true; x.classList.toggle("chosen", x === c); });
      addUser(options[i]); res(i);
    });
  });
}
function weiterInline(label) {
  return new Promise((res) => {
    const row = add(`<div class="inline-cta-wrap"><button class="inline-cta" type="button">${label}</button></div>`);
    row.querySelector(".inline-cta").onclick = () => { row.remove(); res(); };
  });
}

// --- Bausteine ---
function heroImage(stepKey) { const u = IMG[stepKey]; if (u) { add(`<div class="imgcard"><img src="${u}" alt="" loading="lazy" decoding="async"></div>`); scroll(); } }
/* Echter Foto-Upload: <label> mit verstecktem File-Input → Tap öffnet den Picker; das gewählte
   Foto wird sofort als eigene Bubble gezeigt. (Demo: kein Server-Versand, aber ehrlich sichtbar.) */
function uploadCard() {
  const card = add(`<label class="upload"><input type="file" accept="image/*" hidden multiple><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--rose5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg><b>Ergebnis hochladen</b><small>Foto(s) vom Schnitt · bis zu 4</small></label>`);
  const input = card.querySelector("input");
  input.addEventListener("change", () => {
    const files = input.files; if (!files || !files.length) return;
    const old = stream.querySelector(".uploaded"); if (old) old.remove();   // nur EINE Vorschau behalten
    compositeImages(files, 1400).then((dataURL) => {
      if (!dataURL) return;
      const wrap = document.createElement("div"); wrap.className = "uploaded";
      const img = document.createElement("img"); img.alt = "Deine hochgeladenen Ergebnisse"; img.decoding = "async"; img.src = dataURL;
      wrap.appendChild(img); stream.appendChild(wrap); scroll();
      logTurn("user", "[" + Math.min(files.length, 4) + " Foto(s) hochgeladen]");
      photoFeedback(dataURL);   // EIN zusammengesetztes Bild an die Vision-KI → spart Tokens (statt N Einzelbilder)
    });
  });
  return card;
}
// Bis zu 4 Fotos clientseitig zu EINEM Collage-Bild zusammensetzen → nur EIN Bild an die Vision-KI (Token-sparend)
function compositeImages(files, maxDim) {
  return new Promise((resolve) => {
    const list = Array.prototype.slice.call(files, 0, 4);
    if (!list.length) return resolve(null);
    const urls = [], imgs = new Array(list.length); let done = 0;
    const finish = () => {
      urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} });
      const good = imgs.filter(Boolean);
      if (!good.length) return resolve(null);
      const n = good.length, cols = n === 1 ? 1 : 2, rows = Math.ceil(n / cols);
      const cellW = Math.round(maxDim / cols), cellH = Math.round(cellW * 0.75);
      const cv = document.createElement("canvas"); cv.width = cellW * cols; cv.height = cellH * rows;
      const ctx = cv.getContext("2d"); ctx.fillStyle = "#0d0d0d"; ctx.fillRect(0, 0, cv.width, cv.height);
      good.forEach((im, i) => {
        const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
        const iw = im.naturalWidth || 1, ih = im.naturalHeight || 1;
        const s = Math.max(cellW / iw, cellH / ih);   // cover-fit je Zelle
        const dw = iw * s, dh = ih * s;
        ctx.drawImage(im, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
      });
      let out = null; try { out = cv.toDataURL("image/jpeg", 0.85); } catch (e) { out = null; }
      resolve(out);
    };
    list.forEach((f, i) => {
      const u = URL.createObjectURL(f); urls.push(u);
      const im = new Image();
      im.onload = () => { imgs[i] = im; if (++done === list.length) finish(); };
      im.onerror = () => { imgs[i] = null; if (++done === list.length) finish(); };
      im.src = u;
    });
  });
}
// Maia schaut sich das Foto an und gibt konkretes Feedback (Vision-Endpoint, Feedback-Mentor-Stil)
function photoFeedback(dataURL) {
  return enqueue(async () => {
    const t = typingRow();
    let reply = "Danke fürs Hochladen! 💛";
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 22000);   // Vision darf etwas länger dauern
    try {
      const r = await fetch((MAIA_API || "") + "/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: NAME, adventure: "abenteuer-7", session: SESSION, image: dataURL, reference: PHOTO }), signal: ctl.signal });
      reply = (await r.json()).reply || reply;
    } catch (e) {} finally { clearTimeout(to); }
    t.remove(); maiaBubble(reply); logTurn("maia", reply); await sleep(190);
  });
}
function checklist(items) { add(`<div class="checklist">${items.map(x => `<div class="cl-item"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${x}</div>`).join("")}</div>`); scroll(); }
function audioPlayer(playlistTitle, playerId) {
  const tracks = AUDIO[playerId] || [];
  if (!tracks.length) { add(`<div class="audio"><div class="p" style="opacity:.5"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div><div class="acol"><b>${esc(playlistTitle)}</b><small>Track wird geladen …</small></div></div>`); scroll(); return; }
  const rows = tracks.map((t, i) => `<button class="apl-track" data-i="${i}"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>${esc(t.title || ("Track " + (i + 1)))}</span></button>`).join("");
  const n = add(`<div class="audiopl"><div class="apl-head">🎧 ${esc(playlistTitle)}<small>Wähl intuitiv einen Track</small></div><div class="apl-tracks">${rows}</div><audio class="apl-audio" controls preload="none"></audio></div>`);
  const au = n.querySelector(".apl-audio");
  n.querySelectorAll(".apl-track").forEach((b) => b.onclick = () => { const t = tracks[+b.dataset.i]; au.src = t.url; au.play().catch(() => {}); n.querySelectorAll(".apl-track").forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
  scroll();
}
function videoCard(label, vid, caption) {
  // Einheitliches gebrandetes Cover im Ruhezustand → das (uneinheitliche) Video-Intro ist nie sichtbar;
  // EIN Hairdressing.school-Logo (oben links) durchgehend; Play blendet das Cover weich weg.
  const n = add(`<div class="card vcard"><div class="vwrap"><video preload="none" playsinline controls src="${VBASE}${vid}.mp4"></video><img class="vlogo" src="img/hds-wordmark.svg" alt="Hairdressing.school"><button class="vfs" type="button" aria-label="Vollbild"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3"/></svg></button><button class="vcover" type="button" aria-label="Video abspielen"><span class="vcover-play"><svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span></button></div><div class="vmeta"><b>${esc(label)}</b>${caption ? `<span>${esc(caption)}</span>` : ""}</div></div>`);
  const v = n.querySelector("video"), fs = n.querySelector(".vfs"), wrap = n.querySelector(".vwrap"), cover = n.querySelector(".vcover");
  if (cover && v) cover.addEventListener("click", () => { n.classList.add("playing"); cover.classList.add("hidden"); try { v.play(); } catch (e) {} });
  if (fs && v) fs.addEventListener("click", () => {
    try {
      if (v.requestFullscreen) v.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();      // iOS Safari: nativer Player mit „Fertig" zum Zurückgehen
      else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
      else if (wrap && wrap.requestFullscreen) wrap.requestFullscreen();
    } catch (e) {}
  });
  scroll();
}
async function videoStep(label, vid, caption) { videoCard(label, vid, caption); await sleep(360); }
function badge(title, sub) { add(`<div class="badge"><div class="medal"><img src="img/maia-heart.svg" alt="Maia"></div><b>${title}</b><span>${sub}</span></div>`); }

async function playGame(fn) {
  const host = add(`<div class="gamehost"></div>`);
  const skip = add(`<div class="gameskip"><button type="button">Spiel überspringen →</button></div>`);
  let settled = false;
  const gameP = Promise.resolve().then(() => fn(host)).then((r) => { settled = true; return { skipped: false, r }; }, (e) => { console.error("game error", e); settled = true; return { skipped: false, r: null, errored: true }; });
  const skipP = new Promise((res) => { skip.querySelector("button").onclick = () => { if (settled) return; res({ skipped: true, r: null }); }; });
  const out = await Promise.race([gameP, skipP]);
  if (out.skipped || out.errored) { try { host.dispatchEvent(new CustomEvent("gamedispose")); } catch (e) {} host.remove(); }   // toten/halben Host nie stehen lassen
  skip.remove();
  return out.r;
}
function firstGame(names) { for (const n of names) if (typeof window[n] === "function") return window[n]; return null; }

async function play() {
  // 1) STIMM DICH EIN — echte Sourance (Playlist 92) + echtes Bild
  prog(6); chapter("Stimm dich ein");
  heroImage("01");
  await typeMaia(`Mit dieser Sourance stimmst du dich optimal auf dein Abenteuer ein, ${NAME}. 🎧`);
  await typeMaia(`Sie hilft dir, ganz entspannt und zugleich fokussiert zu werden.`);
  await typeMaia(`Kurz die Technik: Binaurale Beats bringen dich leichter in den Alpha-Zustand (12 Hz), bilateraler Sound synchronisiert deine beiden Gehirnhälften. So passiert Lernen nebenbei.`);
  await typeMaia(`Kopfhörer auf, aufrecht & bequem sitzen — und wähl intuitiv einen Track. Achte auch auf die Länge. Go with the flow!`);
  audioPlayer("Stimm dich ein – Alle", "92");
  await sleep(300);
  await weiterInline("Bin eingestimmt – weiter");

  // 2) COACHING: MIT ALLEN SINNEN — echter Inhalt + Ankommen (Atem)
  prog(16); chapter("Coaching · Mit allen Sinnen");
  heroImage("02");
  await typeMaia(`Go with the flow, ${NAME}! ✨ Heute im Coaching: mit allen Sinnen.`);
  await typeMaia(`„Ich habe keine besondere Begabung, sondern bin nur leidenschaftlich neugierig."`);
  await typeMaia(`Diese Neugier darf dich in einen neuen Bewusstseinszustand begleiten — atme einmal mit mir. 🌬️`);
  const gAtem = firstGame(["gameAtem"]);
  if (gAtem) await playGame(gAtem);
  const learn = await askAnswer(`Kurze Frage: Wie merkst du dir etwas am leichtesten — und wie muss dir eine Info gezeigt werden, damit sie hängen bleibt?`, "Wie du am besten lernst …");
  await callMaia(`${NAME} beantwortet die Frage, wie sie sich etwas am leichtesten merkt und wie ihr etwas gezeigt werden muss, mit: "${learn}". Antworte warm in 1-2 Sätzen, würdige ihre Antwort konkret und verbinde sie mit dem Gedanken, dass alle Sinne beim Lernen mitspielen.`);
  await weiterInline("Weiter");

  // 3) SCHNEIDE PAPIER — 4 echte Videos + Schneide-Spiel
  prog(32); chapter("Schneide Papier");
  heroImage("03");
  await typeMaia(`Lass uns die Finger aufwärmen und die Motorik ganz einfach am Papier lernen, ${NAME}. ✂️`);
  await typeMaia(`Auch wenn du's mit dem Mentor schon gemacht hast — die Wiederholung macht dir die Bewegungen am Übungskopf leichter.`);
  checklist(["Papier (A4)", "Stift", "Klebestreifen", "Papierschere"]);
  await sleep(150);
  await videoStep("Clip 1 · Schneide Papier", "502781457", "Schau in Ruhe zu und schneid direkt mit.");
  await videoStep("Clip 2 · Schneide Papier", "502798034");
  await videoStep("Clip 3 · Schneide Papier", "502782321");
  await videoStep("Clip 4 · Schneide Papier", "502800919");
  await typeMaia(`Jetzt du: Führ die Schere ruhig an der Linie entlang. ✂️`);
  const gCut = firstGame(["gameSchneide"]);
  if (gCut) { const r = await playGame(gCut); if (r && r.precision != null) await typeMaia(`${Math.round(r.precision)}% auf der Linie — spürst du, wie die Hand ruhiger wird? 💛`); else await typeMaia(`Gut geführt — genau dieses Gefühl nimmst du mit an den Kopf. 💛`); }

  // 4) IMITIERE DEN MENTOR — 2 echte Videos
  prog(50); chapter("Imitiere den Mentor");
  heroImage("04");
  await typeMaia(`Fang mit kleinen Bewegungen an und lass sie immer ausladender werden — dein Körper merkt sich das und ruft es später automatisch ab. 👀`);
  await videoStep("Clip 1 · So sieht's aus", "533055976", "So ungefähr soll deine Bewegung aussehen.");
  await videoStep("Clip 2 · Der Mentor", "515266864", "Schau genau hin und mach es nach.");
  await typeMaia(`Ungewohnt am Anfang? Sei beruhigt — das geht uns allen so. 🙂`);
  await weiterInline("Nachgemacht – weiter");

  // 5) SCHNEIDE HAARE — 3 echte Videos + echte Technik-Tipps
  prog(64); chapter("Schneide Haare");
  heroImage("05");
  await typeMaia(`Jetzt am Übungskopf, ${NAME}. Mach jede Übung mit und stopp das Video, wenn's zu schnell geht. ✂️`);
  await typeMaia(`Aufrecht sitzen, Stativ so, dass die Haarspitzen etwa auf Augenhöhe sind. Schere mit Daumen und Ringfinger halten — bewegt wird vor allem der Daumen.`);
  checklist(["Stativ", "Übungskopf", "Kamm", "Haarschneideschere", "Sprühflasche"]);
  await sleep(150);
  await videoStep("Clip 1 · Schere halten", "752204544", "Schere mit Daumen und Ringfinger führen.");
  await videoStep("Clip 2 · Schere einstellen", "618370982", "Neutral eingestellt? Widerstand über die Schraube in der Mitte anpassen.");
  await videoStep("Clip 3 · Um den Kopf schneiden", "743191114", "Dein Ziel heute: einmal gerade um den Kopf.");
  await weiterInline("Geschnitten – weiter");

  // 6) FEIERE DEINE ERGEBNISSE — echtes Recap (KEIN Quiz)
  prog(78); chapter("Feiere deine Ergebnisse");
  heroImage("06");
  await typeMaia(`Feiere deine Ergebnisse, ${NAME}! 🎉 Das hast du heute gelernt: eine gerade Linie schneiden.`);
  await typeMaia(`Zur Wiederholung: aufrecht sitzen, Stativ auf Augenhöhe, feuchtes Haar sorgfältig von oben nach unten durchkämmen — dann von rechts in kleinen Schnitten bis zur anderen Seite. Haare zwischen Zeige- und Mittelfinger fixieren (Linkshänder*innen andersrum).`);
  await typeMaia(`Diese Schnittlinie nennt man Außenlinie. Du kannst jetzt schon feinem Haar die Spitzen schneiden — ich bin stolz auf dich! 💫`);
  await weiterInline("Weiter");

  // 7) MENTORS CHECK — echtes Beispielfoto + Upload + Team-Link
  prog(88); chapter("Mentors Check");
  await typeMaia(`Zeig deinen Mentoren dein Ergebnis und hol dir Feedback. 📸`);
  if (PHOTO) add(`<div class="card vcard"><img src="${PHOTO}" alt="Beispiel: Außenlinie / One Length" style="width:100%;display:block;border-radius:15px 15px 0 0"><div class="vmeta"><b>Beispiel</b><span>Basic Cut 1 · Abenteuer 7 · um den Kopf geschnitten</span></div></div>`);
  await sleep(200);
  uploadCard();   // echter Datei-Picker; gewähltes Foto erscheint inline
  const q = await askAnswer(`Lade dein Foto hoch und stell eine Frage dazu — so bekommst du persönliches Feedback.`, "Deine Frage an die Mentoren …");
  await typeMaia(`Sobald dein Foto hochgeladen ist, schaut das Team „Mentors Check" drüber — du bekommst dann Feedback. 💛`);

  // 8) VERTIEFE DEIN WISSEN — echte Sourance (Playlist 101)
  prog(94); chapter("Vertiefe dein Wissen");
  heroImage("08");
  await typeMaia(`Mit dieser Sourance vertiefst du das Gelernte in deinem Unterbewussten. 🎧`);
  await typeMaia(`Wieder: Kopfhörer auf, aufrecht & bequem, intuitiv einen Track wählen, auf die Länge achten. Enjoy it!`);
  audioPlayer("Vertiefe dein Wissen – Alle", "101");
  await sleep(300);
  await weiterInline("Hat gutgetan");

  // 9) TAGEBUCH DEINER STÄRKEN — echtes Journal-Framing
  prog(100); chapter("Tagebuch deiner Stärken");
  heroImage("09");
  await typeMaia(`Zum Schluss dein „Tagebuch deiner Stärken", ${NAME}. 📔`);
  await typeMaia(`Das Besondere: Das Papier zeigt nur, was du über Stärken, Erfolge, Ressourcen und deine nächsten kleinen Schritte schreibst — Misslungenes hinterlässt keine Spur.`);
  await typeMaia(`Reflektier am besten jeden Abend so. Kein solches Tagebuch zur Hand? Nimm irgendeins und tu einfach so, als wäre es dieses besondere.`);
  const win = await askAnswer(`Jetzt gleich, geführt durch eine Frage: Was ist dir heute gut gelungen?`, "Deine Stärke heute …");
  await callMaia(`${NAME} schreibt ins Stärken-Tagebuch (Abenteuer 7): "${win}". Würdige das warm und ermutige, dranzubleiben.`);
  document.getElementById("stars").textContent = "480";
  badge("Abenteuer 7 ✓", "Basic Cut I · +40 Sterne");
  await sleep(300);
  // Composer bleibt stehen — der Chat mit Maia geht weiter, auch nach dem Abenteuer.
  add(`<div class="inline-cta-wrap"><button class="inline-cta" type="button" onclick="location.reload()">Nochmal erleben</button></div>`);
  await typeMaia(`Und wenn dir noch was durch den Kopf geht — frag mich einfach hier. Ich bin da. 💛`);
}

mountComposer();
play();
