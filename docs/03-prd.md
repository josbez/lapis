# 03 – PRD: Lapis v1

| | |
|---|---|
| **Versie** | 0.1 (concept) |
| **Datum** | augustus 2026 |
| **Eigenaar** | Jos |
| **Status** | Ter besluit — klaar voor M0-spike |
| **Platform** | macOS (Apple Silicon), alleen |
| **Ambitie** | Eerst voor eigen gebruik; architectuur blijft open voor latere productisering |

---

## 1. Probleem

> "Ik vind Obsidian echt een hele fijne tool maar hij voelt bloated voor mij. Heel veel
> functies die ik niet gebruik en visueel vind ik het overweldigend en niet fijn werken."

Ontleed in drie afzonderlijke problemen — ze hebben verschillende oplossingen:

**P1 – Visuele overbelasting.** Het scherm toont permanent besturingselementen die
zelden nodig zijn: ribbon, tabs, statusbalk, twee sidebars, plugin-indicatoren. De tekst
— het enige dat telt — krijgt een minderheid van het scherm en concurreert met de rest
om aandacht.

**P2 – Functionele ruis.** Commando's, instellingen en menu-opties voor functies die
nooit gebruikt worden, maken de functies die je wél gebruikt moeilijker vindbaar. Het
instellingenscherm alleen al heeft meer dan twintig secties.

**P3 – De tweak-val.** Een uitbreidbaar systeem nodigt uit tot onderhoud van het
systeem. Dat onderhoud voelt productief en is het niet. Meerdere gebruikers beschrijven
dit als "vault-tweaken vervangt de gewoonte om notities te maken".

Wat er níét mis is met Obsidian, en dus behouden moet blijven: platte `.md`-bestanden in
een gewone map, snelle navigatie via `⌘K`, en zoeken dat werkelijk alles vindt.

## 2. Wie is de gebruiker

**Primair (v1): n = 1.** Jij. Een bestaande vault met markdown-bestanden, gebruikt voor
notities en schrijven, dagelijks, op één Mac. Comfortabel met markdown, niet op zoek
naar een databaseachtige kennisbank.

