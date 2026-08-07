import { invoke } from '@tauri-apps/api/core'

/**
 * De enige weg van de frontend naar het bestandssysteem.
 *
 * Goal §12 / Spec §5.5: geen enkel command hieronder accepteert een
 * `root`-parameter. De gekozen map staat aan de Rust-kant in
 * `vault_core::Session`; de frontend kan een map *kiezen* via `openVault`,
 * maar hem daarna niet meer *meegeven*.
 */

export type NodeKind = 'dir' | 'file'

export interface TreeNode {
  name: string
  relPath: string
  kind: NodeKind
  readable: boolean
  children: TreeNode[]
}

export interface VaultView {
  rootDisplay: string
  tree: TreeNode
}

/** Kiest een nieuwe map als vault en geeft de volledige boom terug. */
export const openVault = (picked: string): Promise<VaultView> => invoke('open_vault', { picked })

/**
 * Probeert de bij een vorige sessie onthouden map te heropenen. `null`
 * betekent: geen map onthouden, of de onthouden map bestaat niet meer
 * (Goal §0/V4) — in beide gevallen is de lege staat het juiste antwoord.
 */
export const restoreVault = (): Promise<VaultView | null> => invoke('restore_vault')

/** Handmatig verversen van de huidige sessie. */
export const rescanVault = (): Promise<VaultView> => invoke('rescan_vault')

export const getSidebarVisible = (): Promise<boolean> => invoke('get_sidebar_visible')

export const setSidebarVisible = (visible: boolean): Promise<void> =>
  invoke('set_sidebar_visible', { visible })
