'use strict';
/* =========================================================
   Uhr lesen – Spiellogik
   Ablauf wie bei Mathe-Fussball: Einstellungen, Aufgaben, Countdown dazwischen.
   Statt Toren: Mit jeder richtigen Antwort geht das Tier mit der Fackel einen
   Schritt auf die Zündschnur zu. Beim Ziel zündet es die Rakete (Feuerwerk).
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
  { id: 'pink',    wert: '#d81b60' },
  { id: 'tuerkis', wert: '#00838f' }
];
const BILD = {
  fackel: id => `bilder/fackel/${id}.png`,                       // Tier mit Fackel (läuft nach rechts)
  kopf: id => `../mathe-fussball/bilder/tiere/${id}.png`,          // Kopf im Ring
  jubel: id => `../mathe-fussball/bilder/figuren/${id}-jubel.png`  // jubelnde Figur
};

const STANDARD = {
  spieler: 2,
  arten: { lesen: true, stellen: true },
  zeiten: { ganz: true, halb: true, viertel: true },
  blatt: 'alle',
  nachmittag: true,
  schritte: '6',
  minuten: '',
  wechselSek: '3',
  ton: true,
  zurueck: false,          // 1 Kind: bei falscher Antwort einen Schritt zurück
  autoDoppelpunkt: true,   // fehlender Doppelpunkt wird beim OK eingesetzt
  hilfe: true,             // Uhr stellen: Stundenzeiger darf eine Viertelstunde daneben sein
  teams: [
    { name: 'Löwen',       tier: 'loewe',        farbe: 'rot' },
    { name: 'Erdmännchen', tier: 'erdmaennchen', farbe: 'blau' }
  ]
};
// v2: Nachmittagszeiten neu standardmässig ein – ältere gespeicherte Einstellungen werden einmalig verworfen
const SPEICHER_EINST = 'uhrlesen.einstellungen.v2';
const SPERRE_MS = 1500;      // Sperre nach falscher Antwort
const LOESUNG_MS = 1300;     // Lösung zeigen nach richtiger Antwort
const START_UHR = 15;        // die Uhr zum Stellen steht am Anfang auf 12:15

/* Zeitplan der Rakete (ms ab Zünden) */
// bücken: Tier ist angekommen und hält die Fackel an die Schnur; erst danach brennt die Schnur
const R = { buecken: 900, schnur: 1400, start: 2600, flug: 3000, knall: 5600, fertig: 7900 };

/* ---------- Hilfen ---------- */
const tierVon = id => TIERE.find(t => t.id === id) || TIERE[0];
const farbeVon = id => FARBEN.find(f => f.id === id) || FARBEN[0];
const mod = (a, n) => ((a % n) + n) % n;
function setzeFarbVariablen(el, farbId) {
  const f = farbeVon(farbId);
  el.style.setProperty('--farbe', f.wert);
  el.style.setProperty('--farbe-hell', mischeFarbe(f.wert, 0.8));
  el.style.setProperty('--farbe-dunkel', dunkler(f.wert, 0.35));
  el.style.setProperty('--text', farbId === 'gelb' ? '#1d2733' : '#ffffff');
}
/* Tierbilder: g = gehend mit erhobener Fackel (bilder/fackel), z = gebückt beim Zünden (bilder/zuenden).
   Je [Breite, Höhe, Flamme x0, y0, x1, y1] – die Flamme als Bruchteil der Bildgrösse (aus den Bildern gemessen).
   z_hoehe: Grösse der gebückten Figur im Verhältnis zur gehenden (gleicher Massstab). */
const FIGUREN = {
loewe        : { g: [333, 440, 0.757, 0.036, 0.967, 0.248], z: [412, 440, 0.813, 0.684, 0.976, 0.977], z_hoehe: 0.822 },
  tiger        : { g: [348, 440, 0.756, 0.039, 0.966, 0.25], z: [440, 434, 0.814, 0.652, 0.975, 0.975], z_hoehe: 0.739 },
  baer         : { g: [324, 440, 0.747, 0.03, 0.963, 0.25], z: [440, 404, 0.811, 0.629, 0.975, 0.975], z_hoehe: 0.750 },
  wolf         : { g: [329, 440, 0.751, 0.02, 0.973, 0.241], z: [440, 436, 0.814, 0.667, 0.975, 0.975], z_hoehe: 0.736 },
  fuchs        : { g: [346, 440, 0.746, 0.02, 0.974, 0.255], z: [440, 429, 0.818, 0.66, 0.975, 0.974], z_hoehe: 0.739 },
  elefant      : { g: [350, 440, 0.763, 0.02, 0.974, 0.236], z: [440, 372, 0.827, 0.645, 0.977, 0.976], z_hoehe: 0.714 },
  adler        : { g: [298, 440, 0.695, 0.02, 0.977, 0.245], z: [440, 345, 0.775, 0.609, 0.98, 0.974], z_hoehe: 0.535 },
  hai          : { g: [320, 440, 0.728, 0.039, 0.978, 0.243], z: [440, 392, 0.764, 0.635, 0.977, 0.977], z_hoehe: 0.576 },
  erdmaennchen : { g: [323, 440, 0.752, 0.041, 0.978, 0.266], z: [440, 312, 0.782, 0.603, 0.977, 0.974], z_hoehe: 0.513 }
};
const FIGUR_HOEHE = 228, FIGUR_BREITE = 220;
const FLAMMEN_BILDER = 6, FLAMME_SEITEN = 166 / 240;   // bilder/flamme/1..6.png
/** Animierte Flamme über der gezeichneten Flamme (etwas grösser, damit sie diese ganz zudeckt) */
function flammeStil(f, seiten) {
  const [x0, y0, x1, y1] = f;
  const h = (y1 - y0) * 1.45, b = h * FLAMME_SEITEN / seiten;
  const cx = (x0 + x1) / 2;
  return `left:${((cx - b / 2) * 100).toFixed(2)}%; top:${((y1 + 0.015 - h) * 100).toFixed(2)}%; width:${(b * 100).toFixed(2)}%; height:${(h * 100).toFixed(2)}%`;
}
/** Figur: gehend und gebückt (zum Zünden), je mit flackernder Flamme */
function figurHtml(tier) {
  const d = FIGUREN[tier];
  const [gw, gh] = d.g, [zw, zh] = d.z;
  const breite = FIGUR_HOEHE * gw / gh;
  const zH = FIGUR_HOEHE * d.z_hoehe, zB = zH * zw / zh;
  return `<div class="innen">
    <div class="koerper gehen" style="height:${FIGUR_HOEHE}px; width:${breite.toFixed(1)}px; left:${((FIGUR_BREITE - breite) / 2).toFixed(1)}px; bottom:0">
      <img src="${BILD.fackel(tier)}" alt="${tierVon(tier).name}"><div class="flamme" style="${flammeStil(d.g.slice(2), gw / gh)}"></div></div>
    <div class="koerper zuenden" style="height:${zH.toFixed(1)}px; width:${zB.toFixed(1)}px">
      <img src="bilder/zuenden/${tier}.png" alt=""><div class="flamme" style="${flammeStil(d.z.slice(2), zw / zh)}"></div></div>
  </div><span class="zaehler"></span>`;
}
// Flammenbilder vorladen und reihum zeigen (wie ein kurzer Film)
for (let k = 1; k <= FLAMMEN_BILDER; k++) new Image().src = `bilder/flamme/${k}.png`;
let flammenBild = 0;
setInterval(() => { flammenBild = (flammenBild + 1) % FLAMMEN_BILDER; const b = document.getElementById('buehne'); if (b) b.dataset.f = flammenBild; }, 85);
const ringHtml = id => `<span class="ring"><img src="${BILD.kopf(id)}" alt="${tierVon(id).name}"></span>`;
const istStandardName = name => TIERE.some(t => t.team === name);
const mitArtikel = name => istStandardName(name) ? `die ${name}` : name;

