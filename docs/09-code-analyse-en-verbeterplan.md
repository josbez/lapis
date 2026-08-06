# 09 – Code-analyse W0 en verbeterplan

**Status:** analyse uitgevoerd op de W0-spike zoals die op de hoofdbranch staat
(commit `0fd48f8`). Alle bestaande tests draaien groen (14 Rust, 10 frontend).
Dit document borgt de bevindingen als backlog: epics → sprints → taken, met per
taak een advies over de uitvoerende agent (Opus 5.0 of Sonnet 5.0) en de
bijbehorende valkuil.

**Stand:** sprint 1 en 2 zijn uitgevoerd, sprint 3 wacht op de W1- en W3-documenten.
Zie [§7](#7-stand-van-uitvoering) — inclusief één bevinding die de analyse niet kón
zien (B21).

**Verhouding tot de wave-methode.** Dit plan vervangt de waves niet. W0 is
uitdrukkelijk wegwerpcode; veel bevindingen horen daarom niet als fix in de
spike thuis, maar als *eis in de spec van een latere wave*. Elke taak hieronder
zegt expliciet waar hij landt: in de spike (omdat Jos er nog mee gaat typen),
in de kwaliteitsinfrastructuur (wave-onafhankelijk), of als borging in een
wave-document.

---

## 1. Wat er goed is

Eerlijk oordeel eerst — de spike is boven verwachting degelijk voor wegwerpcode:

- **De laag-scheiding is echt.** `vault-core` heeft nul dependencies en is
  overal testbaar; `src-tauri` is aantoonbaar een dunne schil; de frontend
  raakt nooit zelf een bestand aan. Dit is precies de verantwoordelijkheidsgrens
  uit [07 §4.4](07-wave-methode.md#44-de-verantwoordelijkheidsgrens).
- **Padveiligheid is dubbel uitgevoerd** (componentcontrole én canonicalisatie
  na symlink-resolutie) en met zeven negatieve tests bewezen, inclusief het
  symlink-ontsnappingsgeval dat de meeste implementaties missen.
- **De CRLF-bevinding is voorbeeldig afgehandeld:** empirisch vastgesteld dat
  de CodeMirror-facet niet volstaat, de serialisatiestap in één gedeelde module
  gezet die door app én test wordt gebruikt, en een canary-test toegevoegd die
  faalt zodra CodeMirror van gedrag verandert.
- **Tests bewaken hun eigen fixtures** (`be_01b`: bewijst dat `crlf.md` nog
  echt CRLF bevat) — dat soort meta-zorgvuldigheid is zeldzaam.
- **Het bewijsdocument is eerlijk** over wat níét getest is.

De bevindingen hieronder zijn dus verbeteringen op een gezonde basis, geen
reddingsoperatie.

## 2. Bevindingen

Ernst: 🔴 moet opgelost vóór er tegen echte notities wordt gewerkt ·
🟠 moet geborgd worden in een wave-spec · 🟡 verbetering · ⚪ observatie.

### 2.1 Kern (Rust)

| ID | Ernst | Bevinding |
|---|---|---|
| **B1** | 🔴 | **De frontend heeft autoriteit over het root-pad.** Elke IPC-call (`read_note`, `write_note`, …) neemt `root` als string van de frontend aan en vertrouwt die. De rel-padcontrole is waterdicht, maar de *root zelf* is dat niet: een frontend-bug (of XSS in de webview) kan met `root: "/Users/jos/Documents"` overal lezen en schrijven. Dit schendt de eigen grens uit 07 §4.4 ("de frontend beslist nooit of een pad geldig is"). Fix: root na `resolve_root` in Tauri managed state (`Mutex<Option<PathBuf>>`) bewaren; commands accepteren daarna alléén relatieve paden. |
| **B2** | 🟠 | **`VaultError` gooit de `io::ErrorKind` weg** — alleen `NotFound` wordt gemapt, de rest wordt `Io(String)`. W3 (atomair schrijven) en W4 (conflictdetectie) hebben `PermissionDenied`, `AlreadyExists` e.d. als onderscheidbare gevallen nodig. Nu borgen als eis in de W3-spec, anders wordt daar op strings gematcht. |
| **B3** | 🟡 | **Leeg of `.`-relatief pad resolvet naar de rootmap zelf.** `read_note(root, "")` levert dan een rommelige `Io("Is a directory …")` in plaats van een nette weigering. Expliciet afvangen: leeg pad en pad-zonder-bestandsnaam → `OutsideRoot` of nieuw variant `InvalidPath`. |
| **B4** | 🟡 | **Symlinks zijn zichtbaar maar onbruikbaar.** `list_markdown` volgt `is_file()` door symlinks heen en toont `ontsnapping.md`; klikken faalt daarna met `OutsideRoot` (NE-07). Consistent maken: symlinks die buiten de root wijzen niet tonen, of een expliciet productbesluit vastleggen. |
| **B5** | 🟡 | **Extensiefilter is hoofdlettergevoelig** (`nota.MD` is onzichtbaar), terwijl de sortering wél case-insensitief is en APFS standaard case-insensitief is. Kleine inconsistentie met zichtbaar gevolg. |
| **B6** | 🟡 | **Testhygiëne:** `ne_01`/`ne_02` schrijven bewust buiten hun testmap (in `target/test-tmp/`) en ruimen dat niet op. Onschuldig, maar het bestand `buiten-de-map.md` blijft tussen runs achter. |
| **B7** | ⚪ | `windows_subsystem`-attribuut in `main.rs` terwijl het doelplatform macOS is. Harmloos, kost niets om te laten staan. |

### 2.2 Frontend (React)

| ID | Ernst | Bevinding |
|---|---|---|
| **B8** | 🔴 | **Race bij snel wisselen van notitie.** `openNote` is async zonder volgordebewaking: klik A, klik B → als de read van A ná die van B resolvet, toont de editor A terwijl de gebruiker B verwacht — en `⌘S` schrijft dan A's inhoud naar A, terwijl de gebruiker denkt in B te werken. Klein te fixen met een request-token (laatst-gestarte wint). Dit zit in het typgevoel waar Jos over gaat oordelen, dus dit hoort in de spike zelf. |
| **B9** | 🔴 | **Onopgeslagen werk verdwijnt stil.** Andere notitie openen of andere map kiezen gooit de editorinhoud weg zonder waarschuwing. Voor W0 gedeeltelijk bewust (geen autosave, Goal §6), maar *stil verlies* is iets anders dan *geen autosave*. Minimaal borgen als harde eis in de W3/W4-spec (dirty-tracking); overwegen voor de spike als éénregelige `confirm`. |
| **B10** | 🟡 | **Inconsistente toestand bij gedeeltelijk falen.** In `pickFolder` wordt `setRoot(resolved)` gezet vóórdat `listMarkdown` geslaagd is; faalt die, dan staat de nieuwe root boven de bestandslijst van de vórige map. Alles pas zetten als alle data binnen is. |
| **B11** | 🟡 | **Fouten bij openen zijn onzichtbaar voor de gebruiker.** `pickFolder`/`openNote` loggen alleen naar console; `save` zet wél een statusmelding. Inconsistent binnen dezelfde minimalisme-afspraak — één regel status kost niets en scheelt Jos raden tijdens de doorloop. |
| **B12** | 🟡 | **`⌘S` matcht alleen kleine 's'.** Met Caps Lock actief is `e.key === 'S'` en doet opslaan niets. `e.key.toLowerCase() === 's'` (en `⇧` uitsluiten) lost dit af. |
| **B13** | ⚪ | **Lone-CR-bestanden (klassiek Mac).** `detectLineEnding` classificeert ze als LF; de round-trip blijft byte-identiek (CR wordt nooit aangeraakt), dus geen bug — maar het is onbewezen. Eén fixture + testregel legt het vast. |
| **B14** | 🟠 | **Gemengde regeleindes worden bij opslaan volledig CRLF** (bekend, `lineEndings.ts` en bewijs §6.2). Het besluit "wat doet W3 hiermee" staat nog open — dat is een productvraag voor Jos, geen codevraag. |

### 2.3 Configuratie en proces

| ID | Ernst | Bevinding |
|---|---|---|
| **B15** | 🔴 | **Er is geen CI.** De 24 tests, typecheck, build en de isolatiechecks uit 07 §4.3 draaien alleen als iemand eraan denkt. Juist bij uitvoering door agents is een poort die niemand kan overslaan de goedkoopste verzekering die er bestaat. |
| **B16** | 🟠 | **De isolatiechecks zijn handwerk.** "Geen hardgecodeerde paden, geen netwerk, geen fs vanuit de frontend" is nu een grep die de agent zelf uitvoert en rapporteert. Dat moet een script zijn dat in CI faalt — een agent die zijn eigen huiswerk nakijkt is geen verificatie. |
| **B17** | 🟡 | **CSP staat op `null`** in `tauri.conf.json`. Voor een lokale spike verdedigbaar, maar in combinatie met B1 is het precies het gat waardoor een webview-compromis bij de schijf kan. Vanaf W1: een strikte CSP als default. |
| **B18** | 🟡 | **Geen Cargo-workspace, geen committed lockfile voor `src-tauri`.** `vault-core` en `lapis-spike` zijn losse crates; alleen `vault-core` heeft een `Cargo.lock`. Eén workspace met één gecommitte lock maakt builds reproduceerbaar. |
| **B19** | 🟡 | **Geen linters geconfigureerd** (clippy met `-D warnings`, rustfmt-check, ESLint). Niet om de stijl, maar omdat linters de klasse fouten vangt die agents het vaakst maken (ongebruikte results, shadowing, afhankelijkheids-drift in hooks — React's `exhaustive-deps` had B8 deels zichtbaar gemaakt). |
| **B20** | ⚪ | Bundel is 782 kB (al genoteerd in bewijs §6.4). Geen actie in de spike; wordt relevant bij de PRD-ambitie over omvang. |

## 3. Epics

| Epic | Naam | Bevindingen | Landt in |
|---|---|---|---|
| **E1** | Kern-autoriteit en foutmodel | B1, B2, B3, B4, B5 | Spike (B1) + W1/W3-specs |
| **E2** | Frontend-integriteit | B8, B9, B10, B11, B12 | Spike (Jos typt hier nog in) |
| **E3** | Kwaliteitsinfrastructuur | B15, B16, B18, B19 | Wave-onafhankelijk, nu |
| **E4** | Security-hardening | B17 (+ B1-borging) | W1-spec |
| **E5** | Documentbehoud-randgevallen | B13, B14, B6 | Testsuite + W3-besluit |

## 4. Sprints en taken

Drie korte sprints. Sprint 1 vóór Jos' macOS-doorloop (alles wat zijn oordeel
zou vertekenen of de doorloop riskant maakt), sprint 2 de infrastructuur,
sprint 3 de borging in wave-documenten. Elke taak heeft een aanbevolen
uitvoerder; de redenatie daarachter staat in §5.

### Sprint 1 — vóór de doorloop op de Mac

| Taak | Wat | Acceptatiecriteria | Uitvoerder | Valkuil-instructie |
|---|---|---|---|---|
| **T1** (B8) | Request-token in `openNote`: alleen de laatst gestarte read mag state zetten | Nieuwe frontend-test die out-of-order-resolutie simuleert; bestaande 10 tests groen | **Sonnet 5.0** — klein, scherp af te bakenen | Verbod om `openNote` te herstructureren; alleen het token toevoegen. Fixtures en bestaande tests zijn onaantastbaar |
| **T2** (B1) | Root in Tauri managed state; commands accepteren alleen nog rel-paden; frontend-`ipc.ts` verliest de `root`-parameter | NE-tests uitgebreid met "command vóór map-keuze faalt netjes"; alle 14+ Rust-tests groen | **Opus 5.0** — raakt drie lagen (state, IPC-contract, frontend) en een veiligheidsinvariant | Expliciete out-of-scope-lijst meegeven: géén sessie-persistentie, géén multi-vault, géén extra commands. Opus wil hier een architectuur van maken; het is één Mutex |
| **T3** (B10, B11, B12) | Statusregel bij open-fouten, toestand pas zetten na volledig succes, `⌘S` case-insensitief | Handmatig na te lopen; typecheck groen | **Sonnet 5.0** | Drie mechanische fixes; per stuk benoemen, geen "verbeter de foutafhandeling"-vrijbrief |
| **T4** (B9) | Besluit van Jos: `confirm` bij wegnavigeren met onopgeslagen werk in de spike, of accepteren tot W3 | Besluit genoteerd in dit document | **Jos** (besluit), daarna Sonnet (uitvoering, 5 regels) | — |

### Sprint 2 — kwaliteitsinfrastructuur

| Taak | Wat | Acceptatiecriteria | Uitvoerder | Valkuil-instructie |
|---|---|---|---|---|
| **T5** (B15) | GitHub Actions-workflow: `cargo test`, `vitest run`, `tsc --noEmit`, `vite build` | Workflow draait groen op de PR van deze branch | **Sonnet 5.0** — configuratiewerk met direct zichtbaar resultaat | Geen matrix-builds, geen caching-optimalisatie, geen macOS-runner (die is voor later): vier stappen, meer niet |
| **T6** (B16) | Isolatiechecks als script (`scripts/isolatie-check.sh`): hardgecodeerde paden, netwerk-imports in de kern, fs-gebruik in de frontend | Script faalt aantoonbaar op een ingebouwde proef-overtreding; draait als vijfde CI-stap | **Opus 5.0** — de checks vertalen van principe naar patroon vergt oordeel (wat is een "netwerk-aanroep" in een grep?) | Valse-positieven-drang beteugelen: liever drie checks die hard zijn dan tien die ruisen |
| **T7** (B18) | Cargo-workspace van `spike/` met één gecommitte `Cargo.lock` | `cargo test` werkt vanaf `spike/`; lockfile in git | **Sonnet 5.0** | Alleen workspace-plumbing; geen versie-upgrades "nu we toch bezig zijn" |
| **T8** (B19) | Clippy (`-D warnings`) + rustfmt-check + ESLint met `react-hooks/exhaustive-deps` als error, in CI | CI faalt op een geïntroduceerde proef-overtreding; bestaande code lint schoon | **Sonnet 5.0**, met **Opus-review** op de eerste run | Lint-fixes mogen gedrag nooit veranderen; elke `#[allow]`/`eslint-disable` vereist een regel uitleg |
| **T9** (B6, B13) | Testhygiëne: opruimen buiten-root-artefacten; lone-CR-fixture + round-trip-testregel | `cargo test` twee keer achter elkaar identiek; nieuwe fixture bewaakt zichzelf zoals `be_01b` | **Sonnet 5.0** | De bestaande fixtures zijn onaantastbaar; alleen toevoegen |

### Sprint 3 — borging in wave-documenten

| Taak | Wat | Acceptatiecriteria | Uitvoerder | Valkuil-instructie |
|---|---|---|---|---|
| **T10** (B2) | Eis in W3-spec: foutmodel met onderscheidbare `ErrorKind`-varianten (`PermissionDenied`, `AlreadyExists`, …) | Sectie in W3-spec, door Jos goedgekeurd | **Opus 5.0** — spec-werk | Eis formuleren, niet vast implementeren |
| **T11** (B9, B14) | Beslisvragen voor Jos in W3-goal: dirty-tracking-gedrag, en het besluit over gemengde regeleindes | Twee beantwoorde vragen in het besluitenregister | **Opus 5.0** | Vragen stellen zoals [05](05-open-vragen.md): opties met gevolgen, geen voorkeur vermomd als vraag |
| **T12** (B17, B1) | W1-spec: strikte CSP als default + "root-autoriteit ligt in Rust" als isolatiecheck-regel (07 §4.3-lijst uitbreiden) | Regel toegevoegd aan de checklijst; CSP-eis in W1-spec | **Opus 5.0** | — |
| **T13** (B3, B4, B5) | Productbesluiten voor W1: leeg-pad-gedrag, symlink-beleid, case-gevoeligheid extensies | Drie beantwoorde vragen; daarna implementatie in W1 (niet in de spike) | **Jos** (besluit), Opus (voorlegging) | Niet vooruit implementeren in de wegwerp-spike |

## 5. Opus 5.0 en Sonnet 5.0 als uitvoerders

De taakverdeling hierboven is geen smaak; hij volgt uit waar elk model
aantoonbaar sterk en zwak is — inclusief wat deze repo daar zelf al over laat
zien.

### Opus 5.0

**Sterk in:** redeneren over invarianten die door meerdere lagen heen lopen
(B1 is daar het schoolvoorbeeld van: het gat zit niet in één functie maar in
het contract tussen drie lagen), security-analyse, het schrijven van specs en
beslisvragen, en het herkennen van subtiele races. De CRLF-afhandeling in W0 —
empirisch vaststellen, canary-test, gedeelde module — is typisch Opus-werk van
de goede soort.

**Valkuilen:**

1. **Scope creep met goede bedoelingen.** De W0-afwijking (`vault-core` als
   aparte crate, spec zei `vault.rs`) was verdedigbaar én werd gemeld — maar
   het patroon is er: Opus wijkt af als het denkt dat het beter weet. Dit
   project noemt scope creep zelf zijn grootste risico ([07 §2](07-wave-methode.md#2-waarom-dit-bij-lapis-past)).
   *Mitigatie:* elke Opus-taak krijgt een expliciete out-of-scope-lijst, en de
   wave-regel geldt: afwijken mag alleen gemeld, nooit stilzwijgend.
2. **Over-engineering.** Vraag Opus om een Mutex en je krijgt een
   state-machine met een trait erbij. *Mitigatie:* omvangsindicatie in de
   taak ("dit is één Mutex, ~40 regels diff").
3. **Documenten-drang.** Opus legt graag veel vast; bij T10–T12 is dat de
   bedoeling, bij codetaken niet. *Mitigatie:* codetaken leveren code + tests,
   geen nieuwe documenten.

### Sonnet 5.0

**Sterk in:** strak gespecificeerde, begrensde taken snel en schoon uitvoeren —
CI-workflows, mechanische fixes, testcode naar voorbeeld (T9 kan letterlijk
`be_01b` als mal gebruiken), workspace-plumbing. Blijft beter binnen de
opdracht dan Opus.

**Valkuilen:**

1. **De happy path.** Sonnet mist eerder het randgeval dat niet in de opdracht
   staat. *Mitigatie:* randgevallen staan ín de taak (daarom noemt T3 de drie
   fixes stuk voor stuk, in plaats van "verbeter de foutafhandeling").
2. **Impliciete invarianten breken.** Het byte-behoudscontract is de ziel van
   dit project en staat nergens in een functiesignatuur. Sonnet kan bij een
   ogenschijnlijk onschuldige wijziging een `.trim()` of normalisatie
   introduceren zonder te beseffen wat er breekt. *Mitigatie:* de round-trip-
   tests (BE-01, FE-01) zijn de poort voor élke taak, en fixtures en bestaande
   tests zijn voor Sonnet-taken expliciet onaantastbaar verklaard.
3. **De test aanpassen in plaats van de code.** Bij een rode test is de
   goedkoopste route de assertie versoepelen. *Mitigatie:* dezelfde regel —
   bestaande tests zijn read-only; een taak die een bestaande test wil wijzigen
   stopt en meldt dat, conform de wave-afspraak "gaten niet stilzwijgend
   vullen".
4. **Spec-gaten niet melden.** Waar Opus te veel initiatief neemt, neemt
   Sonnet er soms te weinig: het vult een gat met de meest voor de hand
   liggende aanname en gaat door. *Mitigatie:* kleine taken zonder gaten —
   precies waarom sprint 1 en 2 in taken van deze korrelgrootte zijn gesneden.

### De vuistregel

> **Sonnet voert uit wat volledig gespecificeerd is; Opus specificeert, raakt
> invarianten aan, en reviewt. Nooit andersom.** Een Opus-diff wordt op omvang
> gereviewd (alles boven de taakomvang is verdacht), een Sonnet-diff op
> volledigheid (staan alle genoemde randgevallen erin, zijn de tests
> ongemoeid).

## 6. Volgorde en samenhang met de waves

```
Sprint 1 (T1–T4)  →  doorloop van Jos op de Mac  →  PP-01…PP-04, PP-10
Sprint 2 (T5–T9)  →  CI staat — elke latere wave erft de poort
Sprint 3 (T10–T13) →  W1- en W3-documenten dragen de bevindingen
```

Sprint 1 gaat vóór de doorloop omdat B8 (open-race) het typoordeel kan
vertekenen en B1 de veiligheidsmarge vergroot zodra er buiten een fixture-map
wordt geklikt. Sprint 2 kan parallel aan de doorloop. Sprint 3 heeft geen
haast maar wél een deadline: vóór het schrijven van de W1- en W3-specs, anders
worden de bevindingen daar opnieuw ontdekt.

Wat dit plan bewust *niet* doet: de spike oppoetsen tot productie-code. B3,
B4, B5, B17 worden in W1 gebouwd, niet in W0 teruggeplakt — wegwerpcode blijft
wegwerpcode, conform het Goal Document.

---

## 7. Stand van uitvoering

*Bijgewerkt bij het verwerken van dit plan. Sprint 1 en 2 zijn uitgevoerd; sprint 3
wacht op documenten die nog niet bestaan.*

| Taak | Stand | Waar het landde |
|---|---|---|
| **T1** (B8) | ✅ | `src/requestGate.ts` + FE-02 in `src/__tests__/requestGate.test.ts` |
| **T2** (B1) | ✅ | `vault_core::Session`, `main.rs` als managed state, `ipc.ts` zonder root |
| **T3** (B10, B11, B12) | ✅ | `App.tsx` — statusregel bij fouten, state pas na volledig succes, `⌘S` case-insensitief |
| **T4** (B9) | ✅ | Besluit van Jos: `confirm` bij wegnavigeren. Uitgevoerd in `App.tsx` |
| **T5** (B15) | ✅ | `.github/workflows/ci.yml` |
| **T6** (B16) | ✅ | `scripts/isolatie-check.sh`, acht checks, met `--zelftest` |
| **T7** (B18) | ✅ | `spike/Cargo.toml` als workspace, één gecommitte `Cargo.lock` |
| **T8** (B19) | ✅ | clippy `-D warnings`, `rustfmt --check`, ESLint met `exhaustive-deps` als error |
| **T9** (B6, B13) | ✅ | Testartefacten binnen hun eigen map; fixture `lone-cr.md` met zelfbewaking |
| **T10** (B2) | ⏳ | Wacht op de W3-spec — die bestaat nog niet |
| **T11** (B9, B14) | ⏳ | Beslisvragen voor het W3-goal; hetzelfde |
| **T12** (B17, B1) | 🟡 deels | De isolatiecheck-regel voor root-autoriteit staat er (twee checks); de CSP-eis wacht op de W1-spec |
| **T13** (B3, B4, B5) | ⏳ | Drie productbesluiten voor Jos, bij het schrijven van W1 |

**Besluit bij T4 (B9).** Jos kiest voor een `confirm` bij wegnavigeren met onopgeslagen
werk, in de spike zelf. Reden om het niet tot W3 te laten liggen: stil verlies tijdens
de doorloop kost vertrouwen in het oordeel waar de hele wave om draait. De vergelijking
loopt via dezelfde serialisatiestap als het opslaan, zodat een puur regeleinde-verschil
niet als wijziging telt.

### Wat er bijkwam: B21

**B21 🔴 — de Tauri-schil compileerde niet.** `src-tauri/icons/` ontbrak volledig, en
`tauri::generate_context!` stopt de build op een ontbrekend `icons/icon.png`. De spike
had op geen enkele machine kunnen starten, ook niet op die van Jos.

Deze bevinding staat niet in §2 omdat een code-analyse code léést. Alleen een compiler
ziet dit — wat het argument voor B15 (er is geen CI) op de dag van invoering meteen
bewijst. Opgelost met vier effen PNG's in `src-tauri/icons/`; plaatsvervangers tot W10.
Uitgebreider in [W0-bewijs §12](waves/W0-spike/03-bewijs.md#12-naschrift-na-de-code-analyse).

### Wat bewust níét is gedaan

B3, B4, B5 en B17 zijn niet in de spike teruggeplakt — §6 van dit plan zegt dat ze in W1
gebouwd worden, en wegwerpcode blijft wegwerpcode. B7 (`windows_subsystem`) en B20
(bundelomvang) stonden als observatie zonder taak en zijn ongemoeid gelaten.

### De poort staat

```
cargo fmt --check · clippy -D warnings · cargo test (20) · eslint
tsc --noEmit · vitest (15) · vite build · isolatie-check (8, met zelftest)
```

Alles groen op Linux, inclusief — voor het eerst — het compileren van de Tauri-schil.
Wat de poort niet vervangt: `npm run tauri dev` en de doorloop op de Mac.
