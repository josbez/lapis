# 06 – Beslisinput techniek

**Wat dit document is:** materiaal om de vragen in sectie D en E van
[05 – Open vragen](05-open-vragen.md) te kunnen beantwoorden. Het bevat feiten,
voorbeelden en afwegingen. **Het bevat geen besluiten.** Waar ik een mening heb, staat
die als mening gemarkeerd.

**Wat dit document ook is:** een correctie. In ronde 1 heb ik Tauri gekozen met een
argument dat bij nader inzien niet goed aansluit op jouw probleem. Dat leg ik in §1.4
uit, want het verandert de afweging wezenlijk.

---

## 1. Electron versus Tauri v2 — de feitelijke vergelijking

### 1.1 Wat je ermee bouwt

Beide zijn hetzelfde idee: een desktop-app waarvan de interface een webpagina is.
Het verschil zit in wat die webpagina rendert en wat eronder draait.

| | **Electron** | **Tauri v2** |
|---|---|---|
| Rendering | Eigen meegeleverde Chromium | De webview van het OS (WKWebView op macOS) |
| Backend-taal | Node.js (JavaScript/TypeScript) | Rust |
| Talen in het project | 1 (TypeScript) | 2 (TypeScript + Rust) |
| Pakketgrootte | ~85 MB minimum | ~3–10 MB |
| RAM idle | ~170 MB | ~40 MB |
| Koude start | ~1.400 ms | ~380 ms |
| Rendering-verschillen tussen platforms | Geen — overal dezelfde Chromium | Ja — WebKit vs WebView2 verschillen in CSS, fonts, keyboard events |
| Mobiel | Niet mogelijk | iOS + Android vanuit dezelfde codebase |
| Volwassenheid | ~13 jaar, enorme hoeveelheid voorbeelden | Stabiel sinds oktober 2024 (v2), mobiel nieuwer |

### 1.2 Voorbeelden — wat is waarmee gebouwd

Dit vroeg je expliciet.

**Electron.** Vrijwel alles wat je kent:

> Visual Studio Code · Slack · Discord · **Obsidian** · Notion · Figma (desktop) ·
> Signal · Postman · Linear · 1Password 8 · Todoist · Docker Desktop · Insomnia ·
> Bitwarden · WhatsApp Desktop

Dat je Electron bekender voorkomt, is dus geen indruk maar een feit: het is het
dominante framework voor deze categorie, en **de app die je wilt vervangen is er zelf
mee gebouwd.**

**Tauri.** Kleiner, nieuwer, maar met serieuze projecten:

> GitButler (Git-client, ~19k sterren) · Spacedrive (bestandsbeheerder, ~37k sterren) ·
> Yaak (API-client, ~18k sterren, commercieel: $79/jaar) · Hoppscotch Desktop ·
> Clash Verge · Pake · JET Pilot (Kubernetes-client) · Mission Center

Ook in onze eigen categorie: `CrabPad` en `Kuku` zijn markdown-editors op Tauri — bewijs
dat het pad begaanbaar is, maar geen van beide is een gevestigde naam.

**Samenvatting van dit punt:** Electron heeft een veel grotere bewezen staat van dienst,
Tauri heeft genoeg serieuze projecten om niet experimenteel te zijn.

### 1.3 De eerlijke argumenten vóór Electron die ik in ronde 1 weggelaten heb

Dit is waar mijn ronde-1-advies tekortschoot. Ik noemde alleen de nadelen van Electron.

1. **Eén taal in plaats van twee.** Bij Electron is het hele project TypeScript. Bij
   Tauri schrijf je de bestandslaag, de watcher en de index in Rust. Als je Rust nog moet
   leren, is dat geen bijzaak — het raakt precies de modules waar dataverlies kan
   ontstaan, dus de plek waar je het minst wilt experimenteren.
2. **Obsidian is Electron.** Elk voorbeeld, elke plugin, elke bekende valkuil rond
   CodeMirror in een markdown-editor is beschreven in een Electron-context. Je bouwt
   verder op andermans oplossingen in plaats van ze te vertalen.
3. **Volwassen bestandsecosysteem.** `chokidar` voor file watching is jarenlang gehard op
   precies de randgevallen die ons pijn doen (netwerkschijven, cloud-mappen, macOS-quirks).
   In Rust bestaat `notify`, dat is goed, maar je begint daar zelf aan de randgevallen.
4. **Voorspelbare rendering.** Chromium gedraagt zich zoals je in je browser test.
   WKWebView loopt op sommige CSS- en JS-features achter en heeft eigen eigenaardigheden
   met toetsenbord-events — precies het gebied waar een editor gevoelig is.
