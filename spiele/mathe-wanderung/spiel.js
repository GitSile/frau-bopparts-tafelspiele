'use strict';
/* =========================================================
   Mathe-Erlebnisse – Spiellogik
   Aufgaben (Erzeugen, Prüfen): ../../gemeinsam/mathe-aufgaben.js
   Welten und Reihenfolge der Welten: welten.js
   ========================================================= */

const TIERE = [
  { id: 'baer',         name: 'Bär' },
  { id: 'loewe',        name: 'Löwe' },
  { id: 'tiger',        name: 'Tiger' },
  { id: 'fuchs',        name: 'Fuchs' },
  { id: 'wolf',         name: 'Wolf' },
  { id: 'elefant',      name: 'Elefant' },
  { id: 'erdmaennchen', name: 'Erdmännchen' },
  { id: 'adler',        name: 'Adler' },
  { id: 'hai',          name: 'Hai' }
];
const tierVon = id => TIERE.find(t => t.id === id) || TIERE[0];
const ALLE_REIHEN = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const STANDARD = {
  tier: 'baer',
  zahlenraum: '100',
  arten: { verliebt: false, doppelt: false, haelfte: false, mengen: false, kopfrechnen: false },
  ops: { plus: true, minus: true, mal: false, geteilt: false },
  zueb: true, stellen: 'ZE', reihen: ALLE_REIHEN.slice(),
  zeitlimitAn: false, zeitlimitSek: '20',
  zurueck: false, ton: true
};
const SPEICHER_EINST = 'mathewanderung.einstellungen.v1';
const SPERRE_MS = 1500;      // Sperre nach falscher Antwort
const SCHRITT_MS = 1150;     // Tier geht eine Stufe weiter
const JUBEL_MS = 2300;       // Level geschafft
const LOESUNG_MS = 2000;     // Lösung zeigen (Zeitlimit)
const KRAN_MS = 2750;        // Kran-Animation beim Levelwechsel (kurz: der leere Haken ist nur kurz zu sehen)

/* =========================================================
   Töne: echte Töne aus Mathe-Fussball, sonst im Code erzeugt
   ========================================================= */
let audioCtx = null, tonAusgang = null, stumm = false;
const TON_DATEIEN = {
  jubel:   { von: 1.0, dauer: 3.0, laut: 0.45, ausblenden: 1.0 },
  richtig: { von: 0.3, dauer: 1.8, laut: 0.9 },
  falsch:  { von: 0.0, dauer: 0.9, laut: 0.5 },
  tick:    { von: 0.0, dauer: 0.95, laut: 1.0, datei: 'tick.wav' }
};
const tonPuffer = {};
function audio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    tonAusgang = audioCtx.createDynamicsCompressor();
    tonAusgang.threshold.value = -14; tonAusgang.ratio.value = 4;
    tonAusgang.connect(audioCtx.destination);
    Object.keys(TON_DATEIEN).forEach(name => {
      fetch(`../mathe-fussball/toene/${TON_DATEIEN[name].datei || name + '.mp3'}`).then(r => r.arrayBuffer())
        .then(b => new Promise((ok, fehler) => audioCtx.decodeAudioData(b, ok, fehler)))
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
  const t0 = ac.currentTime, src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = p; g.gain.setValueAtTime(t.laut, t0);
  if (t.ausblenden) { g.gain.setValueAtTime(t.laut, t0 + t.dauer - t.ausblenden); g.gain.linearRampToValueAtTime(0.0001, t0 + t.dauer); }
  src.connect(g).connect(tonAusgang); src.start(t0, t.von, t.dauer);
  return true;
}
function piep(freq, dauer, { typ = 'sine', start = 0, laut = 0.2, bis = null } = {}) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + start, o = ac.createOscillator(), g = ac.createGain();
  o.type = typ; o.frequency.setValueAtTime(freq, t0);
  if (bis) o.frequency.exponentialRampToValueAtTime(bis, t0 + dauer);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(laut, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dauer + 0.05);
}
const TON = {
  richtig() { if (!tonAn() || spieleDatei('richtig')) return; piep(880, 0.12, { laut: 0.25 }); piep(1320, 0.18, { start: 0.09, laut: 0.25 }); },
  falsch()  { if (!tonAn() || spieleDatei('falsch')) return; piep(150, 0.35, { typ: 'sawtooth', laut: 0.12, bis: 110 }); },
  tick()    { if (!tonAn() || spieleDatei('tick')) return; piep(1000, 0.04, { typ: 'square', laut: 0.06 }); },
  geschafft() {
    if (!tonAn()) return;
    [523, 659, 784, 1047].forEach((f, i) => piep(f, 0.25, { typ: 'triangle', start: i * 0.12, laut: 0.22 }));
    piep(1047, 0.7, { typ: 'triangle', start: 0.5, laut: 0.22 });
    spieleDatei('jubel');
  },
  /** Kran: Motorbrummen mit Rattern der Kette */
  kran(sek) {
    if (!tonAn()) return;
    const ac = audio(); if (!ac) return;
    const t0 = ac.currentTime, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = 70; lfo.frequency.value = 9; lg.gain.value = 12;
    lfo.connect(lg).connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.3);
    g.gain.setValueAtTime(0.09, t0 + sek - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + sek);
    o.connect(f).connect(g).connect(ac.destination);
    o.start(t0); lfo.start(t0); o.stop(t0 + sek + 0.1); lfo.stop(t0 + sek + 0.1);
  },
  klack() { if (tonAn()) piep(240, 0.09, { typ: 'square', laut: 0.08, bis: 120 }); },
  presse() { if (tonAn()) { piep(90, 0.5, { typ: 'sawtooth', laut: 0.12, bis: 55 }); piep(300, 0.12, { typ: 'square', start: 0.45, laut: 0.06, bis: 150 }); } }
};

/* =========================================================
   Einstellungen
   ========================================================= */
