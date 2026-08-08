/**
 * Fuzzy match over paden in het geheugen (W5). Geen index — dat is W6's
 * SQLite FTS5. Bij 20k paden is een lineaire scan verwaarloosbaar (04 §3).
 *
 * De score beloont een aaneengesloten treffer en een treffer dichter bij
 * het begin van de tekst, zodat "np" bijvoorbeeld "notitie-project.md"
 * boven "een-nieuwe-pagina.md" zet.
 */

/** `null` betekent: geen match — niet elk teken van `query` komt in volgorde voor in `text`. */
export function fuzzyScore(query: string, text: string): number | null {
  if (query === '') return 0

  const q = query.toLowerCase()
  const t = text.toLowerCase()

  let qi = 0
  let score = 0
  let lastMatchIndex = -1

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue
    score += lastMatchIndex === ti - 1 ? 3 : 1
    if (ti === 0) score += 2
    lastMatchIndex = ti
    qi++
  }

  return qi === q.length ? score : null
}

/** Sorteert `items` op fuzzy-score tegen `query`; laat niet-matchende items weg. */
export function fuzzyFilter<T>(query: string, items: readonly T[], getText: (item: T) => string): T[] {
  if (query === '') return [...items]

  const scored = items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter((s): s is { item: T; score: number } => s.score !== null)

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.item)
}
