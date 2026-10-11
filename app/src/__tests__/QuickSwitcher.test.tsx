import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QuickSwitcher, flattenFiles } from '../QuickSwitcher'
import type { TreeNode } from '../ipc'

const files = [
  { name: 'aardbei.md', relPath: 'aardbei.md' },
  { name: 'notitie-project.md', relPath: 'projecten/notitie-project.md' },
  { name: '2026-01-01.md', relPath: 'dagboek/2026-01-01.md' },
]

describe('QuickSwitcher', () => {
  afterEach(() => {
    cleanup()
  })

  it('toont recent geopend bovenaan bij lege invoer, in die volgorde', () => {
    render(
      <QuickSwitcher
        files={files}
        recentPaths={['dagboek/2026-01-01.md', 'aardbei.md']}
        onOpen={() => {}}
        onClose={() => {}}
      />,
    )

    // Recent eerst, in die volgorde, gevolgd door de rest — niet
    // uitsluitend recent, anders toont een verse vault niets.
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toContain('2026-01-01.md')
    expect(items[1].textContent).toContain('aardbei.md')
    expect(items[2].textContent).toContain('notitie-project.md')
  })

  it('filtert fuzzy zodra je typt', () => {
    render(<QuickSwitcher files={files} recentPaths={[]} onOpen={() => {}} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Zoek notitie…'), {
      target: { value: 'np' },
    })

    const items = screen.getAllByRole('option')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('notitie-project.md')
  })

  it('toont een lege-staat-bericht als niets matcht', () => {
    render(<QuickSwitcher files={files} recentPaths={[]} onOpen={() => {}} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Zoek notitie…'), {
      target: { value: 'xyz123' },
    })

    expect(screen.getByText('Geen notities gevonden.')).toBeTruthy()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('klikken op een resultaat opent het', () => {
    const onOpen = vi.fn()
    render(<QuickSwitcher files={files} recentPaths={[]} onOpen={onOpen} onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /^aardbei\.md/ }))
    expect(onOpen).toHaveBeenCalledWith('aardbei.md')
  })

  it('Enter opent het geselecteerde resultaat', () => {
    const onOpen = vi.fn()
    render(<QuickSwitcher files={files} recentPaths={[]} onOpen={onOpen} onClose={() => {}} />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith('aardbei.md')
  })

  it('pijltjestoetsen verplaatsen de selectie vóór Enter', () => {
    const onOpen = vi.fn()
    render(<QuickSwitcher files={files} recentPaths={[]} onOpen={onOpen} onClose={() => {}} />)

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'ArrowDown' })
    fireEvent.keyDown(dialog, { key: 'Enter' })

    expect(onOpen).toHaveBeenCalledWith('projecten/notitie-project.md')
  })

  it('Escape sluit de switcher', () => {
    const onClose = vi.fn()
    render(<QuickSwitcher files={files} recentPaths={[]} onOpen={() => {}} onClose={onClose} />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('flattenFiles', () => {
  it('haalt alleen bestanden op, geen mappen, uit een geneste boom', () => {
    const tree: TreeNode = {
      name: 'vault',
      relPath: '',
      kind: 'dir',
      readable: true,
      children: [
        { name: 'a.md', relPath: 'a.md', kind: 'file', readable: true, children: [] },
        {
          name: 'sub',
          relPath: 'sub',
          kind: 'dir',
          readable: true,
          children: [{ name: 'b.md', relPath: 'sub/b.md', kind: 'file', readable: true, children: [] }],
        },
      ],
    }

    expect(flattenFiles(tree)).toEqual([
      { name: 'a.md', relPath: 'a.md' },
      { name: 'b.md', relPath: 'sub/b.md' },
    ])
  })
})
