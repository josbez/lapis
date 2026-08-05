# 08 – Ronde 2: wat vaststaat, en wat er nog blokkeert

**Aanleiding:** [05](05-open-vragen.md) is ingevuld. De meeste vragen zijn beantwoord.
Wat hier staat is drieledig: het besluitenregister, antwoord op de twee vragen die je
terugstelde, en negen vervolgvragen — waarvan drie de PRD blokkeren.

Dit is bewust een kort document. Ronde 2 hoort korter te zijn dan ronde 1.

---

## 1. Het belangrijkste antwoord dat je gaf

Niet A1, maar A5:

> "Ik vond Bear fijn door de minimale weergave met mappenstructuur. Apple Notes voor de
> simpelheid (maar ook veel features en geen mappen) en iA Writer om de cleanheid (maar
> miste destijds mappen en was TE designy). **Wat er nu nog mist aan Obsidian is dat het
> niet ontworpen GENOEG voelt. Er mist een balans.**"

Dat is een scherpere probleemstelling dan wat ik in ronde 1 had. Mijn versie was
"weglaten". Die van jou is **balans**: er zit een smalle band tussen te weinig ontworpen
(Obsidian: alles bestaat, niets is gewogen) en te veel ontworpen (iA Writer: het ontwerp
neemt beslissingen die het jou lastig maken). Bear zat in die band, maar gaf platte
tekst in een map op.

Drie gevolgen die ik hieruit trek, en die je mag corrigeren:

1. **Het onderscheidend vermogen van Lapis is het ontwerp, niet de functielijst.** Elke
  functie die we bouwen kopieert iets dat elders al bestaat. Wat nergens bestaat is de  
   band waar jij naar wijst.
  1. klopt

1. **Mappen zijn geen implementatiedetail maar een productbesluit.** In alle drie de
  apps die je noemt is de aan- of afwezigheid van mappen de doorslaggevende factor.
   Bevestigd door B3: je organiseert op mappen, niet op tags.
  1. klopt
2. **"Zonder de vibe-code-esthetiek" (A1) is een eis, geen bijzin.** Voor een UX-designer
  die dit deelt, is een generiek ogende app een diskwalificatie. Dat heeft één concrete
   consequentie voor onze afspraak in F1 (ik lever eerst code, jij herontwerpt): mijn
   eerste versie is **een wireframe in code**, expliciet niet een ontwerpvoorstel. Als ik
   er iets moois van probeer te maken, ontwerp ik ongevraagd mee en krijg je precies de
   esthetiek die je niet wilt.
  1. klopt

---



## 2. Antwoord op je twee tegenvragen



### B1 · "170 MB, hoeveel is dat? En waarom is dit relevant?"

**Hoeveel het is, weet ik niet — en 170 MB vertelt het ook niet.** Een markdown-notitie is
1 tot 5 KB. Was die 170 MB puur markdown, dan had je tussen de 35.000 en 170.000 notities,
en dat is onwaarschijnlijk. Vrijwel zeker is het overgrote deel bijlagen: afbeeldingen,
PDF's, screenshots. Het echte aantal notities kan alles zijn tussen 300 en 5.000.

Drie commando's geven het antwoord:

```bash
# aantal notities
find ~/Documents/<vault> -name '*.md' | wc -l

# hoeveel van die 170 MB is markdown
find ~/Documents/<vault> -name '*.md' -exec du -ch {} + | tail -1

# de tien grootste bestanden (meestal de bijlagen)
find ~/Documents/<vault> -type f -exec du -h {} + | sort -rh | head -10
```

**Waarom het relevant is** — en je hebt gelijk dat "het moet schaalbaar werken" het echte
antwoord is, maar schaalbaar is geen ontwerp. Het getal bepaalt vier dingen:


| Het aantal bepaalt   | Onder ~1.000             | Boven ~5.000                              |
| -------------------- | ------------------------ | ----------------------------------------- |
| Bestandsboom         | Gewoon renderen          | Virtualiseren, anders hapert het scrollen |
| Zoeken               | Direct scannen kan       | Index verplicht (jij koos al FTS5 — goed) |
| Eerste indexopbouw   | Onmerkbaar               | Achtergrondtaak met voortgang nodig       |
| Waar we tegen testen | Fixture met 500 notities | Fixture met 10.000                        |


