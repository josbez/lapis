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

export interface NoteContent {
  content: string
  modifiedMs: number
}

/**
 * Leest een notitie relatief aan de huidige vault, mét wijzigingstijd. De
 * tijd is nodig om vóór het schrijven te kunnen zien of iets buiten Lapis
 * is veranderd (W3, PRD F3/C4).
 */
export const readNote = (relPath: string): Promise<NoteContent> => invoke('read_note', { path: relPath })

export type WriteOutcome = { kind: 'saved'; modifiedMs: number } | { kind: 'conflict' }

/**
 * Schrijft een notitie atomair (W3). `expectedModifiedMs` is de laatst
 * bekende wijzigingstijd; wijkt de tijd op schijf daarvan af, dan komt er
 * `{ kind: 'conflict' }` terug in plaats van dat er iets overschreven wordt
 * — geen foutmelding, dit is een verwachte uitkomst (PRD §10, besluit 1).
 * Geef `null` om die controle bewust te omzeilen ("mijn versie behouden").
 */
export const writeNote = (
  relPath: string,
  content: string,
  expectedModifiedMs: number | null,
): Promise<WriteOutcome> =>
  invoke('write_note', { path: relPath, content, expectedModifiedMs })

/**
 * Slaat `content` op als nieuwe kopie naast `relPath` — "beide bewaren" bij
 * een conflict. Geeft het relatieve pad van de nieuwe kopie terug.
 */
export const writeNoteAsCopy = (relPath: string, content: string): Promise<string> =>
  invoke('write_note_as_copy', { path: relPath, content })

export const getSidebarVisible = (): Promise<boolean> => invoke('get_sidebar_visible')

export const setSidebarVisible = (visible: boolean): Promise<void> =>
  invoke('set_sidebar_visible', { visible })

/**
 * De meest recent geopende notities, meest-recent-eerst (W5, quick
 * switcher: "recent geopend bovenaan bij lege invoer").
 */
export const getRecentPaths = (): Promise<string[]> => invoke('get_recent_paths')

/** Zet `relPath` vooraan in de recente lijst. */
export const recordNoteOpened = (relPath: string): Promise<void> =>
  invoke('record_note_opened', { path: relPath })
