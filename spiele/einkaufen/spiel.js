'use strict';
/* =========================================================
   Einkaufen – Spiellogik
   Ablauf wie bei Uhr lesen: Wer spielt?, Einstellungen, Aufgaben, Countdown dazwischen.
   Auf dem Kassenband liegen Produkte mit Preisschild. Wer das Total richtig eintippt,
   bekommt eine Goldmünze in sein rotes Samtsäckchen (10 Münzen pro Säckchen).
   Sind alle Säckchen voll, ist das Spiel fertig.
   Alle Beträge in Rappen als ganze Zahlen (siehe produkte.js).
   ========================================================= */

const TIERE = [
  { id: 'loewe',        name: 'Löwe',        team: 'Löwen' },
  { id: 'tiger',        name: 'Tiger',       team: 'Tiger' },
  { id: 'baer',         name: 'Bär',         team: 'Bären' },
  { id: 'adler',        name: 'Adler',       team: 'Adler' },
  { id: 'hai',          name: 'Hai',         team: 'Haie' },
  { id: 'fuchs',        name: 'Fuchs',       team: 'Füchse' },
  { id: 'wolf',         name: 'Wolf',        team: 'Wölfe' },
  { id: 'elefant',      name: 'Elefant',     team: 'Elefanten' },
  { id: 'erdmaennchen', name: 'Erdmännchen', team: 'Erdmännchen' }
];
const FARBEN = [
  { id: 'rot',     wert: '#d32f2f' },
  { id: 'blau',    wert: '#1565c0' },
  { id: 'gelb',    wert: '#fbc02d' },
  { id: 'orange',  wert: '#e65100' },
  { id: 'lila',    wert: '#7b1fa2' },
  { id: 'gruen',   wert: '#2e7d32' },
  { id: 'tuerkis', wert: '#00838f' }
];
const BILD = {
  kopf: id => `../mathe-fussball/bilder/tiere/${id}.png`,          // Kopf im Ring
  jubel: id => `../mathe-fussball/bilder/figuren/${id}-jubel.png`,  // jubelnde Figur
  produkt: id => `bilder/produkte/${id}.png`
};

const STANDARD = {
  spieler: 2,
  zahlenraum: '20',     // Total höchstens … Fr.
  stufe: 'franken',     // franken | zehn | fuenf (siehe STUFEN in produkte.js)
  produkte: 3,          // höchstens so viele Produkte auf dem Band
  saecke: '3',          // Säckchen bis zum Ziel
  wechselSek: '3',
  ton: true,
  teams: [
    { name: 'Löwen',       tier: 'loewe',        farbe: 'rot' },
    { name: 'Erdmännchen', tier: 'erdmaennchen', farbe: 'blau' }
  ]
};
const SPEICHER_EINST = 'einkaufen.einstellungen.v1';
const MAX_PRODUKTE = 5;
const PRO_SACK = 10;          // Münzen pro Säckchen
const SPERRE_MS = 1500;       // Sperre nach falscher Antwort
const LOESUNG_MS = 1900;      // Lösung zeigen nach richtiger Antwort
const NEUER_SACK_MS = 3000;   // länger, wenn ein neues Säckchen einfliegt
const ENDE_MS = 2200;         // nach der letzten Münze bis zum Schluss-Bild
const WEISS_NICHT_MS = 2600;  // Lösung zeigen bei «Ich weiss es nicht»

/* ---------- Hilfen ---------- */
const tierVon = id => TIERE.find(t => t.id === id) || TIERE[0];
const farbeVon = id => FARBEN.find(f => f.id === id) || FARBEN[0];
function setzeFarbVariablen(el, farbId) {
  const f = farbeVon(farbId);
  el.style.setProperty('--farbe', f.wert);
  el.style.setProperty('--farbe-hell', mischeFarbe(f.wert, 0.8));
  el.style.setProperty('--farbe-dunkel', dunkler(f.wert, 0.35));
  el.style.setProperty('--text', farbId === 'gelb' ? '#1d2733' : '#ffffff');
}
const ringHtml = id => `<span class="ring"><img src="${BILD.kopf(id)}" alt="${tierVon(id).name}"></span>`;
const istStandardName = name => TIERE.some(t => t.team === name);
const muenzText = n => `${n} ${n === 1 ? 'Goldmünze' : 'Goldmünzen'}`;

/* =========================================================
   Töne
   ========================================================= */