let E = Object.assign(structuredClone(STANDARD), laden(SPEICHER_EINST, {}));
E.arten = Object.assign(structuredClone(STANDARD.arten), E.arten || {});
E.ops = Object.assign(structuredClone(STANDARD.ops), E.ops || {});
if (!Array.isArray(E.reihen)) E.reihen = ALLE_REIHEN.slice();
if (!TIERE.some(t => t.id === E.tier)) E.tier = STANDARD.tier;
const merke = () => speichern(SPEICHER_EINST, E);

function baueTierKarte() {
  const karte = $('karte-tier');
  karte.innerHTML = `
    <div class="team-kopf"><h2>Wer ist dabei?</h2><button class="wuerfel filz" title="Zufälliges Tier" data-wuerfel>🎲</button></div>
    <div class="tier-wahl">${TIERE.map(t => `<button data-tier="${t.id}" class="filz ${t.id === E.tier ? 'aktiv' : ''}" title="${t.name}">
      <img src="${FIGUREN}${t.id}-stehen.png" alt="${t.name}"></button>`).join('')}</div>`;
  karte.querySelector('[data-wuerfel]').addEventListener('click', () => { E.tier = waehle(TIERE.filter(t => t.id !== E.tier)).id; merke(); baueTierKarte(); });
  karte.querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => { E.tier = b.dataset.tier; merke(); baueTierKarte(); }));
}

function zeichneAufgabenKnoepfe() {
  const zr = String(E.zahlenraum);
  document.querySelectorAll('[data-zr]').forEach(b => b.classList.toggle('an', b.dataset.zr === zr));
  if (document.activeElement !== $('e-zahlenraum')) $('e-zahlenraum').value = zr;
  document.querySelector('.eigene').classList.toggle('an', !['10', '20', '100', '1000'].includes(zr) && zr !== '');
  document.querySelectorAll('[data-art]').forEach(b => b.classList.toggle('an', !!E.arten[b.dataset.art]));
  $('kopfrechnen-optionen').classList.toggle('versteckt', !E.arten.kopfrechnen);
  document.querySelectorAll('[data-op]').forEach(b => b.classList.toggle('an', !!E.ops[b.dataset.op]));
  $('abschnitt-plusminus').classList.toggle('aus', !(E.ops.plus || E.ops.minus));
  $('abschnitt-reihen').classList.toggle('aus', !(E.ops.mal || E.ops.geteilt));
  const zu = $('e-zueb');
  zu.classList.toggle('an', E.zueb); zu.classList.toggle('rot', !E.zueb);
  document.querySelectorAll('[data-stellen]').forEach(b => b.classList.toggle('an', b.dataset.stellen === E.stellen));
  document.querySelectorAll('[data-reihe]').forEach(b => b.classList.toggle('an', E.reihen.includes(Number(b.dataset.reihe))));
}

function zeigeEinstellungen() {
  baueTierKarte();
  zeichneAufgabenKnoepfe();
  $('e-zeitlimit-an').checked = E.zeitlimitAn;
  $('e-zeitlimit-sek').value = E.zeitlimitSek;
  $('e-zurueck').checked = E.zurueck;
  $('e-ton').checked = E.ton;
  $('zeile-sekunden').classList.toggle('aus', !E.zeitlimitAn);
  $('fehler').textContent = '';
  zeigeSeite('einstellungen');
}

function leseFormular() {
  E.zahlenraum = $('e-zahlenraum').value.trim();
  E.zeitlimitAn = $('e-zeitlimit-an').checked;
  E.zeitlimitSek = $('e-zeitlimit-sek').value.trim();
  E.zurueck = $('e-zurueck').checked;
  E.ton = $('e-ton').checked;
  $('zeile-sekunden').classList.toggle('aus', !E.zeitlimitAn);
  merke();
}

function pruefeEinstellungen() {
  if (!Object.keys(E.arten).some(k => E.arten[k])) return 'Bitte mindestens eine Aufgabenart einschalten.';
  if (E.arten.kopfrechnen) {
    if (ganzzahlIn(E.zahlenraum, 10, 1000) === null) return 'Der Zahlenraum muss eine Zahl von 10 bis 1000 sein.';
    if (!Object.keys(E.ops).some(k => E.ops[k])) return 'Bitte mindestens eine Rechenart einschalten.';
    if ((E.ops.mal || E.ops.geteilt) && !E.reihen.length) return 'Für Mal und Geteilt bitte mindestens eine Einmaleins-Reihe einschalten.';
  }
  if (E.zeitlimitAn && ganzzahlIn(E.zeitlimitSek, 5, 60) === null) return 'Zeitlimit: bitte 5 bis 60 Sekunden.';
  return null;
}
function aktuelleFilter() {
  return {
    n: Number(E.zahlenraum),
    ops: Object.keys(E.ops).filter(k => E.ops[k]),
    zueb: E.zueb, stellen: E.stellen, reihen: E.reihen.slice(),
    arten: Object.keys(E.arten).filter(k => E.arten[k])
  };
}

/* =========================================================
   Aufgabe an der Tafel
   ========================================================= */
function zeigeAufgabe(loesung) {
  const t = $('aufgabe-text'), box = $('aufgabe-box'), bildEl = $('mengen-bild');
  const [art, thema, zahl] = S.aufgabe.split(' ');
  const menge = art === 'M';
  box.classList.toggle('menge', menge);
  bildEl.classList.toggle('versteckt', !menge);
  if (menge && loesung === undefined) bildEl.innerHTML = mengenSvg(thema, Number(zahl));
  t.textContent = aufgabeText(S.aufgabe, loesung);
  t.classList.toggle('lang', !menge && t.textContent.length > 18);
}

/* =========================================================
   Spiel
   ========================================================= */
let S = null, letzterFrame = 0, letzterTick = -1;
const timer = [];
function spaeter(ms, fn) { timer.push(setTimeout(fn, ms)); }
function timerStopp() { while (timer.length) clearTimeout(timer.pop()); }

