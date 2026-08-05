# 05 – Open vragen · in te vullen door Jos

**Status:** wachtend op antwoorden. Er wordt niets besloten, gespecificeerd of gebouwd
voordat dit document is ingevuld.

**Waarom dit document bestaat.** In ronde 1 heb ik een PRD en een technische spec
geschreven met daarin tientallen keuzes die ik zelf heb gemaakt. Dat was fout: die
keuzes zijn van jou. Hieronder staat elke keuze en elke aanname terug als open vraag.
De documenten 03 en 04 blijven staan als *materiaal*, maar zijn gedegradeerd tot
concept; ze zijn pas geldig als de bijbehorende vragen hier beantwoord zijn.

**Hoe te gebruiken.** Vul in achter `Antwoord:`. "Weet ik nog niet" is een geldig
antwoord — dan parkeren we de vraag expliciet in plaats van hem stilletjes voor je in te
vullen. Bij vragen met opties mag je ook iets kiezen dat er niet staat.

**Waar we staan in de double diamond.**

```
   DISCOVER            DEFINE           DEVELOP          DELIVER
  ◄──── wij zijn hier ────►    │                │
  ▲                       ▲    │                │
  onderzoek 01+02      dit doc │  waves          │  waves
  (klaar)              (open)  │  (nog niet)     │  (nog niet)
```

Sectie A is de poort naar het einde van de eerste diamant: zonder een gedeelde
probleemdefinitie is al het overige speculatie. De rest van de vragen mag je in elke
volgorde beantwoorden, maar A eerst.

---

## Leeswijzer

- **Mijn input** = onderzoeksresultaat of mening. Nadrukkelijk *geen* besluit.
- **Blokkeert** = wat er niet verder kan zonder dit antwoord.
- Onderbouwing bij de technische vragen staat in
  [06 – Beslisinput techniek](06-beslisinput-techniek.md).

---

# A. Doel en probleem

*Poort naar het einde van diamant 1. Zonder deze antwoorden is de rest gokwerk.*

### A1 · Wat is het eigenlijke doel?

Twee doelen die op elkaar lijken maar tot heel andere producten leiden:

- **Doel "hebben"** — je wilt een fijnere editor gebruiken. Dan is de snelste route naar
  dagelijks gebruik de beste route, en is bestaande software kopiëren prima.
- **Doel "bouwen"** — je wilt dit maken, leren, en het proces zelf is de opbrengst. Dan
  is de snelste route juist de verkeerde en mag techniekkeuze zwaarder wegen dan
  opleverduur.
- Of een gewogen combinatie.

**Blokkeert:** vrijwel alles — scope, techniekkeuze, planning, wanneer je stopt.

**Antwoord:**
`____________________________________________`

### A2 · Klopt mijn ontleding van het probleem?

Ik heb je klacht opgeknipt in drie delen. Klopt dat, en wat weegt het zwaarst?

| | Probleem | Weegt (1–5) |
|---|---|---|
| P1 | Visuele overbelasting — te veel op het scherm, tekst krijgt te weinig ruimte | |
| P2 | Functionele ruis — commando's/instellingen voor dingen die je nooit gebruikt | |
| P3 | De tweak-val — het systeem onderhouden vervangt het werk | |
| P4 | Iets anders dat ik gemist heb: | |

**Antwoord:**
`____________________________________________`

### A3 · Wanneer is dit project geslaagd?

Ik verzon: *"open ik Lapis vier weken achter elkaar in plaats van Obsidian"*. Dat is mijn
criterium, niet het jouwe.

**Antwoord:**
`____________________________________________`

### A4 · Wanneer stop je?

Even belangrijk, en makkelijker nu te bepalen dan straks. Bij welk signaal is dit
project klaar-en-mislukt in plaats van klaar-en-geslaagd? (Voorbeelden: na X weken zonder
bruikbare versie; als het meer tijd kost dan het oplevert; als de nulmeting uit A5 het
probleem al oplost.)

**Antwoord:**
`____________________________________________`

### A5 · Doe je de nulmeting?

