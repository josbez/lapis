import { useEffect, useRef, useState } from 'react'
import { IconFilePlus, IconFolderPlus, IconPlus } from './Icons'

interface NewItemMenuProps {
  onNewNote: () => void
  onNewFolder: () => void
}

/**
 * "+ Nieuw" onderaan de mappenbalk (W10, na Stitch-terugkoppeling): één
 * trigger die een klein popup-menu opent met "Nieuwe notitie" en "Nieuwe
 * map" — in plaats van de twee permanent zichtbare knoppen naast elkaar uit
 * de vorige revisie. Zelfde sluitgedrag als ContextMenu: klik erbuiten of
 * Escape.
 */
export function NewItemMenu({ onNewNote, onNewFolder }: NewItemMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="lapis-sidebar-footer" ref={ref}>
      {open && (
        <div className="lapis-sidebar-new-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNewNote()
            }}
          >
            <IconFilePlus />
            <span>Nieuwe notitie</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNewFolder()
            }}
          >
            <IconFolderPlus />
            <span>Nieuwe map</span>
          </button>
        </div>
      )}
      <button
        type="button"
        className="lapis-sidebar-new-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconPlus />
        <span>Nieuw</span>
      </button>
    </div>
  )
}
