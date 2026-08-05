# Wave W0 Goal Document — Spike: wil ik hierin typen?

| | |
|---|---|
| **Status** | Ter goedkeuring door Jos |
| **Gezag** | Dit document beheerst uitkomst, scope, grenzen en stopcondities van W0 |
| **Bron** | [PRD v1.1](../../03-prd.md) · [Wave-methode](../../07-wave-methode.md) |

---

## 1. Wave Identity

- **Wave number:** W0
- **Wave name:** Spike — wil ik hierin typen?
- **Wave type:** spike / technische validatie. **Wegwerpcode.**
- **Previous dependency wave(s):** geen. Dit is de eerste wave.
- **Next likely wave(s):** W1 (vault openen en tonen)

## 2. Current Platform Gap

Gegeven de huidige stand van het project — een goedgekeurde PRD, een gekozen stack en
nul regels code — kunnen we nog niet vaststellen of Tauri v2 met React, CodeMirror 6 en
`atomic-editor` een schrijfervaring oplevert waarin Jos daadwerkelijk wíl werken.

Dat is niet uit documentatie af te leiden. Live preview is subtiel: cursorgedrag door
verborgen syntax heen, selecties, plakgedrag, undo. Negentig procent goed voelt in een
dagelijkse editor als honderd procent fout.

Deze wave bestaat om die vraag te beantwoorden **voordat** er productiecode ontstaat die
op een verkeerd antwoord gebouwd is.

## 3. Purpose

Deze wave bestaat om vast te stellen of de gekozen editorbasis prettig aanvoelt om in te
typen, zonder een architectuur, een bestandslaag of een ontwerp te bouwen.

De uitkomst is een oordeel van Jos, niet een werkend product.

## 4. Outcome

Deze wave is compleet wanneer:

- Er een Tauri v2-app op macOS draait met een React-frontend en CodeMirror 6 via
  `atomic-editor`.
