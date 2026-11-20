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
  selbst: false,        // die Kinder legen die Produkte selbst aufs Band
  saeckeEinzel: '3',    // Säckchen bis zum Ziel bei 1 Kind
  saeckeDuell: '1',     // … und bei 2 Kindern
  wechselSek: '0',     // Countdown zwischen den Aufgaben (nur bei 2 Kindern)
  ton: true,
  teams: [
    { name: 'Löwen',       tier: 'loewe',        farbe: 'rot' },
    { name: 'Erdmännchen', tier: 'erdmaennchen', farbe: 'blau' }
  ]
};
const SPEICHER_EINST = 'einkaufen.einstellungen.v2';
const EINST_STAND = 2;   // erhöhen, wenn gespeicherte Werte einmalig auf einen neuen Standard sollen
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

const MUENZE_SVG = `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" fill="url(#gold-muenze)" stroke="#8a5a00" stroke-width="3"/>
  <circle cx="30" cy="30" r="20" fill="none" stroke="#c17900" stroke-width="2.2"/>
  <path d="M 30 18 L 33.5 26.5 L 42.4 26.9 L 35.4 32.6 L 37.8 41.4 L 30 36.4 L 22.2 41.4 L 24.6 32.6 L 17.6 26.9 L 26.5 26.5 Z" fill="#fff3c4" stroke="#c17900" stroke-width="1.5"/></svg>`;

/* =========================================================
   Einstellungen
   ========================================================= */
let E = Object.assign(structuredClone(STANDARD), laden(SPEICHER_EINST, {}));
if (!Array.isArray(E.teams) || E.teams.length !== 2) E.teams = structuredClone(STANDARD.teams);
// Ungültige gespeicherte Werte durch den Standard ersetzen
if (ganzzahlIn(E.zahlenraum, 2, 1000) === null) E.zahlenraum = STANDARD.zahlenraum;
if (!STUFEN[E.stufe]) E.stufe = STANDARD.stufe;
if (!(E.produkte >= 1 && E.produkte <= MAX_PRODUKTE)) E.produkte = STANDARD.produkte;
if (ganzzahlIn(E.saeckeEinzel, 1, 5) === null) E.saeckeEinzel = STANDARD.saeckeEinzel;
if (ganzzahlIn(E.saeckeDuell, 1, 5) === null) E.saeckeDuell = STANDARD.saeckeDuell;
if (ganzzahlIn(E.wechselSek, 0, 30) === null) E.wechselSek = STANDARD.wechselSek;
// Einmalig: neuer Standard «Wechselzeit 0» auch auf Geräten mit alten Einstellungen
if (!(E.stand >= 2)) E.wechselSek = '0';
E.stand = EINST_STAND;
if (E.spieler !== 1 && E.spieler !== 2) E.spieler = 2;
E.selbst = !!E.selbst;
const merke = () => speichern(SPEICHER_EINST, E);
const saeckeSchluessel = () => E.spieler === 1 ? 'saeckeEinzel' : 'saeckeDuell';

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
  $('e-saecke').value = E[saeckeSchluessel()];
  $('e-wechsel').value = E.wechselSek;
  $('e-ton').checked = E.ton;
  $('e-selbst').checked = E.selbst;
  // Countdown gibt es nur, wenn zwei Kinder abwechselnd an die Tafel kommen
  $('karte-ablauf').classList.toggle('versteckt', E.spieler === 1);
  $('fehler').textContent = '';
  zeigeSeite('einstellungen');
}

function leseFormular() {
  E.zahlenraum = $('e-zahlenraum').value.trim();
  E[saeckeSchluessel()] = $('e-saecke').value.trim();
  E.wechselSek = $('e-wechsel').value.trim();
  E.ton = $('e-ton').checked;
  E.selbst = $('e-selbst').checked;
  merke();
}

