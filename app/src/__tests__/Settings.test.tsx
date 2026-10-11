import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { open } from '@tauri-apps/plugin-dialog'
import { Settings } from '../Settings'

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

const mockedOpen = vi.mocked(open)

/**
 * W10 — het instellingenscherm (PRD F6): één scherm, elke instelling
 * verantwoordt zich. Twee regels nu: de vault (tot deze wave was er geen
 * manier om 'm ná het eerste kiezen te wijzigen) en de vaste eerste
 * pagina (W9, instellen blijft via het rechtsklik-contextmenu op de boom).
 */
describe('Settings', () => {
  afterEach(() => {
    cleanup()
  })

  it('toont de huidige vault en startpagina', () => {
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage="dagboek/vandaag.md"
        onPickVault={() => {}}
        onClearStartPage={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Instellingen' })).toBeTruthy()
    expect(screen.getByText('/tmp/vault')).toBeTruthy()
    expect(screen.getByText('dagboek/vandaag.md')).toBeTruthy()
  })

  it('toont "Geen ingesteld" zonder startpagina, en de wisknop is uitgeschakeld', () => {
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage={null}
        onPickVault={() => {}}
        onClearStartPage={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('Geen ingesteld')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Wissen' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('"Wissen" roept onClearStartPage aan wanneer er een startpagina is', () => {
    const onClearStartPage = vi.fn()
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage="a.md"
        onPickVault={() => {}}
        onClearStartPage={onClearStartPage}
        onClose={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Wissen' }))

    expect(onClearStartPage).toHaveBeenCalledTimes(1)
  })

  it('"Andere map kiezen" opent de systeem-mapkiezer en geeft het gekozen pad door', async () => {
    mockedOpen.mockResolvedValue('/tmp/andere-vault')
    const onPickVault = vi.fn()
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage={null}
        onPickVault={onPickVault}
        onClearStartPage={() => {}}
        onClose={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Andere map kiezen' }))

    await waitFor(() => expect(onPickVault).toHaveBeenCalledWith('/tmp/andere-vault'))
  })

  it('annuleren in de mapkiezer roept onPickVault niet aan', async () => {
    mockedOpen.mockResolvedValue(null)
    const onPickVault = vi.fn()
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage={null}
        onPickVault={onPickVault}
        onClearStartPage={() => {}}
        onClose={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Andere map kiezen' }))

    await waitFor(() => expect(mockedOpen).toHaveBeenCalled())
    expect(onPickVault).not.toHaveBeenCalled()
  })

  it('Escape sluit het scherm', () => {
    const onClose = vi.fn()
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage={null}
        onPickVault={() => {}}
        onClearStartPage={() => {}}
        onClose={onClose}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('klikken buiten het paneel sluit het scherm', () => {
    const onClose = vi.fn()
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage={null}
        onPickVault={() => {}}
        onClearStartPage={() => {}}
        onClose={onClose}
      />,
    )

    fireEvent.pointerDown(document.body)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('klikken binnen het paneel sluit het scherm niet', () => {
    const onClose = vi.fn()
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage={null}
        onPickVault={() => {}}
        onClearStartPage={() => {}}
        onClose={onClose}
      />,
    )

    fireEvent.pointerDown(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })
})
