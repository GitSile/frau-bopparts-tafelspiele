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

/** Bild an Position (Mitte x, Unterkante y), mit Schatten für den 3D-Eindruck */
function bild(datei, x, yUnten, breite, hoehe, extra = 'filter="url(#schatten)"') {
  return `<image href="${MB}${datei}" x="${x - breite / 2}" y="${yUnten - hoehe}" width="${breite}" height="${hoehe}" preserveAspectRatio="xMidYMax meet" ${extra}/>`;
}
/** x-Positionen für bis zu 10 Dinge in einer Reihe, Lücke nach 5 */
function reihenX(anzahl, start, schritt, luecke) {
  return Array.from({ length: anzahl }, (_, i) => start + i * schritt + (i >= 5 ? luecke : 0));
}
/** Plätze 1–n im Zwanzigerfeld (2 Reihen à 10, Trennung nach 5), von links aufgefüllt:
    zuerst der linke Fünferblock (oben 5, dann unten 5), danach der rechte Fünferblock.
    Gibt {zeile, spalte} zurück, sortiert so, dass die vordere (untere) Reihe zuletzt gezeichnet wird. */
function plaetze(n) {
  return Array.from({ length: n }, (_, i) => {
    const block = Math.floor(i / 10), w = i % 10;
    return { zeile: Math.floor(w / 5), spalte: block * 5 + (w % 5) };
  }).sort((a, b) => a.zeile - b.zeile);
}
/** Dinge im Zwanzigerfeld-Muster (siehe plaetze), Lücke nach 5 */
function zweiReihen(n, datei, groesse, yOben, yUnten, hintergrund = '') {
  const schritt = groesse * 0.95, luecke = groesse * 0.75;
  const breite = 9 * schritt + luecke;
  const start = (B - breite) / 2;
  let s = hintergrund;
  const xs = reihenX(10, start, schritt, luecke);
  plaetze(n).forEach(p => { s += bild(datei, xs[p.spalte], p.zeile ? yUnten : yOben, groesse, groesse); });
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
    // Äpfel liegen IM Korb: hinten der ganze Korb, dann die Äpfel (hintere Reihe 1–5,
    // vordere Reihe 6–10, leicht versetzt), vorne nochmals die Korbwand, die die Äpfel unten verdeckt.
    let s = '';
    [0, 1].forEach(k => {
      const cx = k === 0 ? 205 : 595;
      const inKorb = Math.max(0, Math.min(10, n - k * 10));
      const korb = bild('korb.png', cx, 298, 340, 300);
      // vordere Korbwand: alles unterhalb des gebogenen Korbrands
      s += `<defs><clipPath id="korbwand${k}"><path d="M${cx - 170} 150 Q${cx} 196 ${cx + 170} 150 L${cx + 170} 300 L${cx - 170} 300 Z"/></clipPath></defs>`;
      s += korb;
      for (let i = 0; i < inKorb; i++) {
        const vorne = i >= 5;
        s += bild('apfel.png', cx - 117 + (i % 5) * 52 + (vorne ? 26 : 0), vorne ? 182 : 158, 60, 64);
      }
      s += `<g clip-path="url(#korbwand${k})">${korb}</g>`;
    });
    return s;
  },
  striche(n) {
    // Holzstäbchen-Look: runde Enden, Glanzlinie, Schatten
    let s = '<g filter="url(#schatten)" stroke-linecap="round">';
    const gruppen = Math.ceil(n / 5);
    const gb = 150, start = (B - gruppen * gb + 40) / 2;
    const strich = (x1, y1, x2, y2, farbe) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="12"/>` +
      `<line x1="${x1 - 2}" y1="${y1 + 4}" x2="${x2 - 2}" y2="${y2 - 4}" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`;
    for (let g = 0; g < gruppen; g++) {
      const anz = Math.min(5, n - g * 5), x0 = start + g * gb;
      for (let i = 0; i < Math.min(4, anz); i++) s += strich(x0 + i * 26, 80, x0 + i * 26, 220, '#37474f');
      if (anz === 5) s += strich(x0 - 16, 200, x0 + 94, 100, '#c62828');
    }
    return s + '</g>';
  },
  raben(n) {
    // zwei Äste übereinander, je bis zu 10 Raben, Lücke nach 5, linker Fünferblock zuerst
    const ast = (y) => `<image href="${MB}ast.png" x="10" y="${y}" width="780" height="150" preserveAspectRatio="none" filter="url(#schatten)"/>`;
    let s = ast(10) + ast(150);
    const xs = reihenX(10, 92, 58, 40);
    plaetze(n).forEach(p => { s += bild('rabe.png', xs[p.spalte], p.zeile ? 238 : 98, 74, 74); });
    return s;
  },
  punkte(n) {
    // Zwanzigerfeld: linker Fünferblock (oben, unten) zuerst, dann rechts
    let s = '';
    const r = 26, schritt = 64, luecke = 30, start = (B - (9 * schritt + luecke)) / 2;
    const xs = reihenX(10, start, schritt, luecke);
    const mitte = xs[4] + (xs[5] - xs[4]) / 2;
    s += `<rect x="${start - 40}" y="60" width="${9 * schritt + luecke + 80}" height="180" rx="16" fill="url(#karton)" stroke="#263238" stroke-width="4" filter="url(#schatten)"/>`;
    s += `<line x1="${mitte}" y1="60" x2="${mitte}" y2="240" stroke="#263238" stroke-width="4"/>`;
    const voll = new Set(plaetze(n).map(p => p.zeile * 10 + p.spalte));
    for (let z = 0; z < 2; z++) for (let sp = 0; sp < 10; sp++) {
      const cx = xs[sp], cy = z ? 190 : 110;
      if (voll.has(z * 10 + sp)) {
        s += `<circle class="voll" cx="${cx}" cy="${cy}" r="${r}" fill="url(#kugelRot)" stroke="#5d1010" stroke-width="2.5" filter="url(#schattenKlein)"/>`;
      } else {
        s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#mulde)" stroke="#90a4ae" stroke-width="2.5"/>`;
      }
    }
    return s;
  },
  flaschen(n) {
    // offener Harass: hinten die Kiste, dann die Flaschen in den 5 Fächern, vorne die Frontwand darüber
    let s = '';
    const kb = 186, kw = 180, kh = Math.round(kw * 394 / 662), unten = 270, start = (B - 4 * kb) / 2 + kb / 2;
    const oben = unten - kh, front = oben + kh * 0.40;
    for (let k = 0; k < 4; k++) {
      const cx = start + k * kb, x0 = cx - kw / 2, drin = Math.max(0, Math.min(5, n - k * 5));
      const kiste = bild('harass.png', cx, unten, kw, kh);
      s += kiste;
      for (let i = 0; i < drin; i++) s += bild('flasche.png', x0 + kw * (0.172 + i * 0.164), unten - 40, 40, 112, '');
      s += `<defs><clipPath id="harassfront${k}"><rect x="${x0 - 10}" y="${front}" width="${kw + 20}" height="${kh}"/></clipPath></defs><g clip-path="url(#harassfront${k})">${kiste}</g>`;
    }
    return s;
  },
  marienkaefer(n) {
    // Käfer sitzen ganz auf dem Blatt: 2 Reihen à 5 in der Blattmitte
    let s = '';
    [0, 1].forEach(k => {
      const cx = k === 0 ? 205 : 595, drin = Math.max(0, Math.min(10, n - k * 10));
      s += bild('blatt.png', cx, 292, 384, 260);
      for (let i = 0; i < drin; i++) s += bild('marienkaefer.png', cx - 100 + (i % 5) * 56, i < 5 ? 158 : 222, 52, 54, 'filter="url(#schattenKlein)"');
    });
    return s;
  },
  ameisen(n) {
    // Ameisenstrasse in zwei Reihen à 10 (Ameise an Ameise, Abstand nach 5)
    const strasse = y => `<path d="M20 ${y + 6} Q400 ${y + 16} 780 ${y + 6}" stroke="#c8a165" stroke-width="14" fill="none" stroke-linecap="round" opacity=".45"/>`;
    let s = strasse(130) + strasse(260);
    const xs = reihenX(10, 70, 66, 60);
    plaetze(n).forEach(p => { s += bild('ameise.png', xs[p.spalte], p.zeile ? 260 : 130, 70, 56); });
    return s;
  },
  perlen(n) {
    // Rechenschieber mit 2 Stangen. Nur die gezählten Perlen sind drauf, von links,
    // je 5 Perlen in derselben Farbe (5 rot, 5 weiss, …), kleiner Abstand nach 5.
    let s = `<rect x="40" y="40" width="720" height="220" rx="16" fill="#fffaf0" stroke="url(#holz)" stroke-width="16" filter="url(#schatten)"/>`;
    [0, 1].forEach(st => {
      const y = st === 0 ? 110 : 190;
      s += `<line x1="48" y1="${y}" x2="752" y2="${y}" stroke="#8d6e63" stroke-width="8"/><line x1="48" y1="${y - 2}" x2="752" y2="${y - 2}" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>`;
      const anz = Math.max(0, Math.min(10, n - st * 10));
      for (let i = 0; i < anz; i++) {
        const x = 92 + i * 52 + (i >= 5 ? 22 : 0);
        s += `<ellipse class="gezaehlt" cx="${x}" cy="${y}" rx="25" ry="31" fill="url(#${i < 5 ? 'kugelRot' : 'kugelWeiss'})" stroke="#263238" stroke-width="2.5" filter="url(#schattenKlein)"/>`;
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
      s += `<rect x="${x}" y="70" width="260" height="140" rx="18" fill="url(#elfenbein)" stroke="#263238" stroke-width="5" filter="url(#schatten)"/>` +
           `<rect x="${x + 8}" y="76" width="244" height="20" rx="10" fill="#fff" opacity=".6"/>` +
           `<line x1="${x + 130}" y1="82" x2="${x + 130}" y2="198" stroke="#263238" stroke-width="4"/>`;
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
      // gewölbter Würfel: Verlauf, Glanzkante oben, Schatten
      const x0 = cx - groesse / 2, y0 = 150 - groesse / 2;
      s += `<rect x="${x0}" y="${y0}" width="${groesse}" height="${groesse}" rx="26" fill="url(#elfenbein)" stroke="#263238" stroke-width="5" filter="url(#schatten)"/>` +
           `<rect x="${x0 + 10}" y="${y0 + 8}" width="${groesse - 20}" height="22" rx="11" fill="#fff" opacity=".7"/>`;
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
  // eingelassene Augen: dunkle Mulde mit hellem Rand unten rechts
  return p.map(([dx, dy]) => `<circle class="auge" cx="${cx + dx * abstand}" cy="${cy + dy * abstand}" r="${r}" fill="url(#auge)"/>`).join('');
}

/* Gemeinsame Effekte für den 3D-Eindruck: Schatten, Kugel-Glanz, Mulden */
const MENGEN_DEFS = `<defs>
  <filter id="schatten" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="3" dy="6" stdDeviation="3.5" flood-color="#3e2723" flood-opacity=".35"/></filter>
  <filter id="schattenKlein" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="2" dy="4" stdDeviation="2" flood-color="#3e2723" flood-opacity=".4"/></filter>
  <radialGradient id="kugelRot" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ff8a80"/><stop offset=".35" stop-color="#e53935"/><stop offset="1" stop-color="#8e1414"/></radialGradient>
  <radialGradient id="kugelWeiss" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#f1f1f1"/><stop offset="1" stop-color="#a7a7a7"/></radialGradient>
  <radialGradient id="mulde" cx="50%" cy="60%" r="65%"><stop offset="0" stop-color="#fafafa"/><stop offset=".8" stop-color="#e3e8eb"/><stop offset="1" stop-color="#b0bec5"/></radialGradient>
  <radialGradient id="auge" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#546e7a"/><stop offset=".6" stop-color="#263238"/><stop offset="1" stop-color="#111"/></radialGradient>
  <linearGradient id="elfenbein" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fbf7ee"/><stop offset="1" stop-color="#e8e0cc"/></linearGradient>
  <linearGradient id="karton" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef2f4"/></linearGradient>
  <linearGradient id="holz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a1887f"/><stop offset=".5" stop-color="#8d6e63"/><stop offset="1" stop-color="#5d4037"/></linearGradient>
</defs>`;

/** Gibt das fertige SVG für eine Mengen-Aufgabe zurück */
function mengenSvg(thema, n) {
  const inhalt = (ZEICHNER[thema] || ZEICHNER.punkte)(n);
  return `<svg viewBox="0 0 ${B} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wie viele?">${MENGEN_DEFS}${inhalt}</svg>`;
}