/* =========================================================
   Töne
   ========================================================= */
let audioCtx = null, tonAusgang = null;
const tonPuffer = {};
const TON_DATEIEN = {   // aus Mathe-Fussball (Quellen in der README)
  richtig: { datei: '../mathe-fussball/toene/richtig.mp3', von: 0.3, dauer: 1.8, laut: 0.9 },
  falsch:  { datei: '../mathe-fussball/toene/falsch.mp3',  von: 0.0, dauer: 0.9, laut: 0.5 },
  tick:    { datei: '../mathe-fussball/toene/tick.wav',    von: 0.0, dauer: 0.95, laut: 1.0 }
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
tonFreischaltenBei(() => (E.ton ? audio() : null));   // bei jedem Antippen, bis der Browser den Ton erlaubt
const tonAn = () => E.ton;
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
  g.gain.exponentialRampToValueAtTime(laut, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  o.connect(g).connect(tonAusgang || ac.destination);
  o.start(t0); o.stop(t0 + dauer + 0.05);
}
/** Rauschen mit Filter (für Zischen, Heulen und Knall) */
function rauschen(dauer, { start = 0, laut = 0.2, typ = 'bandpass', freq = 1200, bis = null, q = 0.7, abklingen = true } = {}) {
  const ac = audio(); if (!ac) return;
  const len = Math.floor(ac.sampleRate * dauer);
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (abklingen ? Math.pow(1 - i / len, 1.5) : 1);
  const t0 = ac.currentTime + start;
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = typ; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (bis) f.frequency.exponentialRampToValueAtTime(bis, t0 + dauer);
  const g = ac.createGain(); g.gain.value = laut;
  src.connect(f).connect(g).connect(tonAusgang || ac.destination);
  src.start(t0);
}
const TON = {
  richtig() { if (tonAn() && !spieleDatei('richtig')) { piep(880, 0.12, { laut: 0.25 }); piep(1320, 0.18, { start: 0.09, laut: 0.25 }); } },
  falsch()  { if (tonAn() && !spieleDatei('falsch')) piep(150, 0.35, { typ: 'sawtooth', laut: 0.12, bis: 110 }); },
  tick()    { if (tonAn() && !spieleDatei('tick')) piep(1000, 0.04, { typ: 'square', laut: 0.06 }); },
  klick()   { if (tonAn()) piep(2200, 0.03, { typ: 'square', laut: 0.05 }); },
  schritt() { if (tonAn()) { piep(330, 0.08, { typ: 'triangle', laut: 0.2 }); piep(440, 0.1, { typ: 'triangle', start: 0.09, laut: 0.2 }); } },
  zischen() { if (tonAn()) rauschen(1.3, { typ: 'highpass', freq: 3500, laut: 0.35, abklingen: false }); },
  heulen()  {
    if (!tonAn()) return;
    rauschen(2.8, { typ: 'bandpass', freq: 500, bis: 2600, q: 1.5, laut: 0.6 });
    piep(700, 2.6, { typ: 'sine', laut: 0.07, bis: 2400 });
  },
  knall()   {
    if (!tonAn()) return;
    rauschen(1.4, { typ: 'lowpass', freq: 900, bis: 120, laut: 1.4 });
    piep(90, 0.5, { typ: 'sine', laut: 0.5, bis: 40 });
    for (let k = 0; k < 14; k++) rauschen(0.05, { start: 0.45 + Math.random() * 1.2, typ: 'highpass', freq: 3000, laut: 0.25 });
  }
};

/* =========================================================
   Einstellungen
   ========================================================= */
let E = Object.assign(structuredClone(STANDARD), laden(SPEICHER_EINST, {}));
if (!Array.isArray(E.teams) || E.teams.length !== 2) E.teams = structuredClone(STANDARD.teams);
E.arten = Object.assign(structuredClone(STANDARD.arten), E.arten || {});
E.zeiten = Object.assign(structuredClone(STANDARD.zeiten), E.zeiten || {});
if (!ZIFFERBLAETTER.some(b => b.id === E.blatt)) E.blatt = STANDARD.blatt;
// Ungültige gespeicherte Werte durch den Standard ersetzen
if (ganzzahlIn(E.schritte, 3, 10) === null) E.schritte = STANDARD.schritte;
if (ganzzahlIn(E.wechselSek, 0, 30) === null) E.wechselSek = STANDARD.wechselSek;
if (E.minuten !== '' && ganzzahlIn(E.minuten, 1, 90) === null) E.minuten = '';
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
  document.querySelectorAll('[data-art]').forEach(b => b.classList.toggle('an', !!E.arten[b.dataset.art]));
  document.querySelectorAll('[data-zeit]').forEach(b => b.classList.toggle('an', !!E.zeiten[b.dataset.zeit]));
  document.querySelectorAll('[data-blatt]').forEach(b => b.classList.toggle('an', b.dataset.blatt === E.blatt));
}

function zeigeEinstellungen() {
  baueTeamKarte(0); baueTeamKarte(1);
  zeichneWahlKnoepfe();
  $('e-nachmittag').checked = E.nachmittag;
  $('e-doppelpunkt').checked = E.autoDoppelpunkt;
  $('e-hilfe').checked = E.hilfe;
  $('e-schritte').value = E.schritte;
  $('e-minuten').value = E.minuten;
  $('e-wechsel').value = E.wechselSek;
  // Wechselzeit braucht es nur, wenn zwei Kinder abwechselnd an die Tafel kommen
  $('wechsel-zeile').classList.toggle('versteckt', E.spieler === 1);
  $('e-ton').checked = E.ton;
  $('e-zurueck').checked = E.zurueck;
  $('zeile-zurueck').classList.toggle('versteckt', E.spieler !== 1);
  $('fehler').textContent = '';
  zeigeSeite('einstellungen');
}

function leseFormular() {
  E.nachmittag = $('e-nachmittag').checked;
  E.autoDoppelpunkt = $('e-doppelpunkt').checked;
  E.hilfe = $('e-hilfe').checked;
  E.schritte = $('e-schritte').value.trim();
  E.minuten = $('e-minuten').value.trim();
  E.wechselSek = $('e-wechsel').value.trim();
  E.ton = $('e-ton').checked;
  $('btn-ton').textContent = E.ton ? '🔊' : '🔇';
  E.zurueck = $('e-zurueck').checked;
  merke();
}

/** Prüft die Einstellungen. Gibt eine Fehlermeldung zurück oder null. */
function pruefeEinstellungen() {
  if (!E.arten.lesen && !E.arten.stellen) return 'Bitte mindestens eine Aufgabenart einschalten.';
  if (!E.zeiten.ganz && !E.zeiten.halb && !E.zeiten.viertel) return 'Bitte mindestens eine Art Uhrzeit einschalten.';
  if (ganzzahlIn(E.schritte, 3, 10) === null) return 'Richtige bis zum Zünden: bitte eine Zahl von 3 bis 10.';
  if (E.minuten !== '' && ganzzahlIn(E.minuten, 1, 90) === null) return 'Spielzeit: bitte 1 bis 90 Minuten oder leer lassen.';
  if (E.spieler === 2 && ganzzahlIn(E.wechselSek, 0, 30) === null) return 'Wechselzeit: bitte 0 bis 30 Sekunden.';
  return null;
}

/* =========================================================
   Aufgaben
   Eine Aufgabe: { art: 'lesen'|'stellen', h: 1..12, m: 0|15|30|45, anzeigeH: Stunde auf der Digitaluhr }
   ========================================================= */
