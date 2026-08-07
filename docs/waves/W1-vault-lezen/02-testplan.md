# Wave W1 Test & Verification Plan — Vault openen en tonen

| | |
|---|---|
| **Status** | Ter goedkeuring door Jos |
| **Gezag** | Dit document beheerst bewijs en acceptatie. Het mag de scope niet oprekken |
| **Bron** | [Goal W1](00-goal.md) · [Spec W1](01-spec.md) |

---

## 1. Titel

Verificatieplan voor W1: bewijzen dat Lapis een vault kan kiezen, onthouden en tonen —
en, belangrijker, dat hij er niets in schrijft.

## 2. Purpose

1. Vastleggen wát er bewezen moet worden vóórdat er code is, zodat de implementatie niet
   zijn eigen meetlat kiest.
2. **Aantonen dat W1 de vault van Jos niet kan raken.** Dit is de voorwaarde waaronder
   deze wave tegen echte notities mag draaien; zonder dat bewijs vervalt die toestemming.
3. Vastleggen wat er níét getest wordt en waarom.

Dezelfde afwijking als in W0 geldt: de gids wil dat de uitvoerende agent dit plan
opstelt; bij Lapis schrijf ik de drie wave-documenten en implementeren agents (G4/V9).
Het plan staat daarmee nog steeds vóór de implementatie, en dat is het punt.

## 3. Source Documents

- [Goal Document W1](00-goal.md) — beheerst uitkomst en scope, inclusief de vier
  beantwoorde vragen in §0