Zonder het getal test ik tegen een verzonnen vault en ontdek je de traagheid pas als je
hem echt gebruikt. **En met "schaalbaar" als uitgangspunt is er nog een tweede getal
nodig:** waar wil je nog goed werken — 10.000 notities? 50.000? Dat verschil bepaalt of
naïeve oplossingen mogen blijven staan.

Wat de 170 MB wél nu al zegt: er zitten véél bijlagen in je vault. Dat maakt vraag V3
(de mapstructuur uit C8) groter dan hij op papier lijkt.

Ga uit van 5000+ voor schaalbaarheid

### D2 · "Waarom moet ik dat leren?"

**Dat hoef je niet.** Mijn vraag was gebaseerd op de aanname dat jij zou typen; G6 maakt
duidelijk dat agents dat doen. Die vraag was dus voor een groot deel achterhaald op het
moment dat ik hem stelde.

Wat er wél overblijft, en dat is een eerlijke waarschuwing en geen verkapt advies om Rust
te leren:

- Je hebt in G4 gezegd: *"critiseren van tech"*. Dat kan zonder Rust te schrijven, maar
niet zonder te kunnen lezen wat er staat. Dat is een lagere lat — code lezen is
aanzienlijk makkelijker dan code schrijven.
- Het reële risico is **eigenaarschap zonder begrip**: over vier maanden staat er een
Rust-module die niemand in huis kan repareren als een agent hem niet meer opgelost
krijgt. Bij een lokale desktop-app die jouw notities beheert, is dat een risico met
tanden.
- Wat we daartegen kunnen doen zonder dat jij Rust leert: de Rust-laag klein en saai
houden, gebruikmaken van gevestigde crates in plaats van eigen constructies, en zwaar
leunen op geautomatiseerde tests rond de bestandslaag — precies het werk dat jij in G4
aan mij hebt toegewezen.

Er is nog een gevolg: één van de sterkste argumenten vóór Electron (§1.3 van
[06](06-beslisinput-techniek.md)) was *"één taal in plaats van twee"*. Dat argument
verliest zijn gewicht als jij geen van beide talen schrijft. Jouw keuze voor Tauri wordt
er dus sterker van, niet zwakker.

---



## 3. Besluitenregister

Wat vaststaat na ronde 1. Alles hieronder is jouw besluit en gaat zo de PRD in.


| Onderwerp           | Besluit                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| Doel                | Fijne eigen editor + experiment + mogelijk delen. Geen vibe-code-esthetiek  |
| Succes              | Standaard Lapis openen, en Obsidian durven sluiten                          |
| Mislukking          | Een aantal werkdagen niet gebruikt                                          |
| Probleemweging      | Functionele ruis (5) en tweak-val (5) boven visuele overbelasting (4)       |
| Doelgroep           | Geen hardgecodeerde paden of aannames over mapstructuur                     |
| Organisatie         | Mappen, geen tags, geen frontmatter                                         |
| Wikilinks           | Renderen én klikbaar                                                        |
| Opslaan             | Autosave met `⌘S` als extra                                                 |
| Extern gewijzigd    | Herladen op focus is toegestaan; bij conflict melden en blokkeren           |
| Bestandsnaam        | Uit de eerste kopregel                                                      |
| Frontmatter         | Altijd volledig tonen                                                       |
| Verwijderen         | Systeem-prullenbak                                                          |
| Vault schoonhouden  | Ja — index, instellingen en app-staat buiten de vault                       |
| Documenten tegelijk | Eén                                                                         |
| Stack               | Tauri v2 · React · CodeMirror 6 via `atomic-editor` · SQLite FTS5           |
| Prestatie           | "Moet niet traag voelen"                                                    |
| Back-ups            | Niet in de app voor de MVP                                                  |
| Repo                | Privé tot het werkt, daarna open source                                     |
| Mobiel              | Ja, waarschijnlijk → bevestigt Tauri                                        |
| Windows/Linux       | Misschien                                                                   |
| Meerdere Macs       | Nee, misschien ooit                                                         |
| Ontwerp             | Ik lever eerst code, jij herontwerpt, na de spike, via Stitch/Claude Design |
| Waves               | Klein                                                                       |
| Backlog             | GitHub Projects op `josbez/lapis`, één kaart per taak                       |
| Verificatie         | Jij test UX/UI en bekritiseert techniek; ik test techniek                   |
| Bouwen              | Claude Code met agents per wave                                             |


