# Frau Bopparts Tafelspiele

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

Töne in `spiele/mathe-fussball/toene/` von Pixabay (Pixabay Content License, freie Nutzung ohne Namensnennung):
- `pfiff.mp3` – "Referee whistle blow, gymnasium" (freesound_community), pixabay.com/sound-effects/film-special-effects-referee-whistle-blow-gymnasium-6320/
- `schuss.mp3` – "Soccer Ball Kick" (freesound_community), pixabay.com/sound-effects/film-special-effects-soccer-ball-kick-37625/
- `jubel.mp3` – "Crowd Cheering in Stadium" (vishiv), pixabay.com/sound-effects/people-crowd-cheering-in-stadium-435357/
- `richtig.mp3` – "Glock – correct answer" (cartoon_music), pixabay.com/sound-effects/technology-glock-correct-answer-504462/
- `falsch.mp3` – "Wrong Answer" (Universfield), pixabay.com/sound-effects/film-special-effects-wrong-answer-126515/
- `tick.wav` – eine Sekunde aus "sec_mixdown" (freesound_community), verstärkt, pixabay.com/sound-effects/film-special-effects-sec-mixdown-62016/

Bild `spiele/mathe-fussball/bilder/vogel.png` erstellt mit ChatGPT.

Schrift: Deutschschweizer Basisschrift © NW EDK / EDK-Ost / BKZ (basisschrift.ch).
Verwendung mit Erlaubnis der Rechteinhaber. Die Schriftdatei in `gemeinsam/schriften/`
darf nicht verändert und nicht ausserhalb dieser Spiele weitergegeben werden.
