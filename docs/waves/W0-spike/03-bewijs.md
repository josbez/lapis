# Wave W0 Bewijsverslag — Spike

| | |
|---|---|
| **Status** | **Onvolledig.** De geautomatiseerde helft is af; de handmatige helft kan alleen op macOS |
| **Datum** | augustus 2026 |
| **Bron** | [Goal](00-goal.md) · [Spec](01-spec.md) · [Testplan](02-testplan.md) |

---

## 1. Wat er is gebouwd

Een Tauri v2-app met een React-frontend en `@atomic-editor/editor` op CodeMirror 6.
Een knop om een map te kiezen, een platte lijst van de `.md`-bestanden erin, en een
editor met live preview. Opslaan met `⌘S`, niets anders.

Alle bestandslogica staat in een aparte Rust-crate `vault-core` zonder Tauri-afhankelijkheid;
`src-tauri` is een schil van vier commands eromheen.

## 2. Waarom dit verslag onvolledig is

**De Tauri-app is hier niet gebouwd of gestart.** Deze omgeving draait Linux zonder
`webkit2gtk`, en het doelplatform is macOS. Wat wél kon: alle logica die los van de
webview staat, plus de volledige frontend-bundel.

| Wat | Hier | Op de Mac van Jos |
|---|:-:|:-:|
| `vault-core` compileren en testen | ✅ | — |
| Frontend-tests | ✅ | — |
| Typecheck | ✅ | — |
| Frontend bundelen (`vite build`) | ✅ | — |
| Isolatie- en verantwoordelijkheidschecks | ✅ | — |
| `cargo build` van de Tauri-schil | ❌ | **nodig** |
| `npm run tauri dev` | ❌ | **nodig** |
| HF-01, HF-02 · handmatige doorloop | ❌ | **nodig** |
| PP-10 · het oordeel | ❌ | **nodig** |

Dat betekent dat de Tauri-configuratie (`tauri.conf.json`, `capabilities/default.json`,
`main.rs`) hier **niet geverifieerd is**. Dat is het eerste dat op de Mac kan stuklopen.

## 3. Geïnstalleerde pakketten

De Wave Specification verbood het invullen van een pakketnaam op basis van een aanname.
Opgezocht en gevonden:

