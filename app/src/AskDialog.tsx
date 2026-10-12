import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/** Een naam vragen (hernoemen, verplaatsen, nieuwe map). */
export interface AskNameRequest {
  /** Titel van de dialoog, ook de `aria-label` ("Hernoemen"). */
  title: string
  /** De vraag boven het veld ("Nieuwe naam:"). */
  label: string
  /** Wat er al in het veld staat, geselecteerd. */
  defaultValue?: string
  /** De actieknop: zegt wat er gebeurt ("Hernoemen"), nooit "OK". */
  confirmLabel: string
  /** Mag het veld leeg zijn? Verplaatsen naar de hoofdmap: ja. */
  allowEmpty?: boolean
}

/** Een ja/nee-vraag (naar prullenbak, hun versie laden). */
export interface AskConfirmRequest {
  title: string
  message: string
  confirmLabel: string
}

export interface Ask {
  /** De ingevulde naam, of `null` bij annuleren. */
  name: (request: AskNameRequest) => Promise<string | null>
  confirm: (request: AskConfirmRequest) => Promise<boolean>
}

/**
 * Zonder `AskProvider` (een hook die los getest wordt) vallen de vragen
 * terug op de systeemdialogen, zodat gedrag en tests buiten de app gelijk
 * blijven. In de app zelf staat er altijd een provider omheen.
 */
const systemAsk: Ask = {
  name: async (r) => window.prompt(r.label, r.defaultValue ?? ''),
  confirm: async (r) => window.confirm(r.message),
}

const AskContext = createContext<Ask>(systemAsk)

export function useAsk(): Ask {
  return useContext(AskContext)
}

type Pending =
  | { kind: 'name'; request: AskNameRequest; resolve: (value: string | null) => void }
  | { kind: 'confirm'; request: AskConfirmRequest; resolve: (value: boolean) => void }

/**
 * Eigen dialoog voor een naam of een vraag (design system: AskDialog), in
 * plaats van `window.prompt`/`window.confirm`: dezelfde vorm als de quick
 * switcher, met een actieknop die zegt wat er gebeurt.
 */
export function AskProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const name = useCallback(
    (request: AskNameRequest) =>
      new Promise<string | null>((resolve) => setPending({ kind: 'name', request, resolve })),
    [],
  )
  const confirm = useCallback(
    (request: AskConfirmRequest) =>
      new Promise<boolean>((resolve) => setPending({ kind: 'confirm', request, resolve })),
    [],
  )
  const [ask] = useState<Ask>(() => ({ name, confirm }))

  return (
    <AskContext.Provider value={ask}>
      {children}
      {pending && <AskDialog key={pending.request.title} pending={pending} onDone={() => setPending(null)} />}
    </AskContext.Provider>
  )
}

function AskDialog({ pending, onDone }: { pending: Pending; onDone: () => void }) {
  const [value, setValue] = useState(pending.kind === 'name' ? (pending.request.defaultValue ?? '') : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (pending.kind === 'name') {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else {
      confirmRef.current?.focus()
    }
  }, [pending.kind])

  const cancel = () => {
    if (pending.kind === 'name') pending.resolve(null)
    else pending.resolve(false)
    onDone()
  }

  const submit = () => {
    if (pending.kind === 'name') {
      if (value.trim() === '' && !pending.request.allowEmpty) return
      pending.resolve(value)
    } else {
      pending.resolve(true)
    }
    onDone()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancel()
    }
  }

  const { title, confirmLabel } = pending.request
  const disabled = pending.kind === 'name' && value.trim() === '' && !pending.request.allowEmpty

  return (
    <div
      className="lapis-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel()
      }}
    >
      <form
        role={pending.kind === 'name' ? 'dialog' : 'alertdialog'}
        aria-label={title}
        className="lapis-dialog lapis-ask"
        onKeyDown={onKeyDown}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {pending.kind === 'name' ? (
          <>
            <label className="lapis-ask-question" htmlFor="lapis-ask-input">
              {pending.request.label}
            </label>
            <input
              id="lapis-ask-input"
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </>
        ) : (
          <p className="lapis-ask-question">{pending.request.message}</p>
        )}
        <div className="lapis-ask-actions">
          <button type="button" className="lapis-btn" onClick={cancel}>
            Annuleren
          </button>
          <button ref={confirmRef} type="submit" className="lapis-btn lapis-btn-primary" disabled={disabled}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
