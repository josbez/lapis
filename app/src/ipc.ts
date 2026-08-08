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

export interface CreatedNote {
  relPath: string
  modifiedMs: number
}

/**
 * Maakt een nieuwe notitie aan (W7, PRD F5). Dit ÍS de "eerste opslag" uit
 * C5+V3: de bestandsnaam komt uit de eerste kopregel van `content` op dit
 * moment, of wordt `Untitled(.md/ 2.md/…)` als die er nog niet is. `dir` is
 * leeg voor de vault-root.
 */
export const createNote = (dir: string, content: string): Promise<CreatedNote> =>
  invoke('create_note', { dir, content })

/** Maakt een nieuwe, lege map aan (W7). `dir` is leeg voor de vault-root. */
export const createFolder = (dir: string, name: string): Promise<string> =>
  invoke('create_folder', { dir, name })

/**
 * Hernoemt of verplaatst een notitie (W7) — dezelfde onderliggende
 * bewerking, of `toRelPath` nu in dezelfde map ligt of een andere. Bestaat
 * `toRelPath` al, dan wordt er niets overschreven: de aanroep faalt.
 */
export const moveNote = (fromRelPath: string, toRelPath: string): Promise<void> =>
  invoke('move_note', { fromPath: fromRelPath, toPath: toRelPath })

/** Verplaatst een notitie naar de systeem-prullenbak (W7, PRD C7) — nooit permanent. */
export const trashNote = (relPath: string): Promise<void> => invoke('trash_note', { path: relPath })

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

export interface SearchResult {
  path: string
  title: string
  /** Met `<mark>…</mark>` rond de treffer(s), uit FTS5's `snippet()`. */
  snippet: string
}

/**
 * Volledige tekst zoeken over de hele vault (W6, PRD F4, `⌘⇧F`). Een lege of
 * ongeldige query geeft gewoon een lege lijst terug, geen foutmelding —
 * evenals wanneer er (nog) geen index is, bijvoorbeeld vóór de eerste
 * vault-open.
 */
export const searchNotes = (query: string): Promise<SearchResult[]> => invoke('search_notes', { query })
