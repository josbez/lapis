# 10 – Analyse oktober 2026: QA, code, design, algemeen

**Datum:** 10-10-2026 · **Stand:** `main` na W9 (josbez/lapis#22) · **Uitkomst:** taken
#1–#21 in de [backlog](backlog.md).

## 0. Oordeel in het kort

De kern is degelijk gebouwd: padveiligheid, atomair schrijven, de scheiding tussen Rust en
frontend en de documentatie van besluiten zijn beter dan gemiddeld. **Maar Lapis kan op dit
moment geen bestaande notitie opslaan zonder een conflictmelding**, en dat ligt niet aan een
randgeval: het gebeurt bij de eerste autosave op elke notitie. Dat geen van de 267 tests dit
ziet, is de belangrijkste bevinding van deze analyse. Het probleem is niet één bug, maar
wáár de tests kijken.

Vijf P0-bevindingen, alle vijf klein te fixen. Daarna moet de app voor het eerst echt op de
Mac draaien, vóór er verder gebouwd wordt.

## 1. QA: wat de tests bewijzen, en wat niet

**De poort (10-10-2026, Linux):** ESLint, `tsc`, 135 frontendtests, 132 Rust-tests
(`vault-core`, `app-state`, `search-index`), clippy `-D warnings` en de isolatie-check
zijn alle groen. `src-tauri` zelf is niet lokaal gebouwd (de webkit-libs ontbreken in
deze omgeving); in CI wel.

**Wat ze bewijzen.** Elke laag klopt op zichzelf. `vault-core` is grondig getest, inclusief
symlink-ontsnapping, byte-behoud, onleesbare mappen en 5.000+ notities. De React-hooks
zijn los van CodeMirror getest, met nep-timers en nep-IPC.

**Wat ze niet bewijzen: de naden.**

| Naad | Waarom ongetest | Gevolg |
|---|---|---|
| Rust ↔ JSON ↔ TS (`main.rs`) | Frontend mockt `ipc.ts`; Rust-tests roepen `vault-core` direct aan met `SystemTime` | **#1**: opslaan altijd conflict |
| CSP van de webview | jsdom kent geen CSP | **#2**: bijlagen nooit zichtbaar |
| Markdown-parser ↔ wat de app invoegt | Paste-test checkt de ingevoegde string, niet of die een afbeelding ís | **#3**: geplakte afbeelding is tekst |
| App-state ↔ component-state | `useDraftNote` is in `App.test` gemockt | **#4**: concept blokkeert navigatie |
| `window.prompt`/`confirm`/`open` | In jsdom gestubd | onbewezen, #7 |
| Hoofdletterongevoelig bestandssysteem | CI draait op ext4 | **#9** |

Dit is een patroon, geen toeval: de tests zijn geschreven door wie de code schreef, per
eenheid, met de aannames van die eenheid. Waar twee eenheden elkaar raken, zat niemand.
De DoD in de backlog eist daarom voor alles over de IPC-grens een test die door dezelfde
conversie loopt (punt 2), en #6 bouwt die contracttest.

**Reproducties van deze analyse:**
- #1: `vault-core` + de ms-conversie uit `main.rs` → `mtime op schijf: …478202986s` →
  `1e autosave: Conflict`.
- #4 en #5: twee vitest-tests (blur op een leeg concept → `createNote('', '')`;
  "Nieuwe notitie" → klik op een notitie → inhoud verschijnt niet). Beide slagen, dus de
  bug bestaat. Ze staan nog niet in de repo; ze horen als eerste stap bij #4 en #5.

## 2. Code-verificatie

Gelezen: heel `app/` (±4.700 regels, alle Rust en TS) plus de relevante delen van
`@atomic-editor/editor`.

**Bevestigd (gereproduceerd of eenduidig uit de code):** #1 (repro), #4 en #5 (repro), #2
(CSP-string vs. `img.src = blob:…`), #3 (CommonMark-regel), #8 (cleanup schrijft naar het
oude pad na `moveNote`), #10 (geen code werkt `start_page` bij), #11 (`wikiLinks()` staat
niet in de standaardextensies van de editor en wordt niet toegevoegd), #16 (`⌘N` bestaat
niet).

