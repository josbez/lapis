import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Tree } from '../Tree'
import type { TreeNode } from '../ipc'

function dir(name: string, relPath: string, children: TreeNode[] = [], readable = true): TreeNode {
  return { name, relPath, kind: 'dir', readable, children }
}
function file(name: string, relPath: string): TreeNode {
  return { name, relPath, kind: 'file', readable: true, children: [] }
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
    render(<Tree root={root} selectedPath={null} onSelectFile={() => {}} />)

    expect(screen.getByText(/sub/)).toBeTruthy()
    expect(screen.getByText(/boven\.md/)).toBeTruthy()
    expect(screen.queryByText(/binnen\.md/)).toBeNull()
  })

  it('klikken op een map klapt uit, nogmaals klikken klapt in', () => {
    const root = dir('vault', '', [dir('sub', 'sub', [file('binnen.md', 'sub/binnen.md')])])
    render(<Tree root={root} selectedPath={null} onSelectFile={() => {}} />)

    const subKnop = screen.getByText(/sub/)
    fireEvent.click(subKnop)
    expect(screen.getByText(/binnen\.md/)).toBeTruthy()

    fireEvent.click(subKnop)
    expect(screen.queryByText(/binnen\.md/)).toBeNull()
  })

  it('klikken op een bestand zet de selectie, roept geen IPC aan', () => {
    const root = dir('vault', '', [file('notitie.md', 'notitie.md')])
    const onSelectFile = vi.fn()
    render(<Tree root={root} selectedPath={null} onSelectFile={onSelectFile} />)

    fireEvent.click(screen.getByText(/notitie\.md/))
    expect(onSelectFile).toHaveBeenCalledTimes(1)
    expect(onSelectFile).toHaveBeenCalledWith('notitie.md')
  })

  it('markeert een onleesbare map (Spec §5.3, punt 5)', () => {
    const root = dir('vault', '', [dir('geheim', 'geheim', [], false)])
    render(<Tree root={root} selectedPath={null} onSelectFile={() => {}} />)
    expect(screen.getByText(/geen toegang/)).toBeTruthy()
  })
})