let audioCtx = null, tonAusgang = null, stumm = false;
const tonPuffer = {};
const TON_DATEIEN = {   // aus Mathe-Fussball (Quellen in der README)
  richtig: { datei: '../mathe-fussball/toene/richtig.mp3', von: 0.3, dauer: 1.8, laut: 0.9 },
  falsch:  { datei: '../mathe-fussball/toene/falsch.mp3',  von: 0.0, dauer: 0.9, laut: 0.5 },
  tick:    { datei: '../mathe-fussball/toene/tick.wav',    von: 0.0, dauer: 0.95, laut: 1.0 },
  jubel:   { datei: '../mathe-fussball/toene/jubel.mp3',   von: 0.0, dauer: 4.0, laut: 0.7 }
};
function audio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    tonAusgang = audioCtx.createDynamicsCompressor();
    tonAusgang.threshold.value = -14; tonAusgang.ratio.value = 4;
    tonAusgang.connect(audioCtx.destination);
    Object.keys(TON_DATEIEN).forEach(name => {
      fetch(TON_DATEIEN[name].datei).then(r => r.arrayBuffer())
        .then(b => new Promise((ok, f) => audioCtx.decodeAudioData(b, ok, f)))
        .then(p => { tonPuffer[name] = p; }).catch(() => {});
    });
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
document.addEventListener('pointerdown', () => { if (E.ton) audio(); }, { once: true });
const tonAn = () => E.ton && !stumm;
function spieleDatei(name) {
  const ac = audio(), p = tonPuffer[name], t = TON_DATEIEN[name];
  if (!ac || !p) return false;
  const src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = p; g.gain.value = t.laut;
  src.connect(g).connect(tonAusgang);
  src.start(ac.currentTime, t.von, t.dauer);
  return true;
}
function piep(freq, dauer, { typ = 'sine', start = 0, laut = 0.2, bis = null } = {}) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + start;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = typ; o.frequency.setValueAtTime(freq, t0);
  if (bis) o.frequency.exponentialRampToValueAtTime(bis, t0 + dauer);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(laut, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  o.connect(g).connect(tonAusgang || ac.destination);
  o.start(t0); o.stop(t0 + dauer + 0.05);
}
function rauschen(dauer, { start = 0, laut = 0.2, typ = 'bandpass', freq = 1200, bis = null, q = 0.7 } = {}) {
  const ac = audio(); if (!ac) return;
  const len = Math.floor(ac.sampleRate * dauer);
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
  const t0 = ac.currentTime + start;
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = typ; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (bis) f.frequency.exponentialRampToValueAtTime(bis, t0 + dauer);
  const g = ac.createGain(); g.gain.value = laut;
  src.connect(f).connect(g).connect(tonAusgang || ac.destination);
  src.start(t0);
}
/** Metallisches Klimpern: kurze, hohe, unharmonische Töne wie Münzen, die aufeinanderfallen */
function klimpern(start) {
  [0, 0.07, 0.15, 0.21].forEach((s, k) => {
    const f = 2200 + Math.random() * 1600;
    const laut = 0.16 - k * 0.025;
    [1, 1.51, 2.37, 3.13].forEach((m, j) => piep(f * m, 0.22 + Math.random() * 0.15, { start: start + s, laut: laut / (j + 1) }));
  });
}
const TON = {
  richtig() { if (tonAn() && !spieleDatei('richtig')) { piep(880, 0.12, { laut: 0.25 }); piep(1320, 0.18, { start: 0.09, laut: 0.25 }); } },
  falsch()  { if (tonAn() && !spieleDatei('falsch')) piep(150, 0.35, { typ: 'sawtooth', laut: 0.12, bis: 110 }); },
  tick()    { if (tonAn() && !spieleDatei('tick')) piep(1000, 0.04, { typ: 'square', laut: 0.06 }); },
  jubel()   { if (tonAn()) spieleDatei('jubel'); },
  klimpern() { if (tonAn()) klimpern(0); },
  scanner() { if (tonAn()) piep(1850, 0.12, { typ: 'square', laut: 0.06 }); },
  wusch()   { if (tonAn()) rauschen(0.9, { typ: 'bandpass', freq: 400, bis: 2200, q: 1.2, laut: 0.5 }); },
  zubinden() { if (tonAn()) { rauschen(0.18, { typ: 'highpass', freq: 2500, laut: 0.25 }); rauschen(0.18, { start: 0.2, typ: 'highpass', freq: 3000, laut: 0.25 }); } }
};

/* =========================================================
   Einstellungen
   ========================================================= */
let E = Object.assign(structuredClone(STANDARD), laden(SPEICHER_EINST, {}));
if (!Array.isArray(E.teams) || E.teams.length !== 2) E.teams = structuredClone(STANDARD.teams);
// Ungültige gespeicherte Werte durch den Standard ersetzen
if (ganzzahlIn(E.zahlenraum, 2, 1000) === null) E.zahlenraum = STANDARD.zahlenraum;
if (!STUFEN[E.stufe]) E.stufe = STANDARD.stufe;
if (!(E.produkte >= 1 && E.produkte <= MAX_PRODUKTE)) E.produkte = STANDARD.produkte;
if (ganzzahlIn(E.saecke, 1, 5) === null) E.saecke = STANDARD.saecke;
if (ganzzahlIn(E.wechselSek, 0, 30) === null) E.wechselSek = STANDARD.wechselSek;
if (E.spieler !== 1 && E.spieler !== 2) E.spieler = 2;
const merke = () => speichern(SPEICHER_EINST, E);

/** Bei jedem Öffnen bekommen die Teams zufällig zwei verschiedene Farben */
(function verteileFarben() {
  const [a, b] = mischen(FARBEN.slice());
  E.teams[0].farbe = a.id; E.teams[1].farbe = b.id;
})();
if (E.teams[0].tier === E.teams[1].tier) {
  const t = waehle(TIERE.filter(x => x.id !== E.teams[0].tier));
  if (istStandardName(E.teams[1].name)) E.teams[1].name = t.team;
  E.teams[1].tier = t.id;
}
merke();

function zufallsTeam(team) {
  const anderes = E.teams.find(x => x !== team);
  const t = waehle(TIERE.filter(x => x.id !== anderes.tier && x.id !== team.tier));
  team.tier = t.id; team.name = t.team;
}

function baueTeamKarte(i) {
  const team = E.teams[i];
  const karte = $(`karte-${i}`);
  const andererTier = E.spieler === 2 ? E.teams[1 - i].tier : null;
  setzeFarbVariablen(karte, team.farbe);
  karte.classList.toggle('versteckt', i === 1 && E.spieler === 1);
  karte.classList.toggle('allein', E.spieler === 1);
  karte.innerHTML = `
    <div class="team-kopf">
      <h2>${E.spieler === 1 ? 'Dein Tier' : (i === 0 ? 'Team links' : 'Team rechts')}</h2>
      <button class="wuerfel filz" title="Neu würfeln" data-wuerfel>🎲</button>
    </div>
    <input class="team-name" maxlength="18" value="${esc(team.name)}" aria-label="Name">
    <div class="unterzeile">Tier</div>
    <div class="tier-wahl">${TIERE.map(t => {
      const vergeben = t.id === andererTier;
      return `<button data-tier="${t.id}" class="filz ${t.id === team.tier ? 'aktiv' : ''} ${vergeben ? 'vergeben' : ''}" title="${t.name}" ${vergeben ? 'disabled' : ''}>
        <img src="${BILD.kopf(t.id)}" alt="${t.name}"></button>`;
    }).join('')}</div>`;
  karte.querySelector('.team-name').addEventListener('input', ev => { team.name = ev.target.value; merke(); });
  karte.querySelector('[data-wuerfel]').addEventListener('click', () => { zufallsTeam(team); merke(); baueTeamKarte(0); baueTeamKarte(1); });
  karte.querySelectorAll('[data-tier]:not([disabled])').forEach(b => b.addEventListener('click', () => {
    const alt = tierVon(team.tier), neu = tierVon(b.dataset.tier);
    if (!team.name.trim() || team.name === alt.team) team.name = neu.team;
    team.tier = neu.id; merke(); baueTeamKarte(0); baueTeamKarte(1);
  }));
}

