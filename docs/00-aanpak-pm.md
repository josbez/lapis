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

## De volgorde die we aanhouden

| Fase | Vraag | Artefact | Status |
|---|---|---|---|
| Discovery | Bestaat dit al? | Concurrentieonderzoek | ✅ |
| Discovery | Kan ik dit? | Haalbaarheidsonderzoek | ✅ |
| Definitie | Wat bouwen we, wat niet? | PRD | ✅ |
| Definitie | Hoe? | Technische spec | ✅ |
| Bouwen | Werkt het kernidee? | Spike (M0) | ⬜ |
| Bouwen | Gebruik ik het? | v0.1 → dagelijks gebruik | ⬜ |
| Evaluatie | Doorgaan of stoppen? | Beslispunt na 4 weken | ⬜ |

## Wat een PO doet dat een PM niet doet

In een team knipt de PO dit door naar user stories, prioriteert de backlog per sprint
en accepteert werk. Hier val je met beide rollen samen, dus de praktische vertaling is:
de PRD is je backlog, de milestones in de technische spec zijn je sprints, en de
acceptatiecriteria per functie in de PRD zijn wat je "af" noemt. Meer ceremonie dan dat
heeft bij één ontwikkelaar negatieve waarde.

## Het advies dat een eerlijke PM erbij geeft

Zelf bouwen is de duurste manier om dit probleem op te lossen. Voordat je begint, is
het redelijk om één avond te besteden aan de goedkope varianten: Obsidian met een kaal
thema en alle UI-elementen uit, of Typora / iA Writer op dezelfde map. Zie
[het concurrentieonderzoek](01-concurrentieonderzoek.md#de-nulmeting-eerst-het-goedkope-alternatief).

Als die avond je niet overtuigt, weet je bovendien véél preciezer wat er dan wél mis is
— en dat is de beste input voor het ontwerp van Lapis die er bestaat.