function minutenListe(zeiten) {
  return [].concat(zeiten.ganz ? [0] : [], zeiten.viertel ? [15] : [], zeiten.halb ? [30] : [], zeiten.viertel ? [45] : []);
}
function erzeugePool(f) {
  const pool = [];
  f.arten.forEach(art => {
    for (let h = 1; h <= 12; h++) {
      minutenListe(f.zeiten).forEach(m => {
        if (art === 'stellen' && h === 12 && m === START_UHR) return;   // so steht die Uhr schon
        // Nachmittag: auf der Digitaluhr manchmal 13–23 Uhr statt 1–11 Uhr
        const anzeigeH = art === 'stellen' && f.nachmittag && h < 12 && Math.random() < 0.5 ? h + 12 : h;
        pool.push({ art, h, m, anzeigeH });
      });
    }
  });
  return pool;
}
/** Nächste Aufgabe:
    - Uhr lesen und Uhr stellen wechseln meistens ab (70 %), manchmal kommen zwei gleiche nacheinander,
      aber nie drei (wenn beide Arten eingeschaltet sind)
    - nie zweimal dieselbe Uhrzeit direkt nacheinander */
const WECHSEL_ANTEIL = 0.7;
function naechsteArt() {
  const vorher = S.aufgabe;
  if (S.filter.arten.length < 2 || !vorher) return waehle(S.filter.arten);
  const andere = vorher.art === 'lesen' ? 'stellen' : 'lesen';
  if (S.gleicheArt >= 2) return andere;
  return Math.random() < WECHSEL_ANTEIL ? andere : vorher.art;
}
function naechsteAusStapel() {
  const art = naechsteArt(), vorher = S.aufgabe;
  const passt = a => a.art === art && (!vorher || a.h !== vorher.h || a.m !== vorher.m);
  if (!S.stapel.some(passt)) S.stapel = mischen(S.pool);
  let k = S.stapel.length - 1;
  for (let j = S.stapel.length - 1; j >= 0; j--) if (passt(S.stapel[j])) { k = j; break; }
  const neu = S.stapel.splice(k, 1)[0];
  S.gleicheArt = vorher && vorher.art === neu.art ? S.gleicheArt + 1 : 1;
  return neu;
}

/* =========================================================
   Spiel
   ========================================================= */
let S = null;
let letzterFrame = 0, letzterTick = -1;

/* Bühne: 1600 × 900. Szene oben 450 hoch, unten Eingaben und Aufgabe. */
const BODEN_Y = 420;                 // hier stehen die Tiere
const START_X = 115, END_X = 500;    // Weg des linken Tiers (rechtes gespiegelt)
/* Rakete mit zwei langen Zündschnüren (bilder/rakete-stehend.png und bilder/zuendschnur.png,
   beide gleich gross und genau übereinander). Die Pfade folgen der Mitte der gezeichneten Schnüre
   (automatisch aus dem Bild gemessen), vom äusseren Ende bis unter den Raketenkörper. */
const RAKETEN_BILD = { links: 575, oben: 145, breite: 450, hoehe: 300 };
const FLUG_START = { x: 799.6, y: 295.2, hoehe: 298 };   // Mitte und Höhe der Rakete allein (bilder/rakete.png)
const SCHNUR_ENDE_X = 577;           // äusseres Ende der Zündschnur links (rechts gespiegelt)
const SCHNUR_PFADE = [
  'M 576.5 438.3 L 578.5 438 L 580.9 437.4 L 583.5 437.1 L 586.1 436.8 L 589.4 436.8 L 592.3 437.1 L 595.2 437.4 L 598.1 437.7 L 601.4 438 L 604 438.3 L 607.2 438.6 L 610.2 438.3 L 613.1 438.3 L 616 438 L 618.9 437.7 L 621.9 437.4 L 624.5 436.8 L 627.1 436.5 L 629.8 435.9 L 632.1 435.4 L 634.8 434.8 L 637.4 434.8 L 639.7 434.2 L 642.4 433.9 L 645.3 433.6 L 647.7 433.3 L 650.6 433 L 653.5 433 L 656.2 432.7 L 659.4 433 L 662 433 L 665.2 433.3 L 668.5 433.9 L 671.4 433.9 L 674.6 434.8 L 677.8 435.1 L 680.8 435.7 L 684 436.2 L 686.6 437.1 L 689.6 437.7 L 692.5 438 L 695.1 438.6 L 697.8 438.6 L 700.7 438.9 L 703.3 438.9 L 706.3 439.2 L 709.5 438.9 L 712.4 438.6 L 715.6 438.3 L 718.6 437.7 L 721.8 437.1 L 724.7 436.2 L 727.6 435.4 L 730.3 433.9 L 732.3 432.7 L 734.1 431.8 L 736.1 431 L 737.9 429.8 L 739.9 428.6 L 741.7 427.5 L 743.2 426.3 L 744.9 424.8 L 746.7 423.6 L 747.9 422.2 L 749.3 420.7 L 751.1 419.3 L 752.2 417.8 L 753.7 416 L 754.9 414.6 L 756.3 412.8 L 757.5 411 L 758.7 409.6 L 759.9 407.8 L 761 406.1 L 762.2 404 L 763.1 402 L 764.3 400.2 L 765.1 398.4 L 766 396.4 L 767.2 394.3 L 768.1 392.6 L 768.9 390.2 L 769.8 388.2 L 770.7 386.1 L 771.3 383.8 L 772.2 381.8 L 772.8 379.7 L 773.3 377.1 L 774.2 375.3 L 774.8 373 L 775.4 370.3 L 776.3 368.3 L 776.6 365.9 L 777.1 363.6 L 777.7 361.2 L 778.3 358.6 L 778.6 356 L 779.2 353.9 L 779.5 351.3 L 780.1 348.6 L 780.4 346.3 L 780.7 343.7 L 781.3 341 L 781.5 338.4 L 781.8 335.8 L 782.1 333.1 L 782.1 330.5 L 782.4 327.8 L 782.7 325.2 L 783 322.3 L 784.2 320.8 L 785.6 319.3 L 788 318.8 L 790.9 318.8 L 793.3 318.8',
  'M 1023.2 437.7 L 1021.2 437.7 L 1018.8 437.4 L 1015.9 437.1 L 1013.3 436.5 L 1010.4 436.8 L 1007.1 437.1 L 1004.5 437.1 L 1001.3 437.7 L 998.3 437.7 L 995.4 438.3 L 992.5 438.6 L 989.6 438.3 L 986.6 438.6 L 984 438.3 L 980.8 438 L 977.8 437.7 L 975.2 436.8 L 972.3 436.8 L 969.6 435.9 L 967 435.7 L 964.4 435.1 L 961.7 434.5 L 959.4 434.2 L 956.7 433.9 L 953.8 433.6 L 951.5 433.3 L 948.5 433 L 945.9 433 L 943 432.7 L 939.7 433 L 936.8 433.3 L 933.9 433.3 L 930.7 433.6 L 927.7 434.2 L 924.5 434.5 L 921.6 435.1 L 918.1 435.9 L 915.1 436.2 L 912.2 437.1 L 909.6 437.7 L 906.6 438.3 L 904 438.6 L 901.4 438.9 L 898.4 438.9 L 895.5 438.9 L 892.9 439.2 L 889.6 438.6 L 886.7 438.9 L 883.8 438.3 L 880.6 437.7 L 877.3 437.4 L 874.4 436.2 L 871.5 435.4 L 868.8 434.2 L 867.1 432.7 L 865 431.8 L 863 431 L 861.2 429.5 L 859.5 428.6 L 857.4 427.5 L 856 426 L 854.5 424.8 L 852.7 423.6 L 851.3 422.2 L 849.8 420.4 L 848.3 419.3 L 846.9 417.5 L 845.7 416 L 844.2 414.3 L 842.8 412.8 L 841.6 411 L 840.4 409.3 L 839.3 407.5 L 838.1 405.8 L 837.2 404 L 836 402.3 L 834.9 400.2 L 834 398.4 L 832.8 396.4 L 832.2 394.3 L 831.1 392.3 L 830.2 390.5 L 829.3 388.2 L 828.4 386.1 L 827.5 384.1 L 827 381.8 L 826.1 379.7 L 825.5 377.4 L 824.6 375.3 L 824.3 373 L 823.4 370.6 L 822.9 368.6 L 822.6 365.9 L 822 363.6 L 821.4 361.2 L 821.1 358.6 L 820.5 356.3 L 819.9 353.9 L 819.6 351.3 L 819 348.6 L 818.8 346.3 L 818.5 343.4 L 817.9 341 L 817.9 338.4 L 817.3 335.8 L 817.3 333.1 L 817 330.2 L 816.7 327.6 L 817 324.6 L 816.1 322.3 L 815.2 320.5 L 813.5 319.3 L 811.1 318.8 L 808.2 318.8 L 805.9 318.8'
];
const tierX = (i, k) => {
  const x = START_X + (END_X - START_X) * k / S.ziel;
  return i === 0 ? x : 1600 - x;
};

