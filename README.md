# Célines Tafelspiele

Lernspiele für die digitale Schultafel. Alle Spiele laufen direkt im Browser, ohne Installation und ohne Anmeldung. Es werden keine Daten an einen Server gesendet: Einstellungen und Spielverlauf bleiben im Browser des jeweiligen Geräts.

## Spiele

| Spiel | Fach | Beschreibung |
| --- | --- | --- |
| [Mathe-Fussball](spiele/mathe-fussball/index.html) | Mathematik, 1.–4. Klasse | Zwei Teams rechnen um die Wette. Wer zuerst richtig antwortet, schiesst den Ball Richtung gegnerisches Tor. |

## Aufbau

```
index.html                 Startseite mit allen Spielen
gemeinsam/                 Stil und Hilfsfunktionen für alle Spiele
  filz.css                 Grundstil im Filzstift-Look
  hilfen.js                kleine Werkzeuge (Zufall, Speichern, Farben …)
spiele/
  mathe-fussball/          das Spiel Mathe-Fussball
    index.html
    style.css
    spiel.js
    bilder/
```

## Neues Spiel hinzufügen

1. Einen neuen Ordner unter `spiele/` anlegen, z. B. `spiele/deutsch-memory/` (Kleinbuchstaben, keine Leerzeichen, keine Umlaute).
2. Darin eine `index.html` mit dem Spiel ablegen. Gemeinsame Dateien mit `../../gemeinsam/filz.css` und `../../gemeinsam/hilfen.js` einbinden.
3. In der Startseite `index.html` in der Liste `SPIELE` einen Eintrag ergänzen.

## Lokal ansehen

Die Startseite `index.html` per Doppelklick im Browser öffnen. Alle Links funktionieren auch ohne Webserver.

---

© 2026 Silvan Hunkeler. Alle Rechte vorbehalten. Nutzung nur mit Erlaubnis.
