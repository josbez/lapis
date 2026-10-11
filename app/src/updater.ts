import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

/**
 * Updaten (PRD §8, besluit 11-10-2026): het enige netwerkverkeer van Lapis.
 * Eén keer stil bij het starten en op verzoek vanuit Instellingen. De
 * updater-plugin haalt `latest.json` van de GitHub-releases en weigert een
 * download zonder geldige handtekening.
 *
 * Alle plugin-aanroepen staan hier, zodat de rest van de frontend (en de
 * tests) alleen deze drie functies kent.
 */

export interface AvailableUpdate {
  version: string
  /** Downloadt, controleert de handtekening, installeert en herstart. */
  install: () => Promise<void>
}

export const currentVersion = (): Promise<string> => getVersion()

export async function findUpdate(): Promise<AvailableUpdate | null> {
  const update = await check()
  if (!update) return null
  return {
    version: update.version,
    install: async () => {
      // Getypte tekst is dan al lang opgeslagen: autosave volgt 500 ms na
      // de laatste toets, en naar Instellingen gaan en hier klikken duurt
      // langer dan dat.
      await update.downloadAndInstall()
      await relaunch()
    },
  }
}
