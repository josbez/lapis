# Wave W1 Test & Verification Plan — Vault openen en tonen

| | |
|---|---|
| **Status** | ✅ Vastgesteld — geschreven vóór de implementatie, conform Spec §14.1 |
| **Gezag** | Dit document beheerst bewijs en acceptatie. Het mag de scope niet oprekken |
| **Bron** | [Goal W1](00-goal.md) · [Spec W1](01-spec.md) |

---

## 1. Titel

Verificatieplan voor W1: bewijzen dat het vault-project doet wat het Goal Document en de
Wave Specification beschrijven — met als zwaarste bewijslast dat er nooit naar de vault
geschreven wordt.

## 2. Purpose

1. Vastleggen wát er bewezen moet worden vóórdat er implementatiecode is.
2. Aantonen dat W1, anders dan W0, veilig tegen Jos' échte vault mag draaien.
3. Elk van de vier antwoorden uit Goal §0 (V1–V4) vastleggen als een test, niet als proza.
4. De aannames uit Spec §13 zichtbaar maken als bewijspunten, niet als stille keuzes.

**Zelfde afwijking als W0:** ik schrijf dit plan zelf, vóór implementatie, in plaats van de
uitvoerende agent (afspraak G4/V9 uit [08](../../08-vervolgvragen.md)).

## 3. Source Documents