5. **Sneller uit de knoop.** Alleen 's avonds werken betekent dat vastlopen duur is. Voor
   Electron is er meer documentatie, meer Stack Overflow, en meer materiaal waarop
   taalmodellen zijn getraind. Je komt sneller weer los.
6. **Distributie en auto-update.** `electron-builder` en `electron-updater` zijn
   uitgekauwd. Tauri heeft een updater, maar met minder kilometers.

### 1.4 De correctie op mijn eigen redenering

Mijn ronde-1-argument was: *"je bouwt dit ómdat het huidige te zwaar is, dus kies het
lichte framework."*

Dat klinkt logisch en het is waarschijnlijk verkeerd. Jouw klacht was:

> "Heel veel functies die ik niet gebruik en visueel vind ik het overweldigend en niet
> fijn werken."

Dat gaat over **interface en functie-omvang**. Electrons kosten zitten in **RAM en
schijfruimte**. Dat zijn twee verschillende dingen, en ik heb ze op elkaar geplakt omdat
het woord "bloated" toevallig voor allebei wordt gebruikt.

Een Electron-app met precies jouw functies en een rustig scherm lost je probleem volledig
op — en gebruikt daarbij 170 MB RAM in plaats van 40 MB. **De vraag is of jou dat iets
kan schelen.** Op een moderne Mac merk je het verschil in de praktijk vooral bij koude
start (~1 s verschil).

Waar het gewicht wél meetelt: als "licht" voor jou een principe is dat je wilt kunnen
*aanwijzen* — een app van 8 MB die in 400 ms opstart is een controleerbare belofte. Dat
is een geldige productreden, maar het is een andere reden dan degene die ik gaf, en het
is aan jou of hij telt.

### 1.5 De eerlijke argumenten vóór Tauri

1. **Het is het enige pad naar mobiel** (zie §6). Als E2 "misschien" of "ja" is, is dit
   op zichzelf beslissend.
2. **Klein en snel als aanwijsbare eigenschap**, zie hierboven.
3. **Rust dwingt zorgvuldigheid af** op precies de laag waar dataverlies ontstaat.
   Andersom geldt punt 1 uit §1.3 — het is ook de laag waar je het minst wilt leren.
4. **Als A1 richting "bouwen" wijst**, is Rust leren een opbrengst en geen kostenpost.

### 1.6 Optie 3 en 4: native en hybride

**Native (SwiftUI/AppKit).** Beste macOS-gevoel, kleinste app, geen webview. De blokkade
is de editor: live preview in `NSTextView` bouwen is maanden werk en je verliest het hele
CodeMirror-ecosysteem. Alleen verdedigbaar als E2 en E3 allebei een hard "nee" zijn én A1
richting "bouwen" wijst.

**Hybride (native shell + CodeMirror in een `WKWebView`).** Native venster, menu's en
bestandslaag in Swift; alleen het editor-oppervlak is een webview. Je krijgt macOS-gevoel
én CodeMirror. In feite is dit "Tauri zonder Rust en zonder cross-platform". Kosten: je
bouwt de brug tussen Swift en JavaScript zelf, die Tauri je cadeau doet. Ik noem het voor
de volledigheid; het is de minst betreden route van de vier.

### 1.7 Beslisschema

Niet om voor je in te vullen, maar om de afhankelijkheden zichtbaar te maken:

```
E2: mobiel ooit?
├── Ja / waarschijnlijk ──────────────► Tauri v2 (enige pad)
├── Misschien ─────────────────────────► Tauri v2 (Electron = later herbouwen)
└── Nee, nooit
    └── E3: Windows/Linux ooit?
        ├── Ja ─────► Electron of Tauri — kies op D2 (wat ken je / wil je leren)
        └── Nee
            └── A1: hebben of bouwen?
                ├── Hebben ─► Electron (snelste, meeste voorbeelden, Obsidian-pad)
                └── Bouwen ─► Tauri, native of hybride — kies op leerdoel
```

**Mijn mening, als mening:** met E2 = nee neigt het naar Electron, sterker dan ik in
ronde 1 suggereerde. Met E2 = misschien of ja is Tauri de enige verdedigbare keuze. De
vraag "komt er ooit mobiel" is dus belangrijker dan alle prestatiecijfers samen.

---

## 2. Wat er niet verandert door de keuze

Nuttig om te weten hoe omkeerbaar dit is. Dit blijft gelijk bij Electron én Tauri:

- De hele frontend: CodeMirror 6, de live-preview-laag, de sidebar, het zoekpaneel, alle
  styling. Dat is het overgrote deel van het werk — en het is gewone webtechnologie.
