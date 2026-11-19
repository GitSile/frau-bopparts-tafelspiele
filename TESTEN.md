# Test-Auftrag für alle Tafelspiele

Diesen Text als Auftrag in einen neuen Claude-Chat kopieren (Ordner: dieses Repository).
Antworten und Bericht auf Deutsch (Schweizer Hochdeutsch, «ss» statt «ß»), kurz, ohne Fachjargon.

---

## Auftrag

Teste alle Spiele von «Frau Bopparts Tafelspiele» gründlich, so wie eine Lehrerin sie an der digitalen
Schultafel benutzen würde. **Ändere dabei nichts am Code.** Am Schluss lieferst du einen Bericht mit den
gefundenen Fehlern und mit Verbesserungsvorschlägen.

### Vorbereitung

1. `main` holen (`git fetch`, `git merge origin/main`), damit du den aktuellen Stand testest.
2. Lokalen Testserver starten (`.claude/launch.json`, sonst `python -m http.server` im Repository) und die
   Startseite im eingebauten Browser öffnen. Die Spiele liegen in `spiele/<name>/index.html`.
3. Für jedes Spiel zuerst `index.html` und `spiel.js` lesen: Welche Einstellungen gibt es, welche Regeln,
   welche Töne (`TON`-Objekt), welche Posen (`stehen`, `freude`, `jubel`, `traurig`, `sprung`), welche
   Test-Abkürzungen (z. B. Tippen auf die Level-Anzeige bzw. die Tafel springt ans Level-/Spielende).
4. Achtung: Im versteckten Browser-Fenster läuft die Zeit gebremst (`requestAnimationFrame` und Timer).
   Für lange Abläufe die Spielzeit selbst vorspulen: `setTimeout`/`requestAnimationFrame` durch eine
   eigene Uhr ersetzen und `schleife(t)` in 50-ms-Schritten aufrufen. Skripte kurz halten (< 40 s pro Aufruf).

### Die Spiele

| Spiel | Personen | Tiere |
|---|---|---|
| Mathe-Fussball | 2 | alle 9 (zwei Teams) |
| Mathe-Erlebnisse | 1 | alle 9, alle 14 Welten |
| Uhr lesen | 1 oder 2 | alle 9 |
| Einkaufen | 1 oder 2 | alle 9 |

Tiere: Löwe, Tiger, Bär, Elefant, Fuchs, Wolf, Adler, Hai, Erdmännchen.

### 1. Voll durchspielen (Standard-Einstellungen)

Für **jedes Spiel** und **jede Personenzahl**, die es anbietet, ein ganzes Spiel bis zum Ende spielen
(bei Mathe-Erlebnisse mindestens 16 Levels, damit jede Welt einmal drankommt und sich danach wiederholt).
Dabei kommt **jedes Tier mindestens einmal** dran: über die Spiele verteilt oder mit dem Würfel neu wählen.
Richtige und falsche Antworten mischen, auch «Ich weiss es nicht» und Pause/Weiter benutzen.

### 2. Einstellungen einzeln prüfen

Jede Einstellung einzeln ändern, das Spiel starten und nur so lange spielen, bis klar ist, dass die
Regel eingehalten wird (meist 3–6 Aufgaben), dann abbrechen. Beispiele:

- Zahlenraum (10, 20, 100, 1000, eigener Wert): kein Ergebnis und keine Zahl darüber
- Rechenarten, Einmaleins-Reihen, Zehnerübergang ein/aus, Stellen (E / ZE)
- Aufgabenarten (Kopfrechnen, Mengen, Doppelt, Hälfte, Verliebte Zahlen): nur die gewählten kommen
- Nie zweimal hintereinander dasselbe Ergebnis (ausser «Verliebte Zahlen», das ergibt immer 10)
- Zeitlimit ein/aus und Sekunden; Wechselzeit (0 = sofort weiter); bei 1 Person nie ein Countdown
- «Bei falscher Antwort einen Schritt zurück», Rückrollen, Tore bis zum Sieg, Minuten
- Uhr lesen: Lesen/Stellen, ganz/halb/viertel, Nachmittag, Doppelpunkt, «Hilfe ein»
  (Stundenzeiger darf eine Viertelstunde daneben stehen), Schritte, Zurück
