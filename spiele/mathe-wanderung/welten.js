'use strict';
/* =========================================================
   Mathe-Erlebnisse – die Welten (Wanderungen)
   Jede Welt hat ein gemaltes Hintergrundbild (bilder/welten/, ChatGPT),
   1536 × 1024, unten bündig auf 1600 Breite skaliert. Die eigentliche
   Spielfläche ist 1600 × 520 (unterer Teil des Bildes); auf höheren
   Bildschirmen sieht man oben mehr Himmel.
   Darüber liegen genaue Zeichnungen (SVG) und Bilder (bilder/teile/):
   - hinten:  liegt hinter dem Tier (Maschinen, Schilder, Stufen-Zeichen)
   - vorne:   liegt vor dem Tier (z. B. Steuerpult)
   - wege:    9 Positionen des Tiers: Start und Stufe 1 bis 8 [x, y, Drehung, Grösse]
   - akteur:  was der Kran hebt (Tier, evtl. mit Fahrzeug)
   - stufe(): bewegt Dinge in der Welt (Presse, Spielautomat)
   - feier:   kleiner Zusatz-Effekt, wenn das Level geschafft ist
   Bildkoordinaten → Spielfläche: x = bx · 1600/1536, y = by · 1600/1536 − 546.7 (+ bildVersatz)
   ========================================================= */

const K = '#263238';                       // Filzstift-Kontur
const FIGUREN = '../mathe-fussball/bilder/figuren/';
const KOEPFE = '../mathe-fussball/bilder/tiere/';
const TEILE = 'bilder/teile/';             // Maschinen, Fahrzeuge, Münze … (ChatGPT)
const STUFEN = 8;                           // richtige Antworten pro Level

/* ---------- kleine Zeichen-Helfer ---------- */
const r1 = n => Math.round(n * 10) / 10;
/** 9 Punkte gleichmässig auf einer Strecke */
function strecke(x0, y0, x1, y1, s0 = 1, s1 = s0) {
  return Array.from({ length: STUFEN + 1 }, (_, i) => { const t = i / STUFEN; return [r1(x0 + (x1 - x0) * t), r1(y0 + (y1 - y0) * t), 0, r1(s0 + (s1 - s0) * t)]; });
}
const bildSvg = (datei, x, y, b, h, extra = '') => `<image href="${datei}" x="${r1(x)}" y="${r1(y)}" width="${r1(b)}" height="${r1(h)}" ${extra}/>`;
/** Stufen-Zeichen nur für Stufe 1 bis 7 (Stufe 8 ist das Ziel) */
const zeichen = (wege, fn) => wege.slice(1, STUFEN).map(fn).join('');

/** gelbe Wanderweg-Raute auf einem Pfosten (Stufen-Zeichen) */
function raute(x, y, s = 0.7) {
  return `<g class="marke" transform="translate(${x} ${y}) scale(${s})" stroke="${K}" stroke-width="3" stroke-linejoin="round">
    <rect x="-4" y="-46" width="8" height="46" fill="#a1887f"/><path d="M0 -70 L14 -54 L0 -38 L-14 -54 Z" fill="#fdd835"/></g>`;
}
/** weiss-rot-weisse Markierung auf einem Stein (Bergwanderweg) */
function bergmarke(x, y, s = 1) {
  return `<g class="marke" transform="translate(${x} ${y}) scale(${s})" stroke="${K}" stroke-width="3" stroke-linejoin="round">
    <path d="M-22 0 Q-24 -24 -6 -28 Q18 -30 22 -10 Q24 0 18 0 Z" fill="#9e9e9e"/>
    <rect x="-12" y="-22" width="24" height="15" fill="#fff" stroke-width="1.5"/><rect x="-12" y="-17.5" width="24" height="6" fill="#e53935" stroke="none"/></g>`;
}
function steinmann(x, y, s = 0.6) {
  return `<g class="marke" transform="translate(${x} ${y}) scale(${s})" stroke="${K}" stroke-width="3">
    <ellipse cx="0" cy="-8" rx="20" ry="9" fill="#8d6e63"/><ellipse cx="2" cy="-22" rx="15" ry="8" fill="#a1887f"/><ellipse cx="-1" cy="-34" rx="10" ry="6" fill="#8d6e63"/></g>`;
}
function faehnchen(x, y, s = 0.7, farbe = '#e53935') {
  return `<g class="marke" transform="translate(${x} ${y}) scale(${s})" stroke="${K}" stroke-width="2.5"><rect x="-2" y="-40" width="4" height="40" fill="#fff"/><path d="M2 -40 L22 -33 L2 -26 Z" fill="${farbe}"/></g>`;
}
function zielfahne(x, y, s = 1) {
  let felder = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) if ((r + c) % 2 === 0) felder += `<rect x="${4 + c * 14}" y="${-150 + r * 12}" width="14" height="12" fill="${K}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke-linejoin="round">
    <rect x="-4" y="-156" width="8" height="156" fill="#eceff1" stroke="${K}" stroke-width="3"/>
    <g class="weht"><rect x="4" y="-150" width="84" height="48" fill="#fff" stroke="${K}" stroke-width="3"/>${felder}</g></g>`;
}
/** Schweizer Fahne (quadratisch, Kreuz: Arme 1/6 länger als breit) */
function schweizerFahne(x, y, gr = 54) {
  const e = gr / 32;
  return `<g transform="translate(${x} ${y})" stroke-linejoin="round">
    <rect x="-3" y="${-gr - 50}" width="6" height="${gr + 50}" fill="#bdbdbd" stroke="${K}" stroke-width="2.5"/>
    <circle cx="0" cy="${-gr - 52}" r="5" fill="#ffd54f" stroke="${K}" stroke-width="2"/>
    <g class="weht"><rect x="3" y="${-gr - 46}" width="${gr}" height="${gr}" fill="#da291c" stroke="${K}" stroke-width="2.5"/>
    <path d="M${3 + 13 * e} ${-gr - 46 + 6 * e} h${6 * e} v${7 * e} h${7 * e} v${6 * e} h${-7 * e} v${7 * e} h${-6 * e} v${-7 * e} h${-7 * e} v${-6 * e} h${7 * e} Z" fill="#fff"/></g></g>`;
}
/** schwarz-weiss kariertes Band (senkrecht) */
function karoBand(x, y, b, h, feld = 16) {
  let s = `<rect x="${x}" y="${y}" width="${b}" height="${h}" fill="#fff" stroke="${K}" stroke-width="3"/>`;
  for (let r = 0; r * feld < h; r++) for (let c = 0; c * feld < b; c++) if ((r + c) % 2 === 0)
    s += `<rect x="${x + c * feld}" y="${y + r * feld}" width="${Math.min(feld, b - c * feld)}" height="${Math.min(feld, h - r * feld)}" fill="${K}"/>`;
  return s;
}

