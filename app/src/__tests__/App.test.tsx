import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { open } from '@tauri-apps/plugin-dialog'
import App from '../App'
import * as ipc from '../ipc'
import type { VaultView } from '../ipc'
import { useDraftNote, type UseDraftNoteResult } from '../useDraftNote'

vi.mock('../ipc')
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
const mockedOpen = vi.mocked(open)
// W7 — alleen gemockt om onCreated rechtstreeks te kunnen aanroepen; de
// hook zelf (debounce, ⌘S, blur, de create_note-race) is al uitputtend
// getest in useDraftNote.test.ts. Zonder mock zou "een concept wordt bij de
// eerste opslag…" moeten typen in de echte CodeMirror-editor, en dat is
// precies wat nergens anders in deze testsuite gebeurt — jsdom simuleert
// CM6's contenteditable-mechanisme niet betrouwbaar.
vi.mock('../useDraftNote')

const mockedIpc = vi.mocked(ipc)
const mockedUseDraftNote = vi.mocked(useDraftNote)

function draftStub(overrides: Partial<UseDraftNoteResult> = {}): UseDraftNoteResult {
  return { content: '', handleMarkdownChange: vi.fn(), ...overrides }
}

const eenBoom: VaultView = {
  rootDisplay: '/tmp/vault',
  tree: {
    name: 'vault',
    relPath: '',
    kind: 'dir',
    readable: true,
    children: [{ name: 'notitie.md', relPath: 'notitie.md', kind: 'file', readable: true, children: [] }],
  },
}

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Standaardwaarden voor W5 — individuele tests overschrijven dit alleen
    // als het recente-paden-gedrag zelf getest wordt.
    mockedIpc.getRecentPaths.mockResolvedValue([])
    mockedIpc.recordNoteOpened.mockResolvedValue(undefined)
    // W9 — idem: alleen tests die zelf de startpagina zetten/wissen
    // overschrijven dit.
    mockedIpc.getStartPage.mockResolvedValue(null)
    mockedIpc.setStartPage.mockResolvedValue(undefined)
    // W7 — idem: alleen tests die zelf "Nieuwe notitie" aanklikken
    // overschrijven dit.
    mockedUseDraftNote.mockReturnValue(draftStub())
  })

  afterEach(() => {
    cleanup()
  })

  it('toont de lege staat als restoreVault niets teruggeeft (Goal §0/V4)', async () => {
    mockedIpc.restoreVault.mockResolvedValue(null)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)

    await waitFor(() => expect(screen.getByText('Kies map')).toBeTruthy())
  })

  it('toont de boom als er een vault onthouden is', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)

    // W10: het vaultpad staat sinds de herziening niet meer in de toolbar
    // (dat hoort bij Instellingen) — deze test bewijst alleen dat de boom
    // verschijnt.
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())
  })

  it('sidebar verbergen haalt de boom uit beeld en onthoudt de stand', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.setSidebarVisible.mockResolvedValue(undefined)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Sidebar verbergen' }))
    await waitFor(() => expect(screen.queryByText(/notitie\.md/)).toBeNull())
    expect(mockedIpc.setSidebarVisible).toHaveBeenCalledWith(false)

    // De boom-data blijft intact — verbergen is CSS-state, geen her-fetch
    // (Spec §5.6).
    fireEvent.click(screen.getByRole('button', { name: 'Sidebar tonen' }))
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())
    expect(mockedIpc.rescanVault).not.toHaveBeenCalled()
  })

  it('start verborgen als app-state dat zo onthouden had', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(false)

    render(<App />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sidebar tonen' })).toBeTruthy())
    expect(screen.queryByText(/notitie\.md/)).toBeNull()
  })

  it('een foutmelding bij restoreVault crasht de app niet', async () => {
    mockedIpc.restoreVault.mockRejectedValue(new Error('kapot'))
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)

    await waitFor(() => expect(screen.getByText('Kies map')).toBeTruthy())
  })

  // W3 — een notitie selecteren opent 'm bewerkbaar (W2 was nog alleen-lezen;
  // alleen-lezen is sinds W3 voorbehouden aan een actief conflict).
  it('een notitie selecteren leest de inhoud en toont die bewerkbaar', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.readNote.mockResolvedValue({
      content: '# Titel\n\nDe inhoud van de notitie.',
      modifiedMs: 1000,
    })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByText(/notitie\.md/))

    await waitFor(() => expect(screen.getByText(/De inhoud van de notitie/)).toBeTruthy())
    expect(mockedIpc.readNote).toHaveBeenCalledWith('notitie.md')

    const content = document.querySelector('.cm-content')
    expect(content?.getAttribute('contenteditable')).toBe('true')
  })

  it('een mislukte read toont een foutmelding, geen editor', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.readNote.mockRejectedValue(new Error('kapot'))

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByText(/notitie\.md/))

    // De foutmelding staat zowel in de statusregel als in het hoofdvenster
    // (Spec §5.6-stijl: geen editor zonder geslaagde read) — vandaar
    // getAllByText in plaats van getByText.
    await waitFor(() =>
      expect(screen.getAllByText(/notitie openen mislukt/).length).toBeGreaterThan(0),
    )
    expect(document.querySelector('.cm-content')).toBeNull()
  })

  it('alleen het laatst geselecteerde bestand wint (bevinding B8)', async () => {
    mockedIpc.restoreVault.mockResolvedValue({
      rootDisplay: '/tmp/vault',
      tree: {
        name: 'vault',
        relPath: '',
        kind: 'dir',
        readable: true,
        children: [
          { name: 'a.md', relPath: 'a.md', kind: 'file', readable: true, children: [] },
          { name: 'b.md', relPath: 'b.md', kind: 'file', readable: true, children: [] },
        ],
      },
    })
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    let resolveA!: (v: ipc.NoteContent) => void
    let resolveB!: (v: ipc.NoteContent) => void
    mockedIpc.readNote.mockImplementation((relPath: string) => {
      if (relPath === 'a.md') return new Promise((r) => (resolveA = r))
      return new Promise((r) => (resolveB = r))
    })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/a\.md/)).toBeTruthy())

    // Klik A, dan klik B — B's antwoord komt eerst terug, A's daarna.
    fireEvent.click(screen.getByText(/a\.md/))
    fireEvent.click(screen.getByText(/b\.md/))

    resolveB({ content: 'inhoud van B', modifiedMs: 1000 })
    await waitFor(() => expect(screen.getByText(/inhoud van B/)).toBeTruthy())

    resolveA({ content: 'inhoud van A', modifiedMs: 1000 })
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText(/inhoud van A/)).toBeNull()
    expect(screen.getByText(/inhoud van B/)).toBeTruthy()
  })

  // W5 — quick switcher.
  it('⌘K opent de quick switcher, Escape sluit hem weer', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('een notitie kiezen in de quick switcher opent hem en onthoudt hem als recent', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.readNote.mockResolvedValue({ content: 'inhoud', modifiedMs: 1000 })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^notitie\.md/ }))

    await waitFor(() => expect(mockedIpc.readNote).toHaveBeenCalledWith('notitie.md'))
    expect(mockedIpc.recordNoteOpened).toHaveBeenCalledWith('notitie.md')
    // Openen sluit de switcher — anders staat hij nog over de editor heen.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // W6 — volledige tekst zoeken.
  it('⌘⇧F opent het zoekvenster, Escape sluit het weer', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.keyDown(window, { key: 'f', metaKey: true, shiftKey: true })
    expect(screen.getByRole('dialog', { name: 'Zoeken in alle notities' })).toBeTruthy()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('⌘⇧K opent niet de quick switcher (die luistert alleen zonder shift)', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'k', metaKey: true, shiftKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('een zoekresultaat kiezen opent de notitie en sluit het zoekvenster', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.readNote.mockResolvedValue({ content: 'de inhoud met koffie erin', modifiedMs: 1000 })
    mockedIpc.searchNotes.mockResolvedValue([
      { path: 'notitie.md', title: 'Notitie', snippet: 'iets met <mark>koffie</mark> erin' },
    ])

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'f', metaKey: true, shiftKey: true })
    fireEvent.change(screen.getByPlaceholderText('Zoek in alle notities…'), {
      target: { value: 'koffie' },
    })

    await waitFor(() => expect(screen.getByRole('option')).toBeTruthy())
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Notitie/ }))

    await waitFor(() => expect(mockedIpc.readNote).toHaveBeenCalledWith('notitie.md'))
    expect(mockedIpc.recordNoteOpened).toHaveBeenCalledWith('notitie.md')
    expect(screen.queryByRole('dialog')).toBeNull()

    // Bewijst dat de gemarkeerde tekst uit de snippet ("koffie") daadwerkelijk
    // als `initialRevealText` bij de editor terechtkomt — niet alleen dat de
    // prop wordt doorgegeven, maar dat de echte CodeMirror-editor 'm ook
    // gebruikt om te springen (herkenbaar aan atomic-editor's eigen
    // markeringsklasse).
    await waitFor(() => expect(document.querySelector('.cm-initialRevealMatch')).toBeTruthy())
    expect(document.querySelector('.cm-initialRevealMatch')?.textContent).toBe('koffie')
  })

  it('herstelt de onthouden recente paden bij het opstarten', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getRecentPaths.mockResolvedValue(['notitie.md'])

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    // Bij een lege invoer staat het onthouden recente pad in de lijst —
    // bewijst dat getRecentPaths() daadwerkelijk in de startup-hydratie zit.
    expect(mockedIpc.getRecentPaths).toHaveBeenCalled()
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
  })

  // W7 — "Nieuwe notitie": een concept tot de eerste opslag (C5+V3).
  it('"Nieuwe notitie" opent een leeg, bewerkbaar concept', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe notitie' }))

    const content = document.querySelector('.cm-content')
    expect(content?.getAttribute('contenteditable')).toBe('true')
    expect(mockedIpc.createNote).not.toHaveBeenCalled()
  })

  it('een concept wordt bij de eerste opslag een gewone, open notitie', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.rescanVault.mockResolvedValue(eenBoom)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe notitie' }))

    // De hook zelf (create_note-aanroep, race met verder typen) is elders
    // getest — hier bewijzen we alleen dat App.tsx de overdracht (onCreated)
    // correct afhandelt: de callback die aan useDraftNote is doorgegeven,
    // rechtstreeks aangeroepen alsof de eerste opslag net gelukt is.
    const lastCall = mockedUseDraftNote.mock.calls.at(-1)?.[0]
    act(() => lastCall?.onCreated('Boodschappen.md', '# Boodschappen', 1000))

    expect(mockedIpc.recordNoteOpened).toHaveBeenCalledWith('Boodschappen.md')
    await waitFor(() => expect(mockedIpc.rescanVault).toHaveBeenCalled())
    // Exacte match: de broodkruimel toont intussen ook "Boodschappen.md",
    // dit bewijst specifiek dat de kopregel in de editor zelf staat.
    await waitFor(() => expect(screen.getByText(/^Boodschappen$/)).toBeTruthy())
    // readNote wordt hier nooit aangeroepen — de inhoud van het net
    // aangemaakte bestand is al bekend uit onCreated's argumenten.
    expect(mockedIpc.readNote).not.toHaveBeenCalled()
  })

  it('"Nieuwe notitie" sluit een open notitie-editor en de zoekvensters', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.readNote.mockResolvedValue({ content: 'bestaande inhoud', modifiedMs: 1000 })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByText(/notitie\.md/))
    await waitFor(() => expect(screen.getByText(/bestaande inhoud/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe notitie' }))

    expect(screen.queryByText(/bestaande inhoud/)).toBeNull()
  })

  // W7 — "Nieuwe map", en het rechtsklik-contextmenu op de boom.

  it('"Nieuwe map" vraagt een naam en maakt de map aan', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.createFolder.mockResolvedValue('Projecten')
    mockedIpc.rescanVault.mockResolvedValue(eenBoom)
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Projecten')

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe map' }))

    expect(promptSpy).toHaveBeenCalled()
    await waitFor(() => expect(mockedIpc.createFolder).toHaveBeenCalledWith('', 'Projecten'))
    await waitFor(() => expect(mockedIpc.rescanVault).toHaveBeenCalled())
  })

  it('"Nieuwe map" annuleren maakt niets aan', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue(null)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe map' }))

    expect(mockedIpc.createFolder).not.toHaveBeenCalled()
  })

  it('"Hernoemen" via het contextmenu hernoemt en heropent de actieve notitie op het nieuwe pad', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.readNote
      .mockResolvedValueOnce({ content: 'inhoud', modifiedMs: 1000 })
      .mockResolvedValueOnce({ content: 'inhoud', modifiedMs: 1000 })
    mockedIpc.moveNote.mockResolvedValue(undefined)
    mockedIpc.rescanVault.mockResolvedValue(eenBoom)
    vi.spyOn(window, 'prompt').mockReturnValue('Boodschappen')

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByText(/notitie\.md/))
    await waitFor(() => expect(mockedIpc.readNote).toHaveBeenCalledTimes(1))

    fireEvent.contextMenu(within(screen.getByRole('tree')).getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Hernoemen'))

    await waitFor(() =>
      expect(mockedIpc.moveNote).toHaveBeenCalledWith('notitie.md', 'Boodschappen.md'),
    )
    // De open notitie volgt naar het nieuwe pad — opnieuw gelezen, niet
    // stilzwijgend op het oude pad blijven staan.
    await waitFor(() => expect(mockedIpc.readNote).toHaveBeenCalledWith('Boodschappen.md'))
  })

  it('"Naar prullenbak" via het contextmenu sluit de actieve notitie na bevestiging', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.readNote.mockResolvedValue({ content: 'inhoud', modifiedMs: 1000 })
    mockedIpc.trashNote.mockResolvedValue(undefined)
    mockedIpc.rescanVault.mockResolvedValue(eenBoom)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByText(/notitie\.md/))
    await waitFor(() => expect(screen.getByText(/inhoud/)).toBeTruthy())

    fireEvent.contextMenu(within(screen.getByRole('tree')).getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Naar prullenbak'))

    await waitFor(() => expect(mockedIpc.trashNote).toHaveBeenCalledWith('notitie.md'))
    await waitFor(() => expect(screen.getByText('Kies een notitie in de boom.')).toBeTruthy())
  })

  it('"Naar prullenbak" annuleren via confirm() verwijdert niets', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.contextMenu(within(screen.getByRole('tree')).getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Naar prullenbak'))

    expect(mockedIpc.trashNote).not.toHaveBeenCalled()
  })

  it('"Nieuwe notitie hier" op een map opent een concept in die map', async () => {
    const boomMetMap: VaultView = {
      rootDisplay: '/tmp/vault',
      tree: {
        name: 'vault',
        relPath: '',
        kind: 'dir',
        readable: true,
        children: [
          { name: 'dagboek', relPath: 'dagboek', kind: 'dir', readable: true, children: [] },
        ],
      },
    }
    mockedIpc.restoreVault.mockResolvedValue(boomMetMap)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/dagboek/)).toBeTruthy())

    fireEvent.contextMenu(screen.getByText(/dagboek/))
    fireEvent.click(screen.getByText('Nieuwe notitie hier'))

    await waitFor(() =>
      expect(mockedUseDraftNote).toHaveBeenLastCalledWith(
        expect.objectContaining({ dir: 'dagboek' }),
      ),
    )
  })

  // W9 — de vaste eerste pagina (PRD F7).

  it('opent de vaste eerste pagina automatisch bij het starten', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue('notitie.md')
    mockedIpc.readNote.mockResolvedValue({ content: 'de startpagina-inhoud', modifiedMs: 1000 })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/de startpagina-inhoud/)).toBeTruthy())
    expect(mockedIpc.readNote).toHaveBeenCalledWith('notitie.md')
    expect(mockedIpc.recordNoteOpened).toHaveBeenCalledWith('notitie.md')
  })

  it('geen vaste eerste pagina ingesteld opent gewoon leeg, geen dialoog', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue(null)

    render(<App />)

    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())
    expect(screen.getByText('Kies een notitie in de boom.')).toBeTruthy()
    expect(mockedIpc.readNote).not.toHaveBeenCalled()
  })

  it('een verdwenen startpagina vervalt stilzwijgend, geen foutmelding', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue('weg.md')
    mockedIpc.readNote.mockRejectedValue(new Error('bestaat niet'))

    render(<App />)

    await waitFor(() => expect(screen.getByText('Kies een notitie in de boom.')).toBeTruthy())
    // Stilzwijgend (PRD F7): geen statusregel met een foutmelding, en de
    // aanwijzing wordt ingetrokken zodat een volgende start niet opnieuw
    // faalt.
    expect(screen.queryByText(/mislukt/)).toBeNull()
    await waitFor(() => expect(mockedIpc.setStartPage).toHaveBeenCalledWith(null))
  })

  it('⌘⇧H springt naar de vaste eerste pagina, ook vanuit een andere notitie', async () => {
    mockedIpc.restoreVault.mockResolvedValue({
      rootDisplay: '/tmp/vault',
      tree: {
        name: 'vault',
        relPath: '',
        kind: 'dir',
        readable: true,
        children: [
          { name: 'a.md', relPath: 'a.md', kind: 'file', readable: true, children: [] },
          { name: 'start.md', relPath: 'start.md', kind: 'file', readable: true, children: [] },
        ],
      },
    })
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue('start.md')
    mockedIpc.readNote.mockImplementation((relPath: string) =>
      Promise.resolve({ content: `inhoud van ${relPath}`, modifiedMs: 1000 }),
    )

    render(<App />)
    // De startpagina opent al bij het starten; klik naar een andere notitie.
    await waitFor(() => expect(screen.getByText(/inhoud van start\.md/)).toBeTruthy())
    fireEvent.click(screen.getByText(/a\.md/))
    await waitFor(() => expect(screen.getByText(/inhoud van a\.md/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'h', metaKey: true, shiftKey: true })

    await waitFor(() => expect(screen.getByText(/inhoud van start\.md/)).toBeTruthy())
  })

  it('⌘⇧H doet niets zonder ingestelde startpagina', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue(null)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'h', metaKey: true, shiftKey: true })

    expect(mockedIpc.readNote).not.toHaveBeenCalled()
  })

  it('"Als startpagina instellen" via het contextmenu wijst de notitie aan', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.contextMenu(within(screen.getByRole('tree')).getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Als startpagina instellen'))

    await waitFor(() => expect(mockedIpc.setStartPage).toHaveBeenCalledWith('notitie.md'))
    // Nogmaals rechtsklikken toont nu "wissen" — bewijst dat de eigen
    // React-state is bijgewerkt, niet alleen de IPC-aanroep gedaan.
    fireEvent.contextMenu(within(screen.getByRole('tree')).getByText(/notitie\.md/))
    expect(screen.getByText('Startpagina wissen')).toBeTruthy()
  })

  it('"Startpagina wissen" via het contextmenu trekt de aanwijzing in', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue('notitie.md')
    mockedIpc.readNote.mockResolvedValue({ content: 'inhoud', modifiedMs: 1000 })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/inhoud/)).toBeTruthy())

    fireEvent.contextMenu(within(screen.getByRole('tree')).getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Startpagina wissen'))

    await waitFor(() => expect(mockedIpc.setStartPage).toHaveBeenCalledWith(null))
    fireEvent.contextMenu(within(screen.getByRole('tree')).getByText(/notitie\.md/))
    expect(screen.getByText('Als startpagina instellen')).toBeTruthy()
  })

  // W10 — het instellingenscherm (PRD F6).

  it('"Instellingen" opent het instellingenscherm met de huidige vault en startpagina', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue('notitie.md')
    mockedIpc.readNote.mockResolvedValue({ content: 'inhoud', modifiedMs: 1000 })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/inhoud/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))

    const dialog = screen.getByRole('dialog', { name: 'Instellingen' })
    expect(within(dialog).getByText('/tmp/vault')).toBeTruthy()
    expect(within(dialog).getByText('notitie.md')).toBeTruthy()
  })

  it('Escape sluit het instellingenscherm', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))
    expect(screen.getByRole('dialog', { name: 'Instellingen' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('"Andere map kiezen" in Instellingen wisselt de vault en sluit het scherm', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedOpen.mockResolvedValue('/tmp/andere-vault')
    const andereBoom: VaultView = {
      rootDisplay: '/tmp/andere-vault',
      tree: { name: 'vault', relPath: '', kind: 'dir', readable: true, children: [] },
    }
    mockedIpc.openVault.mockResolvedValue(andereBoom)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Andere map kiezen' }))

    await waitFor(() => expect(mockedIpc.openVault).toHaveBeenCalledWith('/tmp/andere-vault'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // W10: het pad staat niet meer in de toolbar — heropen Instellingen om
    // te bewijzen dat de app-state écht is bijgewerkt, niet alleen dat
    // openVault is aangeroepen.
    fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))
    expect(within(screen.getByRole('dialog')).getByText('/tmp/andere-vault')).toBeTruthy()
  })

  it('"Startpagina wissen" in Instellingen roept setStartPage(null) aan', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.getStartPage.mockResolvedValue('notitie.md')
    mockedIpc.readNote.mockResolvedValue({ content: 'inhoud', modifiedMs: 1000 })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/inhoud/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Wissen' }))

    await waitFor(() => expect(mockedIpc.setStartPage).toHaveBeenCalledWith(null))
  })

  it('⌘K sluit een openstaand instellingenscherm en opent de quick switcher', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Instellingen' }))
    expect(screen.getByRole('dialog', { name: 'Instellingen' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    expect(screen.queryByRole('dialog', { name: 'Instellingen' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Snel een notitie openen' })).toBeTruthy()
  })
})