function zeichneWahlKnoepfe() {
  document.querySelectorAll('[data-zr]').forEach(b => b.classList.toggle('an', b.dataset.zr === String(E.zahlenraum)));
  document.querySelectorAll('[data-stufe]').forEach(b => b.classList.toggle('an', b.dataset.stufe === E.stufe));
  document.querySelectorAll('[data-anzahl]').forEach(b => b.classList.toggle('an', Number(b.dataset.anzahl) === E.produkte));
}

function zeigeEinstellungen() {
  baueTeamKarte(0); baueTeamKarte(1);
  zeichneWahlKnoepfe();
  $('e-zahlenraum').value = E.zahlenraum;
  $('e-saecke').value = E.saecke;
  $('e-wechsel').value = E.wechselSek;
  $('e-ton').checked = E.ton;
  // Countdown gibt es nur, wenn zwei Kinder abwechselnd an die Tafel kommen
  $('karte-ablauf').classList.toggle('versteckt', E.spieler === 1);
  $('fehler').textContent = '';
  zeigeSeite('einstellungen');
}

function leseFormular() {
  E.zahlenraum = $('e-zahlenraum').value.trim();
  E.saecke = $('e-saecke').value.trim();
  E.wechselSek = $('e-wechsel').value.trim();
  E.ton = $('e-ton').checked;
  merke();
}

/** Prüft die Einstellungen. Gibt eine Fehlermeldung zurück oder null. */
function pruefeEinstellungen() {
  if (ganzzahlIn(E.zahlenraum, 2, 1000) === null) return 'Zahlenraum: bitte ein Total von 2 bis 1000 Franken.';
  if (ganzzahlIn(E.saecke, 1, 5) === null) return 'Säckchen bis zum Ziel: bitte eine Zahl von 1 bis 5.';
  if (E.spieler === 2 && ganzzahlIn(E.wechselSek, 0, 30) === null) return 'Wechselzeit: bitte 0 bis 30 Sekunden.';
  return null;
}

/* =========================================================
   Laden: Regal, Kühlschrank, Kassenband
   Koordinaten im Laden (1600 × 450, unten bündig in der Szene)
   ========================================================= */
const REGAL_REIHEN = [   // von oben nach unten
  ['schokolade', 'gummibaerchen', 'chips', 'cornflakes', 'honig', 'ketchup'],
  ['brot', 'eier', 'cola', 'apfel', 'banane', 'orange'],
  ['erdbeeren', 'karotte', 'gurke', 'tomate', 'broccoli'],
  ['wc-papier', 'waschmittel', 'shampoo', 'zahnpasta', 'zahnbuerste']
];
const KUEHL_REIHEN = [
  ['milch', 'joghurt'],
  ['kaese', 'butter'],
  ['wurst', 'dose'],
  ['glace', 'pizza']
];
const REGAL = { links: 46, rechts: 574, oben: 106, unten: 422, brett: 12 };
const KUEHL = { links: 630, rechts: 806, oben: 112, unten: 416, brett: 6 };
/** Plätze aller 30 Produkte berechnen: { id: { x, y, b, h } } (y = Unterkante) */
function regalPlaetze() {
  const plaetze = {};
  const verteile = (reihen, g) => {
    const reiheH = (g.unten - g.oben) / reihen.length;
    reihen.forEach((reihe, r) => {
      const boden = g.oben + reiheH * (r + 1) - g.brett;
      const zelle = (g.rechts - g.links) / Math.max(...reihen.map(x => x.length));
      const start = g.links + ((g.rechts - g.links) - zelle * reihe.length) / 2;
      reihe.forEach((id, k) => {
        plaetze[id] = { x: start + zelle * k + 4, y: boden, b: zelle - 8, h: reiheH - g.brett - 8, brett: boden, reihe: r };
      });
    });
    return reiheH;
  };
  verteile(REGAL_REIHEN, REGAL);
  verteile(KUEHL_REIHEN, KUEHL);
  return plaetze;
}
const PLAETZE = regalPlaetze();

function baueLaden() {
  const ziel = $('regal-produkte');
  let html = '';
  // Bretter
  [[REGAL_REIHEN, REGAL, 'brett'], [KUEHL_REIHEN, KUEHL, 'kuehl-brett']].forEach(([reihen, g, klasse]) => {
    const reiheH = (g.unten - g.oben) / reihen.length;
    reihen.forEach((_, r) => {
      const y = g.oben + reiheH * (r + 1) - g.brett;
      html += `<div class="${klasse}" style="left:${g.links - 12}px; top:${y}px; width:${g.rechts - g.links + 24}px"></div>`;
    });
  });
  // Produkte und Lücken
  PRODUKTE.forEach(p => {
    const pl = PLAETZE[p.id];
    const stil = `left:${pl.x}px; top:${pl.y - pl.h}px; width:${pl.b}px; height:${pl.h}px`;
    html += `<div class="luecke" id="luecke-${p.id}" style="${stil}"></div>`;
    html += `<div class="regal-ware" id="ware-${p.id}" style="${stil}"><img src="${BILD.produkt(p.id)}" alt="${esc(p.name)}"></div>`;
  });
  // Glasscheibe vor dem Kühlschrank
  html += `<div class="kuehl-glas-vorne" style="left:${KUEHL.links - 3}px; top:${KUEHL.oben - 5}px; width:${KUEHL.rechts - KUEHL.links + 6}px; height:${KUEHL.unten - KUEHL.oben + 3}px"></div>`;
  ziel.innerHTML = html;
}

/** Produkte im Regal ausblenden (sie liegen auf dem Band) bzw. wieder zeigen */
function setzeRegal(ids, imRegal) {
  ids.forEach(id => {
    $(`ware-${id}`).classList.toggle('weg', !imRegal);
    $(`luecke-${id}`).classList.toggle('an', !imRegal);
  });
}
/** Welche Produkte fehlen gerade im Regal? (für Tests) */
const fehlenImRegal = () => PRODUKTE.filter(p => $(`ware-${p.id}`).classList.contains('weg')).map(p => p.id).sort();

