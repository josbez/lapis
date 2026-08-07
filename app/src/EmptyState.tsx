import { open } from '@tauri-apps/plugin-dialog'

/**
 * De lege staat (Goal §0/V4): één knop en één regel uitleg, nooit
 * stilzwijgend iets tonen dat er niet meer is.
 */

interface EmptyStateProps {
  onPick: (picked: string) => void
  message: string
}

export function EmptyState({ onPick, message }: EmptyStateProps) {
  const pickFolder = async () => {
    const picked = await open({ directory: true, multiple: false })
    if (typeof picked === 'string') {
      onPick(picked)
    }
  }

  return (
    <div>
      <p>{message}</p>
      <button type="button" onClick={() => void pickFolder()}>
        Kies map
      </button>
    </div>
  )
}