Eén avond Obsidian volledig uitkleden (ribbon uit, statusbalk weg, kaal thema, ruime
regelafstand, sidebars dicht) om te zien hoeveel van P1 daarmee al verdwijnt. Zie
[01 §6](01-concurrentieonderzoek.md#6-de-nulmeting-eerst-het-goedkope-alternatief).

Dit is de goedkoopste manier om te achterhalen wat er *precies* mis is, en het is
tegelijk de eerlijkste test of het project nodig is.

- [ ] Ja, ik doe dit eerst en rapporteer wat er overblijft
- [ ] Nee, want: `__________`

**Antwoord:**
`____________________________________________`

### A6 · Voor wie is dit, echt?

Je koos eerder "eerst voor mezelf, later beslissen". Vraag erachter: mag ik daar iets
voor doen dat nu tijd kost (geen aannames over jouw mapstructuur, geen hardgecodeerde
paden), of is "later" zo hypothetisch dat we er nu niets voor over hebben?

**Antwoord:**
`____________________________________________`

---

# B. Jouw huidige situatie

*Feiten die ik niet heb en waarvoor ik getallen heb verzonnen. Deze bepalen de
prestatie-eisen en de helft van de techniekkeuzes.*

| # | Vraag | Wat ik aannam (fout tot bevestigd) | Antwoord |
|---|---|---|---|
| B1 | Hoeveel `.md`-bestanden staan er in je vault? | 2.000–5.000 | |
| B2 | Hoe groot is de vault in MB, inclusief bijlagen? | onbekend | |
| B3 | Hoe diep is de mappenstructuur, en organiseer je op mappen of op tags? | mappen + tags gemengd | |
| B4 | Waar staat de vault nu, en wordt hij gesynchroniseerd? | onbekend — zie sectie E | |
| B5 | Welke Obsidian-plugins gebruik je nu daadwerkelijk (niet: geïnstalleerd)? | geen enkele essentieel | |
| B6 | Wat zijn je vijf meest voorkomende handelingen op een dag in Obsidian? | schrijven, zoeken, terugvinden | |
| B7 | Staan er `[[wikilinks]]` in je bestaande notities? Hoeveel ongeveer? | ja, onbekend hoeveel | |
| B8 | Gebruik je YAML-frontmatter, en waarvoor? | ja, voor tags | |
| B9 | Bewerk je dezelfde notities ook op je telefoon? | nee | |
| B10 | Bewerk je notities ook buiten Obsidian (terminal, VS Code, git)? | soms | |

**B6 is de belangrijkste van deze lijst.** Alles wat daar niet in staat, is een kandidaat
voor de anti-scope.

**Aanvullingen:**
`____________________________________________`

---

# C. Scope en functionaliteit

*Elke regel hieronder stond in de PRD als besluit. Het waren voorstellen.*

### C1 · De anti-scope

Dit is het belangrijkste besluit in het hele project. Ik heb in
[03 §5](03-prd.md#5-anti-scope) een lijst gezet van wat we níét bouwen: plugins,
thema's, graph view, canvas, sync, mobiel, samenwerking, AI, query-taal, sjablonen,
tabs/split-panes, en een limiet van 15 instellingen.

Neem die lijst door en markeer per regel: **akkoord** / **schrappen (wél bouwen)** /
**twijfel**. Voeg toe wat er mist.

**Antwoord:**
`____________________________________________`

### C2 · Wikilinks

Jij zei: geen must-have. Ik heb daar eigenmachtig van gemaakt: "renderen en niet
stukmaken in v1, klikken en autocomplete in v1.1". Dat was een besluit dat ik nam nadat
jij het tegenovergestelde had aangegeven — precies wat je bedoelt met human in the lead.

Terug naar jou. Opties:

- **a)** Volledig negeren: `[[link]]` blijft platte tekst, ongestyled
- **b)** Renderen als opgemaakte tekst, niet klikbaar (mijn eerdere voorstel)
- **c)** Renderen + klikbaar
- **d)** Volledig, inclusief autocomplete en backlinks

