import { describe, expect, it } from 'vitest'
import { createRequestGate } from '../requestGate'

/**
 * Volgordebewaking bij het wisselen van vault (bevinding B8), hier op
 * `createRequestGate` zelf getest — zoals in spike/src/requestGate.test.ts.
 */

const uitgesteldeRead = <T,>() => {
  let resolve!: (waarde: T) => void
  const belofte = new Promise<T>((r) => {
    resolve = r
  })
  return { belofte, resolve }
}

describe('volgordebewaking bij het wisselen van vault', () => {
  it('een antwoord dat ná een nieuwer terugkomt zet geen state meer', async () => {
    const gate = createRequestGate()
    let inBeeld: string | null = null

    const a = uitgesteldeRead<string>()
    const b = uitgesteldeRead<string>()

    const openA = (async () => {
      const isLatest = gate.start()
      const waarde = await a.belofte
      if (!isLatest()) return
      inBeeld = waarde
    })()
    const openB = (async () => {
      const isLatest = gate.start()
      const waarde = await b.belofte
      if (!isLatest()) return
      inBeeld = waarde
    })()

    b.resolve('vault B')
    a.resolve('vault A')
    await Promise.all([openA, openB])

    expect(inBeeld).toBe('vault B')
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