/* =========================================================
   Hebel: das Tier legt den Hebel wirklich mit der Faust um (Spielautomat, Presse).
   Pose A = greift den Knauf oben, Pose B = zieht ihn herunter (ChatGPT, bilder/hebel/).
   Die Posen werden so hingestellt, dass die Faust genau am Knauf liegt.
   ========================================================= */
const HEBEL_BILDER = 'bilder/hebel/';
/* Masse der Posen in Spiel-Pixeln: Breite, Höhe, Faust (von oben links, Tier schaut nach rechts) */
const HEBEL_MASSE = {"baer":{"a":{"b":156.0,"h":200.0,"fx":142.0,"fy":58.7},"b":{"b":152.4,"h":195.9,"fx":127.0,"fy":118.7}},"loewe":{"a":{"b":181.3,"h":200.0,"fx":167.1,"fy":63.3},"b":{"b":159.1,"h":194.2,"fx":134.2,"fy":112.2}},"tiger":{"a":{"b":170.5,"h":200.0,"fx":156.6,"fy":59.7},"b":{"b":155.3,"h":191.9,"fx":123.0,"fy":121.0}},"elefant":{"a":{"b":176.2,"h":200.0,"fx":161.8,"fy":64.1},"b":{"b":162.2,"h":196.3,"fx":137.5,"fy":112.1}},"fuchs":{"a":{"b":174.9,"h":200.0,"fx":160.3,"fy":68.3},"b":{"b":150.4,"h":198.6,"fx":122.9,"fy":99.8}},"wolf":{"a":{"b":181.0,"h":200.0,"fx":166.2,"fy":66.2},"b":{"b":154.8,"h":199.5,"fx":127.1,"fy":117.1}},"adler":{"a":{"b":174.2,"h":193.1,"fx":160.9,"fy":76.6},"b":{"b":148.8,"h":200.0,"fx":135.5,"fy":103.9}},"hai":{"a":{"b":177.7,"h":197.3,"fx":163.6,"fy":76.6},"b":{"b":168.6,"h":200.0,"fx":154.5,"fy":103.3}},"erdmaennchen":{"a":{"b":159.6,"h":194.3,"fx":145.9,"fy":76.3},"b":{"b":150.8,"h":200.0,"fx":120.4,"fy":120.9}}};
const tierJetzt = () => (typeof S !== 'undefined' && S ? S.tier : null);
/** Lage von Posen und Hebel in der Welt.
    welt.hebel = { x, y: Drehpunkt; kipp: Knauf oben seitlich versetzt; boden: Füsse (oder faustOben: Höhe des Knaufs oben); links: Tier schaut nach links } */
function hebelLage(welt, tier) {
  const m = tier && HEBEL_MASSE[tier]; if (!m || !welt.hebel) return null;
  const { x, y, kipp = 0, links } = welt.hebel;
  const boden = welt.hebel.boden != null ? welt.hebel.boden : welt.hebel.faustOben - m.a.fy + m.a.h;
  const knaufX = x + kipp;
  const faust = (p, left) => left + (links ? p.b - p.fx : p.fx);
  // Pose A: Faust am Knauf oben. Pose B: Körper bleibt am selben Ort, der Knauf geht mit der Faust zum Tier hin und nach unten
  const a = { left: knaufX - faust(m.a, 0), top: boden - m.a.h, b: m.a.b, h: m.a.h };
  const mitte = a.left + a.b / 2;
  const b = { left: mitte - m.b.b / 2, top: boden - m.b.h, b: m.b.b, h: m.b.h };
  const knaufA = a.top + m.a.fy, knaufBX = faust(m.b, b.left), knaufB = b.top + m.b.fy;
  // Drehung und Länge der Stange von oben nach unten (um den Drehpunkt)
  const wA = Math.atan2(knaufA - y, knaufX - x), wB = Math.atan2(knaufB - y, knaufBX - x);
  let dreh = (wB - wA) * 180 / Math.PI; if (dreh > 180) dreh -= 360; if (dreh < -180) dreh += 360;
  const streck = Math.hypot(knaufBX - x, knaufB - y) / Math.hypot(knaufX - x, knaufA - y);
  return { a, b, knaufX, knaufA, knaufBX, knaufB, drehX: x, drehY: y, dreh, streck, boden, mitte, links: !!links };
}
/** Hebelstange mit rotem Knauf; beim Ziehen schwenkt die Stange um den Drehpunkt zum Tier hin, der Knauf folgt der Faust */
function hebelSvg(L) {
  const st = (dx, w, farbe, extra = '') => `<path d="M${r1(L.drehX + dx)} ${r1(L.drehY)} L${r1(L.knaufX + dx)} ${r1(L.knaufA)}" stroke="${farbe}" stroke-width="${w}" stroke-linecap="round" vector-effect="non-scaling-stroke"${extra}/>`;
  return `<g class="hebel-stange" style="transform-origin:${r1(L.drehX)}px ${r1(L.drehY)}px;--zug:rotate(${r1(L.dreh)}deg) scale(${L.streck.toFixed(3)})">
      ${st(0, 12, K)}${st(0, 6, '#cfd8dc')}${st(-1.5, 1.5, '#fff', ' opacity=".8"')}</g>
    <g class="hebel-knauf" style="--weg:translate(${r1(L.knaufBX - L.knaufX)}px, ${r1(L.knaufB - L.knaufA)}px)" stroke="${K}" stroke-width="3">
      <circle cx="${r1(L.knaufX)}" cy="${r1(L.knaufA)}" r="14" fill="#e53935"/><circle cx="${r1(L.knaufX - 4)}" cy="${r1(L.knaufA - 5)}" r="4" fill="#fff" stroke="none" opacity=".7"/></g>`;
}
/** Die beiden Posen (nur beim Ziehen sichtbar). nurFaust = id: nur die Faust zeigen (vor dem Steuerpult) */
function hebelPosen(L, tier, nurFaust) {
  return ['a', 'b'].map(n => {
    const p = L[n], spiegel = L.links ? ` transform="translate(${r1(2 * p.left + p.b)} 0) scale(-1 1)"` : '';
    let clip = '';
    if (nurFaust) {
      const kx = n === 'a' ? L.knaufX : L.knaufBX, ky = n === 'a' ? L.knaufA : L.knaufB;
      clip = ` clip-path="url(#${nurFaust}-${n})"`;
      return `<clipPath id="${nurFaust}-${n}"><circle cx="${r1(kx)}" cy="${r1(ky)}" r="22"/></clipPath><g class="pose-${n}"${clip}><image href="${HEBEL_BILDER}${tier}-${n}.png" x="${r1(p.left)}" y="${r1(p.top)}" width="${r1(p.b)}" height="${r1(p.h)}"${spiegel}/></g>`;
    }
    return `<image class="pose-${n}" href="${HEBEL_BILDER}${tier}-${n}.png" x="${r1(p.left)}" y="${r1(p.top)}" width="${r1(p.b)}" height="${r1(p.h)}"${spiegel}/>`;
  }).join('');
}