**Geparkeerd, expliciet niet vergeten:** het aantal instellingen (C11), harde
prestatiegetallen (D6), typografie (F4), tijdsbudget (G5 — "niet relevant", genoteerd).

---



## 4. Vervolgvragen



### 🔴 V1 · De anti-scope is niet ingevuld — en dat is de belangrijkste vraag

C1 is leeg gebleven. Dit is de vraag die bepaalt of Lapis over vier maanden nog Lapis is,
en gezien je eigen weging (P2 en P3 allebei een 5) is het ook de vraag die het dichtst bij
je probleem ligt. Zet er een kruisje achter:


| Niet bouwen                     | Akkoord | Wél bouwen | Twijfel |
| ------------------------------- | ------- | ---------- | ------- |
| Plugin-systeem                  | x       | ☐          | ☐       |
| Thema-store / aanpasbare CSS    | x       | ☐          | ☐       |
| Graph view                      | x       | ☐          | ☐       |
| Canvas / whiteboard             | x       | ☐          | ☐       |
| Eigen sync-dienst               | x       | ☐          | ☐       |
| Samenwerking / commentaren      | x       | ☐          | ☐       |
| AI-chat met je notities         | x       | ☐          | ☐       |
| Query-taal (Dataview-achtig)    | x       | ☐          | ☐       |
| Sjabloon-systeem                | x       | ☐          | ☐       |
| Tabs / split-panes / workspaces | x       | ☐          | ☐       |
| Backlinks-paneel                | x       | ☐          | ☐       |
| Daily notes                     | x       | ☐          | ☐       |


Twee kanttekeningen bij deze lijst sinds ronde 1:

- **Mobiel staat er niet meer op.** E2 is "ja, waarschijnlijk", dus mobiel is verplaatst
van anti-scope naar toekomst. Het blijft buiten v1.
- **Sjablonen** verdienen een tweede blik: B5 noemt Templater, met de kanttekening dat je
hem niet helemaal snapt. Als je hem niet gebruikt, is het anti-scope. Als je hem
gebruikt zonder te snappen, is dat juist een aanwijzing dat het weg mag.

**Antwoord:** `gebruik het niet, anti scope. Wat wel een feature kan zijn nu we het hier over hebben, en waar ik obsidian wel voor gebruik, is het bijhouden van todo's. Wellicht een vaste eerste pagina?`

### 🔴 V2 · Tags en frontmatter vallen uit v1 — bevestig dat

Toen ik in ronde 0 vroeg naar must-haves, koos je "tags / frontmatter". In B3 en B8 zeg je
nu: mappen, geen tags, geen frontmatter. Dat is geen fout van jou — mijn oorspronkelijke
vraag bood vier opties waaruit je moest kiezen, wat een slechte manier van vragen was.

Als B3/B8 klopt, verdwijnt er een hele milestone uit de scope. Mijn lezing:

- **Weg uit v1:** tag-systeem, tag-overzicht, `tag:`-zoeken, frontmatter als bewerkbaar
formulier.
- **Blijft:** bestaande frontmatter wordt volledig getoond en blijft byte-voor-byte
intact (C6). Lapis maakt hem nooit zelf aan.
- **Vervalt daarmee ook:** de vraag hoe `#tags` in de body en `tags:` in frontmatter zich
tot elkaar verhouden.

Klopt dat? En: gebruik je `#tags` in de lopende tekst wél, ook al staat er niets in
frontmatter?

**Antwoord:** `ik gebruik geen tags. Dus geen frontmatter? Ik merk dat ik deze niet helemaal snap.`

### 🔴 V3 · C8 en C5 samen doen iets dat je waarschijnlijk niet bedoelt

Dit is de belangrijkste vondst uit je antwoorden.

Je koos twee dingen los van elkaar:

- **C5:** de bestandsnaam komt uit de eerste kopregel.
- **C8:** een notitie met een afbeelding verhuist naar een map met de naam van de
notitie; de afbeelding komt daar ook in; hernoem je de notitie, dan hernoemt de map mee.