**Hard feit dat meespeelt:** de kandidaat-editorbasis ondersteunt `[[…]]` standaard. Optie
a betekent dus iets *uitzetten*, niet iets weglaten. Zie
[06 §5](06-beslisinput-techniek.md#5-wat-de-editorbasis-al-meebrengt).

**Antwoord:**
`____________________________________________`

### C3 · Opslaan

- **a)** Autosave, 500 ms na de laatste toets (mijn voorstel; wat Obsidian doet)
- **b)** Expliciet `⌘S`, met een "gewijzigd"-indicator
- **c)** Autosave met `⌘S` als extra

**Antwoord:**
`____________________________________________`

### C4 · Wat gebeurt er bij een conflict?

Als een bestand buiten Lapis wijzigt terwijl jij het openhebt. Ik verzon drie knoppen
(mijn versie / hun versie / beide bewaren). Wat wil jij dat er gebeurt? En: mag Lapis
*ooit* stil herladen (bijvoorbeeld als jij niets hebt gewijzigd)?

**Antwoord:**
`____________________________________________`

### C5 · Bestandsnamen

Bij een nieuw bestand: naam afleiden uit de eerste kopregel (mijn voorstel), altijd
vragen, of altijd `Untitled.md` met later hernoemen?

**Antwoord:**
`____________________________________________`

### C6 · Frontmatter

Mijn voorstel: standaard ingeklapt tot één regel, uitklapbaar. Alternatieven: altijd
volledig tonen, altijd verbergen, of tonen als een bewerkbaar formulier in plaats van als
YAML.

**Antwoord:**
`____________________________________________`

### C7 · Verwijderen

Systeem-prullenbak (mijn voorstel) of een `.trash`-map in de vault (wat Obsidian doet)?
Let op: `.trash` botst met mijn voorgestelde regel "Lapis schrijft niets in jouw map dat
geen markdown is" — die regel is zelf ook een voorstel (zie C9).

**Antwoord:**
`____________________________________________`

### C8 · Afbeeldingen

Inline renderen in de editor? En als je een screenshot plakt: waar komt het bestand
terecht, en wie bepaalt dat? Ik heb hier in v1 helemaal niets over besloten, wat op zich
al een gat is.

**Antwoord:**
`____________________________________________`

### C9 · "Niets in de vault schrijven" — is dat een harde regel?

Ik heb dit tot architectuurregel nummer 1 verheven: index, instellingen en back-ups leven
buiten je vault. Voordeel: je map blijft schoon en Obsidian-compatibel. Nadeel: verplaats
je de vault naar een andere Mac, dan gaat de index (en gaan de back-ups) niet mee.

**Antwoord:**
`____________________________________________`

### C10 · Eén document tegelijk?

Ik schrapte tabs én split-panes. Dat is een stevige beperking als je vaak twee notities
naast elkaar hebt. Wat is de werkelijkheid van jouw gebruik?

**Antwoord:**
`____________________________________________`

### C11 · De limiet van 15 instellingen

Verzonnen getal. Is een harde limiet het juiste mechanisme, en zo ja, welk getal?

**Antwoord:**
`____________________________________________`

### C12 · Wat mist er in mijn functielijst?

Kijk naar [03 §4](03-prd.md#4-scope-v1) met B6 in de hand. Wat doe je dagelijks dat er
niet in staat?

**Antwoord:**
`____________________________________________`

---

# D. Techniek

*Volledige onderbouwing en voorbeelden staan in
[06 – Beslisinput techniek](06-beslisinput-techniek.md). Beantwoord na het lezen daarvan.*

### D1 · Electron, Tauri v2, of native macOS?

Ik heb Tauri gekozen en dat als besluit opgeschreven. Dat was niet aan mij, en jouw
opmerking dat Electron je bekender voorkomt is bovendien een geldig argument: bekendheid
is een echte factor in een project van één persoon in de avonduren.

Zie [06 §1–§3](06-beslisinput-techniek.md#1-electron-versus-tauri-v2--de-feitelijke-vergelijking)
voor de vergelijking, de voorbeelden van apps in beide frameworks, en de eerlijke
argumenten vóór Electron die ik in ronde 1 heb weggelaten.

**Let op de koppeling met D2 en E2:** het mobiele antwoord verandert dit besluit
fundamenteel. Electron kan geen mobiel. Beantwoord E2 eerst.

**Antwoord:**
`____________________________________________`

### D2 · Hoe zwaar weegt "ik ken dit al" tegen "dit is technisch beter"?

Eerlijke vraag. Rust leren tijdens een avondproject is een reële kostenpost die ik in
ronde 1 heb weggewuifd met "houd Rust dun". Hoeveel Rust/TypeScript/React-ervaring heb
je, en hoeveel zin heb je om er iets bij te leren?

**Antwoord:**
`____________________________________________`

### D3 · Frontend-framework

React (grootste ecosysteem, vereist door de kant-en-klare editorbasis) of Svelte
(kleiner, sneller, minder ceremonie)? Volgt deels uit D1 en D4.

**Antwoord:**
`____________________________________________`

### D4 · Editorbasis

- **a)** `atomic-editor` overnemen — MIT, React, werkt meteen, minder controle
- **b)** Losse CodeMirror 6-extensies combineren — meer eigen werk, meer controle
- **c)** Zelf schrijven op kale CodeMirror 6 — het meeste werk, het meeste leren