/** Prüft die Einstellungen. Gibt eine Fehlermeldung zurück oder null. */
function pruefeEinstellungen() {
  if (ganzzahlIn(E.zahlenraum, 2, 1000) === null) return 'Zahlenraum: bitte ein Total von 2 bis 1000 Franken.';
  if (ganzzahlIn(E[saeckeSchluessel()], 1, 5) === null) return 'Säckchen bis zum Ziel: bitte eine Zahl von 1 bis 5.';
  if (E.spieler === 2 && ganzzahlIn(E.wechselSek, 0, 30) === null) return 'Wechselzeit: bitte 0 bis 30 Sekunden.';
  if (E.selbst && anzahlBereich(Number(E.zahlenraum), E.stufe, E.produkte).max < 2)
    return 'Wenn die Kinder selbst wählen, müssen mindestens 2 Produkte aufs Band passen. Bitte den Zahlenraum oder die Anzahl Produkte erhöhen.';
  return null;
}

/* =========================================================
   Laden: Regal, Kühlschrank, Kassenband
   Koordinaten im Laden (1600 × 900, unten bündig auf der Bühne)
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
const REGAL = { links: 44, rechts: 520, oben: 146, unten: 450, brett: 12 };
const KUEHL = { links: 574, rechts: 732, oben: 130, unten: 440, brett: 6 };
/** Plätze aller 30 Produkte berechnen: { id: { x, y, b, h } } (y = Unterkante) */
function regalPlaetze() {
  const plaetze = {};
  const verteile = (reihen, g) => {
    const reiheH = (g.unten - g.oben) / reihen.length;
    const zelle = (g.rechts - g.links) / Math.max(...reihen.map(x => x.length));
    reihen.forEach((reihe, r) => {
      const boden = g.oben + reiheH * (r + 1) - g.brett;
      const start = g.links + ((g.rechts - g.links) - zelle * reihe.length) / 2;
      reihe.forEach((id, k) => {
        plaetze[id] = { x: start + zelle * k + 4, y: boden, b: zelle - 8, h: reiheH - g.brett - 8 };
      });
    });
  };
  verteile(REGAL_REIHEN, REGAL);
  verteile(KUEHL_REIHEN, KUEHL);
  return plaetze;
}
const PLAETZE = regalPlaetze();

function baueLaden() {
  let html = '';
  // Bretter
  [[REGAL_REIHEN, REGAL, 'brett'], [KUEHL_REIHEN, KUEHL, 'kuehl-brett']].forEach(([reihen, g, klasse]) => {
    const reiheH = (g.unten - g.oben) / reihen.length;
    reihen.forEach((_, r) => {
      const y = g.oben + reiheH * (r + 1) - g.brett;
      html += `<div class="${klasse}" style="left:${g.links - 12}px; top:${y}px; width:${g.rechts - g.links + 24}px"></div>`;
    });
  });
  // Produkte (eine Lücke bleibt einfach leer)
  PRODUKTE.forEach(p => {
    const pl = PLAETZE[p.id];
    html += `<div class="regal-ware" id="ware-${p.id}" data-id="${p.id}" style="left:${pl.x}px; top:${pl.y - pl.h}px; width:${pl.b}px; height:${pl.h}px"><img src="${BILD.produkt(p.id)}" alt="${esc(p.name)}"></div>`;
  });
  // Glasscheibe vor dem Kühlschrank
  html += `<div class="kuehl-glas-vorne" style="left:${KUEHL.links - 8}px; top:${KUEHL.oben - 6}px; width:${KUEHL.rechts - KUEHL.links + 16}px; height:${KUEHL.unten - KUEHL.oben + 6}px"></div>`;
  $('regal-produkte').innerHTML = html;
  document.querySelectorAll('.regal-ware').forEach(el => el.addEventListener('pointerdown', ev => { ev.preventDefault(); waehleProdukt(el.dataset.id); }));
}