function starteSpiel() {
  leseFormular();
  const fehler = pruefeEinstellungen();
  if (fehler) { $('fehler').textContent = fehler; return; }
  E.teams.forEach(t => { if (!t.name.trim()) t.name = tierVon(t.tier).team; });
  merke();
  const filter = {
    arten: Object.keys(E.arten).filter(k => E.arten[k]),
    zeiten: Object.assign({}, E.zeiten),
    nachmittag: E.nachmittag
  };
  const pool = erzeugePool(filter);
  S = {
    n: E.spieler,
    teams: structuredClone(E.teams).slice(0, E.spieler),
    filter, pool, stapel: mischen(pool), gleicheArt: 0,
    aufgabe: null,
    ziel: Number(E.schritte),
    schritte: [0, 0],
    raketen: [0, 0],
    eingabe: ['', ''],
    sperre: [0, 0],
    uhr: [zeigerStellung(START_UHR), zeigerStellung(START_UHR)],   // Stellung der Zeiger beim Stellen
    mitZeit: E.minuten !== '',
    restMs: E.minuten !== '' ? Number(E.minuten) * 60000 : 0,
    wechselMs: E.spieler === 1 ? 0 : Number(E.wechselSek) * 1000,   // 1 Kind: kein Countdown
    phase: 'spiel',      // spiel | loesung | wechsel | rakete | ende
    phaseRestMs: 0, weiter: null,
    rakete: null,
    zeitUm: false,
    zurueck: E.spieler === 1 && E.zurueck,
    autoDoppelpunkt: E.autoDoppelpunkt,
    hilfe: E.hilfe,
    pausiert: false, beendet: false
  };
  baueSpielfeld();
  zeigeSeite('spiel');
  skaliere();
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  naechsteAufgabe();
  letzterFrame = performance.now();
  requestAnimationFrame(schleife);
}
const aktiv = i => i < S.n;

/* ---------- Spielfeld aufbauen ---------- */
function schnurPfad(i) { return SCHNUR_PFADE[i]; }
function baueSpielfeld() {
  const b = $('buehne');
  b.classList.toggle('allein', S.n === 1);
  $('btn-weiss-nicht').classList.toggle('versteckt', S.n !== 1);
  // Rakete
  const r = $('rakete');
  [r, $('schnur-bild')].forEach(el => {
    el.style.left = RAKETEN_BILD.links + 'px'; el.style.top = RAKETEN_BILD.oben + 'px';
    el.style.width = RAKETEN_BILD.breite + 'px'; el.style.height = RAKETEN_BILD.hoehe + 'px';
  });
  r.classList.remove('weg');
  $('schnur-bild').classList.remove('weg'); $('schnur').classList.remove('weg');

  $('schritte').innerHTML = '';
  [0, 1].forEach(i => {
    const da = aktiv(i);
    ['figur-', 'panel-', 'tafel-', 'brand-', 'funke-'].forEach(p => $(p + i).classList.toggle('versteckt', !da || p === 'funke-'));
    if (!da) return;
    const team = S.teams[i];
    b.style.setProperty(`--farbe-${i}`, farbeVon(team.farbe).wert);
    // Zündschnur
    const d = schnurPfad(i);
    const brand = $(`brand-${i}`);
    brand.setAttribute('d', d);
    const L = brand.getTotalLength();
    brand.style.strokeDasharray = `${L} ${L}`;
    brand.style.strokeDashoffset = L;
    // Schritte auf der Wiese: dezente Punkte ohne Zahlen
    for (let k = 1; k <= S.ziel; k++) {
      const p = document.createElement('div');
      p.className = 'schritt';
      p.id = `schritt-${i}-${k}`;
      p.style.left = tierX(i, k) + 'px';
      setzeFarbVariablen(p, team.farbe);
      $('schritte').appendChild(p);
    }
    // Tier mit Fackel
    const fig = $(`figur-${i}`);
    setzeFarbVariablen(fig, team.farbe);
    fig.innerHTML = figurHtml(team.tier);
    fig.className = 'figur' + (i === 1 ? ' rechts' : '');
    // Anzeigetafel
    const tafel = $(`tafel-${i}`);
    setzeFarbVariablen(tafel, team.farbe);
    tafel.innerHTML = i === 0
      ? `${ringHtml(team.tier)}<span class="tafel-name">${esc(team.name)}</span><span class="tafel-raketen" id="raketen-${i}"></span>`
      : `<span class="tafel-raketen" id="raketen-${i}"></span><span class="tafel-name">${esc(team.name)}</span>${ringHtml(team.tier)}`;
    bauePanel(i);
  });
  $('uhr-gross').innerHTML = uhrSvg(E.blatt);
  $('btn-ton').textContent = E.ton ? '🔊' : '🔇';   // gleicher Schalter wie «Ton» in den Einstellungen
  ['jubel', 'pause-menue', 'ende', 'wechsel-box', 'flug-rakete'].forEach(id => $(id).classList.add('versteckt'));
  $('aufgabe-box').classList.remove('versteckt');
  funken.length = 0;
  zeichneSchritte(false);
  zeichneStand();
}

function bauePanel(i) {
  const team = S.teams[i];
  const p = $(`panel-${i}`);
  setzeFarbVariablen(p, team.farbe);
  p.innerHTML = `
    <div class="panel-kopf"><span class="panel-name">${esc(team.name)}</span><div class="eingabe filz" aria-live="polite"></div></div>
    <div class="meldung"></div>
    <div class="tastatur">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(z => `<button class="filz" data-taste="${z}">${z}</button>`).join('')}
      <button class="filz doppelpunkt" data-taste=":" aria-label="Doppelpunkt">:</button>
      <button class="filz" data-taste="0">0</button>
      <button data-taste="loeschen" class="loeschen filz" aria-label="Löschen">⌫</button>
      <button data-taste="ok" class="ok filz">OK ✓</button>
    </div>
    <div class="uhr-teil">
      <div class="wand klein"><div class="uhr-halter">${uhrSvg(E.blatt)}</div></div>
      <button data-taste="ok" class="ok gross-ok filz">OK ✓</button>
    </div>
    <div class="sperre"><div></div></div>`;
  p.querySelectorAll('[data-taste]').forEach(b => b.addEventListener('pointerdown', ev => {
    ev.preventDefault(); taste(i, b.dataset.taste);
  }));
  verbindeZiehen(i, p.querySelector('.uhr-teil svg'));
}

/* ---------- Ablauf ---------- */
function setzePhase(name, ms, weiter) { S.phase = name; S.phaseRestMs = ms; S.weiter = weiter; }

function naechsteAufgabe() {
  S.aufgabe = naechsteAusStapel();
  const a = S.aufgabe;
  S.eingabe = ['', ''];
  S.sperre = [0, 0];
  setzePhase('spiel', 0, null);
  const lesen = a.art === 'lesen';
  $('aufgabe-lesen').classList.toggle('versteckt', !lesen);
  $('aufgabe-stellen').classList.toggle('versteckt', lesen);
  $('loesung-text').classList.add('versteckt');
  if (lesen) {
    stelleUhr($('uhr-gross').querySelector('svg'), minutenVon(a.h, a.m));
  } else {
    $('wecker-anzeige').innerHTML = segmentSvg(`${String(a.anzeigeH).padStart(2, '0')}:${String(a.m).padStart(2, '0')}`);
  }
  [0, 1].forEach(i => {
    if (!aktiv(i)) return;
    const p = $(`panel-${i}`);
    p.classList.toggle('stellen', !lesen);
    p.classList.remove('geloest', 'gezeigt');
    S.uhr[i] = zeigerStellung(START_UHR);
    stelleZeiger(p.querySelector('.uhr-teil svg'), S.uhr[i]);
    p.querySelector('.meldung').textContent = '';
  });
  $('wechsel-box').classList.add('versteckt');
  $('aufgabe-box').classList.remove('versteckt');
  zeichneEingaben();
}

