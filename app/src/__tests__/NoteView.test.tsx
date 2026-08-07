import { afterEach, describe, expect, it } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { NoteView } from '../NoteView'

/**
 * W2 — alleen-lezen. `readOnly` is een prop van atomic-editor zelf; deze
 * test bewijst dat 'm ook echt aanstaat, niet alleen dat 'm is meegegeven.
 */
describe('NoteView', () => {
  afterEach(() => {
    cleanup()
  })

  it('toont de opgemaakte inhoud', () => {
    const { container } = render(
      <NoteView documentId="a" markdownSource={'# Kop\n\nEen paragraaf met tekst.'} />,
    )
    expect(container.textContent).toContain('Kop')
    expect(container.textContent).toContain('Een paragraaf met tekst.')
  })

  it('is niet bewerkbaar', () => {
    const { container } = render(<NoteView documentId="b" markdownSource={'gewone tekst'} />)
    const content = container.querySelector('.cm-content')
    expect(content).not.toBeNull()
    expect(content?.getAttribute('contenteditable')).toBe('false')
    expect(content?.getAttribute('aria-readonly')).toBe('true')
  })

  it('een ander documentId mount de editor opnieuw op de nieuwe inhoud', () => {
    const { container, rerender } = render(
      <NoteView documentId="c" markdownSource={'eerste notitie'} />,
    )
    expect(container.textContent).toContain('eerste notitie')

    rerender(<NoteView documentId="d" markdownSource={'tweede notitie'} />)
    expect(container.textContent).toContain('tweede notitie')
    expect(container.textContent).not.toContain('eerste notitie')
  })
})
