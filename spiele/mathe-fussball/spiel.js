'use strict';
/* =========================================================
   Tafelfussball – Spiellogik
   ========================================================= */

/* ---------- Bilder ----------
   null/false = Platzhalter (Emoji bzw. CSS-Grafik). */
const BILDER = {
  feld: 'bilder/feld.png',
  sonne: 'bilder/sonne.png',
  wolke1: 'bilder/wolke1.png',
  wolke2: 'bilder/wolke2.png',
  ball: 'bilder/ball.png',
  pokal: 'bilder/pokal.png',
  tiere: true,      // Köpfe: bilder/tiere/<id>.png
  // Tiere mit ganzer Figur: bilder/figuren/<id>-<pose>.png (stehen, freude, traurig, jubel, sprung).
  // Alle anderen zeigen den Kopf im Ring.
  figuren: ['loewe', 'tiger', 'baer', 'adler', 'hai', 'fuchs', 'wolf', 'elefant', 'erdmaennchen']
};

const TIERE = [
  { id: 'loewe',        name: 'Löwe',        team: 'Löwen',       emoji: '🦁' },
  { id: 'tiger',        name: 'Tiger',       team: 'Tiger',       emoji: '🐯' },
  { id: 'baer',         name: 'Bär',         team: 'Bären',       emoji: '🐻' },
  { id: 'adler',        name: 'Adler',       team: 'Adler',       emoji: '🦅' },
  { id: 'hai',          name: 'Hai',         team: 'Haie',        emoji: '🦈' },
  { id: 'fuchs',        name: 'Fuchs',       team: 'Füchse',      emoji: '🦊' },
  { id: 'wolf',         name: 'Wolf',        team: 'Wölfe',       emoji: '🐺' },
  { id: 'elefant',      name: 'Elefant',     team: 'Elefanten',   emoji: '🐘' },
  { id: 'erdmaennchen', name: 'Erdmännchen', team: 'Erdmännchen', emoji: '🐿️' }
];

// Teamfarben (zufällig verteilt). Kein Grün: sonst fällt der grüne OK-Knopf nicht auf.
const FARBEN = [
  { id: 'rot',     name: 'Rot',    wert: '#d32f2f' },
  { id: 'blau',    name: 'Blau',   wert: '#1565c0' },
  { id: 'gelb',    name: 'Gelb',   wert: '#fbc02d' },
  { id: 'orange',  name: 'Orange', wert: '#e65100' },
  { id: 'lila',    name: 'Lila',   wert: '#7b1fa2' },
  { id: 'pink',    name: 'Pink',   wert: '#d81b60' },
  { id: 'tuerkis', name: 'Türkis', wert: '#00838f' }
];

const ALLE_REIHEN = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const STANDARD = {
  zahlenraum: '100',
  ops: { plus: true, minus: true, mal: false, geteilt: false },
  zueb: true,              // true = mit Zehnerübergang (gemischt), false = ohne
  stellen: 'ZE',           // 2. Zahl: 'ZE' zweistellig, 'E' einstellig
  reihen: ALLE_REIHEN.slice(),
  tore: '3',               // Standard: 3 Tore bis zum Sieg
  minuten: '',
  wechselSek: '5',         // Standard: 5 Sekunden Kreis-Countdown zum Platzwechseln
  zeitlimitAn: false,
  zeitlimitSek: '20',
  rueckrollen: false,
  auto: false,
  ton: true,
  teams: [
    { name: 'Löwen',       tier: 'loewe',        farbe: 'rot' },
    { name: 'Erdmännchen', tier: 'erdmaennchen', farbe: 'blau' }
  ]
};

const SPERRE_MS = 1500;      // Sperre nach falscher Antwort
const KICK_MS = 1100;        // Figur springt und schiesst
const JUBEL_MS = 4000;       // Torjubel
const LOESUNG_MS = 2000;     // Lösung zeigen
const MAX_POS = 3;           // Mitte = 0, Tor = ±3
const POOL_GROESSE = 100;
const VERLAUF_MAX = 100;
const SPEICHER_EINST = 'tafelfussball.einstellungen.v2';
const SPEICHER_VERLAUF = 'tafelfussball.verlauf';
const OP_ZEICHEN = { plus: '+', minus: '−', mal: '×', geteilt: ':' };

/* ---------- Hilfen ----------
   Allgemeine Werkzeuge ($, zufall, waehle, mischen, laden, speichern, mischeFarbe,
   dunkler, esc, zeitText, ganzzahlIn) kommen aus ../../gemeinsam/hilfen.js */
const tierVon = id => TIERE.find(t => t.id === id) || TIERE[0];
const farbeVon = id => FARBEN.find(f => f.id === id) || FARBEN[0];
function setzeFarbVariablen(el, farbId) {
  const f = farbeVon(farbId);
  el.style.setProperty('--farbe', f.wert);
  el.style.setProperty('--farbe-hell', mischeFarbe(f.wert, 0.8));
  el.style.setProperty('--farbe-dunkel', dunkler(f.wert, 0.35));
  el.style.setProperty('--text', farbId === 'gelb' ? '#1d2733' : '#ffffff');
}
function tierHtml(tierId) {
  const t = tierVon(tierId);
  if (BILDER.tiere) return `<span class="tier"><img src="bilder/tiere/${t.id}.png" alt="${t.name}"></span>`;
  return `<span class="tier" role="img" aria-label="${t.name}"><span class="emoji">${t.emoji}</span></span>`;
}
function ringHtml(tierId) { return `<span class="ring">${tierHtml(tierId)}</span>`; }
/** Ganze Figur in einer Pose, oder Platzhalter-Kopf im Ring */
function figurHtml(tierId, pose) {
  if (hatFigur(tierId)) return `<img src="bilder/figuren/${tierId}-${pose}.png" alt="${tierVon(tierId).name}">`;
  return ringHtml(tierId);
}
function hatFigur(tierId) { return BILDER.figuren.includes(tierId); }
function istStandardName(name) { return TIERE.some(t => t.team === name); }
function mitArtikel(name) { return istStandardName(name) ? `die ${name}` : name; }