const BAND = { links: 0, breite: 515 };
function legeAufsBand(einkauf) {
  const bereich = $('band-bereich');
  const n = einkauf.produkte.length;
  const zelle = BAND.breite / n;
  const breite = Math.min(150, zelle - 12), hoehe = n <= 3 ? 160 : n === 4 ? 145 : 130;
  einkauf.produkte.forEach((p, k) => {
    const el = document.createElement('div');
    el.className = 'band-ware rein';
    el.dataset.id = p.id;
    el.style.left = (BAND.links + zelle * k + (zelle - breite) / 2) + 'px';
    el.style.width = breite + 'px';
    el.innerHTML = `<img src="${BILD.produkt(p.id)}" alt="${esc(p.name)}" style="width:${breite}px; height:${hoehe}px">
      <div class="preis">${betragText(p.preis)}<small>Fr.</small></div>`;
    bereich.appendChild(el);
  });
  // Preisschilder dürfen sich nicht überlappen: sonst jedes zweite tiefer hängen
  const schilder = [...bereich.querySelectorAll('.band-ware:not(.raus) .preis')];
  const rechts = schilder.map(s => { const w = s.parentElement; return { l: w.offsetLeft + w.offsetWidth / 2 - s.offsetWidth / 2, r: w.offsetLeft + w.offsetWidth / 2 + s.offsetWidth / 2 }; });
  const zuEng = rechts.some((a, k) => k > 0 && a.l < rechts[k - 1].r + 6);
  if (zuEng) schilder.forEach((s, k) => s.classList.toggle('tief', k % 2 === 1));
  void bereich.offsetWidth;
  bereich.querySelectorAll('.band-ware.rein').forEach(el => el.classList.remove('rein'));
  laufeBand(950);
  setzeRegal(einkauf.produkte.map(p => p.id), false);
}
function laufeBand(ms) {
  const band = $('band');
  band.classList.add('laeuft');
  clearTimeout(band._t);
  band._t = setTimeout(() => band.classList.remove('laeuft'), ms);
}
/** Band leeren: Produkte fahren zur Kasse weiter, das Regal wird wieder aufgefüllt */
function raeumeBand() {
  const bereich = $('band-bereich');
  const alte = [...bereich.querySelectorAll('.band-ware:not(.raus)')];
  if (!alte.length) return;
  alte.forEach(el => { el.classList.add('raus'); setTimeout(() => el.remove(), 1000); });
  laufeBand(900);
  setzeRegal(alte.map(el => el.dataset.id), true);
}

function zeigeAnzeige(text, art) {
  const t = $('anzeige-text');
  t.textContent = text;
  t.className = art || '';
  t.style.fontSize = text.length > 9 ? '30px' : '';
}

/* =========================================================
   Goldsäckchen (SVG, viewBox 0 0 200 240)
   ========================================================= */
const SACK_MUND = { x: 100, y: 52 };   // Öffnung oben, hier fallen die Münzen hinein
function sackSvg(anzahl, offen) {
  const hals = offen
    ? 'M 64 94 C 50 72 38 52 30 32 C 58 46 78 26 100 38 C 122 26 142 46 170 32 C 162 52 150 72 136 94 Z'
    : 'M 76 94 C 70 76 66 58 70 38 C 84 46 92 32 100 40 C 108 32 116 46 130 38 C 134 58 130 76 124 94 Z';
  return `<svg viewBox="0 0 200 240" aria-label="${anzahl} Goldmünzen">
    <ellipse cx="100" cy="230" rx="78" ry="8" fill="rgba(0,0,0,.18)"/>
    <path d="M 62 90 C 18 114 6 170 26 205 C 44 236 156 236 174 205 C 194 170 182 114 138 90 Z" fill="url(#samt-rot)" stroke="#4a0707" stroke-width="4" filter="url(#samt)"/>
    <path d="M 82 112 Q 70 160 80 214 M 120 112 Q 134 160 122 216 M 100 108 Q 98 170 100 222" fill="none" stroke="rgba(60,0,0,.22)" stroke-width="3" stroke-linecap="round"/>
    <path d="M 48 140 Q 52 120 70 108" fill="none" stroke="rgba(255,190,190,.45)" stroke-width="6" stroke-linecap="round"/>
    <path d="${hals}" fill="url(#samt-rot)" stroke="#4a0707" stroke-width="4" stroke-linejoin="round" filter="url(#samt)"/>
    ${offen ? '<ellipse cx="100" cy="38" rx="56" ry="11" fill="#2b0404" stroke="#4a0707" stroke-width="3"/><path d="M 52 40 Q 100 54 148 40" fill="none" stroke="#6d0c0c" stroke-width="4"/>' : ''}
    <path d="M 60 92 Q 100 106 140 92" fill="none" stroke="#6b4a00" stroke-width="13" stroke-linecap="round"/>
    <path d="M 60 92 Q 100 106 140 92" fill="none" stroke="url(#gold-kordel)" stroke-width="8" stroke-linecap="round"/>
    <path d="M 60 92 Q 100 106 140 92" fill="none" stroke="#fff8c4" stroke-width="2" stroke-dasharray="3 5" opacity=".8"/>
    <path d="M 138 96 Q 150 112 146 136 M 140 96 Q 160 108 162 128" fill="none" stroke="#6b4a00" stroke-width="7" stroke-linecap="round"/>
    <path d="M 138 96 Q 150 112 146 136 M 140 96 Q 160 108 162 128" fill="none" stroke="url(#gold-kordel)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="146" cy="138" r="6" fill="url(#gold-kordel)" stroke="#6b4a00" stroke-width="2.5"/>
    <circle cx="162" cy="130" r="6" fill="url(#gold-kordel)" stroke="#6b4a00" stroke-width="2.5"/>
    <g class="stickerei">
      <rect x="34" y="134" width="132" height="76" rx="22" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5" opacity=".9"/>
      <g filter="drop-shadow(0 2px 1.5px rgba(40,0,0,.7))">
        <circle cx="70" cy="172" r="21" fill="url(#faden)" stroke="#e9e4dc" stroke-width="1.5"/>
        <circle cx="70" cy="172" r="14" fill="none" stroke="#c9c1b4" stroke-width="2" stroke-dasharray="3 3"/>
        <path d="M 70 162 L 72.6 168.6 L 79.5 168.9 L 74.1 173.3 L 75.9 180.1 L 70 176.3 L 64.1 180.1 L 65.9 173.3 L 60.5 168.9 L 67.4 168.6 Z" fill="#c9c1b4"/>
        <text x="${anzahl >= 10 ? 128 : 124}" y="194" text-anchor="middle" class="sack-zahl" fill="url(#faden)" stroke="#e9e4dc" stroke-width="1.5">${anzahl}</text>
      </g>
    </g>
  </svg>`;
}
const MUENZE_SVG = `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" fill="url(#gold-muenze)" stroke="#8a5a00" stroke-width="3"/>
  <circle cx="30" cy="30" r="20" fill="none" stroke="#c17900" stroke-width="2.2"/>
  <path d="M 30 18 L 33.5 26.5 L 42.4 26.9 L 35.4 32.6 L 37.8 41.4 L 30 36.4 L 22.2 41.4 L 24.6 32.6 L 17.6 26.9 L 26.5 26.5 Z" fill="#fff3c4" stroke="#c17900" stroke-width="1.5"/></svg>`;

