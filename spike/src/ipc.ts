import { invoke } from '@tauri-apps/api/core'

/**
 * De enige weg van de frontend naar het bestandssysteem.
 *
 * Goal §12: bestandsoperaties gebeuren aan de Rust-kant. De frontend gebruikt
 * geen fs-plugin en raakt nooit zelf een bestand aan.
 *
 * Merk op wat hier ontbreekt: een `root`-parameter. De gekozen map staat aan de
 * Rust-kant in de sessie (`vault_core::Session`). De frontend kan een map
 * *kiezen* via `openVault`, maar hem daarna niet meer *meegeven* — anders zou
 * één frontend-bug of een gecompromitteerde webview de hele schijf kunnen
 * aanwijzen als vault. Alle paden hieronder zijn relatief aan die map.
 */

export interface FileEntry {
  path: string
  name: string
}

/** Kiest de map als vault en geeft het canonieke pad terug voor in beeld. */
export const openVault = (picked: string): Promise<string> =>
  invoke('open_vault', { picked })

export const listMarkdown = (): Promise<FileEntry[]> => invoke('list_markdown')

export const readNote = (path: string): Promise<string> =>
  invoke('read_note', { path })

export const writeNote = (path: string, content: string): Promise<void> =>
  invoke('write_note', { path, content })