- De datamodellen en de opzet van de zoekindex (SQLite bestaat in beide werelden).
- Het ontwerp uit Figma.

Wat er wél verandert: de bestandslaag, de watcher, het opslagpad, de bouw- en
distributieketen. Grofweg 20–30% van de code.

**Praktisch gevolg:** achteraf van framework wisselen is vervelend maar geen ramp — het
raakt de laag onder de UI, niet de UI zelf. Dat verlaagt de inzet van dit besluit
aanzienlijk. Wat níét achteraf kan: van Electron naar mobiel.

---

## 3. Prestatiecijfers in context

De benchmarks (augustus 2026) meten "hello world" en synthetische apps:

| | Electron 34.x | Tauri v2 |
|---|---|---|
| Hello world bundel | 85 MB | 3,2 MB |
| App met zes vensters | 244 MB | 8,6 MB |
| Koude start | 1.420 ms | 380 ms |
| RAM idle | 168 MB | 42 MB |

**Kanttekening die erbij hoort:** dit zijn lege apps. Zodra CodeMirror, je index en je
vault erin zitten, lopen beide op. Het verschil blijft bestaan maar wordt naar verhouding
kleiner. Voor een realistische vergelijking zou je in de M0-spike beide varianten moeten
bouwen — dat is twee keer twee avonden, en het is een legitieme investering als dit
besluit je zwaar valt.

---

## 4. Sync — wat elke optie technisch betekent

Je noemde iCloud, Google Drive, een homeserver, of gewoon lokaal. Deze keuze is
technisch veel bepalender dan hij lijkt: **hij bepaalt hoe moeilijk de bestandslaag wordt
en welke fouten überhaupt kunnen optreden.**

### 4.1 iCloud Drive

Werkt, maar met twee valkuilen die Obsidian-gebruikers aantoonbaar raken:

- **Bestanden zonder inhoud.** Staat "Optimaliseer Mac-opslag" aan, dan verwijdert macOS
  lokale kopieën van bestanden die het weinig gebruikt vindt en laat een placeholder
  achter. Een gedocumenteerd geval: 511 van 689 bestanden in een vault waren dataloos,
  waardoor elke bestandslezing stopte om eerst te downloaden — trage start, traag zoeken.
  Oplossing: "Altijd op dit apparaat bewaren" op de vault-map, en die instelling uit.
- **Onbetrouwbare events.** iCloud kan bestanden laat materialiseren en genereert niet
  altijd bruikbare FSEvents-meldingen. Bestaande oplossingen combineren daarom een
  watcher met periodiek pollen.

**Gevolg voor Lapis:** de bestandslaag moet dataloze bestanden herkennen en netjes
afhandelen, en een polling-vangnet naast de watcher hebben. Reken op een week extra werk
en een categorie bugs die lastig te reproduceren is.

### 4.2 Google Drive for desktop

Koppelt een virtueel bestandssysteem aan in plaats van gewone bestanden op schijf. Dat
betekent: file watching gedraagt zich anders, prestaties zijn onvoorspelbaarder, en
conflicten leveren duplicaten op (`notitie (1).md`). Ook bekend: conflicten met macFUSE
als je dat om andere redenen hebt.

**Gevolg voor Lapis:** vergelijkbaar met iCloud, met minder beschikbare kennis om op te
leunen, omdat minder mensen dit doen.

### 4.3 Homeserver — Syncthing, WebDAV, of git

**Technisch verreweg het makkelijkst.** Het zijn gewone bestanden op een echte schijf.
FSEvents werkt zoals bedoeld, geen placeholders, geen virtueel bestandssysteem. Conflicten
worden zichtbaar als extra bestanden (`.sync-conflict-…`) die je gewoon kunt tonen.

Git heeft een extra voordeel: versiegeschiedenis, waarmee vraag D7 (back-ups) grotendeels
vervalt. Nadeel: je moet zelf committen, of het automatiseren.

### 4.4 Geen sync, alleen lokaal

Het simpelst van allemaal. Geen conflictafhandeling nodig behalve tegen andere apps op
dezelfde Mac. Wel: geen back-up buiten Time Machine.

### 4.5 Waarom dit een productbeslissing is, geen infrastructuurdetail

| Jouw antwoord op E1 | Extra werk in de bestandslaag | Categorie bugs |
|---|---|---|
| Lokaal / Syncthing / git | Basis | Beheersbaar |
| iCloud | + polling-vangnet, + dataloze bestanden, + zwaardere conflict-UI | Moeilijk reproduceerbaar |
| Google Drive | Idem, met minder documentatie | Idem |

