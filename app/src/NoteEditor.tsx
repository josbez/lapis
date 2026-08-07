import { NoteView } from './NoteView'
import { useNoteEditor } from './useNoteEditor'
import type { NoteContent } from './ipc'

interface NoteEditorProps {
  relPath: string
  initial: NoteContent
  onStatus: (status: string) => void
  onCopySaved?: () => void
}

/**
 * W3: bewerken, autosave, ⌘S, en de conflictafhandeling uit PRD §10 —
 * "mijn versie behouden" · "hun versie laden" · "beide bewaren". Alle
 * logica zit in `useNoteEditor`; dit is alleen de wiring naar de UI.
 */
export function NoteEditor({ relPath, initial, onStatus, onCopySaved }: NoteEditorProps) {
  const editor = useNoteEditor({ relPath, initial, onStatus, onCopySaved })

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
        markdownSource={editor.markdownSource}
        readOnly={editor.readOnly}
        onMarkdownChange={editor.handleMarkdownChange}
      />
    </div>
  )
}
