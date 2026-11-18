'use strict';
/* =========================================================
   Mathe-Wanderung – die Welten (Wanderungen)
   Jede Welt wird als Vektorgrafik (SVG) gezeichnet, Bühne 1600 × 520.
   - hinten:  Hintergrund (liegt hinter dem Tier)
   - vorne:   Vordergrund (liegt vor dem Tier, z. B. Pult, Wellen)
   - wege:    9 Positionen des Tiers: Start und Stufe 1 bis 8 [x, y, Drehung, Grösse]
   - akteur:  was der Kran hebt (Tier, evtl. mit Fahrzeug)
   - stufe(): bewegt Dinge in der Welt (Presse, Schlitten, Spielautomat)
   Die 8 Stufen sind in jeder Welt mit kleinen Zeichen markiert
   (Wanderweg-Rauten, Steinmännchen, Pylonen, Bojen …).
   ========================================================= */

const K = '#263238';                       // Filzstift-Kontur
const FIGUREN = '../mathe-fussball/bilder/figuren/';
const KOEPFE = '../mathe-fussball/bilder/tiere/';
const MENGEN_BILDER = '../mathe-fussball/bilder/mengen/';
const STUFEN = 8;                           // richtige Antworten pro Level

/* ---------- kleine Zeichen-Helfer ---------- */
const r1 = n => Math.round(n * 10) / 10;
/** 9 Punkte gleichmässig auf einer Strecke */
function strecke(x0, y0, x1, y1, extra = {}) {
  return Array.from({ length: STUFEN + 1 }, (_, i) => [r1(x0 + (x1 - x0) * i / STUFEN), r1(y0 + (y1 - y0) * i / STUFEN), extra.r || 0, extra.s || 1]);
}
function himmel(id, oben, unten) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${oben}"/><stop offset="1" stop-color="${unten}"/></linearGradient></defs>
    <rect width="1600" height="520" fill="url(#${id})"/>`;
}
function wolke(x, y, s = 1, klasse = 'zieht') {
  return `<g class="${klasse}" style="--dauer:${60 + (x % 7) * 9}s"><g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-72 22 Q-96 20 -88 -2 Q-80 -22 -54 -16 Q-50 -48 -14 -44 Q16 -64 42 -32 Q78 -38 78 -6 Q98 6 82 22 Z" fill="#fff" stroke="${K}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-40 4 Q-30 -8 -16 -4" fill="none" stroke="#cfd8dc" stroke-width="3" stroke-linecap="round"/></g></g>`;
}
function sonne(x, y, r = 50) {
  const strahlen = Array.from({ length: 12 }, (_, i) => {
    const w = i * Math.PI / 6, a = r + 12, b = r + 34;
    return `<line x1="${r1(Math.cos(w) * a)}" y1="${r1(Math.sin(w) * a)}" x2="${r1(Math.cos(w) * b)}" y2="${r1(Math.sin(w) * b)}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y})"><g class="dreht-langsam" stroke="#ffb300" stroke-width="7" stroke-linecap="round">${strahlen}</g>
    <circle r="${r}" fill="#ffd54f" stroke="${K}" stroke-width="4"/><circle r="${r * 0.6}" cx="${-r * 0.2}" cy="${-r * 0.2}" fill="#fff59d" opacity=".6"/></g>`;
}
function baum(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${K}" stroke-width="4" stroke-linejoin="round">
    <rect x="-9" y="-70" width="18" height="70" fill="#8d6e63"/>
    <circle cx="0" cy="-98" r="44" fill="#66bb6a"/><circle cx="-26" cy="-78" r="26" fill="#4caf50"/><circle cx="24" cy="-80" r="28" fill="#43a047"/></g>`;
}
function tanne(x, y, s = 1, schnee = false) {
  const w = schnee ? '#fff' : null;
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${K}" stroke-width="4" stroke-linejoin="round">
    <rect x="-7" y="-26" width="14" height="26" fill="#6d4c41"/>
    <path d="M-48 -24 L0 -84 L48 -24 Z" fill="#2e7d32"/><path d="M-38 -62 L0 -118 L38 -62 Z" fill="#388e3c"/><path d="M-26 -98 L0 -146 L26 -98 Z" fill="#43a047"/>
    ${w ? `<path d="M-20 -110 L0 -146 L20 -110 Q10 -104 0 -112 Q-10 -104 -20 -110Z" fill="${w}" stroke-width="2.5"/><path d="M-30 -74 Q-15 -66 0 -76 Q15 -66 30 -74 L22 -84 L-22 -84Z" fill="${w}" stroke-width="2.5"/>` : ''}</g>`;
}
/** Schweizer Haus mit Fensterläden. x = Mitte, y = Boden */
function haus(x, y, b, h, wand, dach, laden = '#2e7d32', stockwerke = 2) {
  const l = x - b / 2, o = y - h;
  let fenster = '';
  const fb = 30, fh = 38;
  for (let st = 0; st < stockwerke; st++) {
    const fy = o + 22 + st * (h - 40) / stockwerke;
    [-1, 1].forEach(seite => {
      const fx = x + seite * b * 0.24 - fb / 2;
      fenster += `<rect x="${fx - 12}" y="${fy}" width="11" height="${fh}" fill="${laden}"/><rect x="${fx + fb + 1}" y="${fy}" width="11" height="${fh}" fill="${laden}"/>
        <rect x="${fx}" y="${fy}" width="${fb}" height="${fh}" fill="#bbdefb"/><path d="M${fx + fb / 2} ${fy}V${fy + fh}M${fx} ${fy + fh / 2}H${fx + fb}" stroke-width="2.5"/>`;
      if (st === stockwerke - 1) fenster += `<rect x="${fx - 4}" y="${fy + fh}" width="${fb + 8}" height="9" fill="#a1887f" stroke-width="2.5"/><circle cx="${fx + 6}" cy="${fy + fh - 1}" r="5" fill="#e53935" stroke-width="2"/><circle cx="${fx + 18}" cy="${fy + fh - 2}" r="5" fill="#ff7043" stroke-width="2"/><circle cx="${fx + 28}" cy="${fy + fh - 1}" r="5" fill="#e53935" stroke-width="2"/>`;
    });
  }
  return `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
    <rect x="${l}" y="${o}" width="${b}" height="${h}" fill="${wand}"/>
    <path d="M${l - 20} ${o + 6} L${x} ${o - b * 0.42} L${l + b + 20} ${o + 6} Z" fill="${dach}"/>
    <path d="M${l - 2} ${o - 2} L${x} ${o - b * 0.36}" stroke="#00000033" stroke-width="3" fill="none"/>
    ${fenster}
    <rect x="${x - 18}" y="${y - 50}" width="36" height="50" rx="4" fill="#795548"/><circle cx="${x + 9}" cy="${y - 25}" r="2.5" fill="${K}"/></g>`;
}
function kirche(x, y) {
  return `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
    <rect x="${x - 110}" y="${y - 120}" width="150" height="120" fill="#fafafa"/>
    <path d="M${x - 124} ${y - 114} L${x - 35} ${y - 185} L${x + 54} ${y - 114} Z" fill="#8d6e63"/>
    <rect x="${x + 40}" y="${y - 230}" width="60" height="230" fill="#fff8e1"/>
    <path d="M${x + 32} ${y - 226} L${x + 70} ${y - 330} L${x + 108} ${y - 226} Z" fill="#6d4c41"/>
    <circle cx="${x + 70}" cy="${y - 188}" r="18" fill="#fff"/><path d="M${x + 70} ${y - 188} V${y - 200} M${x + 70} ${y - 188} H${x + 80}" stroke-width="3"/>
    <path d="M${x + 70} ${y - 330} V${y - 352} M${x + 61} ${y - 343} H${x + 79}" stroke-width="4"/>
    <path d="M${x - 60} ${y} V${y - 40} Q${x - 45} ${y - 58} ${x - 30} ${y - 40} V${y}Z" fill="#795548"/>
    <rect x="${x - 95}" y="${y - 95}" width="20" height="36" rx="10" fill="#90caf9"/><rect x="${x + 5}" y="${y - 95}" width="20" height="36" rx="10" fill="#90caf9"/>
    <rect x="${x + 58}" y="${y - 120}" width="24" height="44" rx="12" fill="#90caf9"/></g>`;
}
/** Schweizer Ortsschild: blau, weisse Umrandung, weisse Schrift, auf einer Metallstele. x = Mitte, y = Boden */
function ortsschild(x, y, name, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-10" y="-200" width="20" height="200" fill="#9ea7ad" stroke="${K}" stroke-width="4"/>
    <rect x="-6" y="-200" width="5" height="200" fill="#cfd8dc"/>
    <rect x="-130" y="-290" width="260" height="96" rx="8" fill="#1f4e9d" stroke="${K}" stroke-width="4"/>
    <rect x="-121" y="-281" width="242" height="78" rx="5" fill="none" stroke="#fff" stroke-width="5"/>
    <text x="0" y="-226" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="50" fill="#fff" letter-spacing="1">${name}</text></g>`;
}
/** gelbe Wanderweg-Raute auf einem Pfosten (Stufen-Zeichen) */
function raute(x, y) {
  return `<g class="marke" transform="translate(${x} ${y})" stroke="${K}" stroke-width="3" stroke-linejoin="round">
    <rect x="-4" y="-46" width="8" height="46" fill="#a1887f"/>
    <path d="M0 -70 L14 -54 L0 -38 L-14 -54 Z" fill="#fdd835"/></g>`;
}
/** weiss-rot-weisse Markierung auf einem Stein (Bergwanderweg) */
function bergmarke(x, y, s = 1) {
  return `<g class="marke" transform="translate(${x} ${y}) scale(${s})" stroke="${K}" stroke-width="3" stroke-linejoin="round">
    <path d="M-22 0 Q-24 -24 -6 -28 Q18 -30 22 -10 Q24 0 18 0 Z" fill="#9e9e9e"/>
    <rect x="-12" y="-22" width="24" height="15" fill="#fff" stroke-width="1.5"/><rect x="-12" y="-17.5" width="24" height="6" fill="#e53935" stroke="none"/></g>`;
}
function steinmann(x, y) {
  return `<g class="marke" transform="translate(${x} ${y})" stroke="${K}" stroke-width="3">
    <ellipse cx="0" cy="-8" rx="20" ry="9" fill="#8d6e63"/><ellipse cx="2" cy="-22" rx="15" ry="8" fill="#a1887f"/><ellipse cx="-1" cy="-34" rx="10" ry="6" fill="#8d6e63"/></g>`;
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
function berge(farbe, schnee, spitzen, grund = 520) {
  return spitzen.map(([x, y, b]) => `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
    <path d="M${x - b} ${grund} L${x} ${y} L${x + b} ${grund} Z" fill="${farbe}"/>
    ${schnee ? `<path d="M${x - b * 0.28} ${r1(y + (grund - y) * 0.28)} L${x} ${y} L${x + b * 0.28} ${r1(y + (grund - y) * 0.28)} L${x + b * 0.12} ${r1(y + (grund - y) * 0.22)} L${x} ${r1(y + (grund - y) * 0.3)} L${x - b * 0.12} ${r1(y + (grund - y) * 0.22)} Z" fill="${schnee}"/>` : ''}</g>`).join('');
}
function palme(x, y, h) { return `<image href="${MENGEN_BILDER}palme.png" x="${x - h / 2}" y="${y - h}" width="${h}" height="${h}"/>`; }

/* ---------- Tier-Bausteine für die Akteure ---------- */
/** ganze Figur (Pose wird später gewechselt) */
function figur(tier, b, h, x = 0, y = 0, klasse = '') {
  return `<img class="tier-figur ${klasse}" src="${FIGUREN}${tier}-stehen.png" alt="" style="left:${x}px;top:${y}px;width:${b}px;height:${h}px">`;
}
/** nur der Oberkörper (für Fahrzeuge): die Figur wird unten abgeschnitten */
function oberkoerper(tier, b, x, y, sichtbar = 0.66) {
  return `<div class="oberkoerper" style="left:${x}px;top:${y}px;width:${b}px;height:${r1(b * sichtbar)}px">${figur(tier, b, b)}</div>`;
}
const svgTeil = (b, h, inhalt, stil = '') => `<svg class="teil" viewBox="0 0 ${b} ${h}" width="${b}" height="${h}" style="${stil}">${inhalt}</svg>`;

/* =========================================================
   Die Welten
   ========================================================= */
const WELTEN = {};

/* ---------- 1. Dorf Zuzwil (kommt immer zuerst) ---------- */
WELTEN.zuzwil = {
  name: 'Zuzwil', titel: 'Wanderung durchs Dorf', art: 'laufen',
  wege: strecke(330, 470, 1340, 470),
  hinten() {
    return himmel('w-zu-h', '#7cc8f5', '#e1f5fe') + sonne(720, 80, 44) + wolke(470, 110, 0.9) + wolke(1000, 60, 0.8) + wolke(1340, 120, 0.7)
      + `<path d="M0 360 Q260 250 560 330 T1100 300 T1600 320 V520 H0Z" fill="#a5d6a7" stroke="${K}" stroke-width="4"/>`
      + kirche(980, 395) + baum(140, 410, 0.9) + haus(360, 410, 170, 140, '#fff3e0', '#c62828') + haus(620, 405, 150, 120, '#ffe0b2', '#6d4c41', '#c62828')
      + baum(770, 405, 0.8) + haus(1180, 410, 160, 130, '#fffde7', '#b71c1c', '#1565c0') + tanne(1290, 405, 0.8)
      + `<rect x="0" y="405" width="1600" height="115" fill="#8bc34a"/><path d="M0 405 H1600" stroke="${K}" stroke-width="4"/>
         <path d="M0 438 Q400 430 800 440 T1600 436 V492 Q1200 500 800 494 T0 496 Z" fill="#e8d5a6" stroke="${K}" stroke-width="4"/>
         <g fill="#7cb342">${[60, 330, 700, 1050, 1420].map(x => `<path d="M${x} 515 l6 -16 l6 16 M${x + 14} 515 l5 -12 l5 12" stroke="#558b2f" stroke-width="3"/>`).join('')}</g>`
      + this.wege.slice(1, STUFEN).map(([x]) => raute(x, 438)).join('')
      + ortsschild(1480, 445, 'Zuzwil', 0.95);
  }
};

/* ---------- 2. Die Presse (kommt immer als zweites) ---------- */
const PRESSE = { amboss: 400, mitte: 950, doseH: 200, doseB: 120 };
WELTEN.presse = {
  name: 'Die Presse', titel: 'Die Dose wird platt', art: 'fest',
  wege: strecke(380, 452, 380, 452),
  hinten() {
    const { amboss, mitte } = PRESSE;
    const fenster = [140, 520, 1300].map(x => `<rect x="${x}" y="50" width="180" height="110" fill="#b3e5fc" stroke="${K}" stroke-width="4"/><path d="M${x + 60} 50V160M${x + 120} 50V160M${x} 105H${x + 180}" stroke="${K}" stroke-width="3"/>`).join('');
    let skala = '';
    for (let s = 1; s <= STUFEN; s++) {
      const y = amboss - (PRESSE.doseH - s * 20);
      skala += `<line class="marke" x1="1122" y1="${y}" x2="${s % 4 === 0 ? 1146 : 1138}" y2="${y}" stroke="${K}" stroke-width="3"/>`;
    }
    // Schlanke Energy-Drink-Dose: blau-silbernes Karomuster, gelbe Sonne (ohne Logo und Schrift)
    let karos = '';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++)
      karos += `<rect x="${-42 + c * 21}" y="${-180 + r * 27}" width="21" height="27" fill="${(r + c) % 2 ? '#1a3f8f' : '#cfd8dc'}"/>`;
    const dose = `<g class="dose-form">
        <defs><clipPath id="w-dose-koerper"><path d="M-42 -184 Q-42 -192 -36 -196 L-30 -200 H30 L36 -196 Q42 -192 42 -184 V-8 Q42 0 34 0 H-34 Q-42 0 -42 -8 Z"/></clipPath>
          <linearGradient id="w-dose-glanz" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".25" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>
        <g clip-path="url(#w-dose-koerper)">
          <rect x="-42" y="-200" width="84" height="200" fill="#cfd8dc"/>${karos}
          <circle cx="0" cy="-104" r="20" fill="#ffd600" stroke="${K}" stroke-width="2.5"/>
          <rect x="-42" y="-200" width="84" height="22" fill="#eceff1"/><rect x="-42" y="-12" width="84" height="12" fill="#b0bec5"/>
          <rect x="-42" y="-200" width="84" height="200" fill="url(#w-dose-glanz)"/></g>
        <path d="M-42 -184 Q-42 -192 -36 -196 L-30 -200 H30 L36 -196 Q42 -192 42 -184 V-8 Q42 0 34 0 H-34 Q-42 0 -42 -8 Z" fill="none" stroke="${K}" stroke-width="4"/>
        <path d="M-42 -178 H42 M-42 -12 H42" stroke="${K}" stroke-width="2.5"/>
        <rect x="-12" y="-205" width="24" height="7" rx="3" fill="#b0bec5" stroke="${K}" stroke-width="2.5"/>
        <g class="knitter" fill="none" stroke="${K}" stroke-width="3" stroke-linejoin="round" opacity="0">
          <path d="M-42 -150 L-26 -140 L-38 -125 L-22 -112 L-40 -95 L-24 -80 L-42 -60"/>
          <path d="M42 -160 L28 -146 L40 -130 L26 -118 L42 -100 L30 -84 L42 -66"/>
          <path d="M-12 -150 L0 -138 L-10 -120 M8 -100 L18 -88 L10 -72"/></g></g>`;
    return himmel('w-pr-h', '#cfd8dc', '#eceff1') + fenster
      + `<g stroke="${K}" stroke-width="2" opacity=".25">${[300, 700, 1000, 1500].map(x => `<path d="M${x} 0V420"/>`).join('')}</g>
         <rect x="0" y="420" width="1600" height="100" fill="#78909c" stroke="${K}" stroke-width="4"/>
         <g opacity=".9">${Array.from({ length: 12 }, (_, i) => `<path d="M${700 + i * 40} 420 l20 0 l-20 28 l-20 0Z" fill="#fbc02d"/>`).join('')}</g>
         <rect x="660" y="420" width="580" height="28" fill="none" stroke="${K}" stroke-width="3"/>
         <g class="stempel" style="transform:translateY(0px)">
          <rect x="${mitte - 22}" y="-40" width="44" height="234" fill="#eceff1" stroke="${K}" stroke-width="4" class="stange"/>
          <rect x="${mitte - 135}" y="170" width="270" height="30" rx="5" fill="#ffb300" stroke="${K}" stroke-width="4"/>
          <path d="M${mitte - 125} 176 h250" stroke="#ffe082" stroke-width="4"/>
          <path d="M1150 200 l20 -10 v20 Z" fill="#e53935" stroke="${K}" stroke-width="2.5"/></g>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <rect x="770" y="80" width="50" height="330" fill="#90a4ae"/><rect x="1080" y="80" width="50" height="330" fill="#90a4ae"/>
          <rect x="780" y="88" width="10" height="316" fill="#cfd8dc" stroke="none"/><rect x="1090" y="88" width="10" height="316" fill="#cfd8dc" stroke="none"/>
          <rect x="740" y="${amboss}" width="420" height="30" fill="#546e7a"/>
          <rect x="745" y="30" width="410" height="70" rx="8" fill="#fbc02d"/>
          <path d="M760 40 h380" stroke="#fff59d" stroke-width="5"/>
          <rect x="${mitte - 45}" y="96" width="90" height="40" fill="#ffa000"/></g>
         ${skala}
         <g class="dose" transform="translate(${mitte} ${amboss})">${dose}</g>
         <rect x="${mitte - 22}" y="96" width="44" height="40" fill="#bdbdbd" stroke="${K}" stroke-width="4"/>`;
  },
  vorne() {
    return `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
      <rect x="400" y="400" width="12" height="60" fill="#546e7a"/>
      <path d="M270 352 L520 352 L540 460 L250 460 Z" fill="#607d8b"/>
      <rect x="262" y="338" width="270" height="22" rx="4" fill="#455a64"/>
      <rect x="300" y="380" width="80" height="44" rx="4" fill="#263238"/><path d="M308 404 l12 -10 l12 14 l12 -18 l12 10 l12 -6" fill="none" stroke="#69f0ae" stroke-width="3"/>
      <circle cx="440" cy="350" r="22" fill="#e53935"/><ellipse cx="434" cy="343" rx="8" ry="5" fill="#ff8a80" stroke="none"/>
      <path d="M480 420 h24 v-10 h-24 Z" fill="#fbc02d"/>
      <path d="M560 460 Q620 380 680 410 Q720 430 760 405" fill="none" stroke="${K}" stroke-width="6"/>
      <path d="M560 460 Q620 380 680 410 Q720 430 760 405" fill="none" stroke="#424242" stroke-width="3"/></g>`;
  },
  stufe(n, el) {
    const { doseH } = PRESSE;
    const h = doseH - n * 20;             // 200 → 40
    const sy = h / doseH, sx = 1 + n * 0.06;
    const dose = el.hinten.querySelector('.dose-form');
    dose.style.transform = `scale(${sx}, ${sy})`;
    el.hinten.querySelector('.knitter').style.opacity = Math.min(1, n / 4);
    // Stempel unten = Oberkante der Dose
    el.hinten.querySelector('.stempel').style.transform = `translateY(${n * 20}px)`;
  }
};

/* ---------- Vulkan ---------- */
WELTEN.vulkan = {
  name: 'Vulkan', titel: 'Wanderung am Vulkan', art: 'laufen',
  wege: strecke(330, 470, 1360, 470),
  hinten() {
    const rauch = [0, 1, 2, 3].map(i => `<circle class="rauch" style="--v:${i * 0.9}s" cx="${1000 + (i % 2) * 30 - 15}" cy="110" r="${30 + i * 6}" fill="#9e9e9e" stroke="${K}" stroke-width="3"/>`).join('');
    const brocken = [0, 1, 2].map(i => `<circle class="lavabrocken" style="--v:${i * 0.7}s;--dx:${(i - 1) * 90}px" cx="1000" cy="110" r="11" fill="#ff6d00" stroke="${K}" stroke-width="3"/>`).join('');
    return himmel('w-vu-h', '#4e2a2a', '#ff8a65')
      + `<circle cx="1000" cy="120" r="140" fill="#ff7043" opacity=".25" class="gluehen"/>`
      + rauch + brocken
      + berge('#5d4037', null, [[300, 260, 300]], 430)
      + `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <path d="M560 430 L920 120 Q1000 100 1080 120 L1440 430 Z" fill="#4e342e"/>
          <path d="M920 120 Q1000 140 1080 120 Q1000 100 920 120Z" fill="#ff6d00"/>
          <path class="gluehen" d="M985 128 Q960 220 990 280 Q1010 330 970 430 L1010 430 Q1040 320 1020 260 Q1000 200 1015 128Z" fill="#ff9100"/>
          <path class="gluehen" d="M1050 125 Q1080 200 1130 260 Q1160 300 1180 430 L1205 430 Q1190 290 1150 240 Q1100 180 1068 122Z" fill="#ffab00"/></g>
         <rect x="0" y="420" width="1600" height="100" fill="#3e2723"/><path d="M0 420 H1600" stroke="${K}" stroke-width="4"/>
         <path d="M0 440 Q400 432 800 442 T1600 438 V494 Q1200 502 800 496 T0 498 Z" fill="#8d6e63" stroke="${K}" stroke-width="4"/>
         <g class="gluehen" stroke="#ff6d00" stroke-width="4" fill="none" stroke-linecap="round"><path d="M80 512 l30 -10 l20 6 l26 -8"/><path d="M620 512 l26 -8 l20 6"/><path d="M1180 514 l30 -10 l24 8 l20 -6"/></g>`
      + this.wege.slice(1, STUFEN).map(([x]) => steinmann(x, 440)).join('')
      + zielfahne(1470, 446);
  }
};

/* ---------- Wüste ---------- */
WELTEN.wueste = {
  name: 'Wüste', titel: 'Durch die Wüste zur Oase', art: 'laufen',
  wege: strecke(330, 470, 1300, 470),
  hinten() {
    return himmel('w-wu-h', '#ffcc80', '#fff8e1') + sonne(1250, 95, 60)
      + `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <path d="M260 330 L360 210 L460 330 Z" fill="#ffe0b2"/><path d="M360 210 L400 330 L460 330Z" fill="#ffcc80"/>
          <path d="M450 330 L520 250 L590 330 Z" fill="#ffe0b2"/><path d="M520 250 L548 330 L590 330Z" fill="#ffcc80"/>
          <path d="M0 340 Q200 280 420 330 T900 310 T1600 330 V520 H0Z" fill="#ffd180"/>
          <path d="M0 400 Q300 360 700 400 T1600 390 V520 H0Z" fill="#ffc46b"/></g>
         <image href="${MENGEN_BILDER}kamel.png" x="700" y="230" width="110" height="110"/>
         <image href="${MENGEN_BILDER}kamel.png" x="800" y="250" width="86" height="86"/>
         <path d="M0 440 Q400 432 800 442 T1600 438" fill="none" stroke="#e0a65a" stroke-width="5" stroke-dasharray="2 22" stroke-linecap="round"/>
         <g stroke="${K}" stroke-width="4"><ellipse cx="1460" cy="452" rx="130" ry="30" fill="#4fc3f7"/><path d="M1380 450 q20 -8 40 0 M1460 458 q20 -8 40 0" stroke="#e1f5fe" stroke-width="3" fill="none"/></g>`
      + palme(1380, 450, 200) + palme(1540, 446, 240) + palme(1480, 420, 150)
      + this.wege.slice(1, STUFEN).map(([x]) => `<g class="marke" stroke="${K}" stroke-width="3"><ellipse cx="${x}" cy="440" rx="18" ry="9" fill="#bcaaa4"/><ellipse cx="${x + 14}" cy="436" rx="9" ry="6" fill="#d7ccc8"/></g>`).join('');
  }
};

/* ---------- Schweizer Berge ---------- */
WELTEN.berge = {
  name: 'Schweizer Berge', titel: 'Auf den Gipfel', art: 'laufen',
  wege: [[310, 478, 0, 1], [445, 460, 0, 0.95], [595, 432, 0, 0.9], [740, 398, 0, 0.84], [870, 352, 0, 0.78], [980, 304, 0, 0.72], [1075, 256, 0, 0.66], [1160, 208, 0, 0.6], [1228, 162, 0, 0.55]],
  hinten() {
    const pfad = this.wege.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    return himmel('w-be-h', '#64b5f6', '#e3f2fd') + wolke(300, 80, 0.8) + wolke(760, 120, 0.6)
      + berge('#90a4ae', '#fff', [[180, 190, 260], [560, 150, 260], [820, 200, 220]], 470)
      + `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <path d="M200 520 L1240 150 L1600 400 V520 Z" fill="#8d9ba3"/>
          <path d="M1060 214 L1240 150 L1390 254 L1320 236 L1262 262 L1190 228 L1120 246 Z" fill="#fff"/>
          <path d="M200 520 L680 350 Q840 372 940 330 Q1040 336 1110 300 L1600 430 V520 Z" fill="#7cb342"/></g>
         <rect x="0" y="470" width="1600" height="50" fill="#8bc34a"/><path d="M0 470 H220" stroke="${K}" stroke-width="4"/>
         <path d="${pfad}" fill="none" stroke="#efe0b9" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
         <path d="${pfad}" fill="none" stroke="#bfa77a" stroke-width="3" stroke-dasharray="3 14" stroke-linecap="round"/>`
      + tanne(70, 480, 0.8) + tanne(540, 470, 0.6) + tanne(880, 420, 0.45)
      + this.wege.slice(1, STUFEN).map(([x, y, , s]) => bergmarke(x + 34 * s, y - 2, s)).join('')
      + schweizerFahne(1262, 156, 52);
  }
};

/* ---------- Stadt Aadorf mit Bahnhof ---------- */
function bahnhofsuhr(x, y, r) {
  return `<g transform="translate(${x} ${y})" stroke="${K}">
    <circle r="${r}" fill="#fff" stroke-width="4"/>
    ${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${-r * 0.82}" x2="0" y2="${-r * 0.64}" stroke-width="${r * 0.11}" transform="rotate(${i * 30})"/>`).join('')}
    <line x1="0" y1="${r * 0.15}" x2="0" y2="${-r * 0.5}" stroke-width="${r * 0.12}" transform="rotate(300)"/>
    <line x1="0" y1="${r * 0.18}" x2="0" y2="${-r * 0.78}" stroke-width="${r * 0.09}" transform="rotate(54)"/>
    <g class="sekunde" stroke="#e53935"><line x1="0" y1="${r * 0.25}" x2="0" y2="${-r * 0.5}" stroke-width="${r * 0.04}"/><circle cy="${-r * 0.55}" r="${r * 0.13}" fill="#e53935" stroke="none"/></g></g>`;
}
WELTEN.aadorf = {
  name: 'Aadorf', titel: 'Durch die Stadt zum Bahnhof', art: 'laufen',
  wege: strecke(340, 470, 1250, 470),
  hinten() {
    const block = (x, b, h, farbe) => {
      let f = '';
      for (let yy = 430 - h + 20; yy < 380; yy += 46) for (let xx = x + 16; xx < x + b - 30; xx += 44) f += `<rect x="${xx}" y="${yy}" width="26" height="30" fill="#fff9c4"/>`;
      return `<g stroke="${K}" stroke-width="3.5"><rect x="${x}" y="${430 - h}" width="${b}" height="${h}" fill="${farbe}"/>${f}<rect x="${x - 6}" y="${424 - h}" width="${b + 12}" height="10" fill="#607d8b"/></g>`;
    };
    return himmel('w-aa-h', '#81d4fa', '#e1f5fe') + wolke(260, 70, 0.7) + wolke(820, 50, 0.6)
      + block(20, 200, 260, '#ffccbc') + block(240, 160, 330, '#b0bec5') + block(420, 220, 220, '#fff59d') + block(660, 170, 290, '#c5e1a5') + block(850, 180, 240, '#f8bbd0')
      // Zug hinter dem Bahnhof
      + `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <rect x="930" y="300" width="680" height="96" rx="18" fill="#e53935"/><rect x="930" y="352" width="680" height="12" fill="#fff"/>
          ${[970, 1050, 1130].map(x => `<rect x="${x}" y="314" width="56" height="32" rx="5" fill="#cfe8fc"/>`).join('')}
          <rect x="930" y="396" width="680" height="14" fill="#455a64"/></g>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <rect x="1170" y="200" width="420" height="240" fill="#f5e6c8"/>
          <path d="M1150 204 L1380 140 L1610 204 Z" fill="#5d4037"/>
          <rect x="1220" y="300" width="70" height="140" fill="#8d6e63"/><rect x="1470" y="300" width="70" height="140" fill="#8d6e63"/>
          <rect x="1320" y="320" width="110" height="120" fill="#4e342e"/><rect x="1330" y="330" width="40" height="110" fill="#90caf9"/><rect x="1380" y="330" width="40" height="110" fill="#90caf9"/>
          <rect x="1236" y="222" width="290" height="58" rx="4" fill="#2d327d"/>
          <rect x="1242" y="228" width="278" height="46" rx="3" fill="none" stroke="#fff" stroke-width="3"/></g>
         <text x="1381" y="264" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="36" fill="#fff">Aadorf</text>
         ${bahnhofsuhr(1381, 168, 24)}
         <rect x="0" y="430" width="1600" height="90" fill="#b0bec5" stroke="${K}" stroke-width="4"/>
         <g stroke="#90a4ae" stroke-width="3">${Array.from({ length: 20 }, (_, i) => `<path d="M${i * 84} 432 l-14 86"/>`).join('')}</g>
         <path d="M0 500 H1600" stroke="${K}" stroke-width="4"/><rect x="0" y="500" width="1600" height="20" fill="#616161"/>`
      + this.wege.slice(1, STUFEN).map(([x]) => `<g class="marke" stroke="${K}" stroke-width="3"><rect x="${x + 50}" y="404" width="14" height="36" rx="6" fill="#78909c"/><rect x="${x + 50}" y="412" width="14" height="7" fill="#e53935" stroke-width="1.5"/></g>`).join('')
      + ortsschild(100, 440, 'Aadorf', 0.75);
  }
};

/* ---------- Boot zur Insel ---------- */
WELTEN.boot = {
  name: 'Bootsfahrt', titel: 'Mit dem Boot zur Insel', art: 'fahren', fahrzeug: 'boot',
  wege: strecke(340, 432, 1180, 432),
  hinten() {
    return himmel('w-bo-h', '#4fc3f7', '#e1f5fe') + sonne(560, 85, 44) + wolke(840, 70, 0.8) + wolke(1100, 110, 0.6)
      + `<g fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"><path d="M520 150 q12 -10 24 0 q12 -10 24 0"/><path d="M590 120 q9 -8 18 0 q9 -8 18 0"/></g>
         <rect x="0" y="320" width="1600" height="200" fill="#29b6f6"/><path d="M0 320 H1600" stroke="${K}" stroke-width="4"/>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round"><path d="M1230 340 Q1320 250 1450 260 Q1560 262 1610 300 V352 H1220 Z" fill="#ffe082"/></g>`
      + palme(1390, 290, 200) + palme(1500, 282, 170)
      + `<g class="wellen" fill="none" stroke="#e1f5fe" stroke-width="4" stroke-linecap="round">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 180 + 40} ${360 + (i % 3) * 30} q15 -10 30 0 q15 -10 30 0"/>`).join('')}</g>`
      + this.wege.slice(1, STUFEN).map(([x]) => `<g class="marke schaukelt"><g stroke="${K}" stroke-width="3"><path d="M${x + 150} 392 a11 11 0 0 1 22 0Z" fill="#e53935"/><path d="M${x + 150} 392 a11 11 0 0 0 22 0Z" fill="#fff"/></g></g>`).join('');
  },
  vorne() {
    return `<g class="wellen-vorne" stroke="${K}" stroke-width="4" stroke-linejoin="round"><path d="M0 470 Q50 452 100 470 T200 470 T300 470 T400 470 T500 470 T600 470 T700 470 T800 470 T900 470 T1000 470 T1100 470 T1200 470 T1300 470 T1400 470 T1500 470 T1600 470 T1700 470 T1800 470 V520 H0Z" fill="#039be5"/></g>`;
  }
};

/* ---------- Motorrad über die Schanze ---------- */
WELTEN.motorrad = {
  name: 'Motorrad-Sprung', titel: 'Über die Schanze', art: 'fahren', fahrzeug: 'motorrad',
  wege: [...Array.from({ length: 7 }, (_, i) => [330 + i * 95, 456, 0, 1]),
    [1100, 380, -20, 1], [1440, 456, 0, 1]],
  bogen: { 8: 190 },                    // letzter Schritt: Sprung über die Lücke
  hinten() {
    return himmel('w-mo-h', '#4fc3f7', '#e1f5fe') + sonne(1300, 90, 44) + wolke(380, 80, 0.8) + wolke(860, 60, 0.6)
      + `<path d="M0 340 Q300 260 650 330 T1300 300 T1600 320 V520 H0Z" fill="#9ccc65" stroke="${K}" stroke-width="4"/>
         <rect x="0" y="400" width="1600" height="120" fill="#8bc34a"/>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <rect x="-10" y="440" width="930" height="56" fill="#607d8b"/>
          <path d="M880 457 L1130 365 L1130 458 Z" fill="#ffb300"/><path d="M900 452 L1120 372" stroke="#fff59d" stroke-width="4"/>
          <path d="M1130 365 V458" stroke-width="5"/>
          <path d="M1300 380 L1470 446 V458 L1300 458 Z" fill="#ffb300"/>
          <rect x="1460" y="440" width="150" height="56" fill="#607d8b"/></g>
         <path d="M10 468 H900 M1470 468 H1600" stroke="#fff" stroke-width="5" stroke-dasharray="40 30"/>`
      + this.wege.slice(1, 7).map(([x]) => `<g class="marke" stroke="${K}" stroke-width="3" stroke-linejoin="round" transform="translate(${x - 47} 440)"><path d="M-14 0 L-4 -36 L4 -36 L14 0 Z" fill="#ff6d00"/><path d="M-9 -16 H9" stroke="#fff" stroke-width="5"/><rect x="-18" y="-4" width="36" height="6" fill="#ff6d00"/></g>`).join('')
      + zielfahne(1540, 446, 0.9);
  }
};

/* ---------- U-Boot zur Boje ---------- */
WELTEN.uboot = {
  name: 'U-Boot', titel: 'Mit dem U-Boot zur Boje', art: 'fahren', fahrzeug: 'uboot',
  wege: strecke(340, 340, 1120, 300),
  hinten() {
    const fisch = (y, d, s, v) => `<g class="schwimmt" style="--dauer:${d}s;--v:${v}s"><image href="${MENGEN_BILDER}fisch.png" x="0" y="${y}" width="${70 * s}" height="${70 * s}"/></g>`;
    return himmel('w-ub-h', '#4fc3f7', '#01579b')
      + `<path d="M0 40 Q50 30 100 40 T200 40 T300 40 T400 40 T500 40 T600 40 T700 40 T800 40 T900 40 T1000 40 T1100 40 T1200 40 T1300 40 T1400 40 T1500 40 T1600 40 V0 H0Z" fill="#b3e5fc" stroke="${K}" stroke-width="4"/>
         <g fill="#fff" opacity=".12"><path d="M200 40 L320 40 L160 520 L40 520Z"/><path d="M700 40 L780 40 L700 520 L580 520Z"/><path d="M1100 40 L1170 40 L1150 520 L1040 520Z"/></g>`
      + fisch(150, 26, 1, -4) + fisch(240, 34, 0.8, -15) + fisch(110, 30, 0.7, -22)
      + `<path d="M0 470 Q200 450 400 466 T800 462 T1200 468 T1600 458 V520 H0Z" fill="#ffe0b2" stroke="${K}" stroke-width="4"/>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <path class="wiegt" d="M90 470 Q70 420 96 380 Q120 340 100 300" fill="none" stroke="#43a047" stroke-width="10" stroke-linecap="round"/>
          <path class="wiegt" d="M760 468 Q740 420 770 380" fill="none" stroke="#2e7d32" stroke-width="10" stroke-linecap="round"/>
          <path d="M560 470 Q560 420 590 410 Q620 420 600 470Z" fill="#ff8a80"/>
          <path d="M1060 468 Q1050 430 1080 420 Q1110 430 1100 468Z" fill="#ce93d8"/>
          <rect x="1270" y="440" width="60" height="30" fill="#78909c"/></g>
         <path d="M1300 440 Q1312 250 1300 60" fill="none" stroke="#455a64" stroke-width="5" stroke-dasharray="10 5"/>
         <g class="schaukelt" stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <path d="M1270 44 Q1300 70 1330 44 L1320 20 L1280 20 Z" fill="#e53935"/>
          <rect x="1286" y="-4" width="28" height="24" fill="#fff"/><rect x="1290" y="-20" width="20" height="16" fill="#e53935"/>
          <circle cx="1300" cy="-26" r="7" fill="#ffeb3b" class="blinkt"/></g>
         <g class="blasen" fill="none" stroke="#e1f5fe" stroke-width="3">${[160, 640, 980, 1450].map((x, i) => `<circle class="blase" style="--v:${i * 1.3}s" cx="${x}" cy="470" r="${6 + i % 2 * 4}"/>`).join('')}</g>`
      + this.wege.slice(1, STUFEN).map(([x]) => `<g class="marke" transform="translate(${x + 20} ${472 - (x % 3) * 2})" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"><path d="M0 -26 L7 -11 L23 -10 L11 0 L15 15 L0 7 L-15 15 L-11 0 L-23 -10 L-7 -11 Z" fill="#ffab40" transform="scale(.8)"/></g>`).join('');
  }
};

