# Archief — afgeronde taken

Eén regel per afgeronde taak, nieuwste bovenaan. De open taken staan in de
[backlog](backlog.md).

## Backlog (vanaf oktober 2026)

*Nog niets afgerond sinds de overstap.*

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