/* =========================================================
   Töne (im Code erzeugt)
   ========================================================= */
let audioCtx = null;
let stumm = false;
function audio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function tonAn() { return E.ton && !stumm; }
function piep(freq, dauer, { typ = 'sine', start = 0, laut = 0.2, bis = null } = {}) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + start;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = typ; o.frequency.setValueAtTime(freq, t0);
  if (bis) o.frequency.exponentialRampToValueAtTime(bis, t0 + dauer);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(laut, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  o.connect(g).connect(ac.destination);
  o.start(t0); o.stop(t0 + dauer + 0.05);
}
function rauschen(dauer, { start = 0, laut = 0.15 } = {}) {
  const ac = audio(); if (!ac) return;
  const len = Math.floor(ac.sampleRate * dauer);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.6;
  const g = ac.createGain(); g.gain.value = laut;
  src.connect(f).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}
const TON = {
  richtig() { if (!tonAn()) return; piep(880, 0.12, { laut: 0.25 }); piep(1320, 0.18, { start: 0.09, laut: 0.25 }); },
  falsch()  { if (!tonAn()) return; piep(150, 0.35, { typ: 'sawtooth', laut: 0.12, bis: 110 }); },
  tick()    { if (!tonAn()) return; piep(1000, 0.04, { typ: 'square', laut: 0.06 }); },
  kick()    { if (!tonAn()) return; piep(180, 0.08, { typ: 'triangle', laut: 0.35, bis: 70 }); },
  tor()     {
    if (!tonAn()) return;
    [523, 659, 784, 1047].forEach((f, i) => piep(f, 0.22, { typ: 'triangle', start: i * 0.1, laut: 0.25 }));
    piep(1047, 0.6, { typ: 'triangle', start: 0.4, laut: 0.25 });
    rauschen(3, { start: 0.05, laut: 0.18 });
  },
  pfiff(lang = false) {
    if (!tonAn()) return;
    const ac = audio(); if (!ac) return;
    const pfeife = (start, dauer) => {
      const t0 = ac.currentTime + start;
      const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
      o.frequency.value = 2900; lfo.frequency.value = 35; lg.gain.value = 120;
      lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.02);
      g.gain.setValueAtTime(0.15, t0 + dauer - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
      o.connect(g).connect(ac.destination);
      o.start(t0); lfo.start(t0); o.stop(t0 + dauer); lfo.stop(t0 + dauer);
    };
    if (lang) { pfeife(0, 0.25); pfeife(0.35, 0.25); pfeife(0.7, 0.8); } else pfeife(0, 0.5);
  }
};

/* =========================================================
   Einstellungen
   ========================================================= */
let E = Object.assign(structuredClone(STANDARD), laden(SPEICHER_EINST, {}));
if (!Array.isArray(E.teams) || E.teams.length !== 2) E.teams = structuredClone(STANDARD.teams);
if (!E.ops) E.ops = structuredClone(STANDARD.ops);
if (!Array.isArray(E.reihen)) E.reihen = ALLE_REIHEN.slice();
// Ist weder Tore noch Minuten gesetzt, gilt der Standard (3 Tore)
if (!String(E.tore).trim() && !String(E.minuten).trim()) E.tore = STANDARD.tore;
const merke = () => speichern(SPEICHER_EINST, E);

/** Bei jedem Öffnen bekommen die Teams zufällig zwei verschiedene Farben (nicht wählbar). */
function verteileFarben() {
  const [a, b] = mischen(FARBEN.slice());
  E.teams[0].farbe = a.id; E.teams[1].farbe = b.id;
}
verteileFarben();

/** Ein Tier gehört immer nur einem Team: Falls beide gleich sind, bekommt Team rechts ein anderes. */
if (E.teams[0].tier === E.teams[1].tier) {
  const t = waehle(TIERE.filter(x => x.id !== E.teams[0].tier));
  if (istStandardName(E.teams[1].name)) E.teams[1].name = t.team;
  E.teams[1].tier = t.id;
}
merke();

function zufallsTeam(team) {
  const anderes = E.teams.find(x => x !== team);
  const t = waehle(TIERE.filter(x => !anderes || x.id !== anderes.tier));
  team.tier = t.id; team.name = t.team;
}

function baueTeamKarte(i) {
  const team = E.teams[i];
  const karte = $(`karte-${i}`);
  const andererTier = E.teams[1 - i].tier;
  setzeFarbVariablen(karte, team.farbe);
  karte.classList.toggle('automatisch', E.auto);
  karte.innerHTML = `
    <div class="team-kopf">
      <h2>Team ${i === 0 ? 'links' : 'rechts'}</h2>
      <button class="wuerfel filz" title="Neu würfeln" data-wuerfel>🎲</button>
    </div>
    <input class="team-name" maxlength="18" value="${esc(team.name)}" aria-label="Teamname">
    <div class="unterzeile">Tier</div>
    <div class="tier-wahl">${TIERE.map(t => {
      const vergeben = t.id === andererTier;
      return `<button data-tier="${t.id}" class="filz ${t.id === team.tier ? 'aktiv' : ''} ${vergeben ? 'vergeben' : ''}" title="${vergeben ? t.name + ' (anderes Team)' : t.name}" ${vergeben ? 'disabled' : ''}>${tierHtml(t.id)}</button>`;
    }).join('')}</div>`;
  karte.querySelector('.team-name').addEventListener('input', ev => { team.name = ev.target.value; merke(); });
  // Nach jeder Änderung beide Karten neu zeichnen, damit das andere Team das vergebene Tier gesperrt sieht
  karte.querySelector('[data-wuerfel]').addEventListener('click', () => { zufallsTeam(team); merke(); baueTeamKarte(0); baueTeamKarte(1); });
  karte.querySelectorAll('[data-tier]:not([disabled])').forEach(b => b.addEventListener('click', () => {
    const alt = tierVon(team.tier), neu = tierVon(b.dataset.tier);
    if (!team.name.trim() || team.name === alt.team) team.name = neu.team;
    team.tier = neu.id; merke(); baueTeamKarte(0); baueTeamKarte(1);
  }));
}