/* ---------- Jogging zum Ziel ---------- */
WELTEN.joggen = {
  name: 'Jogging', titel: 'Lauf ins Ziel', art: 'laufen', joggt: true,
  wege: strecke(330, 474, 1330, 474),
  hinten() {
    let publikum = '';
    const farben = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043', '#fff'];
    for (let reihe = 0; reihe < 4; reihe++) for (let i = 0; i < 46; i++) publikum += `<circle cx="${20 + i * 34 + (reihe % 2) * 17}" cy="${200 + reihe * 40}" r="11" fill="${farben[(i * 7 + reihe * 3) % farben.length]}" stroke="${K}" stroke-width="2"/>`;
    return himmel('w-jo-h', '#81d4fa', '#e1f5fe') + wolke(400, 60, 0.7) + wolke(1100, 80, 0.8)
      + `<g stroke="${K}" stroke-width="4"><rect x="0" y="170" width="1600" height="190" fill="#90a4ae"/>${[0, 1, 2, 3].map(r => `<path d="M0 ${214 + r * 40} H1600" stroke-width="3"/>`).join('')}</g>${publikum}
         <rect x="0" y="360" width="1600" height="40" fill="#66bb6a" stroke="${K}" stroke-width="4"/>
         <rect x="0" y="400" width="1600" height="120" fill="#d84315" stroke="${K}" stroke-width="4"/>
         <g stroke="#fff" stroke-width="4"><path d="M0 440 H1600 M0 484 H1600"/></g>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <rect x="1410" y="230" width="22" height="270" fill="#eceff1"/><rect x="1560" y="230" width="22" height="270" fill="#eceff1"/>
          <rect x="1396" y="214" width="200" height="64" rx="8" fill="#1e88e5"/></g>
         <text x="1496" y="262" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="42" fill="#fff">ZIEL</text>
         <g>${Array.from({ length: 8 }, (_, i) => `<rect x="1432" y="${400 + i * 15}" width="128" height="15" fill="${i % 2 ? K : '#fff'}" opacity=".85"/>`).join('')}</g>`
      + this.wege.slice(1, STUFEN).map(([x]) => `<path class="marke" d="M${x + 60} 404 l-10 112" stroke="#fff" stroke-width="5" opacity=".75"/>`).join('');
  }
};

