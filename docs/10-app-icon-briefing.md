# App-icon briefing

**Voor:** Jos (ontwerpt zelf, zie F1 in [05](05-open-vragen.md): "ik lever een eerste
versie in code, jij herontwerpt op basis daarvan"). Dit document is het functionele
briefingstuk dat aan die herontwerpstap voorafgaat — bedoeld als input voor
Stitch/Claude Design of een handmatige Figma-sessie, niet als kant-en-klaar ontwerp.

**Status:** er is nog geen ontworpen icoon. `app/src-tauri/icons/icon.png` is het
Tauri-standaardplaatje: een effen blauw vlak (`#2b6299`-achtig), zonder vorm of
betekenis. Alles hieronder is dus greenfield.

## 1. Wat Lapis is (en niet is)

Lapis is een rustige markdown-editor voor een map met `.md`-bestanden op de Mac. De
positionering staat letterlijk in de README: *"Lapis doet wat Obsidian doet op de dag
dat je gewoon wilt schrijven en terugvinden — en verder niets. Geen graph view, geen
plugin-store, geen ribbon met twaalf iconen."*

Twee dingen volgen daaruit voor het icoon:

- **Het icoon mag niet beloven wat het product niet is.** Geen netwerk-graaf, geen
  gereedschapskist, geen dashboard-gevoel. Concurrenten als Obsidian (paarse
  edelsteen/knopen-motief) en Notion (drukke, speelse iconografie) verkopen
  functie-rijkdom via hun icoon; Lapis verkoopt afwezigheid daarvan.
- **Rust is de boodschap, niet een stijlkeuze erbovenop.** Eén vorm, één betekenis, geen
  versiering. Dit is dezelfde eis die de PRD aan de instellingen stelt ("elke instelling
  verantwoordt zich") — hier vertaald naar: elk visueel element in het icoon
  verantwoordt zich.

## 2. Waar de naam vandaan komt

"Lapis" verwijst naar lapis lazuli: een diepblauwe, ondoorzichtige steen, van oudsher
gebruikt als pigment (ultramarine). Dat geeft een natuurlijk vertrekpunt:

- **Kleurrichting:** diep, verzadigd blauw — niet het generieke "tech-blauw" van
  duizend andere Mac-apps, maar iets met de zwaarte/diepte van de steen zelf. Eventueel
  met een subtiel goud- of pyrietaccent (lapis lazuli bevat vaak fijne gouden aders) als
  je één accentkleur wilt, maar dat is optioneel — geen vereiste.
- **Wat dit expliciet niet moet worden:** een letterlijke steen, edelsteen-facetten, of
  een cartoonachtige rots. Dat is het Obsidian-icoon opnieuw uitgevonden met een ander
  woord. De naam mag de kleurkeuze informeren zonder dat de vorm een illustratie van het
  woord wordt.

## 3. Functionele eisen (macOS)

- **Formaat:** vierkant, macOS past zelf de squircle-mask toe — niet zelf al afronden.
  Lever minimaal een 1024×1024 master-PNG; `app/src-tauri/icons/` bevat momenteel
  handmatig `32×32`, `128×128`, `128×128@2x` en een losse `icon.png`, maar de Tauri-CLI
  (`npm run tauri icon <master.png>`) genereert de volledige set inclusief `.icns` uit
  één bronbestand. Bundling staat nu nog uit (`bundle.active: false` in
  `tauri.conf.json`) — dat hoeft niet te wachten op het icoon, maar het icoon moet er
  wél zijn voordat bundling aan gaat.
- **Leesbaarheid op schaal:** moet herkenbaar blijven op 16×16 (Dock bij kleine
  instellingen, Spotlight-resultaten) én scherp ogen op 512–1024 (App Store-achtige
  presentatie, marketingmateriaal). Dit dwingt tot één dominante vorm met hoog contrast
  — geen fijne lijntekening, geen tekst, geen kleine losse elementen die bij 16px tot
  een grijze vlek versmelten.
- **Licht/donker:** macOS-iconen leven zelf niet in een dark-mode-variant (in
  tegenstelling tot de UI van de app, waar dat via W10 wél speelt), maar het icoon moet
  zowel op een lichte als een donderde Dock/Finder-achtergrond overeind blijven. Test
  tegen beide.
- **Diepte:** een lichte gradient of subtiele belichting (macOS Big Sur-stijl) mag,
  fotorealistisch materiaal (glas, metaal-reflecties) niet — dat trekt de aandacht naar
  het icoon zelf in plaats van naar rust.

## 4. Wat het icoon moet vermijden

Rechtstreeks afgeleid uit wat de README en PRD expliciet buiten scope plaatsen:

- Geen documenten-/mappenpictogram-cliché (blaadje met omgevouwen hoek, folder-icoon)
  — dat is precies het "gewone bestandsbeheer"-beeld waar Lapis zich bewust van
  afwendt door wél gewone `.md`-bestanden te gebruiken maar er geen ceremonie van te
  maken.
- Geen graph-/netwerk-knopen-motief (Obsidian-signaal).
  Geen pen/veer/schrijfmachine-cliché (generiek "schrijf-app"-signaal, zegt niets over
  wat Lapis onderscheidt).
- Geen meerdere kleuraccenten of iconografische "features" (zoeken, tags, links) samen
  in één beeld — dat is het ribbon-met-twaalf-iconen-probleem in icoonvorm.

## 5. Richting om te verkennen

Geen voorgeschreven concept — dat is aan Jos — maar drie assen die passen bij de
merkstem hierboven, ter inspiratie voor de eerste schetsronde:

1. **Eén minimalistisch merkteken**, geabstraheerd van "lapis" (bijv. een enkel vlak of
   een eenvoudige geometrische vorm in het lapis-blauw) zonder letterlijke
   steen-illustratie — vergelijkbaar in soberheid met hoe iA Writer of Bear een enkel
   herkenbaar teken gebruiken, niet qua vorm.
2. **Een letter-mark**, bijvoorbeeld een sobere "L", als het merk zwaarder op naam dan
   op beeld mag leunen.
3. **Een negative-space-oplossing** waarbij het blauwe vlak zelf de vorm draagt (bijv.
   een subtiele uitsparing die aan een geopende pagina of enkel streepje refereert)
   zonder dat er een los tweede element bovenop komt.

In alle drie de gevallen: één vorm, één hoofdkleur, hooguit één accent.

## 6. Oplevering

Conform F3 ([05](05-open-vragen.md#f3--wat-lever-je-aan-als-het-ontwerp-klaar-is)) is
nog niet vastgelegd of dat een Figma-link, geëxporteerde screenshots, design tokens of
gegenereerde code wordt — voor het icoon specifiek is het praktische minimum:

- Eén master-PNG, 1024×1024, transparante achtergrond niet nodig (macOS-iconen zijn
  altijd ondoorzichtig binnen de squircle).
- Kort, in een zin, de gekozen richting uit §5 (of een andere) en waarom — zodat die
  keuze net zo navolgbaar is als de rest van de besluiten in dit project.

Deze briefing hoort inhoudelijk bij **W10 · De vorm** (zie
[07-wave-methode.md](07-wave-methode.md), regel 133: typografie, licht/donker, lege
staten, instellingenscherm — "ontwerp van Jos"), maar het icoon zelf is niet aan de
wave-volgorde gebonden: het kan onafhankelijk gemaakt worden zodra er tijd voor is,
omdat er geen technische afhankelijkheid is met eerdere waves.
