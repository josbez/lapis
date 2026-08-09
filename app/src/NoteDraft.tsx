import { NoteView } from './NoteView'
import { useDraftNote } from './useDraftNote'

interface NoteDraftProps {
  /** Leeg voor de vault-root. */
  dir: string
  onCreated: (relPath: string, content: string, modifiedMs: number) => void
  onStatus: (status: string) => void
}

/**
 * "Nieuwe notitie" (W7): een concept dat nog niet op schijf bestaat. Alle
 * logica zit in `useDraftNote`; zodra de eerste opslag lukt, geeft
 * `onCreated` de notitie terug aan de aanroeper, die 'm vanaf dan als een
 * gewone `NoteEditor` behandelt — deze component en `useDraftNote` komen er
 * dan niet meer aan te pas.
 */
export function NoteDraft({ dir, onCreated, onStatus }: NoteDraftProps) {
  const draft = useDraftNote({ dir, onCreated, onStatus })

  return (
    <NoteView
      documentId={`draft::${dir}`}
      notePath={null}
      markdownSource={draft.content}
      readOnly={false}
      onMarkdownChange={draft.handleMarkdownChange}
    />
  )
}
