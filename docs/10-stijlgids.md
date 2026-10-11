# 10. Stijlgids

Dit document beschrijft het daadwerkelijk geïmplementeerde ontwerp in
`app/src/styles.css` en `app/src/Icons.tsx` — niet een voorstel, maar de
huidige staat van de app. Het is de bron van waarheid voor het visuele
ontwerp; bij twijfel wint de code, en wordt dit document bijgewerkt.

De aanleiding: het ontwerp is via Stitch tot stand gekomen (zie
`docs/07-wave-methode.md`, W10), maar is daarna over meerdere rondes
bijgesteld op basis van gebruik in de echte app op macOS. Stitch' eigen
`DESIGN.md` (bijgeleverd bij elke ontwerpronde) loopt daardoor inmiddels op
een aantal punten uit de pas met wat er werkelijk gebouwd is. Zie
"Afwijkingen van Stitch' DESIGN.md" onderaan voor het overzicht.

## Kleuren

Licht (standaard) en donker via `prefers-color-scheme` — Lapis kent geen
handmatige thema-schakelaar (PRD sluit dat expliciet uit).

| Token | Licht | Donker | Gebruik |
|---|---|---|---|
| `--bg` | `#f9f9ff` | `#1a1b1e` | Canvas: editor, appachtergrond |
| `--bg-elevated` | `#ffffff` | `#201f23` | Toolbar, statusbalk, dialogen, menu's |
| `--bg-surface` | `#f0f3ff` | `#201f23` | Sidebar-achtergrond |
| `--bg-hover` | `#e7eefe` | `#2a292e` | Hover-achtergrond op knoppen/rijen |
| `--fg` | `#151c27` | `#d1d5db` | Primaire tekst |
| `--fg-muted` | `#43474c` | `#9aa0a8` | Secundaire tekst (labels, statusregel) |
| `--fg-faint` | `#74777d` | `#6b7078` | Tertiair (chevron, boom-iconen, placeholders) |
| `--border` | `#e2e8f0` | `#2d2e32` | Randen, verdeellijnen |
| `--accent` | `#172839` | `#b6c8df` | Primaire knoppen, selectie, focus-ring |
| `--accent-fg` | `#ffffff` | `#0a1d2d` | Tekst op `--accent` |
| `--danger` | `#ba1a1a` | `#ffb4ab` | Destructieve acties (prullenbak) |
| `--danger-bg` | `#ffdad6` | `#3a2320` | Conflictbalk-achtergrond |

Het donkere palet is een eigen afleiding — Stitch' tokenbestand gaf alleen
losse aanwijzingen voor donker (basissurfaces, "vermijd puur zwart"), geen
volledige set. De verhoudingen tussen de tokens zijn hetzelfde als licht.

## Typografie

Drie lettertypefamilies, elk met een eigen rol, zelf gehost via
`@fontsource` (geen Google Fonts-aanroep — PRD §8, volledig offline):

- **Geist Sans** (`--font-sans`) — de UI-chrome: sidebar, toolbar, menu's,
  contextmenu's, statusbalk, instellingen-labels.
- **Source Serif 4** (`--font-serif`) — lopende tekst in de notitie zelf
  (via `--atomic-editor-font`).
- **Hanken Grotesk** (`--font-display`) — koppen: H1/H2 ín een notitie
  (`.cm-atomic-h1`/`.cm-atomic-h2`) én de titels in het instellingenscherm.

| Element | Familie | Grootte | Gewicht |
|---|---|---|---|
| Broodtekst (editor) | serif | 1.125rem (18px), leading 1.778 | 400 |
| H1 (in notitie) | display | 2.1em t.o.v. broodtekst | 700, `letter-spacing: -0.02em` |
| H2 (in notitie) | display | 1.3em t.o.v. broodtekst | 600 |
| Boomrij (bestand/map) | sans | 0.8125rem | 400, 600 bij selectie |
| Toolbar/sidebar-knoplabels | sans | 0.8125rem | 500 |
| Breadcrumb | sans | 0.6875rem, hoofdletters, `letter-spacing: 0.05em` | 600 |
| Statusregel | sans | 0.7rem | 400 |
| Instellingen — sectietitel | display | 1rem | 600 |
| Instellingen — rijlabel | sans | 0.8125rem | 400 |

H1 is bewust duidelijk groter en losser van zowel de broodtekst als H2 — een
herkenbare titel, geen extra tussenkopje.

## Vorm & ruimte

- **Radius:** één token, `--radius: 0.25rem`, overal — knoppen, menu's,
  dialogen, selectiehighlight in de boom.
