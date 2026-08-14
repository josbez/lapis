import { useEffect, useMemo, useRef } from 'react'
import type { Extension } from '@codemirror/state'
import { AtomicCodeMirrorEditor } from '@atomic-editor/editor'
import '@atomic-editor/editor/styles.css'
import { attachmentImageResolver } from './attachmentImageResolver'
import { attachmentPasteHandler, type PasteImageHandler } from './attachmentPasteHandler'

interface NoteViewProps {
  documentId: string
  /**
   * Het vault-relatieve pad van de notitie zelf — nodig om `![alt](pad)`
   * relatief aan de map van de notitie op te lossen naar de echte bijlage
   * (W8). Anders dan `documentId` (dat ook een generatieteller draagt) is
   * dit precies het pad dat `read_attachment` verwacht. `null` voor een
   * concept-notitie die nog niet op schijf bestaat (`NoteDraft`, W7) — die
   * heeft nog geen pad om bijlagen relatief aan op te lossen, dus blijft
   * inline afbeeldingweergave hier bewust uit tot de eerste opslag.
   */
  notePath: string | null
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
  /**
   * Slaat een geplakte afbeelding op als bijlage (W8). `undefined` laat
   * plakken van een afbeelding gewoon door alsof het geen afbeelding was
   * (`NoteDraft`, of `notePath` is `null` — een concept heeft nog geen pad
   * om een bijlage relatief aan op te slaan).
   */
  onPasteImage?: PasteImageHandler
}

export function NoteView({
  documentId,
  notePath,
  markdownSource,
  readOnly = true,
  revealText,
  onMarkdownChange,
  onPasteImage,
}: NoteViewProps) {
  // `extensions` wordt alleen bij het monteren gelezen (zie de docstring
  // van de prop op `AtomicCodeMirrorEditor`) — `documentId` blijft sinds
  // W8 juist bewust gelijk over een migratie heen (zie `useNoteEditor`'s
  // `mountIdentity`), dus een nieuwe array zou de editor toch nooit meer
  // bereiken. In plaats daarvan lezen de extensies zelf steeds de actuele
  // `notePath`/`onPasteImage` via een ref — het "laatste-waarde-in-een-
  // ref"-patroon uit de React-docs voor callbacks die buiten de rendercyclus
  // (hier: CM6's eigen paste-/update-lifecycle) de actuele waarde nodig
  // hebben zonder dat wijzigen ervan een remount mag veroorzaken. De
  // ref wordt nooit tijdens het renderen zelf gelezen — alleen later,
  // asynchroon, in de CM6-extensies — dus de `react-hooks/refs`-waarschuwing
  // hieronder is een bewuste, geverifieerd veilige uitzondering.
  const notePathRef = useRef(notePath)
  useEffect(() => {
    notePathRef.current = notePath
  }, [notePath])

  const onPasteImageRef = useRef(onPasteImage)
  useEffect(() => {
    onPasteImageRef.current = onPasteImage
  }, [onPasteImage])

  const extensions = useMemo<Extension[]>(() => {
    if (notePath === null) return []
    // eslint-disable-next-line react-hooks/refs -- zie toelichting hierboven: alleen gelezen buiten render, in CM6's eigen lifecycle
    return [attachmentImageResolver(notePathRef), attachmentPasteHandler(onPasteImageRef)]
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewust eenmalig gebouwd (zie toelichting hierboven); latere wijzigingen lopen via de refs, niet via een nieuwe array
  }, [])

  return (
    <AtomicCodeMirrorEditor
      documentId={documentId}
      markdownSource={markdownSource}
      readOnly={readOnly}
      initialRevealText={revealText}
      onMarkdownChange={onMarkdownChange}
      extensions={extensions}
    />
  )
}