/** Plätze für die Säckchen in einer Zone verteilen (so gross wie möglich) */
function sackRaster(anzahl, w, h) {
  let best = null;
  for (let sp = 1; sp <= anzahl; sp++) {
    const zeilen = Math.ceil(anzahl / sp);
    const b = Math.min(w / sp, h / zeilen / 1.2);
    if (!best || b > best.b) best = { sp, zeilen, b };
  }
  return best;
}

function baueZone(i) {
  const z = $(`zone-${i}`);
  const team = S.teams[i];
  setzeFarbVariablen(z, team.farbe);
  const W = z.clientWidth, H = z.clientHeight;
  const kopf = 58;
  const linksFrei = S.n === 1 ? 250 : 0;   // Platz für «Ich weiss es nicht»
  const fw = W - linksFrei - 16, fh = H - kopf - 8;
  const r = sackRaster(S.saecke, fw, fh);
  const b = Math.floor(r.b), h = Math.floor(r.b * 1.2);
  const x0 = linksFrei + 8 + (fw - b * r.sp) / 2, y0 = kopf + (fh - h * r.zeilen) / 2;
  let html = `<div class="zone-kopf">${ringHtml(team.tier)}<span>${esc(team.name)}</span></div>`;
  for (let k = 0; k < S.saecke; k++) {
    const sp = k % r.sp, ze = Math.floor(k / r.sp);
    // letzte Zeile mittig, wenn sie nicht voll ist
    const inZeile = Math.min(r.sp, S.saecke - ze * r.sp);
    const x = x0 + (r.sp - inZeile) * b / 2 + sp * b, y = y0 + ze * h;
    html += `<div class="platz" id="platz-${i}-${k}" style="left:${x}px; top:${y}px; width:${b}px; height:${h}px"></div>`;
  }
  z.innerHTML = html;
  for (let k = 0; k < S.saeckeDa[i]; k++) zeichneSack(i, k);
}
function zeichneSack(i, k, klasse) {
  const platz = $(`platz-${i}-${k}`);
  if (!platz) return;
  const anzahl = Math.max(0, Math.min(PRO_SACK, S.sichtbar[i] - k * PRO_SACK));
  platz.innerHTML = `<div class="sack${klasse ? ' ' + klasse : ''}">${sackSvg(anzahl, anzahl < PRO_SACK)}</div>`;
}
/** Wo ist die Öffnung des aktuellen Säckchens (Bühnen-Koordinaten)? */
function sackMund(i, k) {
  const platz = $(`platz-${i}-${k}`), b = $('buehne').getBoundingClientRect(), r = platz.getBoundingClientRect();
  const w = r.width / SKALA, h = r.height / SKALA, s = Math.min(w / 200, h / 240);
  return {
    x: (r.left - b.left) / SKALA + (w - 200 * s) / 2 + SACK_MUND.x * s,
    y: (r.top - b.top) / SKALA + (h - 240 * s) / 2 + SACK_MUND.y * s
  };
}

