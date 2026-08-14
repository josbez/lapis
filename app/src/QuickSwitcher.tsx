import { useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyFilter } from './fuzzyMatch'
import type { TreeNode } from './ipc'

export interface QuickSwitcherFile {
  name: string
  relPath: string
}

interface QuickSwitcherProps {
  files: readonly QuickSwitcherFile[]
  /** Meest-recent-eerst; alleen gebruikt bij een lege invoer. */
  recentPaths: readonly string[]
  onOpen: (relPath: string) => void
  onClose: () => void
}

/** Alle `File`-knopen uit de boom, plat, zonder mappen. */
export function flattenFiles(root: TreeNode): QuickSwitcherFile[] {
  const out: QuickSwitcherFile[] = []
  const walk = (node: TreeNode) => {
    if (node.kind === 'file') {
      out.push({ name: node.name, relPath: node.relPath })
      return
    }
    for (const child of node.children) walk(child)
  }
  walk(root)
  return out
}

/**
 * `⌘K` (W5): fuzzy zoeken op bestandsnaam + pad in het geheugen, geen index
 * — dat is W6. Lege invoer toont recent geopend, meest recent eerst
 * (PRD F4).
 */
export function QuickSwitcher({ files, recentPaths, onOpen, onClose }: QuickSwitcherProps) {
  const [query, setQuery] = useState('')
  const [rawSelectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    if (query === '') {
      // "Recent geopend bovenaan" (PRD F4): recent eerst, dan de rest in de
      // volgorde die de boom al aanhoudt — niet uitsluitend recent, anders
      // toont een verse vault zonder geschiedenis helemaal niets.
      const byPath = new Map(files.map((f) => [f.relPath, f]))
      const recentFiles = recentPaths
        .map((p) => byPath.get(p))
        .filter((f): f is QuickSwitcherFile => f !== undefined)
      const recentSet = new Set(recentPaths)
      const rest = files.filter((f) => !recentSet.has(f.relPath))
      return [...recentFiles, ...rest]
    }
    return fuzzyFilter(query, files, (f) => f.relPath)
  }, [query, files, recentPaths])

  // Afgeleid tijdens het renderen in plaats van via een effect: zodra de
  // resultatenlijst korter wordt dan de vorige selectie (bijvoorbeeld na een
  // extra teken), valt deze vanzelf terug op de laatste geldige index.
  const selectedIndex =
    results.length === 0 ? 0 : Math.min(rawSelectedIndex, results.length - 1)

  const openSelected = () => {
    const file = results[selectedIndex]
    if (file) onOpen(file.relPath)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      openSelected()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="lapis-overlay">
      <div role="dialog" aria-label="Snel een notitie openen" className="lapis-dialog" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Typ om te zoeken…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
        />
        <ul role="listbox">
          {results.length === 0 ? (
            <li>Geen notities gevonden.</li>
          ) : (
            results.map((file, index) => (
              <li key={file.relPath} role="option" aria-selected={index === selectedIndex}>
                <button type="button" onClick={() => onOpen(file.relPath)}>
                  {file.name} <span>{file.relPath}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