Kies je iCloud, dan wordt het "gewoon een map met bestanden"-uitgangspunt van Lapis
merkbaar minder eenvoudig. Dat is geen reden om iCloud niet te kiezen — het is een reden
om het nú te weten in plaats van in wave 3.

---

## 5. Wat de editorbasis al meebrengt

Relevant voor C2 (wikilinks) en D4.

`atomic-editor` (MIT, React + CodeMirror 6) levert standaard: koppen, bold, cursief,
highlights, tabellen met bewerken in de cel, afbeeldingen, links, takenlijsten met
klikbare vinkjes, `[[wikilinks]]`, syntax-highlighting in codeblokken, en slim
lijstgedrag. Met virtualisatie voor grote documenten.

**Waarom dit voor C2 uitmaakt:** wikilinks *weglaten* is bij deze basis een handeling —
je zet iets uit dat er al is. Dat draait de vraag om: het is geen "wat kost het om ze te
bouwen", maar "wil ik ze zien of niet". Dat maakt het een puur ontwerpbesluit, en dus
volledig jouw call.

De alternatieven (`codemirror-live-markdown`, `codemirror-rich-obsidian`) zijn modulairder:
je zet extensies aan die je wilt. Meer werk om te beginnen, meer controle over wat er wel
en niet in zit.

---

## 6. Mobiel — wat het echt betekent

Dit vroeg je, en het antwoord is ingrijpender dan je waarschijnlijk verwacht.

### 6.1 De harde beperking: iOS laat dit niet toe

Het uitgangspunt van Lapis — *"wijs de app naar een willekeurig mapje met .md-bestanden"* —
**bestaat niet op iOS.** Apps kunnen daar niet programmatisch buiten hun eigen sandbox
kijken. Je kunt via de document picker een map láten kiezen door de gebruiker en die
toegang bewaren met een security-scoped bookmark, maar het systeem staat maar een beperkt
aantal van die toegangen tegelijk toe en het is bewerkelijk.

Obsidian loopt tegen precies dit aan: op iOS kan een vault alleen in de eigen
Obsidian-map of in iCloud staan. Er ligt al jaren een open verzoek in hun forum om
willekeurige mappen te ondersteunen.

**Dus:** een mobiele Lapis is per definitie een ander product dan de desktopversie —
niet dezelfde app op een klein scherm.

### 6.2 De drie mobiele routes

| Route | Wat het betekent | Impact op de keuze nu |
|---|---|---|
| **Tauri v2 mobiel** | iOS en Android vanuit dezelfde codebase. De frontend (CodeMirror, UI) hergebruik je vrijwel volledig; de bestandslaag schrijf je opnieuw per platform. Mobiele ondersteuning is stabiel maar nieuwer dan desktop; sommige plugins ontbreken of gedragen zich anders. | **Sluit Electron uit** |
| **Los mobiel project** (Swift, React Native, Capacitor) | Je bouwt een tweede app. Is je frontend gewone webtechnologie, dan is de UI-laag herbruikbaar in een Capacitor-schil — ook als de desktop op Electron draait. Dat maakt Electron minder van een doodlopende weg dan het lijkt. | Electron blijft mogelijk, tegen dubbel werk |
| **Mobiele web-app** | iOS Safari heeft geen File System Access API. Een web-app kan een lokale map op je telefoon dus niet lezen. Je hebt een server nodig plus een sync-protocol. | **Ander product.** Dit is geen uitbreiding maar een herstart |

### 6.3 De vraag achter de vraag

Wat wil je op je telefoon werkelijk doen? Er zit een groot verschil tussen:

- **Snel iets opschrijven** → hoeft niet in dezelfde app. Apple Notities of een
  shortcut die naar een `inbox.md` schrijft die via je sync-oplossing binnenkomt, lost
  dit voor nul euro op.
- **Lezen en zoeken onderweg** → middelgroot probleem, goed op te lossen.
- **Volwaardig bewerken** → groot, en het is waar mobiele PKM-apps meestal teleurstellen.

**Mijn mening, als mening:** als het antwoord "snel iets opschrijven" is, hoort dat niet
in Lapis maar in je sync-map, en dan mag E2 gerust "nee" zijn zonder dat je iets opgeeft.

---

## 7. Waar de "6–9 weken" vandaan kwam, en waarom het getal nog niets waard is

Je vroeg dit terecht. Hier is de volledige opbouw.

### 7.1 De optelsom

