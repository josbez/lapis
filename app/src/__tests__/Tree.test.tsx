import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Tree, type TreeActions } from '../Tree'
import type { TreeNode } from '../ipc'

function dir(name: string, relPath: string, children: TreeNode[] = [], readable = true): TreeNode {
  return { name, relPath, kind: 'dir', readable, children }
}
function file(name: string, relPath: string): TreeNode {
  return { name, relPath, kind: 'file', readable: true, children: [] }
}

function actionsStub(overrides: Partial<TreeActions> = {}): TreeActions {
  return {
    onRenameFile: vi.fn(),
    onMoveFile: vi.fn(),
    onTrashFile: vi.fn(),
    onNewNoteInDir: vi.fn(),
    onNewFolderInDir: vi.fn(),
    onSetStartPage: vi.fn(),
    onClearStartPage: vi.fn(),
    ...overrides,
  }
}

describe('Tree', () => {
  afterEach(() => {
    cleanup()
  })

  it('toont alleen de topniveau-kinderen totdat je uitklapt', () => {
    const root = dir('vault', '', [
      dir('sub', 'sub', [file('binnen.md', 'sub/binnen.md')]),
      file('boven.md', 'boven.md'),
    ])
    render(<Tree root={root} selectedPath={null} startPage={null} onSelectFile={() => {}} actions={actionsStub()} />)

    expect(screen.getByText(/sub/)).toBeTruthy()
    expect(screen.getByText(/boven\.md/)).toBeTruthy()
    expect(screen.queryByText(/binnen\.md/)).toBeNull()
  })

  it('klikken op een map klapt uit, nogmaals klikken klapt in', () => {
    const root = dir('vault', '', [dir('sub', 'sub', [file('binnen.md', 'sub/binnen.md')])])
    render(<Tree root={root} selectedPath={null} startPage={null} onSelectFile={() => {}} actions={actionsStub()} />)

    const subKnop = screen.getByText(/sub/)
    fireEvent.click(subKnop)
    expect(screen.getByText(/binnen\.md/)).toBeTruthy()

    fireEvent.click(subKnop)
    expect(screen.queryByText(/binnen\.md/)).toBeNull()
  })

  it('klikken op een bestand zet de selectie, roept geen IPC aan', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    const onSelectFile = vi.fn()
    render(
      <Tree root={root} selectedPath={null} startPage={null} onSelectFile={onSelectFile} actions={actionsStub()} />,
    )

    fireEvent.click(screen.getByText(/notitie\.md/))
    expect(onSelectFile).toHaveBeenCalledTimes(1)
    expect(onSelectFile).toHaveBeenCalledWith('notitie.md')
  })

  it('markeert een onleesbare map (Spec §5.3, punt 5)', () => {
    const root = dir('vault', '', [dir('geheim', 'geheim', [], false)])
    render(<Tree root={root} selectedPath={null} startPage={null} onSelectFile={() => {}} actions={actionsStub()} />)
    expect(screen.getByText(/geen toegang/)).toBeTruthy()
  })

  // W7 — rechtsklik-contextmenu.

  it('rechtsklik op een bestand toont hernoemen/verplaatsen/prullenbak', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    render(<Tree root={root} selectedPath={null} startPage={null} onSelectFile={() => {}} actions={actionsStub()} />)

    fireEvent.contextMenu(screen.getByText(/notitie\.md/))

    expect(screen.getByRole('menu')).toBeTruthy()
    expect(screen.getByText('Hernoemen')).toBeTruthy()
    expect(screen.getByText('Verplaatsen naar…')).toBeTruthy()
    expect(screen.getByText('Naar prullenbak')).toBeTruthy()
  })

  it('rechtsklik op een map toont nieuwe notitie/nieuwe map hier', () => {
    const root = dir('vault', '', [dir('sub', 'sub')])
    render(<Tree root={root} selectedPath={null} startPage={null} onSelectFile={() => {}} actions={actionsStub()} />)

    fireEvent.contextMenu(screen.getByText(/sub/))

    expect(screen.getByText('Nieuwe notitie hier')).toBeTruthy()
    expect(screen.getByText('Nieuwe map hier')).toBeTruthy()
  })

  it('"Hernoemen" roept onRenameFile aan met het pad van het bestand', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    const onRenameFile = vi.fn()
    render(
      <Tree
        root={root}
        selectedPath={null}
        startPage={null}
        onSelectFile={() => {}}
        actions={actionsStub({ onRenameFile })}
      />,
    )

    fireEvent.contextMenu(screen.getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Hernoemen'))

    expect(onRenameFile).toHaveBeenCalledWith('notitie.md')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('"Nieuwe notitie hier" roept onNewNoteInDir aan met het pad van de map', () => {
    const root = dir('vault', '', [dir('projecten', 'projecten')])
    const onNewNoteInDir = vi.fn()
    render(
      <Tree
        root={root}
        selectedPath={null}
        startPage={null}
        onSelectFile={() => {}}
        actions={actionsStub({ onNewNoteInDir })}
      />,
    )

    fireEvent.contextMenu(screen.getByText(/projecten/))
    fireEvent.click(screen.getByText('Nieuwe notitie hier'))

    expect(onNewNoteInDir).toHaveBeenCalledWith('projecten')
  })

  // W9 — de vaste eerste pagina.

  it('rechtsklik op een bestand dat geen startpagina is toont "Als startpagina instellen"', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    render(
      <Tree root={root} selectedPath={null} startPage={null} onSelectFile={() => {}} actions={actionsStub()} />,
    )

    fireEvent.contextMenu(screen.getByText(/notitie\.md/))

    expect(screen.getByText('Als startpagina instellen')).toBeTruthy()
    expect(screen.queryByText('Startpagina wissen')).toBeNull()
  })

  it('rechtsklik op de huidige startpagina toont "Startpagina wissen" in plaats daarvan', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    render(
      <Tree
        root={root}
        selectedPath={null}
        startPage="notitie.md"
        onSelectFile={() => {}}
        actions={actionsStub()}
      />,
    )

    fireEvent.contextMenu(screen.getByText(/notitie\.md/))

    expect(screen.getByText('Startpagina wissen')).toBeTruthy()
    expect(screen.queryByText('Als startpagina instellen')).toBeNull()
  })

  it('"Als startpagina instellen" roept onSetStartPage aan met het pad van het bestand', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    const onSetStartPage = vi.fn()
    render(
      <Tree
        root={root}
        selectedPath={null}
        startPage={null}
        onSelectFile={() => {}}
        actions={actionsStub({ onSetStartPage })}
      />,
    )

    fireEvent.contextMenu(screen.getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Als startpagina instellen'))

    expect(onSetStartPage).toHaveBeenCalledWith('notitie.md')
  })

  it('"Startpagina wissen" roept onClearStartPage aan', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    const onClearStartPage = vi.fn()
    render(
      <Tree
        root={root}
        selectedPath={null}
        startPage="notitie.md"
        onSelectFile={() => {}}
        actions={actionsStub({ onClearStartPage })}
      />,
    )

    fireEvent.contextMenu(screen.getByText(/notitie\.md/))
    fireEvent.click(screen.getByText('Startpagina wissen'))

    expect(onClearStartPage).toHaveBeenCalledTimes(1)
  })

  it('Escape sluit het contextmenu zonder een actie te kiezen', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    const onTrashFile = vi.fn()
    render(
      <Tree
        root={root}
        selectedPath={null}
        startPage={null}
        onSelectFile={() => {}}
        actions={actionsStub({ onTrashFile })}
      />,
    )

    fireEvent.contextMenu(screen.getByText(/notitie\.md/))
    expect(screen.getByRole('menu')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(onTrashFile).not.toHaveBeenCalled()
  })
})
