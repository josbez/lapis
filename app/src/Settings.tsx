import { useEffect, useRef, useState } from 'react'
import { pickFolder } from './pickFolder'
import { currentVersion } from './updater'
import type { UpdateState } from './useUpdater'

interface SettingsProps {
  vaultRootDisplay: string
  /** W9: het relatieve pad van de vaste eerste pagina, of `null`. */
  startPage: string | null
  onPickVault: (picked: string) => void
  onClearStartPage: () => void
  update?: UpdateState
  onCheckUpdate?: () => void
  onInstallUpdate?: () => void
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
 * - **Updates** (besluit 11-10-2026) — geen instelling maar een actie: de
 *   versie tonen, zoeken, en een gevonden update installeren.
 */
export function Settings({
  vaultRootDisplay,
  startPage,
  onPickVault,
  onClearStartPage,
  update = { kind: 'idle' },
  onCheckUpdate = () => {},
  onInstallUpdate = () => {},
  onClose,
}: SettingsProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    currentVersion().then(setVersion, () => setVersion(null))
  }, [])

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

          <h2>Updates</h2>
          <div className="lapis-settings-row">
            <div className="lapis-settings-row-text">
              <div className="lapis-settings-row-label">Versie {version ?? '…'}</div>
              <div className="lapis-settings-row-value" role="status">
                {updateText(update)}
              </div>
            </div>
            {update.kind === 'available' ? (
              <button type="button" className="lapis-btn" onClick={onInstallUpdate}>
                Installeren en herstarten
              </button>
            ) : (
              <button
                type="button"
                className="lapis-btn"
                onClick={onCheckUpdate}
                disabled={update.kind === 'checking' || update.kind === 'installing'}
              >
                Zoek naar updates
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function updateText(update: UpdateState): string {
  switch (update.kind) {
    case 'idle':
      return 'Zoekt bij het starten'
    case 'checking':
      return 'Zoeken…'
    case 'upToDate':
      return 'Je hebt de nieuwste versie'
    case 'available':
      return `Versie ${update.version} is beschikbaar`
    case 'installing':
      return `Versie ${update.version} installeren…`
    case 'error':
      return `Zoeken mislukt: ${update.message}`
  }
}
