import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { NoteDraft } from '../NoteDraft'
import { useDraftNote, type UseDraftNoteResult } from '../useDraftNote'

vi.mock('../useDraftNote')

const mockedUseDraftNote = vi.mocked(useDraftNote)

function stub(overrides: Partial<UseDraftNoteResult> = {}): UseDraftNoteResult {
  return {
    content: '',
    handleMarkdownChange: vi.fn(),
    ...overrides,
  }
}

/**
 * Zoals NoteEditor.test.tsx: bewijst de wiring van NoteDraft naar
 * useDraftNote — de hook zelf (debounce, ⌘S, blur, de race met
 * create_note) is al uitputtend getest in useDraftNote.test.ts.
 */
describe('NoteDraft', () => {
  afterEach(() => {
    cleanup()
  })

  it('geeft dir, onCreated en onStatus door aan de hook', () => {
    mockedUseDraftNote.mockReturnValue(stub())
    const onCreated = vi.fn()
    const onStatus = vi.fn()

    render(<NoteDraft dir="dagboek" onCreated={onCreated} onStatus={onStatus} />)

    expect(mockedUseDraftNote).toHaveBeenCalledWith({ dir: 'dagboek', onCreated, onStatus })
  })

  it('toont de hook-inhoud bewerkbaar', () => {
    mockedUseDraftNote.mockReturnValue(stub({ content: '# Een concept' }))

    render(<NoteDraft dir="" onCreated={() => {}} onStatus={() => {}} />)

    expect(screen.getByText(/Een concept/)).toBeTruthy()
    const content = document.querySelector('.cm-content')
    expect(content?.getAttribute('contenteditable')).toBe('true')
  })
})