**`@atomic-editor/editor@0.6.2`** — gepubliceerd door `kenforthewin`, de auteur van
[kenforthewin/atomic-editor](https://github.com/kenforthewin/atomic-editor). MIT.
De naam `atomic-editor` bestaat niet op npm (404); er is ook een fork
`@plannotator/atomic-editor` van een andere maintainer, die we niet gebruiken.

| Pakket | Versie |
|---|---|
| `@atomic-editor/editor` | 0.6.2 |
| `@codemirror/state` · `view` · `lang-markdown` · `language` · `commands` · `search` · `autocomplete` | 6.7.1 · 6.43.8 · 6.5.2 · 6.12.4 · 6.10.4 · 6.7.1 · 6.20.3 |
| `@lezer/common` · `highlight` · `markdown` | 1.5.2 · 1.2.3 · 1.7.2 |
| `react` · `react-dom` | 19.2.8 |
| `@tauri-apps/api` · `cli` · `plugin-dialog` | 2.11.1 · 2.11.4 · 2.7.2 |
| `vite` · `vitest` · `typescript` | 7.3.6 · 3.2.7 · 5.9.3 |
| rustc | 1.94.1 |

De optionele grammatica's voor syntax-highlighting zijn niet geïnstalleerd, conform
Spec §5.2.

## 4. Uitgevoerde commando's

| Commando | Uitkomst |
|---|---|
| `npm install` | ✅ 134 pakketten |
| `cargo test` (in `vault-core`) | ✅ **14 geslaagd, 0 gefaald** |
| `npx vitest run` | ✅ **10 geslaagd, 0 gefaald** |
| `npx tsc --noEmit` | ✅ geen fouten |
| `npx vite build` | ✅ gebouwd in 3,15 s |
| Isolatiecheck hardgecodeerde paden | ✅ leeg |
| Isolatiecheck netwerk-aanroepen | ✅ leeg |
| Verantwoordelijkheidscheck fs vanuit frontend | ✅ leeg |
| `cargo build` (Tauri-schil) | ❌ niet uitgevoerd — geen webkit2gtk, doel is macOS |
| `npm run tauri dev` | ❌ niet uitgevoerd — idem |

## 5. Proof points

| ID | Wat | Stand |
|---|---|---|
| PP-01 | App start op macOS | ⬜ **Jos** |
| PP-02 | Map kiezen, `.md`-bestanden zichtbaar | ⬜ **Jos** |
| PP-03 | Bestand opent in live preview | ⬜ **Jos** |
| PP-04 | `⌘S` schrijft naar schijf | ⬜ **Jos** |
| **PP-05** | **Round-trip byte-identiek (Rust, 6 fixtures)** | ✅ **bewezen** |
| **PP-06** | **Round-trip string-identiek (editor, 6 fixtures)** | ✅ **bewezen** |
| **PP-07** | **Paden buiten de map worden geweigerd** | ✅ **bewezen** (7 negatieve tests) |
| PP-08 | Geen hardgecodeerde paden, geen netwerk | ✅ bewezen |
| PP-09 | Bewijsdocument compleet | ✅ dit document |
| PP-10 | Oordeel van Jos | ⬜ **Jos** |

De twee onvoorwaardelijke proof points uit het testplan — PP-05 en PP-07 — zijn bewezen.

## 6. Bevindingen

### 6.1 CRLF: de facet was niet genoeg 🔴 *belangrijkste bevinding*

Het testplan voorspelde in §4.2 dat de frontend-round-trip zou falen op `crlf.md`, met
als vermoedelijke oorzaak dat CodeMirror regeleindes normaliseert tenzij de line
separator wordt gezet. **De voorspelling klopte, de oorzaak niet.**

Empirisch vastgesteld:

```
origineel                  : "a\r\nb\r\nc"
zonder facet               : "a\nb\nc"
mét EditorState.lineSeparator: "a\nb\nc"   ← ook genormaliseerd
state.lineBreak            : "\r\n"
doc.toJSON().join(lineBreak): "a\r\nb\r\nc"
```

CodeMirrors `Text` bewaart regels intern zonder regeleinde, en `doc.toString()` plakt ze
onvoorwaardelijk met `\n` aan elkaar. De facet bepaalt alleen waarop een binnenkomend
document wordt gesplitst en wat er wordt ingevoegd bij een Enter — níét hoe je het
uitleest.

**Behoud vraagt dus twee dingen:** de facet zetten (zodat getypte regels het juiste
einde krijgen) én bij opslaan expliciet serialiseren met het oorspronkelijke regeleinde.
Dat laatste is geïmplementeerd in `src/lineEndings.ts` en wordt in `App.tsx` toegepast op
het moment van schrijven.

Dit is geen omweg om de test heen: het testplan schreef voor om de bevinding te melden en
niet stilzwijgend te configureren. De bevinding is gemeld, Jos had het productgedrag al
besloten (LF voor nieuwe bestanden, behoud voor bestaande), en dit is de uitvoering
daarvan. De test legt het gedrag nu vast, inclusief een test die faalt zodra CodeMirror
zich anders gaat gedragen.

**Gevolg voor W3:** het regeleinde moet worden vastgelegd bij het *openen* van een
bestand, niet bij het opslaan — op het moment van opslaan is de oorspronkelijke informatie
weg. Dat is een vormeis aan het opslagmodel, geen detail.

### 6.2 Gemengde regeleindes worden genormaliseerd 🟡

Een bestand met zowel LF als CRLF wordt bij opslaan volledig CRLF. Voor de spike
aanvaardbaar, voor W3 een punt om opnieuw te wegen. Vastgelegd als bekende versimpeling
in `lineEndings.ts`.

### 6.3 Het pakket is niet los in Node te laden 🟡

`@atomic-editor/editor@0.6.2` gebruikt extensieloze relatieve imports in zijn ESM-build
(`import ... from './AtomicCodeMirrorEditor'`). Bundlers lossen dat op, Node's
ESM-resolver niet — vitest viel er in eerste instantie over. Opgelost door het pakket te
inlinen in de Vite-testconfiguratie, waardoor het dezelfde weg aflegt als in de app.

Geen blokkade, wel iets om te weten: dit pakket is afhankelijk van een bundler.

### 6.4 De bundel is 782 kB 🟢

Groter dan Vite's waarschuwingsdrempel, en vrijwel volledig CodeMirror. Geen probleem
voor een desktop-app die lokaal laadt, en geen W0-onderwerp. Genoteerd omdat de PRD een
pakketgrootte-ambitie heeft.

## 7. Afwijkingen van de Wave Specification

| Wat | Waarom | Oordeel |
|---|---|---|
| **`vault-core` is een aparte crate**, waar Spec §5.1 `src-tauri/src/vault.rs` toonde | Zo draaien de bestandstests zonder de macOS- of webview-toolchain. Zonder deze splitsing had geen enkele Rust-test hier kunnen draaien en was PP-05 en PP-07 onbewezen gebleven | Mijn keuze, hier gemeld. Draai hem terug als je hem niet wilt — hij kost niets om ongedaan te maken, en W1 begint toch opnieuw |
| Extra test `be_01b` en `regeleindes`-tests | Bewaken dat de fixtures nog bewijzen wat ze moeten bewijzen | Binnen het bestaande bewijspunt, geen nieuwe scope |
| `@types/node` toegevoegd | De testcode leest fixtures van schijf | Triviaal |

Geen enkele afwijking breidt de functionaliteit uit. Alles uit Goal §6 dat out of scope
was, is out of scope gebleven.

## 8. Wat níét is getest

Eerlijk en volledig — dit is de sectie die het testplan niet optioneel noemde.

- **De Tauri-app zelf.** Niet gecompileerd, niet gestart. `tauri.conf.json`,
  `capabilities/default.json` en `main.rs` zijn niet geverifieerd.
- **De IPC-laag.** De vier commands zijn geen enkele keer daadwerkelijk over de
  IPC-grens aangeroepen. De logica erachter is wel getest; de vertaling niet.
- **De mapkiezer.** `@tauri-apps/plugin-dialog` is nooit uitgevoerd.
- **De live preview zelf.** Er is nooit een `EditorView` in een browser gerenderd. De
  tests werken op `EditorState` — dat bewijst documentbehoud, niet dat er iets goed
  uitziet of prettig typt.
- **`⌘S` als toetsaanslag.** De opslaglogica is niet via een echte toetsaanslag getest.
- **Alles rond gedrag bij typen:** cursor door verborgen syntax, selecties, plakken,
  undo/redo. Dat is precies waar het oordeel over gaat, en dat kan alleen handmatig.
- **Prestaties.** Buiten scope, geen normen om aan te toetsen.

## 9. Bevestigingen

- ✅ De scope is niet opgerekt buiten het Goal Document.
- ✅ Er is niets gewijzigd buiten `spike/` en `docs/waves/W0-spike/`.
- ✅ `~/Documents` is niet geopend. Deze omgeving heeft er ook geen toegang toe.
- ✅ De isolatie- en verantwoordelijkheidschecks zijn leeg.
- ✅ Bestands-I/O gebeurt uitsluitend in Rust; de frontend gebruikt geen fs-plugin.

## 10. Wat Jos nog moet doen

```bash
git fetch origin claude/obsidian-like-markdown-tool-m9sk6s
git checkout claude/obsidian-like-markdown-tool-m9sk6s
cd spike
npm install
npm run tauri dev
```

Eerst een **kopie** maken van een handvol notities in een aparte map, inclusief de
lastigste die je kunt vinden. Niet `~/Documents` openen: de spike schrijft naïef, zonder
atomair schrijven en zonder conflictdetectie.

Daarna de doorloop uit testplan §7 (HF-01), en het oordeel in §11 hieronder.

Loopt `cargo build` stuk op de Tauri-configuratie, dan is dat een bevinding van mij en
geen van jou — stuur de foutmelding door.

## 11. Het oordeel van Jos

*In te vullen na de doorloop.*

**Wil je hierin typen?**

`____________________________________________`

**Zo nee: zit het in de basis, of is het met bijschaven op te lossen?**

`____________________________________________`

**Wat viel op tijdens het typen — cursor, selectie, plakken, undo?**

`____________________________________________`

**Doorgaan met `@atomic-editor/editor`, of route b of c uit [D4](../../05-open-vragen.md#d4--editorbasis)?**

`____________________________________________`
