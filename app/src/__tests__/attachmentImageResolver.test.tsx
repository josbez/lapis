import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { NoteView } from '../NoteView'
import { markdownImageRef } from '../attachmentPasteHandler'
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

  // Backlog #3: een geplakte afbeelding met een spatie in de naam werd
  // `![](Geplakte afbeelding 1.png)` — geen geldige markdown-afbeelding, dus
  // platte tekst. Wat de paste-handler invoegt, moet de editor weer als
  // afbeelding herkennen én naar de echte bestandsnaam terugvertalen.
  it('wat de paste-handler invoegt voor een naam met spaties en haakjes, wordt een afbeelding', async () => {
    mockedIpc.readAttachment.mockResolvedValue(btoa('pngbytes'))
    const naam = "Geplakte afbeelding 1 (café's 100%).png"

    const { container } = render(
      <NoteView documentId="a" notePath="notitie.md" markdownSource={`![](${markdownImageRef(naam)})`} />,
    )

    await waitFor(() => expect(mockedIpc.readAttachment).toHaveBeenCalledWith('notitie.md', naam))
    expect(container.querySelector('.cm-atomic-image img')).not.toBeNull()
  })

  it('codeert alleen wat de link breekt: accenten blijven leesbaar', () => {
    expect(markdownImageRef('foto café.png')).toBe('foto%20café.png')
  })

  // Obsidian schrijft zelf ook `%20` in markdown-links; die bestaande
  // notities profiteren van dezelfde terugvertaling.
  it('decodeert %20 in een bestaande link uit Obsidian', async () => {
    mockedIpc.readAttachment.mockResolvedValue(btoa('pngbytes'))

    render(<NoteView documentId="a" notePath="notitie.md" markdownSource="![](mijn%20foto.png)" />)

    await waitFor(() => expect(mockedIpc.readAttachment).toHaveBeenCalledWith('notitie.md', 'mijn foto.png'))
  })
})
