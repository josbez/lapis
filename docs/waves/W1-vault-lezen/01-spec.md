# Wave W1 Specification — Vault openen en tonen

| | |
|---|---|
| **Status** | Ter goedkeuring door Jos |
| **Gezag** | Dit document beheerst implementatiedetails. Het [Goal Document](00-goal.md) beheerst uitkomst en scope |
| **Bron** | [Goal W1](00-goal.md) · [PRD v1.1 §F1](../../03-prd.md#f1--vault-openen-en-navigeren) · [Wave-methode](../../07-wave-methode.md) · [Code-analyse](../../09-code-analyse-en-verbeterplan.md) |

---

## 1. Titel

De eerste blijvende code van Lapis: een vault kiezen, onthouden en als mapboom tonen,
zonder één byte naar die vault te schrijven.

## 2. Goal Document Alignment

Deze specificatie implementeert het Goal Document voor W1, inclusief de vier antwoorden
in [§0](00-goal.md#0-open-vragen-die-blokkeren). Het Goal Document beheerst uitkomst,
scope en de betekenis van "compleet"; deze spec levert het implementatiecontract en mag
er niet buiten treden.

**Vier plekken waar deze spec een keuze maakt die het Goal Document openliet.** Ze staan
hier bij elkaar zodat je ze in één blik kunt afwijzen; elk is verderop uitgewerkt.

| # | Keuze | Waar |
|---|---|---|
| K1 | De kern levert de boom als *geneste* structuur, niet als platte lijst met paden | [§5.4](#54-de-boom) |
| K2 | Mappen boven bestanden, beide alfabetisch en hoofdletter-ongevoelig | [§5.4](#54-de-boom) |
| K3 | Een map zonder markdown-bestanden wordt wél getoond | [§5.4](#54-de-boom) |
| K4 | De blijvende code komt in `app/`, met `spike/` onaangeroerd ernaast | [§5.1](#51-projectopzet) |

Geen van de vier breidt de scope uit. Wijs je er één af, dan wint het Goal Document en
pas ik de spec aan.

## 3. Objective

W0 heeft bewezen dat de stack werkt en waar hij pijn doet. W1 zet dat om in code die
blijft, en levert het enige dat elke volgende wave nodig heeft: een geopende vault en een
boom om doorheen te navigeren.

De opbrengst is een fundering, geen functie. Dat W1 zelf nog niets kan openen is geen
gebrek maar de afbakening — lezen is W2.

## 4. Wave Type

Funderende wave · productiecode · eerste wave die tegen de echte vault mag draaien.

## 5. In Scope

### 5.1 Projectopzet

Een nieuwe map `app/` naast `spike/`. De spike blijft staan als naslag en blijft
meedraaien in CI; er wordt geen regel uit gekopieerd zonder hem opnieuw te beoordelen.

```
app/
├─ package.json
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ eslint.config.js
├─ Cargo.toml                 # workspace, met één gecommitte Cargo.lock
├─ vault-core/                # bestandslogica, geen Tauri-afhankelijkheid
│  └─ src/
│     ├─ lib.rs
│     ├─ error.rs             # §5.2
│     ├─ scan.rs              # §5.4
│     ├─ session.rs           # §5.3
│     └─ config.rs            # §5.5
├─ src-tauri/
│  ├─ Cargo.toml
│  ├─ tauri.conf.json         # strikte CSP, §5.7
│  ├─ capabilities/default.json
│  ├─ icons/                  # niet vergeten — zie B21
│  └─ src/main.rs             # dunne schil, alleen commands
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ ipc.ts
   ├─ Boom.tsx                # de mapboom
   └─ requestGate.ts          # patroon uit W0, bevinding B8
```

**K4.** De naam `app/` is een keuze van deze spec. Alternatief was `lapis/` binnen de
repo `lapis`, wat verwarrend leest. De crate-namen worden `vault-core` en `lapis`.

**De iconenmap staat er niet voor de sier.** In W0 ontbrak `src-tauri/icons/` en
daardoor compileerde de schil op geen enkele machine (B21). Voor W1 is dat een
DoD-punt, geen detail.

### 5.2 Het foutmodel

Bevinding B2 uit de code-analyse: `io::ErrorKind` mag niet verloren gaan, anders wordt er
in W3 en W4 op foutstrings gematcht.

```rust
#[derive(Debug, PartialEq, Eq)]
pub enum VaultError {
    /// Het pad valt buiten de gekozen map, ook na symlink-resolutie.
    OutsideRoot,
    /// Er is nog geen map gekozen.
    NoVaultSelected,
    NotFound,
    PermissionDenied,
    AlreadyExists,
    NotADirectory,
    InvalidUtf8,
    /// Alles wat hierboven niet in past. `kind` blijft bewaard, zodat een
    /// later toegevoegd geval geen breuk is.
    Io { kind: std::io::ErrorKind, message: String },
}
```

`PermissionDenied` en `AlreadyExists` worden in W1 niet anders afgehandeld dan `Io` — er
wordt niet geschreven, dus ze doen zich amper voor. **Ze staan er omdat de vorm nu
gekozen wordt en later niet meer gratis is.** Dat is de hele eis; er hoort geen
afhandeling bij.

Over de IPC-grens wordt een fout een object, geen string:

```ts
interface VaultFout {
  code: 'OutsideRoot' | 'NoVaultSelected' | 'NotFound' | 'PermissionDenied'
      | 'AlreadyExists' | 'NotADirectory' | 'InvalidUtf8' | 'Io'
  bericht: string   // voor de statusregel, niet om op te matchen
}
```

De frontend mag op `code` beslissen en nooit op `bericht`. Dat onderscheid is de reden
dat dit type bestaat.

### 5.3 De sessie en de IPC-commands

De root ligt in Rust, in managed state — bevinding B1, in W0 opgelost en hier een eis.
De frontend geeft nooit een vault-pad mee.

```rust
#[tauri::command]
fn open_vault(picked: String, session: State<Session>) -> Result<VaultInfo, VaultFout>
// De enige command die een absoluut pad accepteert: het pad dat de gebruiker
// zelf in de mapkiezer aanwees. Zet de sessie én schrijft de config (§5.5).

#[tauri::command]
fn current_vault(session: State<Session>) -> Result<Option<VaultInfo>, VaultFout>
// Bij het starten: de onthouden vault, of None. Zie §5.5 voor "map is weg".

#[tauri::command]
fn read_tree(session: State<Session>) -> Result<Map, VaultFout>
// De volledige boom. Zonder gekozen vault: NoVaultSelected.

#[tauri::command]
fn rescan(session: State<Session>) -> Result<Map, VaultFout>
// Handmatig verversen. Identiek aan read_tree; bestaat als aparte naam zodat
// de frontend het verschil in bedoeling kan tonen. File watching is W4.

#[tauri::command]
fn set_sidebar_visible(zichtbaar: bool, session: State<Session>) -> Result<(), VaultFout>
```

Vijf commands, meer niet. Er komt in W1 **geen** `read_note` bij — dat is W2, en het is
de verleiding die Goal §16 met naam noemt.

### 5.4 De boom

```rust
pub struct Map {
    pub naam: String,
    pub pad: String,          // relatief aan de root; "" voor de wortel
    pub mappen: Vec<Map>,
    pub notities: Vec<Notitie>,
}

pub struct Notitie {
    pub naam: String,         // bestandsnaam inclusief extensie
    pub pad: String,          // relatief aan de root, met '/' als scheiding
}
```

**K1 — waarom genest en niet plat.** Een platte lijst van paden is goedkoper te
serialiseren, maar dan bouwt de frontend de boom, en dan beslist de frontend wat er in de
boom zit. Goal §12 legt dat expliciet bij de kern. Genest is het contract dat die grens
niet kán schenden.

De scanregels, in volgorde:

1. **Recursief** vanaf de root. Geen dieptelimiet.
2. **Verborgen overslaan:** elke naam die met een punt begint, map of bestand. `.obsidian`
   wordt dus niet betreden, niet alleen niet getoond.
3. **Markdown herkennen** op de extensie, hoofdletter-ongevoelig vergeleken (antwoord V3).
   Alleen `md`. Andere bestanden komen niet in de boom.
4. **Buiten de vault weglaten** (antwoord V2): elk item dat na symlink-resolutie buiten de
   root valt, wordt overgeslagen — bestand én map, zonder melding.
5. **Cyclusbewaking:** een symlink naar een map *binnen* de vault kan een lus maken. Elke
   betreden map wordt op canoniek pad bijgehouden; een map die al bezocht is, wordt
   overgeslagen. *Zonder deze regel loopt de scan bij zo'n lus oneindig door — dit is geen
   theoretisch geval, `ln -s . sub` volstaat.*
6. **Sorteren (K2):** binnen elke map eerst de mappen, dan de notities, elk alfabetisch en
   hoofdletter-ongevoelig.
7. **Lege mappen (K3):** een map zonder markdown erin blijft zichtbaar. Hij bestáát; hem
   verbergen is een oordeel dat Lapis niet hoort te vellen, en het maakt "waar is mijn map
   gebleven" een supportvraag.
8. **Onleesbare mappen:** geen `PermissionDenied` die de hele scan laat falen. De map komt
   leeg in de boom en de scan gaat door. *Eén onleesbare map mag nooit betekenen dat je
   vault niet opent.*

**Prestatie-aanwijzing.** Regel 4 lijkt een `canonicalize` per item te vragen, en dat is
op 5.000 notities merkbaar. Gebruik in plaats daarvan `symlink_metadata` per item — die
doet één `lstat` — en canonicaliseer alleen wanneer het item daadwerkelijk een symlink is.
In een vault zonder symlinks is dat nul extra syscalls, en de garantie blijft dezelfde.

### 5.5 Wat er onthouden wordt

Antwoord V4: één leesbaar bestand, buiten de vault.

```
${XDG_CONFIG_HOME:-~/.config}/lapis/config.json
```

```json
{
  "vault": "/Users/jos/Documents",
  "sidebar_zichtbaar": true
}
```

- De map wordt aangemaakt als hij niet bestaat.
- `$XDG_CONFIG_HOME` wordt gerespecteerd als hij gezet is.
- **Kapotte of onleesbare inhoud is "geen keuze", geen fout.** De app start dan in de lege
  staat. Reden: dit bestand is met de hand te bewerken — dat is de winst van V4 — en dan
  is een typefout een kwestie van tijd. Een editor die niet meer start omdat zijn
  configuratie een komma mist, is een editor die je kwijtraakt.
- **Is de onthouden map verdwenen of hernoemd,** dan start de app in de lege staat met de
  mapkiezer en één regel uitleg, conform je akkoord bij V4. De config wordt daarbij *niet*
  leeggegooid: pas een nieuwe keuze overschrijft hem. *Een externe schijf die even niet
  aangekoppeld is, mag je vaultkeuze niet wissen.*

Dit bestand is het enige dat Lapis in W1 schrijft, en het staat aantoonbaar buiten de
vault (§14.6).

### 5.6 De gebruikersinterface

Eén venster, twee gebieden. Nog steeds geen ontwerp — W10 gaat over de vorm, en Goal §6
noemt een wireframe het plafond.

- **Sidebar** met de boom: mappen in- en uitklapbaar, notities aanklikbaar voor selectie.
- **Hoofdgebied**: leeg, met één regel die zegt dat notities lezen W2 is. *Bewust een
  zichtbare mededeling in plaats van een lege vlakte — anders lijkt het kapot.*
- **Lege staat** zonder vault: de mapkiezer en één regel uitleg.
- **Statusregel** voor fouten. Bevinding B11: fouten die alleen in de console staan,
  bestaan voor de gebruiker niet.
- Sidebar verbergen en tonen; de stand gaat via `set_sidebar_visible` naar de config.

De uitklapstand van mappen leeft in de frontend en wordt **niet** onthouden tussen
sessies. Dat staat niet in Goal §4 en is dus geen eis; het toevoegen zou scope zijn.

**Volgordebewaking** (bevinding B8) geldt voor het wisselen van vault: komt een `read_tree`
van de vorige vault later terug dan die van de nieuwe, dan wint de laatst gestarte. Het
patroon uit `spike/src/requestGate.ts` mag hier één op één overgenomen worden — dat is de
enige regel die uit de spike gekopieerd mag worden, en alleen omdat hij daar met een test
is bewezen.

### 5.7 Beveiliging

- **Strikte CSP** in `tauri.conf.json`, in plaats van `null` (bevinding B17):

  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' asset: data:; connect-src 'self' ipc: http://ipc.localhost
  ```

  `style-src 'unsafe-inline'` is nodig omdat React inline styles zet. Dat is een bewuste
  versoepeling en geen slordigheid; hij hoort in het bewijsdocument te worden genoemd.
- **Geen fs-plugin** in `capabilities/default.json`. Alleen `core:default` en
  `dialog:allow-open`, zoals in W0.
- **De root gaat nooit over de IPC-grens** (§5.3), afgedwongen door de isolatiecheck.

## 6. Out of Scope

De volledige lijst staat in [Goal §6](00-goal.md#6-out-of-scope) en geldt onverkort. De
vier die tijdens het bouwen het hardst zullen jeuken:

| Verleiding | Waarom niet |
|---|---|
| "Een klik op een notitie moet hem tóch openen — de spike kon dat al" | Lezen is W2. Een boom die zijn eigen notities opent, sleept het hele editorcontract W1 in |
| "Even file watching erbij, anders klopt de boom niet meer" | Dat is W4-gebied en het raakt het focusmodel. `rescan` is het antwoord in W1 |
| "De uitklapstand onthouden is drie regels" | Drie regels code, plus een besluit over wat er nog meer in de config hoort. Niet in Goal §4 |
| "Bijlagen zichtbaar maken, het zijn ook bestanden" | F5, wave W8. De boom toont in W1 alleen markdown |

## 7. Impacted Areas

| Gebied | Status |
|---|---|
| `app/` | Nieuw |
| `spike/` | **Onaangeroerd.** Blijft staan en blijft in CI draaien |
| `.github/workflows/ci.yml` | Uitgebreid: dezelfde stappen ook voor `app/` |
| `scripts/isolatie-check.sh` | Uitgebreid, zie §14.6 |
| `docs/waves/W1-vault-lezen/` | Testplan en bewijs komen erbij |
| Documenten 01 t/m 09 | Onaangeroerd |
| De vault van Jos | Gelezen, nooit geschreven — aangetoond in §14.5 |

## 8. Expected Behavior

**Kern**

- `open_vault` canonicaliseert het gekozen pad, weigert een niet-map met `NotADirectory`,
  zet de sessie en schrijft de config.
- `current_vault` geeft de onthouden vault, of `None` als er geen is of de map weg is.
- `read_tree` en `rescan` geven de volledige gefilterde, gesorteerde boom.
- Elke command zonder gekozen vault geeft `NoVaultSelected`.

**Frontend**

- Zonder vault: lege staat met de mapkiezer.
- Met vault: de boom, uitklapbaar, met de root als wortel.
- Fouten verschijnen in de statusregel, niet alleen in de console.
- De sidebar-stand overleeft een herstart.

**Voor de gebruiker**

- Lapis openen na een herstart toont dezelfde vault, zonder opnieuw kiezen.
- `.obsidian` en `.git` zijn nergens te bekennen.
- Een vault van 5.000 notities voelt bij openen en scrollen niet traag.

## 9. Success Criteria

1. `npm run tauri dev` in `app/` opent een venster op macOS.
2. Een map kiezen toont de boom; verborgen mappen ontbreken.
3. Herstarten opent dezelfde vault, met dezelfde sidebar-stand.
4. Een verdwenen vault levert de lege staat met uitleg, en de config blijft intact.
5. De tests uit §14 slagen, inclusief het prestatiebudget uit Goal §9.
6. De schrijfvrij-test uit §14.5 slaagt.
7. `scripts/isolatie-check.sh` draait groen, met de nieuwe regels uit §14.6.
8. `03-bewijs.md` is compleet volgens §14.9.

Punt 6 is de belangrijkste. Hij is de reden dat deze wave tegen de echte vault mag.

## 10. Invariants

- **Geen schrijfactie in de vault.** Niet als tijdelijk bestand, niet als cache. Het enige
  dat W1 schrijft is `config.json` in de configmap.
- **Geen root-pad over de IPC-grens.**
- **Niets buiten de vault in de boom**, ook niet via een symlink.
- **Geen hardgecodeerde paden of gebruikersnamen.**
- **Geen netwerkverkeer** vanuit de app.
- **De frontend filtert niet.** Wat de kern levert, wordt getoond.

## 11. Constraints

- Het testplan komt vóór de eerste regel implementatiecode.
- Bestaande tests en fixtures — ook die van de spike — zijn onaantastbaar. Wil een taak er
  een wijzigen, dan stopt hij en meldt dat (Goal §14).
- Geen scope-uitbreiding om iets werkend te krijgen. Blijkt iets uit §5 lastig, dan is de
  melding waardevoller dan de omweg.
- Antwoord V1 is *uitgesteld, niet beslist*: er komt geen `InvalidPath` in W1, en er wordt
  onderweg ook niets anders verzonnen.

## 12. Dependencies

| Nodig | Stand |
|---|---|
| Tauri v2, React, Vite, TypeScript | Bekend uit W0 |
| `serde_json` voor de config | Nieuw, en de enige nieuwe Rust-afhankelijkheid |
| Een gegenereerde vault van 5.000+ notities | Bouwt de test zelf, §14.4 |
| De vault van Jos voor de handmatige doorloop | Door Jos, alleen lezen |
| CI met de webview-systeemlibs | Staat al, sinds sprint 2 van het verbeterplan |

Geen crate voor het doorlopen van mappen (`walkdir` of vergelijkbaar). De scanregels uit
§5.4 zijn specifiek genoeg dat een eigen recursie korter is dan het configureren van een
crate — en `vault-core` heeft nu nul afhankelijkheden, wat het overal testbaar maakt.

## 13. Risico's en open vragen

| # | Risico of vraag | Hoe we ermee omgaan |
|---|---|---|
| 1 | **K1 t/m K4** (§2) zijn keuzes die het Goal Document openliet | Vraag aan Jos. Wijs je er één af, dan past de spec zich aan |
| 2 | **macOS-rechten op een onthouden pad.** Een pad opslaan is niet hetzelfde als het opnieuw mógen lezen; buiten de sandbox valt dit mee, met sandbox zijn security-scoped bookmarks nodig | Stopconditie uit Goal §15. Eerst meten of het zich voordoet, niet vooraf bookmarks bouwen |
| 3 | Het prestatiebudget van 500 ms wordt niet gehaald | Melden als bevinding met het gemeten getal, niet stilzwijgend lazy laden invoeren. Dat is een architectuurgesprek |
| 4 | De geneste boom (K1) wordt bij 5.000 notities een grote JSON over de IPC-grens | Meten in dezelfde test als risico 3. Blijkt de serialisatie het probleem, dan is dat een reden om K1 te heroverwegen — met een getal erbij |
| 5 | Een symlink-lus in de vault | Regel 5 van §5.4. Er hoort een test bij, want dit is precies het geval dat je pas ontdekt als je vault vastloopt |
| 6 | De strikte CSP breekt iets in de webview dat in dev niet opvalt | `npm run tauri dev` gebruikt een andere CSP dan de gebouwde app. Handmatige doorloop op een `tauri build`, niet alleen op `dev` |

## 14. Verificatievereisten

### 14.1 Testplan eerst

Vóór er geïmplementeerd wordt, stelt de uitvoerende agent een Wave Test & Verification
Plan op vanuit het Goal Document en deze spec. Er wordt niet gebouwd voordat dat plan er
ligt.

### 14.2 Kernverificatie (Rust)

Elke test bouwt zijn eigen mapstructuur, zoals `vault-core` in W0 deed. Verplicht:

| Geval | Verwacht |
|---|---|
| Geneste mappen met markdown | Volledige boom, correct genest |
| `.obsidian/` met markdown erin | Niet in de boom, en niet betreden |
| `.verborgen.md` | Niet in de boom |
| `notitie.MD`, `notitie.Md` | Wél in de boom (V3) |
| `plaatje.png`, `aantekening.txt` | Niet in de boom |
| Map zonder markdown | Wél in de boom (K3) |
| Sortering: `Zebra/`, `alfa/`, `Beta.md`, `appel.md` | `Zebra`, `alfa`, dan `appel.md`, `Beta.md` (K2) |
| Symlink naar een bestand buiten de vault | Niet in de boom (V2) |
| Symlink naar een map buiten de vault | Niet in de boom, niet betreden (V2) |
| Symlink naar een map *binnen* de vault, cyclisch | Scan eindigt, geen oneindige recursie |
| Map zonder leesrechten | Leeg in de boom, scan gaat door |
| Lege vault | Lege boom, geen fout |
| Commands zonder gekozen vault | `NoVaultSelected` |
| `open_vault` op een bestand | `NotADirectory` |
| `open_vault` op een niet-bestaand pad | `NotFound` |

**Het foutmodel** (§5.2) krijgt een eigen test: een `io::Error` met kind
`PermissionDenied` komt aan als `VaultError::PermissionDenied` en niet als `Io`. Dat is
de hele borging van B2 — zonder deze test is de enum decoratie.

**V1 vastleggen.** Eén test die het huidige gedrag van een leeg of `.`-relatief pad
vastlégt in plaats van beoordeelt, met een commentaarregel die zegt: dit is bewust niet
opgelost, zie Goal §0 V1. *De test bewaakt niet dat het goed is, maar dat het niet
ongemerkt verandert.*

### 14.3 Configverificatie

| Geval | Verwacht |
|---|---|
| Configmap bestaat niet | Wordt aangemaakt, keuze wordt bewaard |
| `$XDG_CONFIG_HOME` gezet | Config landt daar, niet in `~/.config` |
| Config bevat onzin | Lege staat, geen crash |
| Onthouden vault bestaat niet meer | `current_vault` geeft `None`, config blijft ongewijzigd |
| Nieuwe keuze | Overschrijft de vorige |

De tests zetten `$XDG_CONFIG_HOME` naar een testmap. **Er wordt in geen enkele test naar
de echte configmap van de gebruiker geschreven.**

### 14.4 Prestatieverificatie

Een test die een vault genereert van **5.000 notities** verdeeld over een realistische
structuur (ongeveer 50 mappen, twee niveaus diep), de scan draait en de tijd rapporteert.

- Budget: **500 ms**, uit Goal §9.
- De gemeten tijd staat in de testuitvoer, ook als de test slaagt — een budget dat je niet
  ziet naderen, merk je pas als het overschreden is.
- Meet ook de serialisatie naar JSON (risico 4).

### 14.5 De schrijfvrij-test

De belangrijkste test van deze wave, en de reden dat W1 tegen de echte vault mag.

1. Bouw een vault met mappen, notities en een paar niet-markdown-bestanden.
2. Neem een opname van elk pad met zijn grootte en wijzigingstijd, recursief.
3. Draai de volledige doorloop: `open_vault`, `read_tree`, `rescan`,
   `set_sidebar_visible`.
4. Neem opnieuw een opname.
5. Assert: identiek. Geen bestand bijgekomen, verdwenen, gegroeid of aangeraakt.

*Let op de valkuil: `atime` verandert wél bij lezen op sommige systemen. De opname
gebruikt daarom `mtime`, niet `atime` — anders faalt de test om de verkeerde reden en
wordt hij binnen een week uitgezet.*

### 14.6 Isolatiecheck

`scripts/isolatie-check.sh` draait al met acht checks. Erbij voor W1:

- **Geen schrijfaanroep in de kern:** geen `fs::write`, `File::create`, `remove_file`,
  `remove_dir`, `rename` of `OpenOptions` in `app/vault-core/src`, met één uitzondering:
  `config.rs`, dat buiten de vault schrijft.
- De bestaande checks gelden ook voor `app/`, niet alleen voor `spike/`.

De zelftest van het script wordt meegegroeid: elke nieuwe check bewijst dat hij zijn
eigen proef-overtreding vangt.

### 14.7 Frontend-verificatie

Niveau B: geautomatiseerd, zonder echte webview.

| Geval | Verwacht |
|---|---|
| Boom met geneste mappen rendert | Alle takken aanwezig |
| Map in- en uitklappen | Kinderen verschijnen en verdwijnen |
| Sidebar verbergen | Boom weg, stand gaat naar de kern |
| Fout uit de kern | Verschijnt in de statusregel |
| Twee vaults snel achter elkaar openen | De laatst gekozen wint (B8) |

### 14.8 Handmatige verificatie

Niveau C, met bewijs, op een `tauri build` en niet alleen op `dev` (risico 6):

1. Eerste start: lege staat.
2. Vault kiezen — de echte vault van Jos mag hier.
3. De boom doorlopen, uitklappen, scrollen.
4. Sidebar verbergen.
5. Afsluiten en opnieuw starten: zelfde vault, zelfde stand.
6. Vault hernoemen buiten Lapis, opnieuw starten: lege staat met uitleg.

Screenshots of schermopname in `03-bewijs.md`.

### 14.9 Vereist bewijs

`03-bewijs.md` bevat:

1. Wat er is gebouwd
2. Uitgevoerde commando's met uitkomst
3. De gemeten scantijd en JSON-omvang bij 5.000 notities
4. Screenshots van de handmatige doorloop
5. De uitkomst van de schrijfvrij-test, letterlijk
6. Wat er níét is getest
7. Bevestiging dat de scope niet is opgerekt, en welke afwijkingen er zijn gemeld
8. De genoemde CSP-versoepeling (§5.7) met de reden

## 15. Definition of Done

- Het testplan bestond vóór de eerste regel implementatiecode.
- Alle tests uit §14 slagen; CI is groen op `app/` én `spike/`.
- De schrijfvrij-test slaagt. **Deze is onvoorwaardelijk.**
- Het prestatiebudget is gehaald, of overschreden mét een gemeten getal en een melding.
- `src-tauri/icons/` bestaat en `cargo build` van de schil slaagt in CI (B21).
- De strikte CSP staat in `tauri.conf.json`.
- De isolatiecheck draait groen, inclusief de nieuwe regels en hun zelftest.
- `03-bewijs.md` is compleet volgens §14.9.
- Er is niets in `spike/` gewijzigd en niets aan de documenten 01 t/m 09.

Een falende test die begrepen en opgeschreven is, mag — behalve de schrijfvrij-test en de
padtests. Die twee zijn onvoorwaardelijk.

---

## Agent Handoff Instruction

```
Je krijgt twee brondocumenten:

1. Het Goal Document voor W1, inclusief de vier beantwoorde vragen in §0
2. Deze Wave Specification

Je eerste taak is niet implementeren. Je eerste taak is het opstellen van het
Wave Test & Verification Plan, uitsluitend op basis van deze twee documenten.

Gezagsvolgorde:
1. Het Goal Document beheerst uitkomst en scope.
2. De Wave Specification beheerst implementatiedetails.
3. Het Test & Verification Plan beheerst bewijs en acceptatie.

Bij conflict: Goal wint van Spec. Spec wint van Test. Het testplan mag de scope
nooit oprekken. Kies bij twijfel de smalste interpretatie.

Drie regels die in W0 met een bevinding zijn betaald:
- De vault-root gaat nooit als parameter over de IPC-grens.
- src-tauri/icons/ moet bestaan, anders compileert de schil niet.
- Bestaande tests en fixtures zijn onaantastbaar; wil je er een wijzigen, stop
  en meld dat.

W1 leest, W1 schrijft niet. Komt er ergens een schrijfactie in de vault in je
oplossing voor, dan is dat geen implementatiedetail maar een blokkade.

Er komt geen read_note in W1. Dat is W2, ook al kon de spike het al.

Begin niet met implementeren voordat het testplan er ligt.

Geef na het opstellen van het testplan aan:
1. of Goal en Spec voldoende testbaar zijn
2. welke aannames je hebt gemaakt
3. welke tests verplicht zijn voor acceptatie
4. wat er eerst opgehelderd moet worden
```