/* =========================================================
   Die Welten
   ========================================================= */
const WELTEN = {};

/* ---------- 1. Dorf Zuzwil (kommt immer zuerst) ---------- */
WELTEN.zuzwil = {
  name: 'Zuzwil', art: 'laufen', feier: 'feuerwerk',
  bild: 'bilder/welten/zuzwil.jpg', himmelOben: '#1e88e5',
  wege: strecke(330, 456, 1330, 456),
  hinten() {
    return zeichen(this.wege, ([x]) => raute(x + 40, 404)) + ortsschild(1478, 408, 'Zuzwil', 0.9);
  }
};
/** Schweizer Ortsschild: blau, weisse Umrandung, weisse Schrift, auf einer Metallstele. x = Mitte, y = Boden */
function ortsschild(x, y, name, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-10" y="-200" width="20" height="200" fill="#9ea7ad" stroke="${K}" stroke-width="4"/>
    <rect x="-6" y="-200" width="5" height="200" fill="#cfd8dc"/>
    <rect x="-130" y="-290" width="260" height="96" rx="8" fill="#1f4e9d" stroke="${K}" stroke-width="4"/>
    <rect x="-121" y="-281" width="242" height="78" rx="5" fill="none" stroke="#fff" stroke-width="5"/>
    <text x="0" y="-226" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="50" fill="#fff" letter-spacing="1">${name}</text></g>`;
}

/* ---------- 2. Die Presse (kommt immer als zweites) ---------- */
/* Rahmen 460×420 → 420 breit (0.913); Innenraum x 831–1064, Grundplatte oben bei y 382 */
const PRESSE = { mitte: 950, boden: 450, rs: 420 / 460, amboss: 388, doseH: 150, doseB: 64, schritt: 15, druck: 5 };   // amboss = Oberkante Grundplatte (gemessen); druck = Stempel liegt so viel auf der Dose auf
WELTEN.presse = {
  name: 'Die Presse', art: 'fest', feier: 'funken',
  bild: 'bilder/welten/presse.jpg', himmelOben: '#7d8a96',
  // Hebel im Schlitz des Steuerpults (Drehpunkt unten im Schlitz, Knauf oben); das Tier steht hinter dem Pult
  hebel: { x: 465, y: 356, kipp: 2, faustOben: 252 },   // Schlitz im Pult: x 465, y 334–363
  get wege() { const L = hebelLage(this, tierJetzt()); return L ? strecke(r1(L.mitte), r1(L.boden), r1(L.mitte), r1(L.boden)) : strecke(420, 412, 420, 412); },
  hinten() {
    const { mitte, boden, rs, amboss, doseH, doseB } = PRESSE;
    const L = hebelLage(this, tierJetzt());
    const rb = 460 * rs, rh = 420 * rs, rx = mitte - rb / 2, ry = boden - rh;
    const balkenUnten = ry + 135 * rs;
    // Pressplatte: 420×387 → so breit wie der Innenraum; die Stange verschwindet hinter dem Querbalken
    const pb = 233, ph = 387 * pb / 420, plattenUnten = amboss - doseH + PRESSE.druck;
    let skala = '';
    for (let s = 1; s <= STUFEN; s++) {
      const y = plattenUnten + s * PRESSE.schritt;
      skala += `<line class="marke" x1="${rx + rb - 4}" y1="${y}" x2="${rx + rb + (s % 4 ? 8 : 14)}" y2="${y}" stroke="${K}" stroke-width="3"/>`;
    }
    return `<defs><clipPath id="w-pr-unter-balken"><rect x="0" y="${balkenUnten - 6}" width="1600" height="520"/></clipPath></defs>
      <g clip-path="url(#w-pr-unter-balken)"><g class="stempel" style="transform:translateY(0px)">
        ${bildSvg(TEILE + 'presse-platte.png', mitte - pb / 2, plattenUnten - ph, pb, ph)}
        <path d="M${rx + rb + 16} ${plattenUnten} l18 -9 v18 Z" fill="#e53935" stroke="${K}" stroke-width="2.5"/></g></g>
      ${bildSvg(TEILE + 'presse-rahmen.png', rx, ry, rb, rh)}
      ${skala}
      <g class="dose" transform="translate(${mitte} ${amboss})"><g class="dose-form">
        ${bildSvg(TEILE + 'dose.png', -doseB / 2, -doseH, doseB, doseH, 'preserveAspectRatio="none"')}
        <g class="knitter" fill="none" stroke="${K}" stroke-width="2.5" stroke-linejoin="round" opacity="0">
          <path d="M-32 -120 L-20 -110 L-30 -98 L-18 -88 L-31 -74 L-19 -62 L-32 -48"/>
          <path d="M32 -126 L22 -114 L31 -102 L21 -92 L32 -78 L23 -66 L32 -52"/>
          <path d="M-8 -116 L2 -106 L-6 -92 M6 -80 L14 -70 L8 -58"/></g></g></g>
      ${L ? hebelPosen(L, tierJetzt()) : ''}`;
  },
  vorne() {
    // Steuerpult ohne Hebel (1295×804 → 240 breit; der Hebel ist eine eigene Zeichnung) mit dickem Kabel zur Steckdose an der Presse
    const pb = 240, ph = 804 * pb / 1295, px = 290, py = 455 - ph;
    const kx = px + 1290 * pb / 1295, ky = py + 770 * pb / 1295;    // Ende des gemalten Kabelstücks rechts am Pult
    const zx = PRESSE.mitte - 205, zy = 436;                          // Anschlussdose an der Grundplatte der Presse
    // Kabel: dunkle Kontur, Gummi-Körper mit Glanzlicht; an beiden Enden ein Knickschutz, vorne ein Stecker in der Steckdose
    const kabel = `M${kx - 4} ${ky} C ${kx + 40} ${ky + 2}, ${kx + 60} 472, ${(kx + zx) / 2 + 10} 468 S ${zx - 70} ${zy}, ${zx - 34} ${zy}`;
    const rippen = n => Array.from({ length: n }, (_, i) => `<line x1="${4 + i * 5}" y1="-7" x2="${4 + i * 5}" y2="7" stroke="#11171a" stroke-width="1.5"/>`).join('');
    return `<path d="${kabel}" fill="none" stroke="#11171a" stroke-width="14" stroke-linecap="round"/>
      <path d="${kabel}" fill="none" stroke="#37474f" stroke-width="9" stroke-linecap="round"/>
      <path d="${kabel}" fill="none" stroke="#90a4ae" stroke-width="2" stroke-linecap="round" opacity=".55" transform="translate(-1 -2.5)"/>
      <g transform="translate(${kx - 8} ${ky})" stroke="#11171a" stroke-width="2.5" stroke-linejoin="round">
        <rect x="-2" y="-9" width="26" height="18" rx="5" fill="#263238"/><g>${rippen(4)}</g></g>
      <g transform="translate(${zx - 40} ${zy})" stroke="#11171a" stroke-width="2.5" stroke-linejoin="round">
        <rect x="0" y="-9" width="24" height="18" rx="5" fill="#263238"/>${rippen(4)}
        <rect x="22" y="-11" width="16" height="22" rx="3" fill="#ffb300"/><rect x="25" y="-7" width="3" height="14" fill="#ffe082" stroke="none"/></g>
      <g stroke="${K}" stroke-width="3" stroke-linejoin="round">
        <rect x="${zx - 3}" y="${zy - 16}" width="14" height="32" rx="3" fill="#78909c"/>
        <circle cx="${zx + 4}" cy="${zy - 10}" r="2" fill="#cfd8dc" stroke-width="1"/><circle cx="${zx + 4}" cy="${zy + 10}" r="2" fill="#cfd8dc" stroke-width="1"/></g>
      ${bildSvg(TEILE + 'presse-pult.png', px, py, pb, ph)}
      ${(() => { const L = hebelLage(this, tierJetzt()); return L ? hebelSvg(L) + hebelPosen(L, tierJetzt(), 'w-pr-faust') : ''; })()}`;
  },
  stufe(n, el) {
    const { doseH, schritt } = PRESSE;
    const h = doseH - n * schritt;                // 150 → 30
    el.hinten.querySelector('.dose-form').style.transform = `scale(${1 + n * 0.07}, ${h / doseH})`;
    el.hinten.querySelector('.knitter').style.opacity = Math.min(1, n / 4);
    el.hinten.querySelector('.stempel').style.transform = `translateY(${n * schritt}px)`;
  }
};

/* ---------- Vulkan ---------- */
WELTEN.vulkan = {
  name: 'Vulkan', art: 'laufen', feier: 'funken',
  bild: 'bilder/welten/vulkan.jpg', himmelOben: '#c62828',
  wege: strecke(330, 462, 1330, 462),
  hinten() { return zeichen(this.wege, ([x]) => steinmann(x + 40, 372)) + zielfahne(1440, 382, 0.8); }
};

/* ---------- Wüste ---------- */
WELTEN.wueste = {
  name: 'Wüste', art: 'laufen', feier: 'sterne',
  bild: 'bilder/welten/wueste.jpg', himmelOben: '#1e88e5',
  wege: strecke(330, 465, 1240, 465),
  hinten() {
    return zeichen(this.wege, ([x]) => `<g class="marke" stroke="${K}" stroke-width="2.5"><ellipse cx="${x + 40}" cy="372" rx="13" ry="6" fill="#bcaaa4"/><ellipse cx="${x + 50}" cy="369" rx="7" ry="4" fill="#d7ccc8"/></g>`);
  }
};

/* ---------- Schweizer Berge (Bild 200 nach unten verschoben, damit der Gipfel sichtbar ist) ---------- */
WELTEN.berge = {
  name: 'Schweizer Berge', art: 'laufen', feier: 'sterne',
  bild: 'bilder/welten/berge.jpg', himmelOben: '#1e88e5', bildVersatz: 200,
  wege: [[437, 492, 0, 1], [667, 468, 0, 0.93], [917, 426, 0, 0.86], [896, 375, 0, 0.8], [1042, 330, 0, 0.74],
    [1120, 299, 0, 0.68], [1042, 255, 0, 0.62], [1198, 200, 0, 0.56], [1250, 120, 0, 0.5]],
  hinten() {
    return zeichen(this.wege, ([x, y, , s]) => bergmarke(x + 30 * s, y - 2, s * 0.6)) + schweizerFahne(1292, 118, 42);
  }
};

/* ---------- Stadt Aadorf mit Bahnhof ---------- */
WELTEN.aadorf = {
  name: 'Aadorf', art: 'laufen', feier: 'feuerwerk',
  bild: 'bilder/welten/aadorf.jpg', himmelOben: '#1e88e5',
  wege: strecke(330, 468, 1180, 468),
  hinten() {
    return zeichen(this.wege, ([x]) => `<g class="marke" stroke="${K}" stroke-width="2.5"><rect x="${x + 44}" y="400" width="10" height="26" rx="4" fill="#78909c"/><rect x="${x + 44}" y="406" width="10" height="5" fill="#e53935" stroke-width="1"/></g>`)
      // Ortsname auf der blauen Tafel des Bahnhofs (genau, nicht gemalt)
      + `<rect x="1101" y="113" width="184" height="42" rx="9" fill="#1d3f9e"/>
         <rect x="1106" y="118" width="174" height="32" rx="6" fill="none" stroke="#fff" stroke-width="2.5"/>
         <text x="1193" y="145" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="28" fill="#fff">Aadorf</text>`;
      // der Schriftzug «Zuzi-Bahn» ist perspektivisch auf das rote Band des Zugs gesetzt (im Bild)
  }
};

/* ---------- Boot zur Insel (fährt nach hinten auf den Strand zu, wird kleiner) ---------- */
WELTEN.boot = {
  name: 'Bootsfahrt', art: 'fahren', fahrzeug: 'boot',
  bild: 'bilder/welten/boot.jpg', himmelOben: '#1e88e5',
  wege: Array.from({ length: STUFEN + 1 }, (_, i) => { const t = i / STUFEN; return [r1(380 + 720 * t), r1(470 - 262 * Math.pow(t, 1.15)), 0, r1(1 - 0.47 * t)]; }),
  hinten() {
    return zeichen(this.wege, ([x, y, , s]) => `<g class="marke schaukelt"><g stroke="${K}" stroke-width="2"><path d="M${x + 140 * s} ${y - 6} a${8 * s} ${8 * s} 0 0 1 ${16 * s} 0Z" fill="#e53935"/><path d="M${x + 140 * s} ${y - 6} a${8 * s} ${8 * s} 0 0 0 ${16 * s} 0Z" fill="#fff"/></g></g>`);
  }
};

/* ---------- Strand-Buggy über die Schanze ---------- */
const SCHANZE = { x: 860, b: 240, boden: 458 };        // Schanze 400×155 → 240 breit, 93 hoch
WELTEN.motorrad = {
  name: 'Buggy-Sprung', art: 'fahren', fahrzeug: 'buggy', feier: 'sterne',
  bild: 'bilder/welten/motorrad.jpg', himmelOben: '#1e88e5',
  wege: [...Array.from({ length: 7 }, (_, i) => [300 + i * 75, 458, 0, 1]),   // vor der Schanze (Vorderrad noch nicht auf der Rampe)
    [990, 408, -21.3, 1],                                               // auf der Schanze: beide Räder auf der Rampenkante (Räder auf der Mitte der Holzbahn, geprüft)
    [1470, 458, 0, 1]],                                                 // nach dem Sprung auf der Strasse
  bogen: { 8: 190 },
  hinten() {
    const { x, b, boden } = SCHANZE, h = 155 * b / 400;
    return zeichen(this.wege.slice(0, 7), ([wx]) => `<g class="marke" stroke="${K}" stroke-width="2.5" stroke-linejoin="round" transform="translate(${wx - 40} 452) scale(.6)"><path d="M-14 0 L-4 -36 L4 -36 L14 0 Z" fill="#ff6d00"/><path d="M-9 -16 H9" stroke="#fff" stroke-width="5"/><rect x="-18" y="-4" width="36" height="6" fill="#ff6d00"/></g>`)
      + bildSvg(TEILE + 'schanze.png', x, boden - h, b, h)
      // Landerampe: gespiegelt
      + `<g transform="translate(${1210 + b * 0.75} 0) scale(-1 1)">${bildSvg(TEILE + 'schanze.png', 0, boden - h * 0.75, b * 0.75, h * 0.75)}</g>`
      + zielfahne(1560, 462, 0.7);
  }
};

/* ---------- U-Boot zur Boje (Bild 80 nach unten verschoben, damit die Wasseroberfläche sichtbar ist) ---------- */
WELTEN.uboot = {
  name: 'U-Boot', art: 'fahren', fahrzeug: 'uboot', feier: 'blasen',
  bild: 'bilder/welten/uboot.jpg', himmelOben: '#1e88e5', bildVersatz: 80,
  wege: strecke(370, 340, 1080, 270),
  hinten() {
    return zeichen(this.wege, ([x, y]) => `<g class="marke" fill="none" stroke="#e1f5fe" stroke-width="2.5"><circle cx="${x + 30}" cy="${y - 190}" r="6"/><circle cx="${x + 42}" cy="${y - 206}" r="4"/></g>`)
      + `<path d="M1300 505 Q1312 300 1300 74" fill="none" stroke="#455a64" stroke-width="5" stroke-dasharray="10 5"/>
         <rect x="1272" y="495" width="56" height="26" rx="4" fill="#78909c" stroke="${K}" stroke-width="3"/>
         <g class="schaukelt" stroke="${K}" stroke-width="3" stroke-linejoin="round">
          <path d="M1276 68 Q1300 88 1324 68 L1316 48 L1284 48 Z" fill="#e53935"/>
          <rect x="1289" y="30" width="22" height="18" fill="#fff"/><rect x="1292" y="18" width="16" height="13" fill="#e53935"/>
          <circle cx="1300" cy="12" r="5" fill="#ffeb3b" class="blinkt"/></g>`;
  }
};

/* ---------- Jogging zum Ziel ---------- */
WELTEN.joggen = {
  name: 'Jogging', art: 'laufen', joggt: true, feier: 'ballone',
  bild: 'bilder/welten/joggen.jpg', himmelOben: '#1e88e5',
  wege: strecke(330, 452, 1440, 452),   // Stufe 8: das Tier steht auf der Ziellinie
  hinten() {
    return zeichen(this.wege, ([x]) => `<path class="marke" d="M${x + 60} 330 l-12 190" stroke="#fff" stroke-width="4" opacity=".6"/>`)
      // die karierte Ziellinie ist auf die Bahn gesprüht (im Bild, bei x ≈ 1453); darüber das Zielband
      + `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <rect x="1365" y="220" width="20" height="200" fill="#eceff1"/><rect x="1525" y="220" width="20" height="200" fill="#eceff1"/>
          <rect x="1359" y="204" width="192" height="60" rx="8" fill="#1e88e5"/></g>
         <text x="1455" y="249" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="40" fill="#fff">ZIEL</text>`;
  }
};

/* ---------- Kunstflug: zwei Möwen tragen je ein kariertes Zielfähnchen ---------- */
WELTEN.flugzeug = {
  name: 'Kunstflug', art: 'fahren', fahrzeug: 'flugzeug', looping: true, feier: 'sterne',
  bild: 'bilder/welten/flugzeug.jpg', himmelOben: '#1e88e5',
  wege: Array.from({ length: STUFEN + 1 }, (_, i) => [360 + i * 88, i % 2 ? 270 : 295, 0, 1]),
  hinten() {
    // Möwe mit Zielfähnchen (ChatGPT): 4 Bilder eines Flügelschlags im Wechsel; Stab-Ende bei (x, y)
    const moewe = (x, y, verz) => {
      const b = 120, h = 123, ax = 54.7, ay = 121;
      return `<g class="moewe4" style="--v:${verz}s">${[1, 2, 3, 4].map(i => bildSvg(TEILE + `moewe-${i}.png`, x - ax, y - ay, b, h, `class="m${i}"`)).join('')}</g>`;
    };
    return zeichen(this.wege, ([x, y]) => `<g class="marke" fill="#fff" stroke="${K}" stroke-width="1.5" opacity=".8"><circle cx="${x}" cy="${y - 130}" r="6"/><circle cx="${x + 10}" cy="${y - 133}" r="4.5"/></g>`)
      + moewe(1240, 190, 0) + moewe(1262, 440, -0.21);
  }
};

/* ---------- Schlitten: das Tier sitzt auf dem Schlitten und fährt zur Ziellinie im Schnee ---------- */
WELTEN.schlitten = {
  name: 'Schlittenfahrt', art: 'fahren', fahrzeug: 'schlitten', feier: 'schnee',
  bild: 'bilder/welten/schlitten.jpg', himmelOben: '#29b6f6',
  wege: strecke(330, 470, 1300, 470),
  hinten() {
    const flocken = Array.from({ length: 24 }, (_, i) => `<circle class="flocke" style="--v:${-(i * 1.7) % 9}s;--dx:${(i % 5) * 12 - 24}px" cx="${(i * 97) % 1600}" cy="-10" r="${2.5 + i % 3}" fill="#fff"/>`).join('');
    // die rote Ziellinie ist in den Schnee gesprüht (im Bild, ChatGPT)
    return zeichen(this.wege, ([x]) => faehnchen(x + 40, 372, 0.55))
      + `<g class="flocken">${flocken}</g>`;
  }
};

/* ---------- Gleitschirm zum Landeplatz (Wiese mit Windsack im Bild) ---------- */
WELTEN.gleitschirm = {
  name: 'Gleitschirm', art: 'fahren', fahrzeug: 'gleitschirm', feier: 'sterne',
  bild: 'bilder/welten/gleitschirm.jpg', himmelOben: '#1e88e5',
  // Landeplatz ist ins Gras gesprüht (im Bild, Mitte bei x 1299, y 347)
  wege: Array.from({ length: STUFEN + 1 }, (_, i) => { const t = i / STUFEN; return [r1(380 + 920 * t), r1(260 + 94 * Math.pow(t, 1.3)), 0, r1(0.8 + 0.08 * t)]; }),
  hinten() {
    return zeichen(this.wege, ([x, y, , s]) => `<circle class="marke" cx="${x + 20}" cy="${y - 260 * s}" r="4" fill="#fff" opacity=".7"/>`)
      + windsack(1490, 372);
  }
};
/** Windsack an einem Mast, der sich leicht im Wind bewegt (x, y = Fuss des Masts) */
function windsack(x, y) {
  const streifen = [0, 1, 2, 3, 4].map(i => {
    const x0 = 6 + i * 16, h0 = 15 - i * 2, h1 = 15 - (i + 1) * 2;
    return `<path d="M${x0} ${-h0} L${x0 + 16} ${-h1} L${x0 + 16} ${h1} L${x0} ${h0} Z" fill="${i % 2 ? '#fff' : '#e53935'}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y})">
    <rect x="-3" y="-120" width="6" height="120" fill="#b0bec5" stroke="${K}" stroke-width="2"/>
    <g transform="translate(0 -112)"><g class="windsack">${streifen}
      <path d="M6 -15 L86 -5 L86 5 L6 15 Z" fill="none" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="6" cy="0" rx="4" ry="15" fill="#c62828" stroke="${K}" stroke-width="2"/></g></g></g>`;
}

/* ---------- Spielautomat (Gewinn erst am Ende des Levels) ---------- */
/* Automat 328×380 → 200 hoch (normale Grösse, das Tier reicht an den Hebel). Walzenfenster bei x 90/166/242 (Bild) */
const AUTOMAT = { x: 680, y: 270, s: 200 / 380 };   // Automat und Tier zusammen in der Bildmitte
const WALZEN = ['🍒', '🍋', '🔔', '⭐', '💎', '7'];
WELTEN.spielautomat = {
  name: 'Spielautomat', art: 'fest', blickLinks: true, feier: 'muenzen',
  bild: 'bilder/welten/spielautomat.jpg', himmelOben: '#0d1b4f',
  // Hebel rechts am Automaten; das Tier steht rechts davon und schaut nach links
  hebel: { x: 680 + 328 * 200 / 380 + 4, y: 382, kipp: 6, boden: 472, links: true },
  get wege() { const L = hebelLage(this, tierJetzt()); const x = L ? r1(L.mitte) : 930; return strecke(x, 472, x, 472); },
  hinten() {
    const { x, y, s } = AUTOMAT;
    const walze = bx => `<text class="walze" x="${r1(x + bx * s)}" y="${r1(y + 196 * s)}" text-anchor="middle" font-size="${r1(54 * s)}" font-family="Arial, sans-serif" font-weight="900" fill="#d50000">7</text>`;
    const birnen = Array.from({ length: STUFEN }, (_, i) => `<circle class="birne marke" cx="${r1(x + 44 * s + i * 30 * s)}" cy="${r1(y - 8)}" r="5" stroke="${K}" stroke-width="2"/>`).join('');
    return bildSvg(TEILE + 'automat.png', x, y, 328 * s, 380 * s)
      + [90, 166, 242].map(walze).join('') + birnen
      // Hebel (eigene Zeichnung) mit Halterung am Automaten, davor die beiden Zieh-Posen des Tiers
      + (() => { const L = hebelLage(this, tierJetzt()); if (!L) return '';
        return `<rect x="${r1(L.drehX - 8)}" y="${r1(L.drehY - 14)}" width="16" height="28" rx="4" fill="#ffb300" stroke="${K}" stroke-width="3"/>`
          + hebelSvg(L) + hebelPosen(L, tierJetzt()); })()
      + `<g class="muenzen"></g>`;
  },
  stufe(n, el, sofort) {
    el.hinten.querySelectorAll('.birne').forEach((b, i) => b.classList.toggle('an', i < n));
    const walzen = [...el.hinten.querySelectorAll('.walze')];
    if (sofort) { walzen.forEach((w, i) => { w.textContent = WALZEN[i % 5]; }); return; }
    // Walzen drehen sich kurz – erst bei Stufe 8 kommt dreimal die 7
    let ziel;
    if (n >= STUFEN) ziel = ['7', '7', '7'];
    else { do { ziel = walzen.map(() => waehle(WALZEN)); } while (ziel[0] === ziel[1] && ziel[1] === ziel[2]); }
    walzen.forEach((w, i) => {
      let k = 0;
      const t = setInterval(() => { w.textContent = WALZEN[(k++ + i * 2) % WALZEN.length]; }, 70);
      setTimeout(() => { clearInterval(t); w.textContent = ziel[i]; }, 450 + i * 220);
    });
    el.hinten.classList.toggle('jackpot', n >= STUFEN);
  }
};

/* =========================================================
   Akteure: Tier mit (oder ohne) Fahrzeug.
   Gibt { b, h, html, haken } zurück: Breite, Höhe, Inhalt und die Höhe
   des Aufhängepunkts für den Kran (von unten gemessen): Dort greift der
   Kranhaken hinten am Rücken ein (der Kran liegt hinter dem Tier).
   Ankerpunkt ist immer unten in der Mitte.
   ========================================================= */
const teil = (datei, x, y, b, h, klasse = '') => `<img class="teil-bild ${klasse}" src="${TEILE}${datei}" alt="" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(b)}px;height:${r1(h)}px">`;
/** Fahrzeug mit Tier als ein Bild (bilder/fahrzeuge/<art>-<tier>.png), unten bündig */
const FAHRZEUGE = 'bilder/fahrzeuge/';
/* Lage der Schiffsschraube im Bootsbild (Bild-Pixel, 440 breit): x, y, Breite, Höhe */
/* Propeller im Flugzeugbild (Bild-Pixel, 440 breit): x, y, Breite, Höhe, Höhe der Nabe im Stück */
const FLUG_PROPELLER = {"baer":[397,46,43,206,102],"loewe":[397,46,43,207,102],"tiger":[397,46,43,206,102],"elefant":[395,34,45,212,109],"fuchs":[395,35,45,211,108],"wolf":[394,35,46,210,107],"adler":[392,36,48,206,108],"hai":[391,36,49,206,108],"erdmaennchen":[392,35,48,207,110]};
/* Höhe der Fahrzeugbilder (Bild-Pixel), damit die Teile genau sitzen (die Bilder stehen unten bündig) */
const FLUG_HOEHE = {"baer":311,"loewe":312,"tiger":311,"elefant":306,"fuchs":306,"wolf":305,"adler":305,"hai":305,"erdmaennchen":306}, BOOT_HOEHE = {"baer":322,"loewe":330,"tiger":320,"elefant":308,"fuchs":314,"wolf":313,"adler":305,"hai":300,"erdmaennchen":301};
const BOOT_SCHRAUBE = {"baer":[0,259,26,57],"loewe":[0,263,26,61],"tiger":[0,253,26,61],"elefant":[0,249,26,55],"fuchs":[0,255,26,55],"wolf":[0,255,26,54],"adler":[0,252,26,51],"hai":[0,247,26,51],"erdmaennchen":[0,248,26,51]};
const fahrt = (art, tier, b, x = 0, klasse = '') => `<img class="teil-bild fahrt ${klasse}" src="${FAHRZEUGE}${art}-${tier}.png" alt="" style="left:${r1(x)}px;bottom:0;width:${r1(b)}px;height:auto">`;
function figur(tier, b, h, x = 0, y = 0) {
  return `<img class="tier-figur" src="${FIGUREN}${tier}-stehen.png" alt="" style="left:${x}px;top:${y}px;width:${b}px;height:${h}px">`;
}
function akteur(welt, tier) {
  const art = welt.fahrzeug || welt.art;
  if (art === 'buggy') {        // Tier sitzt vorne am Steuer und lehnt sich leicht hinaus (ein Bild pro Tier, ChatGPT, 420 breit)
    const b = 260, h = 202;
    return { b, h, haken: 118, html: fahrt('buggy', tier, b) };
  }
  if (art === 'boot') {         // Tier sitzt am Steuer (ein Bild pro Tier, ChatGPT, 440 breit)
    const b = 300, h = 222, k = b / 440, [sx, sy, sb, sh] = BOOT_SCHRAUBE[tier] || [0, 0, 0, 0];
    // die Schiffsschraube am Aussenborder ist ein eigenes Bildstück und dreht sich
    return { b, h, haken: 150, html: (sb ? `<img class="teil-bild propeller" src="${FAHRZEUGE}boot-${tier}-schraube.png" alt="" style="left:${r1(sx * k)}px;top:${r1(h - (BOOT_HOEHE[tier] || 322) * k + sy * k)}px;width:${r1(sb * k)}px;height:${r1(sh * k)}px">` : '') + fahrt('boot', tier, b) };
  }
  if (art === 'schlitten') {    // Tier sitzt mit Schal auf dem Schlitten (ein Bild pro Tier, ChatGPT, 420 breit)
    const b = 250, h = 266;
    return { b, h, haken: 170, html: fahrt('schlitten', tier, b) };
  }
  if (art === 'flugzeug') {     // Pilot mit Fliegerbrille und Schal im Cockpit (ein Bild pro Tier, ChatGPT, 440 breit)
    const b = 260, k = b / 440, h = 183, [px, py, pb, ph, nabe] = FLUG_PROPELLER[tier] || [0, 0, 0, 0, 0];
    const H = Math.round((FLUG_HOEHE[tier] || 311) * k);
    // Propeller ist ein eigenes Bildstück hinter der Nase und dreht sich (Achse waagrecht → wird abwechselnd schmal)
    return { b, h, haken: 120, html: (pb ? `<img class="teil-bild propeller" src="${FAHRZEUGE}flug-${tier}-propeller.png" alt="" style="left:${r1(px * k)}px;top:${r1(h - H + py * k)}px;width:${r1(pb * k)}px;height:${r1(ph * k)}px;transform-origin:50% ${r1(nabe * k)}px">` : '') + fahrt('flug', tier, b) };
  }
  if (art === 'uboot') {        // U-Boot 440×319 → 300 breit; Kopf im grossen Bullauge
    const b = 300, h = 218, cx = 242, cy = 157, r = 40;
    const k = b / 440;          // Propeller (eigenes Bild) dreht sich hinter der Nabe, dahinter steigen Blasen auf
    const blasen = Array.from({ length: 6 }, (_, i) => `<span style="--v:${(i * 0.37).toFixed(2)}s;--dy:${(i % 3) * 7 - 7}px"></span>`).join('');
    return { b, h, haken: 160, html: `<div class="schrauben-blasen" style="left:${r1(-14)}px;top:${r1(212 * k)}px">${blasen}</div>`
      + teil('propeller.png', 0, 155 * k, 38 * k, 135 * k, 'propeller') + teil('uboot.png', 0, 0, b, h)
      + `<div class="bullauge" style="left:${cx - r}px;top:${cy - r}px;width:${2 * r}px;height:${2 * r}px"><img src="${KOEPFE}${tier}.png" alt=""></div>` };
  }
  if (art === 'gleitschirm') {  // Tier sitzt im Gurtzeug unter dem Schirm (ein Bild pro Tier, ChatGPT, 420 breit)
    const b = 280, h = 345;
    return { b, h, haken: 330, html: fahrt('gleit', tier, b) };
  }
  // zu Fuss (laufen, joggen) oder fest an einem Ort (Presse, Spielautomat)
  const b = 210, h = 210;
  return { b, h, haken: 118, html: figur(tier, b, h) };
}

