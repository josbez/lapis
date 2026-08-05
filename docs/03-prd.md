# 03 – PRD: Lapis

| | |
|---|---|
| **Versie** | 1.1 |
| **Datum** | augustus 2026 |
| **Eigenaar** | Jos |
| **Status** | Geldig. Gebaseerd op de antwoorden in [05](05-open-vragen.md), [08](08-vervolgvragen.md) en ronde 3 |
| **Platform** | macOS (Apple Silicon). Mobiel later, Windows/Linux misschien |
| **Open besluiten** | Drie, zie [§10](#10-open-besluiten) — geen ervan blokkeert de eerste waves |

**Wijzigingen in 1.1:** todo's als vaste eerste pagina zijn in scope (F7); het
focusmodel voor opslaan en herladen is vastgesteld (F3); frontmatter-gedrag bevestigd;
vaultomvang ingevuld op 402 notities.

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

**Primair: n = 1.** Jos. Vault in `~/Documents`, **402 notities**, ~170 MB totaal,
georganiseerd in mappen zonder tags. Die twee getallen samen zeggen iets belangrijks:
402 markdown-bestanden zijn hooguit een paar MB, dus vrijwel de gehele 170 MB bestaat uit
bijlagen. Lapis is dus meer een bijlagenbeheerder dan het aantal notities doet vermoeden.
Dagelijkse handelingen: schrijven, zoeken, terugvinden (B6) en todo's bijhouden (F7).
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
- **Het focusmodel** (C4, ronde 3 besluit 3): verlaat je Lapis, dan wordt opgeslagen en
  het bestand losgelaten. Kom je terug, dan wordt het opnieuw van schijf geladen. Lapis
  houdt een bestand dus alleen vast terwijl je er actief in typt.
- Geen back-upmechanisme in de app voor de MVP (D7).

**Waarom het focusmodel de belangrijkste beslissing in F3 is.** Het lost het
conflictprobleem niet op door het beter af te handelen, maar door het grotendeels weg te
ontwerpen. Een editor die een bestand vasthoudt terwijl je koffie haalt, bouwt
conflictkansen op; Lapis doet dat niet. Wat overblijft is één geval — er wordt extern
geschreven terwijl jij typt — en dat is zeldzaam genoeg om er een expliciete melding voor
te mogen tonen in plaats van een automatisme. De precieze vorm daarvan is
[open besluit 1](#10-open-besluiten) en wordt in de betreffende wave vastgelegd.

**Acceptatie:** `echo "test" >> notitie.md` in de terminal, terwijl Lapis op de
achtergrond staat, levert bij terugkeer de nieuwe inhoud. Getypte tekst gaat nooit
verloren zonder dat de gebruiker een keuze heeft gemaakt.

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

### F7 · De vaste eerste pagina

Eén notitie in de vault wordt aangewezen als startpagina. Die opent wanneer Lapis start,
en is altijd met één sneltoets bereikbaar.

- Aanwijzen gebeurt via de bestandsboom (rechtermuisknop → "als startpagina instellen").
  Welke notitie het is, wordt buiten de vault opgeslagen (principe 1).
- Is er geen startpagina ingesteld, dan opent Lapis leeg. Geen dialoog, geen suggestie.
- Verdwijnt de aangewezen notitie, dan vervalt de instelling stilzwijgend.

**Wat dit expliciet niet is:** een todo-systeem. Er komt geen datamodel, geen
verzamelscherm en geen statusbeheer. Todo's zijn gewone `- [ ]`-regels in gewone
markdown, en die vinkjes zijn in F2 al klikbaar. Wat F7 toevoegt is uitsluitend
*een vaste plek die altijd openstaat.*

**Herkomst:** Jos gebruikt Obsidian ook voor todo's — een dagelijkse handeling die niet
in B6 stond en pas in ronde 2 bovenkwam. Van de vier uitgewerkte opties is dit de
kleinste die de behoefte echt beantwoordt. Een verzamelscherm van alle `- [ ]` in de
vault is afgewezen, omdat dat een query-systeem is in vermomming — en query's staan in
de anti-scope.

**Acceptatie:** Lapis starten opent de aangewezen notitie. De sneltoets brengt je er
altijd naartoe, ongeacht waar je bent.

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
| Dataverlies-incidenten | **0** — harde eis, elk incident is een stopper | Elke keer dat het gebeurt vastleggen. Vangnet zolang er geen back-ups zijn: `git init` in de vault, door Jos zelf gezet (ronde 3 besluit 4) |
| Snelheid | "Moet niet traag voelen" (D6) | Per wave beoordeeld; harde getallen pas als er iets te meten valt |
| Schaal | Goed blijven werken bij 5.000+ notities, terwijl de echte vault er 402 heeft | Fixture-vault met 5.000–10.000 notities in de testsuite |
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

**Even je todo's bekijken.** Lapis openen — de startpagina staat er al. Of vanuit een
andere notitie: één sneltoets terug. Vinkje aanzetten met een klik.

**Een screenshot in een notitie plakken.** Plakken → de afbeelding verschijnt inline →
de notitie krijgt haar eigen map met de afbeelding erin.

**Claude Code wijzigt een bestand dat openstaat.** Sta je op dat moment niet in Lapis,
dan is het bestand losgelaten en zie je bij terugkeer gewoon de nieuwe inhoud — geen
melding, geen keuze, want er valt niets te kiezen. Zit je er wél in te typen, dan meldt
Lapis het en verdwijnt jouw tekst nooit zonder dat je hebt gekozen.

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
- **Schaal:** ontwerpen voor 5.000+ notities, terwijl de huidige vault er 402 heeft. Dat
  verschil van een factor twaalf is bewust: de app moet vanaf dag één onmiddellijk
  aanvoelen en dat blijven doen als de vault meegroeit. Praktisch gevolg: bouwen zonder
  voorbarige optimalisatie, maar testen tegen een fixture-vault van 5.000–10.000
  notities, zodat traagheid in de testsuite opduikt en niet in dagelijks gebruik.

## 9. Wat deze PRD niet vastlegt

Bewust, om te voorkomen dat dit document weer besluiten bevat die elders horen:

- **Hoe** iets gebouwd wordt → per wave in de Wave Specification ([07](07-wave-methode.md)).
- **Wanneer** iets af is → geen planning; tijdsbudget is als "niet relevant" beantwoord (G5).
- **Concrete prestatiegetallen** → pas als er iets te meten valt (D6).
- **Het visuele ontwerp** → Jos, na de spike.

## 10. Open besluiten

Drie punten. Geen ervan blokkeert het bouwen; elk heeft een aangewezen moment.

### 1. Wat gebeurt er als er wordt geschreven terwijl jij typt? 🟡 *voor de schrijfwave*

Het focusmodel (F3) haalt de meeste conflicten weg: Lapis houdt een bestand alleen vast
zolang jij er actief in typt. Eén geval blijft over — Claude Code of de MCP-server
schrijft precies op het moment dat jij in dat bestand aan het werk bent.

Voorstel als vertrekpunt, vast te leggen in het Goal Document van de schrijfwave:

- Lapis toont een balk boven het document: *"Dit bestand is zojuist buiten Lapis
  gewijzigd."*
- Jouw getypte tekst blijft in beeld en gaat nergens heen.
- Drie keuzes: **mijn versie behouden** · **hun versie laden** (met bevestiging) ·
  **beide bewaren** (jouw versie als kopie ernaast).
- Er is geen standaardkeuze en er verloopt geen timer. De situatie blijft staan tot je
  kiest.

Akkoord, of wil je iets anders? Dit is de enige plek in het hele product waar tekst
verloren kán gaan, dus het is de moeite waard om er precies over te zijn.

### 2. Waar staan je bijlagen nu? 🟡 *voor de bijlagenwave*

402 notities zijn hooguit een paar MB markdown. De overige ~168 MB zijn bijlagen — ruwweg
400 MB bijlage per MB tekst. Dat maakt de mapafspraak uit F5 zwaarder dan hij op papier
leek.

De vraag: **waar staan die bijlagen op dit moment?** Obsidian gebruikt standaard één
centrale map (vaak `attachments/` of `_resources/`). Is dat bij jou zo, dan introduceert
F5 een tweede patroon náást het bestaande:

- oude bijlagen: centraal in één map
- nieuwe bijlagen: per notitie in een eigen map

Twee patronen naast elkaar in dezelfde vault is precies het soort onopgeloste weging
waar §1 over gaat. Opties: laten zoals het is en het verschil accepteren; F5 aanpassen
naar wat je nu al doet; of eenmalig migreren — dat laatste raad ik af, het verplaatst
honderden bestanden voor cosmetiek.

Uitzoeken met:

```bash
find ~/Documents -type d \( -iname 'attachment*' -o -iname '*resource*' -o -iname 'assets' \)
```

### 3. Staan er nog meer dagelijkse handelingen buiten B6? 🟢 *doorlopend*

Todo's kwamen pas in ronde 2 boven, terwijl B6 als compleet bedoeld was. Dat is geen
verwijt — het is normaal dat je je eigen gewoontes pas ziet als er iets naast wordt
gelegd. Maar het betekent wel dat de functielijst mogelijk nog een gat heeft.

Deze vraag hoeft niet nu beantwoord te worden. Het antwoord komt vanzelf tijdens het
gebruik van de eerste versies: elke keer dat je Obsidian toch opent, staat er iets op de
lijst dat we gemist hebben (§6).

## 11. Volgende stappen

1. **Wave-indeling goedkeuren** — voorstel staat in
   [07 §5](07-wave-methode.md#5-voorstel-wave-indeling): elf kleine waves, afgeleid uit
   F1 t/m F7 en afgestemd op uitvoering door agents.
2. **GitHub Projects inrichten** op `josbez/lapis` — één kaart per taak, kolommen volgens
   de wave-cyclus (G2, G3).
3. **Goal Document voor W0** (de spike): een map openen, één bestand in live preview
   bewerken en opslaan. Beantwoordt de enige vraag die er nu toe doet — wil je hierin
   typen?

Geen van de drie open besluiten uit §10 blokkeert stap 1 of 3.
