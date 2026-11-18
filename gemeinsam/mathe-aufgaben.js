'use strict';
/* =========================================================
   Frau Bopparts Tafelspiele – Mathe-Aufgaben (gemeinsam)
   Wird von Mathe-Fussball und Mathe-Wanderung benutzt.
   Vorher laden: hilfen.js und spiele/mathe-fussball/mengen.js
   ========================================================= */
const POOL_GROESSE = 100;     // so viele verschiedene Aufgaben kommen in einen Pool

/* =========================================================
   Aufgaben – werden passend zu den Filtern erzeugt
   ========================================================= */
/* Aufgaben sind kurze Texte:
   Kopfrechnen:      "47 + 38", "85 - 27", "3 * 7", "21 / 3"
   Verliebte Zahlen: "VL 2" (? + 2 = 10), "VR 4" (4 + ? = 10), "VS 3" (3 + 7 = ?)
   Verdoppeln:       "D 4"  (Das Doppelte von: 4)
   Halbieren:        "H 10" (Die Hälfte von: 10) */
function rechne(aufgabe) {
  const [a, op, b] = aufgabe.split(' ');
  const x = Number(a), y = Number(b);
  switch (a) {
    case 'M': return Number(b);                     // "M kerzen 13"
    case 'VL': case 'VR': return 10 - Number(op);
    case 'VS': return 10;
    case 'D': return 2 * Number(op);
    case 'H': return Number(op) / 2;
  }
  switch (op) { case '+': return x + y; case '-': return x - y; case '*': return x * y; case '/': return x / y; }
  return NaN;
}
function anzeige(aufgabe) {
  const [a, op, b] = aufgabe.split(' ');
  return `${a} ${{ '+': '+', '-': '−', '*': '×', '/': ':' }[op]} ${b}`;
}
/** Text an der Tafel. Mit loesung: die Lösung steht anstelle des Fragezeichens. */
function aufgabeText(aufgabe, loesung) {
  const [art, z] = aufgabe.split(' ');
  const l = loesung === undefined ? '?' : loesung;
  switch (art) {
    case 'M':  return loesung === undefined ? 'Wie viele sind es?' : `Es sind ${l}.`;
    case 'VL': return `${l} + ${z} = 10`;
    case 'VR': return `${z} + ${l} = 10`;
    case 'VS': return `${z} + ${10 - Number(z)} = ${l}`;
    case 'D':  return loesung === undefined ? `Das Doppelte von: ${z}` : `Das Doppelte von ${z} = ${l}`;
    case 'H':  return loesung === undefined ? `Die Hälfte von: ${z}` : `Die Hälfte von ${z} = ${l}`;
  }
  return `${anzeige(aufgabe)} = ${l}`;
}
/** Alle möglichen Aufgaben der festen Aufgabenarten */
const FESTE_AUFGABEN = {
  verliebt: [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(z => [`VL ${z}`, `VR ${z}`, `VS ${z}`]),   // ergibt immer 10
  doppelt:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(z => `D ${z}`),                          // Ergebnis bis 20
  haelfte:  [2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(z => `H ${z}`),                      // Zahl bis 20
  mengen:   MENGEN_AUFGABEN                                                               // aus mengen.js
};
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
    zueb: E.zueb, stellen: E.stellen, reihen: E.reihen.slice(),
    arten: Object.keys(E.arten).filter(k => E.arten[k])
  };
}
function erzeugeKopfrechnenPool(f) {
  const set = new Set();
  for (let i = 0; set.size < POOL_GROESSE && i < 5000; i++) {
    const a = erzeugeAufgabe(f);
    if (a) set.add(a);
  }
  return [...set];
}
/** Pool aus allen gewählten Aufgabenarten, abwechselnd gemischt (jede Art kommt gleich oft dran) */
/** Mengen-Aufgaben: zuerst wird das Thema gewählt, dann die Anzahl.
    Die Hände kommen bei etwa jeder 5. Aufgabe dran (20 %), die anderen Themen gleich oft.
    Weil es nur 10 Hand-Bilder gibt, darf jedes Hand-Bild bis zu dreimal im Pool sein,
    alle anderen Aufgaben nur einmal. */
