/* Abenteuer 7 — Basic Cut I — chat-first in Maia-Optik.
   Baut auf der Coaching-Engine auf (gleiche Helfer wie coaching.js).
   Struktur 1:1 aus WordPress (9 Schritte). */
const NAME = "Lena";
const stream = document.getElementById("stream");
const dock = document.getElementById("dock");
const progbar = document.getElementById("progbar");
const VBASE = window.MAIA_VBASE || ""; // "" = lokale <id>.mp4; sonst öffentliche R2-Basis

const MAIA_SYSTEM = `Du bist Maia, die KI-Mentorin der Hairdressing.school. Sprich Deutsch, warm und ermutigend wie eine gute Freundin, die textet: 1-2 kurze Sätze, höchstens 1-2 Emojis, konkret. Die Lernende heißt ${NAME}. Ihr seid im praktischen Kurs "Basic Cut I", Lektion "Abenteuer 7": erst am Papier üben, den Mentor imitieren, dann Haare schneiden — Ziel: einmal gerade um den Kopf (Außenlinie). Es gibt kein Richtig/Falsch, nur Üben, Beobachten, Experimentieren. Gib nie technische Details über dich preis. Antworte NUR mit Maias Nachricht.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scroll = () => { stream.scrollTop = stream.scrollHeight; setTimeout(() => { stream.scrollTop = stream.scrollHeight; }, 30); };
function add(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); const n = d.firstChild; stream.appendChild(n); scroll(); return n; }
function prog(p) { progbar.style.width = p + "%"; }
function chapter(t) { add(`<div class="chapter">${t}</div>`); document.getElementById("ctx").textContent = "Basic Cut I · " + t; }
function techtag(label, mint) { add(`<div class="techtag${mint ? " mint" : ""}">✦ ${label}</div>`); }

async function typeMaia(text) {
  const t = add('<div class="typing"><div class="mava"></div><div class="d"><i></i><i></i><i></i></div></div>');
  await sleep(Math.min(450 + text.length * 11, 1500)); t.remove();
  add(`<div class="row"><div class="mava"></div><div class="bub">${text}</div></div>`);
  await sleep(200);
}
function addUser(text) { add(`<div class="row user"><div class="bub">${text}</div></div>`); }
async function callMaia(context) {
  const t = add('<div class="typing"><div class="mava"></div><div class="d"><i></i><i></i><i></i></div></div>');
  let reply = "Das nehme ich mit — schön, dass du drangeblieben bist. 💛";
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch("/api/maia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: NAME, system: MAIA_SYSTEM, context }), signal: ctl.signal });
    clearTimeout(to); reply = (await r.json()).reply || reply;
  } catch {}
  t.remove(); add(`<div class="row"><div class="mava"></div><div class="bub">${reply}</div></div>`); await sleep(200);
}

function gateChips(options) {
  return new Promise((res) => {
    dock.innerHTML = `<div class="chips">${options.map((o, i) => `<button class="chip" data-i="${i}">${o}</button>`).join("")}</div>`;
    dock.querySelectorAll(".chip").forEach((c) => c.onclick = () => { const i = +c.dataset.i; dock.innerHTML = ""; res(i); });
  });
}
function gateWeiter(label) {
  return new Promise((res) => { dock.innerHTML = `<button class="cta" id="cta">${label}</button>`; document.getElementById("cta").onclick = () => { dock.innerHTML = ""; res(); }; });
}
function gateText(ph) {
  return new Promise((res) => {
    dock.innerHTML = `<div class="inputbar"><input id="ft" placeholder="${ph}" autocomplete="off"><button id="sb" aria-label="Senden"><svg viewBox="0 0 24 24" fill="#fff" width="19" height="19"><path d="M4 12l16-8-6 16-2-6-8-2z"/></svg></button></div>`;
    const inp = document.getElementById("ft"), go = () => { const v = inp.value.trim(); if (!v) return; dock.innerHTML = ""; addUser(v); res(v); };
    document.getElementById("sb").onclick = go; inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }); inp.focus();
  });
}

// --- Bausteine ---
function checklist(items) {
  add(`<div class="checklist">${items.map(x => `<div class="cl-item"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${x}</div>`).join("")}</div>`);
  scroll();
}
function audioCard(title, sub) {
  add(`<div class="audio"><div class="p"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div><div class="acol"><b>${title}</b><div class="bar"><i></i></div><small>${sub}</small></div></div>`);
  scroll();
}
function videoCard(label, vid, caption) {
  add(`<div class="card vcard"><video controls preload="metadata" playsinline src="${VBASE}${vid}.mp4"></video><div class="vmeta"><b>${label}</b>${caption ? `<span>${caption}</span>` : ""}</div></div>`);
  scroll();
}
async function videoStep(label, vid, caption) { videoCard(label, vid, caption); await sleep(380); }
function badge(title, sub) {
  add(`<div class="badge"><div class="medal"><img src="img/maia-heart.svg" alt="Maia"></div><b>${title}</b><span>${sub}</span></div>`);
}

async function playGame(fn) {
  const host = add(`<div class="gamehost"></div>`);
  const skip = add(`<div class="gameskip"><button type="button">Spiel überspringen →</button></div>`);
  let settled = false;
  const gameP = Promise.resolve().then(() => fn(host)).then((r) => { settled = true; return { skipped: false, r }; });
  const skipP = new Promise((res) => { skip.querySelector("button").onclick = () => { if (settled) return; res({ skipped: true, r: null }); }; });
  const out = await Promise.race([gameP, skipP]);
  if (out.skipped) { try { host.dispatchEvent(new CustomEvent("gamedispose")); } catch (e) {} host.remove(); }
  skip.remove();
  return out.r;
}
function firstGame(names) { for (const n of names) if (typeof window[n] === "function") return window[n]; return null; }

async function play() {
  // 1) STIMM DICH EIN  (Audio · Sourance)
  prog(6); chapter("Stimm dich ein");
  await typeMaia(`Hi ${NAME}! Schön, dass du da bist — lass uns gemeinsam in ein neues Abenteuer starten. 🚀`);
  await typeMaia(`Bevor's losgeht, kommen wir kurz an. Ich hab dir eine Sourance mitgebracht — sanfte Klänge, die dich entspannt und fokussiert machen. 🎧`);
  audioCard("Sourance · sanfte Klänge", "Kopfhörer auf, aufrecht sitzen, intuitiv einen Track wählen");
  await sleep(300);
  await typeMaia(`Und pack dir schon mal deine Ausrüstung fürs ganze Abenteuer bereit:`);
  checklist(["Papier (A4)", "Stift", "Klebestreifen", "Papierschere", "Stativ", "Übungskopf", "Kamm", "Sprühflasche", "Haarschneideschere"]);
  await sleep(300);
  await gateWeiter("Alles bereit – los!");

  // 2) COACHING: MIT ALLEN SINNEN  (Coaching-Einheit eingewoben)
  prog(16); chapter("Coaching · Mit allen Sinnen");
  await typeMaia(`Kurze Frage, ${NAME}: Wie merkst du dir Dinge am leichtesten — und wie muss dir etwas gezeigt werden, damit es wirklich hängen bleibt? 🤔`);
  await typeMaia(`„Ich habe keine besondere Begabung, sondern bin nur leidenschaftlich neugierig." Genau diese Neugier nehmen wir jetzt mit. ✨`);
  await typeMaia(`Erst mal ankommen — atme einmal mit mir. 🌬️`);
  const gAtem = firstGame(["gameAtem"]);
  if (gAtem) await playGame(gAtem);
  await typeMaia(`Denk dran: Es gibt kein Richtig oder Falsch — nur dein Üben, Beobachten, Experimentieren. Werde dabei dein eigener Lehrer. 🌱`);
  const gMind = firstGame(["gameMindsetSort"]);
  if (gMind) { await typeMaia(`Sortier mal kurz — fester Blick oder Wachstums-Blick?`); await playGame(gMind); }
  await gateWeiter("Ich bin bereit");

  // 3) SCHNEIDE PAPIER  (4 Videos + Spiel)
  prog(32); chapter("Schneide Papier");
  await typeMaia(`Jetzt wärmen wir deine Finger auf — wir üben die Bewegungen erst ganz easy am Papier. ✂️`);
  await typeMaia(`Auch wenn du das mit deinem Mentor schon gemacht hast: die Wiederholung macht's dir leichter. Los geht's!`);
  checklist(["Papier (A4)", "Stift", "Klebestreifen", "Papierschere"]);
  await sleep(200);
  await videoStep("Clip 1 · Schneide Papier", "502781457", "Schau in Ruhe zu und mach direkt mit.");
  await videoStep("Clip 2 · Schneide Papier", "502798034");
  await videoStep("Clip 3 · Schneide Papier", "502782321");
  await videoStep("Clip 4 · Schneide Papier", "502800919");
  await typeMaia(`Jetzt du: Führ die Schere ruhig an der Linie entlang — kleines Präzisions-Spiel. ✂️`);
  const gCut = firstGame(["gameSchneide", "gameBeobachtung", "gameReflexSlider"]);
  if (gCut) {
    const r = await playGame(gCut);
    if (r && r.precision != null) await typeMaia(`${Math.round(r.precision)}% auf der Linie — spürst du, wie die Hand ruhiger wird? 💛`);
    else await typeMaia(`Gut geführt — genau dieses Gefühl nimmst du gleich mit an den Kopf. 💛`);
  }

  // 4) IMITIERE DEN MENTOR  (2 Videos: Schülerin, dann Mentor)
  prog(50); chapter("Imitiere den Mentor");
  await typeMaia(`Jetzt machst du dem Mentor die Bewegungen einfach nach — imitieren ist der schnellste Weg. 👀`);
  await typeMaia(`Fang klein an und werde nach und nach ausladender. Dein Körper merkt sich das — und ruft es später automatisch ab.`);
  await videoStep("Clip 1 · So soll's aussehen", "533055976", "Die Schülerin zeigt die Bewegung.");
  await videoStep("Clip 2 · Der Mentor", "515266864", "Schau genau hin und mach es nach.");
  await typeMaia(`Ungewohnt am Anfang? Völlig normal — das geht uns allen so. 🙂`);
  await gateWeiter("Nachgemacht – weiter");

  // 5) SCHNEIDE HAARE  (3 Videos)
  prog(64); chapter("Schneide Haare");
  await typeMaia(`Jetzt wird's ernst, ${NAME} — wir schneiden Haare! Mach jede Übung direkt mit und stopp das Video, wenn's zu schnell geht. ✂️`);
  await typeMaia(`Sitz aufrecht, Stativ so, dass die Spitzen etwa auf Augenhöhe sind. Schere mit Daumen und Ringfinger halten — bewegt wird v. a. der Daumen.`);
  checklist(["Stativ", "Übungskopf", "Kamm", "Haarschneideschere", "Sprühflasche"]);
  await sleep(200);
  await videoStep("Clip 1 · Schere halten", "752204544", "Schere richtig in die Hand nehmen.");
  await videoStep("Clip 2 · Schere prüfen", "618370982", "Neutral eingestellt? Widerstand über die Schraube anpassen.");
  await videoStep("Clip 3 · Um den Kopf schneiden", "743191114", "Dein Ziel heute: einmal gerade um den Kopf.");
  await gateWeiter("Geschnitten – weiter");

  // 6) FEIERE DEINE ERGEBNISSE
  prog(78); chapter("Feiere deine Ergebnisse");
  await typeMaia(`Geschafft, ${NAME} — Zeit zu feiern! 🎉 Das hast du heute gelernt: eine gerade Linie schneiden.`);
  await typeMaia(`Kurz zum Merken: Wie heißt diese gerade Linie rund um den Kopf?`);
  const line = await gateChips(["Außenlinie", "Mittellinie", "Randlinie"]);
  await typeMaia(line === 0 ? `Genau — die Außenlinie. Du kannst jetzt schon feinem Haar die Spitzen schneiden. Ich bin stolz auf dich! 💫` : `Fast — man nennt sie Außenlinie. Merk sie dir, die begegnet dir wieder. 😊`);

  // 7) MENTORS CHECK  (Upload / Einsendung an die Mentoren)
  prog(88); chapter("Mentors Check");
  await typeMaia(`Jetzt zeig deinen Mentoren, was du geschafft hast! 📸`);
  await typeMaia(`Mach ein Foto von deinem Ergebnis („Basic Cut 1 · Abenteuer 7 · um den Kopf geschnitten") — und stell ruhig eine Frage dazu, dann bekommst du persönliches Feedback.`);
  add(`<div class="upload"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--rose5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg><b>Ergebnis hochladen</b><small>Foto an das Mentors-Check-Team senden</small></div>`);
  await sleep(300);
  const q = await gateText("Deine Frage an den Mentor…");
  await typeMaia(`Top — das schicke ich mit deinem Foto an die Mentoren. Du bekommst bald persönliches Feedback. 💛`);

  // 8) VERTIEFE DEIN WISSEN  (Audio · Sourance)
  prog(94); chapter("Vertiefe dein Wissen");
  await typeMaia(`Zum Abschluss lassen wir das Gelernte sacken. Diese Sourance hilft deinem Unterbewusstsein, alles entspannt zu verarbeiten. 🎧`);
  audioCard("Sourance · sacken lassen", "Kopfhörer auf, intuitiv einen Track wählen, genießen");
  await sleep(300);
  await gateWeiter("Hat gutgetan");

  // 9) TAGEBUCH DEINER STÄRKEN  (Journal)
  prog(100); chapter("Tagebuch deiner Stärken");
  await typeMaia(`Zum Schluss dein „Tagebuch deiner Stärken", ${NAME} — hier zählt nur, was dir gelingt. 📔`);
  await typeMaia(`Was ist dir heute schon gut gelungen?`);
  const win = await gateText("Deine Stärke heute…");
  await callMaia(`${NAME} schreibt ins Stärken-Tagebuch von Abenteuer 7 (Papier/Haare schneiden): "${win}". Würdige das warm und ermutige, dranzubleiben.`);
  document.getElementById("stars").textContent = "480";
  badge("Abenteuer 7 ✓", "Basic Cut I · +40 Sterne");
  await sleep(300);
  dock.innerHTML = `<button class="cta" onclick="location.reload()">Nochmal erleben</button>`;
}

play();
