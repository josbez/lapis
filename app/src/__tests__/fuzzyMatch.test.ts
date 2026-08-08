import { describe, expect, it } from 'vitest'
import { fuzzyFilter, fuzzyScore } from '../fuzzyMatch'

describe('fuzzyScore', () => {
  it('geeft 0 voor een lege query — alles matcht', () => {
    expect(fuzzyScore('', 'notitie.md')).toBe(0)
  })

  it('geeft null als niet elk teken in volgorde voorkomt', () => {
    expect(fuzzyScore('xyz', 'notitie.md')).toBeNull()
  })

  it('matcht hoofdletter-ongevoelig', () => {
    expect(fuzzyScore('NOT', 'notitie.md')).not.toBeNull()
  })

  it('matcht tekens die niet aaneengesloten staan, in volgorde', () => {
    expect(fuzzyScore('ntt', 'notitie.md')).not.toBeNull()
  })

  it('beloont een aaneengesloten treffer boven losse tekens', () => {
    const aaneengesloten = fuzzyScore('not', 'notitie.md')
    const los = fuzzyScore('nte', 'notitie.md')
    expect(aaneengesloten).not.toBeNull()
    expect(los).not.toBeNull()
    expect(aaneengesloten!).toBeGreaterThan(los!)
  })

  it('beloont een treffer aan het begin van de tekst', () => {
    const aanHetBegin = fuzzyScore('a', 'aardbei.md')
    const middenin = fuzzyScore('a', 'banaan.md')
    expect(aanHetBegin!).toBeGreaterThan(middenin!)
  })
})

describe('fuzzyFilter', () => {
  const paden = ['projecten/notitie-project.md', 'een-nieuwe-pagina.md', 'dagboek/2026-01-01.md']

  it('geeft alle items in oorspronkelijke volgorde terug bij een lege query', () => {
    expect(fuzzyFilter('', paden, (p) => p)).toEqual(paden)
  })

  it('laat niet-matchende items weg', () => {
    const resultaat = fuzzyFilter('xyz123', paden, (p) => p)
    expect(resultaat).toEqual([])
  })

  it('sorteert op relevantie, niet op oorspronkelijke volgorde', () => {
    const resultaat = fuzzyFilter('np', paden, (p) => p)
    expect(resultaat[0]).toBe('projecten/notitie-project.md')
  })

  it('werkt met objecten via getText', () => {
    const items = [{ naam: 'alpha' }, { naam: 'beta' }]
    const resultaat = fuzzyFilter('bet', items, (i) => i.naam)
    expect(resultaat).toEqual([{ naam: 'beta' }])
  })
})
