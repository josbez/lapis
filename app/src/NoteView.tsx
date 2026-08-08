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
  onMarkdownChange?: (markdown: string) => void
}

export function NoteView({
  documentId,
  markdownSource,
  readOnly = true,
  onMarkdownChange,
}: NoteViewProps) {
  return (
    <AtomicCodeMirrorEditor
      documentId={documentId}
      markdownSource={markdownSource}
      readOnly={readOnly}
      onMarkdownChange={onMarkdownChange}
    />
  )
}
