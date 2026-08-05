import { useCallback, useEffect, useRef, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import type { AtomicCodeMirrorEditorHandle } from '@atomic-editor/editor'
import { Editor } from './Editor'
import { applyLineEnding, detectLineEnding, type LineEnding } from './lineEndings'
import { listMarkdown, readNote, resolveRoot, writeNote, type FileEntry } from './ipc'

/**
 * De hele UI van de spike: een knop, een lijst, een editor.
 *
 * Geen laadstaat, geen foutafhandeling in beeld, geen lege staat, geen styling.
 * Alles wat hier niet staat, staat als out of scope in Goal §6.
 */
export default function App() {
  const [root, setRoot] = useState<string | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [source, setSource] = useState<string>('')
  const [lineEnding, setLineEnding] = useState<LineEnding>('\n')
  const [status, setStatus] = useState<string>('')

  const handleRef = useRef<AtomicCodeMirrorEditorHandle | null>(null)

  const pickFolder = useCallback(async () => {
    const picked = await open({ directory: true, multiple: false })
    if (typeof picked !== 'string') return
    try {
      const resolved = await resolveRoot(picked)
      setRoot(resolved)
      setFiles(await listMarkdown(resolved))
      setOpenPath(null)
      setSource('')
      setStatus('')
    } catch (e) {
      console.error('map openen mislukt', e)
    }
  }, [])

  const openNote = useCallback(
    async (path: string) => {
      if (!root) return
      try {
        const content = await readNote(root, path)
        setSource(content)
        // Vastleggen bij openen, niet bij opslaan: de editor geeft altijd LF
        // terug, dus wat er oorspronkelijk in het bestand stond is dan weg.
        setLineEnding(detectLineEnding(content))
        setOpenPath(path)
        setStatus('')
      } catch (e) {
        console.error('bestand openen mislukt', e)
      }
    },
    [root],
  )

  const save = useCallback(async () => {
    if (!root || !openPath) return
    const markdown = handleRef.current?.getMarkdown()
    if (markdown === undefined) return
    try {
      await writeNote(root, openPath, applyLineEnding(markdown, lineEnding))
      setStatus(`opgeslagen ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      console.error('opslaan mislukt', e)
      setStatus('opslaan mislukt — zie console')
    }
  }, [root, openPath, lineEnding])

  // Alleen expliciet opslaan. Autosave staat in Goal §6 als out of scope.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
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
