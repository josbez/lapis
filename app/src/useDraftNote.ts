import { useCallback, useEffect, useRef, useState } from 'react'
import { createNote, writeNote } from './ipc'

/**
 * Een notitie ván het klikken op "Nieuwe notitie" tót de allereerste opslag
 * (W7, PRD F5, C5+V3).
 *
 * Vóór die eerste opslag bestaat de notitie nergens op schijf — geen
 * `Untitled.md` dat meteen verschijnt en later hernoemd wordt, want dat zou
 * de kopregel-naamgeving uit C5 feitelijk buiten werking stellen. Pas de
 * eerste opslag (debounce, blur, of ⌘S — dezelfde triggers als normale
 * autosave) roept `createNote` aan, die de bestandsnaam afleidt uit de
 * kopregel op dát moment. Daarna draagt de aanroeper (`NoteDraft`, via
 * `onCreated`) de notitie over aan de gewone `useNoteEditor`/`NoteEditor` —
 * deze hook kent geen conflictafhandeling, geen herladen-op-focus, want een
 * notitie die nog niet bestaat kan buiten Lapis niet gewijzigd zijn.
 */

const AUTOSAVE_DEBOUNCE_MS = 500

export interface UseDraftNoteOptions {
  /** Leeg voor de vault-root. */
  dir: string
  onCreated: (relPath: string, content: string, modifiedMs: number) => void
  onStatus: (status: string) => void
}

export interface UseDraftNoteResult {
  content: string
  handleMarkdownChange: (markdown: string) => void
}

export function useDraftNote({ dir, onCreated, onStatus }: UseDraftNoteOptions): UseDraftNoteResult {
  const [content, setContent] = useState('')
  const contentRef = useRef('')
  const committedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const commit = useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true
    const submitted = contentRef.current

    void createNote(dir, submitted)
      .then(async (created) => {
        const { relPath } = created
        let { modifiedMs } = created
        // Getypt tijdens de create_note-aanroep zelf (de IPC-rondgang kost
        // een fractie van een seconde, en typen stopt daar niet voor):
        // meteen bijschrijven op het bestand dat er nu al staat, zodat er
        // niets van wat je typte verloren gaat.
        if (contentRef.current !== submitted) {
          const outcome = await writeNote(relPath, contentRef.current, modifiedMs)
          if (outcome.kind === 'saved') modifiedMs = outcome.modifiedMs
        }
        onCreated(relPath, contentRef.current, modifiedMs)
      })
      .catch((e: unknown) => {
        committedRef.current = false
        onStatus(`nieuwe notitie aanmaken mislukt: ${e}`)
      })
  }, [dir, onCreated, onStatus])

  const handleMarkdownChange = useCallback(
    (markdown: string) => {
      contentRef.current = markdown
      setContent(markdown)
      clearTimer()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        commit()
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [commit],
  )

  // ⌘S: direct opslaan, geen debounce — zelfde afspraak als bij een
  // bestaande notitie (PRD C3).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        clearTimer()
        commit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commit])

  useEffect(() => {
    window.addEventListener('blur', commit)
    return () => window.removeEventListener('blur', commit)
  }, [commit])

  // Wisselt de gebruiker weg van het concept (andere notitie, ander venster)
  // zónder dat er al iets opgeslagen is: alsnog aanmaken als er getypt is —
  // getypte tekst gaat nooit verloren zonder een keuze (zelfde principe als
  // useNoteEditor). Is het concept nog helemaal leeg, dan is er niets te
  // verliezen, en blijft er terecht geen leeg "Untitled.md" achter.
  useEffect(() => {
    return () => {
      clearTimer()
      if (!committedRef.current && contentRef.current.trim() !== '') {
        commit()
      }
    }
  }, [commit])

  return { content, handleMarkdownChange }
}
