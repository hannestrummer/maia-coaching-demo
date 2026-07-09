const NAME = "Lena";
const stream = document.getElementById("stream");
const dock = document.getElementById("dock");
const progbar = document.getElementById("progbar");

const COACHING_SYSTEM = `Du bist Maia, die KI-Mentorin der Hairdressing.school. Sprich Deutsch, warm und ermutigend wie eine gute Freundin, die textet: 1-2 kurze Sätze, höchstens 1-2 Emojis, konkret. Die Lernende heißt ${NAME}. Ihr seid in der Coaching-Unit "Werde dein Lehrer": es geht darum, dass sie ihr eigener Lehrer wird, autodidaktisch lernt, dass es kein Richtig/Falsch gibt, nur Üben, Beobachten, Experimentieren. NICHT übers Haareschneiden reden. Gib nie technische Details über dich preis. Antworte NUR mit Maias Nachricht.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let _sq = false;
const scroll = () => { if (_sq) return; _sq = true; requestAnimationFrame(() => { _sq = false; stream.scrollTop = stream.scrollHeight; }); };
function add(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); const n = d.firstChild; stream.appendChild(n); scroll(); return n; }
function prog(p) { progbar.style.width = p + "%"; }
function chapter(t) { add(`<div class="chapter">${t}</div>`); document.getElementById("ctx").textContent = "Coaching · " + t; }
function techtag(label, mint) { add(`<div class="techtag${mint ? " mint" : ""}">✦ ${label}</div>`); }

async function typeMaia(text) {
  const t = add('<div class="typing"><div class="mava"></div><div class="d"><i></i><i></i><i></i></div></div>');
  await sleep(Math.min(500 + text.length * 13, 1700)); t.remove();
  add(`<div class="row"><div class="mava"></div><div class="bub">${text}</div></div>`);
  await sleep(250);
}
function addUser(text) { add(`<div class="row user"><div class="bub">${text}</div></div>`); }
async function callMaia(context) {
  const t = add('<div class="typing"><div class="mava"></div><div class="d"><i></i><i></i><i></i></div></div>');
  let reply = "Schön gesagt. 💛";
  try { const r = await fetch("/api/maia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: NAME, system: COACHING_SYSTEM, context }) }); reply = (await r.json()).reply; } catch {}
  t.remove(); add(`<div class="row"><div class="mava"></div><div class="bub">${reply}</div></div>`); await sleep(250);
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

async function lottieHero() {
  techtag("Lottie · animierte Szene");
  const n = add(`<div class="lottie-hero" id="lot"></div>`);
  try {
    lottie.loadAnimation({ container: n, renderer: "svg", loop: true, autoplay: true, path: "lottie/breathe.json" });
  } catch { n.style.background = "radial-gradient(circle,var(--mint) 30%,transparent 70%)"; }
  await sleep(1600);
}

async function reactionChoice() {
  techtag("interaktiv · Rive-Stil (reagiert auf deine Wahl)");
  const scene = add(`<div class="reaction"><img src="img/maia-warm.svg" alt="Maia"></div>`);
  const choice = await gateChips(["Ja, stimmt", "Nein, nicht ganz"]);
  const img = scene.querySelector("img");
  img.src = choice === 0 ? "img/maia-wink.svg" : "img/maia-heart.svg";
  scene.classList.add(choice === 0 ? "yes" : "no");
  for (let i = 0; i < 7; i++) { const s = document.createElement("span"); s.className = "spark"; s.style.setProperty("--dx", (Math.random() * 120 - 60) + "px"); s.style.setProperty("--dy", (Math.random() * -90 - 20) + "px"); s.style.animationDelay = (i * 40) + "ms"; scene.appendChild(s); }
  scene.classList.add("go");
  await sleep(700);
  return choice;
}

async function bigSentences(list) {
  techtag("Chat-Animation · groß & langsam");
  for (const s of list) {
    const n = add(`<div class="bigsent">${s}</div>`);
    await sleep(60); n.classList.add("in"); await sleep(1400);
  }
  const th = add(`<div class="thought">💭 „Ich mag diese Art zu denken."</div>`);
  await sleep(60); th.classList.add("in"); await sleep(900);
}

async function termsLoop(list) {
  techtag("Chat-Animation", true);
  const box = add(`<div class="terms"></div>`);
  for (const t of list) { const n = document.createElement("div"); n.className = "term"; n.textContent = t; box.appendChild(n); scroll(); await sleep(80); n.classList.add("in"); await sleep(600); }
  await sleep(500);
}