function taste(i, wert) {
  if (!S || S.pausiert || S.phase !== 'spiel' || S.sperre[i] > 0 || !aktiv(i)) return;
  audio();
  if (wert === 'ok') { pruefe(i); return; }
  if (S.aufgabe.art !== 'lesen') return;
  if (wert === 'loeschen') S.eingabe[i] = S.eingabe[i].slice(0, -1);
  else if (S.eingabe[i].length < 5) {
    if (wert === ':' && S.eingabe[i].includes(':')) return;   // nur ein Doppelpunkt
    S.eingabe[i] += wert;
  }
  const meldung = $(`panel-${i}`).querySelector('.meldung');
  meldung.textContent = ''; meldung.classList.remove('zeigen');
  zeichneEingaben();
}

function pruefe(i) {
  const a = S.aufgabe;
  if (a.art === 'lesen') {
    if (S.autoDoppelpunkt) { S.eingabe[i] = ergaenzeDoppelpunkt(S.eingabe[i]); zeichneEingaben(); }
    const ergebnis = pruefeEingabe(S.eingabe[i], a.h, a.m);
    if (ergebnis === 'leer') return;
    if (ergebnis === 'doppelpunkt') {   // kein Fehler, nur ein Hinweis
      const m = $(`panel-${i}`).querySelector('.meldung');
      m.textContent = 'Doppelpunkt nicht vergessen!';
      blinke(m, 'zeigen');
      return;
    }
    if (ergebnis === 'richtig') richtig(i); else falsch(i);
  } else {
    if (S.ziehen && S.ziehen.i === i) return;
    if (stellungRichtig(S.uhr[i], minutenVon(a.h, a.m), S.hilfe)) richtig(i); else falsch(i);
  }
}

function richtig(i) {
  TON.richtig();
  const a = S.aufgabe;
  const p = $(`panel-${i}`);
  blinke(p, 'richtig');
  if (a.art === 'lesen') {
    const l = $('loesung-text');
    l.textContent = `${String(a.h).padStart(2, '0')}:${String(a.m).padStart(2, '0')}`;
    l.classList.remove('versteckt');
  } else {
    p.classList.add('geloest');
    // mit Hilfe: Stundenzeiger rutscht zur Kontrolle auf die genaue Stellung
    S.uhr[i] = zeigerStellung(minutenVon(a.h, a.m));
    stelleZeiger(p.querySelector('.uhr-teil svg'), S.uhr[i]);
  }
  S.eingabe = ['', ''];
  zeichneEingaben();
  S.schritte[i] = Math.min(S.ziel, S.schritte[i] + 1);
  setTimeout(() => TON.schritt(), 350);
  zeichneSchritte(true);
  if (S.schritte[i] >= S.ziel) setzePhase('loesung', LOESUNG_MS, () => starteRakete([i], true));
  else setzePhase('loesung', LOESUNG_MS, () => wechsel(naechsteAufgabe));
}

function falsch(i) {
  TON.falsch();
  S.sperre[i] = SPERRE_MS;
  S.eingabe[i] = '';
  blinke($(`panel-${i}`), 'falsch');
  const fig = $(`figur-${i}`);
  blinke(fig, 'traurig');
  zeichneEingaben();
  // Einstellung (nur 1 Kind): enttäuscht einen Schritt zurück, aber nie hinter den Start
  if (S.zurueck && S.schritte[i] > 0) {
    S.schritte[i]--;
    setTimeout(() => { if (S && !S.beendet) zeichneSchritte(true); }, 450);
  }
}

/** Knopf "Ich weiss es nicht" (nur 1 Kind): Lösung zeigen, kein Schritt, dann die nächste Aufgabe */
const WEISS_NICHT_MS = 2600;
function weissNicht() {
  if (!S || S.pausiert || S.phase !== 'spiel' || S.n !== 1) return;
  const a = S.aufgabe;
  S.eingabe = ['', ''];
  zeichneEingaben();
  if (a.art === 'lesen') {
    const l = $('loesung-text');
    l.textContent = `${String(a.h).padStart(2, '0')}:${String(a.m).padStart(2, '0')}`;
    l.classList.remove('versteckt');
  } else {
    // Uhr im Panel auf die richtige Zeit stellen
    S.ziehen = null;
    S.uhr[0] = zeigerStellung(minutenVon(a.h, a.m));
    const p = $('panel-0');
    stelleZeiger(p.querySelector('.uhr-teil svg'), S.uhr[0]);
    p.classList.add('gezeigt');
  }
  setzePhase('loesung', WEISS_NICHT_MS, () => wechsel(naechsteAufgabe));
}

