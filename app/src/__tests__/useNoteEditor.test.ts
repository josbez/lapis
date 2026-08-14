import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useNoteEditor } from '../useNoteEditor'
import * as ipc from '../ipc'

vi.mock('../ipc')

const mockedIpc = vi.mocked(ipc)

const initial: ipc.NoteContent = { content: 'oorspronkelijke inhoud', modifiedMs: 1000 }

/** Omzeilt de 500ms-debounce: dezelfde weg als een venster dat focus verliest. */
const flushViaBlur = async () => {
  await act(async () => {
    window.dispatchEvent(new Event('blur'))
  })
}

describe('useNoteEditor', () => {
  // cleanup() ontmount ELKE gerenderde hook, ook als een test halverwege een
  // assertie faalt — zonder dit blijft een falende test zijn blur/focus-
  // listeners op `window` achter, en die vangen dan events van de vólgende
  // test op (elke test deelt dezelfde gemockte writeNote/readNote).
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  // C3 — autosave 500ms na de laatste toets.
  it('slaat 500ms na een wijziging automatisch op', async () => {
    vi.useFakeTimers()
    mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('nieuwe inhoud'))
    expect(mockedIpc.writeNote).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockedIpc.writeNote).toHaveBeenCalledWith('a.md', 'nieuwe inhoud', 1000)
    unmount()
  })

  // De debounce-timer reset bij elke nieuwe toets — alleen de laatste telt.
  it('reset de debounce bij opeenvolgende wijzigingen', () => {
    vi.useFakeTimers()
    mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('eerste tussenstap'))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => result.current.handleMarkdownChange('definitieve inhoud'))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockedIpc.writeNote).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(mockedIpc.writeNote).toHaveBeenCalledTimes(1)
    expect(mockedIpc.writeNote).toHaveBeenCalledWith('a.md', 'definitieve inhoud', 1000)
    unmount()
  })

  it('slaat niet op als de inhoud gelijk blijft aan de baseline', () => {
    vi.useFakeTimers()
    const onStatus = vi.fn()
    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    // CodeMirror roept onMarkdownChange ook bij mount aan, met de
    // ongewijzigde inhoud.
    act(() => result.current.handleMarkdownChange(initial.content))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockedIpc.writeNote).not.toHaveBeenCalled()
    unmount()
  })

  // ⌘S: direct opslaan, geen 500ms wachten.
  it('⌘S slaat direct op, zonder debounce', () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('via cmd-s opgeslagen'))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    })

    expect(mockedIpc.writeNote).toHaveBeenCalledWith('a.md', 'via cmd-s opgeslagen', 1000)
    unmount()
  })

  it('venster-blur slaat direct op', () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('typend, dan wegtabben'))
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(mockedIpc.writeNote).toHaveBeenCalledWith('a.md', 'typend, dan wegtabben', 1000)
    unmount()
  })

  it('een conflict blokkeert de editor en meldt de status, zonder te overschrijven', async () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'conflict' })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('mijn wijziging'))
    await flushViaBlur()

    await waitFor(() => expect(result.current.conflict).toEqual({ mine: 'mijn wijziging' }))
    expect(result.current.readOnly).toBe(true)
    expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('extern gewijzigd'))
    unmount()
  })

  it('verdere wijzigingen worden niet automatisch opgeslagen tijdens een conflict', async () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'conflict' })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('mijn wijziging'))
    await flushViaBlur()
    await waitFor(() => expect(result.current.conflict).not.toBeNull())

    mockedIpc.writeNote.mockClear()
    act(() => result.current.handleMarkdownChange('nog een wijziging, terwijl geblokkeerd'))
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(mockedIpc.writeNote).not.toHaveBeenCalled()
    unmount()
  })

  it('"mijn versie behouden" forceert het schrijven en heft het conflict op', async () => {
    mockedIpc.writeNote
      .mockResolvedValueOnce({ kind: 'conflict' })
      .mockResolvedValueOnce({ kind: 'saved', modifiedMs: 3000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('mijn wijziging'))
    await flushViaBlur()
    await waitFor(() => expect(result.current.conflict).not.toBeNull())

    act(() => result.current.keepMine())

    expect(mockedIpc.writeNote).toHaveBeenLastCalledWith('a.md', 'mijn wijziging', null)
    await waitFor(() => expect(result.current.conflict).toBeNull())
    unmount()
  })

  it('"hun versie laden" vraagt bevestiging en herlaadt pas na akkoord', async () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'conflict' })
    mockedIpc.readNote.mockResolvedValue({ content: 'externe inhoud', modifiedMs: 4000 })
    const onStatus = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('mijn wijziging'))
    await flushViaBlur()
    await waitFor(() => expect(result.current.conflict).not.toBeNull())

    act(() => result.current.loadTheirs())
    expect(mockedIpc.readNote).not.toHaveBeenCalled()
    expect(result.current.conflict).not.toBeNull()

    confirmSpy.mockReturnValue(true)
    act(() => result.current.loadTheirs())

    expect(mockedIpc.readNote).toHaveBeenCalledWith('a.md')
    await waitFor(() => expect(result.current.markdownSource).toBe('externe inhoud'))
    expect(result.current.conflict).toBeNull()
    unmount()
  })

  it('"beide bewaren" schrijft een kopie, herlaadt het origineel, en meldt het', async () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'conflict' })
    mockedIpc.writeNoteAsCopy.mockResolvedValue('a (conflict).md')
    mockedIpc.readNote.mockResolvedValue({ content: 'externe inhoud', modifiedMs: 5000 })
    const onStatus = vi.fn()
    const onCopySaved = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus, onCopySaved }),
    )

    act(() => result.current.handleMarkdownChange('mijn wijziging'))
    await flushViaBlur()
    await waitFor(() => expect(result.current.conflict).not.toBeNull())

    act(() => result.current.keepBoth())

    expect(mockedIpc.writeNoteAsCopy).toHaveBeenCalledWith('a.md', 'mijn wijziging')
    await waitFor(() => expect(onCopySaved).toHaveBeenCalled())
    expect(result.current.markdownSource).toBe('externe inhoud')
    expect(result.current.conflict).toBeNull()
    unmount()
  })

  // PRD F3-acceptatie: getypte tekst gaat nooit verloren zonder een keuze.
  it('slaat bij het ontmounten alsnog op wat nog niet op schijf stond', () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('nog niet opgeslagen'))
    unmount()

    expect(mockedIpc.writeNote).toHaveBeenCalledWith('a.md', 'nog niet opgeslagen', 1000)
  })

  it('venster-focus herlaadt stil als er niets lokaal gewijzigd is (C4)', async () => {
    mockedIpc.readNote.mockResolvedValue({ content: 'extern bijgewerkt', modifiedMs: 6000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => expect(result.current.markdownSource).toBe('extern bijgewerkt'))
    expect(result.current.conflict).toBeNull()
    unmount()
  })

  it('venster-focus met lokale wijzigingen toont een conflict in plaats van te overschrijven', async () => {
    mockedIpc.readNote.mockResolvedValue({ content: 'extern bijgewerkt', modifiedMs: 6000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('lokale, nog niet opgeslagen wijziging'))
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() =>
      expect(result.current.conflict).toEqual({
        mine: 'lokale, nog niet opgeslagen wijziging',
      }),
    )
    expect(result.current.markdownSource).toBe(initial.content)
    unmount()
  })

  // W8 — flush() wordt gebruikt vóór het plakken van een bijlage, en moet
  // dus daadwerkelijk op de afronding van het schrijven wachten, niet
  // fire-and-forget zijn.
  it('flush() is awaitable en rondt pas af nadat het schrijven klaar is', async () => {
    mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
    const onStatus = vi.fn()

    const { result, unmount } = renderHook(() =>
      useNoteEditor({ relPath: 'a.md', initial, onStatus }),
    )

    act(() => result.current.handleMarkdownChange('nog niet opgeslagen'))
    await act(async () => {
      await result.current.flush()
    })

    expect(mockedIpc.writeNote).toHaveBeenCalledWith('a.md', 'nog niet opgeslagen', 1000)
    expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('opgeslagen'))
    unmount()
  })

  // W8 — write_attachment kan `relPath` laten wijzigen (migratie naar een
  // eigen map) zonder dat de hook ontmount: NoteEditor blijft gemonteerd,
  // App.tsx werkt alleen `selectedPath` bij. `documentId` moet dan NIET
  // veranderen (dat zou de editor onnodig laten remounten, cursor/undo
  // kwijt) en de bestaande "flush bij ontmounten"-cleanup mag niet alsnog
  // naar het oude (inmiddels verplaatste) pad schrijven.
  describe('een relPath-wijziging zonder ontmounten (W8-migratie)', () => {
    it('documentId blijft gelijk, ook al verandert relPath', () => {
      const onStatus = vi.fn()
      const { result, rerender, unmount } = renderHook(
        ({ relPath }) => useNoteEditor({ relPath, initial, onStatus }),
        { initialProps: { relPath: 'a.md' } },
      )

      const before = result.current.documentId
      rerender({ relPath: 'Notitie/a.md' })

      expect(result.current.documentId).toBe(before)
      unmount()
    })

    it('schrijft niet meteen naar het oude pad zodra relPath wijzigt', () => {
      mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
      const onStatus = vi.fn()
      const { result, rerender, unmount } = renderHook(
        ({ relPath }) => useNoteEditor({ relPath, initial, onStatus }),
        { initialProps: { relPath: 'a.md' } },
      )

      act(() => result.current.handleMarkdownChange('getypt vlak vóór de migratie'))
      rerender({ relPath: 'Notitie/a.md' })

      // Vóór de W8-fix zou dit de "flush bij ontmounten"-cleanup triggeren
      // met de oude (inmiddels niet meer bestaande) relPath.
      expect(mockedIpc.writeNote).not.toHaveBeenCalled()
      unmount()
    })

    it('een volgende autosave gaat naar het nieuwe pad', () => {
      mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
      const onStatus = vi.fn()
      const { result, rerender, unmount } = renderHook(
        ({ relPath }) => useNoteEditor({ relPath, initial, onStatus }),
        { initialProps: { relPath: 'a.md' } },
      )

      rerender({ relPath: 'Notitie/a.md' })
      act(() => result.current.handleMarkdownChange('na de migratie getypt'))
      act(() => {
        window.dispatchEvent(new Event('blur'))
      })

      expect(mockedIpc.writeNote).toHaveBeenCalledWith('Notitie/a.md', 'na de migratie getypt', 1000)
      unmount()
    })

    it('ontmounten ná een relPath-wijziging flusht naar het huidige (nieuwe) pad', () => {
      mockedIpc.writeNote.mockResolvedValue({ kind: 'saved', modifiedMs: 2000 })
      const onStatus = vi.fn()
      const { result, rerender, unmount } = renderHook(
        ({ relPath }) => useNoteEditor({ relPath, initial, onStatus }),
        { initialProps: { relPath: 'a.md' } },
      )

      rerender({ relPath: 'Notitie/a.md' })
      act(() => result.current.handleMarkdownChange('nog niet opgeslagen, na migratie'))
      unmount()

      expect(mockedIpc.writeNote).toHaveBeenCalledWith(
        'Notitie/a.md',
        'nog niet opgeslagen, na migratie',
        1000,
      )
      expect(mockedIpc.writeNote).not.toHaveBeenCalledWith('a.md', expect.anything(), expect.anything())
    })
  })
})
