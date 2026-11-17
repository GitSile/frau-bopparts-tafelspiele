/* =========================================================
   Mengen erkennen – zeichnet eine Menge als Bild (SVG).
   Regeln: immer von links nach rechts auffüllen, nach jeweils
   5 Dingen eine klare Trennung (Abstand, neue Torte, neuer Würfel …).
   Bilder der Dinge: bilder/mengen/*.png (erstellt mit ChatGPT, auch Hände und Torte), Ast und Kerzen als Vektorgrafik.
   ========================================================= */
const MENGEN_THEMEN = [
  { id: 'finger',       max: 10 },   // zwei Hände
  { id: 'kerzen',       max: 20 },   // zwei Torten à 10 Kerzen
  { id: 'striche',      max: 20 },   // Strichliste, 5. Strich quer
  { id: 'raben',        max: 20 },   // Raben auf dem Ast
  { id: 'punkte',       max: 20 },   // Zwanzigerfeld
  { id: 'flaschen',     max: 20 },   // 4 Harasse à 5
  { id: 'marienkaefer', max: 20 },   // zwei Blätter à 10
  { id: 'ameisen',      max: 20 },   // Ameisenschlange
  { id: 'perlen',       max: 20 },   // Rechenschieber
  { id: 'domino',       max: 20 },   // Dominosteine
  { id: 'kamele',       max: 20 },   // Kamele in der Wüste
  { id: 'wuerfel',      max: 20 },   // Würfel
  { id: 'palmen',       max: 20 },   // Palmen am Strand
  { id: 'erdmaennchen', max: 20 },   // Erdmännchen in der Wüste
  { id: 'eier',         max: 20 },   // zwei Eierkartons à 2×5
  { id: 'muffins',      max: 20 },   // Muffinblech 2×10
  { id: 'fussballer',   max: 20 },   // Fussballer auf dem Platz
  { id: 'autos',        max: 20 },   // Parkplatz 2×10
  { id: 'ballone',      max: 20 },   // 4 Bündel à 5 Luftballone
  { id: 'sterne',       max: 20 },   // Sterne am Nachthimmel
  { id: 'enten',        max: 20 },   // Enten auf dem Teich
  { id: 'fische',       max: 20 },   // 4 Aquarien à 5 Fische
  { id: 'bienen',       max: 20 }    // 4 Blumen à 5 Bienen
];
/** Themen, die sich zu ähnlich sehen: sie kommen nie direkt nacheinander dran */
const MENGEN_AEHNLICH = [['domino', 'wuerfel'], ['kamele', 'erdmaennchen']];

/** Alle Mengen-Aufgaben, z. B. "M kerzen 13" */
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
function zweiReihen(n, datei, groesse, yOben, yUnten, hintergrund = '', bildGroesse = groesse) {
  const schritt = groesse * 0.95, luecke = groesse * 0.75;
  const breite = 9 * schritt + luecke;
  const start = (B - breite) / 2;
  let s = hintergrund;
  const xs = reihenX(10, start, schritt, luecke);
  plaetze(n).forEach(p => { s += bild(datei, xs[p.spalte], p.zeile ? yUnten : yOben, bildGroesse, bildGroesse); });
  return s;
}