function starteSpiel() {
  leseFormular();
  const fehler = pruefeEinstellungen();
  if (fehler) { $('fehler').textContent = fehler; return; }
  timerStopp();
  const filter = aktuelleFilter();
  const pool = erzeugePool(filter);
  if (!pool.length) { $('fehler').textContent = 'Mit diesen Filtern gibt es keine Aufgaben. Bitte die Auswahl ändern.'; return; }
  $('fehler').textContent = '';
  S = {
    filter, pool, stapel: startStapel(filter, pool), aufgabe: null, ergebnis: 0, letzteMenge: null,
    eingabe: '', sperre: 0,
    tier: E.tier,
    level: 1, stufe: 0, weltStand: { beutel: [], letzte: null }, welt: null, weltId: null,
    richtige: 0,
    zeitlimitMs: E.zeitlimitAn ? Number(E.zeitlimitSek) * 1000 : 0,
    wechselMs: 0,   // nur eine Person: nie ein Countdown, die nächste Aufgabe kommt sofort
    aufgabeRestMs: 0, phase: 'spiel', phaseRestMs: 0, weiter: null,
    kran: null, pausiert: false, beendet: false
  };
  // Posen vorladen, damit beim Wechsel nichts flackert
  ['stehen', 'freude', 'traurig', 'jubel', 'sprung'].forEach(p => { new Image().src = `${FIGUREN}${S.tier}-${p}.png`; });
  new Image().src = `${KOEPFE}${S.tier}.png`;

  baueTastatur();
  $('hinten').innerHTML = ''; $('vorne').innerHTML = '';
  ['pause-menue', 'geschafft', 'wechsel-box'].forEach(id => $(id).classList.add('versteckt'));
  $('konfetti').innerHTML = '';
  $('btn-ton').textContent = stumm ? '🔇' : '🔊';
  $('kran').style.visibility = 'hidden';
  zeigeSeite('spiel');
  skaliere();
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  ladeWelt(weltFuerLevel(1, S.weltStand), true);
  setzeAkteur(posVon(0));
  zeichneLevel();
  naechsteAufgabe();
  letzterFrame = performance.now();
  requestAnimationFrame(schleife);
}

/* ---------- Welt aufbauen ---------- */
/** Zeichnet die Ebenen (hinten, vorne) einer Welt. sichtbar = false: noch unsichtbar, für später. */
function baueEbenen(id, sichtbar) {
  const welt = WELTEN[id], neu = {};
  [['hinten', welt.hinten], ['vorne', welt.vorne]].forEach(([ebene, fn]) => {
    const div = document.createElement('div');
    div.className = 'welt-ebene' + (sichtbar ? '' : ' unsichtbar');
    div.innerHTML = fn ? `<svg viewBox="0 0 1600 520" width="1600" height="520">${fn.call(welt)}</svg>` : '';
    // hinten: die oberste Himmelsfarbe füllt den Platz über der Welt (bei höheren Bildschirmen)
    if (ebene === 'hinten') {
      if (welt.bild) {
        // gemaltes Bild (ChatGPT): unten bündig, 1600 breit; bei höheren Bildschirmen sieht man oben mehr Himmel
        div.style.background = `url("${welt.bild}") center bottom -${welt.bildVersatz || 0}px / 1600px auto no-repeat, ${welt.himmelOben || '#9fd3f5'}`;
      } else { const stop = div.querySelector('stop'); if (stop) div.style.background = stop.getAttribute('stop-color'); }
    }
    $(ebene).appendChild(div);
    neu[ebene] = div;
  });
  if (welt.stufe) welt.stufe(0, neu, true);
  return neu;
}
/** Macht eine Welt zur aktuellen. sofort = ohne Überblenden (beim Start).
    ebenen = schon vorbereitete Ebenen (beim Kran), sonst werden sie jetzt gezeichnet. */
function ladeWelt(id, sofort, ebenen) {
  const welt = WELTEN[id];
  S.weltId = id; S.welt = welt;
  const neu = ebenen || baueEbenen(id, sofort);
  S.ebenen = neu;
  // Akteur neu aufbauen
  const a = akteur(welt, S.tier);
  S.akteurMass = a;
  const innen = document.querySelector('#akteur .akteur-innen');
  innen.innerHTML = a.html;
  innen.style.cssText = `width:${a.b}px;height:${a.h}px;left:${-a.b / 2}px;top:${-a.h}px`;
  const ak = $('akteur');
  ak.className = `welt-${id} art-${welt.fahrzeug || welt.art}` + (welt.blickLinks ? ' links' : '') + (welt.joggt ? ' joggt' : '');
  if (welt.joggt) setzePose('sprung');
  return neu;
}
/** alte Ebenen ausblenden und entfernen */
function blendeWeltUm(neu) {
  // Behalten: die neue Welt, die aktuelle Welt und eine schon vorbereitete nächste Welt
  const bleibt = (div, ebene) => div === neu[ebene] || (S && S.ebenen && div === S.ebenen[ebene]) || (S && S.naechste && div === S.naechste.ebenen[ebene]);
  ['hinten', 'vorne'].forEach(ebene => {
    [...$(ebene).children].forEach(div => {
      if (div === neu[ebene]) div.classList.remove('unsichtbar');
      else if (!bleibt(div, ebene)) { div.classList.add('unsichtbar'); setTimeout(() => { if (!bleibt(div, ebene)) div.remove(); }, 800); }
    });
  });
}