/* ---------- Kunstflug mit dem Doppeldecker ---------- */
WELTEN.flugzeug = {
  name: 'Kunstflug', titel: 'Kunstflug zum Ballon', art: 'fahren', fahrzeug: 'flugzeug',
  wege: [[340, 330], [450, 290], [560, 320], [670, 280], [780, 310], [890, 270], [1000, 300], [1110, 260], [1210, 290]].map(([x, y]) => [x, y, 0, 1]),
  looping: true,
  hinten() {
    return himmel('w-fl-h', '#1e88e5', '#bbdefb') + sonne(650, 75, 50)
      + wolke(420, 150, 1.1) + wolke(860, 90, 0.9) + wolke(1180, 420, 1) + wolke(300, 440, 0.8) + wolke(760, 470, 1.2)
      + `<path d="M0 470 Q300 430 600 470 T1200 460 T1600 470 V520 H0Z" fill="#81c784" stroke="${K}" stroke-width="4"/>
         <g class="schwebt" stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <path d="M1440 90 Q1350 92 1352 190 Q1356 260 1420 300 L1460 300 Q1524 260 1528 190 Q1530 92 1440 90Z" fill="#ffca28"/>
          <path d="M1440 90 Q1400 120 1402 190 Q1406 260 1428 300 L1452 300 Q1474 260 1478 190 Q1480 120 1440 90Z" fill="#e53935"/>
          <path d="M1357 160 H1523 M1360 230 H1520" stroke-width="3"/>
          <path d="M1424 300 L1418 334 M1456 300 L1462 334" stroke-width="3"/>
          <rect x="1414" y="332" width="52" height="34" rx="5" fill="#8d6e63"/><path d="M1414 344 H1466" stroke-width="3"/></g>`
      + this.wege.slice(1, STUFEN).map(([x, y]) => `<g class="marke" fill="#fff" stroke="${K}" stroke-width="2" opacity=".85"><circle cx="${x}" cy="${y - 150}" r="9"/><circle cx="${x + 13}" cy="${y - 154}" r="7"/><circle cx="${x + 24}" cy="${y - 150}" r="5"/></g>`).join('');
  }
};