/** Zeigt den Zustand der Aufgaben-Knöpfe an */
function zeichneAufgabenKnoepfe() {
  const zr = String(E.zahlenraum);
  document.querySelectorAll('[data-zr]').forEach(b => b.classList.toggle('an', b.dataset.zr === zr));
  if (document.activeElement !== $('e-zahlenraum')) $('e-zahlenraum').value = zr;
  document.querySelector('.eigene').classList.toggle('an', !['10', '20', '100', '1000'].includes(zr) && zr !== '');
  document.querySelectorAll('[data-op]').forEach(b => b.classList.toggle('an', !!E.ops[b.dataset.op]));
  // Unter-Einstellungen nur wählbar, wenn die passende Rechenart an ist
  $('abschnitt-plusminus').classList.toggle('aus', !(E.ops.plus || E.ops.minus));
  $('abschnitt-reihen').classList.toggle('aus', !(E.ops.mal || E.ops.geteilt));
  const zu = $('e-zueb');
  zu.classList.toggle('an', E.zueb); zu.classList.toggle('rot', !E.zueb);
  document.querySelectorAll('[data-stellen]').forEach(b => b.classList.toggle('an', b.dataset.stellen === E.stellen));
  document.querySelectorAll('[data-reihe]').forEach(b => b.classList.toggle('an', E.reihen.includes(Number(b.dataset.reihe))));
}

function zeigeEinstellungen() {
  if (E.auto) { zufallsTeam(E.teams[0]); zufallsTeam(E.teams[1]); }
  baueTeamKarte(0); baueTeamKarte(1);
  zeichneAufgabenKnoepfe();
  $('e-tore').value = E.tore;
  $('e-minuten').value = E.minuten;
  $('e-wechsel').value = E.wechselSek;
  $('e-zeitlimit-an').checked = E.zeitlimitAn;
  $('e-zeitlimit-sek').value = E.zeitlimitSek;
  $('e-rueckrollen').checked = E.rueckrollen;
  $('e-auto').checked = E.auto;
  $('e-ton').checked = E.ton;
  $('zeile-sekunden').classList.toggle('aus', !E.zeitlimitAn);
  $('fehler').textContent = '';
  zeigeSeite('einstellungen');
}

function leseFormular() {
  E.zahlenraum = $('e-zahlenraum').value.trim();
  E.tore = $('e-tore').value.trim();
  E.minuten = $('e-minuten').value.trim();
  E.wechselSek = $('e-wechsel').value.trim();
  E.zeitlimitAn = $('e-zeitlimit-an').checked;
  E.zeitlimitSek = $('e-zeitlimit-sek').value.trim();
  E.rueckrollen = $('e-rueckrollen').checked;
  E.auto = $('e-auto').checked;
  E.ton = $('e-ton').checked;
  $('zeile-sekunden').classList.toggle('aus', !E.zeitlimitAn);
  merke();
}

/** Prüft die Einstellungen. Gibt eine Fehlermeldung zurück oder null. */
function pruefeEinstellungen() {
  if (ganzzahlIn(E.zahlenraum, 10, 1000) === null) return 'Der Zahlenraum muss eine Zahl von 10 bis 1000 sein.';
  const ops = Object.keys(E.ops).filter(k => E.ops[k]);
  if (!ops.length) return 'Bitte mindestens eine Rechenart einschalten.';
  if ((E.ops.mal || E.ops.geteilt) && !E.reihen.length) return 'Für Mal und Geteilt bitte mindestens eine Einmaleins-Reihe einschalten.';
  const hatTore = E.tore !== '', hatMin = E.minuten !== '';
  if (hatTore && hatMin) return 'Bitte nur Tore oder Minuten ausfüllen.';
  if (!hatTore && !hatMin) return 'Bitte Tore oder Minuten ausfüllen.';
  if (hatTore && ganzzahlIn(E.tore, 1, 20) === null) return 'Tore bis Sieg: bitte eine Zahl von 1 bis 20.';
  if (hatMin && ganzzahlIn(E.minuten, 1, 90) === null) return 'Minuten Spielzeit: bitte eine Zahl von 1 bis 90.';
  if (ganzzahlIn(E.wechselSek, 0, 30) === null) return 'Wechselzeit: bitte 0 bis 30 Sekunden.';
  if (E.zeitlimitAn && ganzzahlIn(E.zeitlimitSek, 5, 60) === null) return 'Zeitlimit: bitte 5 bis 60 Sekunden.';
  return null;
}

/* =========================================================
   Aufgaben – werden passend zu den Filtern erzeugt
   ========================================================= */
