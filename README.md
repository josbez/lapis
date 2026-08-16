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
het geheugen, recent geopende notities bovenaan bij een lege invoer. Alle
geautomatiseerde verificatie is groen.

Ook zonder de drie wave-documenten gebouwd, op hetzelfde expliciete verzoek: **W6 —
volledige tekst zoeken** (PRD F4, `⌘⇧F`). Een nieuwe crate `search-index` houdt een
SQLite FTS5-index bij, buiten de vault (`~/Library/Application Support/Lapis/`, één
indexbestand per vault via een hash van het vaultpad) — de index is wegwerpbaar: bij een
schema-mismatch of corrupt bestand wordt hij gewoon opnieuw opgebouwd, en er staat nooit
iets in die niet ook uit de vault zelf is af te leiden. `TreeNode` draagt sinds deze wave
een `modified`-tijdstip voor bestanden (hergebruik van de metadata die het scannen toch al
ophaalt, geen extra syscall), waarmee `search_notes` incrementeel bijwerkt: alleen
gewijzigde of nieuwe bestanden worden herlezen en opnieuw geïndexeerd, bij het openen van
een vault, een handmatige rescan, én meteen na elke geslaagde schrijfactie. Zoeken zelf
gaat via FTS5 `MATCH` met BM25-ranking en gemarkeerde snippets; de frontend rendert die
markering zelf als React-elementen in plaats van via `dangerouslySetInnerHTML`, omdat de
snippet afgeleid is van de eigen notitie-inhoud van de gebruiker en dus nooit als HTML
geparsed mag worden. Op een treffer klikken of Enter drukken opent de notitie en springt
naar de gevonden regel (`initialRevealText`, atomic-editor's eigen fade-out-markering) —
"Enter opent op de gevonden regel". De isolatiecheck is uitgebreid met `app/search-index`
in de bestaande hardgecodeerd-pad- en netwerkchecks (16 checks in totaal, zelftest
onveranderd). Alle geautomatiseerde verificatie is groen.

Ook W7 (PRD F5, bestandsbeheer) is zonder de drie wave-documenten gebouwd, op hetzelfde
expliciete verzoek — maar niet zonder overleg: de wave raakt rechtstreeks de C5+V3-afspraak
die Jos destijds zelf omschreef als "de gevaarlijkste interactie in het hele ontwerp"
("een letter typen in je titel verplaatst bestanden"), dus is één concrete uitwerkingsvraag
alsnog voorgelegd vóór er gebouwd werd. Jos koos het letterlijke antwoord uit die
afspraak: een nieuwe notitie bestaat pas op schijf na de allereerste opslag (debounce,
`⌘S`, of wegklikken — dezelfde triggers als gewone autosave), genoemd naar de kopregel op
dát moment, of `Untitled(.md/ 2.md/…)` zonder kopregel. Vóór die eerste opslag bestaat de
notitie alleen als concept in de frontend (`useDraftNote`/`NoteDraft`) — er komt geen
`Untitled.md` op schijf dat later hernoemd wordt. Een subtiele race is daarbij expliciet
dichtgetimmerd: tekst die getypt wordt terwijl `create_note`'s IPC-aanroep nog onderweg is,
wordt na afloop alsnog bijgeschreven op het net aangemaakte bestand, zodat niets verloren
gaat. `vault-core` kreeg `create_note`, `create_folder`, `move_note` (dekt zowel hernoemen
als verplaatsen — dezelfde `rename()`) en `trash_note` (systeem-prullenbak via de
`trash`-crate, PRD C7, nooit permanent). De boom heeft nu een rechtsklik-contextmenu
(hernoemen/verplaatsen naar…/naar prullenbak op een bestand; nieuwe notitie/map hier op
een map) plus twee toolbarknoppen. **Verplaatsen gaat bewust via een pad intypen, geen
drag-and-drop of mapkiezer** — een ruwe eerste versie om de scope van deze wave niet te
laten uitdijen naar interactiepolish; dat hoort bij W10 ("De vorm"). Alle geautomatiseerde
verificatie is groen.

Ook W8 (PRD F5/C8, bijlagen) is zonder de drie wave-documenten gebouwd, op hetzelfde
expliciete verzoek. Het PRD zelf vlagt één open vraag specifiek "voor de bijlagenwave" —
hoe bestaande bijlagen nu al op schijf staan, met ~168 MB aan bijlagen op 402 notities in
Jos' echte vault een reëel risico op twee botsende conventies naast elkaar. Voorgelegd
vóór er gebouwd werd; Jos' antwoord: bouw gewoon volgens F5, bestaand materiaal blijft
ongemoeid ongeacht hoe het er nu bij staat. `vault-core` kreeg `write_attachment`
(bij de eerste bijlage in een notitie ontstaat een map genoemd naar de notitie zelf, en
het `.md`-bestand verhuist daar samen met de bijlage in — de bijlage wordt bewust eerst
weggeschreven, pas dáárna de notitie verplaatst, zodat een falende schrijfactie de
notitie nooit halverwege achterlaat) en `read_attachment` (leest een bijlage relatief aan
de map van de notitie die ernaar verwijst, en mag daarbij — anders dan een notitiepad
zelf — `..`-componenten bevatten, voor bijlagen die al vóór Lapis ergens anders stonden).
Bijlagen gaan als base64 over de IPC-grens. Aan de frontend-kant rendert een
CodeMirror-extensie relatieve `<img src>`'s als blob-URL (de editor biedt hiervoor geen
resolver-hook, dit werkt dus op DOM-niveau), en een tweede extensie onderschept het
plakken van een afbeelding uit het klembord: eerst alles wat tot dan toe getypt is
opslaan, dan de bijlage wegschrijven, en bij een migratie het geopende notitiepad
bijwerken — zonder de editor zelf te laten remounten, want de gebruiker was nog aan het
typen toen de bijlage geplakt werd. Alle geautomatiseerde verificatie is groen.