async function riveExperiment(opts) {
  techtag(opts.tag);
  const card = add(`<div class="rivecard"><canvas class="rivecanvas"></canvas><button class="cta rivebtn">${opts.btn}</button></div>`);
  const canvas = card.querySelector("canvas"), btn = card.querySelector(".rivebtn");
  try {
    const r = new rive.Rive({ src: opts.src, canvas, artboard: opts.artboard, stateMachines: opts.sm, autoplay: true,
      onLoad: () => { try { r.resizeDrawingSurfaceToCanvas(); } catch (e) {}
        const ins = r.stateMachineInputs(opts.sm) || []; const inp = ins.find((i) => i.name === opts.input);
        btn.onclick = () => { if (!inp) return; if (opts.kind === "trigger") inp.fire(); else inp.value = !inp.value; }; } });
  } catch (e) { card.querySelector("canvas").outerHTML = `<div style="padding:22px;text-align:center;color:var(--mid);font-size:13px">Rive-Demo</div>`; }
  scroll(); await sleep(500);
}

function miniGameCollect(host, words, dur = 12000) {
  return new Promise((res) => {
    const g = document.createElement("div"); g.className = "game";
    g.innerHTML = `<div class="gscore">0 gesammelt</div><div class="gstart"><button class="cta" style="width:auto;margin:0">Los geht's ✋</button></div>`;
    host.appendChild(g); scroll();
    const scoreEl = g.querySelector(".gscore"); let score = 0;
    let si = 0, done = false; const timers = [];
    const cleanup = () => { done = true; if (si) clearInterval(si); timers.forEach(clearTimeout); };
    host.addEventListener("gamedispose", cleanup, { once: true });   // Skip -> alle Timer stoppen
    const spawn = () => {
      if (done || !host.isConnected) { cleanup(); return; }   // Host weg -> Intervall stoppt, kein Leak
      const w = words[Math.floor(Math.random() * words.length)];
      const c = document.createElement("button"); c.className = "gchip"; c.textContent = w;
      c.style.left = (12 + Math.random() * 68) + "%"; c.style.transform = "translate(-50%, 30px)";
      g.appendChild(c); void c.offsetHeight; c.style.transform = "translate(-50%, -330px)";
      c.onclick = () => { if (c.classList.contains("got")) return; c.classList.add("got"); score++; scoreEl.textContent = score + " gesammelt"; timers.push(setTimeout(() => c.remove(), 300)); };
      timers.push(setTimeout(() => c.remove(), 3600));
    };
    g.querySelector(".gstart button").onclick = () => {
      g.querySelector(".gstart").remove();
      si = setInterval(spawn, 620);
      timers.push(setTimeout(() => { cleanup(); res(score); }, dur));
    };
  });
}

function badge(title, sub) {
  add(`<div class="badge"><div class="medal"><img src="img/maia-heart.svg" alt="Maia"></div><b>${title}</b><span>${sub}</span></div>`);
}

async function playGame(fn) {
  const host = add(`<div class="gamehost"></div>`);
  const skip = add(`<div class="gameskip"><button type="button">Spiel überspringen →</button></div>`);
  let settled = false;
  const gameP = Promise.resolve().then(() => fn(host)).then((r) => { settled = true; return { skipped: false, r }; });
  const skipP = new Promise((res) => {
    skip.querySelector("button").onclick = () => { if (settled) return; res({ skipped: true, r: null }); };
  });
  const out = await Promise.race([gameP, skipP]);
  if (out.skipped) {
    try { host.dispatchEvent(new CustomEvent("gamedispose")); } catch (e) {}  // Spiel räumt sofort auf
    host.remove();
  }
  skip.remove();
  return out.r;
}

