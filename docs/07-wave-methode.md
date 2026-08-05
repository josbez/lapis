# 07 – De wave-methode toegepast op Lapis

**Status:** werkwijze vastgesteld (G1 t/m G6 beantwoord). De wave-indeling in §5 is een
voorstel dat nog goedgekeurd moet worden; daarna kan het eerste Goal Document geschreven
worden.

---

## 1. Wat de methode voorschrijft

Elke wave is een pakket van drie documenten, met een strikte gezagsvolgorde:

```
1. Goal Document          → beheerst uitkomst, scope, grenzen, stopcondities
2. Wave Specification     → beheerst implementatiedetails
3. Test & Verification    → beheerst bewijs en acceptatie
   Plan

Bij conflict:  Goal wint van Spec.  Spec wint van Test.
               Test mag de scope nooit oprekken.
               Kies bij twijfel de smalste interpretatie.
```

Twee regels die het meest opleveren en het makkelijkst worden overtreden:

- **Het testplan wordt geschreven vóór de implementatie**, door de uitvoerende agent, op
  basis van alleen de Goal en de Spec. Niet achteraf.
- **Out of Scope is verplicht** in elk Goal Document. Het is de anti-scope-creep-knop.

## 2. Waarom dit bij Lapis past

Beter dan bij de meeste hobbyprojecten, om drie redenen:

1. **Het grootste risico van dit project is scope creep**, niet techniek. De methode
   dwingt per wave een expliciete "dit bouwen we niet"-lijst af. Dat is precies de
   remming die dit project nodig heeft.
2. **Human in the lead werkt alleen met een expliciete poort.** Het Goal Document is die
   poort: jij keurt de uitkomst en de grenzen goed vóórdat er iets ontstaat.
3. **De stopconditie is een sectie, geen gevoel.** Bij een avondproject is "wanneer stop
   ik met dit uitzoeken" de duurste onbeantwoorde vraag.

## 3. Wat er niet klakkeloos overgenomen kan worden

De drie gidsen zijn geschreven voor een meerlagig platform met een backend, API's,
tenants en autorisatie. Lapis is een lokale desktop-app zonder server. Een aantal
verplichte secties slaat daardoor nergens op. De gidsen schrijven zelf voor hoe je
daarmee omgaat: **secties niet stilletjes weglaten, maar behouden met de tekst
"Niet van toepassing voor deze wave omdat […]".** Die regel houden we aan.

| Sectie uit de gids | Voor Lapis |
|---|---|
| API Test Plan | **Vervalt.** Geen server, geen HTTP. Vervangen door: de IPC-laag tussen frontend en kern — dat is functioneel onze API en die heeft wél contracttests nodig. |
| Backend Test Plan | **Blijft**, maar "backend" is hier de bestandslaag, de watcher en de index. |
| Autorisatie / permissies | **Vervalt.** Eén gebruiker, geen accounts. |
| Domain Isolation Test | **Vervalt in de gegeven vorm** (die verboden-termenlijst hoort bij een ander platform). Vervangen door een eigen isolatiecheck, zie §4.3. |
| Frontend/Backend Responsibility | **Blijft, aangepast.** De regel "de frontend is een renderer en beslist niets" vertaalt bij ons naar: de frontend beslist nooit zelfstandig over bestandsoperaties of conflictafhandeling. Zie §4.4. |
| Browser / Playwright Test Plan | **Blijft, maar anders.** Zie §4.2. |
| Audit / timeline / SLA / WorkItem | **Vervalt volledig.** Bestaat niet in dit product. |

## 4. Vertaling van de verificatie-eisen naar een desktop-app

### 4.1 Wat "backend-bewijs" hier betekent

De gevaarlijke code van Lapis zit in de bestandslaag. Daar hoort dus het zwaartepunt van
de tests: lezen, atomair schrijven, hernoemen, verwijderen, conflictdetectie,
watcher-gedrag, en het opnieuw opbouwen van de index. Dat is allemaal goed automatisch te
testen tegen fixture-vaults.

### 4.2 Wat "browser-bewijs" hier betekent

De gids eist een browser-happy-flow bij elke UI-wave. Voor een desktop-app zijn er drie
niveaus. G4 legt de technische verificatie bij mij en de UX/UI-beoordeling bij Jos, dus
de keuze hieronder is binnen die afspraak de mijne — hij staat hier zodat je hem kunt
bekritiseren, wat expliciet jouw rol is:

| Niveau | Wat het is | Kosten |
|---|---|---|
| **A** | Playwright tegen de frontend in een gewone browser, met een gemockte bestandslaag. Test de UI-flow, niet de echte app. | Laag |
| **B** | End-to-end tegen de echte app (WebDriver via `tauri-driver`, of Playwright tegen Electron). Test wat de gebruiker werkelijk doet. | Middel–hoog, en broos |
| **C** | Handmatig, met een screenshot als bewijs. | Vrijwel nul |

**Aanpak:** niveau A vanaf de eerste UI-wave, niveau B pas als de app stabiel is, niveau
C alleen voor puur visuele waves — altijd met de reden erbij, zoals de gids voorschrijft.

