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

/* ---------- Schutz gegen Hänger ----------
   Ein unerwarteter Fehler (z. B. im Browser einer Wandtafel) darf das Spiel nicht anhalten.
   Fehler werden anonym über den Besucherzähler gemeldet (Pfad «fehler/…»), damit wir sie finden. */
const gemeldeteFehler = new Set();
function meldeFehler(e, wo) {
  try {
    const text = String((e && (e.message || e)) || 'unbekannt').slice(0, 100);
    const teile = location.pathname.split('/').filter(t => t && t !== 'index.html');
    const pfad = `fehler/${teile.slice(-1)[0] || 'start'}/${wo || 'js'}: ${text}`;
    if (gemeldeteFehler.has(pfad) || gemeldeteFehler.size >= 10) return;
    gemeldeteFehler.add(pfad);
    if (window.console) console.warn('Fehler abgefangen:', wo, e);
    const browser = navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 150);
    const senden = () => {
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: pfad, title: browser, event: true });
    };
    if (window.goatcounter && window.goatcounter.count) senden(); else setTimeout(senden, 4000);
  } catch (x) { /* Melden darf nie selbst stören */ }
}
window.addEventListener('error', ev => meldeFehler(ev.error || ev.message, ev.filename ? ev.filename.split('/').pop() + ':' + ev.lineno : 'js'));
window.addEventListener('unhandledrejection', ev => meldeFehler(ev.reason, 'promise'));

/** Alle Funktionen eines Objekts (z. B. TON) so umhüllen, dass ein Fehler darin nur gemeldet wird */
function schuetze(obj, name) {
  Object.keys(obj).forEach(k => {
    const f = obj[k];
    if (typeof f !== 'function') return;
    obj[k] = function (...a) { try { return f.apply(this, a); } catch (e) { meldeFehler(e, `${name}.${k}`); } };
  });
}

/* ---------- Testmodus für Tafeln: Adresse mit «?diagnose» öffnen ----------
   Zeigt oben links, welche Berührungen beim Spiel ankommen, wie flüssig es läuft
   und ob ein Fehler passiert ist. Ändert am Spiel nichts. */
(function () {
  if (!/[?&]diagnose/.test(location.search)) return;
  const z = { pointer: 0, touch: 0, maus: 0, klick: 0, bilder: 0, fps: 0, haenger: 0, fehler: '' };
  let letzte = '', box = null, t0 = performance.now(), letzterFrame = performance.now();
  const notiere = (art, ev) => { z[art]++; letzte = `${art} ${ev.pointerType || ''} ${Math.round(performance.now() / 1000)}s`; };
  window.addEventListener('pointerdown', ev => notiere('pointer', ev), true);
  window.addEventListener('touchstart', ev => notiere('touch', ev), { capture: true, passive: true });
  window.addEventListener('mousedown', ev => notiere('maus', ev), true);
  window.addEventListener('click', ev => notiere('klick', ev), true);
  window.addEventListener('error', ev => { z.fehler = String(ev.message).slice(0, 60); });
  const alt = window.meldeFehler;
  window.meldeFehler = function (e, wo) { z.fehler = `${wo}: ${String((e && e.message) || e).slice(0, 50)}`; return alt(e, wo); };
  function bild(jetzt) {
    z.bilder++;
    if (jetzt - letzterFrame > 1500) z.haenger++;
    letzterFrame = jetzt;
    if (jetzt - t0 >= 1000) { z.fps = Math.round(z.bilder * 1000 / (jetzt - t0)); z.bilder = 0; t0 = jetzt; }
    if (!box && document.body) {
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;background:rgba(0,0,0,.75);color:#0f0;font:20px/1.3 monospace;padding:4px 8px;border-radius:6px;pointer-events:none;white-space:pre';
      document.body.appendChild(box);
    }
    if (box) box.textContent = `Berührungen: pointer ${z.pointer} · touch ${z.touch} · maus ${z.maus} · klick ${z.klick}\n`
      + `letzte: ${letzte}\nBilder/s: ${z.fps} · Hänger: ${z.haenger} · Zeit: ${Math.round(jetzt / 1000)}s\n`
      + `Fehler: ${z.fehler || 'keiner'}`;
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);
})();
