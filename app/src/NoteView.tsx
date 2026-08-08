import { AtomicCodeMirrorEditor } from '@atomic-editor/editor'
import '@atomic-editor/editor/styles.css'

interface NoteViewProps {
  documentId: string
  markdownSource: string
  /**
   * Alleen-lezen (W2-gedrag) is de default: geen caret, geen
   * typen/plakken/tabelbewerking, en gewone links én wikilinks blijven
   * klikbaar. W3 zet 'm uit om te kunnen bewerken, en weer aan tijdens een
   * conflict — geen typen totdat je kiest (PRD §10).
   */
  readOnly?: boolean
  /**
   * Springt bij het monteren naar de eerste treffer van deze tekst, met een
   * korte fade-out-markering (W6: "Enter opent op de gevonden regel" na
   * volledige-tekst-zoeken). `null`/`undefined` voor een gewone open.
   */
  revealText?: string | null
  onMarkdownChange?: (markdown: string) => void
}

export function NoteView({
  documentId,
  markdownSource,
  readOnly = true,
  revealText,
  onMarkdownChange,
}: NoteViewProps) {
  return (
    <AtomicCodeMirrorEditor
      documentId={documentId}
      markdownSource={markdownSource}
      readOnly={readOnly}
      initialRevealText={revealText}
      onMarkdownChange={onMarkdownChange}
    />
  )
}