### 4.3 Onze eigen isolatiecheck

De verboden-termenlijst uit de gids (`mcb`, `mortgage`, `workitem` enzovoort) hoort bij
een ander project. De onderliggende gedachte is wel bruikbaar: *zoek geautomatiseerd naar
dingen die er principieel niet in horen.* Voor Lapis controleert elke wave op:

| Check | Waarom | Herkomst |
|---|---|---|
| Geen hardgecodeerde paden of gebruikersnamen in de kern | Lapis moet ook voor anderen werken | A6, principe uit [PRD §2](03-prd.md#2-gebruiker) |
| Geen schrijfacties naar de vault buiten de ene toegestane schrijffunctie | Eén poort naar de schijf houdt de veiligheidsgaranties controleerbaar | C9, [PRD F3](03-prd.md#4-scope-v1) |
| Geen bestand geschreven in de vault dat geen markdown of bijlage is | De vault blijft schoon en Obsidian-compatibel | C9, principe 1 |
| Geen netwerk-aanroepen in de kern | Geen telemetrie, geen update-check, volledig offline | D8, [PRD §8](03-prd.md#8-randvoorwaarden) |
| Geen aannames over mapnamen of vaultstructuur | Zelfde reden als de eerste regel | A6 |

Dit is een concrete, uitvoerbare lijst geworden nu de principes in de PRD vaststaan. Hij
groeit mee: elke keer dat er een principe bijkomt dat automatisch te controleren is, komt
er een regel bij.

### 4.4 De verantwoordelijkheidsgrens

De gids wil voorkomen dat de frontend de beslisser wordt. Vertaald naar Lapis:

> De frontend toont wat de kern zegt en vraagt de kern om handelingen. De frontend
> beslist nooit zelf of een bestand overschreven mag worden, of een conflict is opgelost,
> of een pad geldig is, of een bestand veilig te verwijderen is.

Dit is niet academisch: het is precies de scheiding die voorkomt dat een UI-bug tot
dataverlies leidt.

## 5. Voorstel wave-indeling

Afgeleid uit F1 t/m F7 van [PRD v1.1](03-prd.md#4-scope-v1), klein gesneden zoals
afgesproken in G1, en afgestemd op uitvoering door agents. **Voorstel — nog niet
goedgekeurd.**

| Wave | Capability | Levert | Afhankelijk van |
|---|---|---|---|
| **W0** | **Spike** — wegwerpcode: map openen, één bestand in live preview bewerken en opslaan | Een antwoord op "wil ik hierin typen?" | — |
| **W1** | **Vault openen en tonen** — map kiezen en onthouden, mapboom, sidebar verbergen, verborgen mappen negeren | F1 | W0 |
| **W2** | **Notitie lezen** — een bestand openen en tonen in live preview. Alleen-lezen, nog niet opslaan | F2 (leeskant) | W1 |
| **W3** | **Notitie schrijven** — bewerken, autosave, `⌘S`, atomair schrijven | F2 + F3 (schrijfkant) | W2 |
| **W4** | **Het focusmodel** — opslaan en loslaten bij focusverlies, herladen bij terugkeer, en het ene conflictgeval | F3 (veiligheidskant) | W3 |
| **W5** | **Quick switcher** — `⌘K`, fuzzy over paden in het geheugen. Nog geen index | F4 (helft) | W1 |
| **W6** | **Full-text search** — SQLite FTS5, `⌘⇧F`, incrementeel bijwerken | F4 (helft) | W3, W5 |
| **W7** | **Bestandsbeheer** — nieuw, hernoemen, verplaatsen, prullenbak, naam uit kopregel bij eerste opslag | F5 (bestanden) | W3 |
| **W8** | **Bijlagen** — inline afbeeldingen, plakken, de map-per-notitie-regel | F5 (bijlagen) | W7 |
| **W9** | **Vaste eerste pagina** | F7 | W1 |
| **W10** | **De vorm** — typografie, licht/donker, lege staten, instellingenscherm | F6 | Ontwerp van Jos |

Vijf keuzes in deze indeling die bewust zijn en die je kunt terugdraaien:

**Lezen en schrijven zijn gescheiden (W2 en W3).** Lezen kan niets kapotmaken, schrijven
wel. Door ze te splitsen kun je W2 met een gerust hart tegen je echte vault draaien,
terwijl W3 tot het einde in een fixture-vault blijft (ronde 2, V6b).

**Het focusmodel is een eigen wave (W4).** Het had bij W3 gekund, maar het is het
onderdeel met de meeste manieren om subtiel fout te gaan, en het verdient een eigen
testplan in plaats van een paar losse gevallen aan het eind van een grotere wave.

**Zoeken is in tweeën geknipt (W5 en W6).** De quick switcher heeft geen index nodig en
kan direct na W1 — daarmee is Lapis al vroeg bruikbaar om rond te navigeren. Full-text
brengt SQLite mee en hoort in een eigen wave.

**Bijlagen staan los van bestandsbeheer (W8 na W7).** De map-per-notitie-regel raakt
dezelfde bestandslaag als hernoemen, en die moet eerst bewezen zijn. Met ~168 MB aan
bijlagen in de echte vault is dit bovendien geen kleine wave.

**De vorm is een volwaardige wave (W10), geen restpost.** Volgens principe 7 is het
ontwerp het onderscheidend vermogen. Zou W10 wegvallen omdat de tijd op is, dan is het
project mislukt, ook al werkt alles.

**Volgorde-advies.** W0 → W1 → W2 → W5 geeft je binnen een paar waves iets waarmee je je
eigen vault kunt doorbladeren en lezen, zonder enig schrijfrisico. Dat is het moment om
te beginnen met het echte ontwerp, want dan is er iets om op te reageren. W3 en W4 daarna,
in een fixture-vault, tot ze hun testsuite doorstaan.

**Afwijking van de gids bij W0.** Een spike is per definitie niet "bewijsbaar af" met
tests; het bewijs is jouw oordeel. Dat is een bewuste afwijking en geen slordigheid, en
staat als zodanig in het Goal Document van W0.

## 6. Werkafspraak per wave

Voorstel voor de cyclus, tot bevestiging in G1–G6:

```
1. Ik schrijf het Goal Document
        ↓
2. JIJ keurt goed, wijzigt, of stuurt terug          ← poort, niet optioneel
        ↓
3. Ik schrijf de Wave Specification
        ↓
4. JIJ keurt goed                                     ← poort
        ↓
5. Test & Verification Plan (vóór de eerste regel code)
        ↓
6. Implementatie
        ↓
7. Bewijs terug: wat is getest, wat draaide, wat faalde, wat niet is getest
        ↓
8. JIJ accepteert of niet                             ← poort
```

Waar het scheef kan lopen, en wat we afspreken:

- **Ik vul geen gaten in.** Ontbreekt er informatie in het Goal Document, dan stop ik en
  vraag. De gids noemt dit met zoveel woorden: *"Do not silently fill important gaps with
  assumptions."* Dat is exact wat er in ronde 1 misging.
- **Een testplan mag de scope niet oprekken.** Blijkt een test functionaliteit nodig te
  hebben die niet in de Goal staat, dan meld ik de mismatch in plaats van het te bouwen.
- **Elk document opent met de open vragen die nog blokkeren.** Zijn die er, dan is het
  document niet af.

## 7. Bestandsindeling

Voorstel:

```
docs/
├─ 01…07                      # discovery en methode (dit niveau)
└─ waves/
   └─ W1-vault-lezen/
      ├─ 00-goal.md
      ├─ 01-spec.md
      ├─ 02-test-plan.md
      └─ 03-bewijs.md          # verslag na implementatie
```

Het bewijsdocument (`03-bewijs.md`) staat niet in de gidsen als apart bestand, maar de
gids eist wel een acceptatieverslag met commando's, uitkomsten en eerlijke vermelding van
wat níét getest is. Als los bestand blijft dat terugvindbaar; in een commit-bericht niet.

## 8. De kanban

**Stand van zaken:** de elf wave-issues staan op
[josbez/lapis](https://github.com/josbez/lapis/issues) — `#1` t/m `#11`, in volgorde
W0 t/m W10.

**Wat ik niet kon doen.** Het bord zelf — GitHub Projects v2 — is niet via de beschikbare
tools aan te maken. Dat is één handeling in de browser: op de repo → tab *Projects* →
*New project* → *Board*. Daarna kun je de elf issues er in één keer aan toevoegen.

**Voorstel voor de kolommen**, die de cyclus uit §6 volgen:

```
Goal concept │ Goal akkoord │ Spec akkoord │ Testplan │ In uitvoering │ Bewijs │ Geaccepteerd
```

**Twee niveaus op het bord.** G3 vraagt om één kaart per taak. Dat kan pas zodra er taken
zijn, en taken komen uit de Wave Specification. De opzet is daarom:

- **Wave-issues** (`#1`–`#11`) zijn er nu en tonen de stand van de wave.
- **Taak-issues** worden per wave aangemaakt als de Wave Specification is goedgekeurd, en
  gekoppeld als sub-issue van het wave-issue.

Zo bevat het bord nooit taken die uit een nog niet bestaand document zijn verzonnen.

**De regel die het bord bruikbaar houdt:** de documenten in de repo zijn de inhoud, het
bord toont alleen de stand. Zodra kaarten inhoud gaan bevatten die niet in de documenten
staat, lopen ze uit elkaar en is het bord schadelijk in plaats van nuttig.

## 9. Waar we staan

| Stap | Stand |
|---|---|
| Probleem, scope en stack vastgesteld | ✅ [PRD v1.1](03-prd.md) |
| Wave-indeling goedgekeurd | ✅ elf waves, §5 |
| Wave-issues aangemaakt | ✅ `#1`–`#11` |
| Bord aangemaakt in GitHub Projects | ⬜ handmatig, zie §8 |
| **Goal Document W0** | ⏳ [geschreven, wacht op goedkeuring](waves/W0-spike/00-goal.md) |
| Wave Specification W0 | ⬜ na goedkeuring van de Goal |
| Test & Verification Plan W0 | ⬜ vóór de eerste regel code |