async function play() {
  // ---------- ANKOMMEN ----------
  prog(8); chapter("Ankommen");
  await lottieHero();
  await typeMaia(`Komm erst mal an, ${NAME} — atme einmal kurz mit mir. 🌬️`);
  await playGame(window.gameAtem);
  await typeMaia(`Schön, dass du da bist, ${NAME}. 🌱 Ein Satz von Platon zum Ankommen:`);
  await typeMaia(`„Das Höchste, was ein Lehrer erwarten kann, ist, Menschen an das zu erinnern, was sie längst wissen."`);
  prog(15);
  await typeMaia(`Kurze Frage: Worin liegt für dich der Unterschied zwischen Lehrer und Schüler? 🤔`);
  await typeMaia(`Die übliche Antwort: der Lehrer ist der Wissende, der Schüler weiß noch nichts. Stimmt das für dich?`);
  const c = await reactionChoice();
  if (c === 0) await typeMaia(`Diese Art zu lehren ist weit verbreitet — aber ich zeig dir einen viel schöneren Weg. ✨`);
  else await typeMaia(`Hervorragend! Dann trägst du's eigentlich schon in dir. 💛`);

  // ---------- IMPULS ----------
  prog(35); chapter("Impuls");
  await typeMaia(`Wir sehen das so, ${NAME}: Du bringst längst Wissen mit. Hier lernst du vor allem, selbst zu spüren, was für dich stimmig ist — autodidaktisch.`);
  await typeMaia(`Erkennst du den Unterschied? Sortier mal — fester Blick oder Wachstums-Blick?`);
  await playGame(window.gameMindsetSort);
  await bigSentences([
    `Es gibt kein <span class="hl">RICHTIG</span> oder <span class="hl">FALSCH</span> — nur dein Üben.`,
    `Es gibt kein <span class="hl">WICHTIG</span> oder <span class="hl">UNWICHTIG</span> — nur deine Beobachtung.`,
    `Es gibt keinen <span class="hl">MISSERFOLG</span> — nur dein Experiment.`,
  ]);
  await typeMaia(`Bring die drei mal zusammen, ${NAME} — was gehört zu was?`);
  await playGame(window.gamePrinzipienMatch);
  await typeMaia(`Genau — die drei sitzen jetzt. 🌟`);
  await typeMaia(`„Nur deine Beobachtung" heißt: hinschauen, ohne zu bewerten. Probier's gleich, ${NAME} — findest du den feinen Unterschied? 👀`);
  await playGame(window.gameBeobachtung);
  await typeMaia(`Kurz gesagt: Werde dein eigener Lehrer. Dann lernst du so, wie es für DICH am besten ist. 🌱`);
  await typeMaia(`Bau den Satz mal selbst — dann sitzt er. 🧩`);
  await playGame(window.gameSatzBauen);
  await gateWeiter("Das gefällt mir");

  // ---------- ÜBUNG ----------
  prog(60); chapter("Übung");
  await typeMaia(`Kleines Spiel vorweg, ${NAME}: Tipp die Eigenschaften an, die dich ansprechen — sammel so viele du magst. ✋`);
  techtag("Mini-Spiel · tippen & sammeln", true);
  const collected = (await playGame((host) => miniGameCollect(host, ["Geduld", "Humor", "Neugier", "Mut", "Ruhe", "Vertrauen", "Klarheit", "Begeisterung", "Ehrlichkeit", "Offenheit"]))) || 0;
  await typeMaia(`${collected} eingesammelt — schön! 🌟`);
  await typeMaia(`Und jetzt in deinen Worten: welche positiven Eigenschaften braucht ein guter Lehrer für dich — damit du gern von ihm lernst?`);
  const ans = await gateText("Deine Eigenschaften…");
  await callMaia(`${NAME} nennt als Eigenschaften eines guten Lehrers: "${ans}". Würdige das warm und verbinde es mit der Idee, ihr eigener Lehrer zu werden.`);
  await typeMaia(`Super gemacht! 👏`);
  await gateWeiter("Weiter");

  // ---------- REFLEXION ----------
  prog(82); chapter("Reflexion");
  await typeMaia(`Hier ging's nicht um Inhalte, sondern um deine ART zu lernen. Drei, die dich weit tragen:`);
  await typeMaia(`Kurzer Blick nach innen: wo stehst du gerade, ${NAME}?`);
  await playGame(window.gameReflexSlider);
  await termsLoop(["Spaß", "Geduld", "Begeisterung"]);
  await typeMaia(`Feiere deine Erkenntnisse — erinner dich vor jeder Lektion kurz daran. Das steigert deinen Lernerfolg. 😊`);
  await gateWeiter("Weiter");

  // ---------- ABSCHLUSS ----------
  prog(92); chapter("Abschluss");
  await typeMaia(`Erzähl 3 Menschen von deiner neuen Fähigkeit — das verankert sie richtig. 💫`);
  await typeMaia(`Wie nützlich war diese Unit für dich, ${NAME}?`);
  const r = await gateChips(["weniger nützlich", "nützlich", "sehr nützlich"]);
  await typeMaia(r === 2 ? `Das freut mich riesig! 💛` : r === 1 ? `Schön — danke für dein Feedback! 💛` : `Danke für deine Ehrlichkeit — was würdest du dir anders wünschen?`);
  prog(100);
  document.getElementById("stars").textContent = "480";
  badge("Werde dein Lehrer ✓", "Coaching-Unit 1 · +40 Sterne");
  await sleep(300);
  dock.innerHTML = `<button class="cta" onclick="location.href='/'">Zurück zum Lernen</button>`;
}

play();
