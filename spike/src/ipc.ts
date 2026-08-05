import { invoke } from '@tauri-apps/api/core'

/**
 * De enige weg van de frontend naar het bestandssysteem.
 *
 * Goal §12: bestandsoperaties gebeuren aan de Rust-kant. De frontend gebruikt
 * geen fs-plugin en raakt nooit zelf een bestand aan.
 */

export interface FileEntry {
  path: string
  name: string
}

export const resolveRoot = (picked: string): Promise<string> =>
  invoke('resolve_root', { picked })

export const listMarkdown = (root: string): Promise<FileEntry[]> =>
  invoke('list_markdown', { root })

export const readNote = (root: string, path: string): Promise<string> =>
  invoke('read_note', { root, path })

export const writeNote = (root: string, path: string, content: string): Promise<void> =>
  invoke('write_note', { root, path, content })
