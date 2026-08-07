# Wave W1 Goal Document — Vault openen en tonen

| | |
|---|---|
| **Status** | Beslisvragen beantwoord · klaar voor de Wave Specification, na goedkeuring van dit document |
| **Gezag** | Dit document beheerst uitkomst, scope, grenzen en stopcondities van W1 |
| **Bron** | [PRD v1.1 §F1](../../03-prd.md#f1--vault-openen-en-navigeren) · [Wave-methode](../../07-wave-methode.md) · [Code-analyse](../../09-code-analyse-en-verbeterplan.md) |

---

## 0. Open vragen die blokkeren

*[07 §6](../../07-wave-methode.md#6-werkafspraak-per-wave): een Goal Document met
onbeantwoorde blokkerende vragen is niet af. Deze vier komen uit de code-analyse (T13)
en uit wat W0 tegenkwam. Ze zijn niet ingevuld met een aanname — dat was precies de
fout van ronde 1.*

**✅ Alle vier beantwoord door Jos.** Onder elk antwoord staat wat het voor de Wave
Specification betekent; die gevolgen zijn van mij en mogen terug.

### V1 · Wat doet Lapis met een pad dat naar de vault-map zélf wijst?

W0 gaf op een leeg pad of `.` een rommelige `Io("Is a directory …")` terug in plaats van
een nette weigering (bevinding B3). In W1 is dat geen theorie meer: de mapboom levert
paden aan, en een bug daarin moet netjes stranden.

| Optie | Gevolg |
|---|---|
| **a. Harde weigering** — een eigen foutsoort `InvalidPath`, altijd geweigerd | Elke aanroep zonder bestandsnaam is een programmeerfout die zichzelf meldt. Strengst, en het makkelijkst te testen |
| b. Behandelen als "niets geselecteerd" | Stiller in beeld, maar het verschil tussen "nog niets open" en "kapot pad" verdwijnt |
| c. Laten zoals het is | De gebruiker krijgt ooit een Engelse OS-foutmelding te zien |

**Antwoord:** `c voor nu — eerst zien, dan oplossing bedenken.`

*Gevolg voor de spec.* Geen `InvalidPath`-variant in W1. Wél een test die het huidige
gedrag vastlégt in plaats van het te beoordelen: komt er een `Io`-fout, dan staat er
zwart op wit wélke. Zonder die test is "eerst zien" niet uitvoerbaar — dan zie je het
pas als een gebruiker het meldt. Herzien zodra het geval zich in de praktijk voordoet;
dit is uitdrukkelijk uitgesteld, niet afgedaan.

### V2 · Wat doet Lapis met symlinks die buiten de vault wijzen?

W0 toonde zo'n bestand wél in de lijst, maar weigerde het bij openen (bevinding B4). Dat
is de veilige kant van inconsistent: je ziet iets dat je niet kunt openen.

| Optie | Gevolg |
|---|---|
| **a. Niet tonen** — wat buiten de vault wijst, bestaat niet voor Lapis | Consistent en veilig. Wie bewust met symlinks werkt, mist bestanden zonder uitleg |
| b. Tonen, maar gemarkeerd en niet te openen | Eerlijker, kost een visuele toestand in de boom — en die is er in W1 nog niet |
| c. Volgen, ook buiten de vault | Comfortabel, maar dan is "alles blijft binnen de gekozen map" geen garantie meer. Ik raad dit af |

**Antwoord:** `a — niet tonen.`

*Gevolg voor de spec.* De scan canonicaliseert elk item en laat alles weg dat na
symlink-resolutie buiten de vault valt. Dat kost een `canonicalize` per item, wat
meetelt in het prestatiebudget van §9 — mocht dat knellen, dan is dát de bevinding,
niet een stille versoepeling van deze regel.

### V3 · Telt `notitie.MD` als markdown?

W0 filterde hoofdlettergevoelig, terwijl APFS standaard hoofdletter-ongevoelig is
(bevinding B5). Een bestand met een hoofdletter-extensie is nu onzichtbaar in Lapis en
zichtbaar in Obsidian.

| Optie | Gevolg |
|---|---|
| **a. Hoofdletter-ongevoelig** — `.md`, `.MD`, `.Md` tellen allemaal | Sluit aan bij Obsidian en bij hoe macOS zich gedraagt |
| b. Alleen kleine letters | Voorspelbaar, maar bestanden uit oude exports blijven onzichtbaar |

**Antwoord:** `a — hoofdletter-ongevoelig.`

*Gevolg voor de spec.* De vergelijking gebeurt op de extensie in kleine letters. Let op
het randgeval dat hierbij hoort: op een hoofdletter-*gevoelig* volume (APFS kán zo
geformatteerd zijn) kunnen `notitie.md` en `notitie.MD` naast elkaar bestaan. Beide
worden dan getoond, als twee aparte notities — dat is correct, want dat zijn het ook.

### V4 · Waar bewaart Lapis welke map je open had?

F1 vraagt dat de gekozen map wordt onthouden bij herstart. [C9](../../05-open-vragen.md#c9--niets-in-de-vault-schrijven--is-dat-een-harde-regel)
sluit de vault zelf uit als opslagplaats — dus het moet ergens anders.

| Optie | Gevolg |
|---|---|
| **a. `~/Library/Application Support/Lapis/`** — de macOS-conventie | Netjes, onzichtbaar voor de gebruiker, verhuist niet mee met de vault. Dat laatste is precies wat C9 accepteert |
| b. Naast de app-instellingen in een enkel bestand in `~/.config/lapis/` | Makkelijker terug te vinden en te versiebeheren; wijkt af van wat macOS-apps doen |

En de vervolgvraag die er los van staat: **wat gebeurt er als die map bij de start weg is
of hernoemd?** Mijn voorstel is een lege staat met de mapkiezer en één regel uitleg — niet
stilzwijgend de vorige inhoud tonen. Dat mag je terugdraaien.

**Antwoord:** `b — ~/.config/lapis/. Eens met de lege staat met mapkiezer en één regel uitleg.`

*Gevolg voor de spec.* Eén bestand in `~/.config/lapis/`, met de vault-keuze en de
sidebar-stand erin. Terugvindbaar en met de hand te bewerken — dat is de winst, en
tegelijk de reden om het formaat leesbaar te houden en kapotte inhoud te behandelen als
"geen keuze" in plaats van als fout.

Dit wijkt bewust af van waar macOS-apps hun voorkeuren neerzetten. Twee dingen die
daaruit volgen en die de spec moet regelen: het pad respecteert `$XDG_CONFIG_HOME` als
die gezet is, en de map wordt aangemaakt als hij niet bestaat.

---

## 1. Wave Identity

- **Wave number:** W1
- **Wave name:** Vault openen en tonen
- **Wave type:** funderende wave. **Dit is de eerste code die blijft.**
- **Previous dependency wave(s):** W0 (spike) — inclusief het oordeel van Jos
- **Next likely wave(s):** W2 (notitie lezen), W5 (quick switcher)

## 2. Current Platform Gap

W0 heeft één vraag beantwoord: wil ik hierin typen? Wat er ligt is een spike met een
platte lijst van `.md`-bestanden in één map, zonder mappen, zonder geheugen, zonder
architectuur die iets moet dragen.

Wat er niet ligt: een manier om een echte vault te openen. De vault van Jos is 170 MB en
402 notities in een mappenstructuur, en de PRD eist dat het bij 5.000+ notities niet
traag voelt. Zonder een boom die die omvang aankan is er geen enkele volgende wave
mogelijk — W2, W5 en W6 hangen er allemaal aan.

W1 bestaat om die fundering te leggen, en om hem te leggen tegen de echte vault: lezen
kan niets kapotmaken, en dat is precies waarom lezen en schrijven in de wave-indeling
gescheiden zijn ([07 §5](../../07-wave-methode.md#5-voorstel-wave-indeling)).

## 3. Purpose

Deze wave bestaat om een vault te kunnen kiezen, onthouden en tonen — zodat je erdoorheen
kunt navigeren, zonder dat er ook maar één byte naar de vault geschreven wordt.

## 4. Outcome

Deze wave is compleet wanneer:

- Je een map kiest via de systeem-bestandskiezer en die map bij een herstart nog steeds
  open is.
- Je de volledige mapboom ziet: mappen en `.md`-bestanden, met de vault-root als wortel,
  inklapbaar.
- Verborgen mappen en bestanden (alles met een punt: `.git`, `.obsidian`, `.trash`) niet
  worden getoond en niet worden aangeraakt.
- De sidebar te verbergen is, en die keuze een herstart overleeft.
- Het openen en doorscrollen van een vault met 5.000+ notities niet traag voelt.
- **Er geen enkele schrijfactie in de vault plaatsvindt** — aantoonbaar, niet
  waarschijnlijk.

Wat je aan het eind van deze wave níét kunt: een notitie openen en lezen. Dat is W2. Een
klik op een bestand doet in W1 hooguit iets in de selectie van de boom.

## 5. In Scope

- Een nieuw, blijvend project in de repo — **niet** `spike/`. W0 is wegwerpcode.
- Map kiezen via de systeem-bestandskiezer.
- De keuze onthouden buiten de vault (V4), inclusief nette afhandeling van een map die
  verdwenen is.
- De vault recursief scannen: mappen en `.md`-bestanden.
- De mapboom tonen, in- en uitklapbaar, met de root als wortel.
- Sidebar verbergen en tonen; de stand onthouden.
- Verborgen mappen en bestanden overslaan.
- De vier antwoorden uit §0 implementeren (leeg pad, symlinks, hoofdletters, opslagplaats).
- Het foutmodel van de kern, in de vorm die W3 nodig heeft (§9).
- De isolatiechecks uit [07 §4.3](../../07-wave-methode.md#43-onze-eigen-isolatiecheck),
  die vanaf deze wave gelden.

## 6. Out Of Scope

- **Een notitie openen, tonen of lezen.** Dat is W2, en de verleiding is groot omdat W0
  het al kon.
- Elke vorm van schrijven, hernoemen, aanmaken of verwijderen.
- Zoeken, quick switcher, index, SQLite.
- Bijlagen en afbeeldingen.
- File watching: verandert er iets op schijf tijdens het draaien, dan hoeft de boom dat in
  W1 nog niet te merken. *(Handmatig verversen mag; automatisch is W4-gebied.)*
- Slepen en neerzetten in de boom.
- Meerdere vaults tegelijk, of snel wisselen tussen vaults.
- Visueel ontwerp. De boom mag er onopgemaakt uitzien; W10 gaat over de vorm. Een
  wireframe is het plafond, geen streefbeeld.
- Instellingenscherm.

## 7. Verification Intent

Anders dan W0 is deze wave wél bewijsbaar af met tests, en dat is de norm vanaf hier.

- **Kernbewijs (Rust):** de scan, het filter en de padcontrole zijn getest zonder Tauri,
  zoals `vault-core` in W0 al aantoonde. Inclusief negatieve tests: symlink naar buiten,
  `..`, absolute paden, verborgen mappen, een map zonder leesrechten.
- **Prestatiebewijs:** een gegenereerde fixture-vault van 5.000+ notities in een
  realistische mappenstructuur, met een gemeten scantijd in de testuitvoer. Zie §9 voor
  het budget.
- **Frontend-bewijs:** de boomcomponent is getest op in- en uitklappen en op het
  overslaan van verborgen mappen. Niveau B (geautomatiseerd, zonder echte webview) —
  hoger dan W0's niveau C, omdat er nu een stabiele UI-structuur is om tegen te testen.
- **Isolatiebewijs:** `scripts/isolatie-check.sh` draait groen in CI, uitgebreid met de
  regel uit §11.
- **Schrijfbewijs — het belangrijkste van deze wave:** een test die na een volledige
  doorloop aantoont dat er in de vault geen enkel bestand is bijgekomen, verdwenen of van
  wijzigingstijd veranderd. Dit is de test die het toestaat om W1 tegen de echte vault te
  draaien.
- **Handmatig:** Jos opent zijn eigen vault (`/Users/jos/Documents`) en navigeert erdoor.
  Dat mag hier, en alleen hier, omdat W1 niet schrijft.

## 8. Happy Flow Intent

1. Jos start Lapis voor het eerst. Hij ziet een lege staat met één knop.
2. Hij kiest zijn vault-map.
3. De boom verschijnt: mappen en notities, `.obsidian` nergens te bekennen.
4. Hij klapt een map open, scrollt, klapt een andere dicht.
5. Hij verbergt de sidebar. Het venster is leeg en rustig.
6. Hij sluit Lapis en start opnieuw.
7. Dezelfde vault staat er, met de sidebar nog steeds verborgen.
8. Hij haalt de sidebar terug en de boom staat er zoals hij hem achterliet.

Stap 6 en 7 zijn wat W1 toevoegt aan W0. De rest is de aanloop.

## 9. Constraints

- **Geen schrijfactie in de vault.** Niet als tijdelijk bestand, niet als `.DS_Store`,
  niet als cache. Dit is geen voorzorg maar de reden dat deze wave tegen echte notities
  mag draaien.
- **De root-autoriteit ligt in Rust.** De frontend geeft nooit een vault-pad mee over de
  IPC-grens; hij kan er één *kiezen*. Dit is bevinding B1 uit de code-analyse, in W0
  opgelost met `vault_core::Session`, en vanaf hier een eis in plaats van een fix.
- **Strikte CSP als default** in `tauri.conf.json` — geen `null` meer (bevinding B17). In
  combinatie met de vorige regel is dat het verschil tussen "een webview-lek is vervelend"
  en "een webview-lek kan bij de schijf".
- **Het foutmodel bewaart `io::ErrorKind`.** `PermissionDenied` en `AlreadyExists` moeten
  als onderscheidbare gevallen door de lagen heen komen (bevinding B2). W3 en W4 hebben ze
  nodig; als W1 ze weggooit, wordt daar op foutstrings gematcht. *Dit is een eis aan de
  vorm van het foutmodel, niet aan de afhandeling — die gevallen doen zich in een
  lees-only wave amper voor.*
- **Prestatiebudget:** de vault van 5.000 notities is binnen **500 ms** gescand en de boom
  scrollt zonder haperen. *[D6](../../05-open-vragen.md#d6--prestatiebudget) zegt "moet
  niet traag voelen"; dit getal is mijn vertaling daarvan naar iets wat een test kan
  meten, en je mag het bijstellen.*
- **Geen netwerkverkeer**, conform [PRD §8](../../03-prd.md#8-randvoorwaarden).
- **Geen aannames over de mapstructuur** ([A6](../../05-open-vragen.md#a6--voor-wie-is-dit-echt)):
  geen speciale betekenis voor mapnamen, geen verwachte diepte, geen `attachments/`.

## 10. Boundaries

**Toegestaan:**

- Een nieuwe projectmap in deze repo voor de blijvende code, naast `spike/`.
- Documenten in `docs/waves/W1-vault-lezen/`.
- Uitbreiding van `scripts/isolatie-check.sh` en de CI-workflow.
- Lezen uit de echte vault van Jos tijdens de handmatige doorloop.

**Niet toegestaan:**

- Wijzigingen in `spike/`. W0 blijft staan zoals hij is, als naslag.
- Wijzigingen aan de documenten 01 t/m 09.
- Enige schrijfactie in een vault, ook niet in een fixture-vault — de tests bouwen hun
  eigen mappen, zoals `vault-core` dat in W0 deed.

**Netwerktoegang:** alleen voor het ophalen van afhankelijkheden tijdens het bouwen.

## 11. Domain Isolation Requirement

De isolatiechecks uit [07 §4.3](../../07-wave-methode.md#43-onze-eigen-isolatiecheck)
gelden vanaf deze wave, als script in CI (`scripts/isolatie-check.sh`) en niet als grep
die een agent zelf uitvoert en rapporteert.

Twee regels komen erbij, en de tweede is nieuw voor deze wave:

1. **Geen root-pad over de IPC-grens** — al geïmplementeerd, blijft staan.
2. **Geen schrijfaanroep in de kern.** Zolang W1 loopt, mag er in de kern geen enkele
   `fs::write`, `File::create`, `remove_file` of `rename` voorkomen. Die check verdwijnt
   weer in W3, en dat is dan een bewuste, zichtbare handeling in plaats van een gat dat
   niemand opmerkt.

## 12. Frontend / Backend Responsibility Boundary

De grens uit [07 §4.4](../../07-wave-methode.md#44-de-verantwoordelijkheidsgrens), voor
deze wave concreet gemaakt:

| Kant | Wat |
|---|---|
| **Kern (Rust)** | Welke map de vault is. Wat een geldig pad is. Wat een verborgen bestand is. Wat markdown is. Wat er in de boom zit |
| **Frontend** | Wat er in beeld staat, wat ingeklapt is, wat geselecteerd is, of de sidebar zichtbaar is |

De frontend bepaalt dus wel de *presentatie* van de boom, maar nooit de *inhoud* ervan.
Filtert de frontend zelf verborgen mappen weg, dan is dat een fout — ook als het resultaat
er hetzelfde uitziet.

Uit W0 komt daar één patroon bij dat geen theorie is gebleken: **asynchrone acties die
dezelfde toestand zetten hebben volgordebewaking nodig** (bevinding B8). In W1 geldt dat
voor het wisselen van vault en voor het uitklappen van mappen die traag laden.

## 13. Test Plan Creation Requirement

Vóór implementatie moet er een Wave Test & Verification Plan liggen, opgesteld vanuit dit
Goal Document en de Wave Specification.

Voor W1 bevat dat plan in elk geval: de kerntests uit §7, de gegenereerde vault voor het
prestatiebewijs, de schrijfvrij-test, en per antwoord uit §0 een test die dat antwoord
vastlegt.

Er wordt niet begonnen met bouwen voordat dat plan er ligt.

## 14. Iteration Policy

- Werkt iets niet, bekijk dan eerst het bewijs voordat er iets wordt aangepast.
- Maak de kleinst verdedigbare wijziging.
- Draai de bijbehorende verificatie opnieuw na elke wijziging.
- **Bestaande tests zijn read-only.** Een taak die een bestaande test wil wijzigen, stopt
  en meldt dat. Dit staat er omdat het bij een rode test de goedkoopste route is om de
  assertie te versoepelen ([09 §5](../../09-code-analyse-en-verbeterplan.md#sonnet-50)).
- Rek de scope niet op om iets werkend te krijgen.

## 15. Block Stop Conditions

Stop en meld een blokkade wanneer:

- Het prestatiebudget uit §9 niet haalbaar blijkt met een eenvoudige scan. Dat is een
  gesprek over de architectuur (lazy laden, een index in W1 in plaats van W6), geen
  work-around.
- Er een keuze nodig blijkt die niet in §0 staat. **Vul die niet in met een aanname** —
  dat is wat §0 bestaat om te voorkomen. Dit geldt met nadruk voor V1: "eerst zien" is
  een besluit om te wachten, geen vrijbrief om onderweg alsnog iets te verzinnen.
- Er iets nodig blijkt uit §6 om de happy flow te halen.
- Het onthouden van de vault-keuze op macOS-rechten stuit (sandboxing, security-scoped
  bookmarks). Dat is een reëel risico: een pad onthouden is niet hetzelfde als het
  opnieuw mógen lezen.

Het blokkadeverslag vermeldt: wat er is geprobeerd, welk bewijs is gevonden, waarom het
doel zo niet gehaald kan worden, en wat er van Jos nodig is.

## 16. Goal Coach Readiness Judgment

**Status: Ready for Wave Specification.** V1 t/m V4 zijn beantwoord; er zaten geen
andere gaten in.

Eén antwoord verdient een aantekening. **V1 is uitgesteld, niet beslist** ("eerst zien").
Dat is een geldige keuze, maar het betekent dat W1 met een bekend rommelig randgeval
oplevert. De test die het gedrag vastlegt is daarom geen formaliteit: zonder die test is
er over een half jaar niemand meer die weet dat dit bewust zo staat.

**Aannames die ik wél heb gedaan, en die je mag terugdraaien:**

- Het prestatiebudget van 500 ms (§9) is mijn vertaling van "moet niet traag voelen".
- De lege staat bij een verdwenen vault (§0, V4) is mijn voorstel, geen besluit.
- W1 mag tegen de echte vault draaien omdat hij niet schrijft. Dat is een afgeleide van
  [ronde 2, V6b](../../08-vervolgvragen.md), niet een letterlijke afspraak.

**Open risico's:**

- **De grootste is de verleiding van W2.** Een boom waarin je niets kunt openen voelt
  onaf, en de spike kon het al. Elke regel die een notitie leest, hoort in W1 niet thuis.
- macOS-rechten op een onthouden pad (§15). Dit kan een halve wave kosten of tien minuten,
  en dat is vooraf niet te zeggen.
- Dit Goal Document gaat ervan uit dat W0 geaccepteerd is. **Is jouw oordeel over de
  editorbasis negatief, dan verandert W1 niet** — de boom staat los van de editor — maar
  W2 wel ingrijpend.

---

## Agent Handoff Instruction

```
Je krijgt twee brondocumenten:

1. Dit Goal Document
2. De Wave Specification voor W1

Je eerste taak is niet implementeren. Je eerste taak is het opstellen van het
Wave Test & Verification Plan.

Gezagsvolgorde:
1. Het Goal Document beheerst uitkomst en scope.
2. De Wave Specification beheerst implementatiedetails.
3. Het Test & Verification Plan beheerst bewijs en acceptatie.

Bij conflict: Goal wint van Spec. Spec wint van Test. Het testplan mag de scope
nooit oprekken. Kies bij twijfel de smalste interpretatie.

Twee regels die in W0 zijn gekocht met een bevinding:
- De vault-root gaat nooit als parameter over de IPC-grens.
- Bestaande tests en fixtures zijn onaantastbaar; wil je er een wijzigen, stop
  en meld dat.

Begin niet met implementeren voordat het testplan er ligt.
```