- [Goal Document W1](00-goal.md) — beheerst uitkomst en scope, inclusief V1–V4
- [Wave Specification W1](01-spec.md) — beheerst implementatiedetails
- [PRD v1.1 §F1](../../03-prd.md#f1--vault-openen-en-navigeren)
- [Wave-methode §4.1, §4.3, §4.4](../../07-wave-methode.md)
- [Code-analyse](../../09-code-analyse-en-verbeterplan.md) — bevindingen B1, B2, B3, B4,
  B5, B8, B17

## 4. Testability Assessment

**Oordeel: Testable. Geen openstaande tegenstrijdigheden.**

| Vraag | Antwoord |
|---|---|
| Is het Goal Document testbaar? | Ja. Alle zes Outcome-punten in Goal §4 zijn observeerbaar; er zit geen subjectief oordeel in zoals W0's "prettig om in te typen" |
| Is de Wave Specification testbaar? | Ja. Elke functie in `vault-core` en `app-state` heeft een eenduidige invoer/uitvoer-contract |
| Zijn V1–V4 vertaald naar tests? | Ja, zie §9.1 |
| Zijn de betrokken oppervlakken duidelijk? | Ja: `vault-core` (Rust, zonder Tauri), `app-state` (Rust, zonder Tauri), de Tauri-schil, de React-boomcomponent |
| Zijn er tegenstrijdigheden tussen Goal en Spec? | Nee. Spec §2 vraagt wel expliciet goedkeuring voor de `app-state`-crate-scheiding — dat is een ontwerpkeuze, geen tegenstrijdigheid, en blokkeert het testplan niet (Spec §13, risico 1) |
| Is er iets in Spec dat niet uit Goal volgt? | Ja, drie punten, allemaal al benoemd in Spec §13: geen gevolgde symlinks naar mappen, lokaal falen van een onleesbare submap, en de sorteervolgorde (mappen vóór bestanden). Alle drie zijn hier als bewijspunt opgenomen zodat Jos ze bij het bewijs kan beoordelen, niet omdat Goal ze eist |

## 5. What Must Be Proven

In volgorde van gewicht:

1. **Schrijfvrij.** Geen enkele scan, geen enkele IPC-aanroep in deze wave verandert iets
   op schijf in de vault. Dit is de test die toestaat dat W1 tegen de echte vault draait
   (Goal §7).
2. **V1–V4** gedragen zich zoals beantwoord in Goal §0.
3. **Padveiligheid** blijft intact: `OutsideRoot` voor alles buiten de root, ook via
   symlink (voortzetting van W0's bewijs, nu op de recursieve scan).
4. **Prestatie**: 5.000+ notities binnen 500 ms gescand (Goal §9).
5. **Persistentie**: vault-pad en sidebar-status overleven een herstart; een verdwenen pad
   geeft de lege staat, niet een foutmelding of een crash.
6. **Boomvolledigheid**: geneste mappen, lege submappen en submappen zonder `.md` horen
   allemaal in de boom (Goal §9, "geen aannames over de mapstructuur").
7. **Isolatie**: root gaat nooit over de IPC-grens; `vault-core` bevat geen
   schrijfaanroep.

## 6. Verification Surfaces

| Surface | Niveau | Waarom |
|---|---|---|
| `app/vault-core` | Kernbewijs — `cargo test`, geen Tauri nodig | Bevat de scan, het filter en de padcontrole; moet op elke machine draaien, ook in CI zonder webview |
| `app/app-state` | Kernbewijs — `cargo test`, geen Tauri nodig | Persistentie, apart van de vault getest tegen een tijdelijke map |
| `app/src-tauri` | Compileert mee in CI; geen aparte testlaag | Dunne schil; het gedrag zit in de twee crates erboven |
| `app/src` (React-boom) | Niveau B — geautomatiseerd, geen echte webview | Stabiele UI-structuur sinds W1, hoger dan W0's niveau C |
| Handmatig, macOS | Niveau C — enige plek waar de echte vault mag | Jos' eigen vault, na alle geautomatiseerde bewijs |

## 7. Happy Flow Tests

Uit Goal §8, elke stap een observatiepunt:

| Stap | Verwacht | Bewijslaag |
|---|---|---|
| 1. Eerste start | Lege staat, één knop | Frontend-test + handmatig |
| 2. Map kiezen | `open_vault` slaagt, boom verschijnt | Kern + Tauri-integratie + handmatig |
| 3. Boom getoond | Mappen en notities, geen `.obsidian` | Kern (§9.2) + handmatig |
| 4. In-/uitklappen, scrollen | Reageert direct, ook op 5.000+ | Frontend-test (in-/uitklappen) + handmatig (scrollen, want dat is gevoel) |
| 5. Sidebar verbergen | Venster leeg en rustig | Frontend-test (CSS-state) |
| 6. Herstart | — | — |
| 7. Zelfde vault terug | `restore_vault` geeft dezelfde boom | Kern (`app-state`) + handmatig |
| 8. Sidebar-stand behouden | `get_sidebar_visible` klopt na herstart | Kern (`app-state`) + handmatig |

## 8. API (IPC) Test Plan

Geen HTTP-API; de vijf Tauri-commands uit Spec §5.5 zijn het contract. Ze worden niet los
getest (Tauri-commands hebben geen zinvolle test zonder de runtime), maar zijn dunne
wrappers om `Session`- en `app-state`-functies die wél rechtstreeks getest worden — de
dekking loopt via §9 en §10. Wat wel expliciet gecontroleerd wordt: **geen enkel command
heeft een parameter genaamd `root`** (isolatiecheck, §14).

## 9. Backend Test Plan (`vault-core`)

### 9.1 V1–V4 als test

| Vraag | Test | Verwacht |
|---|---|---|
| V1 | `resolve_in_root(root, "")`, `resolve_in_root(root, ".")`, `resolve_in_root(root, rel)` waarbij `rel` na resolutie == `root` | `InvalidPath` in alle drie de gevallen |
| V2 | Symlink in de vault naar een bestand buiten de vault; `scan_tree` erover | Het bestand komt niet voor in de boom |
| V3 | Bestanden `a.md`, `B.MD`, `c.Md` in dezelfde map | Alle drie in de boom, precies één keer, geen dubbele match |
| V4 | `app-state::save_vault_root` → `load()` → pad klopt. Pad daarna van schijf verwijderd → `restore_vault` (of het kernequivalent) → `Ok(None)`, geen paniek | Zie ook §10 |

### 9.2 Boomstructuur en filtering

| Test | Verwacht |
|---|---|
| Geneste mappen, 3+ niveaus diep | Volledige boom, juiste ouder-kindrelaties |
| Lege submap | Verschijnt in de boom, `children: []` |
| Submap zonder `.md`-bestanden (alleen andere bestandstypen) | De map verschijnt; de niet-`.md`-bestanden niet |
| `.git/`, `.obsidian/`, `.trash/`, los `.verborgen.md` | Geen van alle in de boom, ook niet hun inhoud |
| Symlink naar een map, doel binnen de vault | Niet gevolgd (Spec §5.3, punt 3) — vastgelegd als aanname in bewijs |
| Sortering: `Zebra/` (map) en `aardbei.md` (bestand) in dezelfde map | `Zebra/` staat vóór `aardbei.md` (mappen eerst) — vastgelegd als aanname |

### 9.3 Padveiligheid (voortzetting W0)

- Symlink binnen een submap die naar buiten de root wijst → `OutsideRoot` resp. overgeslagen
  in `scan_tree` (V2), en nog steeds `OutsideRoot` bij een directe `resolve_in_root`-aanroep.
- `..`-componenten en absolute paden in `resolve_in_root` → `OutsideRoot` (ongewijzigd
  gedrag uit W0, opnieuw getest tegen de nieuwe code).

### 9.4 Schrijfvrij-test — het zwaarste bewijs

Eén test die:

1. Een fixture-vault opbouwt met een representatieve structuur (submappen, symlinks,
   verborgen bestanden).
2. Van elk bestand en elke map de wijzigingstijd (`mtime`) en een hash van de
   bestandsnamen-verzameling vastlegt.
3. `scan_tree` er meermaals overheen draait, inclusief op submappen die `PermissionDenied`
   geven.
4. Controleert dat na afloop geen enkel bestand is bijgekomen, verdwenen, of van `mtime`
   veranderd.

Dit is de test die Goal §7 "het belangrijkste van deze wave" noemt.

### 9.5 Prestatietest

- Testhulp genereert 5.000+ `.md`-bestanden over een gemengde boom (breed én diep).
- `scan_tree` getimed met `std::time::Instant`.
- Assertie: onder 500 ms (Goal §9). Faalt de test, dan is dat een blokkade (Goal §15),
  geen reden de assertie te versoepelen (Goal §14, Iteration Policy).
- De gemeten tijd wordt gelogd (test-output + `03-bewijs.md`), niet alleen pass/fail.

### 9.6 Negatieve tests (Spec §14.6)

Zoals opgesomd in Spec §14.6, één-op-één overgenomen als verplichte tests.

## 10. Backend Test Plan (`app-state`)

| Test | Verwacht |
|---|---|
| `load()` zonder bestaand instellingenbestand | Default: `{ vault_root: None, sidebar_visible: true }` |
| `save_vault_root(Some(p))` → `load()` | `vault_root == Some(p)` |
| `save_vault_root(None)` → `load()` | `vault_root == None` |
| `save_sidebar_visible(false)` → `load()` | `sidebar_visible == false` |
| Corrupt JSON in het instellingenbestand → `load()` | Default terug, geen paniek |
| Twee opeenvolgende `save_vault_root`-aanroepen, tussentijds een crash gesimuleerd (proces afgebroken na eerste `write`, vóór `rename`) | Het instellingenbestand is óf de oude óf de nieuwe waarde, nooit corrupt — bewijst de tijdelijk-bestand-plus-rename-aanpak uit Spec §8 |

Alle tests draaien tegen een `tempdir`, nooit tegen `~/Library/Application Support/`.

## 11. Frontend Test Plan

Niveau B, zonder echte webview:

- Boomcomponent: klik op een map klapt uit; nogmaals klikken klapt in.
- Boomcomponent: rendert geneste structuur correct (props-gedreven, geen eigen filtering
  — er is dus geen test nodig die bewijst dat de frontend niets filtert, want die logica
  bestaat er niet).
- Klik op een bestand: zet selectie-state, geen `invoke`-aanroep die inhoud ophaalt
  (te controleren door de IPC-mock te asserten op "niet aangeroepen").
- Sidebar-toggle: verbergt het boomelement (CSS/DOM-assertie), de onderliggende
  boom-state blijft ongewijzigd in het component.
- Empty state: verschijnt wanneer `restore_vault` `null`/`None` teruggeeft.

## 12. Browser / Playwright Test Plan

Niveau C, zoals W0: handmatig, met bewijs. Reden: nog geen stabiel genoeg oppervlak om
end-to-end tegen te automatiseren, en de belangrijkste garantie (schrijfvrij tegen de
échte vault) is sowieso alleen handmatig zinvol te controleren met een tijdstip-vergelijking
op het bestandssysteem.

Vast te leggen (screenshots of schermopname):

1. App starten → lege staat.
2. Map kiezen (Jos' eigen vault) → boom verschijnt.
3. In-/uitklappen van een paar mappen, scrollen door de volledige boom.
4. Sidebar verbergen en weer tonen.
5. App herstarten → dezelfde vault, dezelfde sidebar-stand.
6. `find ~/Documents -newer <tijdstip-vóór-stap-2>` (of gelijkwaardig) toont geen
   wijzigingen.

## 13. Negative Test Plan

Zoals Spec §14.6, aangevuld met:

| Geval | Verwacht |
|---|---|
| `open_vault` met een pad naar een bestand (geen map) | `NotADirectory` |
| `restore_vault` wanneer het onthouden pad nu een bestand is (was een map, is vervangen) | `Ok(None)`, geen paniek |
| `set_sidebar_visible` vóór er ooit een vault geopend is | Slaagt gewoon — sidebar-status is onafhankelijk van vault-status |

## 14. Domain Isolation Test Plan

- `scripts/isolatie-check.sh` moet, na uitbreiding met `app/`-paden, alle bestaande
  regels dekken plus de nieuwe uit Goal §11.
- `--zelftest` moet de nieuwe regel ("geen schrijfaanroep in `vault-core`") aantoonbaar
  vangen, net als de andere acht.
- Handmatige extra controle (niet in het script, want eenmalig): `app-state`'s
  schrijfpad wijst aantoonbaar naar `Application Support`, niet naar de vault-root — een
  test in `app-state` zelf die met een gemockt pad bevestigt dat er nooit binnen een
  meegegeven vault-pad geschreven wordt.

## 15. Frontend / Backend Responsibility Checks

Uit Spec §5.6 en Goal §12:

- De boomcomponent bevat geen logica die bestandsnamen filtert op verborgen-zijn of op
  `.md`-extensie — een grep-controle, vastgelegd in `03-bewijs.md`, niet als geautomatiseerde
  test (een test kan afwezigheid van logica niet aantonen; een korte code-inspectie kan dat
  wel, expliciet vastgelegd).
- Volgordebewaking (bevinding B8): een test die twee `open_vault`-aanroepen na elkaar
  simuleert met omgekeerde antwoordtijden en bevestigt dat de UI het laatst-verzonden
  verzoek wint, niet het laatst-ontvangen antwoord.

## 16. Required Test Commands

```bash
# Vanaf de repo-root
cargo test --workspace                 # dekt spike/vault-core, app/vault-core, app/app-state
cd app && npm run typecheck
cd app && npm run lint
cd app && npm test                     # frontend, niveau B
cd app && npm run build
./scripts/isolatie-check.sh --zelftest
./scripts/isolatie-check.sh
```

## 17. Required Acceptance Evidence

`03-bewijs.md` bevat:

1. Wat er is gebouwd, in enkele zinnen.
2. De testcommando's uit §16 met hun uitkomst.
3. De gemeten scantijd op de 5.000+-fixture (§9.5).
4. De aannames uit Spec §13 — expliciet, met het label "aanname, geen besluit" — zodat
   Jos ze kan terugdraaien: `app-state` als aparte crate, geen gevolgde symlinks naar
   mappen, lokaal falen van een onleesbare submap, sorteervolgorde mappen-vóór-bestanden.
5. Screenshots/opname van de handmatige doorloop (§12), inclusief de
   `find -newer`-uitkomst als schrijfvrij-bewijs op de échte vault.
6. Een eerlijke opsomming van wat níét getest is.
7. Bevestiging dat de scope niet is opgerekt.

## 18. Known Assumptions, Gaps, or Risks

Overgenomen uit Spec §13, hier als testplan-consequentie:

| # | Aanname | Testplan-consequentie |
|---|---|---|
| 1 | `app-state` als aparte crate | §10 test hem apart; als Jos dit afwijst, verhuizen de tests mee naar `vault-core`, en de isolatie-regel uit §14 moet dan preciezer worden (schrijven toestaan buiten de vault, verbieden binnen) |
| 2 | Geen gevolgde symlinks naar mappen | §9.2 legt dit vast als test, niet als gat |
| 3 | Onleesbare submap faalt lokaal | §9.6 dekt dit; als Jos een globale fout wil, is dat één test die van gedrag wisselt, geen nieuwe architectuur |
| 4 | 500 ms haalbaar zonder threads | §9.5 is de proef. Bij falen: blokkade, geen versoepeling |
| 5 | Security-scoped bookmarks op macOS | Niet in CI te testen (Linux-runner). Uitsluitend in de handmatige doorloop (§12) op macOS. Als dit misgaat, is het een blokkademelding conform Goal §15, geen work-around |

## 19. Acceptance Rule

Een falende test die niet begrepen is, betekent dat de wave niet af is. De schrijfvrij-test
(§9.4) en de padveiligheidstests (§9.3) zijn onvoorwaardelijk — die falen betekent stoppen
en melden, nooit de assertie verzachten (Goal §14, Iteration Policy). Een falende
prestatietest (§9.5) is een blokkade conform Goal §15, geen reden om het budget zelf aan
te passen zonder dat gesprek.

---

## Wat dit plan bewust níét doet

- Geen end-to-end Playwright-automatisering — nog geen stabiel genoeg oppervlak (§12).
- Geen test die bewijst dat er "geen filtering in de frontend zit" — afwezigheid van
  logica is geen testbare eigenschap; dat is een code-inspectie (§15).
- Geen belasting-/stresstest voorbij 5.000+ notities — Goal §9 vraagt "5.000+", niet een
  maximum; een grotere fixture is een latere wave-beslissing als de praktijk daarom vraagt.
- Geen test van macOS security-scoped bookmarks in CI — de CI-runner is Linux (zoals bij
  W0), dit blijft uitsluitend handmatig bewijs op macOS.