/* ---------- Akteur bewegen ---------- */
function posVon(stufe) { const [x, y, r = 0, s = 1] = S.welt.wege[stufe]; return { x, y, r, s }; }
function transformVon(p) { return `translate(${r1(p.x)}px, ${r1(p.y)}px) rotate(${r1(p.r)}deg) scale(${p.s})`; }
function setzeAkteur(p) { S.akteurPos = p; $('akteur').style.transform = transformVon(p); }
/** Bewegt das Tier zur Stufe. Mit Bogen (Sprung) oder Looping, je nach Welt. */
function bewegeZu(stufe, ms) {
  const von = S.akteurPos, nach = posVon(stufe), el = $('akteur');
  if (von.x === nach.x && von.y === nach.y && von.r === nach.r) { setzeAkteur(nach); return; }
  const bogen = (S.welt.bogen && S.welt.bogen[stufe]) || 0;
  const looping = S.welt.looping && stufe > (S.letzteStufe || 0);
  const N = 30, frames = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // sanft an- und abbremsen
    const p = { x: von.x + (nach.x - von.x) * e, y: von.y + (nach.y - von.y) * e, r: von.r + (nach.r - von.r) * e, s: von.s + (nach.s - von.s) * e };
    if (bogen) p.y -= bogen * 4 * e * (1 - e);
    if (looping) {
      // Kunstflug: ein Looping in der Mitte des Wegs
      const lt = Math.min(1, Math.max(0, (t - 0.2) / 0.6)), w = lt * 2 * Math.PI, R = 70;
      p.x += R * Math.sin(w); p.y -= R * (1 - Math.cos(w)); p.r -= lt * 360;
    }
    frames.push({ transform: transformVon(p) });
  }
  S.letzteStufe = stufe;
  if (S.welt.art === 'laufen') {
    el.classList.toggle('links', nach.x < von.x);
    clearTimeout(el._richtung); el._richtung = setTimeout(() => el.classList.toggle('links', !!S.welt.blickLinks), ms);
  }
  el.getAnimations().forEach(a => a.cancel());
  el.animate(frames, { duration: ms, easing: 'linear' });
  setzeAkteur(nach);
}

/* ---------- Posen ---------- */
function setzePose(pose, dauerMs) {
  if (!S) return;
  const echtePose = S.welt && S.welt.joggt && pose === 'stehen' ? 'sprung' : pose;
  document.querySelectorAll('#akteur .tier-figur').forEach(img => { img.src = `${FIGUREN}${S.tier}-${echtePose}.png`; });
  const ak = $('akteur');
  ak.classList.remove('freude', 'traurig', 'jubel', 'laeuft');
  if (pose !== 'stehen') { void ak.offsetWidth; ak.classList.add(pose === 'sprung' ? 'laeuft' : pose); }
  clearTimeout(ak._poseTimer);
  if (dauerMs) ak._poseTimer = setTimeout(() => { if (S) setzePose('stehen'); }, dauerMs);
}

/* ---------- Ablauf ---------- */
function setzePhase(name, ms, weiter) { S.phase = name; S.phaseRestMs = ms; S.weiter = weiter; }

function naechsteAufgabe() {
  if (S.stapel.length === 0) {
    S.stapel = mischen(S.pool);
    if (S.aufgabe && S.stapel.length > 1 && S.stapel[S.stapel.length - 1] === S.aufgabe) S.stapel.unshift(S.stapel.pop());
    S.stapel = entzerren(S.stapel, S.letzteMenge);
  }
  S.aufgabe = naechsteAusStapel(S.stapel, S.aufgabe, S.pool);   // nie zweimal dasselbe Ergebnis nacheinander
  if (mengenThema(S.aufgabe)) S.letzteMenge = S.aufgabe;
  S.ergebnis = rechne(S.aufgabe);
  S.eingabe = ''; S.sperre = 0;
  S.aufgabeRestMs = S.zeitlimitMs;
  setzePhase('spiel', 0, null);
  letzterTick = -1;
  zeigeAufgabe();
  $('aufgabe-text').classList.remove('loesung');
  $('zeitbalken').classList.toggle('versteckt', !S.zeitlimitMs);
  $('wechsel-box').classList.add('versteckt');
  $('aufgabe-box').classList.remove('versteckt');
  zeichneEingabe();
}

