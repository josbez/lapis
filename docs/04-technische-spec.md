# 04 – Technische optieverkenning · GEEN SPEC

> ⚠️ **Dit heet geen spec meer, want het is er geen.**
>
> Ik heb hier keuzes vastgelegd die aan Jos zijn: Tauri boven Electron, Svelte, SQLite
> FTS5, autosave, de conflictafhandeling, de prestatiegetallen, het testbeleid en de
> milestone-indeling. Lees het als *uitgewerkte optie*, niet als besluit.
>
> - De keuzes liggen terug als open vragen in [05, sectie D en E](05-open-vragen.md#d-techniek).
> - De onderbouwing om die vragen te kunnen beantwoorden — inclusief de argumenten vóór
>   Electron die hier ontbreken — staat in
>   [06 – Beslisinput techniek](06-beslisinput-techniek.md).
> - Een echte specificatie ontstaat later per wave, volgens
>   [07 – Wave-methode](07-wave-methode.md), en niet voor het hele product tegelijk.

De vastgestelde scope staat in [PRD v1.0](03-prd.md); daar zijn de stackkeuzes
inmiddels ook beantwoord (Tauri v2 · React · CodeMirror 6 via `atomic-editor` ·
SQLite FTS5). Dit document blijft staan als achtergrond bij die keuzes.

---

## 1. Overzicht

```
┌──────────────────────────────────────────────────────────┐
│  macOS-venster (Tauri, WKWebView)                        │
│                                                          │
│  ┌────────────┐  ┌──────────────────────────────────┐    │
│  │  Sidebar   │  │  Editor                          │    │
│  │  boom/tags │  │  CodeMirror 6 + live preview     │    │
│  └────────────┘  └──────────────────────────────────┘    │
│  Frontend: TypeScript + Svelte                           │
└───────────────────────┬──────────────────────────────────┘
                        │ Tauri IPC (commands + events)
┌───────────────────────┴──────────────────────────────────┐
│  Rust-kern                                               │
│  ┌────────┐  ┌─────────┐  ┌───────┐  ┌────────────────┐  │
│  │ vault  │  │ watcher │  │ index │  │ search         │  │
│  │ fs i/o │  │ notify  │  │ FTS5  │  │ fuzzy + fts    │  │
│  └────────┘  └─────────┘  └───────┘  └────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
        ┌───────────────┴───────────────┐
        ▼                               ▼
  ~/Notes/  (vault: alleen .md)   ~/Library/Application Support/lapis/
                                  (index.db, settings.json)
```

**De belangrijkste architectuurregel:** de vault bevat uitsluitend jouw bestanden. Index,
instellingen, cache en vensterstaat leven in Application Support. Dit is regel 1 uit de
PRD, in code afgedwongen door één schrijfpad (§5) dat weigert buiten `.md` te schrijven.

## 2. Stackkeuze

| Laag | Keuze | Waarom |
|---|---|---|
| Shell | **Tauri v2** | ~10 MB pakket, ~40 MB RAM idle, koude start ~380 ms. Bij een product waarvan de belofte "licht" is, is dit de propositie zelf. |
| Backend | **Rust** | Komt gratis met Tauri; fs, watcher en index horen daar. Bewust dun houden. |
| Frontend | **TypeScript + Svelte 5** | Geen virtual DOM, kleine bundel, weinig ceremonie. Alternatief React is alleen nodig als je `atomic-editor` ongewijzigd overneemt (zie §4). |
| Editor | **CodeMirror 6** | Het enige serieuze antwoord. Obsidian gebruikt het zelf. |
| Index | **SQLite (rusqlite) + FTS5** | Eén bestand, transactioneel, ruim snel genoeg tot tienduizenden notities. Tantivy is krachtiger en hier overbodig. |
| Watcher | **`notify`** | De standaard; gebruikt FSEvents op macOS. |
| Frontmatter | **`gray_matter` + `serde_yaml`** | Parsen zonder de originele bytes aan te tasten. |
| Fuzzy match | **`nucleo` of `fuzzy-matcher`** | Voor `⌘K`. |

**Afgewezen:** Electron (te zwaar — het probleem dat we oplossen), SwiftUI (verliest het
CodeMirror-ecosysteem op precies het moeilijkste onderdeel). Onderbouwing in
[haalbaarheid §4](02-haalbaarheidsonderzoek.md#4-technologiekeuze--open).

**Sandboxing:** v1 draait niet in de App Sandbox en wordt buiten de Mac App Store
gedistribueerd. Daarmee is directe toegang tot een gekozen map mogelijk zonder
security-scoped bookmarks. Zou Lapis ooit naar de MAS gaan, dan zijn
`startAccessingSecurityScopedResource()` / `stop…` nodig — Tauri ondersteunt dit nog niet
volledig. Dat is een expliciete afweging, geen omissie.

## 3. Modules in de Rust-kern

### `vault`
Kent de gekozen map en doet alle bestands-I/O.

```rust
fn open(path: PathBuf) -> Result<VaultHandle>
fn list(&self) -> Result<Vec<FileEntry>>     // recursief, alleen .md + afbeeldingen
fn read(&self, rel: &Path) -> Result<Note>    // inhoud + mtime + size
fn write(&self, rel: &Path, content: &str, expected_mtime: SystemTime) -> Result<WriteOutcome>
fn create(&self, rel: &Path) -> Result<()>
fn rename(&self, from: &Path, to: &Path) -> Result<()>
fn trash(&self, rel: &Path) -> Result<()>     // NSFileManager trashItem, geen unlink
```

Overgeslagen bij het scannen: `.git`, `.obsidian`, `.trash`, `node_modules`, alles wat
met `.` begint. Symlinks worden niet gevolgd (lus-risico).

### `watcher`
`notify` in recursieve modus op de vault-root. Twee zaken die het gedrag maken of breken:

- **Debounce van 300 ms.** FSEvents vuurt meerdere events per opslag; ongedebounced
  krijg je flikkerende UI.
- **Zelf-geschreven bestanden negeren.** Elke schrijfactie van Lapis zet het pad in een
  `HashSet<PathBuf>` met een tijdstempel; events die binnen 2 s op zo'n pad binnenkomen
  worden genegeerd. Zonder dit reageert de app op zijn eigen opslagacties en krijg je
  onterechte conflictmeldingen.

### `index`
SQLite in `~/Library/Application Support/lapis/<vault-id>/index.db`, waarbij `<vault-id>`
een hash van het absolute vault-pad is.

```sql
CREATE TABLE notes (
  path       TEXT PRIMARY KEY,     -- relatief aan de vault-root
  title      TEXT,                 -- frontmatter title, anders eerste H1, anders bestandsnaam
  mtime      INTEGER NOT NULL,
  size       INTEGER NOT NULL,
  frontmatter TEXT                 -- JSON
);

CREATE VIRTUAL TABLE notes_fts USING fts5(
  path UNINDEXED, title, body,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE tags (
  path TEXT NOT NULL,
  tag  TEXT NOT NULL,
  PRIMARY KEY (path, tag)
);
CREATE INDEX idx_tags_tag ON tags(tag);
```

- **Opbouw:** bij het openen van een vault wordt de index vergeleken met de mtimes op
  schijf; alleen gewijzigde bestanden worden opnieuw geïndexeerd. Volledige eerste
  opbouw van 5.000 notities: enkele seconden, op een achtergrond-thread, met de UI al
  bruikbaar.
- **Bijwerken:** elk watcher-event en elke eigen opslag werkt één rij bij. Dat houdt de
  eis "opgeslagen notitie is direct vindbaar" waar.
- **Wegwerpbaar:** de index mag altijd verwijderd worden. Bij schema-mismatch wordt hij
  opnieuw opgebouwd. Nooit iets opslaan dat alleen in de index bestaat.

### `search`
Twee onafhankelijke paden:

- **Quick switcher:** fuzzy match over `path` + `title` in het geheugen (een `Vec` van
  alle paden, ook bij 20k notities verwaarloosbaar). Recent geopend eerst.
- **Full-text:** FTS5 `MATCH` met BM25-ranking, met `snippet()` voor de fragmenten en
  gemarkeerde treffers. `tag:naam` wordt vóór de query afgevangen en vertaald naar een
  join op `tags`.

## 4. De editor

**Basis:** CodeMirror 6 met een live-preview-laag. Twee routes:

1. **`atomic-editor` (MIT, React) overnemen.** Snelst — koppen, bold, highlights,
   tabellen met in-place bewerken, afbeeldingen, links, takenlijsten, `[[wikilinks]]`,
   codeblokken en slim lijstgedrag zitten erin, met virtualisatie voor grote documenten.
   Kosten: React als frontend-framework.
2. **`codemirror-live-markdown` als losse extensies.** Framework-onafhankelijk, past bij
   Svelte, iets meer eigen werk.

**Aanbeveling:** bepaal dit in de M0-spike, niet nu. Bouw de spike met route 1 (React),
omdat die het snelst antwoord geeft op de enige vraag die telt: *wil ik hierin typen?*
Bevalt het gedrag maar niet React, dan is de overstap naar route 2 een week werk — een
prima prijs voor een beslissing die je met echte informatie neemt.

**Werking van live preview, kort:** een `ViewPlugin` bouwt een `DecorationSet` op basis
van de Lezer-markdown-syntaxboom. Markdown-syntax binnen de regel waar de cursor staat
blijft zichtbaar; daarbuiten wordt hij verborgen (`Decoration.replace`) en krijgt de
inhoud opmaak (`Decoration.mark`). Blok-elementen zoals afbeeldingen en tabellen worden
`Decoration.widget`. Het document zelf blijft altijd ruwe markdown — kopiëren, opslaan
en undo werken daardoor als in een gewone textarea.

**Wikilinks in v1:** renderen als klikbare, opgemaakte tekst en blijven byte-identiek in
het bestand. Klikgedrag en autocomplete zijn v1.1 (zie PRD §4, Should).

## 5. Opslagmodel en conflicten

Het enige onderdeel waar een fout onherstelbaar is. Daarom expliciet.

**Opslaan:**

1. Debounce 500 ms na de laatste toetsaanslag; direct opslaan bij focusverlies, bij het
   wisselen van bestand en bij het sluiten van het venster.
2. Vergelijk de mtime op schijf met de mtime van het moment van openen.
3. **Gelijk** → schrijf atomair: naar `.<naam>.md.tmp` in dezelfde map, `fsync`, dan
   `rename()` over het origineel. Rename binnen hetzelfde volume is atomair; halve
   bestanden bestaan niet.
4. **Verschillend** → niet schrijven. Toon een balk: *"Dit bestand is buiten Lapis
   gewijzigd."* met drie keuzes: **Mijn versie behouden** (overschrijft), **Hun versie
   laden** (verwerpt jouw wijzigingen na bevestiging), **Beide bewaren** (schrijft jouw
   versie als `naam (conflict 2026-08-05 14:22).md`).

**Nooit:** stil overschrijven, stil herladen, of de gebruiker met een keuze
confronteren waarbij de veilige optie niet de standaard is.

**Bestand extern gewijzigd terwijl het open is en niet vuil:** stil herladen mag —
er valt niets te verliezen.

**Extra vangnet:** vóór elke overschrijvende actie schrijft Lapis de vorige inhoud naar
`~/Library/Application Support/lapis/<vault-id>/backups/`, met een bewaartermijn van 7
dagen. Kost bijna niets en dekt de restcategorie fouten af. Buiten de vault, conform
regel 1.

## 6. IPC-oppervlak

Klein houden; elke command is een contract.

```ts
// commands (frontend → Rust)
open_vault(path: string): VaultInfo
list_files(): FileEntry[]
read_note(path: string): { content: string; mtime: number }
write_note(path: string, content: string, expectedMtime: number): WriteOutcome
create_note(path: string): void
rename_note(from: string, to: string): void
trash_note(path: string): void
search_fulltext(query: string, limit: number): SearchHit[]
search_files(query: string, limit: number): FileHit[]
list_tags(): { tag: string; count: number }[]
notes_by_tag(tag: string): FileEntry[]

// events (Rust → frontend)
"vault:changed"    → { added: string[]; modified: string[]; removed: string[] }
"index:progress"   → { done: number; total: number }
```

`WriteOutcome` is een union: `{ ok: true, mtime }` of `{ ok: false, reason: "conflict",
theirMtime, theirContent }`. De conflict-situatie zit dus in het typesysteem, niet in
een uitzonderingspad dat je kunt vergeten.

## 7. Prestatiebudget

Deze getallen zijn acceptatiecriteria, geen ambities. Bij overschrijding wordt er niet
verder gebouwd tot het weer klopt.

| Meting | Budget | Meetmoment |
|---|---|---|
| Koude start tot typbaar | < 1.000 ms | Elke milestone |
| Vault openen, 5.000 notities, boom zichtbaar | < 500 ms | M1 |
| Volledige index, 5.000 notities (achtergrond) | < 10 s | M3 |
| Toetsaanslag → pixel, document van 5.000 woorden | < 16 ms | M2 |
| Full-text zoekresultaten | < 100 ms | M3 |
| Geheugengebruik idle | < 150 MB | v1.0 |
| Pakketgrootte (.dmg) | < 20 MB | v1.0 |

## 8. Milestones

| # | Naam | Inhoud | Inschatting | Klaar wanneer |
|---|---|---|---|---|
| **M0** | Spike | Tauri-project, map kiezen, één `.md` in live preview bewerken en opslaan | 2 avonden | Je hebt er een echte notitie in getypt en wilde niet terug |
| **M1** | Lezen | Bestandsboom, navigeren, watcher, index-skelet | 1 week | 2.000 notities openen < 1 s |
| **M2** | Schrijven | Volledige live preview, autosave, conflictafhandeling, atomair schrijven | 2 weken | Byte-voor-byte round-trip met Obsidian klopt |
| **M3** | Vinden | FTS5-index, `⌘K`, `⌘⇧F` | 1 week | Zoeken < 100 ms bij 5.000 notities |
| **M4** | Tags | Frontmatter ingeklapt, tag-overzicht, `tag:`-zoeken | 4 dagen | Gemengde tag-conventies geven één lijst |
| **M5** | Beheer | Nieuw/hernoemen/prullenbak/verslepen | 4 dagen | Alle operaties zonder index-drift |
| **M6** | Uiterlijk | Typografie, licht/donker, sneltoetsen, lege staten, instellingenscherm | 1–2 weken | > 85% van het scherm is tekst/witruimte |

**Totaal: 6–9 weken avondwerk.** M6 is bewust ruim: dat is het product, niet de
afwerking. Bouw als iets uitloopt liever M6 volledig en schuif een Should-item door.

**Volgorde-advies:** ga na M2 meteen echt gebruiken, ook zonder zoeken. Wat je in die
weken irriteert, is betrouwbaardere backlog-input dan wat je nu kunt bedenken.

## 9. Repo-indeling

```
lapis/
├─ docs/                 # dit dossier
├─ src/                  # frontend (TS)
│  ├─ lib/editor/        # CodeMirror-setup en live-preview-extensies
│  ├─ lib/ui/            # sidebar, zoekpaneel, instellingen
│  └─ lib/ipc.ts         # getypte wrappers om de Tauri-commands
├─ src-tauri/
│  ├─ src/vault.rs
│  ├─ src/watcher.rs
│  ├─ src/index.rs
│  ├─ src/search.rs
│  └─ tauri.conf.json
└─ tests/
   └─ fixtures/          # vaults met randgevallen: emoji, CRLF, grote bestanden,
                         # kapotte frontmatter, diepe mappen, rare bestandsnamen
```

**Testbeleid, bewust smal.** Wel getest: alles wat bestanden aanraakt (`vault`,
conflictafhandeling, atomair schrijven), en de round-trip vault → editor → schijf op de
fixtures. Niet getest: UI-componenten en styling — dat beoordeel je met je ogen, en
snapshot-tests op een interface die nog dagelijks verandert kosten meer dan ze opleveren.

## 10. Distributie

- **v0.x:** lokaal bouwen, `cargo tauri build`, `.app` naar `/Applications`. Geen
  Apple-account nodig; Gatekeeper eenmalig overrulen bij de eerste start.
- **v1.0, alleen bij delen:** Apple Developer Program ($99/jaar), Developer ID-signing en
  notarisatie, distributie als `.dmg`.
- **Updates:** geen ingebouwde update-check in v1 — dat zou het "geen netwerkverkeer"-
  principe uit de PRD breken.

## 11. Toekomstvastheid

Wat we vandaag doen om latere opties open te houden zonder er nu voor te betalen:

- **Alle domeinlogica in Rust, alle presentatie in de frontend.** Een ander uiterlijk
  (of ooit een andere shell) raakt de kern niet.
- **De index is wegwerpbaar.** Van FTS5 naar iets anders overstappen raakt één module.
- **Geen enkele aanname over de mapstructuur.** Elke `.md`-map werkt. Dat is wat het
  verschil maakt tussen "voor mij" en "voor anderen bruikbaar" — en het kost nu niets.
- **Geen sandbox-afhankelijke aannames in de vault-laag.** Als de MAS ooit in beeld komt,
  is de aanpassing lokaal in `vault.rs`.

Wat we vandaag **niet** doen: abstractielagen voor plugins, thema's of sync. Dat is
speculatief werk voor functies die in de anti-scope staan.