/* ---------- Schneemann im Schlitten ziehen ---------- */
const SCHLITTEN = { x0: 180, x8: 1150, y: 470, tierX: 1400 };
WELTEN.schlitten = {
  name: 'Schlitten', titel: 'Den Schneemann heranziehen', art: 'fest', blickLinks: true,
  wege: strecke(SCHLITTEN.tierX, 472, SCHLITTEN.tierX, 472),
  hinten() {
    const flocken = Array.from({ length: 26 }, (_, i) => `<circle class="flocke" style="--v:${-(i * 1.7) % 9}s;--dx:${(i % 5) * 12 - 24}px" cx="${(i * 97) % 1600}" cy="-10" r="${3 + i % 3}" fill="#fff"/>`).join('');
    const sx = i => SCHLITTEN.x0 + (SCHLITTEN.x8 - SCHLITTEN.x0) * i / STUFEN;
    return himmel('w-sc-h', '#b3d4ec', '#eef6fb')
      + berge('#b0bec5', '#fff', [[300, 150, 300], [800, 110, 330], [1300, 170, 300]], 400)
      + `<path d="M0 380 Q400 340 800 380 T1600 370 V520 H0Z" fill="#fff" stroke="${K}" stroke-width="4"/>
         <path d="M0 470 Q500 452 1000 470 T1600 466" fill="none" stroke="#cfe3f2" stroke-width="10"/>`
      + tanne(80, 400, 0.9, true) + tanne(520, 384, 0.7, true) + tanne(980, 388, 0.8, true) + tanne(1540, 392, 0.9, true)
      + Array.from({ length: STUFEN - 1 }, (_, i) => `<g class="marke" transform="translate(${sx(i + 1) + 110} 452)" stroke="${K}" stroke-width="2.5"><rect x="-2" y="-40" width="4" height="40" fill="#fff"/><path d="M2 -40 L22 -33 L2 -26 Z" fill="#e53935"/></g>`).join('')
      + `<g class="seil-gruppe"><line class="seil" x1="0" y1="0" x2="1" y2="0" stroke="#6d4c41" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>
         <g class="schlitten" style="transform:translateX(${SCHLITTEN.x0}px)"><g transform="translate(0 ${SCHLITTEN.y})" stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <path d="M-90 0 H80 Q110 0 110 -22" fill="none" stroke-width="6"/><path d="M-90 0 H80 Q110 0 110 -22" fill="none" stroke="#b0bec5" stroke-width="2"/>
          <rect x="-60" y="-26" width="8" height="26" fill="#6d4c41"/><rect x="50" y="-26" width="8" height="26" fill="#6d4c41"/>
          <rect x="-84" y="-40" width="170" height="18" rx="6" fill="#a1887f"/>
          <g class="schneemann">
            <circle cx="0" cy="-86" r="48" fill="#fff"/><circle cx="0" cy="-160" r="36" fill="#fff"/><circle cx="0" cy="-218" r="28" fill="#fff"/>
            <path d="M-26 -190 Q0 -176 26 -190 L28 -178 Q0 -164 -28 -178Z" fill="#e53935"/><path d="M14 -184 l10 34 l12 -4 l-8 -32Z" fill="#e53935"/>
            <circle cx="-10" cy="-224" r="4" fill="${K}"/><circle cx="10" cy="-224" r="4" fill="${K}"/>
            <path d="M0 -216 L30 -210 L0 -206Z" fill="#ff9800" stroke-width="2.5"/>
            <path d="M-12 -204 Q0 -196 12 -204" fill="none" stroke-width="3"/>
            <rect x="-24" y="-252" width="48" height="8" fill="${K}"/><rect x="-16" y="-284" width="32" height="34" fill="${K}"/>
            <circle cx="0" cy="-150" r="4" fill="${K}"/><circle cx="0" cy="-132" r="4" fill="${K}"/><circle cx="0" cy="-90" r="4" fill="${K}"/>
          </g></g></g>`
      + `<g class="flocken">${flocken}</g>`;
  },
  stufe(n, el) {
    const sx = SCHLITTEN.x0 + (SCHLITTEN.x8 - SCHLITTEN.x0) * n / STUFEN;
    el.hinten.querySelector('.schlitten').style.transform = `translateX(${sx}px)`;
    // Seil vom Schlitten (vorne oben) bis zur Pfote des Tiers
    const ax = sx + 110, ay = SCHLITTEN.y - 22, bx = SCHLITTEN.tierX - 58, by = SCHLITTEN.y - 92;
    const len = Math.hypot(bx - ax, by - ay), w = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
    el.hinten.querySelector('.seil-gruppe').style.transform = `translate(${ax}px, ${ay}px) rotate(${w}deg) scaleX(${len})`;
  }
};

