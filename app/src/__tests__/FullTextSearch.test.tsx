import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { FullTextSearch } from '../FullTextSearch'
import * as ipc from '../ipc'

vi.mock('../ipc')

const mockedIpc = vi.mocked(ipc)

describe('FullTextSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('roept searchNotes niet aan bij een lege invoer', async () => {
    render(<FullTextSearch onOpen={() => {}} onClose={() => {}} />)
    await new Promise((r) => setTimeout(r, 200))
    expect(mockedIpc.searchNotes).not.toHaveBeenCalled()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('zoekt gedebouncet en toont titel, pad en snippet', async () => {
    mockedIpc.searchNotes.mockResolvedValue([
      { path: 'dagboek/vandaag.md', title: 'Vandaag', snippet: '…met <mark>koffie</mark> erbij…' },
    ])

    render(<FullTextSearch onOpen={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zoek in alle notities…'), {
      target: { value: 'koffie' },
    })

    await waitFor(() => expect(mockedIpc.searchNotes).toHaveBeenCalledWith('koffie'))
    await waitFor(() => expect(screen.getByRole('option')).toBeTruthy())

    const option = screen.getByRole('option')
    expect(within(option).getByText('Vandaag')).toBeTruthy()
    expect(within(option).getByText('dagboek/vandaag.md')).toBeTruthy()
    // De markering komt terecht in een echt <mark>-element, niet als
    // ingevoegde HTML via dangerouslySetInnerHTML (veiligheid: de snippet is
    // afgeleid van de eigen notitie-inhoud van de gebruiker).
    const mark = option.querySelector('mark')
    expect(mark?.textContent).toBe('koffie')
  })

  it('toont een lege-staat-bericht als niets matcht', async () => {
    mockedIpc.searchNotes.mockResolvedValue([])

    render(<FullTextSearch onOpen={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zoek in alle notities…'), {
      target: { value: 'xyzxyzxyz' },
    })

    await waitFor(() => expect(mockedIpc.searchNotes).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Geen treffers.')).toBeTruthy())
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('een mislukte zoekopdracht crasht niet en toont gewoon geen resultaten', async () => {
    mockedIpc.searchNotes.mockRejectedValue(new Error('kapot'))

    render(<FullTextSearch onOpen={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zoek in alle notities…'), {
      target: { value: 'iets' },
    })

    await waitFor(() => expect(mockedIpc.searchNotes).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Geen treffers.')).toBeTruthy())
  })

  it('klikken op een resultaat opent het met de eerste gemarkeerde tekst als revealText', async () => {
    mockedIpc.searchNotes.mockResolvedValue([
      { path: 'a.md', title: 'A', snippet: 'iets met <mark>de kern</mark> erin' },
    ])
    const onOpen = vi.fn()

    render(<FullTextSearch onOpen={onOpen} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zoek in alle notities…'), {
      target: { value: 'kern' },
    })

    await waitFor(() => expect(screen.getByRole('option')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /^A/ }))

    expect(onOpen).toHaveBeenCalledWith('a.md', 'de kern')
  })

  it('Enter opent het geselecteerde resultaat', async () => {
    mockedIpc.searchNotes.mockResolvedValue([
      { path: 'a.md', title: 'A', snippet: '<mark>iets</mark>' },
    ])
    const onOpen = vi.fn()

    render(<FullTextSearch onOpen={onOpen} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zoek in alle notities…'), {
      target: { value: 'iets' },
    })

    await waitFor(() => expect(screen.getByRole('option')).toBeTruthy())
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })

    expect(onOpen).toHaveBeenCalledWith('a.md', 'iets')
  })

  it('een resultaat zonder markering geeft null als revealText', async () => {
    mockedIpc.searchNotes.mockResolvedValue([{ path: 'a.md', title: 'A', snippet: 'geen markering' }])
    const onOpen = vi.fn()

    render(<FullTextSearch onOpen={onOpen} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Zoek in alle notities…'), {
      target: { value: 'geen' },
    })

    await waitFor(() => expect(screen.getByRole('option')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /^A/ }))

    expect(onOpen).toHaveBeenCalledWith('a.md', null)
  })

  it('Escape sluit het zoekvenster', () => {
    const onClose = vi.fn()
    render(<FullTextSearch onOpen={() => {}} onClose={onClose} />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('alleen de laatste zoekopdracht wint bij snel typen (bevinding B8)', async () => {
    let resolveEerste!: (v: ipc.SearchResult[]) => void
    let resolveTweede!: (v: ipc.SearchResult[]) => void
    mockedIpc.searchNotes.mockImplementation((query: string) => {
      if (query === 'eerste') return new Promise((r) => (resolveEerste = r))
      return new Promise((r) => (resolveTweede = r))
    })

    render(<FullTextSearch onOpen={() => {}} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('Zoek in alle notities…')

    fireEvent.change(input, { target: { value: 'eerste' } })
    await waitFor(() => expect(mockedIpc.searchNotes).toHaveBeenCalledWith('eerste'))
    fireEvent.change(input, { target: { value: 'tweede' } })
    await waitFor(() => expect(mockedIpc.searchNotes).toHaveBeenCalledWith('tweede'))

    resolveTweede([{ path: 'b.md', title: 'B', snippet: '<mark>b</mark>' }])
    await waitFor(() => expect(screen.getByRole('option')).toBeTruthy())

    resolveEerste([{ path: 'a.md', title: 'A', snippet: '<mark>a</mark>' }])
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText('B')).toBeTruthy()
    expect(screen.queryByText('A')).toBeNull()
  })
})
