/* =========================================================
   Mengen erkennen – zeichnet eine Menge als Bild (SVG).
   Regeln: immer von links nach rechts auffüllen, nach jeweils
   5 Dingen eine klare Trennung (Abstand, neuer Korb, neuer Würfel …).
   Bilder der Dinge: bilder/mengen/*.png (erstellt mit ChatGPT).
   ========================================================= */
const MENGEN_THEMEN = [
  { id: 'finger',       max: 10 },   // zwei Hände
  { id: 'aepfel',       max: 20 },   // zwei Körbe à 10
  { id: 'striche',      max: 20 },   // Strichliste, 5. Strich quer
  { id: 'raben',        max: 20 },   // Raben auf dem Ast
  { id: 'punkte',       max: 20 },   // Zwanzigerfeld
  { id: 'flaschen',     max: 20 },   // 4 Harasse à 5
  { id: 'marienkaefer', max: 20 },   // zwei Blätter à 10
  { id: 'ameisen',      max: 20 },   // Ameisenschlange
  { id: 'perlen',       max: 20 },   // Rechenschieber
  { id: 'domino',       max: 20 },   // Dominosteine
  { id: 'wuerfel',      max: 20 },   // Würfel
  { id: 'kamele',       max: 20 },   // Kamele in der Wüste
  { id: 'erdmaennchen', max: 20 },   // Erdmännchen in der Wüste
  { id: 'palmen',       max: 20 }    // Palmen am Strand
];

/** Alle Mengen-Aufgaben, z. B. "M aepfel 13" */
const MENGEN_AUFGABEN = MENGEN_THEMEN.flatMap(t =>
  Array.from({ length: t.max }, (_, i) => `M ${t.id} ${i + 1}`));

const MB = 'bilder/mengen/';
const B = 800, H = 300;          // Zeichenfläche (viewBox)

/** Bild an Position (Mitte x, Unterkante y) */
function bild(datei, x, yUnten, breite, hoehe, extra = '') {
  return `<image href="${MB}${datei}" x="${x - breite / 2}" y="${yUnten - hoehe}" width="${breite}" height="${hoehe}" preserveAspectRatio="xMidYMax meet" ${extra}/>`;
}
/** x-Positionen für bis zu 10 Dinge in einer Reihe, Lücke nach 5 */
function reihenX(anzahl, start, schritt, luecke) {
  return Array.from({ length: anzahl }, (_, i) => start + i * schritt + (i >= 5 ? luecke : 0));
}
/** Dinge in zwei Reihen à 10 (oben 1–10, unten 11–20), Lücke nach 5 */
function zweiReihen(n, datei, groesse, yOben, yUnten, hintergrund = '') {
  const schritt = groesse * 0.95, luecke = groesse * 0.75;
  const breite = 9 * schritt + luecke;
  const start = (B - breite) / 2;
  let s = hintergrund;
  const xs = reihenX(10, start, schritt, luecke);
  for (let i = 0; i < n; i++) {
    const y = i < 10 ? yOben : yUnten;
    s += bild(datei, xs[i % 10], y, groesse, groesse);
  }
  return s;
}

