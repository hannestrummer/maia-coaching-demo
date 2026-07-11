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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scroll = () => { stream.scrollTop = stream.scrollHeight; setTimeout(() => { stream.scrollTop = stream.scrollHeight; }, 30); };
function add(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); const n = d.firstChild; stream.appendChild(n); scroll(); return n; }
function prog(p) { progbar.style.width = p + "%"; }
function chapter(t) { add(`<div class="chapter">${t}</div>`); document.getElementById("ctx").textContent = "Basic Cut I · " + t; }

async function typeMaia(text) {
  const t = add('<div class="typing"><div class="mava"></div><div class="d"><i></i><i></i><i></i></div></div>');
  await sleep(Math.min(420 + text.length * 10, 1400)); t.remove();
  add(`<div class="row"><div class="mava"></div><div class="bub">${text}</div></div>`);
  await sleep(190);
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
  t.remove(); add(`<div class="row"><div class="mava"></div><div class="bub">${reply}</div></div>`); await sleep(190);
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
function heroImage(stepKey) { const u = IMG[stepKey]; if (u) { add(`<div class="imgcard"><img src="${u}" alt=""></div>`); scroll(); } }
function checklist(items) { add(`<div class="checklist">${items.map(x => `<div class="cl-item"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${x}</div>`).join("")}</div>`); scroll(); }
function audioPlayer(playlistTitle, playerId) {
  const tracks = AUDIO[playerId] || [];
  if (!tracks.length) { add(`<div class="audio"><div class="p" style="opacity:.5"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div><div class="acol"><b>${playlistTitle}</b><small>Track wird geladen …</small></div></div>`); scroll(); return; }
  const rows = tracks.map((t, i) => `<button class="apl-track" data-i="${i}"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>${t.title || ("Track " + (i + 1))}</span></button>`).join("");
  const n = add(`<div class="audiopl"><div class="apl-head">🎧 ${playlistTitle}<small>Wähl intuitiv einen Track</small></div><div class="apl-tracks">${rows}</div><audio class="apl-audio" controls preload="none"></audio></div>`);
  const au = n.querySelector(".apl-audio");
  n.querySelectorAll(".apl-track").forEach((b) => b.onclick = () => { const t = tracks[+b.dataset.i]; au.src = t.url; au.play().catch(() => {}); n.querySelectorAll(".apl-track").forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
  scroll();
}
function videoCard(label, vid, caption) { add(`<div class="card vcard"><video controls preload="metadata" playsinline src="${VBASE}${vid}.mp4"></video><div class="vmeta"><b>${label}</b>${caption ? `<span>${caption}</span>` : ""}</div></div>`); scroll(); }
async function videoStep(label, vid, caption) { videoCard(label, vid, caption); await sleep(360); }
function badge(title, sub) { add(`<div class="badge"><div class="medal"><img src="img/maia-heart.svg" alt="Maia"></div><b>${title}</b><span>${sub}</span></div>`); }

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
  // 1) STIMM DICH EIN — echte Sourance (Playlist 92) + echtes Bild
  prog(6); chapter("Stimm dich ein");
  heroImage("01");
  await typeMaia(`Mit dieser Sourance stimmst du dich optimal auf dein Abenteuer ein, ${NAME}. 🎧`);
  await typeMaia(`Sie hilft dir, ganz entspannt und zugleich fokussiert zu werden.`);
  await typeMaia(`Kurz die Technik: Binaurale Beats bringen dich leichter in den Alpha-Zustand (12 Hz), bilateraler Sound synchronisiert deine beiden Gehirnhälften. So passiert Lernen nebenbei.`);
  await typeMaia(`Kopfhörer auf, aufrecht & bequem sitzen — und wähl intuitiv einen Track. Achte auch auf die Länge. Go with the flow!`);
  audioPlayer("Stimm dich ein – Alle", "92");
  await sleep(300);
  await gateWeiter("Bin eingestimmt – weiter");

  // 2) COACHING: MIT ALLEN SINNEN — echter Inhalt + Ankommen (Atem)
  prog(16); chapter("Coaching · Mit allen Sinnen");
  heroImage("02");
  await typeMaia(`Go with the flow, ${NAME}! ✨ Heute im Coaching: mit allen Sinnen.`);
  await typeMaia(`„Ich habe keine besondere Begabung, sondern bin nur leidenschaftlich neugierig."`);
  await typeMaia(`Diese Neugier darf dich in einen neuen Bewusstseinszustand begleiten — atme einmal mit mir. 🌬️`);
  const gAtem = firstGame(["gameAtem"]);
  if (gAtem) await playGame(gAtem);
  await typeMaia(`Kurze Frage: Wie merkst du dir etwas am leichtesten — und wie muss dir eine Info gezeigt werden, damit sie hängen bleibt?`);
  const learn = await gateText("Wie du am besten lernst …");
  await typeMaia(`Schön — genau darauf achten wir. All deine Sinne spielen beim Lernen mit. 🌱`);
  await gateWeiter("Weiter");

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
  await gateWeiter("Nachgemacht – weiter");

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
  await gateWeiter("Geschnitten – weiter");

  // 6) FEIERE DEINE ERGEBNISSE — echtes Recap (KEIN Quiz)
  prog(78); chapter("Feiere deine Ergebnisse");
  heroImage("06");
  await typeMaia(`Feiere deine Ergebnisse, ${NAME}! 🎉 Das hast du heute gelernt: eine gerade Linie schneiden.`);
  await typeMaia(`Zur Wiederholung: aufrecht sitzen, Stativ auf Augenhöhe, feuchtes Haar sorgfältig durchkämmen — dann von rechts in kleinen Schnitten bis zur anderen Seite. Haare zwischen Zeige- und Mittelfinger fixieren (Linkshänder*innen andersrum).`);
  await typeMaia(`Diese Schnittlinie nennt man Außenlinie. Du kannst jetzt schon feinem Haar die Spitzen schneiden — ich bin stolz auf dich! 💫`);
  await gateWeiter("Weiter");

  // 7) MENTORS CHECK — echtes Beispielfoto + Upload + Team-Link
  prog(88); chapter("Mentors Check");
  await typeMaia(`Zeig deinen Mentoren dein Ergebnis und hol dir Feedback. 📸`);
  if (PHOTO) add(`<div class="card vcard"><img src="${PHOTO}" alt="Beispiel: Außenlinie / One Length" style="width:100%;display:block;border-radius:15px 15px 0 0"><div class="vmeta"><b>Beispiel</b><span>Basic Cut 1 · Abenteuer 7 · um den Kopf geschnitten</span></div></div>`);
  await sleep(200);
  await typeMaia(`Lade ein Foto deines Ergebnisses hoch und stell eine Frage dazu — so bekommst du persönliches Feedback.`);
  add(`<div class="upload"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--rose5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg><b>Ergebnis hochladen</b><small>zum Team „Mentors Check"</small></div>`);
  await sleep(200);
  const q = await gateText("Deine Frage an die Mentoren …");
  await typeMaia(`Top — das geht mit deinem Foto ans Team „Mentors Check". Du bekommst bald Feedback. 💛`);

  // 8) VERTIEFE DEIN WISSEN — echte Sourance (Playlist 101)
  prog(94); chapter("Vertiefe dein Wissen");
  heroImage("08");
  await typeMaia(`Mit dieser Sourance vertiefst du das Gelernte in deinem Unterbewussten. 🎧`);
  await typeMaia(`Wieder: Kopfhörer auf, aufrecht & bequem, intuitiv einen Track wählen, auf die Länge achten. Enjoy it!`);
  audioPlayer("Vertiefe dein Wissen – Alle", "101");
  await sleep(300);
  await gateWeiter("Hat gutgetan");

  // 9) TAGEBUCH DEINER STÄRKEN — echtes Journal-Framing
  prog(100); chapter("Tagebuch deiner Stärken");
  heroImage("09");
  await typeMaia(`Zum Schluss dein „Tagebuch deiner Stärken", ${NAME}. 📔`);
  await typeMaia(`Das Besondere: Das Papier zeigt nur, was du über Stärken, Erfolge, Ressourcen und deine nächsten kleinen Schritte schreibst — Misslungenes hinterlässt keine Spur.`);
  await typeMaia(`Reflektier am besten jeden Abend so. Kein solches Tagebuch zur Hand? Nimm irgendeins und tu einfach so, als wäre es dieses besondere.`);
  await typeMaia(`Jetzt gleich, geführt durch eine Frage: Was ist dir heute gut gelungen?`);
  const win = await gateText("Deine Stärke heute …");
  await callMaia(`${NAME} schreibt ins Stärken-Tagebuch (Abenteuer 7): "${win}". Würdige das warm und ermutige, dranzubleiben.`);
  document.getElementById("stars").textContent = "480";
  badge("Abenteuer 7 ✓", "Basic Cut I · +40 Sterne");
  await sleep(300);
  dock.innerHTML = `<button class="cta" onclick="location.reload()">Nochmal erleben</button>`;
}

play();