function rechne(aufgabe) {
  const [a, op, b] = aufgabe.split(' ');
  const x = Number(a), y = Number(b);
  switch (op) { case '+': return x + y; case '-': return x - y; case '*': return x * y; case '/': return x / y; }
  return NaN;
}
function anzeige(aufgabe) {
  const [a, op, b] = aufgabe.split(' ');
  return `${a} ${{ '+': '+', '-': '−', '*': '×', '/': ':' }[op]} ${b}`;
}
/** Bereich der 2. Zahl (Summand 2 bzw. Subtrahend) */
function bereichZweiteZahl(f) {
  let min = f.stellen === 'ZE' ? 10 : 1, max = f.stellen === 'ZE' ? 99 : 9;
  max = Math.min(max, f.n - 1);
  if (min > max) { min = 1; max = Math.min(9, f.n - 1); }   // z. B. Zahlenraum 10 mit ZE
  return [min, max];
}
function erzeugeAufgabe(f) {
  const op = waehle(f.ops);
  if (op === 'mal') {
    const r = waehle(f.reihen), k = zufall(1, 10);
    return Math.random() < 0.5 ? `${k} * ${r}` : `${r} * ${k}`;
  }
  if (op === 'geteilt') {
    const r = waehle(f.reihen), k = zufall(1, 10);
    return `${r * k} / ${r}`;
  }
  const [bMin, bMax] = bereichZweiteZahl(f);
  for (let versuch = 0; versuch < 60; versuch++) {
    const b = zufall(bMin, bMax);
    if (op === 'plus') {
      const a = zufall(1, f.n - b);
      if (!f.zueb && (a % 10) + (b % 10) >= 10) continue;
      return `${a} + ${b}`;
    } else {
      if (b + 1 > f.n) continue;
      const a = zufall(b + 1, f.n);
      if (!f.zueb && (a % 10) < (b % 10)) continue;
      return `${a} - ${b}`;
    }
  }
  return null;
}
/** Prüft, ob eine Aufgabe zu den Filtern passt (auch für Tests) */
function passtZuFilter(aufgabe, f) {
  const [a, op, b] = aufgabe.split(' ');
  const x = Number(a), y = Number(b), r = rechne(aufgabe);
  if (!Number.isInteger(r) || r < 0) return false;
  if (op === '*' || op === '/') {
    const reihe = op === '/' ? y : (f.reihen.includes(y) ? y : x);
    const anderer = op === '/' ? r : (reihe === y ? x : y);
    return f.ops.includes(op === '*' ? 'mal' : 'geteilt') && f.reihen.includes(reihe) && anderer >= 1 && anderer <= 10;
  }
  const [bMin, bMax] = bereichZweiteZahl(f);
  if (y < bMin || y > bMax) return false;
  if (op === '+') return f.ops.includes('plus') && r <= f.n && (f.zueb || (x % 10) + (y % 10) < 10);
  return f.ops.includes('minus') && x <= f.n && (f.zueb || (x % 10) >= (y % 10));
}
function aktuelleFilter() {
  return {
    n: Number(E.zahlenraum),
    ops: Object.keys(E.ops).filter(k => E.ops[k]),
    zueb: E.zueb, stellen: E.stellen, reihen: E.reihen.slice()
  };
}
function erzeugePool(f) {
  const set = new Set();
  for (let i = 0; set.size < POOL_GROESSE && i < 5000; i++) {
    const a = erzeugeAufgabe(f);
    if (a) set.add(a);
  }
  return [...set];
}

/* =========================================================
   Spiel
   ========================================================= */
let S = null;
let letzterFrame = 0;
let letzterTick = -1;
const timer = [];
function spaeter(ms, fn) { timer.push(setTimeout(fn, ms)); }
function timerStopp() { while (timer.length) clearTimeout(timer.pop()); }

function starteSpiel() {
  leseFormular();
  const fehler = pruefeEinstellungen();
  if (fehler) { $('fehler').textContent = fehler; return; }
  $('fehler').textContent = '';
  E.teams.forEach(t => { if (!t.name.trim()) t.name = tierVon(t.tier).team; });
  merke();
  timerStopp();

  const filter = aktuelleFilter();
  S = {
    filter,
    pool: erzeugePool(filter),
    stapel: [],
    aufgabe: null,
    ergebnis: 0,
    ball: 0,
    tore: [0, 0],
    eingabe: ['', ''],
    sperre: [0, 0],
    modus: E.tore !== '' ? 'tore' : 'zeit',
    ziel: E.tore !== '' ? Number(E.tore) : Number(E.minuten),
    restMs: E.minuten !== '' ? Number(E.minuten) * 60000 : 0,
    zeitlimitMs: E.zeitlimitAn ? Number(E.zeitlimitSek) * 1000 : 0,
    wechselMs: Number(E.wechselSek) * 1000,
    aufgabeRestMs: 0,
    phase: 'spiel',       // spiel | kick | loesung | jubel | wechsel | ende
    phaseRestMs: 0,
    weiter: null,
    goldenGoal: false,
    pausiert: false,
    dauerMs: 0,
    teams: structuredClone(E.teams),
    beendet: false
  };
  if (!S.pool.length) { $('fehler').textContent = 'Mit diesen Filtern gibt es keine Aufgaben. Bitte die Auswahl ändern.'; S = null; return; }

  baueSpielfeld();
  zeigeSeite('spiel');
  skaliere();
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  TON.pfiff();
  naechsteAufgabe();
  letzterFrame = performance.now();
  requestAnimationFrame(schleife);
}

/* Positionen auf dem Feld (Bühnen-Pixel) */
const TOR_X = [125, 1475];   // Mitte der Tore im Spielfeld-Bild
function ballX(pos) { return 800 + pos * ((TOR_X[1] - 800) / MAX_POS); }

