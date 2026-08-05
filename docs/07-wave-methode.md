# 07 – De wave-methode toegepast op Lapis

**Status:** voorstel voor werkwijze. Nog niet in gebruik — we zijn nog in diamant 1 en er
is nog geen goedgekeurde scope om waves uit te snijden. Openstaande vragen hierover:
[G1 t/m G6](05-open-vragen.md#g-proces-waves-backlog-verificatie).

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
niveaus, en welk niveau we aanhouden is open vraag [G4](05-open-vragen.md#g4--hoe-streng-wordt-de-verificatie):

| Niveau | Wat het is | Kosten |
|---|---|---|
| **A** | Playwright tegen de frontend in een gewone browser, met een gemockte bestandslaag. Test de UI-flow, niet de echte app. | Laag |
| **B** | End-to-end tegen de echte app (WebDriver via `tauri-driver`, of Playwright tegen Electron). Test wat de gebruiker werkelijk doet. | Middel–hoog, en broos |
| **C** | Handmatig, met een screenshot als bewijs. | Vrijwel nul |

**Mijn voorstel, als voorstel:** niveau A vanaf de eerste UI-wave, niveau B pas als de
app stabiel is, niveau C toegestaan voor puur visuele waves — met de reden erbij, zoals
de gids voorschrijft.

### 4.3 Onze eigen isolatiecheck

De verboden-termenlijst uit de gids (`mcb`, `mortgage`, `workitem` enzovoort) hoort bij
een ander project. De onderliggende gedachte is wel bruikbaar: *zoek geautomatiseerd naar
dingen die er principieel niet in horen.* Voor Lapis zou dat kunnen zijn:

- Geen hardgecodeerde paden of gebruikersnamen in de kern (het "werkt ook voor anderen"-
  principe uit vraag A6).
- Geen schrijfacties naar de vault buiten de ene toegestane schrijffunctie — te
  controleren met een zoekopdracht op schrijf-API's.
- Geen netwerk-aanroepen in de kern, als het antwoord op D8 "geen netwerkverkeer" is.
- Geen bestandsnamen of extensies buiten de toegestane lijst.

Dit is een voorstel. Wat de lijst wordt, hangt af van welke principes je in sectie C
bevestigt.

### 4.4 De verantwoordelijkheidsgrens

De gids wil voorkomen dat de frontend de beslisser wordt. Vertaald naar Lapis:

> De frontend toont wat de kern zegt en vraagt de kern om handelingen. De frontend
> beslist nooit zelf of een bestand overschreven mag worden, of een conflict is opgelost,
> of een pad geldig is, of een bestand veilig te verwijderen is.

Dit is niet academisch: het is precies de scheiding die voorkomt dat een UI-bug tot
dataverlies leidt.

## 5. Voorstel wave-indeling

**Nadrukkelijk een voorstel — open vraag [G1](05-open-vragen.md#g1--hoe-groot-is-een-wave).**
De indeling kan pas echt gemaakt worden als sectie C beantwoord is, want de scope bepaalt
de waves.

| Wave | Naam | Capability | Waarom deze grens |
|---|---|---|---|
| **W0** | Spike | Niet meer dan: map openen, één bestand in live preview bewerken en opslaan. Wegwerpcode. | Beantwoordt "wil ik hierin typen?" en levert een echt getal voor de schatting |
| **W1** | Vault lezen | Een map openen, de boom tonen, een bestand openen en lezen. Nog niet schrijven. | Lezen is risicoloos; schrijven niet. Ze scheiden houdt W1 klein en W2 scherp |
| **W2** | Vault schrijven | Bewerken, opslaan, externe wijzigingen detecteren, conflicten afhandelen | De gevaarlijkste wave. Verdient een eigen, streng testplan |
| **W3** | Vinden | Index, quick switcher, full-text search | Onafhankelijk van W2, kan parallel ontworpen worden |
| **W4** | Ordenen | Frontmatter, tags, tag-overzicht | Afhankelijk van W3's index |
| **W5** | Bestandsbeheer | Nieuw, hernoemen, verwijderen, verplaatsen | Raakt weer de bestandslaag; na W2 omdat het diezelfde garanties nodig heeft |
| **W6** | Vorm | Typografie, licht/donker, lege staten, instellingen | Als eigen wave, niet als restpost. Anders verdwijnt het product zelf in de afwerking |

Twee dingen aan deze indeling die bewust zijn:

- **W0 is wegwerpcode.** De gids zou eisen dat een wave bewijsbaar af is; voor een spike
  is het bewijs jouw oordeel, niet een test. Dat is een geldige afwijking, mits
  opgeschreven.
- **W6 staat als volwaardige wave op de lijst**, omdat het bij dit product de kern is en
  niet de afwerking.

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

## 8. Verhouding tot de kanban

Open vragen [G2 en G3](05-open-vragen.md#g2--waar-komt-de-backlog-te-staan). Voorstel:
de wave-documenten in de repo zijn de inhoud, het bord toont alleen de stand. Eén kaart
per wave, kolommen die de cyclus uit §6 volgen:

```
Open vragen │ Goal concept │ Goal akkoord │ Spec akkoord │ Testplan │ In uitvoering │ Bewijs │ Geaccepteerd
```

Het bord dupliceert dan niets. Zodra kaarten inhoud gaan bevatten die niet in de
documenten staat, lopen ze uit elkaar en is het bord schadelijk in plaats van nuttig.

## 9. Wanneer we hiermee beginnen

Niet nu. De volgorde is:

1. Sectie A van [05](05-open-vragen.md) beantwoord → de eerste diamant is gesloten, we
   weten welk probleem we oplossen.
2. Sectie C en D beantwoord → er is scope en een stack, dus er valt een wave te snijden.
3. Dan pas: Goal Document voor W0 of W1.

Een Goal Document schrijven vóór stap 1 en 2 zou hetzelfde zijn als wat er in ronde 1
misging: het document zou de antwoorden bevatten die jij nog moet geven.