/** Eine Goldmünze für Team i: Logik sofort, Bild und Ton mit Flug von der Kasse ins Säckchen */
function gibMuenze(i) {
  S.muenzen[i]++;
  const ziel = S.muenzen[i];
  const k = Math.min(S.saecke - 1, Math.floor((ziel - 1) / PRO_SACK));
  const spiel = S;
  const start = { x: 1390, y: DY + 200 };
  const end = sackMund(i, k);
  const m = document.createElement('div');
  m.className = 'muenze';
  m.innerHTML = MUENZE_SVG;
  $('flieger').appendChild(m);
  const hoch = Math.min(start.y, end.y) - 160;
  const animation = m.animate([
    { left: start.x + 'px', top: start.y + 'px', transform: 'scale(.6)' },
    { left: (start.x + end.x) / 2 + 'px', top: hoch + 'px', transform: 'scale(1.25)', offset: 0.45 },
    { left: end.x + 'px', top: (end.y - 70) + 'px', transform: 'scale(1)', offset: 0.8 },
    { left: end.x + 'px', top: (end.y + 6) + 'px', transform: 'scale(.55)', opacity: 0.6 }
  ], { duration: 950, easing: 'ease-in-out', fill: 'forwards' });
  let gelandet = false;
  const landen = () => {
    if (gelandet) return;
    gelandet = true;
    m.remove();
    if (S !== spiel) return;
    muenzeGelandet(i, ziel, end);
  };
  animation.onfinish = landen;
  setTimeout(landen, 1400);   // falls die Animation im Hintergrund nicht fertig wird
}
function muenzeGelandet(i, ziel, pos) {
  if (S.sichtbar[i] >= ziel) return;
  S.sichtbar[i] = ziel;
  TON.klimpern();
  funkeln(pos.x, pos.y);
  const k = Math.min(S.saecke - 1, Math.floor((ziel - 1) / PRO_SACK));
  if (ziel % PRO_SACK === 0) {
    zeichneSack(i, k, 'zu');
    setTimeout(() => TON.zubinden(), 150);
    if (ziel < S.saecke * PRO_SACK) {
      const spiel = S;
      setTimeout(() => {
        if (S !== spiel || S.saeckeDa[i] > k + 1) return;
        S.saeckeDa[i] = k + 2;
        zeichneSack(i, k + 1, 'fliegt');
        TON.wusch();
      }, 650);
    }
  } else {
    zeichneSack(i, k, 'schwupp');
  }
}
function funkeln(x, y) {
  for (let n = 0; n < 8; n++) {
    const f = document.createElement('div');
    f.className = 'funkeln';
    f.style.left = x + 'px'; f.style.top = y + 'px';
    $('flieger').appendChild(f);
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 40;
    f.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 20}px) scale(.3)`, opacity: 0 }],
      { duration: 600, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => f.remove(), 650);
  }
}

/* =========================================================
   Spiel
   ========================================================= */
let S = null;
let letzterFrame = 0, letzterTick = -1;

function starteSpiel() {
  leseFormular();
  const fehler = pruefeEinstellungen();
  if (fehler) { $('fehler').textContent = fehler; return; }
  E.teams.forEach(t => { if (!t.name.trim()) t.name = tierVon(t.tier).team; });
  merke();
  S = {
    n: E.spieler,
    teams: structuredClone(E.teams).slice(0, E.spieler),
    maxFranken: Number(E.zahlenraum),
    stufe: E.stufe,
    maxProdukte: E.produkte,
    saecke: Number(E.saecke),
    einkauf: null,
    muenzen: [0, 0],      // Logik
    sichtbar: [0, 0],     // so viele Münzen sind schon im Säckchen gelandet
    saeckeDa: [1, 1],     // so viele Säckchen stehen schon da
    eingabe: ['', ''],
    sperre: [0, 0],
    wechselMs: E.spieler === 1 ? 0 : Number(E.wechselSek) * 1000,   // 1 Kind: kein Countdown
    phase: 'spiel',       // spiel | loesung | wechsel | ende
    phaseRestMs: 0, weiter: null,
    gewinner: null,
    pausiert: false, beendet: false
  };
  zeigeSeite('spiel');
  skaliere();
  baueSpielfeld();
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  naechsteAufgabe();
  letzterFrame = performance.now();
  requestAnimationFrame(schleife);
}
const aktiv = i => i < S.n;

function baueSpielfeld() {
  const b = $('buehne');
  b.classList.toggle('allein', S.n === 1);
  $('btn-weiss-nicht').classList.toggle('versteckt', S.n !== 1);
  $('band-bereich').innerHTML = '';
  $('flieger').innerHTML = '';
  PRODUKTE.forEach(p => setzeRegal([p.id], true));
  [0, 1].forEach(i => {
    const da = aktiv(i);
    ['panel-', 'zone-'].forEach(p => $(p + i).classList.toggle('versteckt', !da));
    if (!da) return;
    bauePanel(i);
    baueZone(i);
  });
  $('btn-ton').textContent = stumm ? '🔇' : '🔊';
  ['pause-menue', 'ende', 'wechsel-box'].forEach(id => $(id).classList.add('versteckt'));
}

function bauePanel(i) {
  const team = S.teams[i];
  const p = $(`panel-${i}`);
  setzeFarbVariablen(p, team.farbe);
  const rappen = STUFEN[S.stufe].rappen;
  p.innerHTML = `
    <div class="eingabe filz" aria-live="polite"><span class="vor">Total:</span><span class="zahl"></span><span class="nach">Fr.</span></div>
    <div class="tastatur">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(z => `<button class="filz" data-taste="${z}">${z}</button>`).join('')}
      ${rappen ? '<button class="filz punkt" data-taste="." aria-label="Punkt">.</button><button class="filz" data-taste="0">0</button>'
               : '<button class="filz null-breit" data-taste="0">0</button>'}
      <button data-taste="loeschen" class="loeschen filz" aria-label="Löschen">⌫</button>
      <button data-taste="ok" class="ok filz">OK ✓</button>
    </div>
    <div class="sperre"><div></div></div>`;
  p.querySelectorAll('[data-taste]').forEach(b => b.addEventListener('pointerdown', ev => {
    ev.preventDefault(); taste(i, b.dataset.taste);
  }));
}

/* ---------- Ablauf ---------- */
function setzePhase(name, ms, weiter) { S.phase = name; S.phaseRestMs = ms; S.weiter = weiter; }

function naechsteAufgabe() {
  raeumeBand();
  // Säckchen auf den aktuellen Stand bringen (falls eine Animation nicht fertig wurde)
  [0, 1].forEach(i => {
    if (!aktiv(i)) return;
    const soll = Math.min(S.saecke, Math.floor(S.muenzen[i] / PRO_SACK) + 1);
    if (S.sichtbar[i] !== S.muenzen[i] || S.saeckeDa[i] !== soll) {
      S.sichtbar[i] = S.muenzen[i]; S.saeckeDa[i] = soll; baueZone(i);
    }
  });
  S.einkauf = erzeugeEinkauf(S.maxFranken, S.stufe, S.maxProdukte, S.einkauf);
  S.eingabe = ['', ''];
  S.sperre = [0, 0];
  setzePhase('spiel', 0, null);
  $('wechsel-box').classList.add('versteckt');
  zeigeAnzeige('???', 'blinkt');
  legeAufsBand(S.einkauf);
  [0, 1].forEach(i => { if (aktiv(i)) $(`panel-${i}`).querySelector('.eingabe').classList.remove('zeigt'); });
  zeichneEingaben();
}

function taste(i, wert) {
  if (!S || S.pausiert || S.phase !== 'spiel' || S.sperre[i] > 0 || !aktiv(i)) return;
  audio();
  if (wert === 'ok') { pruefe(i); return; }
  let e = S.eingabe[i];
  if (wert === 'loeschen') e = e.slice(0, -1);
  else if (wert === '.') {
    if (!STUFEN[S.stufe].rappen || e.includes('.')) return;
    e = (e || '0') + '.';
  } else {
    const [ganz, rp] = e.split('.');
    if (rp !== undefined) { if (rp.length >= 2) return; e += wert; }
    else if (ganz === '0') e = wert;          // keine führende Null
    else { if (ganz.length >= 4) return; e += wert; }
  }
  S.eingabe[i] = e;
  zeichneEingaben();
}

function pruefe(i) {
  const rp = eingabeInRappen(S.eingabe[i]);
  if (rp === null) return;   // noch nichts eingetippt
  if (rp === S.einkauf.total) richtig(i); else falsch(i);
}

function richtig(i) {
  TON.richtig();
  blinke($(`panel-${i}`), 'richtig');
  zeigeAnzeige(`${betragText(S.einkauf.total)} Fr.`, 'loesung');
  setTimeout(() => TON.scanner(), 120);
  S.eingabe = ['', ''];
  zeichneEingaben();
  gibMuenze(i);
  const m = S.muenzen[i];
  if (m >= S.saecke * PRO_SACK) {
    S.gewinner = i;
    setzePhase('loesung', ENDE_MS, beende);
  } else {
    setzePhase('loesung', m % PRO_SACK === 0 ? NEUER_SACK_MS : LOESUNG_MS, () => wechsel(naechsteAufgabe));
  }
}

function falsch(i) {
  TON.falsch();
  S.sperre[i] = SPERRE_MS;
  S.eingabe[i] = '';
  blinke($(`panel-${i}`), 'falsch');
  zeichneEingaben();
}

/** Knopf "Ich weiss es nicht" (nur 1 Kind): Lösung grün zeigen, keine Münze, dann die nächste Aufgabe */
function weissNicht() {
  if (!S || S.pausiert || S.phase !== 'spiel' || S.n !== 1) return;
  const t = betragText(S.einkauf.total);
  S.eingabe[0] = STUFEN[S.stufe].rappen ? t : String(S.einkauf.total / 100);
  zeichneEingaben();
  $('panel-0').querySelector('.eingabe').classList.add('zeigt');
  zeigeAnzeige(`${t} Fr.`, 'loesung');
  setzePhase('loesung', WEISS_NICHT_MS, () => wechsel(naechsteAufgabe));
}

/** Countdown zwischen den Aufgaben (über dem leeren Band) */
function wechsel(danach) {
  S.eingabe = ['', ''];
  [0, 1].forEach(i => { if (aktiv(i)) $(`panel-${i}`).querySelector('.eingabe').classList.remove('zeigt'); });
  zeichneEingaben();
  if (!S.wechselMs) { danach(); return; }
  raeumeBand();
  zeigeAnzeige('', '');
  $('wechsel-box').classList.remove('versteckt');
  zeichneWechselKreis(1);
  letzterTick = -1;
  setzePhase('wechsel', S.wechselMs, danach);
}
function zeichneWechselKreis(anteil) {
  const a = Math.max(0, Math.min(1, anteil)), weg = 1 - a, winkel = weg * 360, rad = winkel * Math.PI / 180;
  $('wechsel-rest').style.strokeDashoffset = -100 * weg;
  const x = 50 + 42 * Math.sin(rad), y = 50 - 42 * Math.cos(rad);
  const spiegel = winkel > 90 && winkel < 270 ? -1 : 1;
  $('wechsel-vogel').setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${winkel.toFixed(1)}) scale(1 ${spiegel})`);
  const sek = Math.max(1, Math.ceil(a * S.wechselMs / 1000));
  const el = $('wechsel-sek');
  if (el.textContent !== String(sek)) { el.textContent = sek; el.classList.remove('hops'); void el.getBoundingClientRect(); el.classList.add('hops'); }
}

