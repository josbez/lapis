# 03 – PRD: Lapis v1.0

| | |
|---|---|
| **Versie** | 1.0 |
| **Datum** | augustus 2026 |
| **Eigenaar** | Jos |
| **Status** | Geldig. Herschreven op basis van de antwoorden in [05](05-open-vragen.md) en [08](08-vervolgvragen.md) |
| **Platform** | macOS (Apple Silicon). Mobiel later, Windows/Linux misschien |
| **Open besluiten** | Vijf, zie [§10](#10-open-besluiten--ronde-3) — geen ervan blokkeert de eerste waves |

> Deze versie vervangt het concept uit ronde 1 volledig. Elke uitspraak hieronder is
> herleidbaar naar een antwoord van Jos; waar ik interpreteer staat dat erbij.

---

## 1. Probleem

De aanleiding was "Obsidian voelt bloated". Na de nulmeting (A5) bleek dat te grof. De
scherpe formulering is van Jos zelf:

> "Ik vond Bear fijn door de minimale weergave met mappenstructuur. Apple Notes voor de
> simpelheid (maar ook veel features en geen mappen) en iA Writer om de cleanheid (maar
> miste destijds mappen en was TE designy). **Wat er nu nog mist aan Obsidian is dat het
> niet ontworpen GENOEG voelt. Er mist een balans.**"

Het probleem is dus niet "te veel". Het is **een ontbrekende weging**. Obsidian bevat
alles en kiest niets; iA Writer kiest zoveel dat het je in de weg gaat zitten. Daartussen
ligt een smalle band waar Bear in zat — maar Bear geeft platte tekst in een map op, en
dat is niet onderhandelbaar.

```
        te weinig ontworpen                          te veel ontworpen
        alles bestaat, niets is gewogen              het ontwerp beslist voor jou
  ──────┬──────────────────────┬─────────────────────────┬──────────────────►
        │                      │                         │
    Obsidian              ◄ hier ►                   iA Writer
    VS Code            Bear (maar geen                Apple Notes
    Zettlr              platte tekst)                 (geen mappen)
```

Onderliggend, met de weging die Jos eraan gaf (A2):

| | Probleem | Weegt |
|---|---|:-:|
| **P2** | **Functionele ruis** — commando's en instellingen voor dingen die nooit gebruikt worden | **5** |
| **P3** | **De tweak-val** — het systeem onderhouden vervangt het werk | **5** |
| P1 | Visuele overbelasting — te veel op het scherm | 4 |

Dat P2 en P3 zwaarder wegen dan P1 heeft één belangrijk gevolg: **Lapis wint niet door
een mooier scherm, maar door een kortere lijst.** Een prachtige app met vijftig functies
lost dit probleem niet op.

## 2. Gebruiker

**Primair: n = 1.** Jos. Vault in `~/Documents`, ~170 MB, georganiseerd in mappen zonder
tags. Dagelijkse handelingen: schrijven, zoeken, terugvinden (B6) — en todo's bijhouden,
dat pas in ronde 2 bovenkwam en nog niet is uitgewerkt (zie [§10](#10-open-besluiten--ronde-3)).
Bewerkt notities soms buiten de editor om, via Claude Code en een MCP-server (B5, B10).

**Secundair, expliciet meegenomen:** Jos is UX-designer en wil "een tool voor mijzelf
maken wat anderen ook kunnen gebruiken, zonder de vibe-code-esthetiek of stigma" (A1).
Dat heeft nu twee concrete gevolgen, geen hypothetische: **geen hardgecodeerde paden en
geen aannames over mapstructuur** (A6), en **het ontwerp is het product** (§3).

De repo staat privé tot het werkt, daarna open source (D8, V8).

## 3. Positionering en ontwerpprincipes

**Positionering:** *een leesbare map met markdown-bestanden — genoeg ontworpen om prettig
te zijn, niet zo ontworpen dat het je stuurt.*

De principes winnen bij twijfel, in deze volgorde:

1. **Jouw bestanden zijn heilig.** Lapis verliest nooit tekst en schrijft nooit
   app-eigen bestanden in de vault. Index, instellingen en app-staat leven in
   `~/Library/Application Support/lapis/`. (C9)
2. **Balans boven minimalisme.** Het doel is niet zo min mogelijk, het doel is dat alles
   wat er is bewust gewogen is. Weinig functies die af zijn, verslaat veel functies die
   bestaan. (A5)
3. **Mappen zijn de organisatie.** Geen tags, geen graph, geen query's. De mapboom is
   hoe je vault in elkaar zit en hoe Lapis hem toont. (B3, A5)
4. **Weglaten boven configureren.** Een instelling is een uitgestelde beslissing. Zijn
   twee opties allebei redelijk, kies er dan één. (P3)
5. **Er is geen tweede systeem.** Dezelfde map werkt tegelijk in Lapis, Obsidian, Finder,
   `vim` en Claude Code. Altijd.
6. **Snel is een functie.** "Moet niet traag voelen" is de norm (D6). Traagheid is hoe
   bloat voelt.
7. **Geen vibe-code-esthetiek.** Het ontwerp is het onderscheidend vermogen, niet de
   functielijst. Elke functie hier bestaat elders al; de band uit §1 bestaat nergens. (A1)

## 4. Scope v1

Zeven functiegebieden. De volgorde is logisch, niet chronologisch — de wave-indeling
bepaalt de volgorde van bouwen ([07](07-wave-methode.md)).

### F1 · Vault openen en navigeren

- Map kiezen via de systeem-bestandskiezer; onthouden bij herstart. Geen aannames over
  de inhoud of structuur van die map.
- Mapboom in een sidebar: mappen en `.md`-bestanden, inklapbaar, met de vault-root als
  wortel. De boom is het navigatiemiddel, niet een bijzaak (principe 3).
- Sidebar te verbergen; keuze wordt onthouden.
- Verborgen mappen (`.git`, `.obsidian`, `.trash`, alles met een punt) worden niet
  getoond en niet aangeraakt.

**Acceptatie:** een vault met 5.000+ notities opent en toont de volledige boom zonder
merkbare vertraging bij openen en scrollen.

### F2 · Lezen en schrijven

- Eén editor, geen split-pane, één document tegelijk (C10). Opmaak rendert terwijl je
  typt; de bron blijft markdown.
- Ondersteund: koppen, bold/italic/highlight, lijsten met auto-doorloop, takenlijsten met
  klikbare vinkjes, codeblokken met syntax-highlighting, blockquotes, tabellen, links,
  inline afbeeldingen, horizontale lijnen.
- `[[wikilinks]]` worden gerenderd én zijn klikbaar (C2).
- Bestaande frontmatter wordt volledig getoond zoals hij in het bestand staat en blijft
  byte-identiek. Lapis maakt nooit zelf frontmatter aan. (C6, V2)
- Kopiëren levert ruwe markdown op. Undo/redo werkt als in elke macOS-app.

**Acceptatie:** een bestand dat in Obsidian is gemaakt, opent in Lapis, wordt bewerkt, en
opent daarna in Obsidian byte-voor-byte gelijk buiten de bewerking.

### F3 · Opslaan en veiligheid

- Autosave, met `⌘S` als expliciet extra (C3).
- Atomair schrijven: naar een tijdelijk bestand, `fsync`, dan `rename()` over het
  origineel. Halve bestanden bestaan niet.
- Externe wijzigingen worden opgemerkt. Is het document schoon, dan mag Lapis herladen.
  Is er een conflict, dan meldt Lapis dat en blokkeert het document — nooit stil
  overschrijven. (C4; de precieze vorm is [open besluit 3](#10-open-besluiten--ronde-3))
- Geen back-upmechanisme in de app voor de MVP (D7).

**Acceptatie:** `echo "test" >> notitie.md` in de terminal is binnen een seconde
zichtbaar. Een gelijktijdige externe schrijfactie leidt nooit tot verlies van getypte
tekst zonder dat de gebruiker een keuze heeft gemaakt.

### F4 · Vinden

- **`⌘K` quick switcher:** fuzzy zoeken op bestandsnaam en pad, direct openen met Enter.
  Recent geopend bovenaan bij lege invoer.
- **`⌘⇧F` full-text search:** zoekt door de inhoud van de hele vault, resultaten als
  regelfragmenten met de zoekterm gemarkeerd. Enter opent op de gevonden regel.
- Index in SQLite met FTS5 (D5), opgeslagen buiten de vault. De index is wegwerpbaar: hij
  mag altijd opnieuw opgebouwd worden en bevat nooit informatie die alleen daar bestaat.

**Acceptatie:** zoeken voelt onmiddellijk bij 5.000+ notities. Een notitie die zojuist is
opgeslagen, is direct vindbaar.

### F5 · Bestandsbeheer en bijlagen

- Nieuw bestand, hernoemen, verplaatsen tussen mappen, nieuwe map.
- Verwijderen gaat naar de systeem-prullenbak, nooit permanent (C7).
- **Bestandsnaam uit de eerste kopregel, alleen bij de eerste opslag.** Daarna alleen
  handmatig hernoemen. (C5 + V3)
- **Bijlagen:** afbeeldingen renderen inline. Bij de eerste bijlage in een notitie
  ontstaat een map met de naam van de notitie; het `.md`-bestand en de bijlage komen daar
  samen in te staan. Hernoemen van de notitie hernoemt de map mee. (C8)
- **Bestaande notities worden niet gemigreerd.** Wat al op schijf staat blijft staan zoals
  het staat. (V3)

**Acceptatie:** typen in een kopregel verplaatst nooit bestanden op schijf. Een notitie
zonder bijlagen blijft een los bestand.

> **Waarom die twee beperkingen bij F5.** Zonder ze zou het bewerken van een kopregel de
> bestandsnaam wijzigen, daarmee de mapnaam, en daarmee het bestand en al zijn bijlagen
> verplaatsen — terwijl er mogelijk een Claude Code-sessie in dezelfde map werkt (B10).
> Typen moet een veilige handeling zijn.

### F6 · De vorm

Geen afwerking maar het product (principe 7).

- Eén venster: sidebar (verbergbaar) plus editor. Geen tabs, geen panelen, geen ribbon,
  geen statusbalk, geen breadcrumbs.
- Ruime marges, beperkte regellengte, royale regelafstand. Concrete waarden volgen uit het
  ontwerp (F4 in [05](05-open-vragen.md)).
- Licht en donker, volgend op het systeem. Geen thema-keuze.
- Instellingen: één scherm. Geen getal als limiet (C11 open), wel de regel dat elke
  instelling zich verantwoordt.
- **De eerste versie in code is een wireframe, geen ontwerpvoorstel.** Jos herontwerpt na
  de spike via Stitch/Claude Design (F1, F2, F3 in [05](05-open-vragen.md)).

**Acceptatie:** Jos beoordeelt dit; er is geen automatische test die "genoeg ontworpen"
meet.

### F7 · Todo's — kandidaat, nog niet in scope

In ronde 2 kwam naar voren dat Obsidian ook gebruikt wordt om todo's bij te houden, met
het idee van "een vaste eerste pagina". Dat is een dagelijkse handeling die niet in B6
stond en dus niet in de scope zat. Uitwerking en opties in
[§10, besluit 1](#10-open-besluiten--ronde-3). **Tot dat besluit valt, is dit geen scope.**

## 5. Anti-scope

Bevestigd door Jos in V1 — alles hieronder is akkoord verklaard om *niet* te bouwen.
Dit hoofdstuk is de ruggengraat van de PRD: gezien de weging van P2 en P3 (beide 5) is
deze lijst dichter bij het probleem dan de functielijst hierboven.

| Niet bouwen | Waarom |
|---|---|
| Plugin-systeem | De bron van het probleem. Een platform is iets anders dan een app |
| Thema-store, aanpasbare CSS | Is het ontwerp goed, dan hoeft niemand het aan te passen |
| Graph view | Indrukwekkend, na week twee nooit meer geopend |
| Canvas / whiteboard | Ander product |
| Eigen sync-dienst | git, Syncthing en Drive doen dit al voor een map met bestanden |
| Samenwerking / commentaren | Ander product |
| AI-chat met je notities | Als dit ooit komt, is het een apart product op dezelfde map |
| Query-taal (Dataview-achtig) | Precies de leercurve waar mensen over klagen |
| Sjabloon-systeem | Templater wordt niet gebruikt en niet begrepen (B5) — dat is het antwoord |
| Tabs / split-panes / workspaces | De visuele overbelasting die we bestrijden |
| Backlinks-paneel | Er staan amper wikilinks in de vault (B7) |
| Daily notes | Niet in het dagelijks gebruik (B6) |
| Tags, tag-overzicht, `tag:`-zoeken | Jos organiseert op mappen en gebruikt geen tags (B3, V2) |

**Verplaatst van anti-scope naar toekomst:** mobiel. E2 is "ja, waarschijnlijk", wat de
keuze voor Tauri bevestigt. Buiten v1, maar we bouwen niets dat het onmogelijk maakt.

**Regel voor nieuwe ideeën.** Een functie mag alleen worden toegevoegd als (a) hij in de
afgelopen twee weken echt gemist is, en (b) er iets aangewezen kan worden dat in ruil weg
mag. F7 (todo's) is de eerste test van deze regel.

## 6. Succescriteria

Van Jos, letterlijk:

> **Geslaagd:** "Wanneer ik standaard Lapis open in plaats van Obsidian en Obsidian
> 'durf' te sluiten." (A3)
>
> **Mislukt:** "Dit mislukt wanneer ik het een aantal werkdagen niet gebruik." (A4)

Die twee zijn scherper dan wat ik in ronde 1 had verzonnen, omdat ze allebei over gedrag
gaan en niet over een functielijst. Het woord *durven* is bovendien de bruikbaarste
lakmoesproef die er is: je sluit Obsidian pas als je erop vertrouwt dat je niets mist.

**Ondersteunende meetpunten:**

| Meetpunt | Norm | Hoe |
|---|---|---|
| Dataverlies-incidenten | **0** — harde eis, elk incident is een stopper | Elke keer dat het gebeurt vastleggen |
| Snelheid | "Moet niet traag voelen" (D6) | Per wave beoordeeld; harde getallen pas als er iets te meten valt |
| Schaal | Goed blijven werken bij 5.000+ notities | Fixture-vault in de testsuite |
| Terugval naar Obsidian | Noteren wát er gemist werd | Notitie in de vault zelf |
| Aantal instellingen | Zo laag mogelijk, geen vast getal | Tellen bij elke release |

Die vierde is de waardevolste: elke keer dat Obsidian toch opengaat, is dat de enige
echte backlog-input die er is.

## 7. Gebruikersreizen

**Snel iets opschrijven.** `⌘N` → typen → weg. Geen dialoog over waar het bestand komt,
geen titelveld. Bij de eerste opslag wordt de eerste kopregel de bestandsnaam.

**Iets terugvinden van twee maanden geleden.** `⌘⇧F` → term → door de resultaten → Enter.
Je landt op de juiste regel, niet bovenaan het document.

**Doorwerken aan iets van gisteren.** `⌘K` → eerste letters → Enter.

**Ergens in de structuur graven.** Sidebar open, mapboom door. Dit is de reis die in
Bear werkte en in Apple Notes en iA Writer ontbrak — hij verdient evenveel aandacht als
zoeken.

**Een screenshot in een notitie plakken.** Plakken → de afbeelding verschijnt inline →
de notitie krijgt haar eigen map met de afbeelding erin.

**Claude Code wijzigt een bestand dat openstaat.** Lapis merkt het en handelt volgens F3;
getypte tekst verdwijnt nooit zonder dat er een keuze is gemaakt.

## 8. Randvoorwaarden

- **Compatibiliteit:** een vault moet tegelijk in Lapis, Obsidian, Finder en Claude Code
  bruikbaar zijn. Lapis schrijft geen configuratie, cache of metadata in de vault.
- **Privacy:** geen netwerkverkeer, geen telemetrie, geen crash-reporting, geen
  update-check in v1. Lapis werkt volledig offline.
- **Toegankelijkheid:** volledig met het toetsenbord bedienbaar; respecteert de
  systeeminstellingen voor tekstgrootte en verminderde beweging.
- **Formaten:** UTF-8, LF-regeleindes, YAML-frontmatter — precies zoals Obsidian schrijft.
- **Sync:** v1 wordt gebouwd tegen gewone lokale bestanden. De keuze tussen git,
  Syncthing en Drive volgt als mobiel aan de beurt is; we bouwen nu niets dat een van die
  drie onmogelijk maakt. (V5)
- **Schaal:** ontwerpen voor 5.000+ notities (B1, ronde 2).

## 9. Wat deze PRD niet vastlegt

Bewust, om te voorkomen dat dit document weer besluiten bevat die elders horen:

- **Hoe** iets gebouwd wordt → per wave in de Wave Specification ([07](07-wave-methode.md)).
- **Wanneer** iets af is → geen planning; tijdsbudget is als "niet relevant" beantwoord (G5).
- **Concrete prestatiegetallen** → pas als er iets te meten valt (D6).
- **Het visuele ontwerp** → Jos, na de spike.

## 10. Open besluiten — ronde 3

Vijf punten. Geen ervan blokkeert het schrijven van het eerste Goal Document.

### 1. Todo's: wat wordt F7? 🔴 *raakt de scope*

Je schreef bij V1: *"wat wel een feature kan zijn, en waar ik Obsidian wel voor gebruik,
is het bijhouden van todo's. Wellicht een vaste eerste pagina?"*

Dat is belangrijk om twee redenen. Ten eerste is het een dagelijkse handeling die niet in
B6 stond — de vraag is dus of er nóg meer buiten die lijst valt. Ten tweede is het de
eerste test van de regel uit §5: wat mag er in ruil weg?

| | Optie | Wat het kost | Wat het risico is |
|---|---|---|---|
| **a** | **Niets bouwen.** Markdown heeft `- [ ]` al, en die vinkjes zijn in F2 al klikbaar. Je maakt `Todo.md` en opent hem met `⌘K` | Nul | Je moet elke keer navigeren |
| **b** | **Vaste eerste pagina.** Eén aangewezen notitie die opent bij het starten van Lapis, altijd bereikbaar met één sneltoets. Geen todo-systeem — een gepinde notitie | Klein, geen datamodel | Vrijwel geen |
| **c** | **Todo-overzicht.** Lapis verzamelt alle `- [ ]` uit de hele vault in één lijst | Middel | Dit is een query-systeem in vermomming — precies wat je in V1 als anti-scope hebt aangekruist |
| **d** | **Echt todo-systeem** met datums, prioriteiten, herhaling | Groot | Ander product |

**Mijn advies, als advies:** b. Het beantwoordt de echte behoefte ("een vaste plek die ik
altijd kan openen") zonder een nieuw concept te introduceren, en het is met principe 2
verenigbaar. Optie c raad ik af omdat je hem in V1 zelf hebt uitgesloten.

**Vervolgvraag die hier los van staat:** staan er nog meer dagelijkse handelingen buiten
je B6-lijstje?

### 2. Frontmatter — je gaf aan het niet helemaal te snappen 🟡

Terecht, want ik heb het nergens uitgelegd. Frontmatter is het blokje dat sommige
markdown-bestanden bovenaan hebben, tussen twee regels met drie streepjes:

```markdown
---
title: Mijn notitie
tags: [werk, project]
created: 2026-08-05
---

# Mijn notitie

De eigenlijke tekst begint hier.
```

Obsidian noemt dit "properties". Het is bedoeld om gegevens over de notitie op te slaan
zodat software erop kan filteren. Jij gebruikt het niet — maar het kán in je bestanden
staan, gezet door een sjabloon, door de MCP-server of door Claude Code.

**Mijn lezing van je antwoorden (C6 + V2), ter bevestiging:** Lapis bouwt niets voor
frontmatter. Staat het er, dan wordt het gewoon getoond zoals het in het bestand staat en
blijft het onaangeraakt. Staat het er niet, dan gebeurt er niets. Geen invulformulier,
geen inklappen, geen tag-koppeling.

Klopt dat, of wil je het juist verbergen als het er staat?

### 3. Wat betekent "dicht" precies? 🟡 *raakt de veiligste laag*

Je antwoord op V4 was: *"het document gaat 'dicht' zoals bij Snapchat wanneer je weg
tabt."* Dat kan ik op twee manieren lezen, en het verschil is groot:

- **Lezing A — bij focusverlies:** verlaat je Lapis, dan wordt opgeslagen en het bestand
  losgelaten; kom je terug, dan wordt het opnieuw geladen. Elegant gevolg: er is bijna
  geen conflict meer mogelijk, want Lapis houdt een bestand alleen vast terwijl jij er
  actief in typt.
- **Lezing B — bij een conflict:** wijzigt een bestand extern, dan sluit Lapis het
  document. De vraag die dan openstaat: waar gaat de tekst heen die jij net had getypt en
  die nog niet was opgeslagen?

**Mijn lezing:** je bedoelt A, en A is ook het betere model — het lost het probleem op
door de conflictsituatie grotendeels weg te ontwerpen in plaats van hem af te handelen.
Maar A dekt niet alles: er blijft één geval over, namelijk dat er iets schrijft terwijl
jij aan het typen bent. Wat wil je dat er dán gebeurt?

### 4. V6 — je antwoord was `o` 🟡

Vermoedelijk "ok", maar ik ga hier niets aannemen, want het gaat over jouw notities.
Twee losse punten:

- **b) Schrijftests draaien uitsluitend tegen een fixture-vault**, nooit tegen
  `~/Documents`, tot de bestandslaag zijn testsuite doorstaat. Dit staat wat mij betreft
  vast tenzij je bezwaar maakt.
- **a) `git init` in de vault** als vangnet zolang er geen back-ups zijn. Kost je niets en
  geeft volledige geschiedenis, maar zet een `.git`-map in je vault. Jouw keuze.

### 5. Hoeveel notities heb je nu? 🟢

De doelwaarde is duidelijk (5.000+). Het huidige aantal ontbreekt nog, en dat bepaalt
waar de fixture-vault op wordt gebouwd:

```bash
find ~/Documents/<vault> -name '*.md' | wc -l
```

---

## 11. Volgende stappen

1. **Wave-indeling** — klein gesneden (G1), afgestemd op uitvoering door agents, op basis
   van F1 t/m F6.
2. **GitHub Projects inrichten** op `josbez/lapis` — één kaart per taak, kolommen volgens
   de wave-cyclus (G2, G3).
3. **Goal Document voor W0** (de spike): een map openen, één bestand in live preview
   bewerken en opslaan. Beantwoordt de enige vraag die er nu toe doet — wil je hierin
   typen?

Open besluit 1 (todo's) hoeft niet vóór W0 beantwoord te zijn, maar wel vóór de
wave-indeling definitief wordt.
