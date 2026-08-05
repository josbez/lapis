# 02 – Haalbaarheidsonderzoek

**Vraag:** kan één persoon dit bouwen tot een niveau waarop het Obsidian vervangt voor
dagelijks gebruik? Zo ja, wat kost het en waar gaat het mis?

**Conclusie vooraf: ja, haalbaar.** Het zwaarste onderdeel — de live-preview editor —
hoef je niet zelf te schrijven; daar bestaat volwassen open source voor. Het grootste
risico is niet technisch maar scope-gerelateerd, met dataveiligheid als enige echte
technische hobbel.

> ⚠️ **Twee correcties op de eerste versie van dit document.**
>
> 1. Hier stond "de MVP is ongeveer 6–9 weken avondwerk". Dat getal bevatte een
>    onuitgesproken aanname van 13–15 werkuren per week, en het is gebaseerd op een
>    functielijst die ik zelf had opgesteld. Volledige opbouw en herziening in
>    [06 §7](06-beslisinput-techniek.md#7-waar-de-69-weken-vandaan-kwam-en-waarom-het-getal-nog-niets-waard-is).
> 2. §4 hieronder presenteerde Tauri als gekozen. Dat besluit is niet genomen en ligt
>    terug bij [vraag D1](05-open-vragen.md#d1--electron-tauri-v2-of-native-macos); de
>    ontbrekende argumenten vóór Electron staan in
>    [06 §1](06-beslisinput-techniek.md#1-electron-versus-tauri-v2--de-feitelijke-vergelijking).

---

## 1. Ontleding in bouwblokken

| # | Bouwblok | Moeilijkheid | Kant-en-klaar beschikbaar? |
|---|---|---|---|
| 1 | Map kiezen, bestanden lezen/schrijven | Laag | Ja — Tauri fs-plugin |
| 2 | Bestandsboom in de sidebar | Laag | Nee, maar triviaal |
| 3 | **Live-preview markdown-editor** | **Hoog** | **Ja — CodeMirror 6 + MIT-libs** |
| 4 | Opslaan zonder dataverlies | Middel | Nee — zelf goed doen |
| 5 | Externe wijzigingen opmerken | Middel | Ja — `notify` (Rust) / fs-plugin `watch` |
| 6 | Full-text zoeken | Middel | Ja — SQLite FTS5 |
| 7 | Frontmatter + tags parsen | Laag | Ja — serde_yaml / gray_matter |
| 8 | Quick switcher (`⌘K`) | Laag | Ja — fuzzy-match crate |
| 9 | Visueel ontwerp / typografie | Middel | Nee — dit is het eigenlijke werk |
| 10 | Bouwen, signeren, distribueren | Laag–Middel | Ja, maar kost geld (zie §5) |

Alles behalve #3 en #9 is standaard applicatiewerk. Laten we die twee apart bekijken.

## 2. Het harde deel: live preview

Dit is waar hobbyprojecten in deze categorie stranden. "Markdown die opmaakt terwijl je
typt, terwijl de onderliggende tekst gewone markdown blijft" is subtiel: de cursor moet
door verborgen syntax heen kunnen bewegen, selecties moeten kloppen, kopiëren moet de
ruwe markdown opleveren, en undo/redo mag niet stukgaan.

**Goed nieuws: dit is opgelost werk.**

- Obsidian doet dit zelf met CodeMirror 6 plus onderdelen van het open source
  HyperMD-project. Dezelfde bouwstenen liggen voor jou klaar.
- `atomic-editor` (MIT, React + CodeMirror 6) levert Obsidian-stijl live preview met
  koppen, bold, highlights, tabellen met in-place bewerken, afbeeldingen, links,
  takenlijsten met klikbare vinkjes, `[[wikilinks]]`, syntax-highlighting in
  codeblokken en slim lijstgedrag. Expliciet "gehard op echte gebruikersdocumenten",
  met virtualisatie voor grote documenten.
- `codemirror-live-markdown` en `codemirror-rich-obsidian` doen hetzelfde in een
  modulaire vorm.

**Beoordeling:** het verschil tussen "zelf bouwen" en "integreren en bijschaven" is hier
ongeveer drie maanden. Neem een bestaande basis. Reken wel op één tot twee weken voor
het bijschaven van gedrag dat je persoonlijk irritant vindt — dat is onvermijdelijk en
ook precies het punt van zelf bouwen.

**Restrisico:** je zit vast aan hoe CodeMirror opmaak weergeeft. Wil je later iets heel
eigens (bijvoorbeeld inline afbeeldingen met een custom layout), dan moet je de
CodeMirror-decoratie-API in. Dat is te doen, maar het is een echte leercurve.

## 3. Het onderschatte deel: het ontwerp

Je probleem is voor de helft visueel: *"visueel vind ik het overweldigend en niet fijn
werken."* Dat betekent dat het ontwerp geen afwerking is maar het product zelf. Een
functioneel complete Lapis met middelmatige typografie heeft de reis voor niets gemaakt.

Praktisch: reken op meer iteraties op regelafstand, regelbreedte, contrast, lettertype
en witruimte dan op de zoekfunctie. Plan er expliciet tijd voor in (M4 in de
[technische spec](04-technische-spec.md#8-milestones)) in plaats van te hopen dat het
vanzelf goed komt.

## 4. Technologiekeuze — open

**Deze keuze is niet gemaakt.** Zie [06 §1](06-beslisinput-techniek.md#1-electron-versus-tauri-v2--de-feitelijke-vergelijking)
voor de volledige vergelijking met voorbeelden, en
[vraag D1](05-open-vragen.md#d1--electron-tauri-v2-of-native-macos) om hem te beantwoorden.

| Optie | Voor | Tegen |
|---|---|---|
| **Tauri v2** (Rust + webview) | ~10 MB pakket, ~40 MB RAM idle, snelle koude start; CodeMirror direct bruikbaar; **enige pad naar mobiel** | Rust erbij leren; WebKit-webview heeft eigen eigenaardigheden; kleiner ecosysteem |
| **Electron** | Wat Obsidian zelf gebruikt; verreweg de meeste voorbeelden; één taal voor het hele project; voorspelbare Chromium-rendering; volwassen bestands- en distributieketen | ~85 MB pakket, ~170 MB RAM idle; geen mobiel pad |
| **Swift / SwiftUI** | Beste macOS-gevoel, kleinste app, geen webview | Live preview in NSTextView is maanden werk; hele CodeMirror-ecosysteem valt weg |
| **Hybride** (Swift-schil + CodeMirror in WKWebView) | macOS-gevoel én CodeMirror | Je bouwt zelf wat Tauri cadeau doet; minst betreden route |

Het feit dat hier het meest van afhangt: **Electron ondersteunt geen mobiel.** Zolang
[vraag E2](05-open-vragen.md#e2--komt-er-een-mobiele-versie--grootste-vraag-van-dit-document)
open staat, kan D1 niet beantwoord worden.

Benchmarks (augustus 2026) geven Tauri ~96% kleinere pakketten en ~75% minder
geheugengebruik dan Electron, met koude start 380 ms tegen 1.420 ms. Voor een product
waarvan de belofte "licht" is, is dat geen detail maar de propositie.

De macOS-specifieke kanttekening is reëel: WebKit rendert anders dan Chromium
(font-smoothing, CSS-details, keyboard events). Voor een macOS-only app is dat juist een
voordeel — je test tegen één engine, en het is de engine waar de rest van je Mac ook op
draait.

## 5. Kosten

| Post | Bedrag | Wanneer |
|---|---|---|
| Ontwikkeltijd MVP | ~105–120 uur, doorlooptijd afhankelijk van [G5](05-open-vragen.md#g5--hoeveel-tijd-heb-je-werkelijk) — opbouw in [06 §7](06-beslisinput-techniek.md#7-waar-de-69-weken-vandaan-kwam-en-waarom-het-getal-nog-niets-waard-is) | Nu |
| Apple Developer Program | $99/jaar | Alleen bij distributie buiten je eigen Mac |
| Infrastructuur | €0 | — |
| Afhankelijkheden | €0 (MIT) | — |

Zolang Lapis alleen op jouw Mac draait, kun je zonder Apple-account bouwen en draaien
(`cargo tauri dev`, of een lokale build waarvoor je Gatekeeper eenmalig overrulet). De
$99 wordt pas relevant bij het besluit "eerst voor mezelf, later beslissen" → *later*.

## 6. Risico's

| Risico | Kans | Impact | Mitigatie |
|---|:-:|:-:|---|
| **Dataverlies bij gelijktijdige bewerkingen** — je bewerkt een bestand in Lapis terwijl iets anders (iCloud-sync, Obsidian, git) het ook aanraakt | M | **Kritiek** | Atomair schrijven (temp + rename), mtime-controle vóór schrijven, conflict → nooit stil overschrijven. Zie [tech spec §5](04-technische-spec.md#5-opslagmodel-en-conflicten) |
| **Scope creep** — over drie maanden bouw je een graph view | **H** | Hoog | Anti-scope in de PRD; elke nieuwe functie moet een bestaande vervangen |
| **Live preview blijft irritant** — 90% goed voelt als 100% fout in je dagelijkse editor | M | Hoog | M0-spike eerst; als je na de spike niet in Lapis wílt typen, stop je |
| **Rust-leercurve** | M | Middel | Houd Rust dun: alleen fs, watcher en index. Alle UI-logica in TypeScript |
| **Zoeken traag bij grote vault** | L | Middel | SQLite FTS5 is ruim voldoende tot ~50k notities; index buiten de vault |
| **Motivatie zakt weg na de leuke fase** | M | Middel | M1 (lezen) moet binnen twee weken bruikbaar zijn; vroeg echt gebruiken |
| **Half werk = twee systemen** — je gebruikt Lapis én Obsidian door elkaar | M | Middel | Bestandscompatibiliteit als harde eis; nooit iets schrijven dat Obsidian breekt |

Het bovenste en het tweede risico zijn de enige twee die dit project echt kunnen
kelderen. Al het andere is werk.

## 7. Wat maakt dit *niet* haalbaar

Voor de volledigheid, want deze grens is belangrijk. Zodra de scope het volgende raakt,
verandert de inschatting van weken naar kwartalen:

- **Mobiel (iOS) met sync.** Sync tussen apparaten met offline bewerkingen is een eigen
  vakgebied. Buiten scope, en niet gekozen.
- **Een plugin-systeem.** Dat is een platform bouwen, niet een app. En het is letterlijk
  de bron van het probleem dat je wilt oplossen.
- **Realtime samenwerking.** Nee.
- **Volledige Obsidian-pariteit.** Onhaalbaar en ongewenst; het hele punt is dat je 80%
  weglaat.

## 8. Eindoordeel

**Bouwen: ja.** Het risicoprofiel is gunstig: het moeilijkste stuk is beschikbaar onder
MIT, de stack is bewezen voor precies dit doel, en de kosten zijn tijd, niet geld.

**Voorwaarde:** begin met de M0-spike (map openen + één bestand in live preview
bewerken en opslaan, ~2 avonden). Die spike beantwoordt de enige vraag die er echt toe
doet — *wil ik hierin typen?* — voordat je aan de andere 100 uur begint.

---

## Bronnen

- [atomic-editor – CodeMirror 6 markdown editor met Obsidian-stijl live preview (MIT)](https://github.com/kenforthewin/atomic-editor)
- [codemirror-live-markdown](https://github.com/blueberrycongee/codemirror-live-markdown)
- [codemirror-rich-obsidian](https://github.com/Type-32/codemirror-rich-obsidian)
- [obsidian-codemirror-options – achtergrond over Obsidians CM6/HyperMD-implementatie](https://github.com/nothingislost/obsidian-codemirror-options)
- [Tauri vs Electron 2026 – benchmarks](https://tech-insider.org/tauri-vs-electron-2026/)
- [Tauri v2 File System plugin](https://v2.tauri.app/plugin/file-system/)
- [I built a Markdown editor with Tauri — here's what I learned](https://dev.to/ukash/i-built-a-markdown-editor-with-tauri-heres-what-i-learned-4f5l)
- [SQLite FTS5](https://blog.sqlite.ai/fts5-sqlite-text-search-extension)