function beende() {
  if (!S || S.beendet) return;
  S.beendet = true;
  S.phase = 'ende';
  const box = $('ende');
  const sieger = S.gewinner === null ? 0 : S.gewinner;
  const voll = S.saecke === 1 ? 'Das Säckchen ist voll!' : 'Alle Säckchen sind voll!';
  if (S.n === 1) {
    $('ende-text').textContent = voll;
    $('ende-stand').textContent = `${S.teams[0].name}: ${muenzText(S.muenzen[0])}`;
  } else {
    const t = S.teams[sieger];
    $('ende-text').textContent = istStandardName(t.name) ? `Die ${t.name} gewinnen!` : `${t.name} gewinnt!`;
    $('ende-stand').textContent = `${S.teams[0].name} ${S.muenzen[0]} 🪙 : 🪙 ${S.muenzen[1]} ${S.teams[1].name}`;
  }
  $('ende-bild').innerHTML = `<div class="figur-bild"><img src="${BILD.jubel(S.teams[sieger].tier)}" alt=""></div>`;
  setzeFarbVariablen(box, S.teams[sieger].farbe);
  box.classList.remove('versteckt');
  TON.jubel();
}

/* ---------- Hauptschleife ---------- */
function schleife(jetzt) {
  if (!S || S.beendet) return;
  const dt = Math.min(250, jetzt - letzterFrame);
  letzterFrame = jetzt;
  schritt(dt);
  requestAnimationFrame(schleife);
}
/** Spielzeit um dt Millisekunden weiterdrehen (auch für Tests) */
function schritt(dt) {
  if (!S || S.beendet || S.pausiert) return;
  [0, 1].forEach(i => { if (S.sperre[i] > 0) S.sperre[i] = Math.max(0, S.sperre[i] - dt); });
  if (S.phase === 'loesung' || S.phase === 'wechsel') {
    S.phaseRestMs -= dt;
    if (S.phase === 'wechsel') {
      zeichneWechselKreis(S.phaseRestMs / S.wechselMs);
      const sek = Math.ceil(S.phaseRestMs / 1000);
      if (sek <= 3 && sek > 0 && sek !== letzterTick) { letzterTick = sek; TON.tick(); }
    }
    if (S.phaseRestMs <= 0 && S.weiter) { const w = S.weiter; S.weiter = null; w(); }
  }
  if (S && !S.beendet) zeichneLaufend();
}