function baueSpielfeld() {
  const feld = $('feld');
  feld.classList.toggle('mit-bild', !!BILDER.feld);
  if (BILDER.feld) feld.style.setProperty('--feld-bild', `url("${BILDER.feld}")`);
  const setzeBild = (el, pfad) => { el.classList.toggle('mit-bild', !!pfad); if (pfad) el.style.setProperty('--bild', `url("${pfad}")`); };
  setzeBild($('sonne'), BILDER.sonne);
  setzeBild($('wolke-1'), BILDER.wolke1);
  setzeBild($('wolke-2'), BILDER.wolke2);
  setzeBild($('wolke-3'), BILDER.wolke1);
  $('ball').innerHTML = BILDER.ball ? `<img src="${BILDER.ball}" alt="Ball">` : '⚽';

  // Weisse Punkte im Rasen: alle Stellen, an denen der Ball liegen kann (ohne die Tore)
  feld.querySelectorAll('.ball-punkt').forEach(p => p.remove());
  for (let pos = -(MAX_POS - 1); pos <= MAX_POS - 1; pos++) {
    const p = document.createElement('div');
    p.className = 'ball-punkt';
    p.style.left = ballX(pos) + 'px';
    feld.insertBefore(p, $('ball'));
  }

  [0, 1].forEach(i => {
    const team = S.teams[i];
    $('buehne').style.setProperty(`--farbe-${i}`, farbeVon(team.farbe).wert);

    // Figur im eigenen Tor
    const fig = $(`figur-${i}`);
    setzeFarbVariablen(fig, team.farbe);
    fig.innerHTML = figurHtml(team.tier, 'stehen');
    fig.className = 'figur' + (hatFigur(team.tier) ? ' mit-figur' : '');
    // Posen vorladen, damit beim Wechsel nichts flackert
    if (hatFigur(team.tier)) ['freude', 'traurig', 'jubel', 'sprung'].forEach(p => { new Image().src = `bilder/figuren/${team.tier}-${p}.png`; });
    fig.style.left = TOR_X[i] + 'px';

    // Anzeigetafel
    const tafel = $(`tafel-${i}`);
    setzeFarbVariablen(tafel, team.farbe);
    tafel.innerHTML = i === 0 ? `${ringHtml(team.tier)}<span>${esc(team.name)}</span>` : `<span>${esc(team.name)}</span>${ringHtml(team.tier)}`;

    // Tastatur
    const p = $(`panel-${i}`);
    setzeFarbVariablen(p, team.farbe);
    p.innerHTML = `
      <div class="panel-kopf"><span class="panel-name">${esc(team.name)}</span><div class="eingabe filz" aria-live="polite"></div></div>
      <div class="tastatur">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(z => `<button class="filz" data-taste="${z}">${z}</button>`).join('')}
        <button data-taste="loeschen" class="loeschen filz" aria-label="Löschen">⌫</button>
        <button class="filz" data-taste="0">0</button>
        <button data-taste="ok" class="ok filz">OK ✓</button>
      </div>
      <div class="sperre"><div></div></div>`;
    p.querySelectorAll('[data-taste]').forEach(b => b.addEventListener('pointerdown', ev => {
      ev.preventDefault(); taste(i, b.dataset.taste);
    }));
  });
  $('btn-ton').textContent = stumm ? '🔇' : '🔊';
  ['jubel', 'pause-menue', 'ende', 'wechsel-box'].forEach(id => $(id).classList.add('versteckt'));
  $('aufgabe-box').classList.remove('versteckt');
  $('konfetti').innerHTML = '';
  zeichneBall(false);
  zeichneStand();
}

/* ---------- Posen der Figuren ---------- */
function setzePose(i, pose, dauerMs) {
  const fig = $(`figur-${i}`);
  if (hatFigur(S.teams[i].tier)) { const img = fig.querySelector(':scope > img'); if (img) img.src = `bilder/figuren/${S.teams[i].tier}-${pose}.png`; }
  fig.classList.remove('freude', 'traurig', 'jubel', 'sprung');
  if (pose !== 'stehen') { void fig.offsetWidth; fig.classList.add(pose); }
  clearTimeout(fig._poseTimer);
  if (dauerMs) fig._poseTimer = setTimeout(() => { if (S) setzePose(i, 'stehen'); }, dauerMs);
}

/* ---------- Ablauf ---------- */
function setzePhase(name, ms, weiter) { S.phase = name; S.phaseRestMs = ms; S.weiter = weiter; }

function naechsteAufgabe() {
  if (S.stapel.length === 0) {
    S.stapel = mischen(S.pool);
    if (S.aufgabe && S.stapel.length > 1 && S.stapel[S.stapel.length - 1] === S.aufgabe) S.stapel.unshift(S.stapel.pop());
  }
  S.aufgabe = S.stapel.pop();
  S.ergebnis = rechne(S.aufgabe);
  S.eingabe = ['', ''];
  S.sperre = [0, 0];
  S.aufgabeRestMs = S.zeitlimitMs;
  setzePhase('spiel', 0, null);
  letzterTick = -1;
  const t = $('aufgabe-text');
  t.textContent = `${anzeige(S.aufgabe)} = ?`;
  t.classList.remove('loesung');
  $('zeitbalken').classList.toggle('versteckt', !S.zeitlimitMs);
  $('wechsel-box').classList.add('versteckt');
  $('aufgabe-box').classList.remove('versteckt');
  zeichneEingaben();
}

/** Kreis-Countdown: anteil 1 = voller Ring, 0 = leer */
function zeichneWechselKreis(anteil) {
  $('wechsel-rest').style.strokeDashoffset = 100 * (1 - Math.max(0, Math.min(1, anteil)));
}

/** Countdown zum Platzwechseln, danach geht es mit `danach` weiter */
function wechsel(danach) {
  if (S.modus === 'zeit' && !S.goldenGoal && S.restMs <= 0) { zeitAbgelaufen(); if (S.beendet) return; }
  if (!S.wechselMs) { danach(); return; }
  S.eingabe = ['', ''];
  zeichneEingaben();
  $('aufgabe-box').classList.add('versteckt');
  $('wechsel-box').classList.remove('versteckt');
  zeichneWechselKreis(1);
  letzterTick = -1;
  setzePhase('wechsel', S.wechselMs, danach);
}

function taste(i, wert) {
  if (!S || S.pausiert || S.phase !== 'spiel' || S.sperre[i] > 0) return;
  audio();
  if (wert === 'loeschen') S.eingabe[i] = S.eingabe[i].slice(0, -1);
  else if (wert === 'ok') { pruefe(i); return; }
  else if (S.eingabe[i].length < 4) S.eingabe[i] = (S.eingabe[i] === '0' ? '' : S.eingabe[i]) + wert;
  zeichneEingaben();
}

