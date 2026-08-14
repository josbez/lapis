import { useEffect, useRef } from 'react'
import { pickFolder } from './pickFolder'

interface SettingsProps {
  vaultRootDisplay: string
  /** W9: het relatieve pad van de vaste eerste pagina, of `null`. */
  startPage: string | null
  onPickVault: (picked: string) => void
  onClearStartPage: () => void
  onClose: () => void
}

/**
 * Instellingen (W10, PRD F6): één scherm, geen getal als limiet, wel de
 * regel dat elke instelling zich verantwoordt.
 *
 * Twee regels op dit moment:
 * - **Vault** — tot deze wave was er geen manier om ná het eerste kiezen
 *   een andere map te wijzen; dat is een functioneel gat, geen decoratie.
 * - **Startpagina** (W9) — hier alleen tonen wat er staat en 'm kunnen
 *   wissen; instellen blijft via het rechtsklik-contextmenu op de boom
 *   (PRD F7 noemt uitdrukkelijk de bestandsboom als aanwijsplek).
 */
export function Settings({
  vaultRootDisplay,
  startPage,
  onPickVault,
  onClearStartPage,
  onClose,
}: SettingsProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handlePickVault = () => {
    void pickFolder().then((picked) => {
      if (picked) onPickVault(picked)
    })
  }

  return (
    <div className="lapis-overlay">
      <div role="dialog" aria-label="Instellingen" className="lapis-dialog" ref={ref}>
        <div className="lapis-settings">
          <h2>Vault</h2>
          <div className="lapis-settings-row">
            <div className="lapis-settings-row-text">
              <div className="lapis-settings-row-label">Map</div>
              <div className="lapis-settings-row-value">{vaultRootDisplay}</div>
            </div>
            <button type="button" className="lapis-btn" onClick={handlePickVault}>
              Andere map kiezen
            </button>
          </div>

          <h2>Startpagina</h2>
          <div className="lapis-settings-row">
            <div className="lapis-settings-row-text">
              <div className="lapis-settings-row-label">Notitie</div>
              <div className="lapis-settings-row-value">{startPage ?? 'Geen ingesteld'}</div>
            </div>
            <button
              type="button"
              className="lapis-btn"
              onClick={onClearStartPage}
              disabled={startPage === null}
            >
              Wissen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
