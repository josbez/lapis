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
Daarna kan er gebouwd worden.

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
