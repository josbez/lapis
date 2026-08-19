import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Breadcrumb } from './Breadcrumb'
import { EmptyState } from './EmptyState'
import { FullTextSearch } from './FullTextSearch'
import { IconRefresh, IconSettings, IconSidebar } from './Icons'
import { NewItemButtons } from './NewItemButtons'
import { NoteDraft } from './NoteDraft'
import { NoteEditor } from './NoteEditor'
import { QuickSwitcher, flattenFiles } from './QuickSwitcher'
import { Settings } from './Settings'
import { Tree, type TreeActions } from './Tree'
import { createRequestGate } from './requestGate'
import {
  createFolder,
  getRecentPaths,
  getSidebarVisible,
  getStartPage,
  moveNote,
  openVault,
  readNote,
  recordNoteOpened,
  rescanVault,
  restoreVault,
  setSidebarVisible,
  setStartPage,
  trashNote,
  type NoteContent,
  type VaultView,
} from './ipc'

// Zelfde grens als app-state::MAX_RECENT_PATHS — de optimistische
// bijwerking hier mag niet ongelimiteerd doorgroeien binnen één sessie.
const MAX_RECENT_PATHS = 20

/**
 * De hele UI van W1+W2+W3+W5+W6: lege staat of boom, sidebar verbergen/tonen,
 * een notitie openen en bewerken, de ⌘K quick switcher en ⌘⇧F volledige-
 * tekst-zoeken. Het bewerken zelf — autosave, ⌘S, conflicten — zit in
 * NoteEditor/useNoteEditor; deze component regelt alleen welke notitie open
 * is.
 */
