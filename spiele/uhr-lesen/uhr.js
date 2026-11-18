'use strict';
/* =========================================================
   Uhr lesen – Bausteine für Uhren (ohne Spiellogik)
   - analoge Uhr als SVG (3 Zifferblätter, Zeiger)
   - Digitalanzeige mit roten Segment-Ziffern
   - Prüfung der getippten Uhrzeit
   ========================================================= */

/* Zifferblatt-Arten */
const ZIFFERBLAETTER = [
  { id: 'alle',    name: 'Striche und alle Zahlen' },
  { id: 'viertel', name: 'Nur 3, 6, 9, 12' },
  { id: 'keine',   name: 'Nur Striche' }
];

/* Farben und Längen der Zeiger (Radius der Uhr = 100) */
const ZEIGER = {
  stunde: { farbe: '#d32f2f', laenge: 44, breite: 10, hinten: 12 },   // rot, kurz und dick
  minute: { farbe: '#1b5e20', laenge: 70, breite: 6.5, hinten: 14 }   // dunkelgrün, lang (bis zu den Strichen)
};

/** Winkel (Grad, 0 = oben, im Uhrzeigersinn) der beiden Zeiger für eine Zeit in Minuten (0..719).
    Wie bei einer echten Uhr steht der Stundenzeiger je nach Minuten zwischen zwei Zahlen. */
function zeigerWinkel(minutenGesamt) {
  const t = ((minutenGesamt % 720) + 720) % 720;
  return { stunde: t / 2, minute: (t % 60) * 6 };
}

/* Uhr zum Stellen: beide Zeiger sind unabhängig und rasten in Viertelstunden ein.
   s = Stellung des Stundenzeigers in Viertelstunden-Schritten (0..47, je 7,5°),
   m = Stellung des Minutenzeigers in Viertelstunden (0..3, je 90°). */
function zeigerStellung(minutenGesamt) {
  const t = ((minutenGesamt % 720) + 720) % 720;
  return { s: t / 15, m: (t % 60) / 15 };
}
function stellungRichtig(z, minutenGesamt) {
  const soll = zeigerStellung(minutenGesamt);
  return z.s === soll.s && z.m === soll.m;
}
function stelleZeiger(svg, z) {
  svg.querySelector('.zeiger-stunde').setAttribute('transform', `rotate(${(z.s * 7.5).toFixed(2)})`);
  svg.querySelector('.zeiger-minute').setAttribute('transform', `rotate(${z.m * 90})`);
}

/** Minuten seit 12 Uhr (0..719) für Stunde h (0..24) und Minute m */
function minutenVon(h, m) { return ((h % 12) * 60 + m) % 720; }

/** Zeit als Text "3:15" (12-Stunden-Form, 1..12) */
function zeitText12(minutenGesamt) {
  const t = ((minutenGesamt % 720) + 720) % 720;
  const h = Math.floor(t / 60) || 12, m = t % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Prüft eine getippte Uhrzeit.
 * h: Stunde der Aufgabe (1..12), m: Minute (0, 15, 30, 45)
 * Richtig sind z. B. für Viertel nach drei: 3:15, 03:15, 15:15.
 * Für 12 Uhr: 12:00, 0:00, 00:00 und 24:00.
 * Rückgabe: 'richtig' | 'falsch' | 'doppelpunkt' (Doppelpunkt fehlt) | 'leer'
 */
function pruefeEingabe(text, h, m) {
  const t = String(text).trim();
  if (!t) return 'leer';
  const r = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!r) return t.includes(':') ? 'falsch' : 'doppelpunkt';
  const hh = Number(r[1]), mm = Number(r[2]);
  if (mm > 59 || hh > 24 || (hh === 24 && mm !== 0)) return 'falsch';
  return mm === m && hh % 12 === h % 12 ? 'richtig' : 'falsch';
}

/**
 * Setzt einen fehlenden Doppelpunkt ein: 4 Ziffern -> in der Mitte (1530 -> 15:30),
 * 3 Ziffern -> nach der ersten (315 -> 3:15). Sonst bleibt der Text, wie er ist.
 */
function ergaenzeDoppelpunkt(text) {
  const t = String(text).trim();
  if (t.includes(':') || !/^[0-9]+$/.test(t)) return t;
  if (t.length === 4) return t.slice(0, 2) + ':' + t.slice(2);
  if (t.length === 3) return t.slice(0, 1) + ':' + t.slice(1);
  return t;
}

/* ---------- Analoge Uhr ---------- */
let uhrZaehler = 0;
/**
 * SVG einer Wanduhr. art: 'alle' | 'viertel' | 'keine'.
 * nagel: true = die Uhr hängt an einem Nagel (Platz darüber).
 */
