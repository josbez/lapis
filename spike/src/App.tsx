import { useCallback, useEffect, useRef, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import type { AtomicCodeMirrorEditorHandle } from '@atomic-editor/editor'
import { Editor } from './Editor'
import { applyLineEnding, detectLineEnding, type LineEnding } from './lineEndings'
import { createRequestGate } from './requestGate'
import { listMarkdown, openVault, readNote, writeNote, type FileEntry } from './ipc'

/**
 * De hele UI van de spike: een knop, een lijst, een editor.
 *
 * Geen laadstaat, geen lege staat, geen styling. Alles wat hier niet staat,
 * staat als out of scope in Goal §6. Wat er ná de code-analyse wél bij is
 * gekomen: één statusregel die ook fouten toont (B11), volgordebewaking op het
 * openen (B8), en een waarschuwing bij onopgeslagen werk (B9, besluit van Jos).
 */
export default function App() {
  const [root, setRoot] = useState<string | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [source, setSource] = useState<string>('')
  const [lineEnding, setLineEnding] = useState<LineEnding>('\n')
  const [status, setStatus] = useState<string>('')

  const handleRef = useRef<AtomicCodeMirrorEditorHandle | null>(null)

  // Eén gate voor beide navigatie-acties: een mapwissel maakt een read die nog
  // onderweg is óók ongeldig.
  const gate = useRef(createRequestGate())

  // Wat er nu op schijf staat. Apart van `source`, want `source` voedt de
  // editor: dat na een save opnieuw zetten zou het document daar herladen.
  const opSchijf = useRef<string>('')

  /**
   * Wat er in de editor staat maar nog niet op schijf. Vergelijkt via dezelfde
   * serialisatiestap als `save`, zodat een puur regeleinde-verschil niet als
   * wijziging telt.
   */
  const heeftOnopgeslagenWerk = useCallback(() => {
    if (openPath === null) return false
    const markdown = handleRef.current?.getMarkdown()
    if (markdown === undefined) return false
    return applyLineEnding(markdown, lineEnding) !== opSchijf.current
  }, [openPath, lineEnding])

  /** B9: stil verlies is iets anders dan geen autosave. */
  const magWegnavigeren = useCallback(() => {
    if (!heeftOnopgeslagenWerk()) return true
    return window.confirm('Er is niet-opgeslagen werk. Weggooien?')
  }, [heeftOnopgeslagenWerk])

  const pickFolder = useCallback(async () => {
    if (!magWegnavigeren()) return
    const picked = await open({ directory: true, multiple: false })
    if (typeof picked !== 'string') return

    const isLatest = gate.current.start()
    try {
      const resolved = await openVault(picked)
      const entries = await listMarkdown()
      if (!isLatest()) return
      // Pas zetten als álle data binnen is (B10): anders staat de nieuwe map
      // boven de bestandslijst van de vorige.
      setRoot(resolved)
      setFiles(entries)
      setOpenPath(null)
      setSource('')
      opSchijf.current = ''
      setStatus('')
    } catch (e) {
      if (!isLatest()) return
      setStatus(`map openen mislukt: ${e}`)
    }
  }, [magWegnavigeren])

  const openNote = useCallback(
    async (path: string) => {
      if (!root) return
      if (path !== openPath && !magWegnavigeren()) return

      const isLatest = gate.current.start()
      try {
        const content = await readNote(path)
        // B8: alleen de laatst gestarte read mag state zetten. Zonder deze
        // regel wint de traagste read in plaats van de laatste klik.
        if (!isLatest()) return
        setSource(content)
        opSchijf.current = content
        // Vastleggen bij openen, niet bij opslaan: de editor geeft altijd LF
        // terug, dus wat er oorspronkelijk in het bestand stond is dan weg.
        setLineEnding(detectLineEnding(content))
        setOpenPath(path)
        setStatus('')
      } catch (e) {
        if (!isLatest()) return
        setStatus(`bestand openen mislukt: ${e}`)
      }
    },
    [root, openPath, magWegnavigeren],
  )

  const save = useCallback(async () => {
    if (!root || !openPath) return
    const markdown = handleRef.current?.getMarkdown()
    if (markdown === undefined) return
    const opTeSlaan = applyLineEnding(markdown, lineEnding)
    try {
      await writeNote(openPath, opTeSlaan)
      // De schijf is nu de waarheid: zonder dit blijft de notitie "vies" en
      // vraagt de spike bij elke klik om bevestiging.
      opSchijf.current = opTeSlaan
      setStatus(`opgeslagen ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setStatus(`opslaan mislukt: ${e}`)
    }
  }, [root, openPath, lineEnding])

  // Alleen expliciet opslaan. Autosave staat in Goal §6 als out of scope.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // B12: met Caps Lock is `e.key` een hoofdletter 'S'. ⇧⌘S uitsluiten,
      // dat is in elke editor "opslaan als" en niet "opslaan".
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [save])

  return (
    <div>
      <button onClick={pickFolder}>Kies map</button>
      <span> {root ?? 'geen map gekozen'}</span>
      <span> {status}</span>

      <ul>
        {files.map((f) => (
          <li key={f.path}>
            <button onClick={() => void openNote(f.path)}>{f.name}</button>
          </li>
        ))}
      </ul>

      {openPath !== null && (
        <Editor
          documentId={`${root}::${openPath}`}
          markdownSource={source}
          editorHandleRef={handleRef}
        />
      )}
    </div>
  )
}
