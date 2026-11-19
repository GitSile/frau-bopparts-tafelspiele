'use strict';
/* =========================================================
   Einkaufen – Produkte und Preise
   Alle Beträge werden in Rappen als ganze Zahlen gerechnet (1 Fr. = 100 Rp.),
   damit es keine Rundungsfehler gibt.
   ========================================================= */

/* 30 Produkte. kalt: true = steht im Kühlschrank, sonst im Regal.
   Bilder: bilder/produkte/<id>.png (mit ChatGPT erstellt, freigestellt) */
const PRODUKTE = [
  { id: 'apfel',         name: 'Apfel' },
  { id: 'banane',        name: 'Bananen' },
  { id: 'brot',          name: 'Brot' },
  { id: 'wurst',         name: 'Würste',          kalt: true },
  { id: 'milch',         name: 'Milch',           kalt: true },
  { id: 'dose',          name: 'Getränkedose',    kalt: true },
  { id: 'cola',          name: 'Cola-Flasche' },
  { id: 'kaese',         name: 'Käse',            kalt: true },
  { id: 'zahnbuerste',   name: 'Zahnbürste' },
  { id: 'glace',         name: 'Glace',           kalt: true },
  { id: 'broccoli',      name: 'Broccoli' },
  { id: 'wc-papier',     name: 'WC-Papier' },
  { id: 'erdbeeren',     name: 'Erdbeeren' },
  { id: 'orange',        name: 'Orange' },
  { id: 'karotte',       name: 'Karotten' },
  { id: 'gurke',         name: 'Gurke' },
  { id: 'tomate',        name: 'Tomate' },
  { id: 'schokolade',    name: 'Schokolade' },
  { id: 'gummibaerchen', name: 'Gummibärchen' },
  { id: 'chips',         name: 'Chips' },
  { id: 'eier',          name: 'Eier' },
  { id: 'butter',        name: 'Butter',          kalt: true },
  { id: 'joghurt',       name: 'Joghurt',         kalt: true },
  { id: 'cornflakes',    name: 'Cornflakes' },
  { id: 'zahnpasta',     name: 'Zahnpasta' },
  { id: 'shampoo',       name: 'Shampoo' },
  { id: 'waschmittel',   name: 'Waschmittel' },
  { id: 'ketchup',       name: 'Ketchup' },
  { id: 'honig',         name: 'Honig' },
  { id: 'pizza',         name: 'Pizza',           kalt: true }
];

/* Schwierigkeit: Schritt der Preise in Rappen und kleinster Preis */
const STUFEN = {
  franken: { name: 'Beginner',        schritt: 100, minPreis: 100, rappen: false },  // 13.00 Fr.
  zehn:    { name: 'Schwierig',       schritt: 10,  minPreis: 50,  rappen: true },   // 13.20 Fr.
  fuenf:   { name: 'Sehr schwierig',  schritt: 5,   minPreis: 50,  rappen: true }    // 13.25 Fr.
};

/** Rappen als Text: 1325 → "13.25" */
function betragText(rp) {
  return `${Math.floor(rp / 100)}.${String(rp % 100).padStart(2, '0')}`;
}

/** Eingabe des Kindes ("13", "13.2", "13.25", "13.") in Rappen umwandeln, sonst null */
function eingabeInRappen(text) {
  const m = /^(\d{1,4})(?:\.(\d{0,2}))?$/.exec(String(text));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'));
}

/** Zerlegt `einheiten` zufällig in `n` Teile ≥ 0 (alle Aufteilungen gleich wahrscheinlich) */
function zufallsAufteilung(einheiten, n) {
  const schnitte = [];
  for (let k = 0; k < n - 1; k++) schnitte.push(zufall(0, einheiten));
  schnitte.sort((a, b) => a - b);
  const teile = [];
  let vorher = 0;
  schnitte.forEach(s => { teile.push(s - vorher); vorher = s; });
  teile.push(einheiten - vorher);
  return teile;
}

/** Kleinste und grösste Anzahl Produkte, die zum Zahlenraum passt */
function anzahlBereich(maxFranken, stufe, maxProdukte) {
  const st = STUFEN[stufe];
  const nMax = Math.max(1, Math.min(maxProdukte, Math.floor(maxFranken * 100 / st.minPreis), PRODUKTE.length));
  return { min: Math.min(2, nMax), max: nMax };
}

/**
 * Preise für n Produkte erzeugen.
 * maxFranken: höchstes Total in Franken, stufe: 'franken'|'zehn'|'fuenf'
 * Rückgabe: { preise: [Rp, …], total: Rp } oder null, wenn es nicht geht
 */
function erzeugePreise(maxFranken, stufe, n, vorherTotal) {
  const st = STUFEN[stufe];
  const maxRp = maxFranken * 100;
  if (n < 1 || n * st.minPreis > maxRp) return null;
  for (let versuch = 0; versuch < 300; versuch++) {
    // Total: zufälliges Vielfaches des Schritts, nicht zu klein (mind. ~35 % des Zahlenraums)
    const unten = Math.max(n * st.minPreis, Math.ceil(maxRp * 0.35 / st.schritt) * st.schritt);
    const oben = Math.floor(maxRp / st.schritt) * st.schritt;
    const u = Math.min(unten, oben);
    const total = u + zufall(0, (oben - u) / st.schritt) * st.schritt;
    // Jedes Produkt bekommt den kleinsten Preis, der Rest wird in Schritten zufällig verteilt
    const rest = (total - n * st.minPreis) / st.schritt;
    const preise = zufallsAufteilung(rest, n).map(t => st.minPreis + t * st.schritt);
    // Rappen sollen auch wirklich vorkommen
    if (versuch < 250 && stufe === 'zehn' && !preise.some(p => p % 100 !== 0)) continue;
    if (versuch < 250 && stufe === 'fuenf' && !preise.some(p => p % 10 === 5)) continue;
    // nicht genau dasselbe Total wie bei der letzten Aufgabe
    if (versuch < 200 && total === vorherTotal) continue;
    return { preise, total };
  }
  return null;
}

/**
 * Einen Einkauf erzeugen: n Produkte (zufällig oder die gewählten ids) mit Preisen.
 * Rückgabe: { produkte: [{ id, name, preis (Rp) }], total (Rp) }
 */
function erzeugeEinkauf(maxFranken, stufe, n, vorher, ids) {
  const auswahl = ids ? ids.map(id => PRODUKTE.find(p => p.id === id)) : mischen(PRODUKTE).slice(0, n);
  const pr = erzeugePreise(maxFranken, stufe, auswahl.length, vorher && vorher.total)
          || erzeugePreise(maxFranken, stufe, 1) ;
  if (pr.preise.length !== auswahl.length) auswahl.length = pr.preise.length;
  return { produkte: auswahl.map((p, k) => ({ id: p.id, name: p.name, preis: pr.preise[k] })), total: pr.total };
}

/** Anzahl Produkte regelmässig abwechseln: jede mögliche Anzahl kommt gleich oft dran
    (gemischt, wie ein Kartenstapel), nie zweimal dieselbe direkt nacheinander, wenn es anders geht */
function neuerAnzahlStapel(bereich, letzte) {
  const werte = [];
  for (let n = bereich.min; n <= bereich.max; n++) werte.push(n);
  let st = mischen(werte);
  if (st.length > 1 && st[st.length - 1] === letzte) st.unshift(st.pop());
  return st;
}
