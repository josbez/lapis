import { EditorView } from '@codemirror/view'

/**
 * Slaat een geplakte afbeelding op als bijlage en geeft de uiteindelijke
 * bestandsnaam terug (kan afwijken van de voorgestelde naam bij een
 * botsing — `write_attachment` telt dan een nummer op), of `null` als het
 * mislukte. `bytesBase64` is de ruwe inhoud, base64-gecodeerd.
 */
export type PasteImageHandler = (filename: string, bytesBase64: string) => Promise<string | null>

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
}

let pastedImageCounter = 0

function suggestFilename(file: File): string {
  if (file.name.trim() !== '') return file.name
  const ext = MIME_TO_EXTENSION[file.type] ?? 'png'
  pastedImageCounter += 1
  return `Geplakte afbeelding ${pastedImageCounter}.${ext}`
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/**
 * De kale paste-handler, los van `EditorView.domEventHandlers` — zo
 * testbaar met een minimale nep-`view`/`event`, zonder een echte CM6-editor
 * te hoeven monteren (zelfde reden als `useNoteEditor.test.ts` zonder
 * CodeMirror test). Roept `onPasteImage` aan om een geplakte afbeelding als
 * bijlage op te slaan, en voegt bij succes `![](bestandsnaam)` in op de
 * cursorpositie. Alle andere paste-gevallen (tekst, meerdere bestanden,
 * geen afbeelding) laat dit ongemoeid — CodeMirror's eigen paste-
 * afhandeling doet dan gewoon zijn werk.
 *
 * `onPasteImageHolder` komt als houder (`{ current }`) binnen, niet als
 * kale functie: `extensions` wordt maar één keer gelezen bij het
 * monteren, terwijl de callback zelf (gebonden aan `relPath` in
 * `NoteEditor`) een nieuwe identiteit krijgt zodra een eerdere bijlage de
 * notitie al verplaatst heeft (W8). Het lezen van `.current` gebeurt
 * bewust hier, buiten React-rendercode.
 */
export function createPasteHandler(onPasteImageHolder: { current: PasteImageHandler | undefined }) {
  return (event: ClipboardEvent, view: EditorView): boolean => {
    const onPasteImage = onPasteImageHolder.current
    if (!onPasteImage) return false

    const items = event.clipboardData?.items
    if (!items) return false
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'))
    if (!imageItem) return false
    const file = imageItem.getAsFile()
    if (!file) return false

    event.preventDefault()
    const filename = suggestFilename(file)
    const pos = view.state.selection.main.head

    void file
      .arrayBuffer()
      .then((buffer) => onPasteImage(filename, arrayBufferToBase64(buffer)))
      .then((insertedName) => {
        if (!insertedName) return
        const at = Math.min(pos, view.state.doc.length)
        const text = `![](${insertedName})`
        view.dispatch({
          changes: { from: at, to: at, insert: text },
          selection: { anchor: at + text.length },
        })
      })

    return true
  }
}

/** CM6-extensie die {@link createPasteHandler} aan het editor-DOM bindt. */
export function attachmentPasteHandler(onPasteImageHolder: { current: PasteImageHandler | undefined }) {
  return EditorView.domEventHandlers({ paste: createPasteHandler(onPasteImageHolder) })
}