/** Countdown zwischen den Aufgaben */
function wechsel(danach) {
  if (S.mitZeit && S.restMs <= 0 && !S.zeitUm) { zeitUm(); return; }
  if (!S.wechselMs) { danach(); return; }
  S.eingabe = ['', ''];
  zeichneEingaben();
  $('aufgabe-box').classList.add('versteckt');
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

/** Zeit ist um: die Rakete startet von selbst (das Tier, das am nächsten ist, zündet) */
function zeitUm() {
  S.zeitUm = true;
  const aktive = [0, 1].filter(aktiv);
  const best = Math.max(...aktive.map(i => S.schritte[i]));
  starteRakete(aktive.filter(i => S.schritte[i] === best), false);
}

/* =========================================================
   Rakete: Zünden, Flug mit Loopings, Feuerwerk
   ========================================================= */
function starteRakete(zuender, punkt) {
  $('wechsel-box').classList.add('versteckt');
  $('aufgabe-box').classList.remove('versteckt');
  if (punkt) zuender.forEach(i => { S.raketen[i]++; });
  S.rakete = { ms: 0, zuender, punkt, schritt: 0 };
  setzePhase('rakete', 0, null);
  // Tiere gehen an die Zündschnur, bücken sich und halten die Flamme genau an das Ende der Schnur
  zuender.forEach(i => {
    const fig = $(`figur-${i}`), d = FIGUREN[S.teams[i].tier];
    const zH = FIGUR_HOEHE * d.z_hoehe, zB = zH * d.z[0] / d.z[1];
    const fx = (d.z[2] + d.z[4]) / 2 * zB, fy = (d.z[3] + d.z[5]) / 2 * zH;   // Mitte der Flamme
    const ziel = { x: SCHNUR_ENDE_X + 4, y: 420 };                           // Ende der Zündschnur (links)
    const links = ziel.x - fx;                                               // linker Rand der gebückten Figur
    const mitte = links + zB / 2;
    const z = fig.querySelector('.koerper.zuenden');
    z.style.left = ((FIGUR_BREITE - zB) / 2).toFixed(1) + 'px';
    z.style.top = (ziel.y - 205 - fy).toFixed(1) + 'px';
    fig.classList.add('geht');
    fig.style.left = (i === 0 ? mitte : 1600 - mitte) + 'px';

  });
  zeichneStand();
}

/* Flugbahn: hoch, Looping rechts, Looping links, dann Knall oben in der Mitte */
const FLUG_PUNKTE = [
  [800, 295], [800, 190], [835, 105], [960, 50], [1130, 75], [1250, 200], [1220, 350], [1070, 420],
  [930, 360], [840, 250], [770, 160], [650, 85], [480, 70], [345, 170], [345, 330], [480, 420],
  [640, 380], [740, 300], [790, 250], [815, 215]
];
const flugBahn = (() => {
  const P = FLUG_PUNKTE, pts = [];
  for (let s = 0; s < P.length - 1; s++) {
    const p0 = P[Math.max(0, s - 1)], p1 = P[s], p2 = P[s + 1], p3 = P[Math.min(P.length - 1, s + 2)];
    for (let k = 0; k < 24; k++) {
      const t = k / 24, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(P[P.length - 1]);
  const laenge = [0];
  for (let k = 1; k < pts.length; k++) laenge.push(laenge[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const L = laenge[laenge.length - 1];
  return function bei(anteil) {   // Punkt und Richtung bei einem Anteil (0..1) der Strecke
    const z = Math.max(0, Math.min(1, anteil)) * L;
    let k = 1; while (k < laenge.length - 1 && laenge[k] < z) k++;
    const a = pts[k - 1], b = pts[k], u = (z - laenge[k - 1]) / ((laenge[k] - laenge[k - 1]) || 1);
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, w: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
})();
/* Anfangs langsam, dann schnell */
function flugAnteil(t) { return t < 0.2 ? 2.778 * t * t : 0.1111 + 1.1111 * (t - 0.2); }

function raketeSchritt(dt) {
  const r = S.rakete, vorher = r.ms;
  r.ms += dt;
  const ueber = ms => vorher < ms && r.ms >= ms;
  // Zündschnur brennt von der Fackel bis zur Rakete
  if (ueber(R.buecken)) r.zuender.forEach(i => { const f = $(`figur-${i}`); f.classList.remove('geht'); f.classList.add('zuendet'); });
  if (ueber(R.schnur)) TON.zischen();
  if (r.ms >= R.schnur) {
    const anteil = Math.min(1, (r.ms - R.schnur) / (R.start - R.schnur));
    r.zuender.forEach(i => {
      const brand = $(`brand-${i}`), L = brand.getTotalLength();
      brand.style.strokeDashoffset = L * (1 - anteil);
      const f = $(`funke-${i}`);
      if (anteil < 1) {
        const pt = brand.getPointAtLength(L * anteil);
        f.style.left = pt.x + 'px'; f.style.top = pt.y + 'px';
        f.classList.remove('versteckt');
        if (Math.random() < 0.7) funken.push(neuerFunke(pt.x, pt.y, 'glut'));
      } else f.classList.add('versteckt');
    });
  }
  // Start und Flug
  if (ueber(R.start)) {
    TON.heulen();
    $('rakete').classList.add('weg');
    $('schnur-bild').classList.add('weg'); $('schnur').classList.add('weg');   // Schnüre hängen sonst in der Luft
    $('flug-rakete').classList.remove('versteckt');
    r.zuender.forEach(i => $(`figur-${i}`).classList.remove('zuendet'));
  }
  if (r.ms >= R.start && r.ms < R.knall) {
    const t = (r.ms - R.start) / R.flug;
    const p = flugBahn(flugAnteil(t));
    const groesse = 1 - 0.45 * t, hoehe = FLUG_START.hoehe * groesse;
    const el = $('flug-rakete');
    el.style.height = hoehe + 'px';
    el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${(p.w * 180 / Math.PI + 90).toFixed(1)}deg)`;
    // Feuerschweif unten am Raketenkörper
    const hx = p.x - Math.cos(p.w) * hoehe * 0.09, hy = p.y - Math.sin(p.w) * hoehe * 0.09;
    for (let k = 0; k < 5; k++) funken.push(neuerFunke(hx, hy, 'schweif', p.w));
    if (Math.random() < 0.5) funken.push(neuerFunke(hx, hy, 'rauch', p.w));
  }
  if (ueber(R.knall)) {
    $('flug-rakete').classList.add('versteckt');
    const p = flugBahn(1);
    TON.knall();
    explosion(p.x, p.y, 1);
    const nach = (ms, fn) => setTimeout(() => { if (S && S.phase === 'rakete') fn(); }, ms);
    nach(350, () => { explosion(p.x - 380, p.y + 60, 0.6); explosion(p.x + 380, p.y + 40, 0.6); });
    nach(750, () => { explosion(p.x - 170, p.y - 90, 0.5); explosion(p.x + 200, p.y - 70, 0.5); });
    zeigeJubel();
  }
  if (r.ms >= R.fertig) raketeFertig();
}

function zeigeJubel() {
  const r = S.rakete, j = $('jubel');
  let text;
  if (!r.punkt) text = 'Die Zeit ist um!';
  else if (S.n === 1) text = `Super! Rakete Nummer ${S.raketen[r.zuender[0]]}!`;
  else text = `Rakete für ${mitArtikel(S.teams[r.zuender[0]].name)}!`;
  $('jubel-text').textContent = text;
  setzeFarbVariablen(j, S.teams[r.zuender[0]].farbe);
  j.classList.remove('versteckt');
}

function raketeFertig() {
  $('jubel').classList.add('versteckt');
  const r = S.rakete;
  S.rakete = null;
  r.zuender.forEach(i => { $(`brand-${i}`).style.strokeDashoffset = $(`brand-${i}`).getTotalLength(); });
  if (S.zeitUm) { beende(); return; }
  // Neue Runde: neue Rakete, Tiere zurück an den Start
  S.schritte = [0, 0];
  $('rakete').classList.remove('weg');
  $('schnur-bild').classList.remove('weg'); $('schnur').classList.remove('weg');
  zeichneSchritte(true);
  zeichneStand();
  wechsel(naechsteAufgabe);
}

function beende() {
  if (!S || S.beendet) return;
  S.beendet = true;
  S.phase = 'ende';
  const box = $('ende');
  const aktive = [0, 1].filter(aktiv);
  const r = S.raketen;
  const rak = n => `${n} ${n === 1 ? 'Rakete' : 'Raketen'}`;
  let sieger = null;
  if (S.n === 1) {
    $('ende-text').textContent = r[0] ? `${rak(r[0])} gezündet!` : 'Gut gespielt!';
    $('ende-stand').textContent = `${S.teams[0].name}: ${rak(r[0])}`;
    sieger = 0;
  } else {
    sieger = r[0] > r[1] ? 0 : r[1] > r[0] ? 1 : null;
    $('ende-text').textContent = sieger === null ? 'Unentschieden!'
      : (istStandardName(S.teams[sieger].name) ? `Die ${S.teams[sieger].name} gewinnen!` : `${S.teams[sieger].name} gewinnt!`);
    $('ende-stand').textContent = `${S.teams[0].name} ${r[0]} 🚀 : 🚀 ${r[1]} ${S.teams[1].name}`;
  }
  const zeigen = sieger === null ? aktive : [sieger];
  $('ende-bild').innerHTML = zeigen.map(i => `<div class="figur-bild"><img src="${BILD.jubel(S.teams[i].tier)}" alt=""></div>`).join('');
  setzeFarbVariablen(box, S.teams[sieger === null ? 0 : sieger].farbe);
  box.classList.remove('versteckt');
}

/* ---------- Funken und Feuerwerk (Canvas) ---------- */
const funken = [];
const FEUER_FARBEN = ['#ff1744', '#ffea00', '#00e5ff', '#76ff03', '#e040fb', '#ff9100', '#ffffff', '#448aff', '#ff4081'];
function neuerFunke(x, y, art, w = 0) {
  if (art === 'glut') {
    const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, leben: 0.35 + Math.random() * 0.3, alter: 0, farbe: Math.random() < 0.5 ? '#ffd54f' : '#ff9800', r: 2.5, g: 300 };
  }
  if (art === 'rauch') {
    return { x, y, vx: -Math.cos(w) * 40 + (Math.random() - 0.5) * 30, vy: -Math.sin(w) * 40 + (Math.random() - 0.5) * 30, leben: 1.1, alter: 0, farbe: 'rgba(220,220,230,', r: 10, rauch: true, g: -10 };
  }
  // Schweif: nach hinten, gelb-orange
  const a = w + Math.PI + (Math.random() - 0.5) * 0.5, v = 160 + Math.random() * 200;
  return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leben: 0.25 + Math.random() * 0.35, alter: 0, farbe: waehle(['#fff59d', '#ffca28', '#ff9800', '#ff5722']), r: 3 + Math.random() * 3, g: 80 };
}
function explosion(x, y, staerke) {
  // mehrere Ringe in verschiedenen Farben, aussen schneller
  const farben = mischen(FEUER_FARBEN), ringe = staerke >= 1 ? 5 : 3;
  for (let k = 0; k < ringe; k++) {
    const farbe = farben[k % farben.length], anzahl = Math.round((staerke >= 1 ? 80 : 50) + k * 6), v0 = (230 + k * 120) * staerke;
    for (let n = 0; n < anzahl; n++) {
      const a = n / anzahl * Math.PI * 2 + Math.random() * 0.12, v = v0 * (0.85 + Math.random() * 0.3);
      funken.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leben: 1.7 + Math.random() * 0.9, alter: 0, farbe, r: 4 + Math.random() * 2.5, g: 120, bremse: 1.3, glitzer: Math.random() < 0.35 });
    }
  }
  blitz = { x, y, r: 380 * staerke, ms: 0 };
}
let blitz = null;
function zeichneFunken(dt) {
  const c = $('feuerwerk'), x = c.getContext('2d');
  x.clearRect(0, 0, 1600, 900);
  if (!funken.length && !blitz) return;
  const s = dt / 1000;
  x.globalCompositeOperation = 'lighter';
  if (blitz) {
    blitz.ms += dt;
    const a = Math.max(0, 1 - blitz.ms / 300);
    const g = x.createRadialGradient(blitz.x, blitz.y, 0, blitz.x, blitz.y, blitz.r);
    g.addColorStop(0, `rgba(255,255,240,${0.9 * a})`); g.addColorStop(1, 'rgba(255,255,200,0)');
    x.fillStyle = g; x.beginPath(); x.arc(blitz.x, blitz.y, blitz.r, 0, Math.PI * 2); x.fill();
    if (a <= 0) blitz = null;
  }
  for (let k = funken.length - 1; k >= 0; k--) {
    const f = funken[k];
    f.alter += s;
    if (f.alter >= f.leben) { funken.splice(k, 1); continue; }
    if (f.bremse) { const d = Math.exp(-f.bremse * s); f.vx *= d; f.vy *= d; }
    f.vy += f.g * s;
    f.x += f.vx * s; f.y += f.vy * s;
    const rest = 1 - f.alter / f.leben;
    if (f.rauch) {
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = f.farbe + (0.35 * rest).toFixed(3) + ')';
      x.beginPath(); x.arc(f.x, f.y, f.r * (2 - rest), 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'lighter';
      continue;
    }
    if (f.glitzer && rest < 0.5 && Math.random() < 0.5) continue;   // funkeln
    x.globalAlpha = Math.min(1, rest * 1.6);
    x.fillStyle = f.farbe;
    x.beginPath(); x.arc(f.x, f.y, f.r * (0.5 + 0.5 * rest), 0, Math.PI * 2); x.fill();
    // kurzer Leuchtschweif
    if (f.bremse) {
      x.strokeStyle = f.farbe; x.lineWidth = f.r * 0.7;
      x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x - f.vx * 0.05, f.y - f.vy * 0.05); x.stroke();
    }
    x.globalAlpha = 1;
  }
  x.globalCompositeOperation = 'source-over';
}

/* =========================================================
   Uhr stellen: Zeiger mit dem Finger ziehen
   - Die beiden Zeiger sind unabhängig voneinander und werden je einzeln gestellt
   - Minutenzeiger rastet in Viertelstunden ein (:00, :15, :30, :45)
   - Stundenzeiger rastet ebenfalls in Viertelstunden ein (wie bei einer echten Uhr steht er
     z. B. um 3:30 genau zwischen 3 und 4) – richtig ist nur die genaue Stellung beider Zeiger
   ========================================================= */
function winkelDiff(a, b) { const d = Math.abs(mod(a - b, 360)); return Math.min(d, 360 - d); }
function verbindeZiehen(i, svg) {
  const punkt = ev => {
    const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return { winkel: mod(Math.atan2(q.x, -q.y) * 180 / Math.PI, 360), r: Math.hypot(q.x, q.y) };
  };
  svg.addEventListener('pointerdown', ev => {
    if (!S || S.pausiert || S.phase !== 'spiel' || S.sperre[i] > 0 || S.aufgabe.art !== 'stellen') return;
    ev.preventDefault();
    audio();
    const { winkel, r } = punkt(ev);
    if (r > 115) return;
    const dm = winkelDiff(winkel, S.uhr[i].m * 90), dh = winkelDiff(winkel, S.uhr[i].s * 7.5);
    // Welcher Zeiger? Der näher liegende; liegen beide nah beieinander, entscheidet der Abstand zur Mitte
    let zeiger = dm <= dh ? 'minute' : 'stunde';
    if (Math.abs(dm - dh) < 25) zeiger = r > 50 ? 'minute' : 'stunde';
    S.ziehen = { i, zeiger, id: ev.pointerId };
    try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* egal */ }
    svg.classList.add('zieht', 'zieht-' + zeiger);
    bewege(winkel);
  });
  const bewege = winkel => {
    const z = S.ziehen;
    const alt = S.uhr[i];
    const neu = z.zeiger === 'minute'
      ? { s: alt.s, m: mod(Math.round(winkel / 90), 4) }       // Minutenzeiger: :00, :15, :30, :45
      : { s: mod(Math.round(winkel / 7.5), 48), m: alt.m };    // Stundenzeiger: in Viertelstunden zwischen den Zahlen
    if (neu.s !== alt.s || neu.m !== alt.m) { S.uhr[i] = neu; TON.klick(); stelleZeiger(svg, neu); }
  };
  svg.addEventListener('pointermove', ev => {
    if (!S || !S.ziehen || S.ziehen.i !== i || S.ziehen.id !== ev.pointerId) return;
    bewege(punkt(ev).winkel);
  });
  const loslassen = ev => {
    if (!S || !S.ziehen || S.ziehen.i !== i || S.ziehen.id !== ev.pointerId) return;
    S.ziehen = null;
    svg.classList.remove('zieht', 'zieht-minute', 'zieht-stunde');
  };
  svg.addEventListener('pointerup', loslassen);
  svg.addEventListener('pointercancel', loslassen);
}

/* ---------- Hauptschleife ---------- */
/** Ein Fehler in einem Bild darf die Schleife nie anhalten (sonst hängt das Spiel) */
function schleife(jetzt) {
  try { schleifeSchritt(jetzt); }
  catch (e) { meldeFehler(e, 'schleife'); if (S && !S.beendet) requestAnimationFrame(schleife); }
}
function schleifeSchritt(jetzt) {
  if (!S || S.beendet) { zeichneFunken(16); if (funken.length) requestAnimationFrame(schleife); return; }
  const dt = Math.max(0, Math.min(250, jetzt - letzterFrame) || 0);   // nie negativ oder NaN   // auch auf langsamen Tafeln flüssig genug
  letzterFrame = jetzt;
  if (!S.pausiert) {
    [0, 1].forEach(i => { if (S.sperre[i] > 0) S.sperre[i] = Math.max(0, S.sperre[i] - dt); });
    // Spielzeit läuft nur während der Aufgaben
    if (S.mitZeit && !S.zeitUm && (S.phase === 'spiel' || S.phase === 'loesung')) {
      S.restMs = Math.max(0, S.restMs - dt);
      if (S.restMs <= 0 && S.phase === 'spiel') zeitUm();
    }
    if (S.phase === 'rakete') raketeSchritt(dt);
    else if (S.phase === 'loesung' || S.phase === 'wechsel') {
      S.phaseRestMs -= dt;
      if (S.phase === 'wechsel') {
        zeichneWechselKreis(S.phaseRestMs / S.wechselMs);
        const sek = Math.ceil(S.phaseRestMs / 1000);
        if (sek <= 3 && sek > 0 && sek !== letzterTick) { letzterTick = sek; TON.tick(); }
      }
      if (S.phaseRestMs <= 0 && S.weiter) { const w = S.weiter; S.weiter = null; w(); }
    }
    zeichneFunken(dt);
  }
  if (S.beendet) { requestAnimationFrame(schleife); return; }
  zeichneLaufend();
  requestAnimationFrame(schleife);
}

/* ---------- Zeichnen ---------- */
function zeichneSchritte(gehen) {
  [0, 1].forEach(i => {
    if (!aktiv(i)) return;
    const k = S.schritte[i], fig = $(`figur-${i}`);
    fig.classList.remove('zuendet');
    // Nur das Tier geht, dessen Schritt sich geändert hat – das andere bleibt still stehen
    if (gehen && fig._k !== k) { fig.classList.remove('geht'); void fig.offsetWidth; fig.classList.add('geht'); clearTimeout(fig._t); fig._t = setTimeout(() => fig.classList.remove('geht'), 900); }
    fig._k = k;
    fig.style.left = tierX(i, k) + 'px';
    fig.querySelector('.zaehler').textContent = `${k} / ${S.ziel}`;
    for (let n = 1; n <= S.ziel; n++) $(`schritt-${i}-${n}`).classList.toggle('erreicht', n <= k);
  });
}
function zeichneStand() {
  [0, 1].forEach(i => { if (aktiv(i)) $(`raketen-${i}`).textContent = `🚀 ${S.raketen[i]}`; });
  zeichneLaufend();
}
function zeichneEingaben() {
  [0, 1].forEach(i => { if (aktiv(i)) $(`panel-${i}`).querySelector('.eingabe').textContent = S.eingabe[i]; });
}
function zeichneLaufend() {
  $('btn-weiss-nicht').classList.toggle('aus', S.phase !== 'spiel' || S.pausiert);
  const ziel = $('ziel');
  if (S.mitZeit) { ziel.textContent = `⏱ ${zeitText(S.restMs)}`; ziel.className = S.restMs <= 10000 && !S.zeitUm ? 'knapp' : ''; }
  else { ziel.textContent = `${S.ziel} richtige Antworten zünden die Rakete`; ziel.className = ''; }
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
/* Die Bühne ist 1600 breit; auf höheren Bildschirmen (z. B. 4:3-Tafeln) wird sie bis 1400 hoch:
   oben wächst der Himmel, alles andere rutscht nach unten (CSS-Variable --h, --dy = --h − 900). */
function skaliere() {
  const w = window.innerWidth, h = window.innerHeight;
  const H = Math.round(Math.min(1400, Math.max(900, 1600 * h / w)));
  const b = $('buehne');
  b.style.setProperty('--h', H + 'px');
  b.style.transform = `translate(-50%, -50%) scale(${Math.min(w / 1600, h / H)})`;
}
window.addEventListener('resize', skaliere);
function abbrechenUnd(weiter) { S = null; funken.length = 0; weiter(); }

// Wer spielt?
document.querySelectorAll('[data-spieler]').forEach(b => b.addEventListener('click', () => {
  E.spieler = Number(b.dataset.spieler); merke(); zeigeEinstellungen();
}));
$('btn-zur-wahl').addEventListener('click', () => { leseFormular(); zeigeSeite('wahl'); });

// Einstellungen
$('blatt-raster').innerHTML = ZIFFERBLAETTER.map(b => `
  <button class="wahl blatt filz" data-blatt="${b.id}">${uhrSvg(b.id, { nagel: false })}<span>${b.name}</span></button>`).join('');
document.querySelectorAll('[data-blatt] svg').forEach(svg => stelleUhr(svg, minutenVon(10, 10)));
document.querySelectorAll('[data-art]').forEach(b => b.addEventListener('click', () => { E.arten[b.dataset.art] = !E.arten[b.dataset.art]; merke(); zeichneWahlKnoepfe(); }));
document.querySelectorAll('[data-zeit]').forEach(b => b.addEventListener('click', () => { E.zeiten[b.dataset.zeit] = !E.zeiten[b.dataset.zeit]; merke(); zeichneWahlKnoepfe(); }));
document.querySelectorAll('[data-blatt]').forEach(b => b.addEventListener('click', () => { E.blatt = b.dataset.blatt; merke(); zeichneWahlKnoepfe(); }));
['e-schritte', 'e-minuten', 'e-wechsel'].forEach(id => $(id).addEventListener('input', ev => { ev.target.value = ev.target.value.replace(/\D/g, ''); leseFormular(); }));
['e-nachmittag', 'e-doppelpunkt', 'e-hilfe', 'e-ton'].forEach(id => $(id).addEventListener('change', leseFormular));
['e-zurueck'].forEach(id => $(id).addEventListener('change', leseFormular));
$('btn-start').addEventListener('click', starteSpiel);
$('btn-weiss-nicht').addEventListener('click', weissNicht);
/* Abkürzung zum Testen: Antippen eines Teams auf der Anzeigetafel -> das Tier springt ans Ziel
   und die Rakete wird gezündet (so lässt sich das Ende schnell anschauen) */
[0, 1].forEach(i => $(`tafel-${i}`).addEventListener('click', () => {
  if (!S || S.pausiert || S.phase !== 'spiel' || !aktiv(i)) return;
  S.schritte[i] = S.ziel;
  zeichneSchritte(true);
  starteRakete([i], true);
}));

// Spiel
$('btn-pause').addEventListener('click', () => pause(true));
$('wechsel-box').addEventListener('pointerdown', () => {
  if (S && !S.pausiert && S.phase === 'wechsel') { S.phaseRestMs = 0; zeichneWechselKreis(0); }
});
// Doppeltippen auf die Aufgabe: überspringen
let letzterTipp = 0;
$('aufgabe-box').addEventListener('pointerdown', () => {
  const jetzt = performance.now(), doppelt = jetzt - letzterTipp < 400;
  letzterTipp = doppelt ? 0 : jetzt;
  if (doppelt && S && !S.pausiert && S.phase === 'spiel') naechsteAufgabe();
});
$('btn-weiter').addEventListener('click', () => pause(false));
$('btn-neustart').addEventListener('click', () => abbrechenUnd(starteSpiel));
$('btn-zu-einst').addEventListener('click', () => abbrechenUnd(zeigeEinstellungen));
// Lautsprecher-Knopf im Spiel = Häkchen «Ton» in den Einstellungen (wird gespeichert)
$('btn-ton').addEventListener('click', () => {
  E.ton = !E.ton; merke();
  $('e-ton').checked = E.ton;
  $('btn-ton').textContent = E.ton ? '🔊' : '🔇';
  if (E.ton) audio();
});
$('btn-ton').textContent = E.ton ? '🔊' : '🔇';   // schon beim Laden richtig anzeigen
document.querySelectorAll('.btn-vollbild').forEach(b => b.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}));
$('btn-nochmal').addEventListener('click', () => abbrechenUnd(starteSpiel));
$('btn-ende-einst').addEventListener('click', () => abbrechenUnd(zeigeEinstellungen));

// Tastatur am Computer (für Team links): Ziffern, Doppelpunkt, Löschen, Enter
document.addEventListener('keydown', ev => {
  if (!S || $('spiel').classList.contains('versteckt')) return;
  if (/^[0-9:]$/.test(ev.key)) taste(0, ev.key);
  else if (ev.key === 'Backspace') taste(0, 'loeschen');
  else if (ev.key === 'Enter') taste(0, 'ok');
});

zeigeSeite('wahl');

// Töne dürfen das Spiel nie anhalten, auch wenn der Ton-Teil des Browsers streikt
schuetze(TON, 'TON');