Als A1 richting "bouwen" wijst, is c ineens verdedigbaar. Als A1 richting "hebben" wijst,
is a het antwoord.

**Antwoord:**
`____________________________________________`

### D5 · Zoekindex

SQLite FTS5 (mijn voorstel), of geen index en gewoon door bestanden scannen bij elke
zoekactie? Het tweede is simpeler, en bij een vault onder ~1.000 notities waarschijnlijk
snel genoeg. Hangt af van B1.

**Antwoord:**
`____________________________________________`

### D6 · Prestatiebudget

Ik heb getallen neergezet (< 1 s koude start, < 100 ms zoeken, < 20 MB pakket) alsof het
eisen waren. Zijn dit jouw eisen, en zo niet: welke wel? "Het moet niet traag voelen" is
ook een geldig antwoord, dan noteren we het zo.

**Antwoord:**
`____________________________________________`

### D7 · Back-ups

Ik verzon een schaduwback-up van 7 dagen buiten de vault. Wil je dat, of vertrouw je op
git/Time Machine/je sync-oplossing?

**Antwoord:**
`____________________________________________`

### D8 · Open source of niet?

Publiek op GitHub vanaf dag één, of privé tot er iets werkt? Beïnvloedt hoe we met de
kanban en de wave-documenten omgaan.

**Antwoord:**
`____________________________________________`

---

# E. Sync en toekomst

*Je bracht dit zelf in, en het is groter dan het lijkt: het is de vraag die de
techniekkeuze bepaalt.*

### E1 · Hoe synchroniseer je nu, en hoe wil je het?

Opties die je noemde: iCloud, Google Drive, een homeserver (Syncthing, WebDAV, git), of
niet — gewoon lokaal.