/** Produkte im Regal ausblenden (sie liegen auf dem Band) bzw. wieder zeigen */
function setzeRegal(ids, imRegal) { ids.forEach(id => $(`ware-${id}`).classList.toggle('weg', !imRegal)); }
/** Welche Produkte fehlen gerade im Regal? (für Tests) */
const fehlenImRegal = () => PRODUKTE.filter(p => $(`ware-${p.id}`).classList.contains('weg')).map(p => p.id).sort();

/* ---------- Kassenband ---------- */
const BAND_BREITE = 470;
/** Ein Produkt aufs Band legen (fährt von links herein) */
function bandWareNeu(id) {
  const p = PRODUKTE.find(x => x.id === id);
  const el = document.createElement('div');
  el.className = 'band-ware rein';
  el.dataset.id = id;
  el.innerHTML = `<img src="${BILD.produkt(id)}" alt="${esc(p.name)}">`;
  el.addEventListener('pointerdown', ev => { ev.preventDefault(); legeZurueck(id); });
  $('band-bereich').appendChild(el);
  setzeRegal([id], false);
  return el;
}
const bandWaren = () => [...$('band-bereich').querySelectorAll('.band-ware:not(.raus)')];
/** Produkte auf dem Band gleichmässig verteilen; Preisschilder, sobald es Preise gibt */
function ordneBand() {
  const waren = bandWaren(), n = Math.max(1, waren.length);
  const zelle = BAND_BREITE / Math.max(n, S && S.selbst ? 2 : 1);
  const breite = Math.min(150, zelle - 12), hoehe = n <= 3 ? 160 : n === 4 ? 145 : 130;
  waren.forEach((el, k) => {
    el.style.left = (zelle * k + (zelle - breite) / 2) + 'px';
    el.style.width = breite + 'px';
    const img = el.querySelector('img');
    img.style.width = breite + 'px'; img.style.height = hoehe + 'px';
  });
  void $('band-bereich').offsetWidth;
  waren.forEach(el => el.classList.remove('rein'));
}
function zeigePreise(einkauf) {
  const waren = bandWaren();
  einkauf.produkte.forEach(p => {
    const el = waren.find(w => w.dataset.id === p.id);
    if (!el) return;
    el.querySelector('.preis')?.remove();
    el.insertAdjacentHTML('beforeend', `<div class="preis">${betragText(p.preis)}<small>Fr.</small></div>`);
  });
  // Preisschilder dürfen sich nicht überlappen: sonst jedes zweite tiefer hängen
  const schilder = waren.map(w => w.querySelector('.preis')).filter(Boolean);
  const raender = schilder.map(s => { const w = s.parentElement, m = parseFloat(w.style.left) + parseFloat(w.style.width) / 2; return { l: m - s.offsetWidth / 2, r: m + s.offsetWidth / 2 }; });
  const zuEng = raender.some((a, k) => k > 0 && a.l < raender[k - 1].r + 6);
  schilder.forEach((s, k) => s.classList.toggle('tief', zuEng && k % 2 === 1));
}
function legeAufsBand(einkauf) {
  einkauf.produkte.forEach(p => bandWareNeu(p.id));
  ordneBand();
  zeigePreise(einkauf);
  laufeBand(950);
}
function laufeBand(ms) {
  const band = $('band');
  band.classList.add('laeuft');
  clearTimeout(band._t);
  band._t = setTimeout(() => band.classList.remove('laeuft'), ms);
}
/** Band leeren: Produkte fahren zur Kasse weiter, das Regal wird wieder aufgefüllt */
function raeumeBand() {
  const alte = bandWaren();
  if (!alte.length) return;
  alte.forEach(el => { el.classList.add('raus'); setTimeout(() => el.remove(), 1000); });
  laufeBand(900);
  setzeRegal(alte.map(el => el.dataset.id), true);
}

