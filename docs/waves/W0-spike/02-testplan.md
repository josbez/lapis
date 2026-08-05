# Wave W0 Test & Verification Plan — Spike

| | |
|---|---|
| **Status** | Ter goedkeuring door Jos |
| **Gezag** | Dit document beheerst bewijs en acceptatie. Het mag de scope niet oprekken |
| **Bron** | [Goal W0](00-goal.md) · [Spec W0](01-spec.md) |

---

## 1. Titel

Verificatieplan voor W0: bewijzen dat de spike doet wat het Goal Document en de Wave
Specification beschrijven, zonder er iets aan toe te voegen.

## 2. Purpose

Dit plan bestaat om drie redenen:

1. Vastleggen wát er bewezen moet worden vóórdat er code is, zodat de implementatie niet
   zijn eigen meetlat kan kiezen.
2. Aantonen dat de spike jouw notities niet kan raken. Dat is in W0 de enige garantie die
   er is.
3. Vastleggen wat er níét getest wordt en waarom, zodat het oordeel aan het eind eerlijk
   is over wat het waard is.

**Afwijking van de gids, expliciet:** de gids schrijft voor dat de uitvoerende agent dit
plan opstelt. Bij Lapis schrijf ik alle drie de wave-documenten en implementeren agents
(afspraak G4/V9). Het testplan blijft daarmee vóór de implementatie geschreven, wat het
punt is; alleen de auteur verschuift.

## 3. Source Documents

- [Goal Document W0](00-goal.md) — beheerst uitkomst en scope
- [Wave Specification W0](01-spec.md) — beheerst implementatiedetails
- [PRD v1.1](../../03-prd.md) — bovenliggende productbesluiten
- [Wave-methode](../../07-wave-methode.md) — vertaling van de verificatie-eisen naar een
  desktop-app

## 4. Testability Assessment

**Oordeel: Testable with assumptions.**

| Vraag | Antwoord |
|---|---|
| Is het Goal Document testbaar? | Grotendeels. Vier van de vijf uitkomsten zijn observeerbaar; de vijfde is een subjectief oordeel en is als bewuste afwijking vastgelegd in Goal §7 |
| Is de Wave Specification testbaar? | Ja. De commands, de padcontrole en de round-trips zijn allemaal direct te toetsen |
| Zijn de succescondities waarneembaar? | Ja, met uitzondering van het oordeel |
| Zijn de betrokken oppervlakken duidelijk? | Ja: Rust-kern, CodeMirror-editor, handmatige UI-flow |
| Zijn de benodigde data en opzet duidelijk? | Ja. Zes fixtures in de repo, plus een kopie-map met echte notities voor het oordeel |
| Zijn er vage acceptatiecriteria? | Eén: "prettig om in te typen". Bewust subjectief |
| Zijn er tegenstrijdigheden tussen Goal en Spec? | **Ja, één — zie §4.1.** Die moet beantwoord worden vóór de implementatie |

### 4.1 Gevonden tegenstrijdigheid: CRLF-regeleindes

Dit plan mag ambiguïteit niet oplossen door productgedrag te verzinnen, dus meld ik het.