function pruefe(i) {
  if (S.eingabe[i] === '') return;
  if (Number(S.eingabe[i]) === S.ergebnis) richtig(i); else falsch(i);
}

function richtig(i) {
  TON.richtig();
  blinke($(`panel-${i}`), 'richtig');
  const t = $('aufgabe-text');
  t.textContent = `${anzeige(S.aufgabe)} = ${S.ergebnis}`;
  t.classList.add('loesung');
  S.eingabe = ['', ''];
  zeichneEingaben();

  // Figur springt zum Ball, schiesst ihn ein Feld weiter und springt zurück
  const richtung = i === 0 ? 1 : -1;
  const fig = $(`figur-${i}`);
  setzePose(i, 'sprung');
  fig.style.left = (ballX(S.ball) - richtung * 70) + 'px';
  S.ball += richtung;
  spaeter(420, () => { if (!S) return; TON.kick(); zeichneBall(true); setzePose(i, 'freude'); });
  spaeter(800, () => { if (!S) return; fig.style.left = TOR_X[i] + 'px'; });
  spaeter(1300, () => { if (S) setzePose(i, 'stehen'); });

  setzePhase('kick', KICK_MS, () => {
    if (Math.abs(S.ball) >= MAX_POS) tor(i);
    else wechsel(naechsteAufgabe);
  });
}

function falsch(i) {
  TON.falsch();
  S.sperre[i] = SPERRE_MS;
  S.eingabe[i] = '';
  blinke($(`panel-${i}`), 'falsch');
  setzePose(i, 'traurig', 1200);
  if (E.rueckrollen) {
    const neu = S.ball + (i === 0 ? -1 : 1);       // Richtung eigenes Tor, nie hinein
    if (Math.abs(neu) < MAX_POS) { S.ball = neu; zeichneBall(true); }
  }
  zeichneEingaben();
}

function tor(i) {
  S.tore[i]++;
  S.letzterTorschuetze = i;
  zeichneStand();
  TON.tor();
  setzePose(i, 'jubel');
  setzePose(1 - i, 'traurig');
  const team = S.teams[i];
  const j = $('jubel');
  setzeFarbVariablen(j, team.farbe);
  $('jubel-figur').innerHTML = figurHtml(team.tier, 'jubel');
  $('jubel-text').textContent = `TOR für ${mitArtikel(team.name)}!`;
  j.classList.remove('versteckt');
  konfetti([farbeVon(team.farbe).wert, '#ffffff', '#ffd54f'], 120);
  setzePhase('jubel', JUBEL_MS, nachJubel);
}

function nachJubel() {
  $('jubel').classList.add('versteckt');
  const i = S.letzterTorschuetze;
  setzePose(0, 'stehen'); setzePose(1, 'stehen');
  if (S.goldenGoal || (S.modus === 'tore' && S.tore[i] >= S.ziel)) { beende(false); return; }
  S.ball = 0;
  zeichneBall(false);
  wechsel(naechsteAufgabe);
}

function zeigeLoesung() {
  S.eingabe = ['', ''];
  zeichneEingaben();
  const t = $('aufgabe-text');
  t.textContent = `${anzeige(S.aufgabe)} = ${S.ergebnis}`;
  t.classList.add('loesung');
  setzePhase('loesung', LOESUNG_MS, () => wechsel(naechsteAufgabe));
}

function zeitAbgelaufen() {
  if (S.tore[0] !== S.tore[1]) { beende(false); return; }
  if (!S.goldenGoal) { S.goldenGoal = true; TON.pfiff(); zeichneStand(); }
}

function beende(abgebrochen) {
  if (!S || S.beendet) return;
  S.beendet = true;
  S.phase = 'ende';
  timerStopp();
  const sieger = abgebrochen ? null : (S.tore[0] > S.tore[1] ? 0 : S.tore[1] > S.tore[0] ? 1 : null);
  schreibeVerlauf(abgebrochen, sieger);
  if (abgebrochen) return;

  TON.pfiff(true);
  const team = S.teams[sieger];
  setzePose(sieger, 'jubel');
  const box = $('ende');
  setzeFarbVariablen(box, team.farbe);
  $('ende-bild').innerHTML = `
    <div class="pokal">${BILDER.pokal ? `<img src="${BILDER.pokal}" alt="Pokal">` : '🏆'}</div>
    <div class="figur-bild">${figurHtml(team.tier, 'jubel')}</div>`;
  $('ende-text').textContent = istStandardName(team.name) ? `Die ${team.name} gewinnen!` : `${team.name} gewinnt!`;
  $('ende-stand').textContent = `${S.teams[0].name} ${S.tore[0]} : ${S.tore[1]} ${S.teams[1].name}`;
  box.classList.remove('versteckt');
  konfetti([farbeVon(team.farbe).wert, '#ffd54f', '#ffffff', '#4fc3f7'], 160);
}

