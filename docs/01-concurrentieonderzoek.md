# 01 – Concurrentieonderzoek

**Datum:** augustus 2026
**Vraag:** bestaat er al een tool die een map met `.md`-bestanden opent en toont, met
Obsidians rust maar zonder Obsidians gewicht? En zo ja, waarom zou Lapis dan bestaan?

---

## 1. Het marktbeeld

De markt voor notitie-apps is groot en groeit hard (ca. $13,3 mld in 2026, ~20% CAGR),
maar die groei zit vrijwel volledig in cloud, samenwerking en AI-assistentie. Obsidian
heeft ongeveer 8% marktaandeel en domineert de PKM-niche onder power users,
ontwikkelaars en onderzoekers.

Dat is relevant voor ons om één reden: **de markt beweegt weg van waar jij zit.**
De categorie "lokale map met platte tekst, verder niets" is geen groeimarkt — het is een
smaakvoorkeur van een kleine, taaie groep. Dat is slecht nieuws voor een commercieel
product en goed nieuws voor een persoonlijk project: er is weinig kans dat een grote
speler dit gat morgen dichtloopt.

## 2. Het geluid van de gebruiker

De klacht die jij hebt is niet uniek, en dat is nuttig — het betekent dat het een
kenmerk van het product is, niet van jouw gewenning. Terugkerende thema's in reviews en
blogs:

- Nieuwe gebruikers vinden de interface verwarrend; een lege vault plus een rij
  zelf-verklarende-noch-uitgelegde iconen.
- Kernworkflows vereisen plugins; er is geen begeleide setup.
- Markdown + YAML + Dataview vormen samen een leercurve.
- **"Vault-tweaken vervangt de gewoonte om notities te maken."** Dit is de scherpste
  formulering van jouw probleem die ik ben tegengekomen, en het is precies wat Lapis
  onmogelijk moet maken.

Let op de asymmetrie: bijna alle "Obsidian is te veel"-artikelen sturen je richting
Notion, Bear of Logseq. Twee daarvan geven je lokale platte tekst op, één (Logseq) ruilt
complexiteit in voor een *ander* soort complexiteit (outliner-denken, blokreferenties).
Niemand beantwoordt de vraag "geef me Obsidian minus 80%".

## 3. Speler-voor-speler

Beoordeeld op vier assen die voor jou tellen:
**L** = leest een gewone lokale map, **R** = rust/visuele eenvoud,
**V** = vinden (zoeken/navigeren op schaal), **U** = uitbreidbaarheidsdruk
(hoeveel het je verleidt tot tweaken — lager is beter).

| Tool | L | R | V | U | Kern-oordeel |
|---|:-:|:-:|:-:|:-:|---|
| **Obsidian** | ✅ | ❌ | ✅ | ⚠️ hoog | De referentie. Kan alles, laat dat ook overal zien. Het probleem. |
| **Typora** | ✅ | ✅ | ❌ | ✅ laag | Het dichtst bij de gewenste *sfeer*. Maar: geen backlinks, geen tag-systeem, geen kennisbank-zoek. Puur een schrijftool. €14 eenmalig. |
| **iA Writer** | ✅ | ✅ | ❌ | ✅ laag | Prachtige focus-modus, sterke typografie. Bibliotheek-model in plaats van map-model; zoeken is zwak. |
| **Bear** | ❌ | ✅ | ✅ | ✅ laag | "Voor mensen die vinden dat Obsidian te veel knoppen heeft" — maar eigen database, geen map met `.md`. Diskwalificerend. $2,99/mnd. |
| **Zettlr** | ✅ | ❌ | ✅ | ⚠️ | Academisch: citaties, Pandoc, wikilinks. Meer machinerie dan Obsidian, niet minder. |
| **Logseq** | ✅ | ⚠️ | ✅ | ⚠️ | Lokale markdown, maar dwingt een outliner-model op je notities af. Andere complexiteit, niet minder. |
| **Joplin** | ⚠️ | ❌ | ✅ | ⚠️ | Filosofisch het dichtst bij Obsidian, maar eigen opslaglaag en een gedateerde UI. |
| **VS Code + extensies** | ✅ | ❌ | ✅ | ⚠️ hoog | Al aanwezig, gratis, krachtig. Maar het voelt als werken, niet als schrijven. |
| **Apple Notes** | ❌ | ✅ | ⚠️ | ✅ | Geen markdown, geen bestanden. Buiten beeld. |
| **CrabPad / Kuku e.a.** | ✅ | ✅ | ⚠️ | ✅ | Nieuwe Tauri-editors, precies onze categorie. Klein, jong, wisselende volwassenheid. Belangrijk als *bewijs dat het kan*, minder als concurrent. |

