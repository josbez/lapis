import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import { Settings } from '../Settings'
import { useUpdater, type UpdateState } from '../useUpdater'
import * as updater from '../updater'

vi.mock('../updater')
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

const mocked = vi.mocked(updater)

/** Updaten (besluit 11-10-2026): stil bij het starten, en op verzoek. */
describe('useUpdater', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('zoekt stil bij het starten en meldt een gevonden update', async () => {
    mocked.findUpdate.mockResolvedValue({ version: '0.3.0', install: vi.fn() })
    const { result } = renderHook(() => useUpdater())
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'available', version: '0.3.0' }))
    expect(mocked.findUpdate).toHaveBeenCalledTimes(1)
  })

  it('een mislukte stille zoektocht blijft onzichtbaar (geen netwerk is geen fout)', async () => {
    mocked.findUpdate.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useUpdater())
    await waitFor(() => expect(mocked.findUpdate).toHaveBeenCalled())
    expect(result.current.state).toEqual({ kind: 'idle' })
  })

  it('op verzoek zoeken toont "nieuwste versie" of de fout', async () => {
    mocked.findUpdate.mockResolvedValue(null)
    const { result } = renderHook(() => useUpdater())
    await act(() => result.current.check())
    expect(result.current.state).toEqual({ kind: 'upToDate' })

    mocked.findUpdate.mockRejectedValue(new Error('offline'))
    await act(() => result.current.check())
    expect(result.current.state).toEqual({ kind: 'error', message: 'Error: offline' })
  })

  it('installeren roept de gevonden update aan', async () => {
    const install = vi.fn().mockResolvedValue(undefined)
    mocked.findUpdate.mockResolvedValue({ version: '0.3.0', install })
    const { result } = renderHook(() => useUpdater())
    await waitFor(() => expect(result.current.state.kind).toBe('available'))
    await act(() => result.current.install())
    expect(install).toHaveBeenCalledTimes(1)
    expect(result.current.state).toEqual({ kind: 'installing', version: '0.3.0' })
  })
})

describe('Settings — updates', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocked.currentVersion.mockResolvedValue('0.2.0')
  })
  afterEach(() => {
    cleanup()
  })

  const renderWith = (update: UpdateState, onCheck = vi.fn(), onInstall = vi.fn()) =>
    render(
      <Settings
        vaultRootDisplay="/tmp/vault"
        startPage={null}
        onPickVault={() => {}}
        onClearStartPage={() => {}}
        update={update}
        onCheckUpdate={onCheck}
        onInstallUpdate={onInstall}
        onClose={() => {}}
      />,
    )

  it('toont de versie en zoekt op verzoek', async () => {
    const onCheck = vi.fn()
    renderWith({ kind: 'idle' }, onCheck)
    expect(await screen.findByText('Versie 0.2.0')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zoek naar updates' }))
    expect(onCheck).toHaveBeenCalledTimes(1)
  })

  it('met een update beschikbaar: installeren en herstarten', () => {
    const onInstall = vi.fn()
    renderWith({ kind: 'available', version: '0.3.0' }, vi.fn(), onInstall)
    expect(screen.getByText('Versie 0.3.0 is beschikbaar')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Installeren en herstarten' }))
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('tijdens zoeken is de knop uitgeschakeld', () => {
    renderWith({ kind: 'checking' })
    expect((screen.getByRole('button', { name: 'Zoek naar updates' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