/* ---------- Hauptschleife ---------- */
function schleife(jetzt) {
  if (!S || S.beendet) return;
  const dt = Math.min(100, jetzt - letzterFrame);
  letzterFrame = jetzt;

  if (!S.pausiert) {
    S.dauerMs += dt;
    [0, 1].forEach(i => { if (S.sperre[i] > 0) S.sperre[i] = Math.max(0, S.sperre[i] - dt); });

    // Spieluhr läuft nur während der Aufgaben, nicht beim Jubel oder Platzwechsel
    if (S.modus === 'zeit' && !S.goldenGoal && ['spiel', 'kick', 'loesung'].includes(S.phase)) {
      S.restMs = Math.max(0, S.restMs - dt);
      if (S.restMs <= 0 && S.phase === 'spiel') { zeitAbgelaufen(); if (S.beendet) return; }
    }

    if (S.phase === 'spiel') {
      if (S.zeitlimitMs) {
        S.aufgabeRestMs -= dt;
        const sek = Math.ceil(S.aufgabeRestMs / 1000);
        if (sek <= 5 && sek > 0 && sek !== letzterTick) { letzterTick = sek; TON.tick(); }
        if (S.aufgabeRestMs <= 0) zeigeLoesung();
      }
    } else if (S.phase !== 'ende') {
      S.phaseRestMs -= dt;
      if (S.phase === 'wechsel') {
        const sek = Math.ceil(S.phaseRestMs / 1000);
        zeichneWechselKreis(S.phaseRestMs / S.wechselMs);
        if (sek <= 3 && sek > 0 && sek !== letzterTick) { letzterTick = sek; TON.tick(); }
      }
      if (S.phaseRestMs <= 0 && S.weiter) {
        const weiter = S.weiter; S.weiter = null;
        weiter();
        if (S.beendet) return;
      }
    }
  }
  zeichneLaufend();
  requestAnimationFrame(schleife);
}

/* ---------- Zeichnen ---------- */
function zeichneBall(rollen) {
  const b = $('ball');
  // Bei einem Tor fliegt der Ball oben in die Mitte des Tors, über dem Kopf des Tiers, hinter das Netz
  const imTor = Math.abs(S.ball) >= MAX_POS;
  b.classList.toggle('im-tor', imTor);
  b.style.left = (imTor ? ballX(S.ball) - Math.sign(S.ball) * 27 : ballX(S.ball)) + 'px';
  if (rollen) { b.classList.remove('rollt'); void b.offsetWidth; b.classList.add('rollt'); }
}
function zeichneStand() {
  $('tore-0').textContent = S.tore[0];
  $('tore-1').textContent = S.tore[1];
  zeichneLaufend();
}
function zeichneEingaben() {
  [0, 1].forEach(i => { const e = document.querySelector(`#panel-${i} .eingabe`); if (e) e.textContent = S.eingabe[i]; });
}
function zeichneLaufend() {
  const ziel = $('ziel');
  if (S.goldenGoal) { ziel.textContent = 'Golden Goal!'; ziel.className = 'golden'; }
  else if (S.modus === 'tore') { ziel.textContent = `Erstes Team mit ${S.ziel} ${S.ziel === 1 ? 'Tor' : 'Toren'} gewinnt`; ziel.className = ''; }
  else { ziel.textContent = `⏱ ${zeitText(S.restMs)}`; ziel.className = S.restMs <= 10000 ? 'knapp' : ''; }
  if (S.zeitlimitMs) {
    const anteil = S.phase === 'spiel' ? Math.max(0, S.aufgabeRestMs / S.zeitlimitMs) : 0;
    $('zeitbalken-fuellung').style.width = (anteil * 100) + '%';
    $('zeitbalken').classList.toggle('knapp', S.phase === 'spiel' && S.aufgabeRestMs <= 5000);
  }
  [0, 1].forEach(i => {
    const p = $(`panel-${i}`);
    p.classList.toggle('gesperrt', S.sperre[i] > 0);
    p.querySelector('.sperre div').style.width = (S.sperre[i] / SPERRE_MS * 100) + '%';
  });
}
function blinke(el, klasse) {
  el.classList.remove(klasse); void el.offsetWidth; el.classList.add(klasse);
  setTimeout(() => el.classList.remove(klasse), 650);
}
function konfetti(farben, anzahl) {
  const c = $('konfetti');
  for (let k = 0; k < anzahl; k++) {
    const s = document.createElement('div');
    s.className = 'konfetti-stueck';
    s.style.left = Math.random() * 1600 + 'px';
    s.style.background = waehle(farben);
    s.style.animationDuration = (2 + Math.random() * 2) + 's';
    s.style.animationDelay = (Math.random() * 0.8) + 's';
    c.appendChild(s);
    setTimeout(() => s.remove(), 5000);
  }
}

/* ---------- Pause ---------- */
function pause(an) {
  if (!S || S.beendet) return;
  S.pausiert = an;
  $('pause-menue').classList.toggle('versteckt', !an);
}

/* =========================================================
   Verlauf
   ========================================================= */
function schreibeVerlauf(abgebrochen, sieger) {
  const liste = laden(SPEICHER_VERLAUF, []);
  liste.unshift({
    datum: new Date().toISOString(),
    teams: S.teams.map(t => ({ name: t.name, tier: t.tier, farbe: t.farbe })),
    tore: S.tore.slice(),
    sieger,
    aufgaben: `${S.filter.ops.map(o => OP_ZEICHEN[o]).join(' ')} · bis ${S.filter.n}`,
    spielart: S.modus === 'tore' ? `${S.ziel} ${S.ziel === 1 ? 'Tor' : 'Tore'}` : `${S.ziel} ${S.ziel === 1 ? 'Minute' : 'Minuten'}`,
    goldenGoal: S.goldenGoal,
    dauerSek: Math.round(S.dauerMs / 1000),
    abgebrochen
  });
  speichern(SPEICHER_VERLAUF, liste.slice(0, VERLAUF_MAX));
}