function zeigeAnzeige(text, art) {
  const t = $('anzeige-text');
  t.textContent = text;
  t.className = art || '';
  t.style.fontSize = text.length > 9 ? '27px' : '';
}
function zeigeMeldung(text) {
  const m = $('meldung');
  m.textContent = text;
  m.classList.remove('zeigen'); void m.offsetWidth; m.classList.add('zeigen');
}

/* =========================================================
   Kinder wählen selbst: Produkte im Regal antippen
   ========================================================= */
function starteAuswahl() {
  S.wahl = [];
  setzePhase('auswahl', 0, null);
  $('laden').classList.add('auswahl');
  $('hinweis').classList.remove('versteckt');
  $('btn-zur-kasse').classList.remove('versteckt');
  [0, 1].forEach(i => { if (aktiv(i)) $(`panel-${i}`).classList.add('wartet'); });
}
function beendeAuswahl() {
  $('laden').classList.remove('auswahl');
  $('hinweis').classList.add('versteckt');
  $('btn-zur-kasse').classList.add('versteckt');
  [0, 1].forEach(i => { if (aktiv(i)) $(`panel-${i}`).classList.remove('wartet'); });
}
function waehleProdukt(id) {
  if (!S || S.pausiert || S.phase !== 'auswahl' || S.wahl.includes(id)) return;
  if (S.wahl.length >= S.anzahl.max) { zeigeMeldung(`Höchstens ${S.anzahl.max} Produkte!`); return; }
  audio();
  S.wahl.push(id);
  bandWareNeu(id);
  ordneBand();
  laufeBand(700);
  TON.scanner();
}
function legeZurueck(id) {
  if (!S || S.pausiert || S.phase !== 'auswahl') return;
  const el = bandWaren().find(w => w.dataset.id === id);
  if (!el) return;
  S.wahl = S.wahl.filter(x => x !== id);
  el.remove();
  setzeRegal([id], true);
  ordneBand();
}
function zurKasse() {
  if (!S || S.pausiert || S.phase !== 'auswahl') return;
  if (S.wahl.length < 2) { zeigeMeldung('Bitte mindestens 2 Produkte aufs Band legen.'); TON.falsch(); return; }
  S.einkauf = erzeugeEinkauf(S.maxFranken, S.stufe, S.wahl.length, S.einkauf, S.wahl.slice());
  beendeAuswahl();
  zeigePreise(S.einkauf);
  laufeBand(500);
  setzePhase('spiel', 0, null);
  zeigeAnzeige('??? Fr.', 'blinkt');
}

/* =========================================================
   Goldsäckchen (Bilder bilder/sack-offen.png und sack-zu.png)
   Darüber eine aufgestickte Zahl (SVG, viewBox 0 0 100 100 über dem ganzen Säckchen)
   ========================================================= */
const SACK = { mundY: 0.22, zahlY: 66, zahlGross: 34 };   // werden an die Bilder angepasst
function sackHtml(anzahl, klasse) {
  const offen = anzahl < PRO_SACK;
  return `<div class="sack${klasse ? ' ' + klasse : ''}">
    <img src="bilder/sack-${offen ? 'offen' : 'zu'}.png" alt="">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="${anzahl} Goldmünzen">
      <text x="50" y="${SACK.zahlY}" text-anchor="middle" dominant-baseline="middle" class="sack-zahl" font-size="${SACK.zahlGross}"
        fill="url(#faden)" stroke="#fff" stroke-width="1.2" stroke-dasharray="1.6 1.2" paint-order="stroke"
        style="filter: drop-shadow(0 1px .6px rgba(60,0,0,.8))">${anzahl}</text>
    </svg></div>`;
}
/** Säckchen eines Teams zeichnen; anim = { k, klasse } für eine kleine Bewegung */
function zeichneSaecke(i, anim) {
  const z = $(`saecke-${i}`);
  setzeFarbVariablen(z, S.teams[i].farbe);
  let html = S.n === 2 && i === 0 ? ringHtml(S.teams[i].tier) : '';
  for (let k = 0; k < S.saeckeDa[i]; k++) {
    const anzahl = Math.max(0, Math.min(PRO_SACK, S.sichtbar[i] - k * PRO_SACK));
    html += sackHtml(anzahl, anim && anim.k === k ? anim.klasse : '');
  }
  if (S.n === 2 && i === 1) html += ringHtml(S.teams[i].tier);
  z.innerHTML = html;
}
/** Wo ist die Öffnung des Säckchens k (Bühnen-Koordinaten)? */
function sackMund(i, k) {
  const el = $(`saecke-${i}`).querySelectorAll('.sack')[k];
  const b = $('buehne').getBoundingClientRect();
  if (!el) return { x: 800, y: S ? DY + 800 : 800 };
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - b.left) / SKALA, y: (r.top + r.height * SACK.mundY - b.top) / SKALA };
}

