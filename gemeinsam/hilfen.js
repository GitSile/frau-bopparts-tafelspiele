'use strict';
/* =========================================================
   Frau Bopparts Tafelspiele – gemeinsame Hilfsfunktionen
   Reine Werkzeuge ohne Spiellogik. Vor dem Skript des Spiels laden:
   <script src="../../gemeinsam/hilfen.js"></script>
   ========================================================= */

/** Element per id holen */
const $ = id => document.getElementById(id);

/** Ganze Zufallszahl von min bis max (beide inklusive) */
const zufall = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Zufälliges Element einer Liste */
const waehle = liste => liste[Math.floor(Math.random() * liste.length)];

/** Gemischte Kopie einer Liste */
function mischen(liste) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Wert aus dem Browser-Speicher lesen (oder Ersatzwert) */
function laden(schluessel, ersatz) {
  try { const w = localStorage.getItem(schluessel); return w ? JSON.parse(w) : ersatz; } catch (e) { return ersatz; }
}

/** Wert im Browser-Speicher ablegen */
function speichern(schluessel, wert) {
  try { localStorage.setItem(schluessel, JSON.stringify(wert)); } catch (e) { /* egal */ }
}

/** Farbe aufhellen: anteilWeiss 0 = unverändert, 1 = weiss */
function mischeFarbe(hex, anteilWeiss) {
  const n = parseInt(hex.slice(1), 16);
  const m = c => Math.round(c + (255 - c) * anteilWeiss);
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}

/** Farbe abdunkeln: anteil 0 = unverändert, 1 = schwarz */
function dunkler(hex, anteil) {
  const n = parseInt(hex.slice(1), 16);
  const m = c => Math.round(c * (1 - anteil));
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}

/** Text sicher in HTML einsetzen */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/** Millisekunden als m:ss */
function zeitText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Ganzzahl im Bereich prüfen; gibt die Zahl oder null zurück */
function ganzzahlIn(text, min, max) {
  if (!/^\d+$/.test(String(text).trim())) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}
