import { useEffect, useRef, useState } from 'react'
import { searchNotes, type SearchResult } from './ipc'
import { createRequestGate } from './requestGate'

const SEARCH_DEBOUNCE_MS = 150

interface FullTextSearchProps {
  onOpen: (relPath: string, revealText: string | null) => void
  onClose: () => void
}

/**
 * De tekst tussen de eerste `<mark>…</mark>` in een FTS5-snippet — de
 * daadwerkelijk getroffen tekst, letterlijk aanwezig in de notitie. Gebruikt
 * om de editor bij het openen naar de juiste regel te laten springen
 * (`initialRevealText`), in plaats van de hele snippet: die bevat "…"-tekens
 * op afkappunten die niet letterlijk in het document staan.
 */
function firstMarkedText(snippet: string): string | null {
  const match = /<mark>(.*?)<\/mark>/.exec(snippet)
  return match ? match[1] : null
}

/**
 * Splitst een FTS5-snippet op `<mark>…</mark>` in tekstdelen voor veilige
 * weergave zonder `dangerouslySetInnerHTML` — de snippet is afgeleid van de
 * eigen notitie-inhoud van de gebruiker, en die mag nooit als HTML geparsed
 * worden (bijvoorbeeld een codeblok met letterlijke `<script>`-tekst).
 */
function renderSnippet(snippet: string) {
  return snippet.split(/(<mark>.*?<\/mark>)/).map((part, i) => {
    const match = /^<mark>(.*)<\/mark>$/.exec(part)
    return match ? <mark key={i}>{match[1]}</mark> : <span key={i}>{part}</span>
  })
}

/**
 * `⌘⇧F` (W6, PRD F4): volledige tekst zoeken over de hele vault via de
 * SQLite FTS5-index. Anders dan de quick switcher (in-memory, synchroon) is
 * elke zoekopdracht hier een IPC-aanroep — gedebouncet, en met dezelfde
 * laatst-gestarte-wint-bescherming als vault-wisselen (bevinding B8): een
 * trage eerdere zoekopdracht mag een snellere latere niet overschrijven.
 */
export function FullTextSearch({ onOpen, onClose }: FullTextSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [rawSelectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const gate = useRef(createRequestGate())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    // Een lege invoer raakt `results` bewust niet aan (geen setState in het
    // effect-lichaam zelf) — de render hieronder toont sowieso niets zolang
    // de invoer leeg is, via `shownResults`.
    if (query.trim() === '') return
    const isLatest = gate.current.start()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void searchNotes(query)
        .then((found) => {
          if (isLatest()) setResults(found)
        })
        .catch(() => {
          if (isLatest()) setResults([])
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [query])

  // Leeg zodra de invoer leeg is, ook al staat er nog een oud `results` van
  // een vorige zoekopdracht — en zoals de quick switcher: afgeleid tijdens
  // het renderen, zodat een korter wordende lijst de selectie vanzelf
  // terugzet.
  const shownResults = query.trim() === '' ? [] : results
  const selectedIndex = shownResults.length === 0 ? 0 : Math.min(rawSelectedIndex, shownResults.length - 1)

  const openResult = (result: SearchResult) => {
    onOpen(result.path, firstMarkedText(result.snippet))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, Math.max(shownResults.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const result = shownResults[selectedIndex]
      if (result) openResult(result)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="lapis-overlay">
      <div role="dialog" aria-label="Zoeken in alle notities" className="lapis-dialog" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Zoek in alle notities…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
        />
        <ul role="listbox">
          {query.trim() !== '' && shownResults.length === 0 ? (
            <li>Geen treffers.</li>
          ) : (
            shownResults.map((result, index) => (
              <li key={result.path} role="option" aria-selected={index === selectedIndex}>
                <button type="button" onClick={() => openResult(result)}>
                  <strong>{result.title}</strong> <span>{result.path}</span>
                  <p>{renderSnippet(result.snippet)}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