/* ---------- Gleitschirm zum Landeplatz ---------- */
WELTEN.gleitschirm = {
  name: 'Gleitschirm', titel: 'Landung auf der Wiese', art: 'fahren', fahrzeug: 'gleitschirm',
  wege: Array.from({ length: STUFEN + 1 }, (_, i) => { const t = i / STUFEN; return [r1(370 + 960 * t), r1(330 + 138 * Math.pow(t, 1.4)), 0, r1(0.8 + 0.2 * t)]; }),
  hinten() {
    const punkte = this.wege.slice(1, STUFEN).map(([x, y, , s]) => `<circle class="marke" cx="${x}" cy="${y - 300 * s}" r="5" fill="#fff" opacity=".7"/>`).join('');
    return himmel('w-gl-h', '#42a5f5', '#e3f2fd') + wolke(560, 60, 0.7) + wolke(1200, 90, 0.6)
      + berge('#78909c', '#fff', [[120, 120, 260], [460, 170, 240], [760, 140, 260]], 470)
      + `<path d="M0 420 Q300 380 700 400 T1600 380 V520 H0Z" fill="#7cb342" stroke="${K}" stroke-width="4"/>
         <ellipse cx="560" cy="452" rx="220" ry="22" fill="#4fc3f7" stroke="${K}" stroke-width="4"/>
         <rect x="0" y="470" width="1600" height="50" fill="#8bc34a"/><path d="M0 470 H1600" stroke="${K}" stroke-width="3" opacity=".4"/>
         <g stroke="${K}" stroke-width="4"><ellipse cx="1330" cy="478" rx="120" ry="22" fill="#fff"/><ellipse cx="1330" cy="478" rx="78" ry="14" fill="#ff7043"/><ellipse cx="1330" cy="478" rx="36" ry="7" fill="#fff"/></g>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round"><rect x="1500" y="320" width="8" height="160" fill="#bdbdbd"/>
          <path class="weht" d="M1508 326 L1580 336 L1580 356 L1508 366 Z" fill="#ff6d00"/><path d="M1532 330 V362 M1556 333 V359" stroke="#fff" stroke-width="6"/></g>`
      + punkte;
  }
};

