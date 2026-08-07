import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { atomicMarkdownSyntax, inlinePreview, imageBlocks, tables, wikiLinks } from '@atomic-editor/editor'

/**
 * W2 — bewijspunt op editorniveau, naast Rust's w2_read_note_* in
 * vault-core/tests/vault_core.rs. Die bewijst dat `read_note` de juiste
 * string teruggeeft; dit bewijst dat CodeMirror die string niet stilletjes
 * verandert vóórdat hij op het scherm komt.
 *
 * Anders dan spike/src/__tests__/roundtrip.test.ts is er geen
 * lineSeparatorExtension of applyLineEnding nodig — dat is een
 * schrijfvoorbereiding (W3). W2 leest alleen, en CodeMirror leest een
 * document intern altijd LF-genormaliseerd uit (`state.doc.toString()`),
 * ongeacht wat er in de bron staat. Dat is hier geen bevinding maar het
 * uitgangspunt: zolang er niets terugstroomt naar schijf is dat onzichtbaar
 * en onschadelijk. De vergelijking hieronder normaliseert daarom bewust
 * beide kanten naar LF.
 */

const FIXTURES = [
  'simpel.md',
  'crlf.md',
  'lone-cr.md',
  'geen-eind-newline.md',
  'emoji-en-accenten.md',
  'frontmatter.md',
  'tabellen-en-code.md',
] as const

const fixture = (name: string) =>
  readFileSync(join(__dirname, '../../vault-core/tests/fixtures', name), 'utf8')

const extensionsFor = () => [markdown(), atomicMarkdownSyntax, inlinePreview(), imageBlocks(), tables(), wikiLinks()]

// CodeMirror herkent \r\n én een losse \r als regeleinde en geeft
// `doc.toString()` altijd met \n terug — voor beide gevallen, niet alleen
// CRLF. Normaliseer daarom ook beide kanten hiermee.
const naarLf = (s: string) => s.replace(/\r\n|\r/g, '\n')

describe('W2 · CodeMirror verliest geen inhoud bij het openen van een notitie', () => {
  for (const name of FIXTURES) {
    it(name, () => {
      const doc = fixture(name)
      const state = EditorState.create({ doc, extensions: extensionsFor() })
      expect(naarLf(state.doc.toString())).toBe(naarLf(doc))
    })
  }
})

describe('losse CR (klassiek Mac) — bevinding B13 uit W0, hier voor lezen', () => {
  it('blijft aanwezig in het document', () => {
    const doc = fixture('lone-cr.md')
    expect(doc).toContain('\r')
    expect(doc).not.toContain('\n')

    const state = EditorState.create({ doc, extensions: extensionsFor() })
    // CodeMirror splitst regels op \r, \n en \r\n; een losse CR wordt dus
    // wél als regeleinde gelezen. Dat verandert niets aan de tekst zelf
    // (geen tekens gaan verloren), alleen aan de regelindeling in het model.
    expect(state.doc.toString().replace(/\n/g, '')).toBe(doc.replace(/\r/g, ''))
  })
})

describe('emoji en accenten blijven intact', () => {
  it('elk teken uit de fixture staat nog in het gelezen document', () => {
    const doc = fixture('emoji-en-accenten.md')
    const state = EditorState.create({ doc, extensions: extensionsFor() })
    expect(naarLf(state.doc.toString())).toBe(naarLf(doc))
  })
})