- [PRD §8](../../03-prd.md#8-randvoorwaarden) noemt als formaat: *"UTF-8, LF-regeleindes"*.
- [Spec §10](01-spec.md#10-invariants) zegt: *"De inhoud van een bestand wordt nooit
  stilzwijgend genormaliseerd. Geen regeleindes omzetten."*
- Spec §14.2 vereist een fixture `crlf.md` die byte-identiek terug moet komen.

Voor een bestaand bestand met CRLF spreken die elkaar tegen: het één zegt "LF", het
ander zegt "laat staan wat er staat".

**Voorgestelde smalste interpretatie** — conform de regel "kies bij twijfel de smalste
interpretatie":

> LF geldt voor bestanden die Lapis zélf aanmaakt. Voor bestanden die Lapis opent, geldt
> behoud: wat erin stond, staat er na opslaan nog steeds.

Dat is de veilige lezing, want hij kan nooit tot ongevraagde wijzigingen in jouw
bestanden leiden. **Bevestiging nodig van Jos vóór implementatie.**

### 4.2 Bekend risico bij dezelfde fixture

CodeMirror 6 normaliseert regeleindes standaard naar `\n` bij het uitlezen van het
document, tenzij de line separator expliciet wordt gezet. De verwachting is daarom dat
proof point PP-06 op `crlf.md` **faalt bij de eerste run.**

Dat is geen reden om de fixture te schrappen — het is precies waarvoor hij er staat. De
instructie aan de uitvoerende agent is: **meld het als bevinding, configureer er niet
stilzwijgend omheen.** Of Lapis CRLF behoudt is een productvraag (§4.1), geen
implementatiekeuze.

## 5. What Must Be Proven

| ID | Bron | Wat waar moet zijn | Hoe geverifieerd | Bewijs |
|---|---|---|---|---|
| **PP-01** | Goal §4, Spec §9.1 | De app start op macOS | Handmatig | Screenshot van het venster |
| **PP-02** | Goal §4, Spec §9.2 | Een map is te kiezen en de `.md`-bestanden erin zijn zichtbaar | Handmatig | Screenshot van de lijst |
| **PP-03** | Goal §4, Spec §9.3 | Een bestand opent in live preview; opmaak rendert, de bron blijft markdown | Handmatig | Screenshot van een opgemaakt document |
| **PP-04** | Goal §4, Spec §9.4 | `⌘S` schrijft de wijziging naar schijf | Handmatig + `diff` | Terminal-uitvoer vóór en na |
| **PP-05** | Goal §4, Spec §14.2 | Lezen en terugschrijven laat het bestand **byte-identiek** | Geautomatiseerd (Rust) | Testuitvoer, 6 fixtures |
| **PP-06** | Spec §14.4 | Inhoud door de editor heen komt **string-identiek** terug | Geautomatiseerd (frontend) | Testuitvoer, 6 fixtures |
| **PP-07** | Spec §5.3, §14.6 | Paden buiten de gekozen map worden geweigerd | Geautomatiseerd (Rust) | Testuitvoer, 3 gevallen |
| **PP-08** | Goal §11, Spec §14.8 | Geen hardgecodeerde paden, geen netwerk-aanroepen in de app-code | Zoekopdracht | Commando en uitvoer |
| **PP-09** | Spec §14.9 | Het bewijsdocument is compleet | Nalopen | `03-bewijs.md` |
| **PP-10** | Goal §4 | Jos heeft een echte notitie getypt en zijn oordeel gegeven | Oordeel | Geschreven oordeel in `03-bewijs.md` |

**PP-05 en PP-07 zijn onvoorwaardelijk.** Falen ze, dan is de wave niet af, ongeacht hoe
goed het typen aanvoelt. Alle andere proof points zijn met een opgeschreven verklaring
bespreekbaar.

**Over PP-05 versus PP-06.** CodeMirror werkt met strings, niet met bytes. PP-06 bewijst
daarom string-gelijkheid; byte-gelijkheid wordt door PP-05 bewezen op de laag waar bytes
bestaan. Samen dekken ze de hele weg van schijf naar scherm en terug — dat is de reden
dat er twee zijn.

## 6. Verification Surfaces

| Oppervlak | Van toepassing |
|---|---|
| Rust-kern: bestands-I/O en padcontrole | **Ja** — het zwaartepunt van dit plan |
| CodeMirror-editor: documentbehoud | **Ja** |
| Handmatige gebruikersflow | **Ja**, niveau C |
| IPC-laag als contract | Nee — wordt pas in W1 ontworpen (Spec §14.3) |
| HTTP-API | Nee — bestaat niet |
| Database / persistentie | Nee — geen index in W0 |
| Authenticatie / autorisatie | Nee — één gebruiker, geen accounts |
| Regressie | Nee — er is geen bestaand gedrag |
| Domain isolation in de vorm uit de gids | Nee — wegwerpcode; twee dataregels blijven wel gelden |
| Statische controles | **Ja** — typecheck, clippy, format |

## 7. Happy Flow Tests

### HF-01 · De volledige handmatige doorloop

- **Doel:** aantonen dat kiezen, openen, typen en opslaan werkt zoals beschreven, en Jos
  in staat stellen zijn oordeel te vormen.
- **Voorwaarden:** een map met kopieën van een handvol echte notities, inclusief de
  lastigste die Jos kan vinden. **Niet `~/Documents`.**
- **Stappen:**
  1. `npm run tauri dev` in `spike/`
  2. Klik "Kies map", kies de kopie-map
  3. Controleer dat de `.md`-bestanden verschijnen
  4. Open een bestand
  5. Controleer dat opmaak rendert en de bron markdown blijft
  6. Typ een echte notitie: een kop, een lijst, wat nadruk, een codeblok, een takenlijst
  7. `⌘S`
  8. Open hetzelfde bestand in Obsidian
- **Verwacht:** stap 8 toont precies wat er getypt is, zonder verrassingen in opmaak,
  witruimte of regeleindes.
- **Bewijs:** schermopname of screenshots per stap, plus een `diff` tussen de
  oorspronkelijke en de opgeslagen versie.
- **Automatiseringsniveau:** handmatig, niveau C. **Reden:** de UI is wegwerpcode en er
  is nog niets stabiels om tegen te automatiseren (Spec §14.5).

### HF-02 · De schone round-trip

- **Doel:** aantonen dat openen en direct opslaan zonder bewerken niets verandert.
- **Stappen:** open een fixture, druk `⌘S` zonder te typen, vergelijk met `diff`.
- **Verwacht:** geen verschil, voor alle zes fixtures.
- **Bewijs:** terminal-uitvoer.
- **Automatiseringsniveau:** handmatig als aanvulling op PP-05 en PP-06; die twee dekken
  dit geautomatiseerd, maar de handmatige variant loopt door de échte weg heen —
  bestandskiezer, IPC, editor, opslaan.

## 8. API Test Plan

**Niet van toepassing voor deze wave**, omdat er geen HTTP-API is en de IPC-laag in W0
nog geen contract is; die wordt in W1 ontworpen (Spec §14.3).

De vier IPC-commands worden indirect gedekt: `read_note` en `write_note` door PP-05 en
PP-07, `list_markdown` door BE-04 en PP-02, `resolve_root` door PP-07.

## 9. Backend Test Plan

Alles hieronder zijn Rust-tests in `spike/src-tauri`.

| ID | Type | Wat | Verwacht |
|---|---|---|---|
| **BE-01** | Integratie | Voor elk van de zes fixtures: `read_note` → `write_note` met dezelfde inhoud | Bestand byte-identiek (`assert_eq!` op `Vec<u8>`) |
| **BE-02** | Unit | `resolve_root` op een map met een symlink of `..` erin | Canoniek, absoluut pad |
| **BE-03** | Unit | `read_note` op een bestaand bestand | Inhoud gelijk aan wat er op schijf staat, geen normalisatie |
| **BE-04** | Integratie | `list_markdown` op een map met `.md`, `.txt`, een submap en een verborgen bestand | Alleen de `.md` in de map zelf, alfabetisch. Geen recursie |
| **BE-05** | Integratie | `write_note` naar een nog niet bestaand bestand binnen `root` | Bestand aangemaakt met exact de meegeleverde inhoud |

**De zes fixtures** (Spec §14.2), elk gekozen omdat het een bekende manier is om tekst
stilletjes te beschadigen:

| Fixture | Wat het bewaakt |
|---|---|
| `simpel.md` | Basisgeval |
| `crlf.md` | Regeleindes — zie §4.1 en §4.2 |
| `geen-eind-newline.md` | Er wordt geen newline toegevoegd |
| `emoji-en-accenten.md` | UTF-8 blijft intact |
| `frontmatter.md` | Het YAML-blok blijft byte-identiek (PRD F2) |
| `tabellen-en-code.md` | Witruimte binnen codeblokken blijft ongemoeid |

De fixtures staan in `spike/tests/fixtures/` en worden per test naar een tijdelijke map
gekopieerd. **Een test schrijft nooit in de fixture-map zelf**, anders is de tweede run
niet meer betrouwbaar.

## 10. Frontend Test Plan

Eén test, met Vitest.

| ID | Wat | Verwacht |
|---|---|---|
| **FE-01** | Voor elk van de zes fixtures: bouw een CodeMirror-state met de `atomic-editor`-extensies en de fixture-inhoud als document; lees `state.doc.toString()` uit | Exact gelijk aan de invoer |

Verder geen componenttests. **Reden:** er is geen UI die het waard is vast te leggen, en
die er na W10 toch anders uitziet. Een componenttest op wegwerpcode is onderhoud zonder
opbrengst.

**Verwachting bij FE-01 op `crlf.md`: faalt bij de eerste run.** Zie §4.2. Melden als
bevinding, niet omheen configureren.

## 11. Browser / Playwright Test Plan

**Niveau C — handmatig met bewijs**, conform
[07 §4.2](../../07-wave-methode.md#42-wat-browser-bewijs-hier-betekent) en Spec §14.5.

**Reden dat er niet geautomatiseerd wordt:** de code wordt weggegooid en er is nog geen
stabiele UI. Automatisering via `tauri-driver` opzetten kost in deze wave meer dan het
oplevert. Vanaf W1 verandert dat: daar komt niveau A.

Vast te leggen als schermopname of reeks screenshots, volgens HF-01:

1. App gestart
2. Map gekozen
3. Bestandslijst zichtbaar
4. Bestand geopend, opmaak zichtbaar
5. Getypte inhoud
6. Na `⌘S`
7. Hetzelfde bestand in Obsidian

## 12. Negative Test Plan

De belangrijkste sectie van dit plan na de round-trips. Deze tests bewijzen de enige
veiligheidsgarantie die W0 heeft.

| ID | Geval | Verwacht |
|---|---|---|
| **NE-01** | `read_note` met `../buiten-de-map.md` | Fout. Geen inhoud teruggegeven |
| **NE-02** | `write_note` met een pad buiten `root` | Fout. **Geen bestand aangemaakt** — de test controleert dat expliciet op schijf |
| **NE-03** | `write_note` met een absoluut pad (`/tmp/x.md`) | Fout. Geen bestand aangemaakt |
| **NE-04** | `read_note` op een niet-bestaand bestand | Nette fout, geen panic |
| **NE-05** | `list_markdown` op een lege map | Lege lijst, geen fout |
| **NE-06** | `list_markdown` op een niet-bestaande map | Nette fout, geen panic |
| **NE-07** | `read_note` via een symlink die buiten `root` wijst | Fout. Canonicalisatie moet dit vangen |

NE-07 staat er omdat een padcontrole die vóór het volgen van symlinks wordt uitgevoerd,
te omzeilen is. Als de implementatie canonicaliseert vóór de vergelijking, slaagt hij
vanzelf.

Elke negatieve test controleert **gecontroleerd falen**, niet alleen dát het faalt: een
`Result::Err` met een leesbare boodschap, geen panic en geen zijeffect op schijf.

## 13. Regression Test Plan

**Niet van toepassing voor deze wave**, omdat er geen bestaand gedrag en geen eerdere
waves zijn. W0 is de eerste code in dit project.

Wel relevant voor later: BE-01 en NE-01 t/m NE-03 zijn de kandidaten om als
regressiebasis mee te nemen naar W1, ook al wordt de spike-code zelf weggegooid. De
*fixtures* en de *testgevallen* overleven de wave; de implementatie niet.

## 14. Domain Isolation Test Plan

**Niet van toepassing in de vorm uit
[07 §4.3](../../07-wave-methode.md#43-onze-eigen-isolatiecheck)**, omdat de code niet in
het product terechtkomt. Twee regels gelden wel, omdat ze over jouw data gaan en niet
over codehygiëne:

```bash
# geen hardgecodeerd pad naar een vault of gebruikersnaam
rg -n "/Users/|~/Documents|Obsidian" spike/src spike/src-tauri/src

# geen netwerk-aanroepen in de app-code
rg -n "fetch\(|XMLHttpRequest|reqwest|ureq|hyper::" spike/src spike/src-tauri/src
```

Beide moeten leeg zijn. Uitkomst met commando en resultaat in `03-bewijs.md`.

## 15. Frontend / Backend Responsibility Checks

Goal §12 legt vast dat bestandsoperaties aan de Rust-kant gebeuren, niet in de webview.
Te controleren met:

```bash
# geen fs-plugin-aanroepen vanuit de frontend
rg -n "@tauri-apps/plugin-fs|readTextFile|writeTextFile" spike/src
```

Moet leeg zijn. De frontend mag uitsluitend de vier commands uit Spec §5.3 aanroepen, via
`src/ipc.ts`.

Verder gelden de zwaardere verantwoordelijkheidsregels uit de gids hier nog niet: er zijn
in W0 geen permissies, geen fasen en geen backend-gestuurde acties. Die komen vanaf W1.

## 16. Required Test Commands

**Deze commando's bestaan nog niet.** Er staat nog geen code in de repo; ze worden als
onderdeel van W0 opgezet en zijn de standaard-toolchain voor Tauri, Vite en Cargo. De
uitvoerende agent controleert bij aanvang wat er werkelijk is en past dit lijstje aan in
plaats van het te forceren.

| Categorie | Commando | Verplicht |
|---|---|---|
| Afhankelijkheden | `npm install` | Ja |
| App starten | `npm run tauri dev` | Ja, voor HF-01 |
| Backend-tests | `cargo test` (in `spike/src-tauri`) | **Ja** |
| Frontend-tests | `npm run test` | **Ja** |
| Typecheck | `npx tsc --noEmit` | Ja |
| Lint (Rust) | `cargo clippy -- -D warnings` | Nee, uitvoer wel vastleggen |
| Format (Rust) | `cargo fmt --check` | Nee |
| Isolatiecheck | de twee `rg`-commando's uit §14 | **Ja** |
| Verantwoordelijkheidscheck | het `rg`-commando uit §15 | **Ja** |
| Buildcheck | `npm run tauri build` | Nee — distributie is out of scope |

## 17. Required Acceptance Evidence

`03-bewijs.md` bevat, in deze volgorde:

1. Wat er is gebouwd, in enkele zinnen
2. Geïnstalleerde pakketten met exacte versies — met name de werkelijke naam en versie
   van `atomic-editor`
3. Per commando uit §16: het commando en de uitkomst (geslaagd/gefaald, met uitvoer)
4. Per proof point uit §5: bewezen ja/nee, met verwijzing naar het bewijs
5. Schermopname of screenshots van HF-01
6. De bevinding over CRLF (§4.1, §4.2): wat er gebeurde en wat het betekent
7. Wat er níét is getest, expliciet benoemd
8. Bevestiging dat de scope niet is opgerekt buiten het Goal Document
9. Bevestiging dat er niets buiten `spike/` en `docs/waves/W0-spike/` is gewijzigd
10. Bevestiging dat `~/Documents` niet is geopend
11. Wat tegenviel en meeviel tijdens het bouwen — bij een spike is dit de eigenlijke
    opbrengst
12. Het oordeel van Jos (PP-10)

Punt 7 is niet optioneel. Een spike met een verzwegen gat is erger dan een spike die niet
lukt.

## 18. Known Assumptions, Gaps, or Risks

| # | Punt | Status |
|---|---|---|
| 1 | **CRLF: tegenstrijdigheid tussen PRD §8 en Spec §10.** Zie §4.1 | **Beantwoorden vóór implementatie** |
| 2 | CodeMirror normaliseert waarschijnlijk regeleindes; FE-01 faalt vermoedelijk op `crlf.md` | Verwacht. Melden, niet omheen configureren |
| 3 | `atomic-editor` werkt mogelijk niet in WKWebView | Blokkade-stopconditie (Goal §15). Melden bij D4, niet zelf overstappen op route b |
| 4 | De exacte npm-pakketnaam van `atomic-editor` is niet bekend | Opzoeken bij installatie, vastleggen in het bewijs |
| 5 | Het oordeel (PP-10) is subjectief en niet te automatiseren | Bewuste afwijking, vastgelegd in Goal §7 |
| 6 | Er wordt niet getest of de UI bruikbaar is bij een grote map | Buiten scope; W0 kent geen recursie en geen 5.000 notities |
| 7 | Er wordt niets getest over prestaties | Buiten scope; er zijn nog geen prestatiegetallen (PRD §9) |
| 8 | De handmatige flow is niet reproduceerbaar door een derde | Aanvaard voor een spike. Vanaf W1 niveau A |

## 19. Acceptance Rule

De wave mag alleen geaccepteerd worden wanneer:

- **BE-01 slaagt op alle zes fixtures** — of de afwijking is de CRLF-bevinding uit §4.1
  en die is als beslissing aan Jos voorgelegd.
- **NE-01 t/m NE-03 slagen.** Onvoorwaardelijk. Zonder deze drie is er geen enkele
  garantie dat de spike buiten zijn map blijft.
- FE-01 slaagt, of faalt uitsluitend op `crlf.md` met een opgeschreven bevinding.
- De overige backend- en negatieve tests slagen, of hun falen is begrepen en opgeschreven.
- De handmatige happy flow HF-01 is doorlopen en vastgelegd.
- De isolatie- en verantwoordelijkheidschecks uit §14 en §15 zijn leeg.
- `03-bewijs.md` compleet is volgens §17.
- Jos zijn oordeel heeft gegeven.
- Er niets buiten `spike/` en `docs/waves/W0-spike/` is gewijzigd.
- De scope niet is opgerekt buiten het Goal Document.

Is aan deze voorwaarden niet voldaan, dan wordt de wave als onvolledig gemarkeerd — ook
als de app werkt en het typen prettig aanvoelt.

---

## Wat dit plan bewust níét doet

- Het schrijft geen functionaliteit voor die niet in het Goal Document of de Spec staat.
- Het lost de CRLF-tegenstrijdigheid niet zelf op, maar legt hem terug bij Jos met een
  voorgestelde smalste interpretatie.
- Het eist geen geautomatiseerde UI-tests op wegwerpcode.
- Het eist geen prestatiemetingen, want er zijn geen normen om aan te toetsen.
