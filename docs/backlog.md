# Backlog — Lapis (repo `lapis`)

Een rustige markdown-editor voor een map met `.md`-bestanden op de Mac. Single purpose:
**schrijven en terugvinden in je eigen map, zonder dat iets je bestanden in gevaar brengt.**
Nieuwe taken maken dat doel betrouwbaarder of prettiger. Wat Obsidian verder doet (graph,
plugins, tags, query's) is anti-scope ([PRD §5](03-prd.md#5-anti-scope)).

Afgeronde taken en de bouwgeschiedenis W0–W9 staan in het [archief](archief.md). De
analyse die de P0- en P1-taken hieronder opleverde: [10 – Analyse oktober 2026](10-analyse-oktober-2026.md).

## Prioriteit (open taken)

| Prio | # | Taak | Epic | Hangt af van | Model |
|---|---|---|---|---|---|
| P1 | 6 | Contracttest over de IPC-grens (vangt de klasse van #1) | A | — | Opus 5.5 |
| **P1** | **7** | **Eerste doorloop op de Mac** | A | — | Jos |
| P1 | 8 | Hernoemen/verplaatsen/prullenbak van de open notitie verliest getypte tekst | A | — | Opus 5.5 |
| P1 | 9 | Alleen-hoofdletter hernoemen faalt op APFS | A | — | Sonnet 5.5 |
| P1 | 10 | Startpagina en recente paden volgen een verplaatsing niet | A | — | Sonnet 5.5 |
| P1 | 11 | `[[wikilinks]]` en gewone links doen niets | B | 7 | Opus 5.5 |
| P1 | 12 | Bijlage-migratie breekt relatieve links; map hernoemt niet mee (C8) | B | besluit Jos | Opus 5.5 |
| P2 | 13 | De vorm (was W10): ontwerp | C | 7 | Jos |
| P2 | 14 | De vorm: bouwen (typografie, licht/donker, lege staten, dialogen) | C | 13 | Opus 5.5 |
| P2 | 15 | Instellingenscherm | C | 13 | Sonnet 5.5 |
| P2 | 16 | `⌘N` voor een nieuwe notitie | B | — | Haiku 5.5 |
| P3 | 17 | Regeleindes: LF bevestigen | A | besluit Jos | Jos |
| P3 | 18 | Bestandsnaam uit kopregel kan langer dan 255 bytes worden | A | — | Haiku 5.5 |
| P3 | 19 | Atomair schrijven: rechten, Finder-tags, `F_FULLFSYNC` | A | besluit Jos | Opus 5.5 |
| P3 | 20 | Bijlage niet atomair geschreven; één rare submap breekt de hele scan | A | — | Sonnet 5.5 |
| P3 | 21 | `spike/` opruimen, CI niet meer dubbel | D | 7 | Haiku 5.5 |

Afhankelijkheden: `7 ─► 11`, `7 ─► 13 ─► 14`, `13 ─► 15`, `7 ─► 21`.

**Volgorde.** De P0-bugs #1–#5 zijn opgelost (zie het [archief](archief.md)), maar alleen
bewezen met tests op Linux. Sinds v0.1.0 staat er een installeerbare `Lapis.dmg`
op de releasepagina. Nu eerst #7: pas na een echte doorloop weten we wat er verder
stuk is, want 132 Rust-tests en 135 frontendtests waren allemaal groen terwijl opslaan
niet werkte. De vorm (13–15) komt pas na 7. Wie ontwerpt voordat de basis bewezen werkt,
ontwerpt een app die niemand kan gebruiken.

---

## Projectcontext (verplichte leesstof bij élke taak)

### Architectuur (`app/`)

- **`vault-core`** (Rust, geen Tauri): alle bestandslogica. Padveiligheid (`resolve_in_root`:
  componentcontrole + canonicalisatie), boom scannen, lezen, atomair schrijven,
  aanmaken/verplaatsen/prullenbak, bijlagen. `Session` houdt de vault-root vast; de
  frontend geeft nooit een root mee (B1).
- **`app-state`** (Rust): `~/Library/Application Support/Lapis/settings.json`: vault-root,
  sidebar, recente paden, startpagina. Nooit in de vault.
- **`search-index`** (Rust): SQLite FTS5, één wegwerpbaar bestand per vault in
  `Application Support/Lapis/search-index/`.
- **`src-tauri/src/main.rs`**: dunne schil. Commands vertalen naar de drie crates; DTO's
  met `camelCase`; tijden als **milliseconden** over de grens (`millis_since_epoch`).
- **Frontend** (`src/`, React 19 + CodeMirror 6 via `@atomic-editor/editor`):
  `App.tsx` (welke notitie open is), `useNoteEditor.ts` (autosave 500 ms, `⌘S`,
  focusmodel, conflict), `useDraftNote.ts` (concept tot eerste opslag), `NoteView.tsx`
  (editor + extensies), `attachment*.ts` (bijlagen), `Tree.tsx`, `QuickSwitcher.tsx`,
  `FullTextSearch.tsx`, `ipc.ts` (alle `invoke`-aanroepen).
- **Isolatie:** `scripts/isolatie-check.sh`: geen hardgecodeerde paden, geen netwerk in de
  kern, geen fs-plugin in de frontend, root-autoriteit in Rust.

### Bewuste keuzes (niet "verbeteren")

- **Jouw bestanden zijn heilig** (PRD principe 1): niets app-eigens in de vault, nooit
  permanent verwijderen (systeemprullenbak), nooit stil overschrijven.
- **De frontend kiest een map, maar geeft nooit een root mee** (B1). Elk pad over IPC is
  relatief.
- **Nieuwe notitie bestaat pas na de eerste opslag**, genoemd naar de kopregel op dat moment
  (C5+V3). Daarna verandert typen in de kop nooit meer de bestandsnaam.
- **Conflict = balk met drie keuzes** (PRD §10 besluit 1), geen automatische merge.
- **Bestaande notities en bijlagen migreren nooit vanzelf** (V3).
- **Geen netwerk, geen telemetrie, geen update-check** (PRD §8).
- **De index is wegwerpbaar**: bij twijfel weggooien en opnieuw bouwen, nooit migreren.
- **Eén venster, geen tabs, geen statusbalk, geen thema-keuze** (F6).

### Valkuilen

1. **Groene tests ≠ werkende app.** De frontendtests mocken `ipc.ts` en de Rust-tests
   gebruiken `SystemTime` zonder de ms-conversie. Wat tussen die twee in zit, de echte
   IPC-grens, de CSP en de WKWebView, wordt door niets getest. Zie #1, #2 en #6.
2. **jsdom is geen WKWebView.** `window.prompt`/`confirm`, `window.open`, CSP en
   clipboard-gedrag zijn in tests altijd "goed". Alles wat daarvan afhangt is onbewezen
   tot de doorloop op de Mac.
3. **APFS is hoofdletterongevoelig** en heeft nanoseconde-tijdstempels. Linux-CI (ext4)
   is hoofdlettergevoelig: tests die daar slagen kunnen op de Mac anders uitpakken.
4. **Schrijftests nooit tegen een echte vault** (V6a/V6b). Alleen tijdelijke
   fixture-vaults. Jos test pas tegen zijn eigen vault na `git init` + commit.
5. **Bestaande tests en fixtures zijn onaantastbaar.** Een rode test betekent dat de code
   fout is, niet de test. Wil je toch een test wijzigen: stop en meld het.
6. **Byte-behoud.** Geen `.trim()`, normalisatie of herformattering van notitie-inhoud
   zonder dat de taak daar expliciet om vraagt.
7. **Het pad van een open notitie kan veranderen zonder remount** (W8-migratie).
   Callbacks die het pad nodig hebben, lezen het via een ref (`notePathRef`,
   `onPasteImageRef`), niet uit een closure van mount-tijd.

### Werkwijze

- **Klein snijden, één taak per sessie, vaste volgorde.** De drie wave-documenten zijn
  vervallen ([07 §9](07-wave-methode.md#9-evaluatie-wat-de-methode-heeft-opgeleverd)); deze
  backlog vervangt de wave-indeling.
- **Een beslissing die de PRD raakt, eerst voorleggen** en het antwoord in de taak
  noteren.
- **Een bug eerst reproduceren in een test**, dan pas de fix. Een taak zonder reproductie
  heet "onbewezen" tot er een is.
- **Updaten:** sinds v0.2.0 via `tauri-plugin-updater` (PRD §8, besluit 11-10-2026). Een
  release zonder `latest.json` laat iedereen stil op de oude versie; `release.yml` weigert
  daarom een tag zonder de signing-secrets.
- **Uitbrengen:** versie gelijk in `app/package.json`, `app/src-tauri/Cargo.toml` en
  `tauri.conf.json`, dan een `v*`-tag; `release.yml` bouwt de DMG en maakt de release.
  Een tag pushen kan alleen Jos: cloud-sessies mogen uitsluitend naar hun eigen branch.
- **Werken in de cloud:** de poort hieronder draait op Linux; wat alleen op de Mac te zien
  is, staat in de taak als stap voor Jos.

### Definition of done (elke taak)

1. De poort is groen, in `app/`: `cargo fmt --all -- --check` · `cargo clippy --workspace
   --all-targets -- -D warnings` · `cargo test --workspace` · `npm run lint` ·
   `npm run typecheck` · `npm test` · `npm run build` · `bash ../scripts/isolatie-check.sh`.
2. Er is een test die faalde vóór de fix en slaagt erna. Voor alles wat de IPC-grens
   raakt (tijden, paden, DTO's) loopt die test door dezelfde conversie als `main.rs`.
3. Raakt de taak gedrag of UI: in de taakuitkomst staat een korte checklist voor Jos om op
   de Mac na te lopen (in de DMG van de Release-run, of `npm run tauri dev`).
4. De taak gaat uit deze backlog; de uitkomst komt in één regel in het [archief](archief.md).

### Modelkeuze

| Model | Sterk in | Valkuilen |
|---|---|---|
| **Haiku 5.5** | Mechanische wijzigingen met een vastgelegd "hoe" (één regel CSP, een guard, een sneltoets) | Mist constraints die niet in de briefing staan |
| **Sonnet 5.5** | Begrensde fixes over 2–3 bestanden, Rust ↔ TS | Vult gaten met de meest voor de hand liggende aanname; dwing DoD punt 2 af |
| **Opus 5.5** | Invarianten over lagen heen (pad-identiteit, focusmodel, IPC), React-lifecycles, ontwerp | Scope creep; geef een out-of-scope-lijst mee |
| **Fable 5.1** | Zwaarste ontwerp-/redeneerwerk | Alleen als Opus aantoonbaar tekortschiet |

Draait de sessie op het toegewezen model: zelf doen. Anders een Agent met `model:`.
Parallelle agents die `App.tsx` of `useNoteEditor.ts` raken alleen in een eigen worktree.

---

## Epic A: Je bestanden zijn veilig

#### ⬜ 6. Contracttest over de IPC-grens — P1

**Probleem.** #1 kon bestaan omdat geen enkele test door `main.rs` loopt: frontendtests
mocken `ipc.ts`, Rust-tests roepen `vault-core` direct aan. De tijdconversie, de
DTO-vormen en de padafhandeling tussen die twee zijn onbewaakt.

**Briefing.** De command-functies in `main.rs` zijn gewone functies met `State<'_, T>`.
Haal de logica eruit in functies die `&Session`/`&IndexState` aannemen (de `#[tauri::command]`
wordt een één-regel-wrapper) en test die met een tijdelijke vault: `read_note` → `write_note`
met de `modified_ms` uit de vorige stap → `saved`; `create_note` → `write_note` → `saved`;
`write_attachment` met migratie → `read_note` op het nieuwe pad. Geen nieuwe dependencies.

**Acceptatie:** de testsuite van `src-tauri` faalt als `write_note` weer op volle
precisie vergelijkt (tijdelijk terugdraaien als bewijs) en slaagt met de huidige code; DoD.

**Model: Opus 5.5.** Out of scope: geen e2e met een echte webview, geen tauri-driver.

#### ⬜ 7. Eerste doorloop op de Mac — P1 (Jos)

**Probleem.** Geen enkele wave heeft ooit gestructureerd tegen een echte vault in de echte
app gedraaid. (Wel een eerste losse macOS-toets van de W10-UI in augustus, commit `e07bb48`;
die keek naar de vorm, niet naar de checklist hieronder.)
Onbewezen en direct van belang: `window.prompt`/`confirm` in de Tauri-webview (daar hangen
hernoemen, verplaatsen, nieuwe map, prullenbak, de waarschuwing bij onopgeslagen werk en
"hun versie laden" aan), het focusmodel, plakken uit het klembord, `⌘⇧F` op de echte
vault.

**Briefing (Jos).**
1. Kopie van de vault, daarin `git init && git add -A && git commit -m vóór-lapis`.
2. Lapis installeren uit de DMG (README → Installeren, de downloadlink), de kopie openen.
   Zo test je de echte bundel, met de CSP en de ad-hoc-handtekening zoals ze uitgeleverd
   worden. `npm run tauri dev` alleen om een fout te debuggen.
3. Nalopen, eerst de fixes uit #1–#5: notitie bewerken (géén conflictbalk) · een
   notitie met een bestaande afbeelding toont die · screenshot plakken, twee keer
   (beide verschijnen inline, ook in Obsidian) · de app start überhaupt na `install.sh`
   (Gatekeeper, ad-hoc-handtekening, universal build op jouw chip) · "Nieuwe notitie", dan meteen een andere
   notitie aanklikken (opent) · "Nieuwe notitie", dan `⌘Tab` weg (géén `Untitled.md`).
   Daarna de rest: notitie bewerken · `echo x >> notitie.md` in Terminal terwijl
   Lapis op de achtergrond staat → bij terugkeer zichtbaar · idem terwijl je typt →
   conflictbalk, alle drie de knoppen · nieuwe notitie met kop · hernoemen, verplaatsen,
   nieuwe map, prullenbak (verschijnt er überhaupt een invoervenster?) · screenshot plakken
   (twee keer) · `⌘K`, `⌘⇧F`, `⌘⇧H` · startpagina instellen, herstarten.
4. Na afloop `git status` en `git diff` in de vault: alleen wijzigingen die je zelf maakte.
   Een onverwachte diff is een dataverlies-incident (PRD §6).
5. Bevindingen als nieuwe taken in deze backlog.

**Acceptatie:** checklist doorlopen; `git diff` verklaard; nieuwe taken toegevoegd.

#### ⬜ 8. Hernoemen/verplaatsen/prullenbak van de open notitie verliest getypte tekst — P1

**Probleem.** `renameFile`/`moveFile` in `App.tsx` roepen `moveNote` aan zonder eerst te
flushen. Daarna laat `openNote(newRelPath)` de editor ontmounten, en de cleanup in
`useNoteEditor` schrijft de laatste tekst naar het **oude** pad. Dat bestaat niet meer
(`NotFound`, alleen een statusregel), dus alles wat in de laatste 500 ms getypt is, is
weg. Bij de prullenbak gebeurt hetzelfde. Schending van "getypte tekst gaat nooit
verloren" (F3).

**Briefing.** Vóór elke bestandsbewerking op de open notitie eerst `flush()`. Daarna het pad
bijwerken zonder remount, zoals W8 al doet (`handleNoteMoved`), in plaats van `openNote`.
`NoteEditor` krijgt daarvoor een imperatieve handle of een `flush`-callback naar boven.

**Acceptatie:** test: typen → binnen 500 ms hernoemen → de tekst staat in het nieuwe bestand;
DoD.

**Model: Opus 5.5.** Valkuil: de W8-race (cleanup naar een oud pad) is hier precies
hetzelfde mechanisme; los ze op één manier op, niet twee.

#### ⬜ 9. Alleen-hoofdletter hernoemen faalt op APFS — P1

**Probleem.** `notitie.md` → `Notitie.md`: `move_note` checkt `to.exists()`, en op een
hoofdletterongevoelig volume is dat `true` (het is hetzelfde bestand). Het resultaat is
"bestaat al", en hernoemen kan niet. Linux-CI ziet dit niet (valkuil 3).

**Briefing.** Als `from` en `to` naar hetzelfde bestand wijzen (zelfde `dev`+`ino` via
`std::os::unix::fs::MetadataExt`), de `rename()` gewoon uitvoeren. Een test die dit op Linux
bewijst kan niet; schrijf de test met een tweede hardlink-pad als stand-in, en zet de
Mac-check in de checklist.

**Acceptatie:** test met hetzelfde-inode-geval; op de Mac werkt `notitie` → `Notitie`; DoD.

**Model: Sonnet 5.5.**

#### ⬜ 10. Startpagina en recente paden volgen een verplaatsing niet — P1

**Probleem.** Hernoemen, verplaatsen of de bijlage-migratie (W8) van de startpagina laat
`start_page` in `settings.json` op het oude pad staan. Bij de volgende start "verdwijnt" de
startpagina en wordt de instelling stilzwijgend gewist (F7-gedrag voor een échte
verdwijning, hier onterecht). Recente paden worden ook niet bijgewerkt, dus `⌘K` toont een
dode regel bovenaan.

**Briefing.** In `app-state` een `rename_path(from, to)` die `start_page` en `recent_paths`
bijwerkt. Aanroepen vanuit `move_note` en `write_attachment` (bij `note_moved`) in `main.rs`.
De frontend-state (`startPage`, `recentPaths`) meenemen.

**Acceptatie:** tests in `app-state`; startpagina hernoemen, herstarten → opent nog; DoD.

**Model: Sonnet 5.5.**

#### ⬜ 17. Regeleindes: LF bevestigen — P3 (besluit Jos)

PRD §8 zegt "UTF-8, LF-regeleindes, precies zoals Obsidian schrijft", en de app schrijft
nu altijd LF (de editor normaliseert; de spike-stap `lineEndings.ts` is niet meegenomen).
Een CRLF-notitie wordt dus bij de eerste bewerking in zijn geheel LF. Dat botst met F2
("byte-voor-byte gelijk buiten de bewerking"). **Voorstel:** LF accepteren en in F2
vastleggen als uitzondering, en eerst tellen of de echte vault überhaupt CRLF-bestanden
heeft (`grep -rlI $'\r' --include='*.md' . | wc -l`). Zijn het er nul, dan is dit gratis.
Zie [09 §7](09-code-analyse-en-verbeterplan.md#7-stand-van-uitvoering).

#### ⬜ 18. Bestandsnaam uit kopregel kan langer dan 255 bytes worden — P3

`note_name_stem` kapt af op 120 **tekens**; APFS staat 255 **bytes** UTF-8 toe. Een kop van
120 emoji (4 bytes per stuk) laat `create_note` falen met een rauwe `Io`-fout. Afkappen op
bytes, op een tekengrens. Test met emoji en met combinerende accenten. **Model: Haiku 5.5.**

#### ⬜ 19. Atomair schrijven: rechten, Finder-tags, `F_FULLFSYNC` — P3 (besluit Jos)

`write_atomically` maakt een nieuw bestand en hernoemt het. Gevolgen: bestandsrechten en
extended attributes (Finder-tags, kleurlabels) van het origineel gaan verloren, een hardlink
wordt doorgeknipt, en `sync_all` is op macOS geen `F_FULLFSYNC` (de data kan nog in de
schijfcache zitten). De map zelf wordt na `rename()` niet gefsynct. Voor een vault onder git
of Obsidian is dit meestal onzichtbaar; voor wie Finder-tags gebruikt niet. **Besluit Jos:**
xattrs en rechten kopiëren (`fs::set_permissions` + `xattr`-crate), of accepteren en
vastleggen. **Model: Opus 5.5.**

#### ⬜ 20. Bijlage niet atomair; één rare submap breekt de scan — P3

- `write_attachment` gebruikt `fs::write` in plaats van `write_atomically`: een crash halverwege
  laat een halve afbeelding achter. Dezelfde helper gebruiken.
- `scan_children` geeft bij elke submapfout behalve `PermissionDenied` de fout door
  (`Err(e) => return Err(e)`), en dan opent de hele vault niet. Net als bij
  `PermissionDenied` de map tonen als onleesbaar.

**Model: Sonnet 5.5.**

---

## Epic B: Schrijven en vinden (PRD-gaten)

#### ⬜ 11. `[[wikilinks]]` en gewone links doen niets — P1, na 7

**Probleem.** PRD F2/C2: "`[[wikilinks]]` worden gerenderd én zijn klikbaar". De editor zet
`wikiLinks()` niet standaard aan en `NoteView` voegt hem niet toe, dus wikilinks zijn
platte tekst. Gewone links vallen terug op `window.open(url, '_blank')`. Wat dat in de
Tauri-webview doet is onbewezen (waarschijnlijk niets). Een relatieve link naar een andere
notitie (`[x](ander.md)`) opent dus ook niets.

**Briefing.**
1. `wikiLinks({ resolve, onOpen })` toevoegen in `NoteView`, met `resolve` tegen de boom
   (Obsidian-regel: kortste uniek pad, case-insensitief, `.md` optioneel) en `onOpen` →
   `openNote`. Geen `suggest` (autocomplete is geen PRD-eis).
2. `onLinkClick`: relatief pad naar een `.md` → `openNote` (opgelost t.o.v. de map van de
   notitie); `http(s)` → systeembrowser via de Tauri-opener-plugin, met één permissie in
   `capabilities/default.json`. **Besluit Jos:** valt "een link openen in je browser" binnen
   "geen netwerk" (PRD §8)? Het is netwerk van de browser, niet van Lapis. Voorstel: ja,
   toegestaan.
3. De isolatie-check aanpassen als de opener-plugin erbij komt (en uitleggen waarom).

**Acceptatie:** wikilink klikbaar en opent de juiste notitie; dode wikilink zichtbaar als
"missing"; relatieve link opent; externe link opent de browser (na besluit); DoD.

**Model: Opus 5.5.**

#### ⬜ 12. Bijlage-migratie breekt relatieve links; map hernoemt niet mee — P1 (besluit Jos)

**Probleem.**
1. Bij de eerste bijlage verhuist `map/Notitie.md` naar `map/Notitie/Notitie.md`, een map
   dieper. Elke relatieve link in die notitie (`![](../plaatje.png)`, `[x](ander.md)`) wijst
   daarna naar de verkeerde plek. Wikilinks hebben er geen last van; markdown-links wel.
2. PRD F5/C8: "Hernoemen van de notitie hernoemt de map mee." `move_note` hernoemt alleen
   het bestand; een notitie in haar eigen map wordt dan `Notitie/Nieuw.md` en is daarna
   niet meer "in haar eigen map", en de volgende bijlage maakt een tweede map.

**Besluit Jos vooraf** (punt 1): (a) relatieve links in de notitie herschrijven bij de
migratie: Lapis wijzigt dan tekst die je niet typte, maar wel correct; (b) migratie
weigeren als de notitie relatieve links bevat, en de bijlage naast de notitie zetten;
(c) accepteren en documenteren. **Voorstel: (a)**, alleen voor links die aantoonbaar naar
een bestaand bestand wezen, en met de wijziging zichtbaar in de statusregel.

**Briefing (punt 2):** `move_note` op een notitie die in haar eigen map staat
(`X/X.md`), binnen dezelfde map hernoemd → map en bestand samen hernoemen. Verplaatsen naar
een andere map → de hele map verplaatsen. Tests voor beide.

**Model: Opus 5.5.**

#### ⬜ 16. `⌘N` voor een nieuwe notitie — P2

PRD §7 ("`⌘N` → typen → weg") en de knop bestaat, maar de sneltoets niet. Toevoegen aan de
keydown-handler in `App.tsx` naast `⌘K`; opent een concept in de vault-root. Test.
**Model: Haiku 5.5.**

---

## Epic C: De vorm (was W10)

PRD F6 en principe 7: het ontwerp is het onderscheidend vermogen.

**Correctie (11-10-2026):** de analyse van oktober en deze epic gingen uit van een kale
wireframe, maar W10 was in augustus grotendeels gebouwd op `claude/verder-gaan-h13h0z`
(Stitch-ontwerp, `styles.css`, iconen, instellingenscherm, app-icoon, [stijlgids](10-stijlgids.md)).
Die tien commits zijn na josbez/lapis#22 nooit gemerged en kwamen pas in v0.2.0 mee.
De taken hieronder moeten na #7 opnieuw tegen die versie gelegd worden: wat is af, wat
ontbreekt nog (zie [10 §4](10-analyse-oktober-2026.md#4-design-review) voor de punten die
op de wireframe gebaseerd waren).

#### ◐ 13. Ontwerp — P2, na 7 (Jos)

*Grotendeels gedaan via Stitch in augustus; nog na te lopen welke schermen ontbreken.*

Jos ontwerpt via Stitch/Claude Design (05 F1–F3). Minimaal: venster met sidebar en editor
(licht en donker), lege staat zonder vault, lege staat zonder open notitie,
conflictbalk, quick switcher, zoeken, contextmenu, de dialogen voor hernoemen,
verplaatsen en nieuwe map, en het instellingenscherm. Uitkomst: design tokens
(kleur, type, ruimte) plus schermen.

#### ⬜ 14. De vorm bouwen — P2, na 13

**Briefing.**
- Tokens als CSS-variabelen in één bestand, `prefers-color-scheme` (geen thema-keuze),
  `prefers-reduced-motion`, systeemtekstgrootte (PRD §8).
- `window.prompt`/`confirm` vervangen door eigen dialogen (ook als #7 aantoont dat ze werken:
  ze zijn niet te stylen en blokkeren de UI-thread).
- Statusregel: niets tonen bij succes ("opgeslagen 14:03:22" na elke autosave is precies
  de ruis die P2 noemt); alleen fouten en het conflict.
- Toolbar met vier tekstknoppen en het volle vaultpad weg; F6 zegt "geen statusbalk, geen
  breadcrumbs".
- Contextmenu met het toetsenbord (menutoets/`⇧F10`, pijltjes), binnen het venster
  geklemd; quick switcher en zoeken als overlay met focus-trap.
- Externe afbeeldingen: nette placeholder in plaats van het gebroken-afbeeldingsicoon (#2).

**Acceptatie:** Jos beoordeelt (F6); contrast WCAG 2.2 AA in licht en donker; volledig met
het toetsenbord te bedienen; DoD.

**Model: Opus 5.5.** Valkuil: geen eigen smaak toevoegen boven het ontwerp van Jos.

#### ◐ 15. Instellingenscherm — P2, na 13

*`Settings.tsx` bestaat sinds W10 (vault en startpagina); na te lopen tegen deze taak.*
Eén scherm (F6). Wat er nu instelbaar is: de vault (andere map kiezen) en de startpagina
(wissen). Sidebar zichtbaar is een toggle, geen instelling. Elke instelling moet zich
verantwoorden; tel ze bij elke release (PRD §6). **Model: Sonnet 5.5.**

---

## Epic D: Onderhoud

#### ⬜ 21. `spike/` opruimen — P3, na 7

De W0-spike is gesloten als achterhaald, maar draait nog als eigen CI-job
(`controle-spike`) en wordt meegenomen in de isolatie-check. Na de eerste geslaagde
doorloop (#7) weghalen: map, CI-job en de verwijzingen in `isolatie-check.sh`. De
bewijsdocumenten in `docs/waves/W0-spike/` blijven staan. Meteen meenemen: `ci.yml` draait
op `push` én `pull_request`, dus elke check staat dubbel in een PR. `push` beperken tot de
standaardbranch. **Model: Haiku 5.5.**

---

## Later (geen prioriteit)

- **Afbeeldingen opnieuw gelezen bij scrollen:** CodeMirror maakt widgets opnieuw aan, en elke
  nieuwe `<img>` doet een nieuwe `read_attachment` en een nieuwe blob-URL (vrijgegeven pas bij
  het sluiten van de notitie). Cachen per pad.
- **Base64 per byte opbouwen** in `arrayBufferToBase64`: traag bij foto's van meerdere MB.
  `FileReader.readAsDataURL` of in blokken.
- **Conflict bij `keepBoth` en een gelijktijdige save:** `savingRef` laat een tweede
  `doSave` stil vallen in plaats van hem na de eerste te laten lopen. Bij `flush()` vóór een
  bijlage kan zo een nog lopende save niet afgewacht worden.
- **Mappen naar de prullenbak** (nu alleen bestanden).
- **Concept: tekst getypt tijdens het bijschrijven na `create_note`.** `useDraftNote` geeft
  `contentRef.current` door aan `onCreated` ná de `await writeNote`; wat in díe paar
  milliseconden getypt wordt, telt als opgeslagen zonder het te zijn. Venster van één
  IPC-rondgang; `typed` doorgeven en de editor daarna laten bijwerken.
- **Standaardnaam van geplakte afbeeldingen** (`Geplakte afbeelding 1.png`): de teller begint
  bij elke start opnieuw, dus botsingen geven `… 1 2.png`. Een tijdstempel in de naam is
  netter.
- **Dialoog verschijnt niet synchroon na een sneltoets.** In jsdom stond het venster van
  `⌘K`/`⌘⇧F` soms pas een tick na `fireEvent.keyDown` (2 op 5 runs faalde). De tests wachten
  nu met `findByRole` (josbez/lapis#24); waaróm de render uitgesteld wordt is niet
  uitgezocht. Waarschijnlijk onschuldig, maar onverklaard.
- **README inkorten:** het bouwverslag per wave kan naar het archief.
