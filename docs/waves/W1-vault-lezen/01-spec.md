# Wave W1 Specification — Vault openen en tonen

| | |
|---|---|
| **Status** | ✅ Goedgekeurd (afgeleid van de goedkeuring van het Goal Document) |
| **Gezag** | Dit document beheerst implementatiedetails. Het [Goal Document](00-goal.md) beheerst uitkomst en scope |
| **Bron** | [Goal W1](00-goal.md) · [PRD v1.1 §F1](../../03-prd.md#f1--vault-openen-en-navigeren) · [Wave-methode](../../07-wave-methode.md) · [Code-analyse](../../09-code-analyse-en-verbeterplan.md) |

---

## 1. Titel

Een blijvend Tauri v2-project dat een vault-map kiest, recursief scant, als boom toont en
de keuze en sidebar-status onthoudt bij herstart — zonder ooit naar de vault te schrijven.

## 2. Goal Document Alignment

Deze specificatie implementeert het goedgekeurde Goal Document, inclusief de antwoorden op
V1–V4 in Goal §0. Het Goal Document beheerst uitkomst, scope, grenzen en de betekenis van
"compleet". Deze specificatie levert het implementatiecontract en mag niet buiten het Goal
Document treden.

**Eén punt waar deze spec het Goal Document invult zonder dat §0 het voorschrijft, en dat
expliciet goedkeuring vraagt:** Goal §11 verbiedt elke schrijfaanroep in de kern
(`vault-core`), en de bestaande isolatiecheck verbiedt al elke bestandsoperatie in de
Tauri-schil (`07 §4.3`, ongewijzigd). Persistentie van het vault-pad en de
sidebar-zichtbaarheid (V4, Outcome-punt 4) moet dus ergens anders wonen dan in beide. Deze
spec introduceert daarvoor een derde, kleine crate — `app-state` — naast `vault-core`, met
dezelfde eigenschap: geen Tauri-afhankelijkheid, apart testbaar. `vault-core` blijft zo
100% lees-only, wat de nieuwe isolatieregel in Goal §11 letterlijk waar maakt. Wijst Jos dit
af, dan vervalt de scheiding en wordt een alternatief voorgesteld (bijvoorbeeld: de
schrijfvrij-regel geldt dan voor beide kern-crates samen). Zie [§13.1](#13-risicos-en-open-vragen).

## 3. Objective

W0 bewees dat typen in deze stack prettig aanvoelt op een platte lijst van bestanden. W1
bouwt de fundering waar elke volgende wave op leunt: een echte vault openen, recursief
scannen, tonen als boom, en die keuze laten overleven een herstart — allemaal zonder een
byte naar de vault te schrijven, zodat dit tegen Jos' echte 402-notities-vault mag draaien.

## 4. Wave Type

Funderende wave · blijvende code · eerste productie-project in de repo.

## 5. In Scope

### 5.1 Projectopzet

Een nieuwe map `app/` in deze repo, los van `spike/`:

```
app/
├─ package.json
├─ index.html
├─ vite.config.ts
├─ src/
│  ├─ main.tsx              # React entry
│  ├─ App.tsx                # lege staat / boom + sidebar-toggle
│  ├─ Tree.tsx                # de boomcomponent (§5.4)
│  ├─ EmptyState.tsx          # mapkiezer + uitleg (V4)
│  └─ ipc.ts                  # getypte wrappers om de Tauri-commands
├─ src-tauri/
│  ├─ Cargo.toml
│  ├─ tauri.conf.json          # strikte CSP, geen `null` (bevinding B17)
│  ├─ build.rs
│  ├─ capabilities/
│  └─ src/
│     └─ main.rs               # dunne schil, roept vault-core en app-state aan
├─ vault-core/
│  ├─ Cargo.toml
│  └─ src/lib.rs                # scan, boom, padcontrole — schrijfvrij (Goal §11)
├─ app-state/
│  ├─ Cargo.toml
│  └─ src/lib.rs                # vault-pad + sidebar-status buiten de vault (§2)
└─ tests/
   └─ fixtures/                 # boomstructuur t.b.v. §14
```

`app/Cargo.toml` is een eigen workspace (`members = ["vault-core", "app-state",
"src-tauri"]`), naar het patroon van `spike/Cargo.toml` (bevinding B18) — een apart
workspace per project, niet één workspace voor de hele repo, zodat `spike/` en `app/`
elkaars afhankelijkheden niet kunnen laten conflicteren.

### 5.2 Afhankelijkheden

| Laag | Wat | Versie |
|---|---|---|
| Shell | Tauri v2 | huidige 2.x, gelijk aan `spike/` |
| Mapkiezer | `tauri-plugin-dialog` | gelijk aan `spike/` |
| Frontend | React + Vite + TypeScript | gelijk aan `spike/` |
| Kern | alleen `std` | — dit is bewust: geen `walkdir`/`ignore`-crate, de recursieve scan is eenvoudig genoeg om zelf te schrijven en zelf te kunnen uitleggen (zie §8) |

Geen editor-afhankelijkheden (CodeMirror, `atomic-editor`) — die horen bij W2.

### 5.3 De kern: `vault-core`

**Waar de tests van deze crate staan, en waarom niet inline:** de isolatiecheck uit §14.7
scant `app/vault-core/src` als platte tekst op schrijfaanroepen (Goal §11) en kan een
`#[cfg(test)] mod tests` daarbinnen niet onderscheiden van productiecode — een testfixture
die `fs::write` gebruikt zou de eigen crate dan valselijk laten falen. De tests staan
daarom in `app/vault-core/tests/vault_core.rs`, als Rust-integratietest tegen de publieke
API, buiten `src/` en dus buiten het bereik van die check.

```rust
pub enum NodeKind { Dir, File }

pub struct TreeNode {
    pub name: String,
    pub rel_path: String,   // relatief aan root, '/'-gescheiden
    pub kind: NodeKind,
    pub children: Vec<TreeNode>,  // leeg voor File
}

pub enum VaultError {
    OutsideRoot,
    InvalidPath,        // V1 — pad wijst naar de root zelf, of is leeg
    NoVaultSelected,
    NotFound,
    NotADirectory,
    PermissionDenied,   // Goal §9 — io::ErrorKind blijft onderscheidbaar
    AlreadyExists,
    InvalidUtf8,
    Io(String),
}

pub fn resolve_root(picked: &Path) -> Result<PathBuf, VaultError>;
pub fn resolve_in_root(root: &Path, rel: &str) -> Result<PathBuf, VaultError>;
pub fn scan_tree(root: &Path) -> Result<TreeNode, VaultError>;

pub struct Session { /* ongewijzigd patroon uit W0, root: Mutex<Option<PathBuf>> */ }
impl Session {
    pub fn open(&self, picked: &Path) -> Result<TreeView, VaultError>;
    pub fn rescan(&self) -> Result<TreeView, VaultError>;   // handmatig verversen
    pub fn restore(&self, remembered: &Path) -> Result<TreeView, VaultError>;
}

pub struct TreeView { pub root_display: String, pub tree: TreeNode }
```

**`resolve_in_root` en V1.** Een `rel` die leeg is, `"."` is, of na resolutie gelijk is aan
`root` zelf, geeft `VaultError::InvalidPath` — nooit een geslaagde resolutie naar de
root-map. Dit is de eis uit Goal §0/V1, hier vastgelegd als contract voor W2/W3, ook al
roept W1 zelf `resolve_in_root` nergens aan buiten zijn eigen tests (er is nog geen
`open_note`-command).

**`scan_tree` — het scanalgoritme, per map:**

1. Lees de map met `fs::read_dir`.
2. Sla entries over waarvan de bestandsnaam met `.` begint (verborgen — Outcome-punt 3).
3. Voor elke resterende entry: bepaal met `fs::symlink_metadata` of het een symlink is.
   - **Geen symlink, map:** recursief scannen.
   - **Geen symlink, bestand:** hoofdletter-ongevoelig filteren op `.md` (V3), opnemen als
     `File` als het matcht.
   - **Symlink:** canonicaliseer het doel. Lukt dat niet, of valt het doel buiten `root`,
     dan wordt de entry overgeslagen (V2 — "niet tonen"). Valt het doel wél binnen `root`
     én is het een bestand, dan telt het mee als `File` (onder dezelfde `.md`-filter).
     **Een symlink naar een map wordt nooit gevolgd, ook niet binnen de vault.** Dit is een
     eigen toevoeging, niet uit V1–V4: een cyclische symlink (map A bevat een symlink naar
     zijn eigen ouder) zou de recursie anders laten vastlopen. Zie [§13.2](#13-risicos-en-open-vragen).
4. Sorteer de resultaten van elke map: eerst submappen, dan bestanden, allebei
   hoofdletter-ongevoelig alfabetisch. Dit is een presentatiekeuze zonder eis in Goal of
   PRD; W10 mag hem herzien.
5. Een map zonder leesrechten (`PermissionDenied`) laat die ene submap leeg met een
   foutindicatie op dat knooppunt in plaats van de hele scan te laten falen — een
   ontoegankelijke submap ergens diep in een vault van 5.000 notities mag de rest niet
   blokkeren. *(Zie [§13.3](#13-risicos-en-open-vragen) — dit is een aanname, geen
   letterlijke eis.)*

### 5.4 De kern: `app-state`

Eén crate, één verantwoordelijkheid: het bestand
`~/Library/Application Support/Lapis/settings.json` lezen en schrijven (V4-antwoord a).

```rust
pub struct Settings {
    pub vault_root: Option<PathBuf>,
    pub sidebar_visible: bool,   // default true
}

pub fn load() -> Settings;                          // ontbrekend of kapot bestand -> default
pub fn save_vault_root(root: Option<&Path>) -> io::Result<()>;
pub fn save_sidebar_visible(visible: bool) -> io::Result<()>;
```

Geen Tauri-afhankelijkheid — apart testbaar met een `HOME`/pad-override voor tests, zodat
de teststand nooit de echte `Application Support`-map van de testmachine raakt.

### 5.5 IPC-commands (`src-tauri`)

```rust
#[tauri::command]
fn open_vault(picked: String) -> Result<VaultViewDto, String>;
// Kiest een nieuwe map (via het pad dat de systeem-bestandskiezer teruggaf),
// bewaart hem in de Session én in app-state, en geeft de boom terug.

#[tauri::command]
fn restore_vault() -> Result<Option<VaultViewDto>, String>;
// Bij opstarten: leest app-state, valideert dat het pad nog bestaat en een map is.
// Bestaat het niet meer -> Ok(None) (V4: lege staat, niets stilzwijgend tonen).

#[tauri::command]
fn rescan_vault() -> Result<VaultViewDto, String>;
// Handmatig verversen van de huidige sessie. Faalt met NoVaultSelected als er
// nog niets open is.

#[tauri::command]
fn get_sidebar_visible() -> Result<bool, String>;

#[tauri::command]
fn set_sidebar_visible(visible: bool) -> Result<(), String>;
```

Geen enkel command ontvangt een `root`-parameter (bevinding B1, Goal §9) — `open_vault`
ontvangt het net-door-de-gebruiker-gekozen pad (dat is een *keuze*, geen meegegeven root),
alle volgende aanroepen werken op de `Session` die aan de Rust-kant leeft.

### 5.6 De boomcomponent (frontend)

- Toont `TreeNode` zoals de kern hem aanlevert — geen eigen filtering, geen eigen sortering
  (Goal §12: de frontend bepaalt presentatie, nooit inhoud).
- In-/uitklapstatus per map leeft alleen in React-state (niet gepersisteerd — dat staat
  niet in Goal §4's Outcome-lijst, alleen sidebar-zichtbaarheid wel).
- Een klik op een bestand zet hooguit de selectie; er gebeurt geen IPC-aanroep die een
  bestand opent (Goal §4: "hooguit iets in de selectie van de boom").
- Sidebar-toggle roept `set_sidebar_visible` aan en verbergt/toont met CSS — geen
  her-render van de boom nodig.
- **Eén keuze die hier vastligt:** de boom wordt in zijn geheel opgehaald bij het openen of
  herstellen van een vault (`scan_tree` is niet lui per map — zie §5.3), niet per map bij
  het uitklappen. In-/uitklappen is dus een zuiver lokale, synchrone weergavewissel zonder
  IPC-aanroep, en heeft geen volgordebewaking nodig. Wat wél dezelfde toestand kan zetten
  vanuit twee kanten is het *wisselen van vault* (`open_vault` gevolgd door een snelle
  tweede keuze) — daar geldt bevinding B8 onverkort: een volgordenummer per aanroep, de UI
  verwerkt alleen het antwoord met het hoogste nummer (hetzelfde patroon als W0's
  `requestGate.ts`, hergebruikt).

## 6. Out of Scope

Onverkort [Goal §6](00-goal.md#6-out-of-scope). Vier concrete verleidingen tijdens het bouwen:

| Verleiding | Waarom niet |
|---|---|
| "Een `open_note`-command, we hebben de boom toch al" | Dat is W2. De boom mag niets opnemen dat een bestand leest |
| "Expand/collapse-status ook onthouden" | Staat niet in Goal §4's Outcome-lijst; alleen sidebar-zichtbaarheid wordt geëist |
| "`tauri-plugin-store` gebruiken in plaats van een eigen `app-state`-crate" | Zou buiten `vault-core` blijven (voldoet aan Goal §11), maar niet aan de bestaande isolatie-eis dat bestandsoperaties testbaar en in eigen code zitten. Zie [§2](#2-goal-document-alignment) |
| "Even file watching erbij, anders is verversen niet compleet" | Expliciet Out of Scope in Goal §6, W4-gebied |

## 7. Impacted Areas

| Gebied | Status |
|---|---|
| `app/` | Nieuw |
| `docs/waves/W1-vault-lezen/` | Uitgebreid: deze spec, straks testplan en bewijs |
| `spike/` | Onaangeroerd |
| `scripts/isolatie-check.sh` | Uitgebreid met `app/`-paden en de nieuwe regel uit Goal §11 |
| `.github/workflows/ci.yml` | Uitgebreid met een job voor `app/` |
| Documenten 00 t/m 09 | Onaangeroerd |
| Jos' vault (`/Users/jos/Documents`) | Alleen gelezen, tijdens de handmatige doorloop (Goal §7) |

## 8. Expected Behavior

**Kern (`vault-core`)**

- `scan_tree` levert de volledige boom onder `root`, verborgen entries en symlinks naar
  buiten de vault overgeslagen, `.md`-bestanden hoofdletter-ongevoelig herkend.
- `resolve_in_root("")`/`resolve_in_root(".")`/een pad dat naar `root` zelf resolveert →
  `InvalidPath`.
- Een symlink naar een map wordt nooit gevolgd (§5.3, punt 3).
- Geen enkele functie in deze crate roept `fs::write`, `File::create`, `remove_file` of
  `rename` aan.

**Kern (`app-state`)**

- `load()` op een systeem zonder eerder opgeslagen instellingen geeft
  `{ vault_root: None, sidebar_visible: true }`.
- `save_vault_root` en `save_sidebar_visible` schrijven atomair genoeg om een halve
  schrijfactie bij een crash niet de instellingen te laten corrumperen (schrijf naar een
  tijdelijk bestand, hernoem — dezelfde reden als W3's atomair schrijven, hier toegepast
  op instellingen, niet op de vault).

**Tauri-schil**

- `open_vault` en `restore_vault` geven een consistente `VaultViewDto` terug of een
  foutstring; er wordt nergens een root-pad de andere kant op de IPC-grens over gestuurd.

**Frontend**

- Bij eerste start: lege staat met mapkiezer (V4).
- Na mapkeuze: de boom, in-/uitklapbaar, `.git`/`.obsidian`/`.trash` nergens te bekennen.
- Sidebar-toggle overleeft een herstart; de boom niet (per ontwerp — §5.6).
- Scrollen en in-/uitklappen op de 5.000+-fixture voelt niet traag aan (handmatig
  beoordeeld op de gegenereerde fixture, niet alleen gemeten).

## 9. Success Criteria

De wave is compleet wanneer:

1. `npm run tauri dev` in `app/` een venster opent op macOS met een lege staat.
2. Een map kiezen toont de volledige boom, verborgen entries afwezig.
3. Een herstart toont dezelfde vault en dezelfde sidebar-stand.
4. De schrijfvrij-test (§14) slaagt na een volledige doorloop tegen een fixture-vault.
5. De vier V1–V4-tests (§14) slagen.
6. De prestatietest op 5.000+ notities blijft onder 500 ms (Goal §9) en de handmatige
   doorloop bevestigt dat scrollen niet hapert.
7. De isolatiecheck, uitgebreid met de W1-regel, draait groen in CI.
8. Jos heeft zijn eigen vault geopend en doorgenaviveerd, zonder dat er iets veranderd is
   op schijf (te controleren met `find ~/Documents -newer <tijdstip-vóór-start>`, of
   gelijkwaardig).

## 10. Invariants

- **Geen schrijfactie in de vault**, in geen enkele laag, ook niet in `app-state` (die
  schrijft uitsluitend naar `Application Support`).
- **De vault-root gaat nooit als parameter over de IPC-grens.**
- **`vault-core` bevat geen schrijfaanroep**, aantoonbaar met de isolatiecheck.
- **`io::ErrorKind` blijft onderscheidbaar** door alle lagen heen tot aan `VaultError`.
- **Geen netwerkverkeer** vanuit de app.
- **Bestaande tests (W0, `spike/`) blijven onaangeroerd.**

## 11. Constraints

- **Strikte CSP**, geen `null`, in `app/src-tauri/tauri.conf.json` (bevinding B17).
- **Het testplan komt vóór de implementatie** (§14.1).
- **Bestaande tests zijn read-only** (Goal §14, Iteration Policy).
- De fixture-vault voor het prestatiebewijs wordt gegenereerd door een script in
  `app/tests/`, nooit handmatig aangemaakt en nooit ingecheckt (5.000+ bestanden in git is
  geen goed idee) — het script draait als onderdeel van de test, niet als los hulpmiddel.

## 12. Dependencies

| Nodig | Stand |
|---|---|
| Rust-toolchain, Node.js | Al aanwezig sinds W0 |
| `tauri-plugin-dialog` | Al gebruikt in `spike/`, zelfde versie |
| Een testmap met Jos' eigen vault-structuur (optioneel, voor extra realisme) | Niet vereist — de gegenereerde fixture is voldoende voor het geautomatiseerde bewijs |

## 13. Risico's en open vragen

| # | Risico of vraag | Hoe we ermee omgaan |
|---|---|---|
| 1 | **De aparte `app-state`-crate** (§2) is mijn oplossing voor een spanning tussen twee isolatieregels die apart genomen allebei kloppen. Een andere aannemelijke lezing: Goal §11's schrijfverbod slaat alleen op vault-schrijfacties, niet op instellingen, en `app-state` mag gewoon in `vault-core` zitten | **Vraag aan Jos**, maar niet blokkerend: de architectuur is met beide lezingen compatibel; overstappen is een kleine refactor, geen herontwerp |
| 2 | **Geen gevolgde symlinks naar mappen**, ook niet binnen de vault. Dit is een eigen toevoeging bovenop V2, die alleen over bestanden ging | Zichtbaar maken in `03-bewijs.md` als expliciete aanname; Jos kan dit terugdraaien zonder dat de rest van de wave wijzigt |
| 3 | **Een ontoegankelijke submap faalt lokaal, niet globaal.** Niet expliciet gevraagd in Goal §0 | Zichtbaar maken in `03-bewijs.md`; als Jos liever een harde fout op de hele scan ziet, is dat een kleine wijziging in `scan_tree` |
| 4 | Het prestatiebudget van 500 ms is haalbaar met een synchrone `std::fs`-scan zonder threads — onbewezen tot de fixture-test draait | Blokkade-stopconditie uit Goal §15 als het niet haalt; dan eerst een eenvoudige aanpassing (bijv. `read_dir` zonder extra `metadata`-aanroepen) proberen vóór een architectuurgesprek |
| 5 | macOS security-scoped bookmarks: een onthouden pad na een herstart mag niet stilzwijgend een `PermissionDenied` worden | Expliciete stopconditie uit Goal §15. Als dit optreedt tijdens de handmatige doorloop, is dat een blokkademelding, geen work-around |

## 14. Verificatievereisten

### 14.1 Testplan eerst

Vóór er geïmplementeerd wordt, stelt de uitvoerende agent een Wave Test & Verification
Plan op vanuit het Goal Document en deze specificatie.

### 14.2 Kernverificatie (Rust, `vault-core`)

- **V1:** lege string, `"."`, en een pad dat naar `root` zelf resolveert geven allemaal
  `InvalidPath`.
- **V2:** een symlink naar buiten de vault verschijnt niet in `scan_tree`'s resultaat.
- **V3:** `NOTITIE.MD`, `Notitie.Md` en `notitie.md` verschijnen allemaal, precies één keer.
- **Verborgen:** `.git/`, `.obsidian/`, `.trash/`, en een los `.verborgen.md` verschijnen
  niet.
- **Boomstructuur:** geneste mappen, lege submappen, submappen zonder `.md`-bestanden
  (moeten wél verschijnen — Goal laat geen aannames over structuur toe).
- **Symlink-naar-map:** wordt nooit gevolgd, ook niet naar een map binnen de vault (§13.2).
- **Schrijfvrij:** een test die na een volledige `scan_tree` over een fixture-vault
  aantoont dat er geen enkel bestand is bijgekomen, verdwenen, of van wijzigingstijd
  veranderd (Goal §7, "het belangrijkste van deze wave").

### 14.3 Kernverificatie (Rust, `app-state`)

- `load()` zonder bestaand instellingenbestand geeft de default.
- `save_vault_root` gevolgd door `load()` geeft het opgeslagen pad terug.
- `save_sidebar_visible(false)` gevolgd door `load()` geeft `false` terug.
- Een corrupt instellingenbestand (ongeldige JSON) laat `load()` de default teruggeven in
  plaats van te paniekeren.
- Alle tests werken tegen een tijdelijke map, nooit tegen de echte
  `~/Library/Application Support/`.

### 14.4 Prestatieverificatie

Een testhulp genereert een fixture-vault met 5.000+ `.md`-bestanden in een meerlagige
mapstructuur (variërende diepte, brede en smalle mappen gemengd). `scan_tree` erover wordt
getimed; de test faalt boven 500 ms. De gemeten tijd komt in de testoutput én in
`03-bewijs.md`.

### 14.5 Frontend-verificatie

Niveau B — geautomatiseerd, zonder echte webview:

- De boomcomponent klapt een map in en uit bij klikken.
- Verborgen entries die de kern al filtert, verschijnen niet (er is dus geen aparte
  frontend-filtertest nodig — die logica bestaat aan de frontend-kant niet).
- Een klik op een bestand wijzigt de selectie-state, roept geen IPC aan die inhoud leest.
- De sidebar-toggle verbergt de boom (CSS-state) zonder de boom-data te wissen.

### 14.6 Negatieve tests

| Geval | Verwacht |
|---|---|
| `scan_tree` op een niet-bestaande map | `NotFound` |
| `scan_tree` op een bestand in plaats van een map | `NotADirectory` |
| `scan_tree` op een map zonder leesrechten | `PermissionDenied`, geen paniek |
| `rescan_vault` vóór een geopende sessie | `NoVaultSelected` |
| `open_vault` met een pad dat niet bestaat | Foutmelding, geen sessie aangemaakt |
| `restore_vault` met een verdwenen/hernoemd onthouden pad | `Ok(None)`, geen foutmelding aan de gebruiker anders dan de lege staat |

### 14.7 Isolatiecheck

`scripts/isolatie-check.sh` uitgebreid met:

- alle bestaande regels, nu ook toegepast op `app/vault-core/src`, `app/app-state/src`,
  `app/src-tauri/src`, `app/src`, `app/src-tauri/capabilities`.
- de nieuwe regel uit Goal §11: geen `fs::write`, `File::create`, `remove_file`, `rename`
  in `app/vault-core/src`.
- de zelftest (`--zelftest`) uitgebreid zodat hij ook de nieuwe regel bewijst te vangen.

### 14.8 Handmatig

Jos opent zijn eigen vault (`/Users/jos/Documents`), navigeert erdoorheen, verbergt en
toont de sidebar, herstart de app. Vastgelegd in `03-bewijs.md` met het tijdstip vóór
start, zodat de schrijfvrij-garantie ook op de échte vault te controleren is.

## 15. Definition of Done

- Het testplan bestond vóór de eerste regel implementatiecode.
- Alle tests uit §14.2, §14.3, §14.4, §14.6 slagen.
- De frontend-tests uit §14.5 slagen.
- De isolatiecheck (§14.7) draait groen in CI, inclusief zelftest.
- De handmatige doorloop (§14.8) is vastgelegd, inclusief het schrijfvrij-bewijs op de
  echte vault.
- `03-bewijs.md` bevat de aannames uit §13 expliciet, zodat Jos ze kan terugdraaien.
- Er is niets gewijzigd in `spike/` of in documenten 00 t/m 09.

---

## Agent Handoff Instruction

```
Je krijgt twee brondocumenten:

1. Het Goal Document voor W1 (met V1–V4 beantwoord)
2. Deze Wave Specification

Je eerste taak is niet implementeren. Je eerste taak is het opstellen van het
Wave Test & Verification Plan, uitsluitend op basis van deze twee documenten.

Gezagsvolgorde:
1. Het Goal Document beheerst uitkomst en scope.
2. De Wave Specification beheerst implementatiedetails.
3. Het Test & Verification Plan beheerst bewijs en acceptatie.

Bij conflict: Goal wint van Spec. Spec wint van Test. Het testplan mag de scope
nooit oprekken. Kies bij twijfel de smalste interpretatie.

Twee regels die eerder al met een bevinding zijn gekocht en die vanaf hier
gelden, plus één nieuwe:
- De vault-root gaat nooit als parameter over de IPC-grens.
- Bestaande tests en fixtures (ook die van W0/spike) zijn onaantastbaar; wil je
  er een wijzigen, stop en meld dat.
- vault-core bevat geen enkele schrijfaanroep — persistentie loopt via app-state.

De vijf risico's in §13 zijn aannames, geen besluiten. Leg ze zichtbaar vast in
03-bewijs.md in plaats van ze stilzwijgend te verdedigen.

Begin niet met implementeren voordat het testplan er ligt.
```
