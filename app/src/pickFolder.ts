import { open } from '@tauri-apps/plugin-dialog'

/**
 * Opent de systeem-mapkiezer. `null` als de gebruiker annuleert.
 * Gedeeld door `EmptyState` (de eerste keer) en `Settings` (een vault
 * wijzigen, W10) — allebei dezelfde drie regels, nu op één plek.
 */
export async function pickFolder(): Promise<string | null> {
  const picked = await open({ directory: true, multiple: false })
  return typeof picked === 'string' ? picked : null
}
