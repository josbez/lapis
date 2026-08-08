import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import App from '../App'
import * as ipc from '../ipc'
import type { VaultView } from '../ipc'

vi.mock('../ipc')
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

const mockedIpc = vi.mocked(ipc)

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

    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())
    expect(screen.getByText(/\/tmp\/vault/)).toBeTruthy()
  })

  it('sidebar verbergen haalt de boom uit beeld en onthoudt de stand', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.setSidebarVisible.mockResolvedValue(undefined)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByText('Sidebar verbergen'))
    await waitFor(() => expect(screen.queryByText(/notitie\.md/)).toBeNull())
    expect(mockedIpc.setSidebarVisible).toHaveBeenCalledWith(false)

    // De boom-data blijft intact — verbergen is CSS-state, geen her-fetch
    // (Spec §5.6).
    fireEvent.click(screen.getByText('Sidebar tonen'))
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())
    expect(mockedIpc.rescanVault).not.toHaveBeenCalled()
  })

  it('start verborgen als app-state dat zo onthouden had', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(false)

    render(<App />)

    await waitFor(() => expect(screen.getByText('Sidebar tonen')).toBeTruthy())
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
})
