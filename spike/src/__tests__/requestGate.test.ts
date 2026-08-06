import { describe, expect, it } from 'vitest'
import { createRequestGate } from '../requestGate'

/**
 * FE-02 · De laatste klik wint, ook als de trage read later terugkomt.
 *
 * Dit is bevinding B8 uit de code-analyse. De test simuleert precies wat
 * `openNote` in App.tsx doet: gate openen, await, en pas state zetten als deze
 * aanroep nog de laatste is. De volgorde van terugkomen wordt hier omgedraaid —
 * op schijf gebeurt dat vanzelf zodra één van de twee bestanden traag is.
 */

/** Een read die pas resolvet als de test dat zegt. */
const uitgesteldeRead = <T,>() => {
  let resolve!: (waarde: T) => void
  const belofte = new Promise<T>((r) => {
    resolve = r
  })
  return { belofte, resolve }
}

describe('FE-02 · volgordebewaking bij het openen van notities', () => {
  it('een read die ná een nieuwere terugkomt zet geen state meer', async () => {
    const gate = createRequestGate()
    let inBeeld: string | null = null

    const a = uitgesteldeRead<string>()
    const b = uitgesteldeRead<string>()

    // Klik A, dan klik B — de app start beide reads.
    const openA = (async () => {
      const isLatest = gate.start()
      const inhoud = await a.belofte
      if (!isLatest()) return
      inBeeld = inhoud
    })()
    const openB = (async () => {
      const isLatest = gate.start()
      const inhoud = await b.belofte
      if (!isLatest()) return
      inBeeld = inhoud
    })()

    // B komt eerst terug, A daarna: de omgekeerde volgorde.
    b.resolve('inhoud van B')
    a.resolve('inhoud van A')
    await Promise.all([openA, openB])

    expect(inBeeld).toBe('inhoud van B')
  })

  it('zonder nieuwere actie zet een trage read gewoon state', async () => {
    const gate = createRequestGate()
    const isLatest = gate.start()
    await Promise.resolve()
    expect(isLatest()).toBe(true)
  })

  it('elke nieuwe actie maakt alle eerdere ongeldig', () => {
    const gate = createRequestGate()
    const eerste = gate.start()
    const tweede = gate.start()
    const derde = gate.start()

    expect(eerste()).toBe(false)
    expect(tweede()).toBe(false)
    expect(derde()).toBe(true)
  })
})