/** Eine Goldmünze für Team i: Logik sofort, Bild und Ton mit Flug von der Kasse ins Säckchen */
function gibMuenze(i) {
  S.muenzen[i]++;
  const ziel = S.muenzen[i];
  const k = Math.min(S.saecke - 1, Math.floor((ziel - 1) / PRO_SACK));
  const spiel = S;
  const start = { x: 955, y: DY + 437 };
  const end = sackMund(i, k);
  const m = document.createElement('div');
  m.className = 'muenze';
  m.innerHTML = MUENZE_SVG;
  $('flieger').appendChild(m);
  const hoch = Math.min(start.y, end.y) - 160;
  const animation = m.animate([
    { left: start.x + 'px', top: start.y + 'px', transform: 'scale(.6)' },
    { left: (start.x + end.x) / 2 + 'px', top: hoch + 'px', transform: 'scale(1.25)', offset: 0.45 },
    { left: end.x + 'px', top: (end.y - 60) + 'px', transform: 'scale(1)', offset: 0.8 },
    { left: end.x + 'px', top: (end.y + 6) + 'px', transform: 'scale(.5)', opacity: 0.6 }
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
    zeichneSaecke(i, { k, klasse: 'zu' });
    setTimeout(() => TON.zubinden(), 150);
    if (ziel < S.saecke * PRO_SACK) {
      const spiel = S;
      setTimeout(() => {
        if (S !== spiel || S.saeckeDa[i] > k + 1) return;
        S.saeckeDa[i] = k + 2;
        zeichneSaecke(i, { k: k + 1, klasse: 'fliegt' });
        TON.wusch();
      }, 650);
    }
  } else {
    zeichneSaecke(i, { k, klasse: 'schwupp' });
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
    anzahl: anzahlBereich(Number(E.zahlenraum), E.stufe, E.produkte),
    anzahlStapel: [],
    selbst: E.selbst,
    wahl: [],
    saecke: Number(E[saeckeSchluessel()]),
    einkauf: null,
    muenzen: [0, 0],      // Logik
    sichtbar: [0, 0],     // so viele Münzen sind schon im Säckchen gelandet
    saeckeDa: [1, 1],     // so viele Säckchen stehen schon da
    eingabe: ['', ''],
    sperre: [0, 0],
    wechselMs: E.spieler === 1 ? 0 : Number(E.wechselSek) * 1000,   // 1 Kind: kein Countdown
    phase: 'spiel',       // auswahl | spiel | loesung | wechsel | ende
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
  beendeAuswahl();
  [0, 1].forEach(i => ['panel-', 'saecke-'].forEach(p => $(p + i).classList.toggle('versteckt', !aktiv(i))));
  [0, 1].forEach(i => { if (aktiv(i)) { bauePanel(i); zeichneSaecke(i); } });
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

/** Nächste Anzahl Produkte: jede mögliche Anzahl kommt regelmässig dran */
function naechsteAnzahl() {
  if (!S.anzahlStapel.length) S.anzahlStapel = neuerAnzahlStapel(S.anzahl, S.letzteAnzahl);
  S.letzteAnzahl = S.anzahlStapel.pop();
  return S.letzteAnzahl;
}

function naechsteAufgabe() {
  raeumeBand();
  beendeAuswahl();
  // Säckchen auf den aktuellen Stand bringen (falls eine Animation nicht fertig wurde)
  [0, 1].forEach(i => {
    if (!aktiv(i)) return;
    const soll = Math.min(S.saecke, Math.floor(S.muenzen[i] / PRO_SACK) + 1);
    if (S.sichtbar[i] !== S.muenzen[i] || S.saeckeDa[i] !== soll) {
      S.sichtbar[i] = S.muenzen[i]; S.saeckeDa[i] = soll; zeichneSaecke(i);
    }
  });
  S.eingabe = ['', ''];
  S.sperre = [0, 0];
  $('wechsel-box').classList.add('versteckt');
  [0, 1].forEach(i => { if (aktiv(i)) $(`panel-${i}`).querySelector('.eingabe').classList.remove('zeigt'); });
  zeichneEingaben();
  zeigeAnzeige('??? Fr.', 'blinkt');
  if (S.selbst) { starteAuswahl(); return; }
  S.einkauf = erzeugeEinkauf(S.maxFranken, S.stufe, naechsteAnzahl(), S.einkauf);
  setzePhase('spiel', 0, null);
  legeAufsBand(S.einkauf);
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

/** Countdown zwischen den Aufgaben (über dem leeren Band, nur bei 2 Kindern) */
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
  beendeAuswahl();
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
/** Ein Fehler in einem Bild darf die Schleife nie anhalten (sonst hängt das Spiel) */
function schleife(jetzt) {
  try { schleifeSchritt(jetzt); }
  catch (e) { meldeFehler(e, 'schleife'); if (S && !S.beendet) requestAnimationFrame(schleife); }
}
function schleifeSchritt(jetzt) {
  if (!S || S.beendet) return;
  const dt = Math.max(0, Math.min(250, jetzt - letzterFrame) || 0);   // nie negativ oder NaN
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
   damit kein leerer Rand bleibt: über dem Laden wird mehr vom Hintergrund sichtbar. */
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
window.addEventListener('resize', skaliere);
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
['e-ton', 'e-selbst'].forEach(id => $(id).addEventListener('change', leseFormular));
$('btn-start').addEventListener('click', starteSpiel);
$('btn-weiss-nicht').addEventListener('click', weissNicht);
$('btn-zur-kasse').addEventListener('click', zurKasse);

// Spiel
$('btn-pause').addEventListener('click', () => pause(true));
$('wechsel-box').addEventListener('pointerdown', () => {
  if (S && !S.pausiert && S.phase === 'wechsel') { S.phaseRestMs = 0; zeichneWechselKreis(0); }
});
// Abkürzung: Doppeltippen auf die Sprechblase überspringt die Aufgabe
let letzterTipp = 0;
$('sprechblase').addEventListener('pointerdown', () => {
  const jetzt = performance.now(), doppelt = jetzt - letzterTipp < 400;
  letzterTipp = doppelt ? 0 : jetzt;
  if (doppelt && S && !S.pausiert && (S.phase === 'spiel' || S.phase === 'auswahl')) naechsteAufgabe();
});
// Abkürzung zum Testen: Antippen der Säckchen füllt alle Säckchen und zeigt den Schluss
[0, 1].forEach(i => $(`saecke-${i}`).addEventListener('click', () => {
  if (!S || S.beendet || S.pausiert || !aktiv(i)) return;
  S.muenzen[i] = S.sichtbar[i] = S.saecke * PRO_SACK;
  S.saeckeDa[i] = S.saecke;
  zeichneSaecke(i, { k: S.saecke - 1, klasse: 'zu' });
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

// Töne dürfen das Spiel nie anhalten, auch wenn der Ton-Teil des Browsers streikt
schuetze(TON, 'TON');