Ook W9 (PRD F7, de vaste eerste pagina) is zonder de drie wave-documenten gebouwd, op
hetzelfde expliciete verzoek. Een notitie is aan te wijzen als startpagina via het
rechtsklik-contextmenu op de boom ("Als startpagina instellen"; rechtsklikken op de
huidige startpagina toont in plaats daarvan "Startpagina wissen"). `app-state` onthoudt
het relatieve pad ernaartoe, buiten de vault (principe 1) — hetzelfde bestand en dezelfde
vorm als `vault_root` en `recent_paths`, een `Option<String>` die bij een oud
instellingenbestand vanzelf op `None` uitkomt. Lapis start op met die notitie al open;
`⌘⇧H` brengt je er vanaf elk moment naartoe, ook vanuit een andere open notitie, en doet
niets zonder ingestelde startpagina. Is de aangewezen notitie inmiddels verdwenen, dan
vervalt de aanwijzing stilzwijgend — geen foutmelding, geen dialoog, Lapis opent gewoon
leeg, precies zoals het PRD voorschrijft. Bewust ontbrekend, want expliciet buiten scope
(PRD F7): geen todo-systeem, geen verzamelscherm van alle `- [ ]`-regels — een startpagina
is uitsluitend een vaste plek die altijd bereikbaar is, de vinkjes erin waren al klikbaar
sinds F2. Alle geautomatiseerde verificatie is groen.

Ook W10 (PRD F6, de vorm) is zonder de drie wave-documenten gebouwd. **Dit is bewust de
eerste versie in code, geen ontwerpvoorstel** (05 §F1/F3): Jos herontwerpt hierna via
Stitch/Claude Design, en dít wireframe is wat hij daarvoor als vertrekpunt aanwees. Wat
erin zit: één stylesheet (`app/src/styles.css`) met de vier F6-eisen. Eén venster —
toolbar, sidebar, editor, geen tabs of panelen. Licht en donker volgend op het systeem via
`prefers-color-scheme`, uitdrukkelijk geen handmatige thema-schakelaar (die sluit het PRD
zelf uit). Ruime marges met een beperkte regellengte en royale regelafstand, via de
theming-contract-variabelen die `@atomic-editor/editor` al bood (`--atomic-editor-*`) —
de kern van de vorm zit dus juist niet in eigen CSS, maar in het overnemen van een
bestaand contract, inclusief syntaxkleuren voor codeblokken in beide standen. En een
instellingenscherm: één scherm, twee regels die zich allebei verantwoorden — de vault
(tot deze wave was er geen manier om 'm ná het eerste kiezen te wijzigen; dat is een
functioneel gat, geen decoratie) en de startpagina (W9; hier alleen tonen en wissen,
instellen blijft bewust via het rechtsklik-contextmenu, zoals F7 voorschrijft). Quick
switcher, volledige-tekst-zoeken, het contextmenu en de conflictbalk zijn in dezelfde
stijl meegenomen zonder hun bestaande rollen/tekst te wijzigen — alle 148
frontend-tests bleven ongewijzigd groen. **Acceptatie is hier bewust geen automatische
test** (PRD F6 zelf: "Jos beoordeelt dit") — de geautomatiseerde verificatie bewijst dat
niets kapot is gegaan, niet dat de vorm "goed genoeg" is.

