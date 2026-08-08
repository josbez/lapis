# Lapis

Een rustige markdown-editor voor een map met `.md`-bestanden op je Mac.

Lapis doet wat Obsidian doet op de dag dat je gewoon wilt schrijven en terugvinden —
en verder niets. Geen graph view, geen plugin-store, geen ribbon met twaalf iconen.
Je bestanden blijven gewone markdown in een gewone map.

**Status:** [PRD v1.1](docs/03-prd.md) is geldig en de
[wave-indeling](docs/07-wave-methode.md#5-voorstel-wave-indeling) is goedgekeurd — elf
waves, als issues `#1`–`#11`. Stack: Tauri v2 · React · CodeMirror 6 · SQLite FTS5.
Goal Document en Wave Specification voor W0 zijn goedgekeurd; het
[Test & Verification Plan](docs/waves/W0-spike/02-testplan.md) wacht op goedkeuring.
De W0-spike staat er, met een [CI-poort](.github/workflows/ci.yml) eromheen; wat nog
ontbreekt is de doorloop op de Mac. Voor W1 zijn Goal Document, Wave Specification en
Test & Verification Plan alle drie goedgekeurd — de vier beslisvragen uit het Goal
Document zijn beantwoord, en `app/` opent een vault-map, scant recursief, toont de
boom, en onthoudt de keuze bij herstart. W2 (notitie lezen) en W3 (notitie schrijven)
zijn **bewust zonder de drie wave-documenten gebouwd** — op expliciet verzoek van Jos,
een afwijking van de normale werkwijze in plaats van een vergissing. Eén beslissing uit
W3 is wél apart aan Jos voorgelegd omdat de PRD daar zelf expliciet om vroeg: bij een
conflict (extern gewijzigd terwijl je zelf aan het typen bent) toont Lapis een balk met
drie keuzes — mijn versie behouden · hun versie laden · beide bewaren (PRD §10,
besluit 1) — in plaats van het eenvoudiger "sluit als Snapchat" uit een eerdere
antwoordronde. Een notitie is nu bewerkbaar met autosave (500ms na de laatste toets,
plus `⌘S`) en atomair schrijven (tijdelijk bestand, `fsync`, `rename()`); alleen-lezen
is sinds W3 voorbehouden aan een actief conflict. Alle geautomatiseerde verificatie
voor W1, W2 en W3 is groen; wat nog ontbreekt is de handmatige doorloop op Jos' eigen
vault op de Mac. **Voor die doorloop geldt afspraak V6a/V6b uit
[08-vervolgvragen.md](docs/08-vervolgvragen.md#-v6--geen-back-ups-agents-die-schrijven-en-een-geblokkeerd-document):**
alle schrijftests in dit project draaien uitsluitend tegen tijdelijke fixture-vaults,
nooit tegen `~/Documents` — en vóór Jos zelf tegen zijn echte vault test, hoort daar een
`git init` + commit aan vooraf te gaan, als vangnet.

**Mismatch met de geplande wave-indeling, hier expliciet gemeld:** volgens
[07 §5](docs/07-wave-methode.md#5-voorstel-wave-indeling) hoort het focusmodel (opslaan
bij focusverlies, herladen bij terugkeer, het conflictgeval) een **eigen wave (W4)** te
zijn, juist omdat het "de meeste manieren heeft om subtiel fout te gaan". Die logica zit
inmiddels al in wat hierboven "W3" heet, in plaats van er apart uitgelicht te zijn. Wat
er ná W3 is gebouwd, heet daarom in de commits en PR's "W4" maar is inhoudelijk het
gedocumenteerde **W5 — de quick switcher**: `⌘K`, fuzzy zoeken op bestandsnaam en pad in
het geheugen (geen index — dat is het echte W6, full-text search met SQLite FTS5),
recent geopende notities bovenaan bij een lege invoer. Alle geautomatiseerde verificatie
is groen.

## Documenten

| Document | Waarvoor | Status |
|---|---|---|
| [00 – Aanpak](docs/00-aanpak-pm.md) | Rolverdeling, human in the lead, waar we staan | actueel |
| [01 – Concurrentieonderzoek](docs/01-concurrentieonderzoek.md) | Wie doet dit al, en waar zit het gat | onderzoek, feitelijk |
| [02 – Haalbaarheidsonderzoek](docs/02-haalbaarheidsonderzoek.md) | Kan dit gebouwd worden, en tegen welke prijs | onderzoek, met open keuzes |
| **[03 – PRD v1.1](docs/03-prd.md)** | **Probleem, scope, anti-scope, succescriteria** | ✅ **geldig** |
| [04 – Technische optieverkenning](docs/04-technische-spec.md) | Achtergrond bij de stackkeuzes | achtergrond |
| [05 – Open vragen, ronde 1](docs/05-open-vragen.md) | Alle keuzes, met Jos' antwoorden | ✅ beantwoord |
| [06 – Beslisinput techniek](docs/06-beslisinput-techniek.md) | Electron vs Tauri, mobiel, sync, urenopbouw | ✅ input voor 05 |
| [07 – Wave-methode](docs/07-wave-methode.md) | Hoe we per brok werken | voorstel |
| [08 – Vervolgvragen, ronde 2](docs/08-vervolgvragen.md) | Besluitenregister, met Jos' antwoorden | ✅ beantwoord |
| [09 – Code-analyse en verbeterplan](docs/09-code-analyse-en-verbeterplan.md) | Bevindingen W0-code als backlog: epics, sprints, taken, agent-inzet | ✅ sprint 1 en 2 verwerkt |
| [W0 – Goal Document](docs/waves/W0-spike/00-goal.md) | Spike: wil ik hierin typen? | ✅ goedgekeurd |
| [W0 – Wave Specification](docs/waves/W0-spike/01-spec.md) | Het implementatiecontract voor de spike | ✅ goedgekeurd |
| **[W0 – Test & Verification Plan](docs/waves/W0-spike/02-testplan.md)** | **Wat er bewezen moet worden vóór er code is** | ⏳ **ter goedkeuring** |
| [W0 – Bewijsverslag](docs/waves/W0-spike/03-bewijs.md) | Wat er draaide, wat faalde, wat niet getest is | onvolledig — wacht op de doorloop |
| [W1 – Goal Document](docs/waves/W1-vault-lezen/00-goal.md) | Vault openen en tonen: doel, scope, grenzen | ✅ goedgekeurd |
| [W1 – Wave Specification](docs/waves/W1-vault-lezen/01-spec.md) | Het implementatiecontract: `app/`, `vault-core`, `app-state` | ✅ goedgekeurd |
| **[W1 – Test & Verification Plan](docs/waves/W1-vault-lezen/02-testplan.md)** | **Wat er bewezen moet worden, met de schrijfvrij-test als zwaarste eis** | ✅ **vastgesteld, geautomatiseerd bewijs groen** |

## Werkwijze

Human in the lead: keuzes liggen bij Jos, niet bij de agent. Vanaf de bouwfase werkt elke
wave met drie documenten in vaste gezagsvolgorde — Goal Document, Wave Specification,
Test & Verification Plan — met een goedkeuringsmoment vóór elk van de drie. Zie
[07](docs/07-wave-methode.md).

## Het idee, als voorstel

*Deze punten zijn richting, geen afspraak — ze liggen als vraag terug in
[05](docs/05-open-vragen.md).*

1. Wijs Lapis naar een map. Dat is de hele configuratie.
2. Je ziet je tekst, opgemaakt, terwijl je typt. Eén venster.
3. `⌘K` om iets te openen, `⌘⇧F` om iets te vinden.
4. Lokaal, geen account, geen cloud, geen telemetrie.
5. Naast Obsidian, niet in plaats van: dezelfde map moet in beide werken.
