import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import App from '../App'
import * as ipc from '../ipc'
import type { VaultView } from '../ipc'

vi.mock('../ipc')
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

const mockedIpc = vi.mocked(ipc)

const eenBoom: VaultView = {
  rootDisplay: '/tmp/vault',
  tree: {
    name: 'vault',
    relPath: '',
    kind: 'dir',
    readable: true,
    children: [{ name: 'notitie.md', relPath: 'notitie.md', kind: 'file', readable: true, children: [] }],
  },
}

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('toont de lege staat als restoreVault niets teruggeeft (Goal §0/V4)', async () => {
    mockedIpc.restoreVault.mockResolvedValue(null)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)

    await waitFor(() => expect(screen.getByText('Kies map')).toBeTruthy())
  })

  it('toont de boom als er een vault onthouden is', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)

    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())
    expect(screen.getByText(/\/tmp\/vault/)).toBeTruthy()
  })

  it('sidebar verbergen haalt de boom uit beeld en onthoudt de stand', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(true)
    mockedIpc.setSidebarVisible.mockResolvedValue(undefined)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())

    fireEvent.click(screen.getByText('Sidebar verbergen'))
    await waitFor(() => expect(screen.queryByText(/notitie\.md/)).toBeNull())
    expect(mockedIpc.setSidebarVisible).toHaveBeenCalledWith(false)

    // De boom-data blijft intact — verbergen is CSS-state, geen her-fetch
    // (Spec §5.6).
    fireEvent.click(screen.getByText('Sidebar tonen'))
    await waitFor(() => expect(screen.getByText(/notitie\.md/)).toBeTruthy())
    expect(mockedIpc.rescanVault).not.toHaveBeenCalled()
  })

  it('start verborgen als app-state dat zo onthouden had', async () => {
    mockedIpc.restoreVault.mockResolvedValue(eenBoom)
    mockedIpc.getSidebarVisible.mockResolvedValue(false)

    render(<App />)

    await waitFor(() => expect(screen.getByText('Sidebar tonen')).toBeTruthy())
    expect(screen.queryByText(/notitie\.md/)).toBeNull()
  })

  it('een foutmelding bij restoreVault crasht de app niet', async () => {
    mockedIpc.restoreVault.mockRejectedValue(new Error('kapot'))
    mockedIpc.getSidebarVisible.mockResolvedValue(true)

    render(<App />)

    await waitFor(() => expect(screen.getByText('Kies map')).toBeTruthy())
  })
})