- [Wave Specification W1](01-spec.md) — beheerst implementatiedetails
- [PRD v1.1 §F1](../../03-prd.md#f1--vault-openen-en-navigeren)
- [Wave-methode §4](../../07-wave-methode.md#4-vertaling-naar-lapis) — de bewijsniveaus
- [09 · Code-analyse](../../09-code-analyse-en-verbeterplan.md) — B1, B2, B8, B17, B21

## 4. Testability Assessment

**Oordeel: Testable with assumptions — na beantwoording van §4.1 en §4.2.**

| Vraag | Antwoord |
|---|---|
| Is het Goal Document testbaar? | Ja. Alle zes uitkomsten in §4 zijn waarneembaar; er zit geen subjectief oordeel in, anders dan in W0 |
| Is de Wave Specification testbaar? | Grotendeels. Twee punten hieronder |
| Zijn de succescondities waarneembaar? | Ja |
| Zijn de betrokken oppervlakken duidelijk? | Ja: kern, IPC-contract, frontend, config, handmatige flow |
| Zijn de benodigde data en opzet duidelijk? | Ja. Elke test bouwt zijn eigen mapstructuur; de vault van 5.000 notities wordt gegenereerd |
| Zijn er vage acceptatiecriteria? | Eén: "voelt niet traag". Zie §4.2 |
| Tegenstrijdigheden tussen Goal en Spec? | **Twee — §4.1 en §4.3.** Plus één gat, §4.4 |

### 4.1 Het prestatiebudget is niet betrouwbaar in CI

Goal §9 en Spec §14.4 leggen een budget van **500 ms** vast voor 5.000 notities, en
Spec §14.4 maakt daar een test van. Dat is als geschreven niet houdbaar:

- Een gedeelde GitHub-runner heeft een trage, gevirtualiseerde schijf. Dezelfde scan die
  op een M-serie Mac 80 ms kost, kan daar 400 of 900 ms kosten — en van run tot run
  verschillen.
- Een test die op tijd assert wordt daarmee wisselvallig. En een wisselvallige test wordt
  binnen twee weken uitgezet of met een ruimere marge stilgelegd. Dan bewaakt hij niets
  meer, en is de bewaking erger dan geen bewaking, want niemand weet dat.

**Voorgestelde smalste interpretatie:**

> De prestatietest **meet en rapporteert altijd**, en **faalt nooit op tijd in CI**. Het
> budget van 500 ms is een norm voor de handmatige meting op de Mac van Jos (HF-04), en
> die meting hoort in `03-bewijs.md`. In CI bewaakt de test wél de *correctheid* bij
> 5.000 notities: het juiste aantal knopen, geen stack overflow, geen geheugenexplosie.

Wat de test in CI dan nog wél hard bewaakt: een scan die van 300 ms naar 30 seconden
gaat, valt op in de uitvoer. Voor het verschil tussen 400 en 600 ms is een gedeelde
runner simpelweg geen meetinstrument.

**Bevestiging nodig van Jos vóór implementatie.**

### 4.2 "Niet traag voelen" is niet hetzelfde als 500 ms

[D6](../../05-open-vragen.md#d6--prestatiebudget) zegt "moet niet traag voelen"; Goal §9
vertaalt dat naar 500 ms voor de scan. Die vertaling dekt maar de helft: Goal §4 noemt
óók **scrollen** zonder haperen, en dat is een rendering-eigenschap van de boom, geen
scan-eigenschap.

Een boom van 5.000 knopen die in één keer in de DOM wordt gezet, scrollt merkbaar
slechter dan een gevirtualiseerde lijst — maar virtualisatie is niet in de Spec
opgenomen, en het toevoegen ervan zou scope zijn.

**Voorstel:** scrollgedrag wordt in W1 handmatig beoordeeld (HF-04), niet
geautomatiseerd. Blijkt het te haperen, dan is dat een bevinding met een getal, en de
oplossing is een besluit voor jou — niet iets wat de uitvoerende agent onderweg
inbouwt.

### 4.3 Niveau A is op macOS vermoedelijk niet haalbaar

Het [W0-testplan §11](../W0-spike/02-testplan.md#11-browser--playwright-test-plan) belooft:
*"Vanaf W1 verandert dat: daar komt niveau A."* Goal §7 van W1 zegt daarentegen
**niveau B**, en Spec §14.7 volgt dat.

De gezagsvolgorde is duidelijk — Goal W1 wint van een zin in het testplan van een vorige
wave — maar de belofte is wel aan jou gedaan, dus ik meld hem in plaats van hem stil te
laten verdwijnen.

De inhoudelijke reden dat niveau B hier het maximum is: **`tauri-driver` ondersteunt
macOS niet.** WKWebView heeft geen WebDriver-implementatie, waar WebKitGTK (Linux) en
WebView2 (Windows) die wel hebben. Een geautomatiseerde test *in het echte Lapis-venster
op een Mac* bestaat daarmee niet als optie.

*Instructie aan de uitvoerende agent: verifieer dit bij aanvang in plaats van het van mij
aan te nemen. Blijkt het inmiddels wél te kunnen, meld dat — dan is niveau A alsnog een
gesprek waard, en niet alleen voor deze wave.*

**Voorstel:** niveau B (componenttests zonder webview) plus niveau C (handmatig met
screenshots) voor W1, en de belofte van niveau A schrappen zodra dit bevestigd is.

### 4.4 Gevonden gat: de V1-test heeft in W1 niets om zich aan vast te maken

Goal §0 V1 en Spec §14.2 eisen een test die het huidige gedrag van een leeg of
`.`-relatief pad **vastlegt**. Dat is een goede eis, maar in W1 is er geen aanroep die
zo'n pad accepteert: `read_note` bestaat niet (Spec §5.3), en de scan bouwt zijn paden
zelf.

Dit plan mag dat gat niet dichten door functionaliteit te verzinnen. Daarom:

> **Voorstel.** Bestaat er in de W1-kern een interne padfunctie die een relatief pad
> omzet (zoals `resolve_in_root` in de spike), dan wordt V1 dáár vastgelegd, als
> `#[test]` op die functie. Bestaat die functie niet — omdat de scan hem niet nodig heeft
> — dan verhuist de V1-test naar het testplan van **W2**, waar `read_note` terugkomt, en
> wordt dat als openstaand punt in `03-bewijs.md` genoteerd.

Wat er in geen geval gebeurt: een functie toevoegen alleen om er een test op te kunnen
hangen.

## 5. What Must Be Proven

Proof points zijn wave-lokaal genummerd, net als in W0.

| ID | Bron | Wat waar moet zijn | Hoe geverifieerd | Bewijs |
|---|---|---|---|---|
| **PP-01** | Goal §4 | De app start op macOS en toont de lege staat zonder vault | Handmatig | Screenshot |
| **PP-02** | Goal §4, Spec §9.2 | Een map kiezen toont de volledige boom | Handmatig + BE-01 | Screenshot + testuitvoer |
| **PP-03** | Goal §4, Spec §5.4 | Verborgen mappen en bestanden staan niet in de boom en worden niet betreden | Geautomatiseerd | BE-02, BE-03 |
| **PP-04** | Goal §4, Spec §5.5 | De vaultkeuze en de sidebar-stand overleven een herstart | Handmatig + CF-01 | Screenshot + testuitvoer |
| **PP-05** | Goal §4, Spec §14.5 | **Er wordt niets in de vault geschreven** | Geautomatiseerd | SV-01 |
| **PP-06** | Goal §0 V2, Spec §5.4 | Niets buiten de vault komt in de boom, ook niet via een symlink | Geautomatiseerd | NE-04, NE-05 |
| **PP-07** | Goal §0 V3 | `notitie.MD` telt als markdown | Geautomatiseerd | BE-04 |
| **PP-08** | Goal §9, Spec §5.2 | Het foutmodel bewaart `io::ErrorKind` als onderscheidbare varianten | Geautomatiseerd | BE-09 |
| **PP-09** | Goal §9, Spec §5.7 | Strikte CSP staat aan en de app werkt ermee in een `build`, niet alleen in `dev` | Handmatig | Screenshot + config |
| **PP-10** | Goal §11, Spec §14.6 | De isolatiechecks slagen, inclusief de nieuwe schrijfregel en hun zelftest | Script in CI | Uitvoer van `isolatie-check.sh` |
| **PP-11** | Goal §9, Spec §14.4 | De scan verwerkt 5.000 notities correct, met een gemeten tijd | Geautomatiseerd + handmatig | PF-01 + HF-04 |
| **PP-12** | Spec §14.9 | Het bewijsdocument is compleet | Nalopen | `03-bewijs.md` |

**PP-05 en PP-06 zijn onvoorwaardelijk.** Falen ze, dan is de wave niet af — ongeacht hoe
goed de boom eruitziet. PP-05 is bovendien de voorwaarde waaronder deze wave überhaupt
tegen de echte vault mag draaien.

## 6. Verification Surfaces

| Oppervlak | Van toepassing |
|---|---|
| Rust-kern: scan, filter, padcontrole | **Ja** — het zwaartepunt |
| Foutmodel | **Ja** — nieuw in W1 |
| Config: lezen, schrijven, herstellen | **Ja** — nieuw in W1 |
| IPC-laag als contract | **Ja** — voor het eerst. In W0 was dit expliciet uitgesteld |
| Frontend: boom, in- en uitklappen, statusregel | **Ja**, niveau B |
| Handmatige gebruikersflow | **Ja**, niveau C |
| Geautomatiseerd in het echte venster (niveau A) | **Nee** — zie §4.3 |
| Prestaties | **Ja**, met de beperking uit §4.1 |
| Database / index | Nee — SQLite is W6 |
| Authenticatie | Nee — één gebruiker, geen accounts |
| Regressie op W0 | Ja, in beperkte zin — §13 |
| Domain isolation | **Ja** — geldt vanaf deze wave |

## 7. Happy Flow Tests

### HF-01 · Eerste start en vault kiezen

- **Stappen:** app starten zonder config → lege staat → map kiezen → boom verschijnt.
- **Verwacht:** de boom toont mappen en `.md`-bestanden; `.obsidian`, `.git` en `.trash`
  ontbreken volledig.
- **Bewijs:** screenshots van de lege staat en van de gevulde boom.
- **Niveau:** C.

### HF-02 · Herstart

- **Stappen:** sidebar verbergen → app afsluiten → opnieuw starten.
- **Verwacht:** dezelfde vault, sidebar nog steeds verborgen. Geen mapkiezer.
- **Bewijs:** screenshots vóór afsluiten en na herstarten, plus de inhoud van
  `config.json`.
- **Niveau:** C.

### HF-03 · Verdwenen vault

- **Stappen:** Lapis afsluiten → de vault-map buiten Lapis hernoemen → Lapis starten.
- **Verwacht:** lege staat met de mapkiezer en één regel uitleg. **De config is
  ongewijzigd** — dat laatste expliciet controleren door het bestand te tonen.
- **Bewijs:** screenshot + `cat` van de config vóór en na.
- **Niveau:** C.

### HF-04 · De echte vault van Jos

- **Voorwaarden:** een `tauri build`, geen `dev` (Spec risico 6). Alleen lezen.
- **Stappen:** de eigen vault openen, mappen uitklappen, door de volledige boom scrollen.
- **Verwacht:** opent zonder merkbare vertraging, scrollt zonder haperen (§4.2).
- **Te noteren:** het aantal notities, de gemeten openingstijd, en het oordeel over het
  scrollen in één zin.
- **Bewijs:** schermopname van het scrollen.
- **Niveau:** C. **Dit is de meting waar het budget van 500 ms voor geldt**, niet de
  CI-meting.

## 8. IPC Contract Test Plan

In W0 was de IPC-laag expliciet nog geen contract. Vanaf W1 wel, dus hij wordt getest.

| ID | Wat | Verwacht |
|---|---|---|
| **IPC-01** | Elk van de vijf commands zonder gekozen vault | `NoVaultSelected`, geen panic |
| **IPC-02** | `open_vault` op een map | `VaultInfo` met het canonieke pad |
| **IPC-03** | Een fout over de grens | Object met `code` en `bericht`, geen kale string |
| **IPC-04** | Geen enkel command accepteert een `root`-parameter | Statisch, via de isolatiecheck (IS-02) |
| **IPC-05** | De TypeScript-typen in `ipc.ts` komen overeen met wat Rust serialiseert | Typecheck + één test die een echte respons door het type haalt |

IPC-05 staat er omdat een contract dat aan twee kanten los wordt opgeschreven, aan twee
kanten uit elkaar loopt. Als de commands niet zonder Tauri aanroepbaar zijn, mag IPC-01
t/m IPC-03 op het `Session`-niveau eronder worden bewezen — **met vermelding in het
bewijs dat het één laag lager is dan het contract.**

## 9. Backend Test Plan

Rust-tests in `app/vault-core`. Elke test bouwt zijn eigen mapstructuur; er zijn geen
gedeelde fixtures die tussen tests kunnen lekken.

### 9.1 De scan

| ID | Wat | Verwacht |
|---|---|---|
| **BE-01** | Geneste mappen met markdown | Volledige boom, correct genest, root als wortel |
| **BE-02** | `.obsidian/` met markdown erin | Niet in de boom, en **niet betreden** — te bewijzen door er een map in te zetten die anders zou opvallen |
| **BE-03** | `.verborgen.md` | Niet in de boom |
| **BE-04** | `notitie.MD`, `notitie.Md` | Wél in de boom (V3, PP-07) |
| **BE-05** | `plaatje.png`, `aantekening.txt`, `README` | Niet in de boom |
| **BE-06** | Map zonder markdown | Wél in de boom (K3) |
| **BE-07** | `Zebra/`, `alfa/`, `Beta.md`, `appel.md` | Mappen eerst: `Zebra`, `alfa`; dan `appel.md`, `Beta.md` (K2) |
| **BE-08** | Lege vault | Lege boom, geen fout |

### 9.2 Het foutmodel

| ID | Wat | Verwacht |
|---|---|---|
| **BE-09** | Een `io::Error` met kind `PermissionDenied` door de conversie | `VaultError::PermissionDenied`, niet `Io` |
| **BE-10** | Een kind waar geen variant voor is | `Io { kind, message }` met `kind` bewaard |
| **BE-11** | `open_vault` op een bestand | `NotADirectory` |
| **BE-12** | `open_vault` op een niet-bestaand pad | `NotFound` |

BE-09 en BE-10 samen zijn de hele borging van bevinding B2. Zonder deze twee is de enum
decoratie die in W3 alsnog omzeild wordt.

### 9.3 De randgevallen die je pas ontdekt als het misgaat

| ID | Wat | Verwacht |
|---|---|---|
| **BE-13** | Symlink naar een map *binnen* de vault, cyclisch (`ln -s . sub`) | **De scan eindigt.** Met een testtimeout, zodat een oneindige lus faalt in plaats van hangt |
| **BE-14** | Map zonder leesrechten (`chmod 000`) | Leeg in de boom, scan gaat door, geen fout naar boven |
| **BE-15** | Bestandsnaam die geen geldige UTF-8 is | Overgeslagen, scan gaat door — de boom is geen plek om hierover te struikelen |
| **BE-16** | Een `.md`-map (een map die `notities.md` heet) | Als map behandeld, niet als notitie |

**BE-14 heeft een valkuil die hem stilletjes waardeloos maakt:** als de testrunner als
`root` draait, negeert het bestandssysteem `chmod 000` en slaagt de test om de verkeerde
reden. De test **detecteert dat en slaat zichzelf zichtbaar over** met een reden in de
uitvoer — nooit stil slagen. *(In de CI-runner van dit project draait de suite als
niet-root; in menige container niet.)*

BE-13 en BE-15 zijn `#[cfg(unix)]`.

### 9.4 De configuratie

| ID | Wat | Verwacht |
|---|---|---|
| **CF-01** | Keuze bewaren en terugleze | Zelfde vault terug |
| **CF-02** | Configmap bestaat niet | Wordt aangemaakt |
| **CF-03** | `$XDG_CONFIG_HOME` gezet | Config landt daar, niet in `~/.config` |
| **CF-04** | Config bevat onzin (`{{{`) | Lege staat, geen crash, geen exception |
| **CF-05** | Config bevat geldige JSON met een onbekend veld | Genegeerd, de rest werkt |
| **CF-06** | Onthouden vault bestaat niet meer | `None`, **en de config blijft ongewijzigd** — expliciet controleren |
| **CF-07** | Nieuwe keuze | Overschrijft de vorige |

**Elke configtest zet `$XDG_CONFIG_HOME` naar een tijdelijke map.** Een test die in de
echte configmap van de gebruiker schrijft, is een test die één keer per machine goed gaat.
Dit wordt gecontroleerd door SV-02.

### 9.5 De schrijfvrij-test

| ID | Wat | Verwacht |
|---|---|---|
| **SV-01** | Opname van de vault (pad, grootte, `mtime`, recursief) vóór en na `open_vault` + `read_tree` + `rescan` + `set_sidebar_visible` | **Identiek.** Niets bijgekomen, verdwenen, gegroeid of aangeraakt |
| **SV-02** | Dezelfde opname van de map waarin de testconfig staat | Alleen `config.json` is veranderd, en die staat buiten de vault |

De opname gebruikt **`mtime`, niet `atime`**: `atime` verandert op sommige systemen bij
lezen, en dan faalt SV-01 om de verkeerde reden. Een test die om de verkeerde reden faalt,
staat binnen een week uit.

SV-01 is proof point PP-05 en is onvoorwaardelijk.

### 9.6 Prestaties

| ID | Wat | Verwacht |
|---|---|---|
| **PF-01** | Genereer 5.000 notities over ~50 mappen, twee niveaus diep; scan | Correct aantal knopen; tijd gerapporteerd in de uitvoer; **geen assertie op tijd in CI** (§4.1) |
| **PF-02** | Serialiseer de boom naar JSON | Omvang gerapporteerd — dit is Spec-risico 4 |

De harde beoordeling van 500 ms gebeurt in HF-04, op de Mac.

## 10. Frontend Test Plan

Niveau B, met Vitest. **Dit vraagt een DOM-omgeving (`jsdom`) en een
componenttest-bibliotheek, die er in `spike/` nog niet waren.** Dat is nieuwe
gereedschap, geen nieuwe functionaliteit — maar het is wel een keuze die hier zichtbaar
gemaakt wordt in plaats van in een `package.json`-diff.

| ID | Wat | Verwacht |
|---|---|---|
| **FE-01** | Boom met geneste mappen rendert | Alle mappen en notities aanwezig |
| **FE-02** | Map in- en uitklappen | Kinderen verschijnen en verdwijnen |
| **FE-03** | Sidebar verbergen | Boom uit beeld; `set_sidebar_visible` aangeroepen met `false` |
| **FE-04** | Fout uit de kern | Verschijnt in de statusregel, met het `bericht`-veld |
| **FE-05** | Twee vaults snel na elkaar openen, antwoorden in omgekeerde volgorde | De laatst gekozen wint (bevinding B8) |
| **FE-06** | Lege staat zonder vault | Mapkiezer en de uitlegregel zichtbaar |

FE-05 is het patroon dat in W0 met bevinding B8 is betaald. Het mag de `requestGate` uit
de spike hergebruiken; dat is de enige regel die overgenomen mag worden.

**De frontend filtert niet** (Spec §10). Daarom is er géén test die controleert dat de
frontend verborgen mappen weglaat — die test zou juist het gedrag vastleggen dat we niet
willen. FE-01 gebruikt een boom zoals de kern hem levert.

## 11. Browser / Playwright Test Plan

**Niveau B + C, geen niveau A.** Zie §4.3 voor de reden en voor de belofte uit W0 die
hiermee wordt ingetrokken.

Handmatig vast te leggen, volgens §7:

1. Lege staat bij eerste start
2. Boom na het kiezen van een map
3. Uitgeklapte submap
4. Verborgen sidebar
5. Na herstart: zelfde vault, zelfde stand
6. Lege staat na een hernoemde vault
7. Schermopname van het scrollen door de echte vault (HF-04)

## 12. Negative Test Plan

| ID | Geval | Verwacht |
|---|---|---|
| **NE-01** | Elk command zonder gekozen vault | `NoVaultSelected`, geen panic |
| **NE-02** | `open_vault` op een pad zonder leesrechten | Nette fout, geen sessie gezet |
| **NE-03** | `open_vault` faalt → daarna `read_tree` | `NoVaultSelected` — een mislukte keuze laat **geen halve sessie** achter |
| **NE-04** | Symlink naar een bestand buiten de vault | Niet in de boom (PP-06) |
| **NE-05** | Symlink naar een map buiten de vault | Niet in de boom, niet betreden (PP-06) |
| **NE-06** | Symlink die naar zichzelf wijst | Overgeslagen, geen fout |
| **NE-07** | Vault die tijdens de scan verdwijnt | Nette fout of gedeeltelijke boom, geen panic |

NE-03 is de W1-versie van een fout die in W0 als B10 werd gevonden: toestand die half
wordt gezet bij gedeeltelijk falen.

Elke negatieve test controleert **gecontroleerd falen**: een `Err` met een leesbare
boodschap, geen panic, en geen zijeffect op schijf.

## 13. Regression Test Plan

W1 is nieuwe code naast de spike, dus er is weinig te breken — met twee uitzonderingen die
wél echt regressie zijn:

| ID | Wat | Verwacht |
|---|---|---|
| **RG-01** | De volledige testsuite van `spike/` | Onveranderd groen. **Er wordt niets in `spike/` gewijzigd** |
| **RG-02** | De zelftest van `isolatie-check.sh` | Groen, ook met de nieuwe checks erbij |

Wat er uit W0 meeverhuist als *testgeval* en niet als code: de padcontrole-gevallen
(NE-04, NE-05 hier) en de gewoonte dat fixtures zichzelf bewaken.

## 14. Domain Isolation Test Plan

Vanaf deze wave geldt [07 §4.3](../../07-wave-methode.md#43-onze-eigen-isolatiecheck) in
volle omvang, als script en niet als grep-die-de-agent-zelf-doet (bevinding B16).

| ID | Check | Waarom |
|---|---|---|
| **IS-01** | De acht bestaande checks gelden ook voor `app/` | Ze golden alleen voor `spike/` |
| **IS-02** | Geen root-pad over de IPC-grens | Bevinding B1, nu een eis |
| **IS-03** | Geen schrijfaanroep in de kern, behalve in `config.rs` | Nieuw voor W1 — verdwijnt weer in W3, zichtbaar |
| **IS-04** | Elke nieuwe check vangt zijn eigen proef-overtreding | `--zelftest`; een check die dat niet doet, bewaakt niets |

IS-03 is de mechanische kant van PP-05. SV-01 bewijst dat er niet geschreven wórdt; IS-03
bewijst dat er geen code staat die het zou kúnnen.

## 15. Frontend / Backend Responsibility Checks

Goal §12 legt de grens vast. Te controleren:

- De frontend roept uitsluitend de vijf commands uit Spec §5.3 aan, via `ipc.ts`.
- Geen `@tauri-apps/plugin-fs` in `app/src` (IS-01).
- **Geen filterlogica in de frontend.** Concreet: geen `startsWith('.')`, geen
  `endsWith('.md')` en geen sortering op naam in `app/src`. Dat zijn beslissingen van de
  kern, en ze zijn met een zoekopdracht te controleren.

Die laatste regel wordt als vierde nieuwe check aan het isolatiescript toegevoegd, mits
hij hard te maken is zonder ruis. **Lukt dat niet, dan komt hij er niet in** — Spec §14.6
en de instructie bij taak T6 zijn daar duidelijk over: liever drie checks die hard zijn
dan tien die piepen.

## 16. Required Test Commands

| Categorie | Commando | Verplicht |
|---|---|---|
| Afhankelijkheden | `npm ci` in `app/` | Ja |
| Backend-tests | `cargo test --workspace` in `app/` | **Ja** |
| Frontend-tests | `npm test` in `app/` | **Ja** |
| Typecheck | `npm run typecheck` | **Ja** |
| Lint (TS) | `npm run lint` | **Ja** |
| Lint (Rust) | `cargo clippy --workspace --all-targets -- -D warnings` | **Ja** |
| Format (Rust) | `cargo fmt --all -- --check` | **Ja** |
| Bouwen | `npm run build` | Ja |
| Tauri-schil | `cargo check` van `src-tauri` in CI | **Ja** — dit ving B21 niet, en had het gekund |
| Isolatiecheck | `scripts/isolatie-check.sh --zelftest && scripts/isolatie-check.sh` | **Ja** |
| Spike-regressie | dezelfde reeks in `spike/` | **Ja** (RG-01) |
| App starten | `npm run tauri dev` | Ja, voor HF-01 t/m HF-03 |
| App bouwen | `npm run tauri build` | **Ja**, voor HF-04 en PP-09 |

Alles behalve de handmatige stappen draait in CI. De workflow uit sprint 2 wordt daarvoor
uitgebreid; hij mag niet vervangen worden, want dan verdwijnt de spike-regressie.

## 17. Required Acceptance Evidence

`03-bewijs.md` bevat, in deze volgorde:

1. Wat er is gebouwd
2. Per commando uit §16: commando en uitkomst
3. Per proof point uit §5: bewezen ja/nee, met verwijzing
4. **De letterlijke uitvoer van SV-01** — dit is de toestemming om tegen de echte vault
   te draaien, en die hoort zichtbaar te zijn
5. De gemeten scantijd en JSON-omvang bij 5.000 notities (PF-01, PF-02), én de gemeten
   tijd op de Mac (HF-04)
6. Screenshots van HF-01 t/m HF-04
7. De uitkomst van §4.4: is de V1-test in W1 geland, of verhuisd naar W2?
8. De CSP-versoepeling voor `style-src` met de reden (Spec §5.7)
9. Wat er níét is getest, expliciet benoemd
10. Bevestiging dat er niets in `spike/` en niets aan 01 t/m 09 is gewijzigd
11. Bevestiging dat de scope niet is opgerekt, en welke afwijkingen zijn gemeld
12. Wat tegenviel en meeviel

## 18. Known Assumptions, Gaps, or Risks

| # | Punt | Status |
|---|---|---|
| 1 | **Prestatiebudget niet meetbaar in CI** (§4.1) | **Beantwoorden vóór implementatie** |
| 2 | **Niveau A vermoedelijk onmogelijk op macOS** (§4.3) | Verifiëren bij aanvang; belofte uit W0 intrekken |
| 3 | **De V1-test heeft mogelijk geen aangrijpingspunt** (§4.4) | Melden in het bewijs; niet oplossen met extra code |
| 4 | Scrollprestaties zijn niet geautomatiseerd te toetsen (§4.2) | Handmatig oordeel in HF-04 |
| 5 | `jsdom` en een componenttest-bibliotheek komen erbij | Nieuw gereedschap, geen nieuwe functionaliteit. Vastleggen in het bewijs |
| 6 | macOS-rechten op een onthouden pad (Goal §15) | Stopconditie. Eerst meten, geen bookmarks vooraf bouwen |
| 7 | BE-14 slaagt vals als de suite als root draait | Test slaat zichzelf zichtbaar over, nooit stil |
| 8 | De echte vault van Jos wordt in HF-04 geopend | Toegestaan omdat PP-05 bewezen is. **Niet uitvoeren vóórdat SV-01 groen is** |
| 9 | Er wordt niets getest over notities lezen | Buiten scope. Dat is W2 |

Punt 8 is een volgorde-eis, geen formaliteit: de handmatige doorloop op de echte vault
komt ná de schrijfvrij-test, niet ervoor.

## 19. Acceptance Rule

De wave mag alleen geaccepteerd worden wanneer:

- **SV-01 slaagt.** Onvoorwaardelijk. Zonder deze test is er geen enkele garantie dat W1
  van je notities afblijft.
- **NE-04 en NE-05 slagen.** Onvoorwaardelijk. Dit is de "niets buiten de vault"-garantie.
- Alle overige tests uit §8 t/m §14 slagen, of hun falen is begrepen en opgeschreven.
- RG-01 groen: de spike is onaangeroerd en draait nog.
- De isolatiecheck slaagt, inclusief zelftest van de nieuwe checks.
- `cargo check` van de Tauri-schil slaagt in CI, en `src-tauri/icons/` bestaat (B21).
- De strikte CSP staat aan en de app werkt ermee in een `build` (PP-09).
- HF-01 t/m HF-04 zijn doorlopen en vastgelegd.
- `03-bewijs.md` compleet is volgens §17.
- Er niets in `spike/` en niets aan de documenten 01 t/m 09 is gewijzigd.

Is aan deze voorwaarden niet voldaan, dan is de wave onvolledig — ook als de boom er goed
uitziet.

---

## Wat dit plan bewust níét doet

- Het lost §4.1 en §4.4 niet zelf op, maar legt ze terug met een voorgestelde smalste
  interpretatie.
- Het eist geen geautomatiseerde tests in het echte venster, omdat dat op macOS
  vermoedelijk niet bestaat — en het zegt erbij dat dat geverifieerd moet worden.
- Het assert niet op tijd in CI, omdat een wisselvallige test erger is dan geen test.
- Het test niets over het lezen of tonen van notitie-inhoud. Dat is W2, ook al kon de
  spike het al.
