import { AtomicCodeMirrorEditor } from '@atomic-editor/editor'
import '@atomic-editor/editor/styles.css'

interface NoteViewProps {
  documentId: string
  markdownSource: string
}

/**
 * Alleen-lezen weergave van een notitie (W2). `readOnly` komt uit
 * atomic-editor zelf: geen caret, geen typen/plakken/tabelbewerking, en
 * gewone links én wikilinks blijven klikbaar. Er is geen schrijfpad — dat
 * is W3, en tot die er is mag dit ook niet meer lijken dan het is.
 */
export function NoteView({ documentId, markdownSource }: NoteViewProps) {
  return (
    <AtomicCodeMirrorEditor documentId={documentId} markdownSource={markdownSource} readOnly />
  )
}
