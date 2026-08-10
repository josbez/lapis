import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { NoteEditor } from '../NoteEditor'
import { useNoteEditor, type UseNoteEditorResult } from '../useNoteEditor'
import * as ipc from '../ipc'
import * as NoteViewModule from '../NoteView'
import type { PasteImageHandler } from '../attachmentPasteHandler'

// W8 — plakken van een afbeelding: bewijst NoteEditor's orchestratie
// (eerst flushen, dan write_attachment, dan bij een migratie onNoteMoved
// aanroepen) los van CodeMirror's eigen paste-event — `NoteView` wordt
// hier gemockt om `onPasteImage` rechtstreeks te kunnen aanroepen, net
// zoals `createPasteHandler` al los van een echte editor getest is
// (attachmentPasteHandler.test.ts).
vi.mock('../useNoteEditor')
vi.mock('../ipc')
vi.mock('../NoteView')

const mockedUseNoteEditor = vi.mocked(useNoteEditor)
const mockedIpc = vi.mocked(ipc)
const mockedNoteView = vi.mocked(NoteViewModule.NoteView)

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
    flush: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function latestOnPasteImage(): PasteImageHandler {
  const lastCall = mockedNoteView.mock.calls.at(-1)
  const onPasteImage = lastCall?.[0].onPasteImage
  if (!onPasteImage) throw new Error('onPasteImage niet doorgegeven aan NoteView')
  return onPasteImage
}

describe('NoteEditor — plakken van een afbeelding', () => {
  beforeEach(() => {
    mockedNoteView.mockImplementation(() => <></>)
  })

  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('flusht eerst, schrijft dan de bijlage, en geeft de uiteindelijke naam terug', async () => {
    const flush = vi.fn().mockResolvedValue(undefined)
    mockedUseNoteEditor.mockReturnValue(stub({ flush }))
    mockedIpc.writeAttachment.mockResolvedValue({
      noteRelPath: 'a.md',
      attachmentRelPath: 'foto.png',
      noteMoved: false,
    })

    render(<NoteEditor relPath="a.md" initial={{ content: 'x', modifiedMs: 1 }} onStatus={() => {}} />)

    const result = await latestOnPasteImage()('foto.png', 'YWJj')

    expect(flush).toHaveBeenCalledTimes(1)
    expect(mockedIpc.writeAttachment).toHaveBeenCalledWith('a.md', 'foto.png', 'YWJj')
    expect(result).toBe('foto.png')
  })

  it('roept onNoteMoved aan met het nieuwe pad zodra de eerste bijlage de notitie migreert', async () => {
    mockedUseNoteEditor.mockReturnValue(stub())
    mockedIpc.writeAttachment.mockResolvedValue({
      noteRelPath: 'Notitie/Notitie.md',
      attachmentRelPath: 'Notitie/foto.png',
      noteMoved: true,
    })
    const onNoteMoved = vi.fn()

    render(
      <NoteEditor
        relPath="Notitie.md"
        initial={{ content: 'x', modifiedMs: 1 }}
        onStatus={() => {}}
        onNoteMoved={onNoteMoved}
      />,
    )

    const result = await latestOnPasteImage()('foto.png', 'YWJj')

    expect(onNoteMoved).toHaveBeenCalledWith('Notitie/Notitie.md')
    expect(result).toBe('foto.png')
  })

  it('roept onNoteMoved niet aan als de bijlage geen migratie triggerde', async () => {
    mockedUseNoteEditor.mockReturnValue(stub())
    mockedIpc.writeAttachment.mockResolvedValue({
      noteRelPath: 'Notitie/Notitie.md',
      attachmentRelPath: 'Notitie/schema.png',
      noteMoved: false,
    })
    const onNoteMoved = vi.fn()

    render(
      <NoteEditor
        relPath="Notitie/Notitie.md"
        initial={{ content: 'x', modifiedMs: 1 }}
        onStatus={() => {}}
        onNoteMoved={onNoteMoved}
      />,
    )

    await latestOnPasteImage()('schema.png', 'YWJj')

    expect(onNoteMoved).not.toHaveBeenCalled()
  })

  it('meldt de fout via onStatus en geeft null terug als het schrijven mislukt', async () => {
    mockedUseNoteEditor.mockReturnValue(stub())
    mockedIpc.writeAttachment.mockRejectedValue(new Error('schijf vol'))
    const onStatus = vi.fn()

    render(<NoteEditor relPath="a.md" initial={{ content: 'x', modifiedMs: 1 }} onStatus={onStatus} />)

    const result = await latestOnPasteImage()('foto.png', 'YWJj')

    expect(result).toBeNull()
    expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('bijlage plakken mislukt'))
  })

  it('gebruikt de laatst-hernoemde bestandsnaam uit write_attachment, niet de voorgestelde naam', async () => {
    mockedUseNoteEditor.mockReturnValue(stub())
    mockedIpc.writeAttachment.mockResolvedValue({
      noteRelPath: 'a.md',
      attachmentRelPath: 'foto 3.png',
      noteMoved: false,
    })

    render(<NoteEditor relPath="a.md" initial={{ content: 'x', modifiedMs: 1 }} onStatus={() => {}} />)

    const result = await latestOnPasteImage()('foto.png', 'YWJj')

    expect(result).toBe('foto 3.png')
  })
})