function uhrSvg(art, { nagel = true, klasse = '' } = {}) {
  const id = 'u' + (++uhrZaehler);
  const striche = [];
  // Nur die 12 Stundenstriche – keine Minutenstriche
  for (let i = 0; i < 12; i++) {
    striche.push(`<line x1="0" y1="-57" x2="0" y2="-71" transform="rotate(${i * 30})" stroke="#111" stroke-width="5.5"/>`);
  }
  const zahlen = [];
  for (let z = 1; z <= 12; z++) {
    if (art === 'keine') break;
    if (art === 'viertel' && z % 3 !== 0) continue;
    const w = z * 30 * Math.PI / 180, r = 83;   // Zahlen aussen, ausserhalb der Striche
    const x = (r * Math.sin(w)).toFixed(1), y = (-r * Math.cos(w)).toFixed(1);
    zahlen.push(`<text x="${x}" y="${y}" class="uhr-zahl${art === 'viertel' ? ' gross' : ''}">${z}</text>`);
  }
  const zeiger = (name) => {
    const z = ZEIGER[name];
    return `<g class="zeiger zeiger-${name}" filter="url(#${id}-schatten)">
      <rect x="${-z.breite / 2}" y="${-z.laenge}" width="${z.breite}" height="${z.laenge + z.hinten}" rx="${z.breite / 2.6}" fill="${z.farbe}"/>
    </g>`;
  };
  const oben = nagel ? -128 : -108;
  return `<svg class="uhr ${klasse}" viewBox="-108 ${oben} 216 ${108 - oben + 8}" aria-label="Uhr">
    <defs>
      <radialGradient id="${id}-blatt" cx="40%" cy="35%" r="75%">
        <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef1f3"/>
      </radialGradient>
      <linearGradient id="${id}-rand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5b6168"/><stop offset=".5" stop-color="#23272b"/><stop offset="1" stop-color="#0d0f11"/>
      </linearGradient>
      <filter id="${id}-schatten" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="1.2" dy="2" stdDeviation="1.2" flood-color="#000" flood-opacity=".35"/>
      </filter>
      <filter id="${id}-wand" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="4" dy="7" stdDeviation="5" flood-color="#000" flood-opacity=".28"/>
      </filter>
    </defs>
    ${nagel ? `
    <!-- Nagel und Aufhänger -->
    <g class="nagel">
      <path d="M -9 -100 L 0 -119 L 9 -100" fill="none" stroke="#6d6f72" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="1.5" cy="-116" rx="5.5" ry="3" fill="#000" opacity=".18"/>
      <circle cx="0" cy="-119" r="5" fill="#9ea3a8" stroke="#55595e" stroke-width="1.2"/>
      <circle cx="-1.4" cy="-120.4" r="1.6" fill="#e8ebee"/>
    </g>` : ''}
    <g filter="url(#${id}-wand)">
      <circle r="104" fill="url(#${id}-rand)"/>
      <circle r="97" fill="#c9ced3"/>
      <circle r="95.5" fill="url(#${id}-blatt)"/>
    </g>
    <g class="striche">${striche.join('')}</g>
    <g class="zahlen">${zahlen.join('')}</g>
    ${zeiger('stunde')}
    ${zeiger('minute')}
    <circle r="7.5" fill="#111"/>
    <circle r="2.6" fill="#777"/>
    <!-- Glas-Glanz -->
    <path d="M -70 -55 A 88 88 0 0 1 40 -86 A 100 100 0 0 0 -70 -55 Z" fill="#fff" opacity=".35" pointer-events="none"/>
  </svg>`;
}

/** Zeiger einer Uhr (SVG-Element) auf eine Zeit stellen */
function stelleUhr(svg, minutenGesamt) {
  const w = zeigerWinkel(minutenGesamt);
  svg.querySelector('.zeiger-stunde').setAttribute('transform', `rotate(${w.stunde.toFixed(2)})`);
  svg.querySelector('.zeiger-minute').setAttribute('transform', `rotate(${w.minute.toFixed(2)})`);
}

/* ---------- Digitalanzeige mit Segment-Ziffern ---------- */
/* Segmente a–g:  a oben, b oben rechts, c unten rechts, d unten, e unten links, f oben links, g Mitte */
const SEGMENTE = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', ' ': ''
};
function segmentZiffer(z, x) {
  // Ziffer 56 breit, 100 hoch, leicht schräg
  const w = 56, h = 100, d = 11, s = 3;   // d = Segmentdicke, s = Abstand
  const hor = (y) => `M ${s + d / 2} ${y} l ${d / 2} ${-d / 2} h ${w - 2 * s - 2 * d} l ${d / 2} ${d / 2} l ${-d / 2} ${d / 2} h ${-(w - 2 * s - 2 * d)} z`;
  const ver = (xx, y0) => `M ${xx} ${y0 + s + d / 2} l ${d / 2} ${d / 2} v ${h / 2 - 2 * s - 2 * d} l ${-d / 2} ${d / 2} l ${-d / 2} ${-d / 2} v ${-(h / 2 - 2 * s - 2 * d)} z`;
  const pfade = {
    a: hor(d / 2), g: hor(h / 2), d: hor(h - d / 2),
    f: ver(d / 2, 0), b: ver(w - d / 2, 0), e: ver(d / 2, h / 2), c: ver(w - d / 2, h / 2)
  };
  const an = SEGMENTE[z] || '';
  return `<g transform="translate(${x} 0) skewX(-7)">${Object.keys(pfade).map(k =>
    `<path d="${pfade[k]}" class="${an.includes(k) ? 'seg an' : 'seg aus'}"/>`).join('')}</g>`;
}
/** SVG mit "hh:mm" in roten Segmenten. text z. B. "3:15" oder "15:45" */
function segmentSvg(text) {
  const [h, m] = text.split(':');
  const hh = h.padStart(2, ' ');
  const ziffern = [hh[0], hh[1], m[0], m[1]];
  const xs = [0, 68, 166, 234];
  return `<svg class="segmente" viewBox="-14 -12 318 124" aria-label="${text}">
    ${ziffern.map((z, i) => segmentZiffer(z, xs[i])).join('')}
    <circle cx="146" cy="30" r="7" class="seg an punkt"/><circle cx="140" cy="72" r="7" class="seg an punkt"/>
  </svg>`;
}

// Für automatische Tests mit Node
if (typeof module !== 'undefined') module.exports = { zeigerStellung, stellungRichtig, pruefeEingabe, ergaenzeDoppelpunkt, minutenVon, zeigerWinkel, zeitText12 };