Samengevoegd:

```
Je typt in de kopregel  →  bestandsnaam wijzigt
                        →  mapnaam wijzigt
                        →  het .md-bestand en al zijn afbeeldingen verhuizen op schijf
```

Oftewel: **een letter typen in je titel verplaatst bestanden.** Terwijl er volgens B10
mogelijk een Claude Code-sessie of MCP-server in diezelfde map aan het werk is. Dat is
de gevaarlijkste interactie in het hele ontwerp.

Daarnaast roept C8 losse vragen op die ik niet voor je wil invullen:

1. **Krijgt elke notitie een map, of alleen notities met bijlagen?** Bij het eerste wordt
  je hele vault omgebouwd (en gezien de 170 MB gaat dat om veel bestanden). Bij het
   tweede wordt je vault gemengd: sommige notities zijn bestanden, andere zijn mappen.
2. **Wanneer gebeurt de omzetting?** Bij het plakken van de eerste afbeelding? Dan
  verplaatst plakken je bestand.
3. **En terug?** Verwijder je de laatste afbeelding — klapt de map dan weer in?
4. **Bestaande notities:** doen we niets met wat er al staat, of migreren we?

**Mijn voorstel, nadrukkelijk als voorstel:** kopregel bepaalt de bestandsnaam alleen bij
de éérste opslag, daarna alleen handmatig hernoemen. Map ontstaat pas bij de eerste
bijlage. Bestaande notities blijven ongemoeid. Daarmee blijft typen een veilige handeling.

**Antwoord:** `oke`

### 🟡 V4 · Wat betekent "blokkeren" precies?

C4: bij een conflict melden en het document blokkeren. Dat is helder als toestand, maar
niet als uitweg. Concreet:

- Wordt het document alleen-lezen met een balk erboven, of gaat het dicht?
- Hoe kom je eruit? (mijn versie houden / hun versie laden / als kopie opslaan / de map
in Finder openen en het zelf regelen)
- "Herladen op focus" — alleen als jij niets gewijzigd hebt, of ook met openstaande
wijzigingen? Het tweede kan je typwerk opeten.

**Antwoord:** `het document gaat "dicht" zoals bij snapchat wanneer je weg tabt.` 

### 🟡 V5 · Sync: kies er één, want mobiel hangt eraan

Je noemde drie opties in E1 en E2 is "ja, waarschijnlijk". Die twee vragen zijn in de
praktijk één vraag, want de sync-oplossing bepaalt of er überhaupt een mobiel pad is:


| Optie                                                  | Op de Mac                                                                            | Op iOS                                                                      | Kosten voor de bestandslaag |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | --------------------------- |
| **git**                                                | Uitstekend, plus versiegeschiedenis                                                  | Werkt via Working Copy, maar handmatig en omslachtig                        | Laag                        |
| **Syncthing**                                          | Uitstekend, gewone bestanden                                                         | **Geen officiële iOS-app.** Alleen Möbius Sync, een betaalde app van derden | Laag                        |
| **Google Drive**                                       | Virtueel bestandssysteem: watcher gedraagt zich anders, conflicten worden duplicaten | Werkt, maar matige Files-integratie                                         | **Hoog**                    |
| **iCloud** (niet genoemd, wel het natuurlijke iOS-pad) | Placeholders bij "optimaliseer opslag", onbetrouwbare events                         | Verreweg het beste                                                          | **Hoog**                    |