Dit is geen neutrale vraag: **de sync-oplossing bepaalt hoe moeilijk de bestandslaag
wordt.** iCloud met "optimaliseer opslag" verwijdert lokale kopieën en laat placeholders
achter; er zijn Obsidian-gebruikers met 511 van 689 dataloze bestanden en een trage start
tot gevolg. Google Drive for desktop koppelt een virtueel bestandssysteem aan, waardoor
FSEvents zich anders gedraagt. Syncthing en git zijn gewone bestanden op schijf en dus
verreweg het makkelijkst. Volledige uitleg in
[06 §4](06-beslisinput-techniek.md#4-sync--wat-elke-optie-technisch-betekent).

**Antwoord:**
`____________________________________________`

### E2 · Komt er een mobiele versie? ⚠️ Grootste vraag van dit document

Dit bepaalt D1 volledig, en het is niet omkeerbaar zonder herbouw:

| Antwoord | Gevolg |
|---|---|
| **Nee, nooit** | Electron en Tauri zijn allebei prima. Native macOS wordt ook een reële optie. |
| **Misschien ooit** | Electron wordt riskant — er is geen mobiel pad, alleen herbouwen. |
| **Ja, waarschijnlijk** | Electron valt af. Tauri v2 ondersteunt iOS en Android vanuit dezelfde codebase (mobiel is nieuwer en minder volwassen dan desktop, maar het bestaat). |
| **Ja, maar als web-app** | Volledig ander verhaal: geen lokale maptoegang op iOS Safari. Dan praat je over een server en een sync-protocol, en dan bouw je een ander product. |

Let op de harde beperking die ook Obsidian heeft: **op iOS kan een app geen willekeurige
map op je apparaat benaderen.** Obsidian Mobile kan alleen in zijn eigen map of via
iCloud werken; er staat een jaren oud, nog altijd open verzoek in hun forum om dit te
veranderen. Wat jij op je Mac doet — "wijs naar een willekeurig mapje" — is op iOS
principieel niet mogelijk. Zie [06 §6](06-beslisinput-techniek.md#6-mobiel--wat-het-echt-betekent).

**Antwoord:**
`____________________________________________`

### E3 · Windows of Linux, ooit?

Je koos macOS-only. Idem: "nooit" maakt native Swift een echte optie, "misschien" niet.

**Antwoord:**
`____________________________________________`

### E4 · Meerdere Macs?

Gebruik je dezelfde vault op meer dan één machine? Zo ja, dan wordt C9 (index buiten de
vault) een praktisch probleem in plaats van een principekwestie.

**Antwoord:**
`____________________________________________`

---

# F. Ontwerp

*Je zei dat je dit zelf in Figma / Claude Design / Google Stitch kunt doen. Dan moeten we
afspreken wat ik lever en wat jij levert.*

### F1 · Wie ontwerpt wat?

- **a)** Jij ontwerpt alles visueel, ik lever alleen functionele beschrijvingen per scherm
- **b)** Jij ontwerpt, ik lever daarvóór een lijst van benodigde schermen, staten en
  interacties (inclusief lege staten, foutstaten, laadstaten)
- **c)** Ik lever een eerste versie in code, jij herontwerpt op basis daarvan

**Antwoord:**
`____________________________________________`

### F2 · Wanneer in de volgorde?

Ontwerp vóór de eerste wave (risico: ontwerpen voor iets dat technisch anders uitpakt),
of na de spike (risico: de code stuurt het ontwerp)?

**Antwoord:**
`____________________________________________`

### F3 · Wat lever je aan als het ontwerp klaar is?

Figma-link, geëxporteerde screenshots, design tokens (kleuren/spacing als variabelen), of
gegenereerde code uit Stitch/Claude Design? Dit bepaalt hoe de implementatie-wave eruitziet.

**Antwoord:**
`____________________________________________`

### F4 · Typografie