/* ---------- Spielautomat (Gewinn erst am Ende des Levels) ---------- */
const WALZEN = ['🍒', '🍋', '🔔', '⭐', '💎', '7'];
WELTEN.spielautomat = {
  name: 'Spielautomat', titel: 'Der Jackpot', art: 'fest', blickLinks: true,
  wege: strecke(1150, 452, 1150, 452),
  hinten() {
    let sterne = '', stadt = '';
    for (let i = 0; i < 40; i++) sterne += `<circle cx="${(i * 173) % 1600}" cy="${(i * 67) % 200}" r="${1.5 + i % 3}" fill="#fff" opacity=".8"/>`;
    [[0, 160, 230], [170, 120, 290], [300, 180, 200], [1180, 140, 260], [1330, 120, 300], [1460, 150, 220]].forEach(([x, b, h]) => {
      stadt += `<rect x="${x}" y="${440 - h}" width="${b}" height="${h}" fill="#311b92" stroke="${K}" stroke-width="3"/>`;
      for (let yy = 460 - h; yy < 420; yy += 30) for (let xx = x + 14; xx < x + b - 20; xx += 30) if ((xx + yy) % 3) stadt += `<rect x="${xx}" y="${yy}" width="14" height="16" fill="#ffeb3b" opacity=".75"/>`;
    });
    const birnen = Array.from({ length: STUFEN }, (_, i) => `<circle class="birne marke" cx="${630 + i * 40}" cy="124" r="11" stroke="${K}" stroke-width="3"/>`).join('');
    const walze = i => `<g transform="translate(${650 + i * 100} 250)"><rect x="-44" y="-46" width="88" height="92" rx="8" fill="#fff" stroke="${K}" stroke-width="3"/>
      <text class="walze" x="0" y="22" text-anchor="middle" font-size="56" font-family="Arial, sans-serif" font-weight="900" fill="#d50000">${WALZEN[i]}</text></g>`;
    return himmel('w-sp-h', '#1a0033', '#6a1b9a') + sterne + stadt
      + `<g class="neon"><text x="1240" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="58" fill="#ff4081" stroke="#fff" stroke-width="2">CASINO</text></g>
         <rect x="0" y="440" width="1600" height="80" fill="#b71c1c" stroke="${K}" stroke-width="4"/>
         <g fill="#ffd54f" opacity=".5">${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 56} 470 l10 10 l-10 10 l-10 -10Z"/>`).join('')}</g>
         <g stroke="${K}" stroke-width="4" stroke-linejoin="round">
          <rect x="560" y="100" width="420" height="340" rx="26" fill="#e53935"/>
          <rect x="580" y="106" width="380" height="68" rx="14" fill="#ffd54f"/>
          <rect x="590" y="190" width="360" height="120" rx="12" fill="#fbc02d"/>
          <rect x="580" y="330" width="380" height="40" rx="8" fill="#c62828"/>
          <rect x="620" y="380" width="300" height="46" rx="10" fill="#4a148c"/>
          <rect x="740" y="340" width="60" height="10" rx="4" fill="#212121"/>
          <rect x="980" y="270" width="36" height="56" rx="8" fill="#9e9e9e"/></g>
         <text x="770" y="164" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="26" fill="#b71c1c">JACKPOT</text>
         ${birnen}${[0, 1, 2].map(walze).join('')}
         <g class="hebel" style="transform-origin:998px 298px"><g stroke="${K}" stroke-width="4"><rect x="992" y="160" width="12" height="140" rx="5" fill="#cfd8dc"/><circle cx="998" cy="150" r="22" fill="#e53935"/><circle cx="992" cy="143" r="7" fill="#ff8a80" stroke="none"/></g></g>
         <g class="muenzen"></g>`;
  },
  stufe(n, el, sofort) {
    el.hinten.querySelectorAll('.birne').forEach((b, i) => b.classList.toggle('an', i < n));
    if (sofort) return;
    const hebel = el.hinten.querySelector('.hebel');
    hebel.classList.remove('ziehen'); void hebel.getBoundingClientRect(); hebel.classList.add('ziehen');
    // Walzen drehen sich kurz und bleiben stehen – erst bei Stufe 8 kommt dreimal die 7
    const walzen = [...el.hinten.querySelectorAll('.walze')];
    let ziel;
    if (n >= STUFEN) ziel = ['7', '7', '7'];
    else { do { ziel = walzen.map(() => waehle(WALZEN)); } while (ziel[0] === ziel[1] && ziel[1] === ziel[2]); }
    walzen.forEach((w, i) => {
      let k = 0;
      const t = setInterval(() => { w.textContent = WALZEN[(k++ + i * 2) % WALZEN.length]; }, 70);
      setTimeout(() => { clearInterval(t); w.textContent = ziel[i]; }, 450 + i * 220);
    });
    el.hinten.classList.toggle('jackpot', n >= STUFEN);
    if (n >= STUFEN) setTimeout(() => {
      el.hinten.querySelector('.muenzen').innerHTML = Array.from({ length: 24 }, (_, i) =>
        `<circle class="muenze" style="--v:${(i * 0.09).toFixed(2)}s;--dx:${(i % 7) * 26 - 78}px" cx="770" cy="400" r="13" fill="#ffd54f" stroke="#b8860b" stroke-width="3"/>`).join('');
    }, 1150);
  }
};

/* =========================================================
   Akteure: Tier mit (oder ohne) Fahrzeug.
   Gibt { b, h, html, haken } zurück: Breite, Höhe, Inhalt und
   die Höhe des Aufhängepunkts für den Kran (von unten gemessen): Dort greift der Kranhaken hinten am Rücken ein (der Kran liegt hinter dem Tier).
   Ankerpunkt ist immer unten in der Mitte.
   ========================================================= */
function akteur(welt, tier) {
  const art = welt.fahrzeug || welt.art;
  if (art === 'boot') {
    const b = 300, h = 210;
    return { b, h, haken: 112, html: `
      ${svgTeil(b, h, `<g stroke="${K}" stroke-width="4" stroke-linejoin="round"><rect x="56" y="70" width="6" height="90" fill="#8d6e63"/><path d="M62 74 L62 140 L118 140 Z" fill="#fff"/></g>`)}
      ${oberkoerper(tier, 150, 112, 18, 0.62)}
      ${svgTeil(b, h, `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
        <path d="M10 130 L290 130 Q284 176 250 196 L52 196 Q22 176 10 130 Z" fill="#e53935"/>
        <path d="M14 148 L286 148" stroke="#fff" stroke-width="8"/><path d="M14 148 L286 148" stroke-width="2" opacity=".3"/>
        <rect x="6" y="122" width="288" height="14" rx="6" fill="#8d6e63"/>
        <circle cx="236" cy="112" r="20" fill="none" stroke-width="6"/><path d="M236 92 V132 M216 112 H256" stroke-width="3"/>
        <rect x="-6" y="140" width="22" height="46" rx="5" fill="#455a64"/></g>`)}` };
  }
  if (art === 'motorrad') {
    const b = 260, h = 200;
    return { b, h, haken: 112, html: `
      ${oberkoerper(tier, 140, 70, 12, 0.6)}
      ${svgTeil(b, h, `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
        <g class="rad"><circle cx="52" cy="160" r="36" fill="#37474f"/><circle cx="52" cy="160" r="16" fill="#cfd8dc"/><path d="M52 126 V194 M18 160 H86" stroke-width="3"/></g>
        <g class="rad"><circle cx="208" cy="160" r="36" fill="#37474f"/><circle cx="208" cy="160" r="16" fill="#cfd8dc"/><path d="M208 126 V194 M174 160 H242" stroke-width="3"/></g>
        <path d="M52 160 L100 112 L170 112 L208 160" fill="none" stroke-width="7"/>
        <path d="M70 120 Q120 92 150 104 L176 118 L120 140 Z" fill="#1e88e5"/>
        <path d="M60 112 Q90 98 124 108 L120 124 L66 126 Z" fill="#263238"/>
        <path d="M100 124 h56 v28 h-56 Z" fill="#90a4ae"/>
        <path d="M30 146 L94 146 L100 160 L36 162 Z" fill="#b0bec5"/>
        <path d="M176 118 L204 70 M196 70 h22" stroke-width="6" fill="none"/><circle cx="214" cy="96" r="10" fill="#fff59d"/></g>`)}` };
  }
  if (art === 'uboot') {
    const b = 300, h = 170;
    return { b, h, haken: 140, html: `
      ${svgTeil(b, h, `<defs><clipPath id="bullauge-${tier}"><circle cx="204" cy="104" r="34"/></clipPath></defs>
        <g stroke="${K}" stroke-width="4" stroke-linejoin="round">
        <rect x="120" y="20" width="70" height="50" rx="10" fill="#fbc02d"/><path d="M168 20 V-0 H192" fill="none" stroke-width="6"/>
        <ellipse cx="150" cy="106" rx="140" ry="58" fill="#fdd835"/>
        <path d="M30 80 Q60 56 120 56" fill="none" stroke="#fff59d" stroke-width="8" stroke-linecap="round"/>
        <g class="propeller" style="transform-origin:8px 106px"><ellipse cx="8" cy="106" rx="9" ry="30" fill="#90a4ae"/></g>
        <circle cx="96" cy="108" r="18" fill="#4fc3f7"/><circle cx="96" cy="108" r="18" fill="none" stroke-width="5" stroke="#9e9e9e"/>
        <circle cx="204" cy="104" r="36" fill="#81d4fa"/></g>
        <image href="${KOEPFE}${tier}.png" x="166" y="66" width="76" height="76" clip-path="url(#bullauge-${tier})"/>
        <circle cx="204" cy="104" r="36" fill="#fff" opacity=".15"/>
        <circle cx="204" cy="104" r="38" fill="none" stroke="#9e9e9e" stroke-width="7"/><circle cx="204" cy="104" r="42" fill="none" stroke="${K}" stroke-width="3"/>`)}` };
  }
  if (art === 'flugzeug') {
    const b = 300, h = 190;
    return { b, h, haken: 110, html: `
      ${svgTeil(b, h, `<g stroke="${K}" stroke-width="4" stroke-linejoin="round"><rect x="70" y="58" width="190" height="20" rx="10" fill="#ffca28"/>
        <path d="M110 78 L104 128 M220 78 L226 128" stroke-width="5"/></g>`)}
      ${oberkoerper(tier, 110, 118, 18, 0.6)}
      ${svgTeil(b, h, `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
        <path d="M20 96 L46 60 L60 60 L64 104 Z" fill="#e53935"/>
        <path d="M30 108 Q30 88 80 88 L250 92 Q282 96 282 116 Q282 136 250 138 L80 140 Q30 138 30 108Z" fill="#e53935"/>
        <path d="M90 100 H230" stroke="#fff" stroke-width="6"/>
        <rect x="60" y="130" width="210" height="20" rx="10" fill="#ffca28"/>
        <path d="M130 150 L120 172 M210 150 L220 172" stroke-width="5"/>
        <circle cx="118" cy="174" r="12" fill="#37474f"/><circle cx="222" cy="174" r="12" fill="#37474f"/>
        <rect x="280" y="104" width="12" height="24" rx="4" fill="#757575"/>
        <g class="propeller" style="transform-origin:294px 116px"><ellipse cx="294" cy="116" rx="7" ry="46" fill="#bdbdbd" opacity=".85"/></g></g>`)}` };
  }
  if (art === 'gleitschirm') {
    const b = 260, h = 300;
    return { b, h, haken: 270, html: `
      ${svgTeil(b, h, `<g stroke="${K}" stroke-width="4" stroke-linejoin="round">
        <path d="M14 70 Q130 -14 246 70 Q130 30 14 70Z" fill="#ff7043"/>
        <path d="M14 70 Q40 38 70 30 L84 50 Q50 56 14 70Z M246 70 Q220 38 190 30 L176 50 Q210 56 246 70Z" fill="#fdd835"/>
        <path d="M108 22 Q130 18 152 22 L150 42 Q130 40 110 42Z" fill="#26c6da"/>
        <g stroke-width="1.6" stroke="#455a64"><path d="M18 70 L98 232 M70 42 L100 232 M120 34 L102 232 M140 34 L158 232 M190 42 L160 232 M242 70 L162 232"/></g></g>`)}
      ${figur(tier, 150, 150, 55, 150)}
      ${svgTeil(b, h, `<g stroke="${K}" stroke-width="2.5"><circle cx="100" cy="234" r="5" fill="#b0bec5"/><circle cx="160" cy="234" r="5" fill="#b0bec5"/></g>`)}` };
  }
  // zu Fuss (laufen, joggen) oder fest an einem Ort (Presse, Schlitten, Spielautomat)
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
      stand.beutel = mischen(WELT_LOOP);
      // nicht dieselbe Welt direkt nach der letzten (Beutel wird von hinten geleert)
      if (stand.beutel[stand.beutel.length - 1] === stand.letzte) stand.beutel.unshift(stand.beutel.pop());
    }
    id = stand.beutel.pop();
  }
  stand.letzte = id;
  return id;
}