const ZEICHNER = {
  finger(n) {
    // zuerst die linke Hand voll, dann die rechte. Linke Hand gespiegelt, damit beide Daumen zur Mitte zeigen.
    const links = Math.min(5, n), rechts = Math.max(0, n - 5);
    return handBild(235, links, true) + handBild(565, rechts, false);
  },
  kerzen(n) {
    // Vier Torten von ChatGPT nebeneinander, darauf je höchstens 5 Kerzen in einer Reihe
    // (Kerzen als Vektorgrafik, damit die Anzahl immer exakt stimmt).
    let s = '';
    const ab = 199, start = B / 2 - 1.5 * ab;
    const tb = 192, th = tb * 465 / 700, ty = 292 - th;   // Tortenbild 700×465 px
    const kerzenY = ty + th * 0.31;                      // Mitte der Tortenoberfläche
    for (let k = 0; k < 4; k++) {
      const cx = start + k * ab;
      const drauf = Math.max(0, Math.min(5, n - k * 5));
      s += `<image href="${MB}torte.png" x="${cx - tb / 2}" y="${ty}" width="${tb}" height="${th}" filter="url(#schattenKlein)"/>`;
      for (let i = 0; i < drauf; i++) {
        const x = cx + (i - 2) * 23;
        s += `<g transform="translate(${x} ${kerzenY}) scale(0.85) translate(${-x} ${-kerzenY})">${kerze(x, kerzenY)}</g>`;
      }
    }
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
    // zwei Äste (Vektorgrafik) übereinander, je bis zu 10 Raben, Lücke nach 5, linker Fünferblock zuerst
    let s = ast(112) + ast(254);
    const xs = reihenX(10, 92, 58, 40);
    plaetze(n).forEach(p => { s += bild('rabe.png', xs[p.spalte], p.zeile ? 258 : 116, 54, 52); });
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
      for (let i = 0; i < drin; i++) s += bild('flasche.png', x0 + kw * (0.172 + i * 0.164), unten - 40, 33, 108, '');
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
    plaetze(n).forEach(p => { s += bild('ameise.png', xs[p.spalte], p.zeile ? 260 : 130, 58, 48); });
    return s;
  },
  perlen(n) {
    // Rechenschieber mit 2 Stangen. Nur die gezählten Perlen sind drauf, von links,
    // je 5 Perlen in derselben kräftigen Farbe (5 rot, 5 blau), runde Kugeln, kleiner Abstand nach 5.
    let s = `<rect x="40" y="40" width="720" height="220" rx="16" fill="#fffaf0" stroke="url(#holz)" stroke-width="16" filter="url(#schatten)"/>`;
    [0, 1].forEach(st => {
      const y = st === 0 ? 110 : 190;
      s += `<line x1="48" y1="${y}" x2="752" y2="${y}" stroke="#8d6e63" stroke-width="8"/><line x1="48" y1="${y - 2}" x2="752" y2="${y - 2}" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>`;
      const anz = Math.max(0, Math.min(10, n - st * 10));
      for (let i = 0; i < anz; i++) {
        const x = 92 + i * 52 + (i >= 5 ? 22 : 0);
        s += `<circle class="gezaehlt" cx="${x}" cy="${y}" r="25" fill="url(#${i < 5 ? 'kugelRot' : 'kugelBlau'})" stroke="#263238" stroke-width="2.5" filter="url(#schattenKlein)"/>`;
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
  kamele(n) { return wueste() + zweiReihen(n, 'kamel.png', 72, 184, 272, '', 62); },
  erdmaennchen(n) { return wueste() + zweiReihen(n, 'erdmaennchen.png', 72, 182, 272); },
  palmen(n) { return `<image href="${MB}strand.jpg" x="0" y="0" width="${B}" height="${H}" preserveAspectRatio="xMidYMax slice"/>` + zweiReihen(n, 'palme.png', 74, 180, 274, '', 64); }
};
/** Kinderhand von ChatGPT (hand0–5.png = 0–5 gestreckte Finger, Daumen zuerst).
    Alle Hände gleich gross ausgerichtet am blauen Bündchen; Mitte des Bündchens bei cx, Unterkante 296. */
const HAENDE = [   // Bildgrösse und Bündchen (links, rechts) in Pixeln
  { w: 258, h: 362, l: 63, r: 212 }, { w: 414, h: 520, l: 135, r: 323 }, { w: 327, h: 422, l: 112, r: 266 },
  { w: 311, h: 460, l: 118, r: 262 }, { w: 313, h: 456, l: 121, r: 267 }, { w: 368, h: 468, l: 124, r: 272 }
];
function handBild(cx, anzahl, gespiegelt) {
  const m = HAENDE[anzahl], s = 88 / (m.r - m.l);   // Bündchen immer 88 breit
  const w = m.w * s, h = m.h * s, x = cx - ((m.l + m.r) / 2) * s;
  const bild = `<image href="${MB}hand${anzahl}.png" x="${x}" y="${296 - h}" width="${w}" height="${h}"/>`;
  return `<g class="hand" data-finger="${anzahl}" filter="url(#schattenKlein)">` +
    (gespiegelt ? `<g transform="translate(${2 * cx} 0) scale(-1 1)">${bild}</g>` : bild) + '</g>';
}
/** Waagrechter Ast als Vektorgrafik. y = Oberkante der Rinde (dort sitzen die Raben). */
function ast(y) {
  const d = 30;   // Dicke der Rinde
  const rinde = `M14 ${y + 6} C 200 ${y - 4}, 420 ${y + 8}, 640 ${y + 2} S 770 ${y - 2}, 790 ${y + 4}` +
                ` L 790 ${y + d - 4} C 700 ${y + d + 2}, 420 ${y + d + 6}, 200 ${y + d + 2} S 30 ${y + d + 4}, 14 ${y + d - 2} Z`;
  const blatt = (x, yy, dreh, gr = 1) =>
    `<g transform="translate(${x} ${yy}) rotate(${dreh}) scale(${gr})">` +
    `<path d="M0 0 C 10 -15, 34 -17, 48 0 C 34 15, 10 15, 0 0 Z" fill="url(#blattGruen)" stroke="#1b5e20" stroke-width="2.2"/>` +
    `<path d="M3 0 L 44 0" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M15 0 L 22 -7 M26 0 L 33 -7 M15 0 L 22 7 M26 0 L 33 7" stroke="#a5d6a7" stroke-width="1.4" stroke-linecap="round"/></g>`;
  let s = `<g filter="url(#schatten)">`;
  // grüne Blättchen nur am rechten Astende (rechts von allen Raben, x > 700)
  s += `<path d="M735 ${y + 8} Q 752 ${y - 10} 768 ${y - 26}" stroke="#4e2f1e" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  s += blatt(766, y - 24, -80, 0.8) + blatt(762, y - 22, -30, 0.7) + blatt(748, y - 8, -130, 0.7);
  s += `<path d="${rinde}" fill="url(#holzRinde)" stroke="#3e2723" stroke-width="3" stroke-linejoin="round"/>`;
  s += blatt(764, y + 13, 62, 0.62) + blatt(748, y + 15, 105, 0.6) + blatt(772, y + 12, 28, 0.55);
  // Rindenstruktur
  for (let x = 60; x < 720; x += 70) {   // Maserung nur innerhalb der Rinde
    const o = (x * 7) % 9;
    s += `<path d="M${x} ${y + 12 + (o % 3)} q 18 -3 34 1" stroke="#4e342e" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>`;
    s += `<path d="M${x + 30} ${y + 21 + (o % 2)} q 14 2 26 -1" stroke="#4e342e" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".4"/>`;
  }
  s += `<path d="M20 ${y + 9} C 200 ${y}, 420 ${y + 11}, 640 ${y + 5}" stroke="#d7a77d" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`;
  s += `<ellipse cx="16" cy="${y + d / 2 + 1}" rx="6" ry="${d / 2 - 2}" fill="#d7ccc8" stroke="#3e2723" stroke-width="2.5"/>`;
  return s + '</g>';
}

function kerze(x, y) {
  const h = 62, w = 14;
  return `<g class="kerze" filter="url(#schattenKlein)">` +
    `<ellipse cx="${x}" cy="${y - h - 26}" rx="16" ry="20" fill="#ffeb3b" opacity=".25"/>` +
    `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="3" fill="url(#kerzeStreifen)" stroke="#1565c0" stroke-width="1.6"/>` +
    `<rect x="${x - w / 2 + 2}" y="${y - h + 2}" width="3" height="${h - 4}" rx="1.5" fill="#fff" opacity=".5"/>` +
    `<line x1="${x}" y1="${y - h}" x2="${x}" y2="${y - h - 7}" stroke="#37474f" stroke-width="2"/>` +
    `<path d="M${x} ${y - h - 30} C ${x + 9} ${y - h - 18}, ${x + 7} ${y - h - 6}, ${x} ${y - h - 5} C ${x - 7} ${y - h - 6}, ${x - 9} ${y - h - 18}, ${x} ${y - h - 30} Z" fill="url(#flamme)"/>` +
    `</g>`;
}

/* =========================================================
   Weitere Themen – alles Vektorgrafik (gestochen scharf)
   ========================================================= */
const BUNT = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#ff7043', '#26c6da', '#ec407a', '#8d6e63', '#7e57c2'];
/** Glanzlicht oben links (für runde Dinge) */
function glanz(cx, cy, rx, ry, op = 0.55) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}"/>`;
}
/** Zwanzigerfeld-Positionen: x-Spalten mit Lücke nach 5, zwei Zeilen */
function feldXY(n, start, schritt, luecke, yOben, yUnten) {
  const xs = reihenX(10, start, schritt, luecke);
  return plaetze(n).map(p => ({ x: xs[p.spalte], y: p.zeile ? yUnten : yOben, zeile: p.zeile, spalte: p.spalte }));
}

function ei(x, y, i) {
  // Osterei von ChatGPT, Mitte (x, y), verschiedene Farben per Farbfilter
  return `<g class="ding" filter="url(#schattenKlein)"><image href="${MB}osterei.png" x="${x - 23}" y="${y - 29}" width="46" height="58" preserveAspectRatio="xMidYMax meet" filter="url(#farbe${i % 6})"/></g>`;
}

function muffin(x, y, i) {
  // Muffin von ChatGPT, Unterkante bei y+12
  return `<g class="ding">${bild('muffin.png', x, y + 12, 58, 72, 'filter="url(#schattenKlein)"')}</g>`;
}

function auto(x, y, i) {
  // Auto von oben (ChatGPT), Mitte (x, y), verschiedene Farben per Farbfilter
  return `<g class="ding" filter="url(#schattenKlein)"><image href="${MB}auto.png" x="${x - 21}" y="${y - 34}" width="42" height="68" preserveAspectRatio="xMidYMid meet" filter="url(#farbe${(i * 7) % 6})"/></g>`;
}

function ballon(x, y, i) {
  // Ballon von ChatGPT (rot), andere Farben per Farbfilter; Knoten unten bei y+33
  return `<g class="ding" filter="url(#schattenKlein)"><image href="${MB}ballon.png" x="${x - 24}" y="${y - 30}" width="48" height="63" preserveAspectRatio="xMidYMax meet" filter="url(#farbe${i % 6})"/></g>`;
}

function stern(x, y, r) {
  // Stern von ChatGPT, Mitte (x, y)
  return `<g class="ding">${bild('stern.png', x, y + r, r * 2.1, r * 2, 'filter="url(#leuchten)"')}</g>`;
}

function fussballer(x, y, i) {
  // y = Fusspunkt
  const trikot = ['#e53935', '#1e88e5', '#fdd835', '#43a047'][Math.floor(i / 5) % 4];
  const haar = ['#4e342e', '#212121', '#f9a825', '#8d6e63', '#d84315'][i % 5];
  const haut = ['#ffcc99', '#e0ac69', '#c68642', '#ffdbac', '#8d5524'][(i * 2) % 5];
  return `<g class="ding" filter="url(#schattenKlein)">` +
    // Arme (hinter dem Trikot, die Ärmel decken die Schultern): leicht abgespreizt, mit Händen
    `<path d="M${x - 17} ${y - 52} Q ${x - 24} ${y - 40} ${x - 22} ${y - 27}" stroke="#263238" stroke-width="9" fill="none" stroke-linecap="round"/>` +
    `<path d="M${x - 17} ${y - 52} Q ${x - 24} ${y - 40} ${x - 22} ${y - 27}" stroke="${haut}" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M${x + 17} ${y - 52} Q ${x + 24} ${y - 40} ${x + 22} ${y - 27}" stroke="#263238" stroke-width="9" fill="none" stroke-linecap="round"/>` +
    `<path d="M${x + 17} ${y - 52} Q ${x + 24} ${y - 40} ${x + 22} ${y - 27}" stroke="${haut}" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
    `<circle cx="${x - 22}" cy="${y - 25}" r="4.5" fill="${haut}" stroke="#263238" stroke-width="1.5"/><circle cx="${x + 22}" cy="${y - 25}" r="4.5" fill="${haut}" stroke="#263238" stroke-width="1.5"/>` +
    `<rect x="${x - 10}" y="${y - 22}" width="7" height="18" rx="3" fill="${haut}" stroke="#263238" stroke-width="1.5"/>` +
    `<rect x="${x + 3}" y="${y - 22}" width="7" height="18" rx="3" fill="${haut}" stroke="#263238" stroke-width="1.5"/>` +
    `<rect x="${x - 11}" y="${y - 12}" width="9" height="9" rx="2" fill="#fff" stroke="#263238" stroke-width="1.5"/><rect x="${x + 2}" y="${y - 12}" width="9" height="9" rx="2" fill="#fff" stroke="#263238" stroke-width="1.5"/>` +
    `<ellipse cx="${x - 7}" cy="${y - 2}" rx="7" ry="4" fill="#212121"/><ellipse cx="${x + 8}" cy="${y - 2}" rx="7" ry="4" fill="#212121"/>` +
    `<path d="M${x - 13} ${y - 34} L ${x + 13} ${y - 34} L ${x + 12} ${y - 20} L ${x - 12} ${y - 20} Z" fill="#fff" stroke="#263238" stroke-width="1.8"/>` +
    `<path d="M${x - 15} ${y - 58} Q ${x} ${y - 64} ${x + 15} ${y - 58} L ${x + 22} ${y - 46} L ${x + 15} ${y - 42} L ${x + 14} ${y - 33} L ${x - 14} ${y - 33} L ${x - 15} ${y - 42} L ${x - 22} ${y - 46} Z" fill="${trikot}" stroke="#263238" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M${x - 8} ${y - 46} L ${x + 8} ${y - 46}" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>` +   // Streifen statt Nummer (keine Zahlen beim Zählen!)
    `<circle cx="${x}" cy="${y - 73}" r="13" fill="${haut}" stroke="#263238" stroke-width="2"/>` +
    `<path d="M${x - 13} ${y - 75} Q ${x - 12} ${y - 90} ${x} ${y - 88} Q ${x + 13} ${y - 90} ${x + 13} ${y - 75} Q ${x + 5} ${y - 82} ${x - 13} ${y - 75} Z" fill="${haar}"/>` +
    `<circle cx="${x - 5}" cy="${y - 73}" r="1.8" fill="#263238"/><circle cx="${x + 5}" cy="${y - 73}" r="1.8" fill="#263238"/>` +
    `<path d="M${x - 5} ${y - 67} Q ${x} ${y - 63} ${x + 5} ${y - 67}" stroke="#263238" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    `</g>`;
}

function ente(x, y, i) {
  // Ente von ChatGPT, y = Wasserlinie
  return `<g class="ding">${bild('ente.png', x + 2, y + 6, 58, 54, 'filter="url(#schattenKlein)"')}</g>`;
}

function fisch(x, y, i) {
  // Fisch von ChatGPT, Mitte (x, y)
  return `<g class="ding">${bild('fisch.png', x, y + 17, 46, 34, 'filter="url(#schattenKlein)"')}</g>`;
}

function biene(x, y) {
  // Biene von ChatGPT, Mitte (x, y)
  return `<g class="ding">${bild('biene.png', x, y + 17, 40, 35, 'filter="url(#schattenKlein)"')}</g>`;
}

Object.assign(ZEICHNER, {
  eier(n) {
    // zwei Eierkartons à 2×5, zuerst der linke Karton (hinten 5, vorne 5)
    let s = '';
    [205, 595].forEach((cx, k) => {
      s += `<g filter="url(#schatten)"><rect x="${cx - 175}" y="95" width="350" height="180" rx="22" fill="url(#karton2)" stroke="#8d6e63" stroke-width="3"/></g>`;
      for (let z = 0; z < 2; z++) for (let sp = 0; sp < 5; sp++)
        s += `<ellipse cx="${cx - 128 + sp * 64}" cy="${z ? 238 : 160}" rx="27" ry="20" fill="url(#mulde2)" stroke="#a1887f" stroke-width="2"/>`;
    });
    plaetze(n).forEach((p, j) => {
      const cx = p.spalte < 5 ? 205 : 595, sp = p.spalte % 5;
      s += ei(cx - 128 + sp * 64, p.zeile ? 226 : 148, p.zeile * 10 + p.spalte);
    });
    return s;
  },
  muffins(n) {
    // Muffinblech mit 2 Reihen à 10 (Lücke nach 5), linker Fünferblock zuerst
    let s = `<rect x="22" y="70" width="756" height="222" rx="20" fill="url(#blech)" stroke="#546e7a" stroke-width="4" filter="url(#schatten)"/>`;
    const xs = reihenX(10, 70, 68, 32);
    for (let z = 0; z < 2; z++) for (let sp = 0; sp < 10; sp++)
      s += `<ellipse cx="${xs[sp]}" cy="${z ? 262 : 162}" rx="29" ry="12" fill="#78909c" stroke="#455a64" stroke-width="2"/>`;
    feldXY(n, 70, 68, 32, 166, 266).forEach(p => { s += muffin(p.x, p.y - 6, p.zeile * 10 + p.spalte); });
    return s;
  },
  fussballer(n) {
    // Fussballplatz, Spieler in 2 Reihen à 10 (Lücke nach 5), linker Fünferblock zuerst
    let s = `<rect x="0" y="0" width="${B}" height="${H}" fill="#66bb6a"/>`;
    for (let k = 0; k < 8; k++) s += `<rect x="${k * 100}" y="0" width="50" height="${H}" fill="#5cad60"/>`;
    s += `<g stroke="#fff" stroke-width="5" fill="none" opacity=".9"><rect x="14" y="14" width="772" height="272"/><line x1="400" y1="14" x2="400" y2="286"/><circle cx="400" cy="150" r="52"/></g>`;
    // Spieler von ChatGPT (bilder/mengen/fussballer-*.png), jede Fünfergruppe in einer Trikotfarbe
    const farbe = ['rot', 'blau', 'gelb', 'gruen'];
    feldXY(n, 92, 60, 48, 146, 286).forEach(p => {
      const gruppe = p.zeile * 2 + (p.spalte >= 5 ? 1 : 0);
      s += `<g class="ding">${bild(`fussballer-${farbe[gruppe]}.png`, p.x, p.y, 54, 128)}</g>`;
    });
    return s;
  },
  autos(n) {
    // Parkplatz: 2 Reihen à 10 Parkfelder, Grünstreifen nach 5
    let s = `<rect x="0" y="0" width="${B}" height="${H}" fill="url(#asphalt)"/>`;
    const xs = reihenX(10, 97, 62, 48);
    s += `<rect x="${xs[4] + 31}" y="0" width="${xs[5] - xs[4] - 62}" height="${H}" fill="#7cb342"/>`;
    for (let k = 0; k < 6; k++) s += `<circle cx="${xs[4] + 55}" cy="${30 + k * 48}" r="12" fill="#558b2f"/>`;
    for (let z = 0; z < 2; z++) {
      const y0 = z ? 160 : 14, h = 126;
      for (let sp = 0; sp <= 10; sp++) {
        if (sp === 5) continue;
        const x = sp < 5 ? xs[0] - 31 + sp * 62 : xs[5] - 31 + (sp - 5) * 62;
        s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + h}" stroke="#fff" stroke-width="4"/>`;
      }
      s += `<line x1="${xs[0] - 31}" y1="${z ? y0 : y0 + h}" x2="${xs[4] + 31}" y2="${z ? y0 : y0 + h}" stroke="#fff" stroke-width="4"/>`;
      s += `<line x1="${xs[5] - 31}" y1="${z ? y0 : y0 + h}" x2="${xs[9] + 31}" y2="${z ? y0 : y0 + h}" stroke="#fff" stroke-width="4"/>`;
    }
    feldXY(n, 97, 62, 48, 77, 223).forEach(p => { s += auto(p.x, p.y, p.zeile * 10 + p.spalte); });
    return s;
  },
  ballone(n) {
    // 4 Bündel à 5 Luftballone, Schnüre laufen unten zusammen
    let s = '';
    const pos = [[-70, 128], [-36, 88], [0, 62], [36, 88], [70, 128]];
    for (let k = 0; k < 4; k++) {
      const cx = 103 + k * 198, drin = Math.max(0, Math.min(5, n - k * 5));
      for (let i = 0; i < drin; i++) {
        const [dx, y] = pos[i];
        s += `<path d="M${cx + dx} ${y + 32} Q ${cx + dx * 0.6} ${y + 110} ${cx} 270" stroke="#546e7a" stroke-width="2" fill="none"/>`;
      }
      if (drin) s += `<circle cx="${cx}" cy="272" r="5" fill="#546e7a"/>`;
      for (let i = 0; i < drin; i++) s += ballon(cx + pos[i][0], pos[i][1], k * 5 + i);
    }
    return s;
  },
  sterne(n) {
    let s = `<rect x="0" y="0" width="${B}" height="${H}" fill="url(#nacht)"/>`;
    for (let k = 0; k < 40; k++) s += `<circle cx="${(k * 97) % 800}" cy="${(k * 53) % 300}" r="${(k % 3) * 0.6 + 0.6}" fill="#fff" opacity=".5"/>`;
    feldXY(n, 80, 64, 44, 95, 215).forEach(p => { s += stern(p.x, p.y, 27); });
    return s;
  },
  enten(n) {
    // Teich, Enten schwimmen in 2 Reihen à 10 (Lücke nach 5)
    let s = `<rect x="0" y="0" width="${B}" height="${H}" fill="url(#teich)"/>`;
    for (let k = 0; k < 12; k++) s += `<path d="M${(k * 131) % 760} ${40 + (k * 67) % 240} q 12 -6 24 0 t 24 0" stroke="#fff" stroke-opacity=".45" stroke-width="2.5" fill="none"/>`;
    feldXY(n, 70, 66, 46, 132, 272).forEach(p => {
      s += `<ellipse cx="${p.x - 2}" cy="${p.y + 2}" rx="32" ry="6" fill="#fff" opacity=".35"/>` + ente(p.x - 6, p.y, p.zeile * 10 + p.spalte);
    });
    return s;
  },
  fische(n) {
    // 4 Aquarien à 5 Fische (zickzack), linkes Aquarium zuerst
    let s = '';
    for (let k = 0; k < 4; k++) {
      const x0 = 14 + k * 196, w = 180, drin = Math.max(0, Math.min(5, n - k * 5));
      s += `<g filter="url(#schatten)"><rect x="${x0}" y="60" width="${w}" height="215" rx="14" fill="url(#wasser)" stroke="#455a64" stroke-width="4"/></g>`;
      s += `<path d="M${x0 + 2} 250 Q ${x0 + w / 2} 236 ${x0 + w - 2} 250 L ${x0 + w - 2} 272 L ${x0 + 2} 272 Z" fill="#ffe082"/>`;
      s += `<path d="M${x0 + 26} 252 q -8 -30 0 -60 M${x0 + 34} 252 q 8 -26 2 -46" stroke="#2e7d32" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      s += `<rect x="${x0 + 6}" y="66" width="10" height="200" rx="5" fill="#fff" opacity=".25"/>`;
      for (let i = 0; i < drin; i++) {
        // Zickzack von links nach rechts: oben, unten, oben, unten, oben – nichts überlappt
        const fx = x0 + 42 + i * 26, fy = i % 2 ? 196 : 116;
        s += `<g transform="translate(${fx} ${fy}) scale(0.98) translate(${-fx} ${-fy})">${fisch(fx, fy, k * 5 + i)}</g>`;
      }
    }
    return s;
  },
  bienen(n) {
    // Gezählt werden nur die Bienen: Sie sind gross, kräftig und mit Schatten im Vordergrund.
    // Die Blumen sind klein, blass und ohne Kontur – nur Hintergrund, der die Fünfergruppen trennt.
    let s = `<rect x="0" y="0" width="${B}" height="${H}" fill="url(#himmel)"/><rect x="0" y="250" width="${B}" height="50" fill="#c5e1a5"/>`;
    // Zickzack von links nach rechts (oben, unten, oben, unten, oben), mit Abstand zwischen den Gruppen
    const pos = [[-56, 92], [-28, 156], [0, 92], [28, 156], [56, 92]];
    for (let k = 0; k < 4; k++) {
      const cx = 103 + k * 198, cy = 236, drin = Math.max(0, Math.min(5, n - k * 5));
      let blume = `<path d="M${cx} ${cy + 10} Q ${cx - 4} 270 ${cx} 300" stroke="#a5d6a7" stroke-width="6" fill="none"/>`;
      for (let b = 0; b < 8; b++) blume += `<ellipse cx="${cx}" cy="${cy - 16}" rx="7" ry="13" fill="${['#fff59d', '#f8bbd0', '#e1bee7', '#ffffff'][k]}" transform="rotate(${b * 45} ${cx} ${cy})"/>`;
      s += `<g opacity=".55">${blume}<circle cx="${cx}" cy="${cy}" r="10" fill="#d7ccc8"/></g>`;
      for (let i = 0; i < drin; i++) {
        const [dx, y] = pos[i], bx = cx + dx;
        s += `<g transform="translate(${bx} ${y}) scale(1.25) translate(${-bx} ${-y})">${biene(bx, y)}</g>`;
      }
    }
    return s;
  }
});

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
  <radialGradient id="kugelBlau" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#90caf9"/><stop offset=".35" stop-color="#1e88e5"/><stop offset="1" stop-color="#0d3c7a"/></radialGradient>
  <radialGradient id="mulde" cx="50%" cy="60%" r="65%"><stop offset="0" stop-color="#fafafa"/><stop offset=".8" stop-color="#e3e8eb"/><stop offset="1" stop-color="#b0bec5"/></radialGradient>
  <radialGradient id="auge" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#546e7a"/><stop offset=".6" stop-color="#263238"/><stop offset="1" stop-color="#111"/></radialGradient>
  <linearGradient id="elfenbein" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fbf7ee"/><stop offset="1" stop-color="#e8e0cc"/></linearGradient>
  <linearGradient id="karton" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef2f4"/></linearGradient>
  <linearGradient id="holz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a1887f"/><stop offset=".5" stop-color="#8d6e63"/><stop offset="1" stop-color="#5d4037"/></linearGradient>
  <filter id="farbe0"><feColorMatrix type="hueRotate" values="0"/></filter>
  <filter id="farbe1"><feColorMatrix type="hueRotate" values="165"/></filter>
  <filter id="farbe2"><feColorMatrix type="hueRotate" values="120"/></filter>
  <filter id="farbe3"><feColorMatrix type="hueRotate" values="200"/></filter>
  <filter id="farbe4"><feColorMatrix type="hueRotate" values="260"/></filter>
  <filter id="farbe5"><feColorMatrix type="hueRotate" values="310"/></filter>
  <linearGradient id="holzRinde" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a1704f"/><stop offset=".45" stop-color="#8d5b3c"/><stop offset="1" stop-color="#4e2f1e"/></linearGradient>
  <linearGradient id="blattGruen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ccc65"/><stop offset="1" stop-color="#388e3c"/></linearGradient>
  <pattern id="kerzeStreifen" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="14" height="14" fill="#e3f2fd"/><rect width="14" height="6" fill="#42a5f5"/></pattern>
  <linearGradient id="karton2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe3cf"/><stop offset="1" stop-color="#cdb898"/></linearGradient>
  <radialGradient id="mulde2" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#bfa98a"/><stop offset="1" stop-color="#e6d6bd"/></radialGradient>
  <linearGradient id="blech" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd8dc"/><stop offset="1" stop-color="#90a4ae"/></linearGradient>
  <linearGradient id="asphalt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78909c"/><stop offset="1" stop-color="#546e7a"/></linearGradient>
  <linearGradient id="nacht" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a237e"/><stop offset="1" stop-color="#3949ab"/></linearGradient>
  <radialGradient id="sternGold" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffde7"/><stop offset=".5" stop-color="#ffd54f"/><stop offset="1" stop-color="#ffa000"/></radialGradient>
  <filter id="leuchten" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#ffeb3b" flood-opacity=".7"/></filter>
  <linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3e5fc"/><stop offset="1" stop-color="#e1f5fe"/></linearGradient>
  <linearGradient id="teich" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#81d4fa"/><stop offset="1" stop-color="#29b6f6"/></linearGradient>
  <radialGradient id="entenGelb" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff9c4"/><stop offset=".5" stop-color="#ffee58"/><stop offset="1" stop-color="#fbc02d"/></radialGradient>
  <linearGradient id="wasser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3e5fc"/><stop offset="1" stop-color="#4fc3f7"/></linearGradient>
  <radialGradient id="flamme" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fffde7"/><stop offset=".45" stop-color="#ffeb3b"/><stop offset="1" stop-color="#ff7043"/></radialGradient>
</defs>`;

/** Gibt das fertige SVG für eine Mengen-Aufgabe zurück */
function mengenSvg(thema, n) {
  const inhalt = (ZEICHNER[thema] || ZEICHNER.punkte)(n);
  return `<svg viewBox="0 0 ${B} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wie viele?">${MENGEN_DEFS}${inhalt}</svg>`;
}