| Milestone | Inhoud | Uren |
|---|---|---|
| M0 | Spike: map openen, één bestand bewerken en opslaan | 6 |
| M1 | Bestandsboom, navigatie, watcher, index-skelet | 12 |
| M2 | Live preview, autosave, conflictafhandeling, atomair schrijven | 25 |
| M3 | Zoekindex, `⌘K`, `⌘⇧F` | 12 |
| M4 | Frontmatter, tags, tag-overzicht | 8 |
| M5 | Nieuw/hernoemen/prullenbak/verslepen | 8 |
| M6 | Typografie, licht/donker, sneltoetsen, lege staten, instellingen | 12–25 |
| | **Subtotaal** | **83–96** |
| | Opslag voor projectopzet, debuggen, leren (+25%) | 21–24 |
| | **Totaal** | **~105–120 uur** |

### 7.2 De verborgen aanname

105–120 uur gedeeld door "6–9 weken" betekent **13–15 uur per week**. Dat is ongeveer
vijf avonden van drie uur, elke week, drie maanden lang.

**Dat heb ik nergens opgeschreven en nooit aan je gevraagd.** Bij een realistischer
tempo:

| Avonden per week (3 uur) | Uren/week | Doorlooptijd |
|---|---|---|
| 2 | 6 | **18–20 weken** |
| 3 | 9 | **12–13 weken** |
| 5 | 15 | 7–8 weken |

De schatting was dus niet fout in uren, maar de doorlooptijd die ik eraan verbond ging
uit van een werktempo dat ik verzonnen had. Daarom staat vraag G5 in het open-vragen-document.

### 7.3 Wat er níét in zit

- **Ontwerptijd in Figma.** Onbekend, en het is de helft van het product.
- **Het schrijven van de wave-documenten.** Drie documenten per wave is een reële
  investering — vermoedelijk 2–4 uur per wave.
- **Het schrijven van tests**, als het antwoord op G4 "ja, geautomatiseerd" is. Reken
  op +30–40% op de implementatie-uren.
- **De leercurve van Rust**, als D1 op Tauri uitkomt en je Rust nog niet kent. Dit kan
  alles zijn tussen 10 en 60 uur.
- **De onvermijdelijke categorie**: de sync-gerelateerde randgevallen uit §4, als E1 op
  iCloud of Google Drive uitkomt.

### 7.4 De eerlijke conclusie over dit getal

**Een schatting vóór de scope vaststaat is geen schatting maar een gevoel.** De cijfers
hierboven zijn gebaseerd op mijn eigen functielijst — dezelfde lijst die nu als open
vraag terugligt bij C1 en C12. Verandert die lijst, dan verandert alles.

Wat de schatting wél bruikbaar maakt, in volgorde:

1. Antwoorden op sectie C (welke functies) en G5 (hoeveel uren per week).
2. De M0-spike werkelijk uitvoeren. Daarna weet je hoe snel jij in deze stack werkt, en
   dat is de enige factor die echt telt.
3. Per wave schatten in plaats van het hele project. Dat is precies wat de wave-methode
   bedoelt: kleine, afgeronde brokken met een bewijsbaar einde.

**Mijn advies over hoe je met dit getal omgaat:** niet als planning gebruiken. Gebruik het
alleen om te beoordelen of de orde van grootte acceptabel is — dit is een project van
maanden, niet van weekenden. Als dat op zichzelf al te veel is, is dat waardevolle
informatie en hoort die in A4.

---

## Bronnen

- [Tauri vs Electron 2026 – benchmarks](https://tech-insider.org/tauri-vs-electron-2026/)
- [Awesome Tauri – lijst van productie-apps](https://github.com/tauri-apps/awesome-tauri)
- [Tauri (software framework) – Wikipedia, versiestatus](https://en.wikipedia.org/wiki/Tauri_(software_framework))
- [Tauri v2 mobile guide (iOS/Android)](https://www.oflight.co.jp/en/columns/tauri-v2-mobile-ios-android)
- [Tauri – Mobile Plugin Development](https://v2.tauri.app/develop/plugins/develop-mobile/)
- [Your Slow Obsidian Is iCloud's Fault – Jason Cameron](https://jasoncameron.dev/posts/obsidian-slow-startup-icloud)
- [Obsidian iCloud Sync: Setup, Problems, and Safer Alternatives](https://synch.run/blog/obsidian-icloud-sync/)
- [Obsidian-iCloud – watcher + polling-aanpak](https://github.com/mnott/Obsidian-iCloud)
- [Full File System Access For The iOS App – Obsidian Forum](https://forum.obsidian.md/t/full-file-system-access-for-the-ios-app-open-existing-vault-folder/28266)
- [Accessing Security Scoped Files – Use Your Loaf](https://useyourloaf.com/blog/accessing-security-scoped-files/)
- [atomic-editor (MIT)](https://github.com/kenforthewin/atomic-editor)
