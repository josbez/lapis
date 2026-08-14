import { useCallback } from 'react'
import { NoteView } from './NoteView'
import { useNoteEditor } from './useNoteEditor'
import { writeAttachment, type NoteContent } from './ipc'
import type { PasteImageHandler } from './attachmentPasteHandler'

interface NoteEditorProps {
  relPath: string
  initial: NoteContent
  /** W6: gezet na openen vanuit volledige-tekst-zoeken, anders `null`. */
  revealText?: string | null
  onStatus: (status: string) => void
  onCopySaved?: () => void
  /**
   * De eerste bijlage in een notitie migreert 'm naar haar eigen map (W8,
   * PRD F5/C8) — de aanroeper (App.tsx) moet dan zijn "welke notitie staat
   * open"-toestand bijwerken naar het nieuwe pad. Optioneel, zodat andere
   * gebruikers van `NoteEditor` (nu is er er maar één) dit niet verplicht
   * hoeven te bekabelen.
   */
  onNoteMoved?: (newRelPath: string) => void
}

/**
 * W3: bewerken, autosave, ⌘S, en de conflictafhandeling uit PRD §10 —
 * "mijn versie behouden" · "hun versie laden" · "beide bewaren". Alle
 * logica zit in `useNoteEditor`; dit is alleen de wiring naar de UI.
 */
export function NoteEditor({
  relPath,
  initial,
  revealText,
  onStatus,
  onCopySaved,
  onNoteMoved,
}: NoteEditorProps) {
  const editor = useNoteEditor({ relPath, initial, onStatus, onCopySaved })

  // W8 — plakken van een afbeelding: eerst alles wat er tot nu toe getypt
  // is opslaan (`flush`, geen debounce), dán de bijlage schrijven. Zo staat
  // de notitie op schijf zoals de editor 'm nu toont vóórdat
  // `write_attachment` 'm eventueel naar haar eigen map verplaatst — geen
  // race met de gewone 500ms-autosave die intussen nog naar het oude pad
  // zou kunnen schrijven.
  const handlePasteImage = useCallback<PasteImageHandler>(
    async (filename, bytesBase64) => {
      await editor.flush()
      try {
        const outcome = await writeAttachment(relPath, filename, bytesBase64)
        if (outcome.noteMoved) {
          onNoteMoved?.(outcome.noteRelPath)
        }
        return outcome.attachmentRelPath.split('/').pop() ?? outcome.attachmentRelPath
      } catch (e) {
        onStatus(`bijlage plakken mislukt: ${e}`)
        return null
      }
    },
    [editor, relPath, onNoteMoved, onStatus],
  )

  return (
    <div>
      {editor.conflict && (
        <div role="alert">
          <p>Dit bestand is buiten Lapis gewijzigd terwijl jij het bewerkte.</p>
          <button type="button" onClick={editor.keepMine}>
            Mijn versie behouden
          </button>
          <button type="button" onClick={editor.loadTheirs}>
            Hun versie laden
          </button>
          <button type="button" onClick={editor.keepBoth}>
            Beide bewaren
          </button>
        </div>
      )}
      <NoteView
        documentId={editor.documentId}
        notePath={relPath}
        markdownSource={editor.markdownSource}
        readOnly={editor.readOnly}
        revealText={revealText}
        onMarkdownChange={editor.handleMarkdownChange}
        onPasteImage={handlePasteImage}
      />
    </div>
  )
}