- Einkaufen: Zahlenraum, Stufen (Franken / Fünfer / Zehner), Säckchen, Produkte selbst wählen
- Ton aus: wirklich still
- Ungültige Eingaben (leeres Feld, 0, zu gross): verständliche Fehlermeldung, kein Absturz
- Einstellungen bleiben nach Neuladen erhalten

### 3. Ton und Bewegung müssen zusammenpassen

Die Ton-Funktionen (`spieleDatei`, `piep`, `TON.*`) mitprotokollieren (Zeitpunkt und Name) und daneben
die Pose bzw. Klassen des Tiers (`#akteur`, Figuren-Bilder) zum selben Zeitpunkt. Prüfen:

- Richtig-Ton genau beim Freuen, Falsch-Ton beim Traurigsein
- Jubelton genau dann, wenn das Tier zu jubeln beginnt (nicht vorher, nicht deutlich später),
  auch beim Hebelziehen (Presse, Spielautomat) und bei der Test-Abkürzung
- Kran-Geräusch nur, während sich der Haken bewegt; keine Stimme aus der Aufnahme
- Kein Ton doppelt, keiner fehlt, keiner läuft nach Spielende oder in der Pause weiter
- Abweichungen über ca. 150 ms als Fehler melden

### 4. Bilder im Detail anschauen

Für jedes Tier in jeder Welt bzw. Szene ein Bildschirmfoto machen und **stark vergrössert** prüfen
(`zoom` oder die Seite per CSS vergrössern):

- Alle Bilder laden (keine kaputten Bilder, keine Fehler in der Konsole)
- Tiere sitzen richtig im Fahrzeug, stehen auf dem Boden statt zu schweben, Räder auf der Rampe,
  nichts abgeschnitten, keine grünen oder weissen Ränder vom Freistellen
- Teile sitzen genau: Propeller, Schiffsschraube, Hebel und Faust, Kabel und Stecker,
  Pressplatte auf der Dose, Möwen mit Fähnchen, Ziellinien, Windsack
- Kran: Haken greift hinten am Rücken, das Tier hängt glaubwürdig, keine Sprünge beim Weltwechsel
- Schriften: richtig geschrieben (Zuzwil, Aadorf, Zuzi-Bahn, Preise, Uhrzeiten), gut lesbar
- Verschiedene Bildschirmgrössen: Tafel quer (z. B. 1920×1080), höher (1600×1200), Laptop, Handy hoch
- Hell und dunkel, Vollbild

### 5. Bericht

Am Schluss einen Bericht schreiben (als Artifact, damit er auch auf dem Handy lesbar ist):

1. **Kurzfazit** pro Spiel (läuft gut / kleine Mängel / Fehler)
2. **Fehler**: was, wo (Spiel, Tier, Welt, Einstellung), wie nachstellen, Bildschirmfoto,
   wie schlimm (stört den Unterricht / fällt auf / Kleinigkeit)
3. **Was geprüft wurde und was nicht** (z. B. Ton nur per Protokoll, nicht gehört)
4. **Verbesserungsvorschläge**: für Kinder (Verständlichkeit, Motivation, Fairness bei 2 Personen),
   für die Lehrerin (Einstellungen, Bedienung an der Tafel), Gestaltung, Tempo der Animationen,
   Barrierefreiheit (Farben, Schriftgrösse, Ton aus). Je Vorschlag ein Satz Nutzen und ein Satz Aufwand,
   nach Nutzen sortiert.

Danach fragen, welche Fehler und Vorschläge umgesetzt werden sollen. Nichts selbst umsetzen.
