import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { NoteEditor } from '../NoteEditor'
import { useNoteEditor, type UseNoteEditorResult } from '../useNoteEditor'

vi.mock('../useNoteEditor')

const mockedUseNoteEditor = vi.mocked(useNoteEditor)

function stub(overrides: Partial<UseNoteEditorResult> = {}): UseNoteEditorResult {
  return {
    documentId: 'a.md::0',
    markdownSource: 'inhoud',
    readOnly: false,
    conflict: null,
    handleMarkdownChange: vi.fn(),
    keepMine: vi.fn(),
    loadTheirs: vi.fn(),
    keepBoth: vi.fn(),
    ...overrides,
  }
}

/**
 * Deze tests bewijzen de wiring van NoteEditor naar useNoteEditor — de
 * hook zelf (autosave, debounce, focusmodel, conflictlogica) is al
 * uitputtend getest in useNoteEditor.test.ts, zonder CodeMirror te hoeven
 * mounten.
 */
describe('NoteEditor', () => {
  afterEach(() => {
    cleanup()
  })

  it('toont geen conflictbalk zolang er geen conflict is', () => {
    mockedUseNoteEditor.mockReturnValue(stub())

    render(<NoteEditor relPath="a.md" initial={{ content: 'x', modifiedMs: 1 }} onStatus={() => {}} />)

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('toont de conflictbalk met drie knoppen zodra er een conflict is', () => {
    mockedUseNoteEditor.mockReturnValue(stub({ conflict: { mine: 'mijn tekst' }, readOnly: true }))

    render(<NoteEditor relPath="a.md" initial={{ content: 'x', modifiedMs: 1 }} onStatus={() => {}} />)

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Mijn versie behouden')).toBeTruthy()
    expect(screen.getByText('Hun versie laden')).toBeTruthy()
    expect(screen.getByText('Beide bewaren')).toBeTruthy()
  })

  it('de drie knoppen roepen de bijbehorende hook-functies aan', () => {
    const keepMine = vi.fn()
    const loadTheirs = vi.fn()
    const keepBoth = vi.fn()
    mockedUseNoteEditor.mockReturnValue(
      stub({ conflict: { mine: 'x' }, readOnly: true, keepMine, loadTheirs, keepBoth }),
    )

    render(<NoteEditor relPath="a.md" initial={{ content: 'x', modifiedMs: 1 }} onStatus={() => {}} />)

    fireEvent.click(screen.getByText('Mijn versie behouden'))
    fireEvent.click(screen.getByText('Hun versie laden'))
    fireEvent.click(screen.getByText('Beide bewaren'))

    expect(keepMine).toHaveBeenCalledTimes(1)
    expect(loadTheirs).toHaveBeenCalledTimes(1)
    expect(keepBoth).toHaveBeenCalledTimes(1)
  })

  it('geeft relPath, initial en de callbacks door aan de hook', () => {
    mockedUseNoteEditor.mockReturnValue(stub())
    const onStatus = vi.fn()
    const onCopySaved = vi.fn()
    const initial = { content: 'x', modifiedMs: 1 }

    render(<NoteEditor relPath="a.md" initial={initial} onStatus={onStatus} onCopySaved={onCopySaved} />)

    expect(mockedUseNoteEditor).toHaveBeenCalledWith({
      relPath: 'a.md',
      initial,
      onStatus,
      onCopySaved,
    })
  })
})
