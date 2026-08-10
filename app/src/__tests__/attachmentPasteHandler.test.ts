import { describe, expect, it, vi } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { createPasteHandler, type PasteImageHandler } from '../attachmentPasteHandler'

// W8 — plakken van een afbeelding. Getest zonder een echte CM6-editor te
// monteren (zelfde reden als useNoteEditor.test.ts): een minimale
// nep-`view`/`event` is genoeg om de kale handler-logica te bewijzen.

function fakeEvent(items: { type: string; file: File | null }[]): ClipboardEvent {
  return {
    clipboardData: {
      items: items.map((it) => ({
        type: it.type,
        getAsFile: () => it.file,
      })),
    },
    preventDefault: vi.fn(),
  } as unknown as ClipboardEvent
}

function fakeView(head: number, docLength = head) {
  const dispatch = vi.fn()
  const view = {
    state: {
      selection: { main: { head } },
      doc: { length: docLength },
    },
    dispatch,
  } as unknown as EditorView
  return { view, dispatch }
}

function pngFile(bytes: number[], name = 'foto.png'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' })
}

describe('createPasteHandler', () => {
  it('laat tekst-only plakken ongemoeid', () => {
    const onPasteImage = vi.fn()
    const handler = createPasteHandler({ current: onPasteImage })
    const event = fakeEvent([{ type: 'text/plain', file: null }])
    const { view } = fakeView(3)

    const handled = handler(event, view)

    expect(handled).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(onPasteImage).not.toHaveBeenCalled()
  })

  it('doet niets zonder onPasteImage (bijv. concept-notitie)', () => {
    const handler = createPasteHandler({ current: undefined })
    const event = fakeEvent([{ type: 'image/png', file: pngFile([1, 2, 3]) }])
    const { view, dispatch } = fakeView(0)

    const handled = handler(event, view)

    expect(handled).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('slaat een geplakte afbeelding op en voegt de markdown-link in op de cursor', async () => {
    const onPasteImage: PasteImageHandler = vi.fn().mockResolvedValue('foto.png')
    const handler = createPasteHandler({ current: onPasteImage })
    const event = fakeEvent([{ type: 'image/png', file: pngFile([1, 2, 3]) }])
    const { view, dispatch } = fakeView(5, 5)

    const handled = handler(event, view)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()

    await vi.waitFor(() => expect(dispatch).toHaveBeenCalled())

    expect(onPasteImage).toHaveBeenCalledWith('foto.png', expect.any(String))
    const [, bytesBase64] = (onPasteImage as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    expect(Array.from(atob(bytesBase64)).map((c) => c.charCodeAt(0))).toEqual([1, 2, 3])

    expect(dispatch).toHaveBeenCalledWith({
      changes: { from: 5, to: 5, insert: '![](foto.png)' },
      selection: { anchor: 5 + '![](foto.png)'.length },
    })
  })

  it('gebruikt de uiteindelijke (mogelijk botsingsvrij hernoemde) naam van onPasteImage', async () => {
    const onPasteImage: PasteImageHandler = vi.fn().mockResolvedValue('foto 2.png')
    const handler = createPasteHandler({ current: onPasteImage })
    const event = fakeEvent([{ type: 'image/png', file: pngFile([1], 'foto.png') }])
    const { view, dispatch } = fakeView(0)

    handler(event, view)

    await vi.waitFor(() => expect(dispatch).toHaveBeenCalled())
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { from: 0, to: 0, insert: '![](foto 2.png)' } }),
    )
  })

  it('voegt niets in als het opslaan van de bijlage mislukt', async () => {
    const onPasteImage: PasteImageHandler = vi.fn().mockResolvedValue(null)
    const handler = createPasteHandler({ current: onPasteImage })
    const event = fakeEvent([{ type: 'image/png', file: pngFile([1]) }])
    const { view, dispatch } = fakeView(0)

    handler(event, view)

    await vi.waitFor(() => expect(onPasteImage).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('bedenkt een naam als het geplakte bestand er zelf geen heeft', async () => {
    const onPasteImage: PasteImageHandler = vi.fn().mockResolvedValue('iets.png')
    const handler = createPasteHandler({ current: onPasteImage })
    // Een clipboard-item zonder bestandsnaam heeft in de praktijk name === ''.
    const file = new File([new Uint8Array([1])], '', { type: 'image/png' })
    const event = fakeEvent([{ type: 'image/png', file }])
    const { view } = fakeView(0)

    handler(event, view)

    await vi.waitFor(() => expect(onPasteImage).toHaveBeenCalled())
    const [[filename]] = (onPasteImage as ReturnType<typeof vi.fn>).mock.calls
    expect(filename).toMatch(/^Geplakte afbeelding \d+\.png$/)
  })
})
