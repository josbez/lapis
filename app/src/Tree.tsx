import { useState } from 'react'
import type { TreeNode } from './ipc'

/**
 * Toont `TreeNode` precies zoals de kern hem aanlevert — geen eigen
 * filtering, geen eigen sortering (Goal §12: de frontend bepaalt presentatie,
 * nooit inhoud). In-/uitklapstatus leeft alleen hier, niet gepersisteerd
 * (Spec §5.6).
 */

interface TreeProps {
  root: TreeNode
  selectedPath: string | null
  onSelectFile: (relPath: string) => void
}

export function Tree({ root, selectedPath, onSelectFile }: TreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const toggle = (relPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(relPath)) {
        next.delete(relPath)
      } else {
        next.add(relPath)
      }
      return next
    })
  }

  return (
    <ul role="tree">
      {root.children.map((child) => (
        <TreeRow
          key={child.relPath}
          node={child}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </ul>
  )
}

interface RowProps {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (relPath: string) => void
  selectedPath: string | null
  onSelectFile: (relPath: string) => void
}

function TreeRow({ node, depth, expanded, onToggle, selectedPath, onSelectFile }: RowProps) {
  const isDir = node.kind === 'dir'
  const isOpen = isDir && expanded.has(node.relPath)
  const isSelected = !isDir && node.relPath === selectedPath

  return (
    <li role="treeitem" aria-expanded={isDir ? isOpen : undefined} aria-selected={isSelected}>
      <button
        type="button"
        style={{ paddingLeft: `${depth * 16}px` }}
        // Een klik op een bestand zet hooguit de selectie — er gebeurt geen
        // IPC-aanroep die inhoud leest (Goal §4: dat is W2).
        onClick={() => (isDir ? onToggle(node.relPath) : onSelectFile(node.relPath))}
      >
        {isDir ? (isOpen ? '▾ ' : '▸ ') : '  '}
        {node.name}
        {isDir && !node.readable ? ' (geen toegang)' : ''}
      </button>
      {isDir && isOpen && (
        <ul>
          {node.children.map((child) => (
            <TreeRow
              key={child.relPath}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
