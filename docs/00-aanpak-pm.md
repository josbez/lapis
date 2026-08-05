# 00 – Aanpak: wat doet een PM/PO hier eigenlijk?

Korte notitie omdat je het vroeg. Bij een project van één persoon voor één gebruiker
(jij) is de PM-rol geen overhead-laag maar een manier om jezelf tegen jezelf te
beschermen.

## Wat de rol concreet oplevert

**1. Het probleem scherp houden.**
Je zei niet "ik wil een markdown-editor bouwen". Je zei "Obsidian voelt bloated en
visueel overweldigend". Dat is een ander probleem, en het heeft andere oplossingen —
waarvan "zelf bouwen" er maar één is. Een PM schrijft het probleem op vóór de
oplossing, zodat je later kunt controleren of je het nog aan het oplossen bent.

**2. Nee zeggen op een manier die je kunt navertellen.**
Het echte risico van dit project is niet dat het te moeilijk is. Het is dat je in
maand drie een graph view aan het bouwen bent omdat het leuk was, en dat Lapis dan
precies het ding is geworden waar je vanaf wilde. Daarom staat er in de PRD een
expliciete **anti-scope**: functies die we niet bouwen, met de reden erbij. Dat is het
belangrijkste onderdeel van dit dossier.

**3. Beslissen wanneer beslissen goedkoop is.**
"Tauri of Electron" kost nu tien minuten en over vier maanden twee weken. Dezelfde
vraag geldt voor: schrijft Lapis rommel in jouw map (nee), wat gebeurt er als een
bestand buiten Lapis wijzigt (gedefinieerd), en wat is het opslagmodel (gedefinieerd).
Die staan in de technische spec, niet omdat het leuk is om op te schrijven, maar omdat
ze later duur zijn om terug te draaien.

**4. Succes definieerbaar maken.**
Bij een persoonlijk project is de verleiding om nooit te evalueren. De PRD zet er één
harde vraag onder: *open ik Lapis in plaats van Obsidian, vier weken achter elkaar?*
Zo niet, dan is het project mislukt — en dat is prima, zolang je het merkt.

## Human in the lead — en waar dat in ronde 1 misging

Dit project werkt met de mens in de lead, niet in de loop. Het verschil is niet
cosmetisch:

- **Human in the loop** = ik beslis, jij mag ingrijpen. Zwijgen betekent instemmen.
- **Human in the lead** = jij beslist, ik lever materiaal, opties en een aanbeveling.
  Zwijgen betekent dat er niets besloten is.

In ronde 1 werkte ik feitelijk in de loop-modus: ik koos de techniek, de scope, de
anti-scope, de succescriteria en de planning, en presenteerde dat als besluiten. Zelfs
waar je een expliciete voorkeur had uitgesproken (wikilinks geen must-have) heb ik daar
eigenmachtig van afgeweken.

Wat we daarvan overhouden als werkregels:

1. **Alles wat een keuze is, gaat als open vraag naar jou** — niet als voorstel met een
   vinkje erbij. [Document 05](05-open-vragen.md) is die lijst.
2. **Een aanbeveling is gemarkeerd als aanbeveling** en staat nooit in de kaderende tekst
   van een spec.
3. **Bij een informatiegat stop ik en vraag.** De wave-gids zegt het zo: *"Do not
   silently fill important gaps with assumptions."*
4. **Onderzoeksfeiten en meningen worden gescheiden.** Marktcijfers en
   bibliotheekbeschikbaarheid zijn controleerbaar en mogen zonder poort; alles daarna is
   jouw call.

## Waar we staan: double diamond

```
   DISCOVER                 DEFINE              DEVELOP           DELIVER
 ┌───────────────┐    ┌───────────────┐   ┌──────────────┐  ┌──────────────┐
 │ 01 concurrentie│    │ 05 open vragen│   │ waves W0…W6  │  │ dagelijks    │
 │ 02 haalbaarheid│    │ → herschreven │   │ per wave 3   │  │ gebruik +    │
 │ 06 beslisinput │    │   PRD         │   │ documenten   │  │ evaluatie    │
 └───────────────┘    └───────────────┘   └──────────────┘  └──────────────┘
        ✅                 ◄── HIER            ⬜                 ⬜
```

De eerste diamant sluit pas als sectie A van [05](05-open-vragen.md) beantwoord is: dan
is er een gedeelde probleemdefinitie. Wat er nu in documenten 03 en 04 staat, is
vooruitgelopen op die sluiting en is daarom gedegradeerd tot materiaal.

## De volgorde die we aanhouden

| Fase | Vraag | Artefact | Status |
|---|---|---|---|
| Discover | Bestaat dit al? | [01 Concurrentieonderzoek](01-concurrentieonderzoek.md) | ✅ |
| Discover | Kan dit gebouwd worden? | [02 Haalbaarheidsonderzoek](02-haalbaarheidsonderzoek.md) | ✅ |
| Discover | Wat moet Jos weten om te kiezen? | [06 Beslisinput techniek](06-beslisinput-techniek.md) | ✅ |
| **Define** | **Welk probleem, welke scope, welke stack?** | [05 Open vragen](05-open-vragen.md) | ⏳ **bij Jos** |
| Define | Wat bouwen we, wat niet? | PRD — [03](03-prd.md) herschrijven na 05 | ⬜ |
| Develop | Per brok: doel, spec, bewijs | [07 Wave-methode](07-wave-methode.md) → `docs/waves/` | ⬜ |
| Deliver | Gebruik ik het? | Dagelijks gebruik | ⬜ |
| Deliver | Doorgaan of stoppen? | Beslispunt, criterium volgt uit A3/A4 | ⬜ |

Documenten 03 en 04 staan bewust nog in de repo, met een waarschuwing bovenaan: ze
bevatten bruikbaar denkwerk, maar geen enkele afspraak.

## Hoe de wave-methode hierin past

Vanaf de Develop-fase werken we per wave met drie documenten — Goal, Specification, Test
& Verification Plan — in die gezagsvolgorde. De uitwerking, inclusief wat er voor een
lokale desktop-app níét van toepassing is, staat in [07](07-wave-methode.md).

Belangrijk voor de rolverdeling: die methode bevat drie momenten waarop jij expliciet
goedkeurt (Goal, Spec, acceptatie). Dat is precies het mechanisme dat in ronde 1
ontbrak.

## Wat een PO doet dat een PM niet doet

In een team knipt de PO het werk door naar kleinere brokken, prioriteert, en accepteert
opgeleverd werk. Hier zit die rol bij jou, en de wave-methode geeft er de vorm aan: een
wave is de brok, het Goal Document is de prioritering ("dit wel, dat niet"), en het
acceptatiemoment na het bewijsverslag is het moment waarop jij "af" zegt. Het bord op
GitHub toont alleen de stand — de inhoud staat in de documenten. Meer ceremonie dan dat
heeft bij één ontwikkelaar negatieve waarde.

## Het advies dat een eerlijke PM erbij geeft

Zelf bouwen is de duurste manier om dit probleem op te lossen. Voordat je begint, is
het redelijk om één avond te besteden aan de goedkope varianten: Obsidian met een kaal
thema en alle UI-elementen uit, of Typora / iA Writer op dezelfde map. Zie
[het concurrentieonderzoek](01-concurrentieonderzoek.md#6-de-nulmeting-eerst-het-goedkope-alternatief).

Als die avond je niet overtuigt, weet je bovendien véél preciezer wat er dan wél mis is
— en dat is de beste input voor het ontwerp van Lapis die er bestaat.