export default function App() {
  const [view, setView] = useState<VaultView | null>(null)
  const [sidebarVisible, setSidebarVisibleState] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState<NoteContent | null>(null)
  const [revealText, setRevealText] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [ready, setReady] = useState(false)
  const [recentPaths, setRecentPaths] = useState<string[]>([])
  // W9: het relatieve pad van de vaste eerste pagina, of `null` als er geen
  // ingesteld is.
  const [startPage, setStartPageState] = useState<string | null>(null)
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [fullTextSearchOpen, setFullTextSearchOpen] = useState(false)
  // W10: het instellingenscherm (PRD F6) — één scherm, geen tabs.
  const [settingsOpen, setSettingsOpen] = useState(false)
  // W7: `null` zolang er geen concept openstaat, anders de map waarin het
  // straks aangemaakt wordt (leeg voor de vault-root).
  const [draftDir, setDraftDir] = useState<string | null>(null)

  // Bewaakt zowel het wisselen van vault als het openen van een notitie
  // (bevinding B8): een tweede actie die vóór het antwoord op de eerste
  // terugkomt, mag niet verliezen van een trage eerste read. Eén gate voor
  // beide, want een mapwissel maakt een notitie-read die nog onderweg is óók
  // ongeldig — hetzelfde patroon als W0's App.tsx. In-/uitklappen heeft dit
  // niet nodig — dat gebeurt zonder IPC-aanroep (Spec W1 §5.6).
  const gate = useRef(createRequestGate())

  // W10: quick switcher, volledige-tekst-zoeken en instellingen zijn alle
  // drie een overlay boven dezelfde inhoud — hoogstens één tegelijk open.
  const closeOverlays = useCallback(() => {
    setQuickSwitcherOpen(false)
    setFullTextSearchOpen(false)
    setSettingsOpen(false)
  }, [])

  /**
   * Opent de vaste eerste pagina (W9, PRD F7) — bij het starten van Lapis en
   * via de sneltoets. `isLatest` komt van de aanroeper in plaats van hier
   * zelf een nieuw gate-token te starten: de opstart-effect hieronder geeft
   * zijn eigen token door, zodat die zijn eigen `setReady` daarna nog kan
   * laten winnen (laatst-gestarte-wint, zie requestGate.ts) — een nieuw
   * token hier zou dat token meteen ongeldig maken.
   *
   * Is de aangewezen notitie inmiddels verdwenen, dan vervalt de instelling
   * stilzwijgend — geen foutmelding, geen dialoog (PRD F7).
   */
  const openStartPageIfPresent = useCallback((relPath: string, isLatest: () => boolean) => {
    setSelectedPath(relPath)
    setNoteContent(null)
    setRevealText(null)
    closeOverlays()
    void (async () => {
      try {
        const content = await readNote(relPath)
        if (!isLatest()) return
        setNoteContent(content)
        setStatus('')
        setRecentPaths((prev) => [relPath, ...prev.filter((p) => p !== relPath)].slice(0, MAX_RECENT_PATHS))
        void recordNoteOpened(relPath)
      } catch {
        if (!isLatest()) return
        setSelectedPath(null)
        setStartPageState(null)
        void setStartPage(null).catch(() => {})
      }
    })()
  }, [closeOverlays])

  useEffect(() => {
    const isLatest = gate.current.start()
    void (async () => {
      try {
        const [restored, visible, recent, savedStartPage] = await Promise.all([
          restoreVault(),
          getSidebarVisible(),
          getRecentPaths(),
          getStartPage(),
        ])
        if (!isLatest()) return
        setView(restored)
        setSidebarVisibleState(visible)
        setRecentPaths(recent)
        setStartPageState(savedStartPage)
        // PRD F7: "Lapis starten opent de aangewezen notitie" — alleen
        // zinvol als er ook een vault onthouden is.
        if (restored && savedStartPage) {
          openStartPageIfPresent(savedStartPage, isLatest)
        }
      } catch (e) {
        if (!isLatest()) return
        setStatus(`herstellen mislukt: ${e}`)
      } finally {
        if (isLatest()) setReady(true)
      }
    })()
  }, [openStartPageIfPresent])

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
        // W10: een vault wisselen kan nu ook vanuit Instellingen, terwijl er
        // nog een ander overlay openstaat — die hoort dan niet over de
        // nieuwe, andere boom heen te blijven staan.
        closeOverlays()
      } catch (e) {
        if (!isLatest()) return
        setStatus(`map openen mislukt: ${e}`)
      }
    })()
  }, [closeOverlays])

  const openNote = useCallback((relPath: string, reveal: string | null = null) => {
    const isLatest = gate.current.start()
    setSelectedPath(relPath)
    setNoteContent(null)
    setRevealText(reveal)
    closeOverlays()
    void (async () => {
      try {
        const content = await readNote(relPath)
        if (!isLatest()) return
        setNoteContent(content)
        setStatus('')
        // Optimistisch bijwerken (instant in beeld) én laten onthouden voor
        // een volgende sessie (W5) — de opslag zelf mag rustig op de
        // achtergrond gebeuren.
        setRecentPaths((prev) => [relPath, ...prev.filter((p) => p !== relPath)].slice(0, MAX_RECENT_PATHS))
        void recordNoteOpened(relPath)
      } catch (e) {
        if (!isLatest()) return
        setNoteContent(null)
        setStatus(`notitie openen mislukt: ${e}`)
      }
    })()
  }, [closeOverlays])

  /** Rechtsklik → "Als startpagina instellen" (W9). */
  const setAsStartPage = useCallback((relPath: string) => {
    setStartPageState(relPath)
    void setStartPage(relPath).catch((e: unknown) => setStatus(`startpagina instellen mislukt: ${e}`))
  }, [])

  /** Rechtsklik → "Startpagina wissen" (W9). */
  const clearStartPage = useCallback(() => {
    setStartPageState(null)
    void setStartPage(null).catch((e: unknown) => setStatus(`startpagina wissen mislukt: ${e}`))
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

  /**
   * De eerste bijlage in de open notitie migreert 'm naar haar eigen map
   * (W8). Anders dan `renameFile`/`moveFile` géén `openNote()` (dat zou
   * `noteContent` op `null` zetten en dus `NoteEditor` laten ontmounten —
   * precies wat hier niet mag: de gebruiker was nog aan het typen toen de
   * bijlage geplakt werd, en `NoteEditor` heeft de actuele inhoud al zelf
   * naar het nieuwe pad geschreven vóór dit aangeroepen wordt). Alleen het
   * pad zelf bijwerken, zodat toekomstige acties (opslaan, hernoemen,
   * naar de prullenbak) het juiste bestand raken; de boom volgt via
   * `refresh()`.
   */
  const handleNoteMoved = useCallback(
    (newRelPath: string) => {
      setSelectedPath(newRelPath)
      refresh()
    },
    [refresh],
  )

  /** "Nieuwe notitie" (W7) — opent een concept, nog geen bestand op schijf. */
  const newNote = useCallback(
    (dir: string = '') => {
      gate.current.start()
      setSelectedPath(null)
      setNoteContent(null)
      setRevealText(null)
      closeOverlays()
      setDraftDir(dir)
    },
    [closeOverlays],
  )

  /** Het concept is bij de eerste opslag echt aangemaakt (W7) — vanaf hier
   * is het een gewone notitie, behandeld door NoteEditor/useNoteEditor. */
  const handleDraftCreated = useCallback(
    (relPath: string, content: string, modifiedMs: number) => {
      setDraftDir(null)
      setSelectedPath(relPath)
      setNoteContent({ content, modifiedMs })
      setStatus('')
      setRecentPaths((prev) => [relPath, ...prev.filter((p) => p !== relPath)].slice(0, MAX_RECENT_PATHS))
      void recordNoteOpened(relPath)
      refresh()
    },
    [refresh],
  )

  /**
   * Hernoemen (W7) — vraagt een nieuwe naam, blijft in dezelfde map.
   * `moveNote`/`renameNote` zijn aan de Rust-kant dezelfde bewerking (Spec:
   * één `rename()`); hier zijn het twee prompts met een verschillend doel.
   */
  const renameFile = useCallback(
    (relPath: string) => {
      const slash = relPath.lastIndexOf('/')
      const dir = slash === -1 ? '' : relPath.slice(0, slash)
      const currentName = slash === -1 ? relPath : relPath.slice(slash + 1)

      const input = window.prompt('Nieuwe naam:', currentName)
      if (input === null) return
      const name = input.trim()
      if (name === '' || name === currentName) return
      const withExt = name.toLowerCase().endsWith('.md') ? name : `${name}.md`
      const newRelPath = dir === '' ? withExt : `${dir}/${withExt}`

      void moveNote(relPath, newRelPath)
        .then(() => {
          refresh()
          if (selectedPath === relPath) openNote(newRelPath)
        })
        .catch((e: unknown) => setStatus(`hernoemen mislukt: ${e}`))
    },
    [refresh, selectedPath, openNote],
  )

  /**
   * Verplaatsen naar een andere map (W7). Een ruw eerste antwoord — een pad
   * intypen in plaats van een mapkiezer of drag-and-drop — bewust een MVP
   * (zie README): het maakt verplaatsen mogelijk zonder de scope van deze
   * wave te laten uitdijen naar interactiepolish, dat hoort bij W10.
   */
  const moveFile = useCallback(
    (relPath: string) => {
      const name = relPath.slice(relPath.lastIndexOf('/') + 1)
      const input = window.prompt(
        'Verplaatsen naar (pad vanaf de vault-root, leeg voor de hoofdmap):',
        '',
      )
      if (input === null) return
      const dir = input.trim().replace(/^\/+|\/+$/g, '')
      const newRelPath = dir === '' ? name : `${dir}/${name}`
      if (newRelPath === relPath) return

      void moveNote(relPath, newRelPath)
        .then(() => {
          refresh()
          if (selectedPath === relPath) openNote(newRelPath)
        })
        .catch((e: unknown) => setStatus(`verplaatsen mislukt: ${e}`))
    },
    [refresh, selectedPath, openNote],
  )

  /** Naar de prullenbak (W7, PRD C7) — nooit permanent. */
  const trashFile = useCallback(
    (relPath: string) => {
      if (!window.confirm(`"${relPath}" naar de prullenbak?`)) return
      void trashNote(relPath)
        .then(() => {
          refresh()
          if (selectedPath === relPath) {
            setSelectedPath(null)
            setNoteContent(null)
          }
        })
        .catch((e: unknown) => setStatus(`naar de prullenbak verplaatsen mislukt: ${e}`))
    },
    [refresh, selectedPath],
  )

  /** "Nieuwe map" (W7). `dir` is leeg voor de vault-root. */
  const newFolder = useCallback(
    (dir: string = '') => {
      const input = window.prompt('Naam van de nieuwe map:')
      if (input === null || input.trim() === '') return
      void createFolder(dir, input.trim())
        .then(() => refresh())
        .catch((e: unknown) => setStatus(`nieuwe map aanmaken mislukt: ${e}`))
    },
    [refresh],
  )

  const treeActions: TreeActions = useMemo(
    () => ({
      onRenameFile: renameFile,
      onMoveFile: moveFile,
      onTrashFile: trashFile,
      onNewNoteInDir: newNote,
      onNewFolderInDir: newFolder,
      onSetStartPage: setAsStartPage,
      onClearStartPage: clearStartPage,
    }),
    [renameFile, moveFile, trashFile, newNote, newFolder, setAsStartPage, clearStartPage],
  )

  const toggleSidebar = useCallback(() => {
    const next = !sidebarVisible
    setSidebarVisibleState(next)
    void setSidebarVisible(next).catch((e: unknown) => {
      setStatus(`sidebar-status opslaan mislukt: ${e}`)
    })
  }, [sidebarVisible])

  const files = useMemo(() => (view ? flattenFiles(view.tree) : []), [view])

  // ⌘K: de quick switcher (W5). ⌘⇧F: volledige tekst zoeken (W6). ⌘⇧H: naar
  // de vaste eerste pagina (W9) — doet niets zonder ingestelde startpagina.
  // Werken ook terwijl er in een notitie getypt wordt — CodeMirror bindt
  // geen van drieën zelf, dus dit komt gewoon door.
  useEffect(() => {
    if (!view) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setFullTextSearchOpen(false)
        setSettingsOpen(false)
        setQuickSwitcherOpen((open) => !open)
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setQuickSwitcherOpen(false)
        setSettingsOpen(false)
        setFullTextSearchOpen((open) => !open)
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        if (startPage) {
          openStartPageIfPresent(startPage, gate.current.start())
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, startPage, openStartPageIfPresent])

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
    <div className="lapis-app">
      <div className="lapis-toolbar" data-tauri-drag-region="">
        <button
          type="button"
          className="lapis-toolbar-btn"
          aria-label={sidebarVisible ? 'Sidebar verbergen' : 'Sidebar tonen'}
          title={sidebarVisible ? 'Sidebar verbergen' : 'Sidebar tonen'}
          onClick={toggleSidebar}
        >
          <IconSidebar />
        </button>
        <span className="lapis-toolbar-spacer" />
        <button
          type="button"
          className="lapis-toolbar-btn"
          aria-label="Verversen"
          title="Verversen"
          onClick={refresh}
        >
          <IconRefresh />
        </button>
      </div>
      <div className="lapis-body">
        {sidebarVisible && (
          <nav aria-label="Vault" className="lapis-sidebar">
            <div className="lapis-sidebar-tree">
              <Tree
                root={view.tree}
                selectedPath={selectedPath}
                startPage={startPage}
                onSelectFile={openNote}
                actions={treeActions}
              />
            </div>
            <div className="lapis-sidebar-footer">
              <NewItemButtons onNewNote={() => newNote()} onNewFolder={() => newFolder()} />
              <button
                type="button"
                className="lapis-sidebar-settings"
                onClick={() => {
                  setQuickSwitcherOpen(false)
                  setFullTextSearchOpen(false)
                  setSettingsOpen(true)
                }}
              >
                <IconSettings />
                <span>Instellingen</span>
              </button>
            </div>
          </nav>
        )}
        <main className="lapis-main">
          {draftDir !== null ? (
            <NoteDraft dir={draftDir} onCreated={handleDraftCreated} onStatus={setStatus} />
          ) : selectedPath === null ? (
            <p className="lapis-main-placeholder">Kies een notitie in de boom.</p>
          ) : noteContent !== null ? (
            <>
              <Breadcrumb relPath={selectedPath} />
              <NoteEditor
                relPath={selectedPath}
                initial={noteContent}
                revealText={revealText}
                onStatus={setStatus}
                onCopySaved={refresh}
                onNoteMoved={handleNoteMoved}
              />
            </>
          ) : (
            <p className="lapis-main-placeholder">{status || 'laden…'}</p>
          )}
        </main>
      </div>
      <div className="lapis-statusbar">
        <span>{status}</span>
      </div>
      {quickSwitcherOpen && (
        <QuickSwitcher
          files={files}
          recentPaths={recentPaths}
          onOpen={openNote}
          onClose={() => setQuickSwitcherOpen(false)}
        />
      )}
      {fullTextSearchOpen && (
        <FullTextSearch onOpen={openNote} onClose={() => setFullTextSearchOpen(false)} />
      )}
      {settingsOpen && (
        <Settings
          vaultRootDisplay={view.rootDisplay}
          startPage={startPage}
          onPickVault={pickFolder}
          onClearStartPage={clearStartPage}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