- Je in die app een map kunt kiezen en daaruit één `.md`-bestand kunt openen.
- Je dat bestand in live preview kunt bewerken en kunt opslaan naar dezelfde locatie.
- Openen en direct opslaan zónder te bewerken het bestand **byte-identiek** laat.
- **Jos er minstens één echte notitie in heeft getypt** en een schriftelijk oordeel heeft
  gegeven: doorgaan met deze editorbasis, of overstappen op route b of c uit
  [D4](../../05-open-vragen.md#d4--editorbasis).

Het laatste punt is de eigenlijke oplevering. De rest is er alleen om dat punt mogelijk
te maken.

## 5. In Scope

- Een Tauri v2-project opzetten dat op macOS bouwt en start.
- React + CodeMirror 6 + `atomic-editor` in het venster krijgen.
- Een map kiezen via de systeem-bestandskiezer.
- Eén `.md`-bestand openen, tonen in live preview, bewerken, opslaan.
- Eén geautomatiseerde controle: de byte-identieke round-trip uit §4.
- Een kort verslag van wat er tijdens het bouwen tegenviel of meeviel.

## 6. Out Of Scope

Alles hieronder is expliciet uitgesloten, ook als het verleidelijk of "bijna gratis" is:

- Bestandsboom, sidebar, navigatie.
- De gekozen map onthouden tussen sessies.
- Autosave, het focusmodel, conflictdetectie, file watching.
- Atomair schrijven. In W0 mag naïef geschreven worden — daarom draait W0 nooit tegen
  echte notities (zie §9).
- Zoeken, index, SQLite.
- Bestandsbeheer: nieuw, hernoemen, verplaatsen, verwijderen.
- Bijlagen, plakken van afbeeldingen, de map-per-notitie-regel.
- De vaste eerste pagina.
- Enige vorm van visueel ontwerp. Standaardstijl is goed genoeg; mooier maken is in deze
  wave een fout, geen bonus.
- Instellingen, menu's, sneltoetsen buiten wat nodig is om op te slaan.
- Distributie, signing, notarisatie.
- Elke voorbereiding op mobiel, Windows of Linux.

Wat `atomic-editor` uit zichzelf meebrengt — wikilinks, tabellen, takenlijsten — mag
blijven staan. Het uitzetten daarvan is óók scope, en dus ook uitgesloten.

## 7. Verification Intent

Deze wave wijkt bewust af van de standaardregel dat een wave bewijsbaar af moet zijn met
tests. Een spike bewijst een oordeel, en een oordeel is niet te automatiseren. De
afwijking is hier vastgelegd in plaats van stilzwijgend genomen.

Wat er wel aan bewijs moet liggen:

- **Bestandsbewijs:** één geautomatiseerde test die aantoont dat openen en opslaan zonder
  bewerking het bestand byte-identiek laat. Dit is de enige automatische test in W0, en
  hij staat er omdat een fout hier de hele aanpak ondergraaft.
- **Browser-/UI-bewijs:** niveau C (handmatig, met screenshot of schermopname), conform
  [07 §4.2](../../07-wave-methode.md#42-wat-browser-bewijs-hier-betekent). Reden: er is
  nog geen stabiele UI om tegen te automatiseren, en de code wordt weggegooid.
- **Isolatiebewijs:** niet van toepassing voor deze wave, omdat de code niet in het
  product terechtkomt. De isolatiechecks gelden vanaf W1.
- **Regressiebewijs:** niet van toepassing, er is geen bestaand gedrag.
- **API-bewijs:** niet van toepassing, er is geen API en de IPC-laag wordt in W1 pas
  ontworpen.
- **Oordeel van Jos:** schriftelijk, in `03-bewijs.md` van deze wave.

## 8. Happy Flow Intent

1. Jos start de app.
2. Hij kiest een map (de kopie uit §9).
3. Hij ziet de bestanden in die map en opent er één.
4. De inhoud verschijnt opgemaakt, terwijl de bron markdown blijft.
5. Hij typt een echte notitie: koppen, een lijst, wat nadruk, een codeblok.
6. Hij slaat op.
7. Hij opent hetzelfde bestand in Obsidian en ziet exact wat hij verwachtte.
8. Hij schrijft op of hij hierin wil blijven typen.

Stap 5 en 8 zijn de wave. De rest is de aanloop.

## 9. Constraints

- **Wegwerpcode.** W0 is expliciet niet de basis van W1. De code mag rommelig zijn, mag
  afkortingen bevatten en hoeft geen architectuur te hebben. W1 begint opnieuw, met W0 als
  kennis en niet als fundament.
- **Nooit tegen `~/Documents`.** W0 draait uitsluitend tegen een kopie van een handvol
  notities in een aparte map. Reden: W0 schrijft naïef, zonder atomair schrijven en zonder
  conflictdetectie. *Dit volgt uit de afspraak in [ronde 2, V6b](../../08-vervolgvragen.md);
  de toepassing op een handmatige spike is mijn interpretatie en mag je terugdraaien.*
- **Geen netwerkverkeer** in de app, conform [PRD §8](../../03-prd.md#8-randvoorwaarden).
- **Geen scope-uitbreiding om iets makkelijker te maken.** Blijkt iets uit §5 lastig, dan
  is de melding daarvan waardevoller dan een omweg eromheen.
- **Geen ontwerpwerk.** Zie [PRD F6](../../03-prd.md#4-scope-v1): de eerste versie in code
  is een wireframe. In W0 zelfs dat nog niet.

## 10. Boundaries

**Toegestaan:**

- Een nieuwe map `spike/` in deze repo, met een eigen `package.json` en `Cargo.toml`.
- De afhankelijkheden die de stack vereist: Tauri v2, React, CodeMirror 6,
  `atomic-editor`.
- Een testmap met kopieën van notities, buiten de repo.

**Niet toegestaan:**

- Bestanden buiten `spike/` in deze repo aanmaken of wijzigen, met uitzondering van
  `docs/waves/W0-spike/`.
- Enige schrijfactie in `~/Documents`.
- Wijzigingen aan de documenten 01 t/m 08.

**Netwerktoegang:** alleen voor het ophalen van afhankelijkheden tijdens het bouwen.

## 11. Domain Isolation Requirement

Niet van toepassing voor deze wave, omdat de code wordt weggegooid en niet in het product
terechtkomt. De isolatiechecks uit
[07 §4.3](../../07-wave-methode.md#43-onze-eigen-isolatiecheck) gelden vanaf W1.

Eén regel geldt wel, omdat hij over jouw data gaat en niet over codehygiëne: **geen
hardgecodeerd pad naar een vault.** De map wordt altijd gekozen.

## 12. Frontend / Backend Responsibility Boundary

Deze wave heeft nog geen betekenisvolle scheiding tussen frontend en kern; die wordt in
W1 ontworpen. Wel geldt alvast de richting uit
[07 §4.4](../../07-wave-methode.md#44-de-verantwoordelijkheidsgrens): bestandsoperaties
gebeuren aan de Rust-kant, niet in de webview. Ook in wegwerpcode is dat geen extra werk,
en het levert kennis op die W1 direct kan gebruiken.

## 13. Test Plan Creation Requirement

Vóór implementatie moet er een Wave Test & Verification Plan liggen, opgesteld vanuit dit
Goal Document en de Wave Specification.

Voor W0 is dat plan kort: het bevat de byte-identieke round-trip-test, de handmatige
happy flow uit §8 met de vereiste bewijsstukken, en een expliciete verklaring waarom de
overige testcategorieën niet van toepassing zijn.

Er wordt niet begonnen met bouwen voordat dat plan er ligt. Dat het plan kort is, is geen
reden om het over te slaan.

## 14. Iteration Policy

- Werkt iets niet, bekijk dan eerst het bewijs voordat er iets wordt aangepast.
- Maak de kleinst verdedigbare wijziging.
- Draai de bijbehorende verificatie opnieuw na elke wijziging.
- Rek de scope niet op om iets werkend te krijgen.
- Houd bij wat er is geprobeerd en wat er niet gelukt is — bij een spike is dat de
  eigenlijke opbrengst.

## 15. Block Stop Conditions

Stop en meld een blokkade wanneer:

- `atomic-editor` niet werkend te krijgen is in Tauri's WKWebView. **Meld dit als
  bevinding bij [D4](../../05-open-vragen.md#d4--editorbasis)**, met een voorstel voor
  route b (losse CodeMirror 6-extensies). Ga niet zelf over op route b — dat is een
  besluit van Jos.
- De Tauri v2-toolchain niet op te zetten is op deze machine.
- De byte-identieke round-trip niet haalbaar blijkt. Dat is een rode vlag voor de hele
  aanpak en verdient een gesprek, geen work-around.
- Er iets nodig blijkt dat in §6 als out of scope staat om de happy flow te halen.

Het blokkadeverslag vermeldt: wat er is geprobeerd, welk bewijs is gevonden, waarom het
doel zo niet gehaald kan worden, en wat er van Jos nodig is.

## 16. Goal Coach Readiness Judgment

**Status: Ready for Wave Specification.**

**Aannames:**

- `atomic-editor` werkt in een WKWebView zonder aanpassingen. Onbewezen; W0 bestaat mede
  om dat te toetsen.
- Een kopie van een handvol notities is representatief genoeg voor het oordeel. Bij twijfel
  neemt Jos zijn lastigste notitie mee.

**Open risico's en vragen:**

- Het oordeel in §4 is subjectief. Dat is met opzet, maar het betekent ook dat "het is
  bijna goed" een mogelijk antwoord is. In dat geval is de vervolgvraag niet *"nog even
  bijschaven?"* maar *"is dit met bijschaven op te lossen, of zit het in de basis?"*
- W0 raakt geen enkele veiligheidsgarantie uit de PRD, juist omdat hij niet tegen echte
  notities draait. Wordt die constraint teruggedraaid, dan verandert het risicoprofiel van
  deze wave volledig.

---

## Agent Handoff Instruction

```
Je krijgt twee brondocumenten:

1. Dit Goal Document
2. De Wave Specification voor W0

Je eerste taak is niet implementeren. Je eerste taak is het opstellen van het
Wave Test & Verification Plan.

Gezagsvolgorde:
1. Het Goal Document beheerst uitkomst en scope.
2. De Wave Specification beheerst implementatiedetails.
3. Het Test & Verification Plan beheerst bewijs en acceptatie.

Bij conflict: Goal wint van Spec. Spec wint van Test. Het testplan mag de scope
nooit oprekken. Kies bij twijfel de smalste interpretatie.

Begin niet met implementeren voordat het testplan er ligt.
```
