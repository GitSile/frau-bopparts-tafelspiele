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

/* ---------- Berührungen auf Wandtafeln zuverlässig machen ----------
   Zwei Probleme auf Touch-Tafeln (Windows-Laptop, Tafel per USB):
   1. Manchmal liefert der Browser bei einer Berührung nur «touch»-Signale, aber kein pointerdown.
      Dann erzeugen wir pointerdown/-move/-up selbst («Ersatz»).
   2. Meldet die Tafel ein Loslassen nicht («Geisterfinger»), hält der Browser jede neue Berührung
      für eine Mehrfinger-Geste und erzeugt keine Klicks mehr. Deshalb lösen wir bei jeder
      Berührung den Klick selbst aus und verwerfen den Klick des Browsers, falls er doch noch kommt.
   Echte Signale und Berührungen werden über die Position einander zugeordnet, nicht nur über die
   Zeit – so stören sich zwei Kinder, die gleichzeitig tippen, nicht gegenseitig. */
const beruehrung = { anzahlErsatz: 0, anzahlEigeneKlicks: 0 };
(function () {
  const jetzt = () => performance.now();
  const nah = (a, x, y, d) => Math.abs(a.x - x) + Math.abs(a.y - y) <= d;
  const aufraeumen = (liste, ms) => { const g = jetzt() - ms; while (liste.length && liste[0].t < g) liste.shift(); };
  const echteDowns = [];    // echte pointerdown (touch) der letzten Zeit: { x, y, t, zugeordnet }
  const ersatzDowns = [];   // von uns erzeugte pointerdown: { x, y, t }
  const eigeneKlicks = [];  // von uns ausgelöste Klicks: { x, y, t }
  const offen = new Map();  // Finger-Nummer (touch) -> { ziel, ersatz, x, y, bewegt }
  const zeiger = new Map(); // pointerId einer echten Berührung -> { x, y, bewegt }

  // Klick selbst auslösen (nicht bei Auswahllisten: die öffnet nur der Browser selbst)
  function klicke(ziel, x, y) {
    if (!ziel || !ziel.isConnected || ziel.tagName === 'SELECT' || ziel.tagName === 'OPTION') return;
    if (ziel.tagName === 'TEXTAREA' || (ziel.tagName === 'INPUT' && /^(text|number|search|tel)$/.test(ziel.type))) ziel.focus();
    aufraeumen(eigeneKlicks, 1000);
    eigeneKlicks.push({ x, y, t: jetzt() });
    beruehrung.anzahlEigeneKlicks++;
    try {
      ziel.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window, detail: 1, clientX: x, clientY: y, button: 0 }));
    } catch (e) { /* egal */ }
  }

  // Echtes pointerdown einer Berührung
  window.addEventListener('pointerdown', ev => {
    if (!ev.isTrusted || ev.pointerType !== 'touch') return;
    // Kommt es erst nach unserem Ersatz für denselben Finger, verschlucken (sonst doppelt)
    aufraeumen(ersatzDowns, 600);
    const i = ersatzDowns.findIndex(e => nah(e, ev.clientX, ev.clientY, 40));
    if (i >= 0) { ersatzDowns.splice(i, 1); ev.stopImmediatePropagation(); ev.preventDefault(); return; }
    aufraeumen(echteDowns, 1000);
    echteDowns.push({ x: ev.clientX, y: ev.clientY, t: jetzt(), zugeordnet: false });
    zeiger.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, bewegt: false });
  }, true);
  window.addEventListener('pointermove', ev => {
    const z = ev.isTrusted && zeiger.get(ev.pointerId);
    if (z && Math.abs(ev.clientX - z.x) + Math.abs(ev.clientY - z.y) > 20) z.bewegt = true;
  }, { capture: true, passive: true });
  window.addEventListener('pointerup', ev => {
    const z = ev.isTrusted && zeiger.get(ev.pointerId);
    if (!z) return;
    zeiger.delete(ev.pointerId);
    if (!z.bewegt) klicke(ev.target, ev.clientX, ev.clientY);
  }, true);
  window.addEventListener('pointercancel', ev => { if (ev.isTrusted) zeiger.delete(ev.pointerId); }, true);

  // Klick des Browsers verwerfen, wenn wir für diese Berührung schon selbst geklickt haben
  window.addEventListener('click', ev => {
    if (!ev.isTrusted) return;
    aufraeumen(eigeneKlicks, 1000);
    const i = eigeneKlicks.findIndex(k => nah(k, ev.clientX, ev.clientY, 40));
    if (i >= 0) { eigeneKlicks.splice(i, 1); ev.stopImmediatePropagation(); ev.preventDefault(); }
  }, true);

  function feuere(art, ziel, t) {
    try {
      ziel.dispatchEvent(new PointerEvent(art, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 1000 + t.identifier, pointerType: 'touch', isPrimary: offen.size <= 1,
        clientX: t.clientX, clientY: t.clientY, screenX: t.screenX, screenY: t.screenY,
        button: art === 'pointermove' ? -1 : 0, buttons: art === 'pointerup' ? 0 : 1
      }));
    } catch (e) { /* sehr alter Browser */ }
  }
  // touch-Signal: gehört zu diesem Finger kein echtes pointerdown (kommt sonst kurz vorher), Ersatz erzeugen
  window.addEventListener('touchstart', ev => {
    aufraeumen(echteDowns, 1000);
    for (const t of ev.changedTouches) {
      const g = jetzt() - 500;
      const echt = echteDowns.find(e => !e.zugeordnet && e.t >= g && nah(e, t.clientX, t.clientY, 40));
      if (echt) echt.zugeordnet = true;
      const ersatz = !echt;
      offen.set(t.identifier, { ziel: t.target, ersatz, x: t.clientX, y: t.clientY, bewegt: false });
      if (ersatz) {
        aufraeumen(ersatzDowns, 600);
        ersatzDowns.push({ x: t.clientX, y: t.clientY, t: jetzt() });
        beruehrung.anzahlErsatz++;
        feuere('pointerdown', t.target, t);
      }
    }
  }, { capture: true, passive: true });
  window.addEventListener('touchmove', ev => {
    for (const t of ev.changedTouches) {
      const o = offen.get(t.identifier);
      if (!o || !o.ersatz) continue;
      if (Math.abs(t.clientX - o.x) + Math.abs(t.clientY - o.y) > 20) o.bewegt = true;
      feuere('pointermove', o.ziel, t);
    }
  }, { capture: true, passive: true });
  function ende(ev, abgebrochen) {
    for (const t of ev.changedTouches) {
      const o = offen.get(t.identifier);
      offen.delete(t.identifier);
      if (!o || !o.ersatz) continue;
      feuere(abgebrochen ? 'pointercancel' : 'pointerup', o.ziel, t);
      if (abgebrochen || o.bewegt) continue;
      klicke(o.ziel, t.clientX, t.clientY);
    }
  }
  window.addEventListener('touchend', ev => ende(ev, false), { capture: true, passive: true });
  window.addEventListener('touchcancel', ev => ende(ev, true), { capture: true, passive: true });
})();

