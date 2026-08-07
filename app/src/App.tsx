import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState } from './EmptyState'
import { Tree } from './Tree'
import { createRequestGate } from './requestGate'
import {
  getSidebarVisible,
  openVault,
  rescanVault,
  restoreVault,
  setSidebarVisible,
  type VaultView,
} from './ipc'

/**
 * De hele UI van W1: lege staat of boom, sidebar verbergen/tonen, een
 * bestand selecteren zonder het te openen. Openen en lezen is W2 (Goal §6).
 */
export default function App() {
  const [view, setView] = useState<VaultView | null>(null)
  const [sidebarVisible, setSidebarVisibleState] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [ready, setReady] = useState(false)

  // Bewaakt het wisselen van vault (bevinding B8): een tweede mapkeuze die
  // vóór het antwoord op de eerste terugkomt, mag niet verliezen van een
  // trage eerste read. In-/uitklappen heeft dit niet nodig — dat gebeurt
  // zonder IPC-aanroep (Spec §5.6).
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
        setStatus('')
      } catch (e) {
        if (!isLatest()) return
        setStatus(`map openen mislukt: ${e}`)
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
            <Tree root={view.tree} selectedPath={selectedPath} onSelectFile={setSelectedPath} />
          </nav>
        )}
        <main>
          {selectedPath ? (
            <p>{selectedPath}</p>
          ) : (
            <p>Kies een notitie in de boom. Openen en lezen volgt in een latere wave.</p>
          )}
        </main>
      </div>
    </div>
  )
}
