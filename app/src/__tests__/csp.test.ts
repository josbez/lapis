import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * jsdom kent geen Content-Security-Policy, dus geen enkele componenttest ziet
 * het als de webview iets blokkeert. Deze test leest de CSP zelf
 * (backlog #2: bijlagen werden als `blob:`-URL getoond, maar `img-src` stond
 * dat niet toe — in de echte app bleef elke afbeelding leeg).
 */
const csp: string = JSON.parse(
  readFileSync(join(__dirname, '../../src-tauri/tauri.conf.json'), 'utf8'),
).app.security.csp

function directive(name: string): string[] {
  const found = csp
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find(([n]) => n === name)
  return found ? found.slice(1) : []
}

describe('CSP van de webview', () => {
  it('staat blob:-afbeeldingen toe (inline bijlagen, W8)', () => {
    expect(directive('img-src')).toContain('blob:')
  })

  it('laat geen afbeeldingen van het netwerk toe (PRD §8)', () => {
    expect(directive('img-src').some((s) => s.startsWith('http:') && s !== 'http://asset.localhost')).toBe(false)
    expect(directive('img-src')).not.toContain('https:')
  })
})
