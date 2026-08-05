import { useMemo, type MutableRefObject } from 'react'
import {
  AtomicCodeMirrorEditor,
  type AtomicCodeMirrorEditorHandle,
} from '@atomic-editor/editor'
import '@atomic-editor/editor/styles.css'
import { lineSeparatorExtension } from './lineEndings'

interface Props {
  documentId: string
  markdownSource: string
  editorHandleRef: MutableRefObject<AtomicCodeMirrorEditorHandle | null>
}

/**
 * Bewust geen styling. Goal §9 en Spec §6: de eerste versie in code is een
 * wireframe, en in W0 zelfs dat nog niet. Het oordeel gaat over typgedrag,
 * niet over uiterlijk.
 */
export function Editor({ documentId, markdownSource, editorHandleRef }: Props) {
  const extensions = useMemo(
    () => [lineSeparatorExtension(markdownSource)],
    [markdownSource],
  )

  return (
    <AtomicCodeMirrorEditor
      documentId={documentId}
      markdownSource={markdownSource}
      extensions={extensions}
      editorHandleRef={editorHandleRef}
    />
  )
}