**Secundair (mogelijk later):** de aantoonbaar bestaande groep die "Obsidian is te
ingewikkeld" zegt maar niet naar Notion of Bear wil omdat die de lokale platte tekst
opgeven. Zie [concurrentieonderzoek §2](01-concurrentieonderzoek.md#2-het-geluid-van-de-gebruiker).
Deze groep beïnvloedt v1 op precies één manier: we bouwen geen dingen die alleen voor
jou werken (geen hardgecodeerde paden, geen aannames over jouw mapstructuur).

## 3. Productdoelen

**Doel:** de dagelijkse schrijf- en terugvindhandelingen op een lokale map met
markdown-bestanden, in een interface waar niets overbodigs op het scherm staat.

**Positionering:** *een leesbare map met markdown-bestanden — met Obsidians geheugen en
Typora's rust.*

**Ontwerpprincipes** (deze winnen bij twijfel, in deze volgorde):

1. **Jouw bestanden zijn heilig.** Lapis verliest nooit tekst en schrijft nooit iets in
   jouw map dat geen markdown is. Alle staat van de app leeft buiten de vault.
2. **Elk pixel dat geen tekst is, moet zich verantwoorden.** Standaard: verborgen.
3. **Weglaten boven configureren.** Een instelling is een uitgestelde beslissing. Als
   twee opties allebei redelijk zijn, kies je er één.
4. **Er is geen tweede systeem.** De vault in Lapis is dezelfde vault in Obsidian, in
   `vim`, in Finder. Altijd.
5. **Snel is een functie.** Koude start onder een seconde, typen zonder merkbare
   vertraging. Traagheid is hoe "bloated" voelt.

## 4. Scope v1

Prioritering: **M**ust (v1 zonder is zinloos) / **S**hould (v1.1) / **W**on't (anti-scope, §5).

### M1 — Vault openen en lezen `MUST`

- Map kiezen via een systeem-bestandskiezer; onthouden bij herstart.
- Bestandsboom in een sidebar: mappen en `.md`-bestanden, alfabetisch, inklapbaar.
- Sidebar is te verbergen (`⌘\`) en blijft verborgen tot je hem terughaalt.
- Niet-markdownbestanden worden getoond noch aangeraakt (uitzondering: afbeeldingen,
  die renderen in notities).

*Acceptatie:* een vault met 2.000 notities opent in < 1 s en toont de volledige boom.

### M2 — Lezen en schrijven in live preview `MUST`

- Eén editor, geen split-pane. Opmaak rendert terwijl je typt; de bron blijft markdown.
- Ondersteund: koppen, bold/italic/highlight, lijsten (met auto-doorloop), takenlijsten
  met klikbare vinkjes, codeblokken met syntax-highlighting, blockquotes, tabellen,
  links, inline afbeeldingen, horizontale lijnen.
- Kopiëren levert ruwe markdown op. Undo/redo werkt zoals in elke macOS-app.
- Automatisch opslaan, 500 ms na de laatste toetsaanslag én bij focusverlies.

*Acceptatie:* een bestand dat in Obsidian is gemaakt, opent in Lapis, wordt bewerkt, en
opent daarna in Obsidian met exact de verwachte inhoud — byte-voor-byte gelijk buiten
de bewerking.

### M3 — Vinden `MUST`

- **`⌘K` quick switcher:** fuzzy zoeken op bestandsnaam en titel, direct openen met
  Enter. Recent geopende bestanden bovenaan bij lege invoer.
- **`⌘⇧F` full-text search:** zoekt door de inhoud van de hele vault, met resultaten als
  regelfragmenten met de zoekterm gemarkeerd. Enter opent op de gevonden regel.

*Acceptatie:* zoekresultaten binnen 100 ms bij 5.000 notities. Een notitie die je 20
seconden geleden hebt opgeslagen, is vindbaar.

### M4 — Tags en frontmatter `MUST`

- YAML-frontmatter wordt herkend en standaard **ingeklapt** weergegeven (één regel:
  `title · tags · datum`), uitklapbaar om te bewerken. Frontmatter mag nooit als een
  blok ruwe YAML bovenaan je notitie in beeld staan.
- `#tags` in de body én `tags:` in de frontmatter tellen als dezelfde tag.
- Tag-overzicht: alle tags met aantallen; klikken toont de notities met die tag.
- Zoeken op `tag:naam` in full-text search.

*Acceptatie:* een vault met gemengde tag-conventies toont één consistente taglijst.

### M5 — Bestandsbeheer `MUST`

- Nieuw bestand (`⌘N`), hernoemen, verwijderen (naar prullenbak, niet permanent),
  verslepen tussen mappen, nieuwe map.
- Externe wijzigingen worden binnen ~1 s opgemerkt en zichtbaar; een bestand dat buiten
  Lapis wijzigt terwijl je het openhebt, leidt tot een expliciete melding — nooit tot
  stil overschrijven of stil herladen.

*Acceptatie:* `echo "test" >> notitie.md` in de terminal is binnen een seconde zichtbaar
in Lapis.

### M6 — Het uiterlijk `MUST`

Dit is geen afwerking; het is de reden dat het product bestaat.

- Eén venster. Maximaal: sidebar (verbergbaar) + editor. Geen tabs in v1.
- Ruime marges, beperkte regellengte (~70 tekens), royale regelafstand.
- Licht en donker, volgt het systeem. Geen thema-keuze.
- Geen ribbon, geen statusbalk, geen plugin-indicatoren, geen breadcrumbs.
- Instellingen: één scherm dat op één schermhoogte past. Als het niet past, is er een
  instelling te veel.

*Acceptatie:* op een leeg document is meer dan 85% van het venster tekst of witruimte.

### Should — v1.1

- **Link-compatibiliteit (`[[wikilinks]]`):** klikbaar, autocomplete bij typen.
  *Toelichting bij prioritering:* je gaf aan dat links geen must-have zijn, en dat
  respecteren we voor v1. Maar één deel hiervan is wél v1: als je bestaande notities
  `[[links]]` bevatten, moeten die **niet stukgaan en niet lelijk renderen**. Dat is
  goedkoop (de gekozen editor-basis ondersteunt het al) en de kosten van het overslaan
  zijn hoog. Concreet: v1 rendert wikilinks netjes en laat ze intact; klikken en
  autocomplete komen in v1.1.
- Backlinks-paneel (aan/uit, standaard uit).
- Daily note (`⌘D`, één sjabloon, geen sjabloon-systeem).
- Exporteren naar PDF via de macOS-printdialoog.
- Meerdere vaults kunnen openen (venster per vault).

## 5. Anti-scope

**Dit bouwen we niet.** Niet in v1, niet in v2. Dit is het belangrijkste hoofdstuk van
dit document: als hier iets bij komt, is Lapis mislukt.

| Niet bouwen | Waarom |
|---|---|
| **Plugin-systeem** | Dit is de bron van het probleem. Een platform is iets anders dan een app. |
| **Thema-store, aanpasbare CSS** | Als het ontwerp goed is, hoeft niemand het aan te passen. Als het aangepast moet worden, is het ontwerp niet af. |
| **Graph view** | Ziet er indrukwekkend uit, wordt na week twee nooit meer geopend. |
| **Canvas / whiteboard** | Ander product. |
| **Sync-dienst, accounts, cloud** | iCloud/Dropbox/git doen dit al voor een map met bestanden. |
| **Mobiele app** | Zie [haalbaarheid §7](02-haalbaarheidsonderzoek.md#7-wat-maakt-dit-niet-haalbaar). |
| **Samenwerking, commentaren** | Ander product. |
| **AI-chat met je notities** | Als dit ooit komt, is het een apart product op dezelfde map. Niet in Lapis. |
| **Dataview / query-taal** | De leercurve waar mensen over klagen. |
| **Sjabloon-systeem** | Eén daily-note-sjabloon in v1.1, verder niets. |
| **Splitsbare panelen, tabs, workspaces** | Precies de visuele overbelasting die we bestrijden. Eén document tegelijk. |
| **Meer dan 15 instellingen** | Harde limiet. Wil je er een toevoegen, dan haal je er een weg. |

**Regel voor nieuwe ideeën:** een functie mag alleen worden toegevoegd als (a) je hem in
de afgelopen twee weken echt gemist hebt, en (b) je kunt aanwijzen wat er in ruil voor
weg mag.

## 6. Succescriteria

Bij een product voor één gebruiker zijn omzetcijfers zinloos. Dit zijn de vervangers.

**De hoofdvraag — vier weken na v0.1:**
> Open ik Lapis in plaats van Obsidian, vier weken achter elkaar, zonder mezelf ertoe
> te dwingen?

Ja → doorgaan, en de vraag over productisering wordt reëel.
Nee → opschrijven waarom, en dan stoppen of terug naar de tekentafel. Dat is een
geldige uitkomst, geen mislukking.

**Ondersteunende meetpunten:**

| Meetpunt | Doel | Hoe gemeten |
|---|---|---|
| Dataverlies-incidenten | **0** — harde eis | Elk incident is een stopper |
| Koude start tot typbaar | < 1 s | Handmatig, bij elke milestone |
| Typvertraging | < 16 ms per aanslag | DevTools-profiel op een document van 5.000 woorden |
| Zoeken → juiste notitie open | < 3 s | Zelf klokken, tien keer |
| Aantal instellingen | ≤ 15 | Tellen |
| Percentage scherm dat tekst/witruimte is | > 85% | Screenshot meten |
| Pakketgrootte | < 20 MB | Build-output |
| Terugval naar Obsidian | Noteren wát je miste | Notitie in de vault zelf |

Die laatste is de waardevolste: elke keer dat je Obsidian opent omdat Lapis iets niet
kan, is dat de enige echte backlog-input die er is.

## 7. Gebruikersreizen

**Snel iets opschrijven.** `⌘N` → typen → sluiten. Geen dialoog over waar het bestand
komt (default: de vault-root of de laatst gebruikte map), geen titelveld — de eerste
kopregel wordt de bestandsnaam bij het eerste opslaan.

**Iets terugvinden dat je twee maanden geleden schreef.** `⌘⇧F` → term → pijltjes door
de resultaten → Enter. Je landt op de juiste regel, niet bovenaan het document.

**Even doorwerken aan iets van gisteren.** `⌘K` → eerste drie letters → Enter.

**Overzicht van een onderwerp.** Tag-overzicht openen → tag klikken → lijst van
notities. Geen graph, geen query.

**Een bestand komt binnen via iCloud terwijl je typt.** Lapis merkt het, meldt het
duidelijk, en overschrijft nooit stil. Zie
[tech spec §5](04-technische-spec.md#5-opslagmodel-en-conflicten).

## 8. Randvoorwaarden

- **Compatibiliteit:** een vault moet tegelijk in Obsidian en Lapis bruikbaar zijn. Lapis
  schrijft geen configuratie, geen cache en geen metadata in de vault-map. Alle
  app-staat leeft in `~/Library/Application Support/lapis/`.
- **Privacy:** geen netwerkverkeer. Geen telemetrie, geen crash-reporting, geen
  update-check in v1. Lapis werkt volledig offline en hoort dat ook te doen.
- **Toegankelijkheid:** volledig bedienbaar met het toetsenbord; respecteert de
  systeeminstellingen voor tekstgrootte en verminderde beweging.
- **Bestandsformaten:** UTF-8, LF-regeleindes, frontmatter volgens YAML — precies zoals
  Obsidian ze schrijft.

## 9. Openstaande vragen

| # | Vraag | Nodig vóór | Voorlopige richting |
|---|---|---|---|
| 1 | Bestandsnaam automatisch afleiden uit de eerste kop, of altijd handmatig? | M5 | Afleiden bij eerste opslag, daarna handmatig |
| 2 | Wat gebeurt er bij een bestand > 5 MB? | M2 | Waarschuwing + read-only openen |
| 3 | Sidebar tonen bij eerste start, of meteen kaal? | M6 | Eerste start met sidebar; keuze wordt onthouden |
| 4 | Verwijderen naar systeem-prullenbak of naar een `.trash`-map? | M5 | Systeem-prullenbak (regel 1: niets in de vault schrijven) |
| 5 | Blijft "later beslissen over productisering" over 3 maanden nog interessant? | Na v0.1 | Beantwoorden aan de hand van §6 |

## 10. Releaseplan

| Release | Inhoud | Doel |
|---|---|---|
| **M0 – spike** | Map openen, één bestand in live preview bewerken en opslaan | Beantwoordt: *wil ik hierin typen?* |
| **v0.1** | M1 + M2 + M5 | Dagelijks te gebruiken voor schrijven |
| **v0.2** | M3 + M4 | Vervangt Obsidian volledig voor jouw gebruik |
| **v1.0** | M6 volledig doorgevoerd + de rest afgewerkt | Het product waar dit om begonnen was |
| **v1.1** | Should-lijst uit §4 | Alleen wat je aantoonbaar gemist hebt |

Beslispunt na vier weken v1.0-gebruik: doorgaan voor jezelf, open source publiceren, of
stoppen. Zie [haalbaarheid §5](02-haalbaarheidsonderzoek.md#5-kosten) voor wat
distributie kost.