**Waarschijnlijk, op de Mac te bevestigen:** #9 (`to.exists()` op APFS), het gedrag van
`window.prompt`/`confirm`/`window.open` in WKWebView (#7, #11).

**Kleiner (P3/Later):** 255-bytes-bestandsnamen (#18), metadata bij atomair schrijven
(#19), niet-atomaire bijlage en een fragiele scan (#20), herlezen van afbeeldingen bij
scrollen, `savingRef` die een tweede save stil laat vallen (ook bij ontmounten tijdens een
lopende save).

**Wat goed is, en zo moet blijven:**
- `resolve_in_root`: componentcontrole vóór canonicalisatie, `starts_with` erna, de lege
  string en de root zelf apart geweigerd. Waterdicht voor zover ik kan zien.
- `write_attachment` schrijft eerst de bijlage en verplaatst pas daarna de notitie; bij een
  fout wordt de lege map opgeruimd. Goed doordacht.
- Snippets uit FTS5 als React-elementen in plaats van `dangerouslySetInnerHTML`.
- `requestGate` (laatst-gestarte-wint) consequent toegepast.
- Fouten als `VaultError`-varianten tot aan de grens, geen string-matching.
- Commentaar legt het *waarom* vast, met verwijzing naar het besluit. Dat maakte deze
  analyse snel.

**Wat schuurt.** `App.tsx` (447 regels) regelt navigatie, concepten, bestandsbewerkingen,
sneltoetsen en de startpagina; #4, #8 en #10 zitten allemaal in de overdracht tussen die
taken. Na de P0/P1-fixes is een `useNavigation`-hook die "wat staat er open, en hoe kom je
ergens anders" op één plek houdt de moeite waard; niet eerder, en niet als doel op zich.

## 3. Wat de PRD vraagt en wat er staat

| PRD | Stand |
|---|---|
| F1 vault, boom, sidebar | ✅ |
| F2 opmaak tijdens typen | ✅ via atomic-editor |
| F2 `[[wikilinks]]` gerenderd én klikbaar | ❌ niet aangezet (#11) |
| F2 byte-identiek buiten de bewerking | ⚠️ behalve regeleindes (#17) |
| F3 autosave, atomair, focusmodel | ⚠️ gebouwd, maar #1 maakt het onbruikbaar |
| F4 `⌘K`, `⌘⇧F` | ✅ |
| F5 bestandsbeheer, prullenbak | ⚠️ #8, #9 |
| F5/C8 map hernoemt mee met de notitie | ❌ (#12) |
| F6 de vorm | ⬜ wireframe (#13–#15) |
| F7 startpagina | ⚠️ vervalt bij hernoemen (#10) |
| §7 `⌘N` | ❌ (#16) |
| §8 toetsenbord, verminderde beweging, tekstgrootte | ⬜ hoort bij #14 |

## 4. Design review

Er is geen ontwerp om te reviewen. Dat is conform F6 ("de eerste versie in code is een
wireframe"), maar het betekent ook dat het belangrijkste deel van het product
(principe 7) nog niet begonnen is. Wat er nu staat, en wat dat voor het ontwerp betekent:

- **Bovenbalk:** vier tekstknoppen, het volledige vaultpad en een statusregel. F6 zegt
  "geen statusbalk, geen breadcrumbs". Dit hoort grotendeels te verdwijnen: verbergen in
  een sneltoets of menu, het pad alleen in instellingen.
- **De statusregel spreekt bij elke autosave** ("opgeslagen 14:03:22"). Voor een rustige
  editor is stilte bij succes de norm; alleen fouten en het conflict verdienen ruimte.
- **Dialogen** zijn `window.prompt`/`confirm`: niet te stylen, blokkerend, en in de
  webview onbewezen. Eigen dialogen zijn nodig, en meteen de plek om verplaatsen als
  mapkiezer te ontwerpen in plaats van een pad intypen.
- **Quick switcher en zoeken** renderen als gewone blokken onderaan de pagina, zonder
  overlay, zonder focus-trap en zonder klik-buiten-om-te-sluiten. Ze kunnen ook allebei
  tegelijk open staan.
- **Contextmenu:** alleen met de muis, niet binnen het venster geklemd.
- **Boom:** `▸`/`▾` als tekst, 16 px inspringing via inline stijl, geen
  `:focus-visible`. De ARIA-rollen (`tree`/`treeitem`) staan er, maar zonder
  pijltjesnavigatie, die bij `role="tree"` verwacht wordt. Of `tree`-rollen eraf, of
  pijltjes erin.
- **Lege staten:** "Kies een notitie in de boom." en "laden…" zijn plaatshouders. Met een
  startpagina ingesteld ziet niemand de eerste; de tweede flitst bij elke wissel van
  notitie. Overweeg niets te tonen tot de inhoud er is.
- **De editor** (atomic-editor) heeft eigen styling die met het ontwerp moet
  samenvallen. Bij de tokens meteen bepalen welke CSS-variabelen van de editor
  overschreven worden.

Voor #13 ligt er een Stitch-briefing klaar (artifact "Stitch-briefing Lapis").

## 5. Algemeen

**De bouwwijze.** W2–W9 zijn snel gebouwd, met elke keer groen als signaal dat het af
was. Groen betekende hier "elke eenheid doet wat zijn auteur dacht", niet "de app werkt".
Dat de methode-evaluatie in [07 §9](07-wave-methode.md#9-evaluatie-wat-de-methode-heeft-opgeleverd)
"dit werkt, en dat is veel" concludeerde zonder dat de app ooit had gedraaid, laat precies
die kloof zien. De lessen zitten nu in de backlog: valkuilen 1–3, DoD punt 2 en 3, en
taak #7 vóór de vorm.

**De documentatie** is grondig maar zwaar: de README is een bouwkroniek van ±100 regels
geworden, en wie wil weten wat de stand is, moest dat tot vandaag uit vijf documenten
halen. De backlog is nu de enige plek voor "wat moet er nog"; het archief is de plek voor
"wat is er gedaan". De README hoort alleen te verwijzen.

**Wat ik zou doen:** #1–#5 in één sessie (samen hooguit een paar uur), dan #7 zelf, dan
pas beslissen over de rest. Het kan goed dat de doorloop een #22 oplevert die
belangrijker is dan alles hierboven.
