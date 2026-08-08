import { useCallback, useEffect, useRef, useState } from 'react'
import { readNote, writeNote, writeNoteAsCopy, type NoteContent } from './ipc'

/**
 * Autosave, ⌘S, het focusmodel en conflictafhandeling voor één open notitie
 * (W3, PRD F3 · C3 · C4 · §10 besluit 1).
 *
 * Alle logica staat hier, los van CodeMirror: `handleMarkdownChange` is de
 * enige plek waar de huidige tekst binnenkomt (uit `onMarkdownChange`, dat
 * bij élke wijziging vuurt), dus deze hook heeft geen editor-handle nodig om
 * te weten wat er opgeslagen moet worden. Dat maakt 'm rechtstreeks
 * testbaar zonder CodeMirror te hoeven mounten.
 *
 * Focusmodel (C4): het venster verliest focus → direct opslaan. Het venster
 * krijgt focus terug → stil herladen als er niets gewijzigd is, anders een
 * conflict tonen in plaats van typwerk te overschrijven. Wisselt de
 * gebruiker van notitie, dan ontmount deze hook — de cleanup-effect slaat
 * dan alsnog op wat nog niet op schijf stond (PRD F3-acceptatie: "getypte
 * tekst gaat nooit verloren zonder dat de gebruiker een keuze heeft
 * gemaakt").
 */

const AUTOSAVE_DEBOUNCE_MS = 500

export interface ConflictState {
  /** Wat er in de editor stond op het moment dat het schrijven faalde. */
  mine: string
}

export interface UseNoteEditorOptions {
  relPath: string
  initial: NoteContent
  onStatus: (status: string) => void
  /** Na "beide bewaren": er staat een nieuw bestand in de vault. */
  onCopySaved?: () => void
}

export interface UseNoteEditorResult {
  /** Verandert alleen wanneer de editor-inhoud vanuit buiten opnieuw gezet moet worden. */
  documentId: string
  markdownSource: string
  readOnly: boolean
  conflict: ConflictState | null
  handleMarkdownChange: (markdown: string) => void
  keepMine: () => void
  loadTheirs: () => void
  keepBoth: () => void
}

export function useNoteEditor({
  relPath,
  initial,
  onStatus,
  onCopySaved,
}: UseNoteEditorOptions): UseNoteEditorResult {
  const [generation, setGeneration] = useState(0)
  const [baseline, setBaseline] = useState<NoteContent>(initial)
  const [conflict, setConflict] = useState<ConflictState | null>(null)

  const baselineRef = useRef(baseline)
  useEffect(() => {
    baselineRef.current = baseline
  }, [baseline])

  const conflictRef = useRef(conflict)
  useEffect(() => {
    conflictRef.current = conflict
  }, [conflict])

  // De laatste tekst uit de editor, bijgehouden buiten React-state — alleen
  // save-logica leest dit, dus een re-render per toetsaanslag is overbodig.
  const currentRef = useRef(initial.content)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const doSave = useCallback(
    (opts?: { force?: boolean }) => {
      // Een actief conflict blokkeert elke automatische schrijfpoging — ook
      // via ⌘S, blur of het ontmounten. Alleen een geforceerde aanroep
      // (keepMine) mag hier doorheen; er is toch niets nieuws te bewaren,
      // want de editor is read-only zolang het conflict openstaat.
      if (conflictRef.current && !opts?.force) return
      const current = currentRef.current
      if (!opts?.force && current === baselineRef.current.content) return
      if (savingRef.current) return
      savingRef.current = true
      const expected = opts?.force ? null : baselineRef.current.modifiedMs

      void writeNote(relPath, current, expected)
        .then((outcome) => {
          if (outcome.kind === 'conflict') {
            setConflict({ mine: current })
            onStatus('extern gewijzigd — kies hoe je verder wilt')
          } else {
            setBaseline({ content: current, modifiedMs: outcome.modifiedMs })
            setConflict(null)
            onStatus(`opgeslagen ${new Date().toLocaleTimeString()}`)
          }
        })
        .catch((e: unknown) => {
          onStatus(`opslaan mislukt: ${e}`)
        })
        .finally(() => {
          savingRef.current = false
        })
    },
    [relPath, onStatus],
  )

  const flush = useCallback(() => {
    clearTimer()
    doSave()
  }, [doSave])

  const handleMarkdownChange = useCallback(
    (markdown: string) => {
      currentRef.current = markdown
      if (conflictRef.current) return
      clearTimer()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        doSave()
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [doSave],
  )

  // ⌘S: direct opslaan, geen debounce (C3: "autosave met ⌘S als extra").
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        flush()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flush])

  const checkOnFocus = useCallback(() => {
    if (conflictRef.current) return
    void readNote(relPath)
      .then((fresh) => {
        if (fresh.modifiedMs === baselineRef.current.modifiedMs) return
        const isDirty = currentRef.current !== baselineRef.current.content
        if (!isDirty) {
          setBaseline(fresh)
          currentRef.current = fresh.content
          setGeneration((g) => g + 1)
        } else {
          setConflict({ mine: currentRef.current })
          onStatus('extern gewijzigd — kies hoe je verder wilt')
        }
      })
      .catch(() => {
        // Een voorbijgaande leesfout bij het focus-checken is geen conflict
        // en geen reden om de gebruiker te onderbreken.
      })
  }, [relPath, onStatus])

  useEffect(() => {
    window.addEventListener('blur', flush)
    window.addEventListener('focus', checkOnFocus)
    return () => {
      window.removeEventListener('blur', flush)
      window.removeEventListener('focus', checkOnFocus)
    }
  }, [flush, checkOnFocus])

  // Bij het wisselen van notitie ontmount deze hook — alsnog opslaan wat er
  // nog niet op schijf staat.
  useEffect(() => {
    return () => {
      clearTimer()
      doSave()
    }
  }, [doSave])

  const keepMine = useCallback(() => {
    setConflict(null)
    doSave({ force: true })
  }, [doSave])

  const loadTheirs = useCallback(() => {
    if (!window.confirm('Jouw wijzigingen worden overschreven met de versie op schijf. Doorgaan?')) {
      return
    }
    void readNote(relPath).then((fresh) => {
      setBaseline(fresh)
      currentRef.current = fresh.content
      setConflict(null)
      setGeneration((g) => g + 1)
      onStatus('hun versie geladen')
    })
  }, [relPath, onStatus])

  const keepBoth = useCallback(() => {
    const mine = conflictRef.current?.mine
    if (mine === undefined) return
    void writeNoteAsCopy(relPath, mine)
      .then((copyPath) => readNote(relPath).then((fresh) => ({ copyPath, fresh })))
      .then(({ copyPath, fresh }) => {
        setBaseline(fresh)
        currentRef.current = fresh.content
        setConflict(null)
        setGeneration((g) => g + 1)
        onStatus(`jouw versie bewaard als ${copyPath}`)
        onCopySaved?.()
      })
      .catch((e: unknown) => {
        onStatus(`bewaren als kopie mislukt: ${e}`)
      })
  }, [relPath, onStatus, onCopySaved])

  return {
    documentId: `${relPath}::${generation}`,
    markdownSource: baseline.content,
    readOnly: conflict !== null,
    conflict,
    handleMarkdownChange,
    keepMine,
    loadTheirs,
    keepBoth,
  }
}