/** Ton freischalten: Browser erlauben Ton erst nach einem «echten» Antippen. Bei Berührung zählt
    erst das Loslassen, nicht schon das Aufsetzen. Deshalb bei jeder Art von Eingabe nochmals versuchen.
    an() erzeugt bzw. weckt den Ton des Spiels und gibt den AudioContext zurück (oder null). */
function tonFreischaltenBei(an) {
  const weck = () => { try { const ac = an(); if (ac && ac.state === 'suspended') ac.resume(); } catch (e) { /* egal */ } };
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(a => window.addEventListener(a, weck, { capture: true, passive: true }));
}

// Langes Drücken auf der Spielfläche öffnet kein Kontextmenü (es würde weitere Berührungen abfangen)
document.addEventListener('contextmenu', ev => { if (ev.target && ev.target.closest && ev.target.closest('#spiel')) ev.preventDefault(); });

/* ---------- Testmodus für Tafeln: Adresse mit «?diagnose» öffnen ----------
   Zeigt oben links, welche Berührungen beim Spiel ankommen, wie flüssig es läuft
   und ob ein Fehler passiert ist. Ändert am Spiel nichts. */
(function () {
  if (!/[?&]diagnose/.test(location.search)) return;
  const z = { pointer: 0, touch: 0, maus: 0, klick: 0, bilder: 0, fps: 0, haenger: 0, fehler: '' };
  let letzte = '', box = null, t0 = performance.now(), letzterFrame = performance.now();
  const notiere = (art, ev) => { if (!ev.isTrusted) return; z[art]++; letzte = `${art} ${ev.pointerType || ''} ${Math.round(performance.now() / 1000)}s`; };
  window.addEventListener('pointerdown', ev => notiere('pointer', ev), true);
  window.addEventListener('touchstart', ev => notiere('touch', ev), { capture: true, passive: true });
  window.addEventListener('mousedown', ev => notiere('maus', ev), true);
  window.addEventListener('click', ev => notiere('klick', ev), true);
  window.addEventListener('error', ev => { z.fehler = String(ev.message).slice(0, 60); });
  // Ereignisse rund um den Ausfall: wer nimmt dem Spiel die Berührungen weg?
  const verlauf = [];
  const merke = text => { verlauf.push(`${Math.round(performance.now() / 1000)}s ${text}`); if (verlauf.length > 6) verlauf.shift(); };
  let finger = 0;
  window.addEventListener('touchstart', ev => { finger = ev.touches.length; }, { capture: true, passive: true });
  window.addEventListener('touchend', ev => { finger = ev.touches.length; }, { capture: true, passive: true });
  window.addEventListener('touchcancel', ev => { finger = ev.touches.length; merke('touchcancel'); }, { capture: true, passive: true });
  window.addEventListener('pointercancel', ev => merke('pointercancel ' + ev.pointerType), true);
  window.addEventListener('blur', () => merke('Fenster verliert Fokus'));
  window.addEventListener('focus', () => merke('Fenster hat Fokus'));
  document.addEventListener('visibilitychange', () => merke('sichtbar: ' + document.visibilityState));
  document.addEventListener('fullscreenchange', () => merke(document.fullscreenElement ? 'Vollbild an' : 'Vollbild aus'));
  window.addEventListener('resize', () => merke(`Grösse ${innerWidth}×${innerHeight}`));
  const alt = window.meldeFehler;
  window.meldeFehler = function (e, wo) { z.fehler = `${wo}: ${String((e && e.message) || e).slice(0, 50)}`; return alt(e, wo); };
  function tonZustand() {
    const ac = typeof audioCtx !== 'undefined' ? audioCtx : null;   // audioCtx gehört dem jeweiligen Spiel
    if (!ac) return 'noch nicht gestartet';
    return { running: 'läuft', suspended: 'GESPERRT', closed: 'aus' }[ac.state] || ac.state;
  }
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
      + `Ersatz: ${beruehrung.anzahlErsatz} · eigene Klicks: ${beruehrung.anzahlEigeneKlicks} · Ton: ${tonZustand()}\n`
      + `Finger auf Tafel: ${finger} · Fokus: ${document.hasFocus() ? 'ja' : 'NEIN'} · Fehler: ${z.fehler || 'keiner'}`
      + (verlauf.length ? '\n' + verlauf.join('\n') : '');
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);
})();
