import { useEffect, useRef } from 'react'

export interface ContextMenuAction {
  label: string
  onSelect: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  actions: readonly ContextMenuAction[]
  onClose: () => void
}

/**
 * Een klein, generiek rechtsklik-menu (W7) — geen afhankelijkheid, geen
 * positioneringsbibliotheek. Sluit bij een klik erbuiten, bij Escape, en na
 * het kiezen van een actie.
 */
export function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div role="menu" ref={ref} className="lapis-menu" style={{ position: 'fixed', left: x, top: y }}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            action.onSelect()
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
