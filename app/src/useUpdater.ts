import { useCallback, useEffect, useRef, useState } from 'react'
import { findUpdate, type AvailableUpdate } from './updater'

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'upToDate' }
  | { kind: 'available'; version: string }
  | { kind: 'installing'; version: string }
  | { kind: 'error'; message: string }

/**
 * Stil zoeken bij het starten (een mislukking blijft dan onzichtbaar: geen
 * netwerk is geen fout), en zoeken en installeren op verzoek.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })
  const found = useRef<AvailableUpdate | null>(null)

  useEffect(() => {
    let alive = true
    findUpdate().then(
      (update) => {
        if (!alive) return
        found.current = update
        if (update) setState({ kind: 'available', version: update.version })
      },
      () => {},
    )
    return () => {
      alive = false
    }
  }, [])

  const check = useCallback(async () => {
    setState({ kind: 'checking' })
    try {
      const update = await findUpdate()
      found.current = update
      setState(update ? { kind: 'available', version: update.version } : { kind: 'upToDate' })
    } catch (e) {
      setState({ kind: 'error', message: String(e) })
    }
  }, [])

  const install = useCallback(async () => {
    const update = found.current
    if (!update) return
    setState({ kind: 'installing', version: update.version })
    try {
      await update.install()
    } catch (e) {
      setState({ kind: 'error', message: String(e) })
    }
  }, [])

  return { state, check, install }
}
