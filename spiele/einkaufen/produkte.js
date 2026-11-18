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

/**
 * Einen Einkauf erzeugen.
 * maxFranken: höchstes Total in Franken, stufe: 'franken'|'zehn'|'fuenf', maxProdukte: 1..5
 * Rückgabe: { produkte: [{ id, name, preis (Rp) }], total (Rp) }
 */
function erzeugeEinkauf(maxFranken, stufe, maxProdukte, vorher) {
  const st = STUFEN[stufe];
  const maxRp = maxFranken * 100;
  const nMax = Math.max(1, Math.min(maxProdukte, Math.floor(maxRp / st.minPreis), PRODUKTE.length));
  const nMin = Math.min(2, nMax);
  for (let versuch = 0; versuch < 200; versuch++) {
    const n = zufall(nMin, nMax);
    // Total: zufälliges Vielfaches des Schritts, nicht zu klein (mind. ~35 % des Zahlenraums)
    const unten = Math.max(n * st.minPreis, Math.ceil(maxRp * 0.35 / st.schritt) * st.schritt);
    const oben = Math.floor(maxRp / st.schritt) * st.schritt;
    if (unten > oben) continue;
    const total = unten + zufall(0, (oben - unten) / st.schritt) * st.schritt;
    // Jedes Produkt bekommt den kleinsten Preis, der Rest wird in Schritten zufällig verteilt
    const rest = (total - n * st.minPreis) / st.schritt;
    const preise = zufallsAufteilung(rest, n).map(t => st.minPreis + t * st.schritt);
    // Rappen sollen auch wirklich vorkommen
    if (stufe === 'zehn' && !preise.some(p => p % 100 !== 0)) continue;
    if (stufe === 'fuenf' && !preise.some(p => p % 10 === 5)) continue;
    // nicht genau dasselbe Total wie bei der letzten Aufgabe
    if (vorher && vorher.total === total && versuch < 150) continue;
    const auswahl = mischen(PRODUKTE).slice(0, n);
    return { produkte: auswahl.map((p, k) => ({ id: p.id, name: p.name, preis: preise[k] })), total };
  }
  // Notlösung (sehr kleiner Zahlenraum): ein Produkt zum kleinsten Preis
  const p = waehle(PRODUKTE);
  return { produkte: [{ id: p.id, name: p.name, preis: st.minPreis }], total: st.minPreis };
}
