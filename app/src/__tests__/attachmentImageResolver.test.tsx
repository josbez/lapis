import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { NoteView } from '../NoteView'
import * as ipc from '../ipc'

// W8 — inline afbeeldingweergave. `readAttachment` is de enige IPC-aanroep
// die hierbij komt kijken; de rest van de editor is al elders getest.
vi.mock('../ipc')

const mockedIpc = vi.mocked(ipc)

describe('attachmentImageResolver', () => {
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('herschrijft een relatieve afbeeldingsbron naar een blob-URL via read_attachment', async () => {
    mockedIpc.readAttachment.mockResolvedValue(btoa('pngbytes'))

    const { container } = render(
      <NoteView documentId="a" notePath="notitie.md" markdownSource="![een foto](foto.png)" />,
    )

    await waitFor(() => {
      const img = container.querySelector('.cm-atomic-image img')
      expect(img?.getAttribute('src')).toMatch(/^blob:/)
    })

    expect(mockedIpc.readAttachment).toHaveBeenCalledWith('notitie.md', 'foto.png')
  })

  it('laat een externe (http) afbeeldingsbron ongemoeid', async () => {
    const { container } = render(
      <NoteView
        documentId="b"
        notePath="notitie.md"
        markdownSource="![extern](https://example.com/foto.png)"
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('.cm-atomic-image img')).not.toBeNull()
    })

    expect(mockedIpc.readAttachment).not.toHaveBeenCalled()
    expect(container.querySelector('.cm-atomic-image img')?.getAttribute('src')).toBe(
      'https://example.com/foto.png',
    )
  })

  it('doet niets zonder notePath (concept-notitie vóór de eerste opslag)', async () => {
    const { container } = render(
      <NoteView documentId="c" notePath={null} markdownSource="![een foto](foto.png)" />,
    )

    await waitFor(() => {
      expect(container.querySelector('.cm-atomic-image img')).not.toBeNull()
    })

    expect(mockedIpc.readAttachment).not.toHaveBeenCalled()
  })

  it('een niet-gevonden bijlage laat de afbeelding gewoon gebroken, geen fout', async () => {
    mockedIpc.readAttachment.mockRejectedValue(new Error('bestand of map niet gevonden'))

    const { container } = render(
      <NoteView documentId="d" notePath="notitie.md" markdownSource="![weg](spook.png)" />,
    )

    await waitFor(() => expect(mockedIpc.readAttachment).toHaveBeenCalled())
    // Geen crash, de src blijft de onopgeloste string — dat is de eerlijke,
    // door de browser als kapotte afbeelding getoonde staat.
    expect(container.querySelector('.cm-atomic-image img')?.getAttribute('src')).toBe('spook.png')
  })
})