## 4. Waar het gat zit

Zet je de spelers op twee assen — *lokale map als bron van waarheid* tegenover
*hoeveel de tool je toont* — dan valt het uiteen in drie clusters:

```
        veel functionaliteit / veel UI
                     ▲
      Zettlr ●       │       ● Obsidian
                     │   ● Logseq
   geen ◄────────────┼────────────► lokale map
   lokale            │              = bron van waarheid
   map        Bear ● │       ◌ ← hier zit niets
              Notes ●│  ● iA Writer  ● Typora
                     ▼
        weinig functionaliteit / rustige UI
```

Het lege kwadrant is: **lokale map + kennisbank-vinden (zoek, tags, links) + rustige UI**.
Typora en iA Writer zitten er het dichtst bij maar missen de vind-laag; ze zijn gemaakt
om één document te schrijven, niet om driehonderd documenten te bewonen. Obsidian heeft
de vind-laag wel, maar levert die met een heel besturingssysteem eromheen.

**Positionering van Lapis:** *een leesbare map met markdown-bestanden — met Obsidians
geheugen en Typora's rust.*

## 5. Wat we van de concurrentie overnemen

- **Typora / iA Writer** → live preview zonder split-pane; de tekst is het document.
  Sterke typografie en ruime marges als hoofd-feature, niet als thema-optie.
- **Obsidian** → `⌘K` quick switcher en de kwaliteit van het zoeken. Dat zijn de twee
  onderdelen die je écht mist als ze er niet zijn.
- **Bear** → tags als lichte, platte organisatie boven mappenhiërarchie.
- **Alle Tauri-editors** → houd het binaire pakket klein; het is een verifieerbaar
  bewijs van de belofte.

En wat we bewust *niet* overnemen: Obsidians ribbon, plugin-store, thema-store, canvas
en graph view. Zie de anti-scope in de [PRD](03-prd.md#5-anti-scope).

## 6. De nulmeting: eerst het goedkope alternatief

Eerlijk PM-werk betekent ook het project proberen te doden voordat het begint. Er zijn
twee goedkopere oplossingen voor jouw probleem:

**A. Obsidian uitkleden (kosten: één avond).**
Zet de ribbon uit, verberg de statusbalk, schakel alle core-plugins uit die je niet
gebruikt, zet een minimaal thema op met ruime regelafstand, en verstop de sidebars.
Wat overblijft lijkt verrassend veel op wat Lapis wil zijn.

**B. Typora op dezelfde map (kosten: €14).**
Je krijgt onmiddellijk de rust. Je verliest zoeken over de hele map en tags.

**Waarom dit alsnog doorgaat.** Optie A lost het visuele probleem op maar niet het
gevoel van bloat — het gewicht zit er nog steeds onder, en de verleiding om te tweaken
juist ook. Optie B lost precies de helft op. Belangrijker: het echte doel dat je
formuleerde is *onderzoeken of het mogelijk is dit zelf te maken*. Dat is een geldig
doel, en het antwoord daarop staat in het [haalbaarheidsonderzoek](02-haalbaarheidsonderzoek.md).

Wel de aanbeveling: doe optie A vóór milestone M0. Eén avond, en je weet daarna veel
preciezer welke vijf dingen er echt mis zijn. Dat is de beste ontwerpinput die er is.

---

## Bronnen

- [Obsidian Statistics 2026 – Fueler](https://fueler.io/blog/obsidian-usage-revenue-valuation-growth-statistics)
- [Note Taking App Market Report 2026 – The Business Research Company](https://www.thebusinessresearchcompany.com/report/note-taking-app-global-market-report)
- [Obsidian is Too Complicated: When Simpler is Better – Unmarkdown](https://unmarkdown.com/blog/obsidian-is-too-complicated)
- [7 Simpler Obsidian Alternatives for Easier Note-Taking – Atlas](https://www.atlasworkspace.ai/blog/obsidian-alternatives-simpler)
- [My Obsidian vault got too bloated – XDA](https://www.xda-developers.com/my-obsidian-vault-got-too-bloated-so-switched-to-app-simple-notes/)
- [Comparing Markdown-based Note Taking Software – PäksTech](https://pakstech.com/blog/markdown-note-taking/)
- [Best Markdown Editors 2026 – MDtoLink](https://mdtolink.com/blog/best-markdown-editors/)
- [Minimalist Markdown Mac Note-Taking Apps Compared – Ry Walker](https://rywalker.com/research/minimalist-markdown-mac-notes)
- [7 Best Markdown Apps for Mac in 2026](https://macmdviewer.com/blog/markdown-app-mac)