const ZEICHNER = {
  finger(n) {
    const links = Math.min(5, n), rechts = Math.max(0, n - 5);
    // linke Hand gespiegelt, damit beide Daumen zur Mitte zeigen
    return `<g transform="translate(560 0) scale(-1 1)">${bild(`hand-${links}.png`, 280, 290, 230, 270)}</g>` +
      bild(`hand-${rechts}.png`, 520, 290, 230, 270);
  },
  aepfel(n) {
    let s = '';
    [0, 1].forEach(k => {
      const cx = k === 0 ? 205 : 595;
      const inKorb = Math.max(0, Math.min(10, n - k * 10));
      // grosser Korb, darin zwei Reihen à 5 Äpfel (obere Reihe zuerst)
      s += bild('korb.png', cx, 298, 330, 300);
      for (let i = 0; i < inKorb; i++) s += bild('apfel.png', cx - 124 + (i % 5) * 62, i < 5 ? 222 : 284, 60, 64);
    });
    return s;
  },
  striche(n) {
    let s = '<g stroke="#263238" stroke-width="9" stroke-linecap="round">';
    const gruppen = Math.ceil(n / 5);
    const gb = 150, start = (B - gruppen * gb + 40) / 2;
    for (let g = 0; g < gruppen; g++) {
      const anz = Math.min(5, n - g * 5), x0 = start + g * gb;
      for (let i = 0; i < Math.min(4, anz); i++) s += `<line x1="${x0 + i * 26}" y1="80" x2="${x0 + i * 26}" y2="220"/>`;
      if (anz === 5) s += `<line x1="${x0 - 16}" y1="200" x2="${x0 + 94}" y2="100" stroke="#c62828"/>`;
    }
    return s + '</g>';
  },
  raben(n) {
    // zwei Äste übereinander, je bis zu 10 Raben, Lücke nach 5
    const ast = (y) => `<image href="${MB}ast.png" x="10" y="${y}" width="780" height="150" preserveAspectRatio="none"/>`;
    let s = ast(10) + ast(150);
    const xs = reihenX(10, 92, 58, 40);
    for (let i = 0; i < n; i++) s += bild('rabe.png', xs[i % 10], i < 10 ? 76 : 216, 68, 68);
    return s;
  },
  punkte(n) {
    let s = '';
    const r = 26, schritt = 64, luecke = 30, start = (B - (9 * schritt + luecke)) / 2;
    const xs = reihenX(10, start, schritt, luecke);
    s += `<rect x="${start - 40}" y="60" width="${9 * schritt + luecke + 80}" height="180" rx="16" fill="#fff" stroke="#263238" stroke-width="4"/>`;
    s += `<line x1="${xs[4] + (xs[5] - xs[4]) / 2}" y1="60" x2="${xs[4] + (xs[5] - xs[4]) / 2}" y2="240" stroke="#263238" stroke-width="4"/>`;
    for (let i = 0; i < 20; i++) {
      const voll = i < n;
      s += `<circle cx="${xs[i % 10]}" cy="${i < 10 ? 110 : 190}" r="${r}" fill="${voll ? '#d32f2f' : '#fff'}" stroke="#263238" stroke-width="3"/>`;
    }
    return s;
  },
  flaschen(n) {
    let s = '';
    const kb = 180, start = (B - 4 * kb) / 2 + kb / 2;
    for (let k = 0; k < 4; k++) {
      const cx = start + k * kb, drin = Math.max(0, Math.min(5, n - k * 5));
      for (let i = 0; i < drin; i++) s += bild('flasche.png', cx - 62 + i * 31, 235, 34, 120);
      s += bild('harass.png', cx, 290, 172, 114);
    }
    return s;
  },
  marienkaefer(n) {
    let s = '';
    [0, 1].forEach(k => {
      const cx = k === 0 ? 210 : 590, drin = Math.max(0, Math.min(10, n - k * 10));
      s += bild('blatt.png', cx, 290, 380, 260);
      for (let i = 0; i < drin; i++) s += bild('marienkaefer.png', cx - 140 + (i % 5) * 62, i < 5 ? 150 : 222, 60, 62);
    });
    return s;
  },
  ameisen(n) {
    // Ameisenstrasse in zwei Reihen à 10 (Ameise an Ameise, Abstand nach 5)
    const strasse = y => `<path d="M20 ${y + 6} Q400 ${y + 16} 780 ${y + 6}" stroke="#c8a165" stroke-width="14" fill="none" stroke-linecap="round" opacity=".45"/>`;
    let s = strasse(130) + strasse(260);
    const xs = reihenX(10, 70, 66, 60);
    for (let i = 0; i < n; i++) s += bild('ameise.png', xs[i % 10], i < 10 ? 130 : 260, 70, 56);
    return s;
  },
  perlen(n) {
    // Rechenschieber: 2 Stangen à 10 Perlen (5 rot, 5 weiss). Gezählte Perlen links, Rest rechts.
    let s = `<rect x="40" y="40" width="720" height="220" rx="14" fill="none" stroke="#8d6e63" stroke-width="12"/>`;
    [0, 1].forEach(st => {
      const y = st === 0 ? 110 : 190;
      s += `<line x1="46" y1="${y}" x2="754" y2="${y}" stroke="#8d6e63" stroke-width="6"/>`;
      const gezaehlt = Math.max(0, Math.min(10, n - st * 10));
      for (let i = 0; i < 10; i++) {
        const links = i < gezaehlt;
        const x = links ? 80 + i * 40 + (i >= 5 ? 6 : 0) : 760 - 40 - (9 - i) * 40 - (i < 5 ? 6 : 0);
        const farbe = i < 5 ? '#d32f2f' : '#fafafa';
        s += `<ellipse class="${links ? 'gezaehlt' : 'rest'}" cx="${x}" cy="${y}" rx="19" ry="26" fill="${farbe}" stroke="#263238" stroke-width="3"/>`;
      }
    });
    return s;
  },
  domino(n) {
    // Steine à 2 Felder, jedes Feld höchstens 5 Augen
    let s = '';
    const steine = Math.max(1, Math.ceil(n / 10));
    const sb = 300, start = (B - steine * sb) / 2 + 20;
    let rest = n;
    for (let k = 0; k < steine; k++) {
      const x = start + k * sb;
      s += `<rect x="${x}" y="70" width="260" height="140" rx="18" fill="#fffdf5" stroke="#263238" stroke-width="5"/><line x1="${x + 130}" y1="80" x2="${x + 130}" y2="200" stroke="#263238" stroke-width="4"/>`;
      for (let f = 0; f < 2; f++) { const a = Math.min(5, rest); rest -= a; s += augen(x + f * 130 + 65, 140, a, 44, 10); }
    }
    return s;
  },
  wuerfel(n) {
    let s = '';
    const w = Math.ceil(n / 5), groesse = 140, ab = 170, start = (B - (w - 1) * ab) / 2;
    let rest = n;
    for (let k = 0; k < w; k++) {
      const a = Math.min(5, rest); rest -= a;
      const cx = start + k * ab;
      s += `<rect x="${cx - groesse / 2}" y="${150 - groesse / 2}" width="${groesse}" height="${groesse}" rx="24" fill="#fff" stroke="#263238" stroke-width="5"/>`;
      s += augen(cx, 150, a, 38, 13);
    }
    return s;
  },
  kamele(n) { return wueste() + zweiReihen(n, 'kamel.png', 72, 200, 294); },
  erdmaennchen(n) { return wueste() + zweiReihen(n, 'erdmaennchen.png', 72, 200, 294); },
  palmen(n) { return `<image href="${MB}strand.jpg" x="0" y="0" width="${B}" height="${H}" preserveAspectRatio="xMidYMax slice"/>` + zweiReihen(n, 'palme.png', 74, 196, 294); }
};
function wueste() { return `<image href="${MB}wueste.jpg" x="0" y="0" width="${B}" height="${H}" preserveAspectRatio="xMidYMax slice"/>`; }

/** Würfel-/Domino-Augen (0–5) um einen Mittelpunkt */
function augen(cx, cy, anzahl, abstand, r) {
  const p = {
    1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]
  }[anzahl] || [];
  return p.map(([dx, dy]) => `<circle cx="${cx + dx * abstand}" cy="${cy + dy * abstand}" r="${r}" fill="#263238"/>`).join('');
}

/** Gibt das fertige SVG für eine Mengen-Aufgabe zurück */
function mengenSvg(thema, n) {
  const inhalt = (ZEICHNER[thema] || ZEICHNER.punkte)(n);
  return `<svg viewBox="0 0 ${B} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wie viele?">${inhalt}</svg>`;
}