Dit is bij dit product geen detail maar de kern (zie
[02 §3](02-haalbaarheidsonderzoek.md#3-het-onderschatte-deel-het-ontwerp)). Heb je
voorkeuren — lettertype, regellengte, regelafstand — of onderzoek je dat in het ontwerp?

**Antwoord:**
`____________________________________________`

---

# G. Proces: waves, backlog, verificatie

### G1 · Hoe groot is een wave?

De wave-methode werkt alleen als een wave een afgebakende, bewijsbare capability is. Voor
Lapis zou dat kunnen zijn: "een vault openen en de bestandsboom tonen" (klein) tot
"lezen en schrijven werkt" (groot). Voorstel voor de indeling staat in
[07 – Wave-methode voor Lapis](07-wave-methode.md#5-voorstel-wave-indeling); dat is
expliciet een voorstel, geen indeling.

**Antwoord:**
`____________________________________________`

### G2 · Waar komt de backlog te staan?

Je noemde een kanban op git. GitHub Projects op `josbez/lapis`, GitHub Issues zonder
board, of iets buiten GitHub? En: wanneer richten we dat in — nu, of pas als de scope
vaststaat?

**Antwoord:**
`____________________________________________`

### G3 · Hoe verhouden waves en kanban-kaarten zich?

Eén kaart per wave, of één kaart per taak binnen een wave? Als de wave-documenten in de
repo staan, wat staat er dan nog op het bord — alleen status?

**Antwoord:**
`____________________________________________`

### G4 · Hoe streng wordt de verificatie?

De Test & Verification Plan Guide is geschreven voor een platform met een backend, API's
en tenants. Voor een lokale desktop-app vervalt een deel daarvan (geen API, geen
autorisatie, geen domain isolation) en verandert een deel (browsertests → Tauri/Electron
E2E met WebDriver of Playwright).

Wat blijft er staan voor Lapis? Zie het voorstel in
[07 §4](07-wave-methode.md#4-vertaling-van-de-verificatie-eisen-naar-een-desktop-app).
Concreet: wil je per wave werkende geautomatiseerde tests, of is "ik heb het zelf
geprobeerd en het werkt" genoeg voor de vroege waves?

**Antwoord:**
`____________________________________________`

### G5 · Hoeveel tijd heb je werkelijk?

Nodig om de schatting uit ronde 1 te repareren. Hoeveel avonden per week, hoeveel uur per
avond, en hoe stabiel is dat? De "6–9 weken" bevatte een verborgen aanname van 13–15 uur
per week die ik nergens heb opgeschreven. Zie
[06 §7](06-beslisinput-techniek.md#7-waar-de-69-weken-vandaan-kwam-en-waarom-het-getal-nog-niets-waard-is).

**Antwoord:**
`____________________________________________`

### G6 · Werken we door met mij als PM, of verandert de rol?

Blijf ik documenten schrijven en jij beslist, ga ik ook implementeren, of iets ertussenin?

**Antwoord:**
`____________________________________________`

---

# H. Inventaris: alles wat ik zelf heb ingevuld

Volledigheidshalve — elke plek in de documenten 01 t/m 04 waar een besluit of aanname van
mij staat, met de vraag die het terugdraait.

| Waar | Wat ik zelf heb ingevuld | Vraag |
|---|---|---|
| 02 §4, 04 §2 | Tauri gekozen boven Electron en Swift | D1 |
| 04 §2 | Svelte als frontend-framework | D3 |
| 04 §2, §3 | SQLite + FTS5 als index | D5 |
| 04 §2 | Niet sandboxed, buiten de App Store | D1 / E2 |
| 04 §4 | CodeMirror 6 met een bestaande live-preview-basis | D4 |
| 04 §5 | Autosave met 500 ms debounce | C3 |
| 04 §5 | Conflictafhandeling met drie knoppen | C4 |
| 04 §5 | Back-ups van 7 dagen buiten de vault | D7 |
| 04 §7 | Alle prestatiegetallen | D6 |
| 04 §8 | Milestone-indeling en 6–9 weken | G1 / G5 |
| 04 §9 | Repo-indeling en testbeleid | G4 |
| 04 §10 | Distributie zonder update-mechanisme | D8 |
| 03 §1 | De driedeling P1/P2/P3 van het probleem | A2 |
| 03 §3 | De vijf ontwerpprincipes, incl. "niets in de vault schrijven" | C9 |
| 03 §4 | De volledige functielijst M1–M6 en de must/should-verdeling | C1 / C12 |
| 03 §4 | Wikilinks renderen in v1 — tegen jouw aangegeven prioriteit in | C2 |
| 03 §4 | Frontmatter standaard ingeklapt | C6 |
| 03 §4 | Geen tabs, geen split-panes | C10 |
| 03 §5 | De volledige anti-scope | C1 |
| 03 §5 | Maximaal 15 instellingen | C11 |
| 03 §6 | Succescriterium "vier weken dagelijks gebruik" | A3 |
| 03 §6 | Alle meetpunten en streefwaarden | A3 / D6 |
| 03 §8 | Geen netwerkverkeer, geen telemetrie, geen update-check | D8 |
| 03 §9 | Vijf "openstaande vragen" die ik meteen zelf beantwoordde | C5 / C7 |
| 03 §10 | Releaseplan v0.1 → v1.1 | G1 |
| 03 §2, 04 §7 | Vaultgrootte van 2.000–5.000 notities | B1 |
| 01 §6 | De aanbeveling om de nulmeting te doen | A5 |

**Niet in deze lijst, omdat het onderzoek is en geen keuze:** de marktcijfers, het
spelersoverzicht en de gebruikersklachten in document 01, en de beschikbaarheid van de
CodeMirror-bibliotheken in document 02. Die zijn controleerbaar en staan met bron erbij.
