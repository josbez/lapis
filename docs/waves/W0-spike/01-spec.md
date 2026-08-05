# Wave W0 Specification — Spike: wil ik hierin typen?

| | |
|---|---|
| **Status** | Ter goedkeuring door Jos |
| **Gezag** | Dit document beheerst implementatiedetails. Het [Goal Document](00-goal.md) beheerst uitkomst en scope |
| **Bron** | [Goal W0](00-goal.md) · [PRD v1.1](../../03-prd.md) · [Wave-methode](../../07-wave-methode.md) |

---

## 1. Titel

Spike: een Tauri v2-app waarin één markdown-bestand in live preview bewerkt en opgeslagen
kan worden, met als enige doel Jos een oordeel te laten vormen over de editorbasis.

## 2. Goal Document Alignment

Deze specificatie implementeert het goedgekeurde Goal Document voor W0. Het Goal Document
beheerst uitkomst, scope, grenzen en de betekenis van "compleet". Deze specificatie levert
het implementatiecontract en mag niet buiten het Goal Document treden.

**Eén punt waar deze spec het Goal Document nauwkeuriger maakt en dat expliciet
goedkeuring vraagt:** Goal §7 spreekt over *één* geautomatiseerde test voor de
byte-identieke round-trip. Deze spec legt er twee vast, op de twee lagen waar
inhoudsverlies kan ontstaan — de Rust-bestandslaag en de CodeMirror-editor. Het is
hetzelfde bewijspunt op twee plekken, geen extra scope. Zie [§13](#13-risicos-en-open-vragen).
Wijst Jos dit af, dan wint het Goal Document en vervalt de frontend-test.

## 3. Objective

Er is nog geen enkele regel code, en de vraag of de gekozen editorbasis prettig aanvoelt
is niet uit documentatie te beantwoorden. Deze wave bouwt het kleinst mogelijke ding
waarin die vraag beantwoord kan worden: een venster, een map, een bestand, live preview,
opslaan. Alles wat daar niet direct aan bijdraagt, blijft eruit.

De opbrengst is een oordeel plus opgedane kennis over de stack. De code wordt weggegooid.

## 4. Wave Type

Spike · technische validatie · wegwerpcode.

## 5. In Scope

### 5.1 Projectopzet

Een nieuwe map `spike/` in deze repo, volledig los van toekomstige productiecode:

```
spike/
├─ package.json
├─ index.html
├─ vite.config.ts
├─ src/
│  ├─ main.tsx           # React entry
│  ├─ App.tsx            # de hele UI: knop, bestandslijst, editor
│  ├─ Editor.tsx         # CodeMirror 6 + atomic-editor
│  └─ ipc.ts             # getypte wrappers om de Tauri-commands
├─ src-tauri/
│  ├─ Cargo.toml
│  ├─ tauri.conf.json
│  ├─ build.rs
│  └─ src/
│     ├─ main.rs
│     └─ vault.rs        # de vier commands uit §5.3
└─ tests/
   └─ fixtures/          # de randgevallen uit §14.2
```

### 5.2 Afhankelijkheden

| Laag | Wat | Versie |
|---|---|---|
| Shell | Tauri v2 | huidige 2.x bij installatie |
| Mapkiezer | `tauri-plugin-dialog` | passend bij Tauri 2.x |
| Frontend | React + Vite + TypeScript | huidige stabiele versies |
| Editor | CodeMirror 6 | huidige 6.x |
| Live preview | `atomic-editor` ([repo](https://github.com/kenforthewin/atomic-editor), MIT) | huidige |

**Instructie aan de uitvoerende agent:** de exacte npm-pakketnaam en versie van
`atomic-editor` en zijn peer-dependencies zijn hier bewust niet ingevuld. Bepaal ze uit
de README van het project op het moment van installeren en noteer wat je hebt
geïnstalleerd in `03-bewijs.md`. Vul geen pakketnaam in op basis van een aanname.

De optionele grammatica's voor syntax-highlighting in codeblokken worden **niet**
geïnstalleerd. Monospace zonder kleuren is voor deze wave voldoende.

### 5.3 De vier IPC-commands

Alle bestands-I/O gebeurt aan de Rust-kant, conform Goal §12.

```rust
#[tauri::command]
fn list_markdown(root: String) -> Result<Vec<FileEntry>, String>
// Bestanden direct in `root`, niet recursief. Alleen *.md.
// Recursie is W1.

#[tauri::command]
fn read_note(root: String, path: String) -> Result<String, String>

#[tauri::command]
fn write_note(root: String, path: String, content: String) -> Result<(), String>

#[tauri::command]
fn resolve_root(picked: String) -> Result<String, String>
// Canoniek pad van de gekozen map; de frontend bewaart dit voor de duur
// van de sessie en geeft het bij elke aanroep mee.
```

```rust
struct FileEntry {
    path: String,   // relatief aan root
    name: String,
}
```

**De padcontrole is verplicht in elk van de drie bestandscommands.** Canonicaliseer
`root` en `root/path`, en weiger de aanroep wanneer het resultaat niet binnen `root`
valt. Dit is de enige veiligheidsmaatregel in de hele spike en hij is niet
onderhandelbaar — ook niet in wegwerpcode. Kosten: ongeveer vijf regels.

### 5.4 De gebruikersinterface

Eén scherm, drie onderdelen, geen styling:

- Een knop **"Kies map"** die de systeem-bestandskiezer opent.
- Een ongestileerde lijst van de gevonden `.md`-bestanden; klikken opent er één.
- De editor, met de inhoud van het geopende bestand in live preview.

Opslaan gebeurt uitsluitend met `⌘S`. Autosave staat in Goal §6 als out of scope en komt
hier dus niet in.

Er is geen laadstaat, geen foutafhandeling in de UI, geen lege staat. Gaat er iets mis,
dan is een `console.error` genoeg.

## 6. Out of Scope

De volledige lijst staat in [Goal §6](00-goal.md#6-out-of-scope) en geldt onverkort.
Vier punten die tijdens het bouwen het meest zullen jeuken, met de reden waarom ze toch
blijven liggen:

| Verleiding | Waarom niet |
|---|---|
| "De map onthouden is drie regels" | Vereist een opslaglocatie en dus een besluit over waar app-staat leeft. Dat is W1 |
| "Even een boomstructuur in plaats van een platte lijst" | Recursief scannen brengt filters, verborgen mappen en symlinks mee. Dat is W1 |
| "Autosave is fijner om mee te testen" | Autosave zonder het focusmodel is precies het gedrag dat de PRD niet wil, en het vertroebelt het oordeel |
| "Even wat CSS, zo is het niet te beoordelen" | Het oordeel gaat over typgedrag, niet over uiterlijk. Styling in W0 stuurt dat oordeel de verkeerde kant op |

## 7. Impacted Areas

| Gebied | Status |
|---|---|
| `spike/` in deze repo | Nieuw |
| `docs/waves/W0-spike/` | Nieuw: testplan en bewijs |
| Bestaande code | Er is geen bestaande code |
| Documenten 01 t/m 08 | Onaangeroerd |
| Jos' vault | **Onaangeroerd.** De spike draait tegen een kopie |

## 8. Expected Behavior

**Kern (Rust)**

- `list_markdown` geeft de `.md`-bestanden direct in de gekozen map, alfabetisch.
- `read_note` geeft de inhoud als UTF-8 string, ongewijzigd.
- `write_note` schrijft de meegeleverde string als UTF-8 naar het pad. Naïef schrijven is
  toegestaan; atomair schrijven is W3.
- Elk van de drie weigert paden buiten `root` met een foutmelding.

**Frontend**

- Bij het openen van een bestand toont de editor de inhoud opgemaakt, terwijl het
  onderliggende document ruwe markdown blijft.
- Koppen, nadruk, lijsten, takenlijsten, tabellen, links en blockquotes renderen. Wat
  `atomic-editor` standaard meebrengt, blijft aan.
- `⌘S` stuurt de huidige inhoud naar `write_note`.

**Voor de gebruiker**

- Kiezen, openen, typen, opslaan werkt zonder dat er iets uitgelegd hoeft te worden.
- Het opgeslagen bestand opent in Obsidian met precies de verwachte inhoud.

## 9. Success Criteria

De wave is compleet wanneer:

1. `npm run tauri dev` in `spike/` een venster opent op macOS.
2. Een map gekozen kan worden en de `.md`-bestanden daarin zichtbaar zijn.
3. Een bestand geopend kan worden en in live preview verschijnt.
4. `⌘S` de wijziging naar schijf schrijft.
5. De round-trip-tests uit §14 slagen.
6. Een poging tot lezen of schrijven buiten `root` faalt met een fout, aangetoond met een
   test.
7. Jos minstens één echte notitie heeft getypt en zijn oordeel heeft opgeschreven in
   `03-bewijs.md`.
8. `03-bewijs.md` bevat: de geïnstalleerde pakketten met versies, de uitgevoerde
   commando's met uitkomst, een schermopname of screenshots van de happy flow, en een
   eerlijke opsomming van wat níét is getest.

Punt 7 is de wave. De rest maakt punt 7 mogelijk en betrouwbaar.

## 10. Invariants

Wat waar moet blijven, ook in wegwerpcode:

- **Geen schrijfactie buiten de gekozen map.** Afgedwongen in code (§5.3), aangetoond met
  een test (§14.6).
- **Geen hardgecodeerd pad naar een vault.** De map wordt altijd gekozen.
- **Geen netwerkverkeer** vanuit de app. Alleen de bouwketen mag het netwerk op om
  afhankelijkheden op te halen.
- **Bestands-I/O gebeurt in Rust**, niet vanuit de webview.
- **De inhoud van een bestand wordt nooit stilzwijgend genormaliseerd.** Geen
  regeleindes omzetten, geen trailing newline toevoegen, geen whitespace opruimen.

## 11. Constraints

- **De spike draait uitsluitend tegen een kopie.** Maak vooraf een map met kopieën van een
  handvol notities, inclusief de lastigste die Jos kan vinden. `~/Documents` wordt in deze
  wave niet geopend. Dit is een werkafspraak, geen codecontrole — de app kent het verschil
  niet.
- **Wegwerpcode.** W1 begint opnieuw. Rommeligheid is toegestaan; scope-uitbreiding om de
  code "netter" te maken niet.
- **Geen ontwerpwerk**, conform Goal §9.
- **Het testplan komt vóór de implementatie.**

## 12. Dependencies

| Nodig | Stand |
|---|---|
| Rust-toolchain en Xcode command line tools op de machine | Te controleren bij aanvang |
| Node.js | Te controleren bij aanvang |
| `atomic-editor` werkt in WKWebView | **Onbewezen.** Dit is de kernaanname van de wave |
| Een testmap met kopieën van notities | Door Jos aan te leveren |
| Vitest of vergelijkbaar voor de frontend-test | Wordt in deze wave opgezet |

## 13. Risico's en open vragen

| # | Risico of vraag | Hoe we ermee omgaan |
|---|---|---|
| 1 | **De twee tests in plaats van één.** Deze spec legt een Rust-test én een frontend-test vast waar Goal §7 er één noemt. Mijn lezing: het is één bewijspunt op de twee lagen waar mangling kan ontstaan, want een Rust-test bewijst niets over wat CodeMirror met de tekst doet | **Vraag aan Jos.** Wijs je het af, dan vervalt de frontend-test en wint het Goal Document |
| 2 | `atomic-editor` blijkt niet te werken in WKWebView | Blokkade-stopconditie uit Goal §15. Melden als bevinding bij D4, niet zelf overstappen op route b |
| 3 | De npm-pakketnaam of peer-dependencies wijken af van wat verwacht wordt | Opzoeken bij installatie, niet aannemen. Vastleggen in `03-bewijs.md` |
| 4 | CodeMirror normaliseert regeleindes of trailing newlines | Precies wat de frontend-test uit risico 1 zou vangen. Gebeurt het, dan is dat een bevinding van formaat — het raakt PRD F2 |
| 5 | WKWebView gedraagt zich anders dan Chromium bij toetsenbord-events | Als het opvalt tijdens het typen, hoort het in het oordeel van Jos thuis |
| 6 | Het oordeel wordt "bijna goed" | Dan is de vervolgvraag niet "nog even bijschaven" maar "zit dit in de basis of niet". Zie Goal §16 |

## 14. Verificatievereisten

### 14.1 Testplan eerst

Vóór er geïmplementeerd wordt, stelt de uitvoerende agent een Wave Test & Verification
Plan op vanuit het Goal Document en deze specificatie. Er wordt niet met bouwen begonnen
voordat dat plan er ligt. Dat het plan kort zal zijn, is geen reden het over te slaan.

### 14.2 Kernverificatie (Rust)

**Round-trip op bestandsniveau.** Voor elke fixture: `read_note` gevolgd door
`write_note` met dezelfde inhoud levert een byte-identiek bestand op.

Verplichte fixtures, elk gekozen omdat het een bekende manier is om tekst stilletjes te
beschadigen:

| Fixture | Wat het aantoont |
|---|---|
| `simpel.md` | Basisgeval |
| `crlf.md` (CRLF-regeleindes) | Regeleindes blijven ongemoeid |
| `geen-eind-newline.md` | Er wordt geen newline toegevoegd |
| `emoji-en-accenten.md` | UTF-8 blijft intact |
| `frontmatter.md` | Het YAML-blok blijft byte-identiek (PRD F2) |
| `tabellen-en-code.md` | Whitespace binnen codeblokken blijft ongemoeid |

### 14.3 API-verificatie

Niet van toepassing voor deze wave: er is geen HTTP-API. De IPC-laag is in W0 nog geen
contract — hij wordt in W1 ontworpen. De vier commands worden wel indirect gedekt door
§14.2 en §14.6.

### 14.4 Frontend-verificatie

**Round-trip op editorniveau.** Een CodeMirror-state opgebouwd met de
`atomic-editor`-extensies en documentinhoud `X` levert bij uitlezen exact `X` terug, voor
dezelfde fixtures als §14.2.

Dit is de test uit risico 1. Verder geen componenttests: er is geen UI die het waard is
om vast te leggen, en die er straks toch anders uitziet.

### 14.5 Browser-/Playwright-verificatie

Niveau C uit [07 §4.2](../../07-wave-methode.md#42-wat-browser-bewijs-hier-betekent):
handmatig, met bewijs. Reden: de UI is wegwerpcode en er is nog niets stabiels om tegen
te automatiseren.

Vast te leggen als schermopname of reeks screenshots:

1. App starten
2. Map kiezen
3. Bestand openen, opmaak zichtbaar
4. Typen — kop, lijst, nadruk, codeblok
5. `⌘S`
6. Hetzelfde bestand geopend in Obsidian, met de verwachte inhoud

### 14.6 Negatieve tests

| Geval | Verwacht |
|---|---|
| `read_note` met `../buiten-de-map.md` | Fout, geen inhoud |
| `write_note` met een pad buiten `root` | Fout, geen bestand aangemaakt |
| `write_note` met een absoluut pad | Fout |
| `read_note` op een niet-bestaand bestand | Nette fout, geen paniek |
| `list_markdown` op een lege map | Lege lijst, geen fout |

De eerste drie zijn de belangrijkste tests van de hele wave na de round-trip. Ze bewijzen
de enige veiligheidsgarantie die W0 heeft.

### 14.7 Regressietests

Niet van toepassing voor deze wave: er is geen bestaand gedrag om te breken.

### 14.8 Isolatiecheck

Niet van toepassing in de vorm uit
[07 §4.3](../../07-wave-methode.md#43-onze-eigen-isolatiecheck), omdat de code wordt
weggegooid. Twee regels gelden wel, omdat ze over data gaan en niet over codehygiëne:

- geen hardgecodeerde paden of gebruikersnamen in `spike/`
- geen netwerk-aanroepen in de app-code

Beide te controleren met een zoekopdracht, uitkomst in `03-bewijs.md`.

### 14.9 Vereist bewijs

`03-bewijs.md` bevat:

1. Wat er is gebouwd, in enkele zinnen
2. Het testplan dat vooraf is opgesteld
3. Geïnstalleerde pakketten met exacte versies — met name `atomic-editor`
4. Uitgevoerde commando's met per commando de uitkomst
5. Schermopname of screenshots van de happy flow uit §14.5
6. Wat er níét is getest, expliciet benoemd
7. Bevestiging dat de scope niet is opgerekt
8. Wat tegenviel en meeviel tijdens het bouwen — bij een spike is dit de eigenlijke
   opbrengst
9. Het oordeel van Jos

## 15. Definition of Done

De wave is af wanneer:

- Het testplan bestond vóór de eerste regel implementatiecode.
- De round-trip-tests uit §14.2 en §14.4 slagen op alle zes fixtures.
- De negatieve tests uit §14.6 slagen.
- De handmatige happy flow is doorlopen en vastgelegd.
- `03-bewijs.md` compleet is volgens §14.9.
- Jos zijn oordeel heeft gegeven.
- Er niets buiten `spike/` en `docs/waves/W0-spike/` is gewijzigd.
- De scope niet is uitgebreid buiten het Goal Document.

Een falende test die niet begrepen is, betekent dat de wave niet af is. Een falende test
die begrepen en opgeschreven is, mag — mits het geen round-trip- of padtest betreft. Die
twee zijn onvoorwaardelijk.

---

## Agent Handoff Instruction

```
Je krijgt twee brondocumenten:

1. Het Goal Document voor W0
2. Deze Wave Specification

Je eerste taak is niet implementeren. Je eerste taak is het opstellen van het
Wave Test & Verification Plan, uitsluitend op basis van deze twee documenten.

Gezagsvolgorde:
1. Het Goal Document beheerst uitkomst en scope.
2. De Wave Specification beheerst implementatiedetails.
3. Het Test & Verification Plan beheerst bewijs en acceptatie.

Bij conflict: Goal wint van Spec. Spec wint van Test. Het testplan mag de scope
nooit oprekken. Kies bij twijfel de smalste interpretatie.

Blijkt een test functionaliteit nodig te hebben die niet in het Goal Document of
deze spec staat, meld dan de mismatch. Bouw de extra functionaliteit niet.

Vul de npm-pakketnaam en versie van atomic-editor niet in op basis van een aanname;
zoek ze op bij het installeren en leg vast wat je hebt geinstalleerd.

Begin niet met implementeren voordat het testplan er ligt.

Geef na het opstellen van het testplan aan:
1. of Goal en Spec voldoende testbaar zijn
2. welke aannames je hebt gemaakt
3. welke tests verplicht zijn voor acceptatie
4. wat er eerst opgehelderd moet worden
```
