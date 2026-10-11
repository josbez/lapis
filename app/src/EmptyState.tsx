import { pickFolder } from './pickFolder'

/**
 * De lege staat (Goal §0/V4): één knop en één regel uitleg, nooit
 * stilzwijgend iets tonen dat er niet meer is.
 */

interface EmptyStateProps {
  onPick: (picked: string) => void
  message: string
}

export function EmptyState({ onPick, message }: EmptyStateProps) {
  const handlePick = () => {
    void pickFolder().then((picked) => {
      if (picked) onPick(picked)
    })
  }

  return (
    <div className="lapis-empty-state">
      <p>{message}</p>
      <button type="button" className="lapis-btn lapis-btn-primary" onClick={handlePick}>
        Kies map
      </button>
    </div>
  )
}