function zeichneWechselKreis(anteil) {
  const a = Math.max(0, Math.min(1, anteil)), weg = 1 - a;
  $('wechsel-rest').style.strokeDashoffset = -100 * weg;
  const winkel = weg * 360, rad = winkel * Math.PI / 180;
  const x = 50 + 42 * Math.sin(rad), y = 50 - 42 * Math.cos(rad);
  const spiegel = winkel > 90 && winkel < 270 ? -1 : 1;
  $('wechsel-vogel').setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${winkel.toFixed(1)}) scale(1 ${spiegel})`);
  const sek = Math.max(1, Math.ceil(a * S.wechselMs / 1000)), el = $('wechsel-sek');
  if (el.textContent !== String(sek)) { el.textContent = sek; el.classList.remove('hops'); void el.getBoundingClientRect(); el.classList.add('hops'); }
}
function wechsel(danach) {
  if (!S.wechselMs) { danach(); return; }
  S.eingabe = ''; zeichneEingabe();
  $('aufgabe-box').classList.add('versteckt');
  $('wechsel-box').classList.remove('versteckt');
  zeichneWechselKreis(1);
  letzterTick = -1;
  setzePhase('wechsel', S.wechselMs, danach);
}

function taste(wert) {
  if (!S || S.pausiert || S.phase !== 'spiel' || S.sperre > 0) return;
  audio();
  if (wert === 'loeschen') S.eingabe = S.eingabe.slice(0, -1);
  else if (wert === 'ok') { if (S.eingabe !== '') { if (Number(S.eingabe) === S.ergebnis) richtig(); else falsch(); } return; }
  else if (S.eingabe.length < 4) S.eingabe = (S.eingabe === '0' ? '' : S.eingabe) + wert;
  zeichneEingabe();
}

function richtig() {
  const letzte = S.stufe + 1 >= STUFEN;
  // Der Jubelton kommt genau dann, wenn sich das Tier zu freuen beginnt (beim Hebel erst nach dem Ziehen)
  if (!letzte) TON.richtig();
  else if (S.welt.stufe && hebelLage(S.welt, S.tier)) { TON.richtig(); spaeter(HEBEL_ZEIT.freuen, () => TON.geschafft()); }
  else TON.geschafft();
  blinke($('panel'), 'richtig');
  zeigeAufgabe(S.ergebnis);
  $('aufgabe-text').classList.add('loesung');
  S.eingabe = ''; zeichneEingabe();
  S.richtige++;
  geheZuStufe(S.stufe + 1);
  setzePhase('schritt', SCHRITT_MS + 150, () => {
    if (S.stufe >= STUFEN) levelGeschafft();
    else wechsel(naechsteAufgabe);
  });
}

/** Tier bzw. Welt eine Stufe weiter (oder zurück) */
function geheZuStufe(n) {
  const vor = n > S.stufe;
  S.stufe = n;
  zeichneLevel();
  const welt = S.welt;
  if (welt.stufe) {
    if (vor && hebelLage(welt, S.tier)) { zieheHebel(n); return; }
    welt.stufe(n, S.ebenen, false);
    if (S.weltId === 'presse') TON.presse();
    setzePose(vor ? 'freude' : 'traurig', 1100);
  } else {
    bewegeZu(n, SCHRITT_MS);
    if (n >= STUFEN) setzePose('jubel');
    else if (welt.art === 'laufen' && vor) setzePose('sprung', SCHRITT_MS);
    else setzePose(vor ? 'freude' : 'traurig', SCHRITT_MS);
  }
}

/* Hebel umlegen (Presse, Spielautomat): zuerst greifen, dann herunterziehen – erst danach freut sich das Tier */
const HEBEL_ZEIT = { ziehen: 260, loslassen: 700, freuen: 880 };
function zieheHebel(n) {
  const feld = $('feld'), welt = S.welt;
  feld.classList.remove('zieht-b'); feld.classList.add('zieht-a');
  setzePose('stehen');
  spaeter(HEBEL_ZEIT.ziehen, () => {
    feld.classList.remove('zieht-a'); feld.classList.add('zieht-b');
    TON.klack();
    welt.stufe(n, S.ebenen, false);
    if (S.weltId === 'presse') TON.presse();
  });
  spaeter(HEBEL_ZEIT.loslassen, () => { feld.classList.remove('zieht-b'); feld.classList.add('zieht-a'); });
  spaeter(HEBEL_ZEIT.freuen, () => {
    feld.classList.remove('zieht-a');
    if (n >= STUFEN) setzePose('jubel'); else setzePose('freude', 1100);
  });
}

function falsch() {
  TON.falsch();
  S.sperre = SPERRE_MS;
  S.eingabe = '';
  blinke($('panel'), 'falsch');
  if (E.zurueck && S.stufe > 0) geheZuStufe(S.stufe - 1);
  else setzePose('traurig', 1200);
  zeichneEingabe();
}

function zeigeLoesung(ms = LOESUNG_MS) {
  S.eingabe = ''; zeichneEingabe();
  zeigeAufgabe(S.ergebnis);
  $('aufgabe-text').classList.add('loesung');
  setzePhase('loesung', ms, () => wechsel(naechsteAufgabe));
}
/** Knopf "Ich weiss es nicht": Lösung zeigen, kein Schritt, dann die nächste Aufgabe */
const WEISS_NICHT_MS = 2600;
function weissNicht() {
  if (!S || S.pausiert || S.phase !== 'spiel') return;
  zeigeLoesung(WEISS_NICHT_MS);
}

/* ---------- Level geschafft und Kran ---------- */
function levelGeschafft() {
  setzePose('jubel');
  const g = $('geschafft');
  g.innerHTML = `<div class="geschafft-text">Level ${S.level} geschafft!</div>`;
  g.classList.remove('versteckt');
  konfetti(['#e53935', '#fdd835', '#43a047', '#1e88e5', '#ffffff'], 90);
  feiern(S.welt.feier);
  $('aufgabe-box').classList.add('versteckt');
  // Die nächste Welt schon jetzt (unsichtbar) zeichnen, damit der Kran später nicht ruckelt
  const id = weltFuerLevel(S.level + 1, S.weltStand);
  S.naechste = { id, ebenen: baueEbenen(id, false) };
  new Image().src = `${KOEPFE}${S.tier}.png`;
  setzePhase('jubel', JUBEL_MS, starteKran);
}

/* Der Kran ist ein Zeitplan: zu jeder Zeit t (ms) wird ausgerechnet,
   wo Ausleger, Katze, Haken und Tier sind. So bleibt alles synchron und flüssig. */
function starteKran() {
  $('geschafft').classList.add('versteckt');
  const alt = S.akteurPos, altMass = S.akteurMass;
  S.kran = { t: 0, alt, altMass, gewechselt: false, neu: null, neuMass: null, klack: [false, false] };
  $('kran').style.visibility = 'visible';
  $('feld').classList.add('kran-aktiv');
  setzePose('freude');
  TON.kran(KRAN_MS / 1000 - 0.3);
  setzePhase('kran', 0, null);
  zeichneKran(0);
}
const glatt = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const HAKEN_OBEN = 70;        // Haken ganz oben (Kette kurz)
const HAKEN_DX = 15;          // tiefster Punkt des Hakens liegt so weit links der Kette
/* Zeitplan des Krans (ms) */
const KZ = {
  reinBis: 450,                    // Ausleger fährt herein
  runter: [120, 620],              // Haken senkt sich zum Tier (gleichzeitig mit dem Hereinfahren)
  greifen: 620,                    // Haken greift hinten am Rücken
  hoch: [700, 1180],               // Tier wird hochgehoben
  wechsel: 1180,                   // neue Welt
  fahren: [1180, 1680],            // Katze fährt zum neuen Startplatz
  ab: [1600, 2080],                // Tier wird abgesenkt
  los: 2100,                       // Haken lässt los
  hochLeer: [2120, 2420],          // leerer Haken fährt schnell hoch
  raus: [2300, 2750]               // Ausleger fährt weg
};
function zeichneKran(t) {
  const K2 = S.kran;
  // Tier blendet oben kurz aus und wieder ein, während die Welt wechselt
  $('akteur').style.opacity = r1(1 - glatt(KZ.wechsel - 130, KZ.wechsel, t) + glatt(KZ.wechsel, KZ.wechsel + 180, t));
  if (!K2.gewechselt && t >= KZ.wechsel) {
    K2.gewechselt = true;
    S.level++;
    S.stufe = 0; S.letzteStufe = 0;
    const ebenen = ladeWelt(S.naechste.id, false, S.naechste.ebenen);
    S.naechste = null;
    K2.neu = posVon(0); K2.neuMass = S.akteurMass;
    requestAnimationFrame(() => blendeWeltUm(ebenen));
    zeichneLevel();
    setzePose('freude');
  }
  const A = K2.gewechselt ? K2.neu : K2.alt, M = K2.gewechselt ? K2.neuMass : K2.altMass;
  const hakenAmTier = (p, m) => p.y - m.haken * p.s - 46;     // Haken-Höhe, wenn er hinten am Rücken greift
  const rein = glatt(0, KZ.reinBis, t), raus = glatt(KZ.raus[0], KZ.raus[1], t);
  const auslegerX = (1 - rein) * 1700 + raus * 1700;
  const katzeX = K2.alt.x + HAKEN_DX + (K2.neu ? (K2.neu.x - K2.alt.x) * glatt(KZ.fahren[0], KZ.fahren[1], t) : 0);
  const oben = HAKEN_OBEN - DY;
  const tief1 = hakenAmTier(K2.alt, K2.altMass);
  let hakenY;
  if (t < KZ.hoch[0]) hakenY = oben + (tief1 - oben) * glatt(KZ.runter[0], KZ.runter[1], t);
  else if (t < KZ.wechsel) hakenY = tief1 + (oben - tief1) * glatt(KZ.hoch[0], KZ.hoch[1], t);
  else {
    const tief2 = hakenAmTier(K2.neu, K2.neuMass);
    hakenY = t < KZ.hochLeer[0] ? oben + (tief2 - oben) * glatt(KZ.ab[0], KZ.ab[1], t)
      : tief2 + (oben - tief2) * glatt(KZ.hochLeer[0], KZ.hochLeer[1], t);
  }
  const haengt = t >= KZ.greifen && t < KZ.los;
  if (haengt) {
    const p = Object.assign({}, A);
    p.x = katzeX - HAKEN_DX;
    p.y = hakenY + 46 + M.haken * p.s;
    p.r = (A.r || 0) + Math.sin(t / 200) * 4 * glatt(KZ.hoch[0], KZ.hoch[0] + 300, t) * (1 - glatt(KZ.ab[1] - 250, KZ.ab[1], t));
    setzeAkteur(p);
  } else if (t >= KZ.los && !K2.abgesetzt) { K2.abgesetzt = true; setzeAkteur(posVon(0)); setzePose('stehen'); }
  if (t >= KZ.greifen && !K2.klack[0]) { K2.klack[0] = true; TON.klack(); }
  if (t >= KZ.los && !K2.klack[1]) { K2.klack[1] = true; TON.klack(); }
  $('kran-ausleger').setAttribute('transform', `translate(${r1(katzeX - 300 + auslegerX)} ${-DY})`);
  $('kran-katze').setAttribute('transform', `translate(${r1(katzeX + auslegerX)} ${-DY})`);
  $('kran-kette-band').setAttribute('height', Math.max(0, r1(hakenY + DY - 50)));
  $('kran-haken').setAttribute('transform', `translate(0 ${r1(hakenY + DY)})`);
}
function beendeKran() {
  $('kran').style.visibility = 'hidden';
  $('feld').classList.remove('kran-aktiv');
  S.kran = null;
  setzeAkteur(posVon(0));
  setzePose('stehen');
  wechsel(naechsteAufgabe);
}

/* ---------- Hauptschleife ---------- */
function schleife(jetzt) {
  if (!S || S.beendet) return;
  const dt = Math.min(100, jetzt - letzterFrame);
  letzterFrame = jetzt;
  if (!S.pausiert) {
    if (S.sperre > 0) S.sperre = Math.max(0, S.sperre - dt);
    if (S.phase === 'spiel') {
      if (S.zeitlimitMs) {
        S.aufgabeRestMs -= dt;
        const sek = Math.ceil(S.aufgabeRestMs / 1000);
        if (sek <= 5 && sek > 0 && sek !== letzterTick) { letzterTick = sek; TON.tick(); }
        if (S.aufgabeRestMs <= 0) zeigeLoesung();
      }
    } else if (S.phase === 'kran') {
      S.kran.t += dt;
      zeichneKran(Math.min(S.kran.t, KRAN_MS));
      if (S.kran.t >= KRAN_MS) beendeKran();
    } else {
      S.phaseRestMs -= dt;
      if (S.phase === 'wechsel') {
        const sek = Math.ceil(S.phaseRestMs / 1000);
        zeichneWechselKreis(S.phaseRestMs / S.wechselMs);
        if (sek <= 3 && sek > 0 && sek !== letzterTick) { letzterTick = sek; TON.tick(); }
      }
      if (S.phaseRestMs <= 0 && S.weiter) { const w = S.weiter; S.weiter = null; w(); }
    }
  }
  zeichneLaufend();
  requestAnimationFrame(schleife);
}

/* ---------- Zeichnen ---------- */
function baueTastatur() {
  const p = $('panel');
  p.innerHTML = `
    <div class="eingabe filz" aria-live="polite"></div>
    <div class="tastatur">
      ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(z => `<button class="filz" data-taste="${z}">${z}</button>`).join('')}
      <button data-taste="loeschen" class="loeschen filz" aria-label="Löschen">⌫</button>
      <button class="filz" data-taste="0">0</button>
      <button data-taste="ok" class="ok filz">OK ✓</button>
    </div>
    <div class="sperre"><div></div></div>`;
  p.querySelectorAll('[data-taste]').forEach(b => b.addEventListener('pointerdown', ev => { ev.preventDefault(); taste(b.dataset.taste); }));
}
function zeichneEingabe() { const e = document.querySelector('#panel .eingabe'); if (e) e.textContent = S.eingabe; }
function zeichneLevel() {
  $('level-nummer').textContent = `Level ${S.level}`;
  $('welt-name').textContent = S.welt ? S.welt.name : '';
  $('stufen-punkte').innerHTML = Array.from({ length: STUFEN }, (_, i) => `<span class="${i < S.stufe ? 'voll' : ''}"></span>`).join('');
}
function zeichneLaufend() {
  if (S.zeitlimitMs) {
    const anteil = S.phase === 'spiel' ? Math.max(0, S.aufgabeRestMs / S.zeitlimitMs) : 0;
    $('zeitbalken-fuellung').style.width = (anteil * 100) + '%';
    $('zeitbalken').classList.toggle('knapp', S.phase === 'spiel' && S.aufgabeRestMs <= 5000);
  }
  const wn = $('btn-weiss-nicht');
  wn.classList.toggle('versteckt', $('aufgabe-box').classList.contains('versteckt'));
  wn.classList.toggle('aus', S.phase !== 'spiel' || S.pausiert);
  const p = $('panel');
  p.classList.toggle('gesperrt', S.sperre > 0);
  p.querySelector('.sperre div').style.width = (S.sperre / SPERRE_MS * 100) + '%';
}
function blinke(el, klasse) { el.classList.remove(klasse); void el.offsetWidth; el.classList.add(klasse); setTimeout(() => el.classList.remove(klasse), 650); }
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
/* Kleine Zusatz-Effekte zum Level-Ende (je nach Welt) */
function feiern(art) {
  const c = $('konfetti'), hoehe = $('feld').clientHeight;
  const teil = (cls, stil, ms, inhalt = '') => {
    const d = document.createElement('div'); d.className = 'effekt ' + cls; d.style.cssText = stil; d.innerHTML = inhalt;
    c.appendChild(d); setTimeout(() => d.remove(), ms);
  };
  const zufallX = () => 200 + Math.random() * 1200;
  if (art === 'feuerwerk' || art === 'funken') {
    const farben = art === 'funken' ? ['#ff6d00', '#ffab00', '#ffd54f'] : ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#ab47bc', '#fff'];
    for (let k = 0; k < (art === 'funken' ? 3 : 5); k++) {
      const x = zufallX(), y = 60 + Math.random() * Math.max(80, hoehe - 300), verz = k * 0.35;
      for (let i = 0; i < 18; i++) {
        const w = i / 18 * Math.PI * 2, d = 90 + Math.random() * 50;
        teil('funke', `left:${x}px;top:${y}px;background:${waehle(farben)};--dx:${Math.cos(w) * d}px;--dy:${Math.sin(w) * d}px;animation-delay:${verz}s`, 2600);
      }
    }
  } else if (art === 'muenzen') {
    // aus dem Ausgabeschacht unten am Automaten (Bild: x 165, y 335)
    const sx = AUTOMAT.x + 165 * AUTOMAT.s, sy = AUTOMAT.y + 335 * AUTOMAT.s + DY;
    for (let i = 0; i < 34; i++) {
      const dx = (Math.random() - 0.35) * 420, hoch = 120 + Math.random() * 200;
      teil('muenze-fliegt', `left:${r1(sx)}px;top:${r1(sy)}px;--dx:${r1(dx)}px;--hoch:${r1(-hoch)}px;--fall:${r1(hoehe - sy + 40)}px;animation-delay:${(i * 0.045).toFixed(2)}s`, 3200, `<img src="${TEILE}muenze.png" alt="">`);
    }
  } else if (art === 'blasen') {
    for (let i = 0; i < 26; i++) teil('blase-steigt', `left:${zufallX()}px;top:${hoehe - 20}px;width:${14 + Math.random() * 26}px;height:${14 + Math.random() * 26}px;animation-delay:${Math.random() * 1.2}s`, 3600);
  } else if (art === 'schnee') {
    for (let i = 0; i < 40; i++) teil('flocke-faellt', `left:${Math.random() * 1600}px;animation-delay:${Math.random() * 1.2}s;font-size:${18 + Math.random() * 20}px`, 3800, '❄');
  } else if (art === 'ballone') {
    const farben = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#ab47bc', '#ff7043'];
    for (let i = 0; i < 14; i++) teil('ballon-steigt', `left:${zufallX()}px;top:${hoehe}px;--farbe:${waehle(farben)};animation-delay:${Math.random() * 1}s`, 4200);
  } else if (art === 'wasser') {
    for (let i = 0; i < 30; i++) {
      const w = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, d = 120 + Math.random() * 140;
      teil('tropfen', `left:${S.akteurPos.x}px;top:${S.akteurPos.y - 40 + DY}px;--dx:${Math.cos(w) * d}px;--dy:${Math.sin(w) * d}px;animation-delay:${Math.random() * 0.4}s`, 2400);
    }
  } else if (art === 'sterne') {
    for (let i = 0; i < 22; i++) teil('stern-glitzert', `left:${zufallX()}px;top:${40 + Math.random() * (hoehe - 160)}px;animation-delay:${Math.random() * 1.4}s;font-size:${22 + Math.random() * 26}px`, 3400, '★');
  }
}

function pause(an) {
  if (!S || S.beendet) return;
  S.pausiert = an;
  $('pause-stand').textContent = `Level ${S.level} · ${S.richtige} richtige Antworten`;
  $('pause-menue').classList.toggle('versteckt', !an);
  document.getAnimations().forEach(a => { if (a.effect && a.effect.target === $('akteur')) an ? a.pause() : a.play(); });
}

/* =========================================================
   Seiten, Skalierung, Ereignisse
   ========================================================= */
function zeigeSeite(id) { ['einstellungen', 'spiel'].forEach(s => $(s).classList.toggle('versteckt', s !== id)); }
/* Die Bühne ist 1600 breit. Ist der Bildschirm höher als 16:9, wird sie höher (bis 1400),
   damit kein leerer Rand bleibt: die Welt bekommt oben mehr Himmel. */
let DY = 0;   // so viel Platz liegt über der Welt (1600 × 520)
function skaliere() {
  const w = window.innerWidth, h = window.innerHeight;
  const H = Math.round(Math.min(1400, Math.max(900, 1600 * h / w)));
  const b = $('buehne');
  b.style.setProperty('--h', H + 'px');
  DY = H - 900;
  $('kran').setAttribute('viewBox', `0 ${-DY} 1600 ${520 + DY}`);
  const s = Math.min(w / 1600, h / H);
  b.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', skaliere);
function abbrechenUnd(weiter) { timerStopp(); if (S) S.beendet = true; S = null; weiter(); }

// Einstellungen
$('reihen').innerHTML = ALLE_REIHEN.map(r => `<button class="wahl filz" data-reihe="${r}">${r}er</button>`).join('');
document.querySelectorAll('[data-zr]').forEach(b => b.addEventListener('click', () => { E.zahlenraum = b.dataset.zr; $('e-zahlenraum').value = b.dataset.zr; merke(); zeichneAufgabenKnoepfe(); }));
$('e-zahlenraum').addEventListener('input', ev => { ev.target.value = ev.target.value.replace(/\D/g, ''); E.zahlenraum = ev.target.value; merke(); zeichneAufgabenKnoepfe(); });
document.querySelectorAll('[data-art]').forEach(b => b.addEventListener('click', () => { E.arten[b.dataset.art] = !E.arten[b.dataset.art]; merke(); zeichneAufgabenKnoepfe(); }));
document.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => { E.ops[b.dataset.op] = !E.ops[b.dataset.op]; merke(); zeichneAufgabenKnoepfe(); }));
$('e-zueb').addEventListener('click', () => { E.zueb = !E.zueb; merke(); zeichneAufgabenKnoepfe(); });
document.querySelectorAll('[data-stellen]').forEach(b => b.addEventListener('click', () => { E.stellen = b.dataset.stellen; merke(); zeichneAufgabenKnoepfe(); }));
document.querySelectorAll('[data-reihe]').forEach(b => b.addEventListener('click', () => {
  const r = Number(b.dataset.reihe);
  E.reihen = E.reihen.includes(r) ? E.reihen.filter(x => x !== r) : [...E.reihen, r].sort((a, c) => a - c);
  merke(); zeichneAufgabenKnoepfe();
}));
['e-zeitlimit-sek'].forEach(id => $(id).addEventListener('input', ev => { ev.target.value = ev.target.value.replace(/\D/g, ''); leseFormular(); }));
['e-zeitlimit-an', 'e-zurueck', 'e-ton'].forEach(id => $(id).addEventListener('change', leseFormular));
$('btn-start').addEventListener('click', starteSpiel);
$('btn-weiss-nicht').addEventListener('click', weissNicht);
/* Test-Abkürzung: Antippen der Level-Anzeige springt ans Ende des Levels.
   Das Tier steht sofort auf Stufe 7, macht den letzten Schritt, dann folgen "Level geschafft" und der Kran. */
function testLevelEnde() {
  if (!S || S.pausiert || !['spiel', 'loesung', 'wechsel'].includes(S.phase)) return;
  $('wechsel-box').classList.add('versteckt');
  $('aufgabe-box').classList.remove('versteckt');
  S.eingabe = ''; zeichneEingabe();
  S.stufe = STUFEN - 1; S.letzteStufe = STUFEN - 1;
  if (S.welt.stufe) S.welt.stufe(STUFEN - 1, S.ebenen, true);
  else { $('akteur').getAnimations().forEach(a => a.cancel()); setzeAkteur(posVon(STUFEN - 1)); }
  geheZuStufe(STUFEN);
  setzePhase('schritt', SCHRITT_MS + 150, levelGeschafft);
}
$('level-anzeige').addEventListener('click', testLevelEnde);

// Spiel
$('btn-pause').addEventListener('click', () => pause(true));
$('wechsel-box').addEventListener('pointerdown', () => { if (S && !S.pausiert && S.phase === 'wechsel') { S.phaseRestMs = 0; zeichneWechselKreis(0); } });
// Doppeltippen auf die Aufgabe: überspringen
let letzterTipp = 0;
$('aufgabe-box').addEventListener('pointerdown', () => {
  const jetzt = performance.now(), doppelt = jetzt - letzterTipp < 400;
  letzterTipp = doppelt ? 0 : jetzt;
  if (doppelt && S && !S.pausiert && S.phase === 'spiel') naechsteAufgabe();
});
// Ziffern auch über die Tastatur (praktisch am Laptop)
document.addEventListener('keydown', ev => {
  if (!S || $('spiel').classList.contains('versteckt')) return;
  if (/^[0-9]$/.test(ev.key)) taste(ev.key);
  else if (ev.key === 'Backspace') taste('loeschen');
  else if (ev.key === 'Enter') taste('ok');
});
$('btn-weiter').addEventListener('click', () => pause(false));
$('btn-neustart').addEventListener('click', () => abbrechenUnd(starteSpiel));
$('btn-zu-einst').addEventListener('click', () => abbrechenUnd(zeigeEinstellungen));
$('btn-ton').addEventListener('click', () => { stumm = !stumm; $('btn-ton').textContent = stumm ? '🔇' : '🔊'; });
const vollbildUmschalten = () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
};
$('btn-vollbild').addEventListener('click', vollbildUmschalten);
$('btn-vollbild-einst').addEventListener('click', vollbildUmschalten);

zeigeEinstellungen();
