import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { readAttachment } from './ipc'

const EXTERNAL_SRC = /^(https?:|data:|blob:)/i

function base64ToBlobUrl(bytesBase64: string, mimeType: string): string {
  const binary = atob(bytesBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
}

function guessMimeType(ref: string): string {
  const ext = ref.split('.').pop()?.toLowerCase()
  return (ext && MIME_BY_EXTENSION[ext]) || 'application/octet-stream'
}

/**
 * Herschrijft relatieve `<img src>`'s die atomic-editor's `imageBlocks()`
 * rendert naar een blob-URL met de werkelijke bijlage-inhoud (W8, PRD
 * F5/C8).
 *
 * De editor rendert een afbeeldingsknoop als `<div class="cm-atomic-image">
 * <img src="…"></div>`, waarbij `src` letterlijk de string uit de markdown
 * is (`ImageWidget.toDOM`, `image-blocks.js`). Een relatief pad zoals
 * `foto.png` lost de browser dan op t.o.v. de webview-document-origin, niet
 * t.o.v. de vault — dat resolveert nooit naar het echte bestand. Er is geen
 * resolver-hook in de editor zelf (`AtomicCodeMirrorEditorProps` heeft geen
 * enkele image-gerelateerde prop), dus dit werkt op DOM-niveau via de
 * generieke `extensions`-prop: elke nog niet opgeloste `<img>` krijgt zijn
 * echte bijlage-inhoud via `read_attachment`, als blob-URL.
 *
 * `img.getAttribute('src')` (niet `img.src`) geeft de rauwe, onopgeloste
 * string terug — de IDL-property zelf zou hier al de (verkeerd opgeloste)
 * absolute URL teruggeven.
 *
 * `notePathHolder` is een houder (`{ current }`), geen kale string:
 * `extensions` wordt maar één keer gelezen, bij het monteren (zie
 * `AtomicCodeMirrorEditorProps`) — verandert het notitiepad daarna
 * (`write_attachment` migreert de notitie naar haar eigen map terwijl de
 * editor blijft staan, W8), dan moet deze extensie dat nieuwe pad alsnog
 * zien zonder dat de editor zelf opnieuw gemonteerd wordt. Het lezen van
 * `.current` gebeurt bewust hier (buiten React-rendercode), niet als
 * inline closure in `NoteView` zelf.
 */
export function attachmentImageResolver(notePathHolder: { current: string | null }) {
  return ViewPlugin.fromClass(
    class {
      private resolved = new WeakSet<HTMLImageElement>()
      private blobUrls: string[] = []

      constructor(view: EditorView) {
        this.scan(view)
      }

      update(update: ViewUpdate) {
        this.scan(update.view)
      }

      private scan(view: EditorView) {
        const notePath = notePathHolder.current
        if (notePath === null) return

        const images = view.dom.querySelectorAll<HTMLImageElement>('.cm-atomic-image img')
        for (const img of images) {
          if (this.resolved.has(img)) continue
          const ref = img.getAttribute('src')
          if (!ref || EXTERNAL_SRC.test(ref)) continue
          this.resolved.add(img)

          void readAttachment(notePath, ref)
            .then((bytesBase64) => {
              const url = base64ToBlobUrl(bytesBase64, guessMimeType(ref))
              this.blobUrls.push(url)
              img.src = url
            })
            .catch(() => {
              // Bijlage niet gevonden (of buiten de vault): de gebroken-
              // afbeelding-placeholder van de browser is hier een eerlijke
              // weergave, geen reden om de editor zelf te storen.
            })
        }
      }

      destroy() {
        for (const url of this.blobUrls) URL.revokeObjectURL(url)
      }
    },
  )
}
