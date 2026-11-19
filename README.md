# Frau Bopparts Tafelspiele

Lernspiele für die digitale Schultafel. Alle Spiele laufen direkt im Browser, ohne Installation und ohne Anmeldung. Es werden keine Daten an einen Server gesendet: Einstellungen und Spielverlauf bleiben im Browser des jeweiligen Geräts.

## Spiele

| Spiel | Fach | Beschreibung |
| --- | --- | --- |
| [Mathe-Fussball](spiele/mathe-fussball/index.html) | Mathematik, 1.–4. Klasse | Zwei Teams rechnen um die Wette. Wer zuerst richtig antwortet, schiesst den Ball Richtung gegnerisches Tor. |
| [Uhr lesen](spiele/uhr-lesen/index.html) | Mathematik | Für 1 oder 2 Kinder: Uhrzeiten ablesen und eintippen oder die Zeiger einer Uhr stellen. Jede richtige Antwort bringt das Tier mit der Fackel näher an die Zündschnur – dann startet die Rakete. |
| [Mathe-Erlebnisse](spiele/mathe-wanderung/index.html) | Mathematik, 1.–4. Klasse | Für eine Person: Mit jeder richtigen Antwort kommt das Tier einen Schritt weiter. 8 richtige Antworten = Level geschafft, dann hebt der Kran das Tier in die nächste von 14 Welten (jede kommt einmal dran, bevor sich eine wiederholt). |
| [Einkaufen](spiele/einkaufen/index.html) | Mathematik | Für 1 oder 2 Kinder: Im Markt liegen Produkte mit Preisschild auf dem Kassenband (auf Wunsch legen die Kinder sie selbst aufs Band). Wer das Total in Franken richtig ausrechnet, bekommt eine Goldmünze ins Samtsäckchen. Sind alle Säckchen voll, ist das Spiel fertig. |

## Aufbau

```
index.html                 Startseite mit allen Spielen
gemeinsam/                 Stil und Hilfsfunktionen für alle Spiele
  filz.css                 Grundstil im Filzstift-Look
  hilfen.js                kleine Werkzeuge (Zufall, Speichern, Farben …)
  mathe-aufgaben.js        Rechenaufgaben für Mathe-Fussball und Mathe-Erlebnisse
spiele/
  mathe-fussball/          das Spiel Mathe-Fussball
    index.html
    style.css
    spiel.js
    bilder/
  uhr-lesen/               das Spiel Uhr lesen
    index.html
    style.css
    uhr.js                 Uhren (Zifferblatt, Zeiger, Digitalanzeige) und Prüfung der Eingabe
    spiel.js
    bilder/
  mathe-wanderung/         das Spiel Mathe-Erlebnisse (benutzt Tiere, Töne und Mengen-Bilder von Mathe-Fussball)
    index.html
    style.css
    welten.js              die 14 Welten (gemalte Hintergründe + Zeichnungen darüber)
    spiel.js
    bilder/
  einkaufen/               das Spiel Einkaufen
    index.html
    style.css
    produkte.js            die 30 Produkte und die Preise (in Rappen gerechnet)
    spiel.js
    bilder/                Laden, Kassiererin, Goldsäckchen, Elefant mit Einkaufskorb, produkte/ (30 Produkte)
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

Bild `spiele/mathe-fussball/bilder/vogel.png` und die Bilder in `spiele/mathe-fussball/bilder/mengen/` (Icons wie Hände, Torte, Fussballer, Tiere, Eier, Muffins, Autos, Ballone, Sterne, Flaschen sowie Wüste und Strand) erstellt mit ChatGPT. Kerzen, Ast, Würfel, Domino, Striche, Perlen und Punkte sind als Vektorgrafik im Code gezeichnet (`mengen.js`).

Bilder in `spiele/uhr-lesen/bilder/` (Tiere mit Fackel, gebückte Tiere beim Zünden, Flammenbilder für die flackernde Fackel, Rakete mit Zündschnüren, Wecker, Abendlandschaft, Fuchs mit Uhr für die Startseite) erstellt mit ChatGPT. Uhren, Zeiger, rote Segment-Ziffern, Zündschnur und Feuerwerk sind im Code gezeichnet (`uhr.js`, `spiel.js`). Uhr lesen verwendet zusätzlich die Töne `richtig.mp3`, `falsch.mp3` und `tick.wav`, die Tierköpfe, die jubelnden Figuren und den Vogel aus Mathe-Fussball; Zischen, Heulen und Knall der Rakete werden im Code erzeugt.

Mathe-Erlebnisse: Mit ChatGPT erstellt sind der Bär-Wanderer (`spiele/mathe-wanderung/bilder/baer-wandern.png`), die 14 Welt-Hintergründe (`bilder/welten/`, mit den aufgesprühten Ziellinien und dem Landeplatz im Gras; den Schriftzug «Zuzi-Bahn» auf dem Zug haben wir selbst perspektivisch eingesetzt), die Maschinen, das Steuerpult, das U-Boot, die Möwen mit Zielfähnchen (4 Bilder eines Flügelschlags) und die Münze (`bilder/teile/`), die Fahrzeuge mit jedem Tier am Steuer (Buggy, Boot, Flugzeug mit Fliegerbrille, Schlitten, Gleitschirm mit Gurtzeug; `bilder/fahrzeuge/`) und die Posen zum Hebelziehen (`bilder/hebel/`). Ortsnamen («Zuzwil», «Aadorf»), Fahnen, Stufen-Zeichen, Zielband, Windsack, Hebel, Kabel und Kran sind im Code gezeichnet (`welten.js`, `index.html`). Das Spiel benutzt die Tierfiguren, Tierköpfe, den Vogel und die Töne von Mathe-Fussball. Das Kran-Geräusch `spiele/mathe-wanderung/toene/kran-hydraulik.mp3` ist «Homemade hydraulic hoist» von chainsaw_dinner_party (Freesound) über Pixabay (https://pixabay.com/sound-effects/technology-homemade-hydraulic-hoist-30527/, Pixabay Content License); das Spiel spielt nur Ausschnitte daraus, ohne die gesprochenen Worte am Anfang.

Einkaufen: Die Bilder in `spiele/einkaufen/bilder/` (Laden-Hintergrund, 30 Produkte in `produkte/`, Kassiererin, Goldsäckchen, Elefant mit Einkaufskorb) wurden mit ChatGPT erstellt. Regal, Kühlschrank, Kasse, Preisschilder, die aufgestickten Zahlen und die Münzen sind im Code gezeichnet (`style.css`, `spiel.js`). Das Spiel benutzt die Töne `richtig.mp3`, `falsch.mp3`, `tick.wav` und `jubel.mp3`, die Tierköpfe, die jubelnden Figuren und den Vogel von Mathe-Fussball; das Klimpern der Münzen wird im Code erzeugt.

Schrift: Deutschschweizer Basisschrift © NW EDK / EDK-Ost / BKZ (basisschrift.ch).
Verwendung mit Erlaubnis der Rechteinhaber. Die Schriftdatei in `gemeinsam/schriften/`
darf nicht verändert und nicht ausserhalb dieser Spiele weitergegeben werden.
