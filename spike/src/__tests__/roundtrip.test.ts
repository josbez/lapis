import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import {
  atomicMarkdownSyntax,
  extendEmphasisPair,
  imageBlocks,
  inlinePreview,
  tables,
  wikiLinks,
} from '@atomic-editor/editor'
import { applyLineEnding, detectLineEnding, lineSeparatorExtension } from '../lineEndings'

/**
 * FE-01 · Round-trip op editorniveau.
 *
 * Waarom deze test naast de Rust-test bestaat: die bewijst dat het bestand
 * goed van en naar schijf gaat, maar zegt niets over wat CodeMirror onderweg
 * met de tekst doet. Hetzelfde bewijspunt, één laag hoger.
 *
 * CodeMirror werkt met strings, niet met bytes — deze test bewijst dus
 * string-gelijkheid. Byte-gelijkheid wordt bewezen door BE-01 in vault-core,
 * op de laag waar bytes bestaan.
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
  readFileSync(join(__dirname, '../../tests/fixtures', name), 'utf8')

/** Dezelfde extensieset als de app, zodat de test iets over de app bewijst. */
const extensionsFor = (doc: string) => [
  lineSeparatorExtension(doc),
  markdown(),
  atomicMarkdownSyntax,
  inlinePreview(),
  imageBlocks(),
  tables(),
  wikiLinks(),
  extendEmphasisPair,
]

/** Precies de weg die App.tsx aflegt: openen, door de editor, weer opslaan. */
const roundTrip = (doc: string) => {
  const state = EditorState.create({ doc, extensions: extensionsFor(doc) })
  return applyLineEnding(state.doc.toString(), detectLineEnding(doc))
}

describe('FE-01 · document blijft ongewijzigd door de editor heen', () => {
  for (const name of FIXTURES) {
    it(name, () => {
      const doc = fixture(name)
      expect(roundTrip(doc)).toBe(doc)
    })
  }
})

describe('regeleindes — de bevinding uit testplan §4.2', () => {
  it('de crlf-fixture bevat daadwerkelijk CRLF', () => {
    // Zonder deze controle zou FE-01 kunnen slagen op een fixture die zijn
    // CRLF onderweg al kwijt was, bijvoorbeeld via git.
    expect(fixture('crlf.md')).toContain('\r\n')
  })

  it('detectie herkent CRLF en LF', () => {
    expect(detectLineEnding('a\r\nb')).toBe('\r\n')
    expect(detectLineEnding('a\nb')).toBe('\n')
    expect(detectLineEnding('geen regeleinde')).toBe('\n')
  })

  it('CodeMirror leest altijd LF uit, óók met de lineSeparator-facet gezet', () => {
    // Dit is de kern van de bevinding: de facet is niet genoeg. Faalt deze
    // test ooit, dan is CodeMirror veranderd en mag de expliciete
    // serialisatiestap in applyLineEnding heroverwogen worden.
    const doc = fixture('crlf.md')
    const metFacet = EditorState.create({ doc, extensions: extensionsFor(doc) })
    expect(metFacet.doc.toString()).toBe(doc.replace(/\r\n/g, '\n'))
    expect(metFacet.lineBreak).toBe('\r\n')
  })

  it('losse CR (klassiek Mac) blijft ongemoeid', () => {
    // Bevinding B13: `detectLineEnding` noemt dit een LF-bestand, en dat is
    // hier geen bug maar precies de bedoeling — CR wordt nooit aangeraakt, niet
    // bij splitsen en niet bij serialiseren. Onbewezen was het wel; dit legt
    // het vast, inclusief de zelfbewaking van de fixture.
    const doc = fixture('lone-cr.md')
    expect(doc).toContain('\r')
    expect(doc).not.toContain('\n')
    expect(detectLineEnding(doc)).toBe('\n')
    expect(roundTrip(doc)).toBe(doc)
  })

  it('een LF-bestand blijft LF', () => {
    const doc = fixture('simpel.md')
    expect(roundTrip(doc)).not.toContain('\r')
  })
})