- **Randen in plaats van schaduw:** geen `box-shadow` in de hele app. Menu's
  en dialogen ("Level 2" in Stitch' taal) krijgen een scherpe 1px rand
  (`--border`), geen ambient blur.
- **Editor-breedte:** `max-width: 720px`, gecentreerd — voor een leesbare
  regellengte.
- **Sidebar-breedte:** vast op 260px.

## Componenten

**Toolbar** (`.lapis-toolbar`) — één balk, vaste hoogte `2.6rem`, boven de
hele app. Links alleen de sidebar-toggle; een spacer duwt de rest naar
rechts: verversen, een verdeellijn, instellingen. Er staat geen vaultpad
meer in de toolbar (verwijderd na macOS-feedback: overbodig, de sidebar
toont de context al). `data-tauri-drag-region` staat op de hele balk zodat
het venster ook zonder eigen titelbalk versleepbaar blijft
(`titleBarStyle: Overlay` in `tauri.conf.json`, zoals Obsidian/Slack); de
linkerpadding (`5rem`) reserveert ruimte voor de macOS-verkeerslichten.

**Toolbar-knoppen** (`.lapis-toolbar-btn`) — icoon-only, `1.9rem` vierkant,
geen rand of vulling in rust, subtiele achtergrond bij hover. Bewust
onopvallend: dit is chrome, geen actie die om aandacht vraagt. Toegankelijke
naam komt van `aria-label` (er staat geen zichtbaar label naast het icoon).

**Iconen** (`app/src/Icons.tsx`) — een dunne wrapper rond
[`lucide-react`](https://lucide.dev), niet langer een eigen handgetekende
set. Lucide's outline-stijl (1.5px lijndikte, ronde uiteinden) sluit aan bij
wat Stitch zelf gebruikte. Elke `Icon*`-functie in dat bestand is een vaste
naam die de rest van de app importeert — de onderliggende Lucide-component
kan wisselen zonder dat call-sites hoeven te veranderen.

**Sidebar** (`.lapis-sidebar`) — vaste breedte, eigen achtergrondtint
(`--bg-surface`) om hem als apart functioneel gebied te onderscheiden van de
editor. Onderaan: `NewItemMenu`, één "+ Nieuw"-knop die een klein popup-menu
opent met "Nieuwe notitie" / "Nieuwe map" (vervangt de eerdere twee
permanent zichtbare knoppen naast elkaar).

**Mapboom** (`.lapis-tree`) — hoge informatiedichtheid, chevron voor
in-/uitklappen, `--accent`-getinte achtergrond bij selectie. Onderliggende
niveaus (`.lapis-tree-branch`) krijgen een dunne verticale geleidelijn
(`border-left: 1px solid var(--border)`), ingesprongen tot onder het
ouder-icoon, zodat de hiërarchie ook zonder de selectiekleur direct
afleesbaar is.

**Breadcrumb** (`.lapis-breadcrumb`) — boven de editor, alleen zichtbaar bij
een geopende notitie. Toont het vault-relatieve pad in `label-caps`-stijl
(hoofdletters, brede letterspatiëring).

**Statusregel** (`.lapis-statusbar`) — een volle-breedte voettekst onderaan
het venster, los van de toolbar. Toont alleen de eigen opslagstatus van
Lapis ("Opgeslagen", "Bewaren…", conflictmeldingen) — geen taal- of
encoding-indicatoren zoals een codeeditor; die concepten bestaan niet in een
markdown-notitie.

**Knoppen** (`.lapis-btn`) — ghost met 1px rand voor secundaire acties;
`.lapis-btn-primary` (gevuld met `--accent`) voor de hoofdactie in een
dialoog (bijv. "Beide bewaren" in de conflictbalk).

**Menu's & dialogen** (`.lapis-menu`, `.lapis-dialog`) — gedeelde vorm:
witte/elevated achtergrond, 1px rand, `--radius`, geen schaduw. Destructieve
items (`.lapis-menu-danger`, "Naar prullenbak") krijgen `--danger`-tekst.

**Instellingen** (`.lapis-settings`) — rijen met label + waarde,
gescheiden door dunne onderrand; sectietitels in `--font-display`.

## Afwijkingen van Stitch' DESIGN.md

Bewuste keuzes waarbij het geïmplementeerde ontwerp afwijkt van wat Stitch
aanleverde:

1. **Geen "Drafts/Projects/Archive/Trash"-navigatielaag** boven de mapboom.
   Lapis kent die concepten niet; PRD-principe 3 ("mappen zijn de
   organisatie") staat geen tweede navigatiesysteem naast de mapboom toe.
2. **Geen taal-/encoding-indicatoren** in de statusregel. Stitch' mockup
   toonde code-editor-chrome ("Rust", "UTF-8") die niets met een
   markdown-notitie te maken heeft.
3. **Vaultpad niet in de toolbar.** Na macOS-feedback verwijderd: de sidebar
   toont de context al, het pad voegde niets toe.
4. **Nieuwe notitie/map als popup-trigger, niet als twee knoppen naast
   elkaar.** Latere Stitch-iteratie stelde dit zelf voor; overgenomen.
5. **Alleen de sidebar-toggle links in de toolbar; verversen en
   instellingen rechts**, in plaats van verspreid over beide kanten —
   idem, latere Stitch-iteratie, overgenomen (met correctie van de
   uitlijning die in dat screenshot zelf niet klopte).
6. **Iconen via `lucide-react`** in plaats van het eigen handgetekende setje
   uit de eerste implementatieronde — visueel gelijk aan Stitch' eigen
   stijl, maar nu een onderhouden bibliotheek in plaats van negen losse
   handgeschreven SVG's.

Zie de git-historie van `app/src/styles.css` voor de volledige
ontwikkelgang; dit document volgt de huidige stand, niet elke tussenstap.
