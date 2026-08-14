/**
 * jsdom laat een paar DOM-metingen-APIs weg die CodeMirror 6 en
 * atomic-editor's eigen reveal-scroll-logica (`initialRevealText`, W6)
 * aanroepen als onderdeel van hun layout-berekening — niet ontbrekend
 * omdat wij ze gebruiken, maar omdat de editor ze intern nodig heeft om
 * cursorposities en scrollgedrag te bepalen. Zonder deze stubs gooit een
 * `requestAnimationFrame`-callback die ná een test se `cleanup()` afgaat
 * een onafgevangen `TypeError`, wat Vitest terecht als een falende run
 * behandelt — ook al slaagden alle assertions zelf (bevinding: CI zag dit
 * intermitterend gebeuren, zonder dat er iets aan een test hoefde te
 * veranderen). Dit bestand geeft de ontbrekende methodes een onschadelijke
 * no-op-implementatie, precies zoals een echte browser ze wél zou hebben.
 */
Range.prototype.getClientRects = () => ({
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* () {},
}) as unknown as DOMRectList

Range.prototype.getBoundingClientRect = () =>
  ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

Element.prototype.scrollIntoView = () => {}

/**
 * jsdom implementeert `URL.createObjectURL`/`revokeObjectURL` niet (geen
 * echte blob-registry) — nodig voor `attachmentImageResolver` (W8), dat
 * bijlage-bytes als blob-URL in een `<img src>` zet. Een teller volstaat:
 * de tests controleren alleen dát de `src` herschreven wordt, niet de
 * inhoud van de URL zelf.
 */
let objectUrlCounter = 0
URL.createObjectURL = () => `blob:mock-${++objectUrlCounter}`
URL.revokeObjectURL = () => {}

/**
 * jsdom implementeert `Blob.prototype.arrayBuffer` niet — nodig om een
 * geplakte afbeelding als bytes te lezen (W8, `attachmentPasteHandler`).
 * `FileReader` (wél aanwezig in jsdom) doet hetzelfde werk.
 */
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}