/* =========================================================
   Reihenfolge der Welten
   Level 1 = Zuzwil, Level 2 = Presse, danach zufällig aus allen 14 Welten (auch Zuzwil und Presse),
   jede kommt einmal dran, bevor sich eine wiederholt, und nie dieselbe zweimal hintereinander.
   ========================================================= */
const WELT_START = ['zuzwil', 'presse'];
const WELT_LOOP = ['zuzwil', 'presse', 'vulkan', 'wueste', 'berge', 'aadorf', 'boot', 'motorrad', 'uboot', 'joggen', 'flugzeug', 'schlitten', 'gleitschirm', 'spielautomat'];

/** Gibt die Welt für ein Level zurück. stand = { beutel: [], letzte: null } wird dabei weitergeführt. */
function weltFuerLevel(level, stand) {
  let id;
  if (level <= WELT_START.length) id = WELT_START[level - 1];
  else {
    if (!stand.beutel.length) {
      // erste Runde: die Welten, die noch nicht dran waren; danach immer alle 14
      stand.beutel = mischen(stand.ersteRunde === false ? WELT_LOOP : WELT_LOOP.filter(w => !WELT_START.includes(w)));
      stand.ersteRunde = false;
      // nicht dieselbe Welt direkt nach der letzten (Beutel wird von hinten geleert)
      if (stand.beutel[stand.beutel.length - 1] === stand.letzte) stand.beutel.unshift(stand.beutel.pop());
    }
    id = stand.beutel.pop();
  }
  stand.letzte = id;
  return id;
}
