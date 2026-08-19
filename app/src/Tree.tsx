import { useState } from 'react'
import { ContextMenu, type ContextMenuAction } from './ContextMenu'
import {
  IconChevron,
  IconFile,
  IconFilePlus,
  IconFolder,
  IconFolderPlus,
  IconMove,
  IconPencil,
  IconStar,
  IconStarOff,
  IconTrash,
} from './Icons'
import type { TreeNode } from './ipc'

/**
 * Toont `TreeNode` precies zoals de kern hem aanlevert — geen eigen
 * filtering, geen eigen sortering (Goal §12: de frontend bepaalt presentatie,
 * nooit inhoud). In-/uitklapstatus leeft alleen hier, niet gepersisteerd
 * (Spec §5.6).
 *
 * W7: rechtsklik op een rij opent een contextmenu. De acties zelf (de
 * `window.prompt`/`confirm` en de IPC-aanroep) staan in App.tsx — deze
 * component blijft presentatie, net als de rest van de boom.
 */

export interface TreeActions {
  onRenameFile: (relPath: string) => void
  onMoveFile: (relPath: string) => void
  onTrashFile: (relPath: string) => void
  onNewNoteInDir: (dirRelPath: string) => void
  onNewFolderInDir: (dirRelPath: string) => void
  /** W9: wijst een bestand aan als vaste eerste pagina, of trekt dat in. */
  onSetStartPage: (relPath: string) => void
  onClearStartPage: () => void
}

interface TreeProps {
  root: TreeNode
  selectedPath: string | null
  /** W9: het relatieve pad van de huidige vaste eerste pagina, of `null`. */
  startPage: string | null
  onSelectFile: (relPath: string) => void
  actions: TreeActions
}

interface MenuState {
  x: number
  y: number
  node: TreeNode
}

export function Tree({ root, selectedPath, startPage, onSelectFile, actions }: TreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [menu, setMenu] = useState<MenuState | null>(null)

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

  const openMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, node })
  }

  const menuActions: ContextMenuAction[] = menu
    ? menu.node.kind === 'file'
      ? [
          { label: 'Hernoemen', icon: <IconPencil />, onSelect: () => actions.onRenameFile(menu.node.relPath) },
          {
            label: 'Verplaatsen naar…',
            icon: <IconMove />,
            onSelect: () => actions.onMoveFile(menu.node.relPath),
          },
          {
            label: 'Naar prullenbak',
            icon: <IconTrash />,
            onSelect: () => actions.onTrashFile(menu.node.relPath),
            danger: true,
          },
          menu.node.relPath === startPage
            ? { label: 'Startpagina wissen', icon: <IconStarOff />, onSelect: () => actions.onClearStartPage() }
            : {
                label: 'Als startpagina instellen',
                icon: <IconStar />,
                onSelect: () => actions.onSetStartPage(menu.node.relPath),
              },
        ]
      : [
          {
            label: 'Nieuwe notitie hier',
            icon: <IconFilePlus />,
            onSelect: () => actions.onNewNoteInDir(menu.node.relPath),
          },
          {
            label: 'Nieuwe map hier',
            icon: <IconFolderPlus />,
            onSelect: () => actions.onNewFolderInDir(menu.node.relPath),
          },
        ]
    : []

  return (
    <>
      <ul role="tree" className="lapis-tree">
        {root.children.map((child) => (
          <TreeRow
            key={child.relPath}
            node={child}
            expanded={expanded}
            onToggle={toggle}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
            onContextMenu={openMenu}
          />
        ))}
      </ul>
      {menu && <ContextMenu x={menu.x} y={menu.y} actions={menuActions} onClose={() => setMenu(null)} />}
    </>
  )
}

interface RowProps {
  node: TreeNode
  expanded: Set<string>
  onToggle: (relPath: string) => void
  selectedPath: string | null
  onSelectFile: (relPath: string) => void
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void
}

function TreeRow({ node, expanded, onToggle, selectedPath, onSelectFile, onContextMenu }: RowProps) {
  const isDir = node.kind === 'dir'
  const isOpen = isDir && expanded.has(node.relPath)
  const isSelected = !isDir && node.relPath === selectedPath

  return (
    <li role="treeitem" aria-expanded={isDir ? isOpen : undefined} aria-selected={isSelected}>
      <button
        type="button"
        className="lapis-tree-row"
        // Een klik op een bestand zet hooguit de selectie — er gebeurt geen
        // IPC-aanroep die inhoud leest (Goal §4: dat is W2).
        onClick={() => (isDir ? onToggle(node.relPath) : onSelectFile(node.relPath))}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <span className="lapis-tree-chevron" style={{ width: 12 }}>
          {isDir && <IconChevron open={isOpen} />}
        </span>
        <span className="lapis-tree-icon">{isDir ? <IconFolder /> : <IconFile />}</span>
        <span className="lapis-tree-name">{node.name}</span>
        {isDir && !node.readable ? ' (geen toegang)' : ''}
      </button>
      {isDir && isOpen && (
        <ul className="lapis-tree-branch">
          {node.children.map((child) => (
            <TreeRow
              key={child.relPath}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