/* ---------- Zeichnen ---------- */
function zeichneEingaben() {
  [0, 1].forEach(i => { if (aktiv(i)) $(`panel-${i}`).querySelector('.zahl').textContent = S.eingabe[i]; });
}
function zeichneLaufend() {
  $('btn-weiss-nicht').classList.toggle('aus', S.phase !== 'spiel' || S.pausiert);
  [0, 1].forEach(i => {
    if (!aktiv(i)) return;
    const p = $(`panel-${i}`);
    p.classList.toggle('gesperrt', S.sperre[i] > 0);
    p.querySelector('.sperre div').style.width = (S.sperre[i] / SPERRE_MS * 100) + '%';
  });
}
function blinke(el, klasse) {
  el.classList.remove(klasse); void el.offsetWidth; el.classList.add(klasse);
  clearTimeout(el['_b' + klasse]);
  el['_b' + klasse] = setTimeout(() => el.classList.remove(klasse), 1400);
}

function pause(an) {
  if (!S || S.beendet) return;
  S.pausiert = an;
  $('pause-menue').classList.toggle('versteckt', !an);
}

/* =========================================================
   Seiten, Skalierung, Ereignisse
   ========================================================= */
function zeigeSeite(id) {
  ['wahl', 'einstellungen', 'spiel'].forEach(s => $(s).classList.toggle('versteckt', s !== id));
}
/* Die Bühne ist 1600 breit. Ist der Bildschirm höher als 16:9, wird sie höher (bis 1400),
   damit kein leerer Rand bleibt: über dem Laden kommt mehr Wand dazu. */
let DY = 0, SKALA = 1;
function skaliere() {
  const w = window.innerWidth, h = window.innerHeight;
  const H = Math.round(Math.min(1400, Math.max(900, 1600 * h / w)));
  const b = $('buehne');
  b.style.setProperty('--h', H + 'px');
  DY = H - 900;
  SKALA = Math.min(w / 1600, h / H);
  b.style.transform = `translate(-50%, -50%) scale(${SKALA})`;
}
window.addEventListener('resize', () => {
  skaliere();
  if (S && !$('spiel').classList.contains('versteckt')) [0, 1].forEach(i => { if (aktiv(i)) baueZone(i); });
});
function abbrechenUnd(weiter) { if (S) S.beendet = true; S = null; weiter(); }

// Wer spielt?
document.querySelectorAll('[data-spieler]').forEach(b => b.addEventListener('click', () => {
  E.spieler = Number(b.dataset.spieler); merke(); zeigeEinstellungen();
}));
$('btn-zur-wahl').addEventListener('click', () => { leseFormular(); zeigeSeite('wahl'); });

// Einstellungen
$('anzahl-zeile').innerHTML = Array.from({ length: MAX_PRODUKTE }, (_, k) =>
  `<button class="wahl klein filz" data-anzahl="${k + 1}">${k + 1}</button>`).join('');
document.querySelectorAll('[data-zr]').forEach(b => b.addEventListener('click', () => { E.zahlenraum = b.dataset.zr; $('e-zahlenraum').value = b.dataset.zr; merke(); zeichneWahlKnoepfe(); }));
document.querySelectorAll('[data-stufe]').forEach(b => b.addEventListener('click', () => { E.stufe = b.dataset.stufe; merke(); zeichneWahlKnoepfe(); }));
document.querySelectorAll('[data-anzahl]').forEach(b => b.addEventListener('click', () => { E.produkte = Number(b.dataset.anzahl); merke(); zeichneWahlKnoepfe(); }));
['e-zahlenraum', 'e-saecke', 'e-wechsel'].forEach(id => $(id).addEventListener('input', ev => { ev.target.value = ev.target.value.replace(/\D/g, ''); leseFormular(); zeichneWahlKnoepfe(); }));
$('e-ton').addEventListener('change', leseFormular);
$('btn-start').addEventListener('click', starteSpiel);
$('btn-weiss-nicht').addEventListener('click', weissNicht);

// Spiel
$('btn-pause').addEventListener('click', () => pause(true));
$('wechsel-box').addEventListener('pointerdown', () => {
  if (S && !S.pausiert && S.phase === 'wechsel') { S.phaseRestMs = 0; zeichneWechselKreis(0); }
});
// Doppeltippen auf das Band: Aufgabe überspringen
let letzterTipp = 0;
$('band-bereich').addEventListener('pointerdown', () => {
  const jetzt = performance.now(), doppelt = jetzt - letzterTipp < 400;
  letzterTipp = doppelt ? 0 : jetzt;
  if (doppelt && S && !S.pausiert && S.phase === 'spiel') naechsteAufgabe();
});
// Abkürzung zum Testen: Antippen der Münz-Anzeige füllt alle Säckchen und zeigt den Schluss
[0, 1].forEach(i => $(`zone-${i}`).addEventListener('click', () => {
  if (!S || S.beendet || S.pausiert || !aktiv(i)) return;
  S.muenzen[i] = S.sichtbar[i] = S.saecke * PRO_SACK;
  S.saeckeDa[i] = S.saecke;
  baueZone(i);
  zeichneSack(i, S.saecke - 1, 'zu');
  TON.klimpern();
  S.gewinner = i;
  setzePhase('ende-warten', 0, null);
  setTimeout(() => { if (S && !S.beendet) beende(); }, 900);
}));
$('btn-weiter').addEventListener('click', () => pause(false));
$('btn-neustart').addEventListener('click', () => abbrechenUnd(starteSpiel));
$('btn-zu-einst').addEventListener('click', () => abbrechenUnd(zeigeEinstellungen));
$('btn-ton').addEventListener('click', () => { stumm = !stumm; $('btn-ton').textContent = stumm ? '🔇' : '🔊'; });
document.querySelectorAll('.btn-vollbild').forEach(b => b.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}));
$('btn-nochmal').addEventListener('click', () => abbrechenUnd(starteSpiel));
$('btn-ende-einst').addEventListener('click', () => abbrechenUnd(zeigeEinstellungen));

// Tastatur am Computer (für Team links): Ziffern, Punkt/Komma, Löschen, Enter
document.addEventListener('keydown', ev => {
  if (!S || $('spiel').classList.contains('versteckt')) return;
  if (/^[0-9]$/.test(ev.key)) taste(0, ev.key);
  else if (ev.key === '.' || ev.key === ',') taste(0, '.');
  else if (ev.key === 'Backspace') taste(0, 'loeschen');
  else if (ev.key === 'Enter') taste(0, 'ok');
});

baueLaden();
zeigeSeite('wahl');
