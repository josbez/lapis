import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useDraftNote } from '../useDraftNote'
import * as ipc from '../ipc'

vi.mock('../ipc')

const mockedIpc = vi.mocked(ipc)

describe('useDraftNote', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('maakt niets aan zolang er niets getypt is', () => {
    const onStatus = vi.fn()
    const onCreated = vi.fn()
    const { unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    expect(mockedIpc.createNote).not.toHaveBeenCalled()
    unmount()
    expect(mockedIpc.createNote).not.toHaveBeenCalled()
  })

  // C5+V3: de bestandsnaam komt uit de kopregel op het moment van de eerste
  // opslag — hier is dat 500ms na de laatste toets, dezelfde debounce als
  // een bestaande notitie.
  it('slaat 500ms na de eerste wijziging op via create_note', () => {
    vi.useFakeTimers()
    mockedIpc.createNote.mockResolvedValue({ relPath: 'Boodschappen.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('# Boodschappen'))
    expect(mockedIpc.createNote).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockedIpc.createNote).toHaveBeenCalledWith('', '# Boodschappen')
    unmount()
  })

  it('roept onCreated aan met het aangemaakte pad, de inhoud en de mtime', async () => {
    mockedIpc.createNote.mockResolvedValue({ relPath: 'Boodschappen.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('# Boodschappen'))
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith('Boodschappen.md', '# Boodschappen', 1000),
    )
    unmount()
  })

  it('⌘S maakt direct aan, zonder debounce', () => {
    mockedIpc.createNote.mockResolvedValue({ relPath: 'Untitled.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('zonder kopregel'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    })

    expect(mockedIpc.createNote).toHaveBeenCalledWith('', 'zonder kopregel')
    unmount()
  })

  it('venster-blur maakt direct aan', () => {
    mockedIpc.createNote.mockResolvedValue({ relPath: 'Untitled.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('typend, dan wegtabben'))
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(mockedIpc.createNote).toHaveBeenCalledWith('', 'typend, dan wegtabben')
    unmount()
  })

  it('maakt hoogstens één keer aan, ook bij meerdere triggers vlak na elkaar', () => {
    mockedIpc.createNote.mockResolvedValue({ relPath: 'Untitled.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('inhoud'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    })
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(mockedIpc.createNote).toHaveBeenCalledTimes(1)
    unmount()
  })

  // De IPC-rondgang van create_note kost tijd, en typen stopt daar niet
  // voor: wat er in die tussentijd bijkomt mag niet stilzwijgend verdwijnen.
  it('schrijft tekst die getypt is tijdens de create_note-aanroep alsnog bij', async () => {
    let resolveCreate!: (v: ipc.CreatedNote) => void
    mockedIpc.createNote.mockImplementation(() => new Promise((r) => (resolveCreate = r)))
    mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('# Titel'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    })
    // Getypt terwijl create_note nog onderweg is.
    act(() => result.current.handleMarkdownChange('# Titel\n\nen meer'))

    act(() => resolveCreate({ relPath: 'Titel.md', modifiedMs: 1000 }))

    await waitFor(() =>
      expect(mockedIpc.writeNote).toHaveBeenCalledWith('Titel.md', '# Titel\n\nen meer', 1000),
    )
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith('Titel.md', '# Titel\n\nen meer', 2000),
    )
    unmount()
  })

  it('ontmonten zonder getypte tekst maakt geen bestand aan', () => {
    const onStatus = vi.fn()
    const onCreated = vi.fn()
    const { unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    unmount()

    expect(mockedIpc.createNote).not.toHaveBeenCalled()
  })

  // Zelfde principe als useNoteEditor: getypte tekst gaat nooit verloren
  // zonder een keuze — ook niet als je wegnavigeert vóór de debounce afloopt.
  it('ontmonten met nog niet opgeslagen tekst maakt het bestand alsnog aan', () => {
    mockedIpc.createNote.mockResolvedValue({ relPath: 'Untitled.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('nog niet opgeslagen'))
    unmount()

    expect(mockedIpc.createNote).toHaveBeenCalledWith('', 'nog niet opgeslagen')
  })

  it('een mislukte aanmaak meldt de status en staat een nieuwe poging toe', async () => {
    mockedIpc.createNote
      .mockRejectedValueOnce(new Error('kapot'))
      .mockResolvedValueOnce({ relPath: 'Untitled.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() => useDraftNote({ dir: '', onCreated, onStatus }))

    act(() => result.current.handleMarkdownChange('inhoud'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    })

    await waitFor(() =>
      expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('nieuwe notitie aanmaken mislukt')),
    )

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    })

    await waitFor(() => expect(mockedIpc.createNote).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('Untitled.md', 'inhoud', 1000))
    unmount()
  })

  it('geeft dir door aan create_note', () => {
    mockedIpc.createNote.mockResolvedValue({ relPath: 'dagboek/Vandaag.md', modifiedMs: 1000 })
    const onStatus = vi.fn()
    const onCreated = vi.fn()

    const { result, unmount } = renderHook(() =>
      useDraftNote({ dir: 'dagboek', onCreated, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('# Vandaag'))
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(mockedIpc.createNote).toHaveBeenCalledWith('dagboek', '# Vandaag')
    unmount()
  })
})
