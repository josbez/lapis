import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState } from './EmptyState'
import { NoteEditor } from './NoteEditor'
import { Tree } from './Tree'
import { createRequestGate } from './requestGate'
import {
  getSidebarVisible,
  openVault,
  readNote,
  rescanVault,
  restoreVault,
  setSidebarVisible,
  type NoteContent,
  type VaultView,
} from './ipc'

/**
 * De hele UI van W1+W2+W3: lege staat of boom, sidebar verbergen/tonen, en
 * een notitie openen en bewerken. Het bewerken zelf — autosave, ⌘S,
 * conflicten — zit in NoteEditor/useNoteEditor; deze component regelt
 * alleen welke notitie open is.
 */
export default function App() {
  const [view, setView] = useState<VaultView | null>(null)
  const [sidebarVisible, setSidebarVisibleState] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState<NoteContent | null>(null)
  const [status, setStatus] = useState('')
  const [ready, setReady] = useState(false)

  // Bewaakt zowel het wisselen van vault als het openen van een notitie
  // (bevinding B8): een tweede actie die vóór het antwoord op de eerste
  // terugkomt, mag niet verliezen van een trage eerste read. Eén gate voor
  // beide, want een mapwissel maakt een notitie-read die nog onderweg is óók
  // ongeldig — hetzelfde patroon als W0's App.tsx. In-/uitklappen heeft dit
  // niet nodig — dat gebeurt zonder IPC-aanroep (Spec W1 §5.6).
  const gate = useRef(createRequestGate())

  useEffect(() => {
    const isLatest = gate.current.start()
    void (async () => {
      try {
        const [restored, visible] = await Promise.all([restoreVault(), getSidebarVisible()])
        if (!isLatest()) return
        setView(restored)
        setSidebarVisibleState(visible)
      } catch (e) {
        if (!isLatest()) return
        setStatus(`herstellen mislukt: ${e}`)
      } finally {
        if (isLatest()) setReady(true)
      }
    })()
  }, [])

  const pickFolder = useCallback((picked: string) => {
    const isLatest = gate.current.start()
    void (async () => {
      try {
        const opened = await openVault(picked)
        if (!isLatest()) return
        setView(opened)
        setSelectedPath(null)
        setNoteContent(null)
        setStatus('')
      } catch (e) {
        if (!isLatest()) return
        setStatus(`map openen mislukt: ${e}`)
      }
    })()
  }, [])

  const openNote = useCallback((relPath: string) => {
    const isLatest = gate.current.start()
    setSelectedPath(relPath)
    setNoteContent(null)
    void (async () => {
      try {
        const content = await readNote(relPath)
        if (!isLatest()) return
        setNoteContent(content)
        setStatus('')
      } catch (e) {
        if (!isLatest()) return
        setNoteContent(null)
        setStatus(`notitie openen mislukt: ${e}`)
      }
    })()
  }, [])

  const refresh = useCallback(() => {
    void (async () => {
      try {
        const refreshed = await rescanVault()
        setView(refreshed)
      } catch (e) {
        setStatus(`verversen mislukt: ${e}`)
      }
    })()
  }, [])

  const toggleSidebar = useCallback(() => {
    const next = !sidebarVisible
    setSidebarVisibleState(next)
    void setSidebarVisible(next).catch((e: unknown) => {
      setStatus(`sidebar-status opslaan mislukt: ${e}`)
    })
  }, [sidebarVisible])

  // Nog niets te tonen vóórdat restoreVault() en getSidebarVisible()
  // terugkomen — anders flitst de lege staat even op bij elke start.
  if (!ready) {
    return null
  }

  if (!view) {
    return (
      <EmptyState
        onPick={pickFolder}
        message="Nog geen map gekozen. Kies de map die je als vault wilt gebruiken."
      />
    )
  }

  return (
    <div>
      <div>
        <button type="button" onClick={toggleSidebar}>
          {sidebarVisible ? 'Sidebar verbergen' : 'Sidebar tonen'}
        </button>
        <button type="button" onClick={refresh}>
          Verversen
        </button>
        <span> {view.rootDisplay}</span>
        <span> {status}</span>
      </div>
      <div style={{ display: 'flex' }}>
        {sidebarVisible && (
          <nav aria-label="Vault">
            <Tree root={view.tree} selectedPath={selectedPath} onSelectFile={openNote} />
          </nav>
        )}
        <main>
          {selectedPath === null ? (
            <p>Kies een notitie in de boom.</p>
          ) : noteContent !== null ? (
            <NoteEditor
              relPath={selectedPath}
              initial={noteContent}
              onStatus={setStatus}
              onCopySaved={refresh}
            />
          ) : (
            <p>{status || 'laden…'}</p>
          )}
        </main>
      </div>
    </div>
  )
}
