# Archief — afgeronde taken

Eén regel per afgeronde taak, nieuwste bovenaan. De open taken staan in de
[backlog](backlog.md).

## Backlog (vanaf oktober 2026)

- **#1–#5 · P0-bugs uit de analyse (10-10-2026)**, bewezen met tests die vóór de fix
  faalden; op de Mac nog na te lopen in #7.
  - #1 `write_note` vergelijkt de wijzigingstijd op hele milliseconden (zoals hij de
    IPC-grens oversteekt); conflict bij het bijschrijven van een nieuw concept bewaart de
    tekst als kopie in plaats van stil te verdwijnen.
  - #2 `blob:` in `img-src` van de CSP, met een test die de CSP zelf leest.
  - #3 Geplakte afbeelding: bestandsnaam percent-encoded in de link (`foto%202.png`), en
    `%20` wordt bij het lezen terugvertaald; bestaande Obsidian-links profiteren mee.
  - #4 Een open concept blokkeert de navigatie niet meer; een concept dat pas bij het
    wegklikken wordt aangemaakt, kaapt de nieuwe keuze niet.
  - #5 Een leeg (of alleen-witruimte) concept wordt nooit een bestand, ook niet bij blur
    of `⌘S`.

## Waves W0–W9 (augustus 2026)

Gebouwd volgens de [wave-methode](07-wave-methode.md), vanaf W2 zonder de drie
wave-documenten. Elke wave: gemerged met de geautomatiseerde poort groen op Linux, maar
**geen enkele is op de Mac tegen een echte vault doorlopen** (zie backlog #7).

| Wave | Uitkomst | PR |
|---|---|---|
| W9 · Vaste eerste pagina | Startpagina via contextmenu, opent bij start, `⌘⇧H`; vervalt stil als de notitie weg is | josbez/lapis#22 |
| W8 · Bijlagen | Inline afbeeldingen (blob-URL), plakken uit klembord; eerste bijlage verhuist de notitie naar een eigen map | josbez/lapis#21 |
| W7 · Bestandsbeheer | Nieuwe notitie (concept tot eerste opslag, naam uit kopregel), nieuwe map, hernoemen, verplaatsen (pad intypen), prullenbak | josbez/lapis#20 |
| W6 · Volledige tekst zoeken | `search-index` (SQLite FTS5, buiten de vault, wegwerpbaar), `⌘⇧F`, Enter springt naar de regel | josbez/lapis#19 |
| W5 · Quick switcher | `⌘K`, fuzzy op naam en pad, recent bovenaan (in de commits "W4" genoemd) | josbez/lapis#18 |
| W4 · Focusmodel | Opslaan bij focusverlies, herladen bij terugkeer; **opgegaan in W3**, nooit als eigen stap afgerond | josbez/lapis#18 |
| W3 · Notitie schrijven | Autosave 500 ms + `⌘S`, atomair schrijven, conflictbalk met drie keuzes | josbez/lapis#18 |
| W2 · Notitie lezen | Alleen-lezen weergave, byte-behoud bij lezen bewezen | josbez/lapis#17 |
| W1 · Vault openen en tonen | Map kiezen, recursief scannen, boom, onthouden bij herstart; alle drie wave-documenten | josbez/lapis#14, josbez/lapis#15, josbez/lapis#16 |
| W0 · Spike | Gebouwd en gehard (verbeterplan sprint 1–2, CI-poort), daarna gesloten als achterhaald | josbez/lapis#12, josbez/lapis#13 |

## Verbeterplan W0 (augustus 2026)

T1–T10, T12 en T13 afgerond; T11 is als backlog #17 verder gegaan. Details in
[09 §7](09-code-analyse-en-verbeterplan.md#7-stand-van-uitvoering).