let verlaufZurueck = 'einstellungen';
function zeigeVerlauf(von) {
  verlaufZurueck = von;
  const liste = laden(SPEICHER_VERLAUF, []);
  const inhalt = $('verlauf-inhalt');
  if (!liste.length) {
    inhalt.innerHTML = '<div class="leer">Noch keine Spiele gespielt.</div>';
  } else {
    const teamZelle = t => `<span class="verlauf-team"><span class="ring" style="--farbe:${farbeVon(t.farbe).wert}">${tierHtml(t.tier)}</span>${esc(t.name)}</span>`;
    inhalt.innerHTML = `
      <table class="verlauf-tabelle">
        <thead><tr><th>Datum</th><th>Team links</th><th style="text-align:center">Stand</th><th>Team rechts</th><th>Sieger</th><th>Aufgaben</th><th>Spielart</th><th>Dauer</th></tr></thead>
        <tbody>${liste.map(e => {
          const d = new Date(e.datum);
          const datum = `${d.toLocaleDateString('de-CH')} ${d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
          const sieger = e.abgebrochen ? 'abgebrochen' : (e.sieger === null ? 'unentschieden' : `🏆 ${esc(e.teams[e.sieger].name)}`);
          const aufgaben = e.aufgaben || `bis ${e.zahlenraum}`;
          return `<tr class="${e.abgebrochen ? 'abgebrochen' : ''}">
            <td>${datum}</td><td>${teamZelle(e.teams[0])}</td>
            <td class="stand">${e.tore[0]} : ${e.tore[1]}</td>
            <td>${teamZelle(e.teams[1])}</td><td>${sieger}${e.goldenGoal && !e.abgebrochen ? ' (Golden Goal)' : ''}</td>
            <td>${esc(aufgaben)}</td><td>${esc(e.spielart)}</td><td>${zeitText(e.dauerSek * 1000)}</td></tr>`;
        }).join('')}</tbody>
      </table>`;
  }
  zeigeSeite('verlauf');
}

/* =========================================================
   Seiten, Skalierung, Ereignisse
   ========================================================= */
function zeigeSeite(id) {
  ['einstellungen', 'spiel', 'verlauf'].forEach(s => $(s).classList.toggle('versteckt', s !== id));
}
function skaliere() {
  const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  $('buehne').style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', skaliere);

function abbrechenUnd(weiter) {
  if (S && !S.beendet) beende(true);
  timerStopp();
  S = null;
  weiter();
}
function neueTeamsWennAuto() { if (E.auto) { zufallsTeam(E.teams[0]); zufallsTeam(E.teams[1]); } }

// Einstellungen: Aufgaben-Knöpfe
$('reihen').innerHTML = ALLE_REIHEN.map(r => `<button class="wahl filz" data-reihe="${r}">${r}er</button>`).join('');
document.querySelectorAll('[data-zr]').forEach(b => b.addEventListener('click', () => { E.zahlenraum = b.dataset.zr; $('e-zahlenraum').value = b.dataset.zr; merke(); zeichneAufgabenKnoepfe(); }));
$('e-zahlenraum').addEventListener('input', ev => { ev.target.value = ev.target.value.replace(/\D/g, ''); E.zahlenraum = ev.target.value; merke(); zeichneAufgabenKnoepfe(); });
document.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => { E.ops[b.dataset.op] = !E.ops[b.dataset.op]; merke(); zeichneAufgabenKnoepfe(); }));
$('e-zueb').addEventListener('click', () => { E.zueb = !E.zueb; merke(); zeichneAufgabenKnoepfe(); });
document.querySelectorAll('[data-stellen]').forEach(b => b.addEventListener('click', () => { E.stellen = b.dataset.stellen; merke(); zeichneAufgabenKnoepfe(); }));
document.querySelectorAll('[data-reihe]').forEach(b => b.addEventListener('click', () => {
  const r = Number(b.dataset.reihe);
  E.reihen = E.reihen.includes(r) ? E.reihen.filter(x => x !== r) : [...E.reihen, r].sort((a, c) => a - c);
  merke(); zeichneAufgabenKnoepfe();
}));

// Einstellungen: übrige Felder
['e-tore', 'e-minuten', 'e-wechsel', 'e-zeitlimit-sek'].forEach(id => $(id).addEventListener('input', ev => { ev.target.value = ev.target.value.replace(/\D/g, ''); leseFormular(); }));
['e-zeitlimit-an', 'e-rueckrollen', 'e-ton'].forEach(id => $(id).addEventListener('change', leseFormular));
$('e-auto').addEventListener('change', () => { leseFormular(); neueTeamsWennAuto(); merke(); baueTeamKarte(0); baueTeamKarte(1); });
$('btn-anpfiff').addEventListener('click', starteSpiel);
$('btn-verlauf-einst').addEventListener('click', () => { leseFormular(); zeigeVerlauf('einstellungen'); });

// Spiel
$('btn-pause').addEventListener('click', () => pause(true));
// Tippen auf den Kreis-Countdown beendet ihn sofort -> nächste Aufgabe
$('wechsel-box').addEventListener('pointerdown', () => {
  if (S && !S.pausiert && S.phase === 'wechsel') { S.phaseRestMs = 0; zeichneWechselKreis(0); }
});
$('btn-weiter').addEventListener('click', () => pause(false));
$('btn-neustart').addEventListener('click', () => abbrechenUnd(() => { neueTeamsWennAuto(); starteSpiel(); }));
$('btn-zu-einst').addEventListener('click', () => abbrechenUnd(zeigeEinstellungen));
$('btn-ton').addEventListener('click', () => { stumm = !stumm; $('btn-ton').textContent = stumm ? '🔇' : '🔊'; });
$('btn-vollbild').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
});

// Ende
$('btn-nochmal').addEventListener('click', () => { neueTeamsWennAuto(); S = null; starteSpiel(); });
$('btn-ende-einst').addEventListener('click', () => { S = null; zeigeEinstellungen(); });
$('btn-ende-verlauf').addEventListener('click', () => zeigeVerlauf('spiel'));

// Verlauf
$('btn-verlauf-zurueck').addEventListener('click', () => {
  if (verlaufZurueck === 'spiel') { zeigeSeite('spiel'); skaliere(); } else zeigeEinstellungen();
});
$('btn-verlauf-loeschen').addEventListener('click', () => {
  if (confirm('Den ganzen Verlauf wirklich löschen?')) { speichern(SPEICHER_VERLAUF, []); zeigeVerlauf(verlaufZurueck); }
});

zeigeEinstellungen();