const MENGEN_HAND_ANTEIL = 0.2;
const MENGEN_GEWICHT = { finger: MENGEN_HAND_ANTEIL / (1 - MENGEN_HAND_ANTEIL) * (MENGEN_THEMEN.length - 1) };
const MENGEN_WIEDERHOLUNG = { finger: 3 };
function erzeugeMengenPool() {
  const themen = MENGEN_THEMEN.map(t => ({ ...t, g: MENGEN_GEWICHT[t.id] || 1,
    frei: mischen(Array.from({ length: t.max * (MENGEN_WIEDERHOLUNG[t.id] || 1) }, (_, i) => i % t.max + 1)) }));
  const liste = [];
  while (liste.length < POOL_GROESSE) {
    const offen = themen.filter(t => t.frei.length);
    if (!offen.length) break;
    let r = Math.random() * offen.reduce((a, t) => a + t.g, 0);
    const t = offen.find(x => (r -= x.g) < 0) || offen[offen.length - 1];
    liste.push(`M ${t.id} ${t.frei.pop()}`);
  }
  return liste;
}
function erzeugePool(f) {
  const listen = f.arten.map(art => mischen(art === 'kopfrechnen' ? erzeugeKopfrechnenPool(f)
    : art === 'mengen' ? erzeugeMengenPool() : FESTE_AUFGABEN[art] || []))
    .filter(l => l.length);
  const pool = [];
  for (let i = 0; pool.length < POOL_GROESSE && listen.some(l => i < l.length); i++) {
    listen.forEach(l => { if (i < l.length && pool.length < POOL_GROESSE) pool.push(l[i]); });
  }
  return pool;
}
/** Start-Stapel: Bei "Mengen erkennen" kommt zuerst jede Darstellungsform einmal
    der Reihe nach (zufällige Anzahl), danach geht es gemischt weiter.
    Der Stapel wird von hinten abgearbeitet (pop). */
function startStapel(f, pool) {
  const rest = mischen(pool);
  if (!f.arten.includes('mengen')) return rest;
  const vorschau = MENGEN_THEMEN.map(t => `M ${t.id} ${zufall(1, t.max)}`);
  return entzerren(rest.concat(vorschau.reverse()), null);
}
/** Mengen-Thema einer Aufgabe ("M thema n") oder null */
function mengenThema(a) { return a && a.startsWith('M ') ? a.split(' ')[1] : null; }
function zuAehnlich(a, b) {
  return !!a && !!b && MENGEN_AEHNLICH.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}
/** Sortiert den Stapel so um, dass zwei ähnliche Mengen-Bilder (z. B. Würfel und Domino)
    oder zweimal dasselbe Bild nie direkt nacheinander drankommen – auch wenn eine andere Aufgabenart dazwischen liegt.
    Der Stapel wird von hinten abgearbeitet; vorher = die zuletzt gezeigte Aufgabe. */
function entzerren(stapel, vorher) {
  const folge = stapel.slice().reverse();   // in Spielreihenfolge
  // Positionen, an denen ein Mengen-Bild dem vorherigen Mengen-Bild zu ähnlich ist
  const konflikte = () => {
    const k = []; let letztes = mengenThema(vorher), letzteAufgabe = vorher;
    folge.forEach((a, i) => {
      const t = mengenThema(a); if (!t) return;
      if (zuAehnlich(letztes, t) || a === letzteAufgabe) k.push(i);   // ähnlich oder genau gleiches Bild
      letztes = t; letzteAufgabe = a;
    });
    return k;
  };
  let k = konflikte();
  for (let runde = 0; k.length && runde < 50; runde++) {
    const i = k[0];
    let besser = false;
    // mit einer anderen Aufgabe tauschen, sodass es insgesamt weniger Konflikte gibt
    for (let j = 0; j < folge.length && !besser; j++) {
      if (j === i) continue;
      [folge[i], folge[j]] = [folge[j], folge[i]];
      const neu = konflikte();
      if (neu.length < k.length) { k = neu; besser = true; }
      else [folge[i], folge[j]] = [folge[j], folge[i]];
    }
    if (!besser) break;
  }
  return folge.reverse();
}