De onaangename waarheid: **de twee opties die het makkelijkst zijn om te bouwen zijn de
twee die op iOS het slechtst werken, en andersom.** Details in
[06 §4](06-beslisinput-techniek.md#4-sync--wat-elke-optie-technisch-betekent) en
[§6](06-beslisinput-techniek.md#6-mobiel--wat-het-echt-betekent).

Je hebt nu geen sync (B4: `/Users/jos/Documents`). Voorstel voor de volgorde: v1 bouwen
tegen gewone lokale bestanden, en deze keuze pas maken als mobiel echt aan de beurt is —
mits we nu niets bouwen dat het later onmogelijk maakt. Akkoord, of wil je nu kiezen?

**Antwoord:** **Akkoord**

### 🟡 V6 · Geen back-ups, agents die schrijven, en een geblokkeerd document

Drie antwoorden die los prima zijn en samen een risico vormen:

- **D7:** geen back-ups in de app voor de MVP
- **B5 / B10:** een MCP-server en Claude Code schrijven in dezelfde vault
- **G6:** agents bouwen de app die diezelfde bestanden beheert

Dat is een agent die code schrijft die jouw notities overschrijft, zonder vangnet. Eén
verkeerde schrijfactie in de bestandslaag en er is geen weg terug.

Ik ga hier niet stiekem een back-upmechanisme bouwen — je hebt "nee" gezegd. Wat ik wel
doe is de vraag stellen: **mag ik één van deze twee voorwaarden verbinden aan de eerste
schrijf-wave?**

- **a)** `git init` in de vault, met een commit vóór elke testronde. Kost jou niets,
bestaat al in je E1-lijstje, en geeft volledige geschiedenis. Wel: een `.git`-map in de
vault, wat schuurt met C9.
- **b)** Alle schrijftests draaien uitsluitend tegen een fixture-vault, nooit tegen
`~/Documents`, tot de bestandslaag zijn testsuite doorstaat.

**Mijn mening:** allebei. B is niet onderhandelbaar wat mij betreft; A is jouw keuze.

**Antwoord:** `o`

### 🟡 V7 · Het aantal notities

Draai de commando's uit §2 en geef twee getallen: hoeveel notities er nu zijn, en tot
hoeveel het moet blijven werken.

**Antwoord:** nu: `______` · doelwaarde: `______`

### 🟢 V8 · Staat `josbez/lapis` op privé?

D8 zegt: privé tot het werkt. Dat moet geregeld zijn vóór er code in de repo staat — nu
verplaatsen is triviaal, straks staat er geschiedenis in. Controleer de zichtbaarheid;
als hij publiek staat, zet hem om.

**Ja**

### 🟢 V9 · De werkwijze met agents

G6 zegt: bouwen via Claude Code met agents per wave. G4 zegt: ik test de techniek. Dat
past goed samen, maar het verandert de rolverdeling uit
[07 §6](07-wave-methode.md#6-werkafspraak-per-wave). Voorstel:

```
Ik schrijf Goal Document           → jij keurt goed
Ik schrijf Wave Specification      → jij keurt goed
Ik schrijf Test & Verification Plan
Agents implementeren de wave
Ik draai de tests en lever bewijs
Jij beoordeelt op UX/UI en techniekkritiek → jij accepteert
```

Twee dingen om te bevestigen: (1) schrijf ik alle drie de documenten, of wil je zelf het
Goal Document schrijven? (2) Reviewen agents elkaars werk, of ben ik het enige technische
filter vóór jouw acceptatie?

**Antwoord:** `oke - en ik redigeer elke stap indien nodig`

---



## 5. Wat er gebeurt zodra V1, V2 en V3 beantwoord zijn

Die drie blokkeren de PRD; de rest niet. Zodra ze binnen zijn:

1. **PRD v1.0** — herschreven vanuit jouw antwoorden, met "balans" als
  probleemstelling in plaats van "weglaten", mappen als productbesluit, en de anti-scope
   uit V1 als ruggengraat.
2. **Wave-indeling** — klein gesneden (G1), afgestemd op agent-uitvoering.
3. **GitHub Projects ingericht** — één kaart per taak, kolommen volgens de wave-cyclus.
4. **Goal Document voor W0** (de spike) — het eerste wave-document.

De rest van de vragen kan onderweg beantwoord worden: V4 en V6 vóór de schrijf-wave, V5
vóór er iets sync-specifieks gebouwd wordt, V7 vóór het prestatiewerk, V8 vóór de eerste
commit met code.

---



## Bronnen bij dit document

- [Möbius Sync – Syncthing voor iOS (derde partij, betaald)](https://mobiussync.com/)
- [Möbius Sync FAQ – geen officiële Syncthing iOS-client](https://mobiussync.com/faq/)
- [Sync Mac/PC en iOS met Syncthing + Möbius Sync – Obsidian Forum](https://forum.obsidian.md/t/sync-mac-pc-and-ios-using-syncthing-mobius-sync/72022)