Het echte ontwerp is daarna via Stitch tot stand gekomen en heeft de wireframe hierboven
vervangen. Drie terugkoppelrondes (vastgelegd in de Stitch-briefing, die niet in de repo
staat) haalden drie problemen eruit vóór Jos akkoord gaf: lopende tekst in een
codelettertype (leest als een IDE, niet als proza — precies wat de doelzone tussen Bear
en iA Writer uitsluit), een toolbar van ongelabelde iconen (letterlijk Jos' eigen klacht
over Obsidian), en een verzonnen navigatielaag ("Drafts/Projects/Archive/Trash") die
principe 3 schendt — Lapis kent geen concepten, projecten, archief of in-app
prullenbak-scherm, de mapboom is de enige navigatie. Dat laatste punt is in de code
stilzwijgend weggelaten in plaats van in Stitch opgelost, op Jos' eigen instructie.
Overgenomen: drie lettertypefamilies met een eigen rol (Geist voor de chrome, Source
Serif 4 voor notitie-inhoud, Hanken Grotesk uitsluitend voor het instellingenscherm — een
notitie-kop blijft bewust in dezelfde serif als de rest van diezelfde notitie), een
kleurenpalet met borders in plaats van schaduwen voor elke laag, 4px-afronding, en een
broodkruimel boven de editor die het echte pad toont. Alle drie de lettertypes zijn
zelf-gehost via `@fontsource` (geen Google Fonts-CDN op runtime — PRD §8 eist "volledig
offline"). Alle 148 frontend-tests bleven groen.

## Volgende stap

De eerste echte gebruikstest, tegen Jos' eigen vault — met de `git init`-voorzorg uit
V6a hieronder vooraf. Jos' oordeel na W8 was: *"ik ga het zo niet kunnen gebruiken, daar
zijn W9 en W10 voor nodig."* Beide staan er nu, inclusief het echte ontwerp — dit is dus
het moment waarop dat oordeel voor het eerst echt getoetst kan worden.

**Werkwijze vanaf hier:** klein snijden, vaste volgorde, groene verificatie per stap, en
beslissingen die de PRD raken apart voorleggen — maar zónder de drie formele
wave-documenten. Zie de evaluatie in
[07 §9](docs/07-wave-methode.md#9-evaluatie-wat-de-methode-heeft-opgeleverd).

**Vóór er tegen echte notities getest wordt:** `git init` + commit in de vault
(afspraak V6a). Schrijftests draaien uitsluitend tegen tijdelijke fixture-vaults.

## Zelf bouwen en draaien (macOS)

Eenmalig nodig:

- **Xcode Command Line Tools** — `xcode-select --install`
- **Rust** — via [rustup.rs](https://rustup.rs)
- **Node.js 22** — dezelfde versie als CI, bijvoorbeeld via [nvm](https://github.com/nvm-sh/nvm)
  of [nodejs.org](https://nodejs.org)

Daarna, om Lapis als een echt venster te starten (hot reload op de frontend; de eerste
keer bouwt cargo de Rust-kant, dat duurt een paar minuten, daarna is het snel):

```bash
git clone git@github.com:josbez/lapis.git
cd lapis/app
npm install
npm run tauri dev
```

**Welke branch?** W9 en W10 staan op [PR #22](https://github.com/josbez/lapis/pull/22)
(`claude/verder-gaan-h13h0z`), nog niet gemerged naar de hoofdbranch. Om die versie te
bouwen:

```bash
git checkout claude/verder-gaan-h13h0z
git pull
```

Om een `.app` te bouwen die je los kunt starten in plaats van via `tauri dev`:

```bash
npm run tauri build
```

Het resultaat staat in `app/src-tauri/target/release/bundle/macos/Lapis.app`. Niet
gesigned — macOS blokkeert de eerste start, dus rechtsklik → Open in plaats van
dubbelklikken.

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
| [W0 – Test & Verification Plan](docs/waves/W0-spike/02-testplan.md) | Wat er bewezen moet worden vóór er code is | ✅ goedgekeurd |
| [W0 – Bewijsverslag](docs/waves/W0-spike/03-bewijs.md) | Wat er draaide, wat faalde, wat niet getest is | ✅ afgesloten als achterhaald |
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
