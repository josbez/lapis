import { EditorState, type Extension } from '@codemirror/state'

/**
 * Regeleindes behouden.
 *
 * Besluit van Jos (ronde 3): LF voor bestanden die Lapis zelf aanmaakt, behoud
 * voor bestanden die Lapis opent.
 *
 * BEVINDING UIT W0 — dit bleek meer werk dan een facet zetten.
 * CodeMirrors `Text` slaat regels intern altijd op zonder regeleinde en
 * `doc.toString()` plakt ze onvoorwaardelijk met `\n` aan elkaar. De facet
 * `EditorState.lineSeparator` bepaalt alleen (a) waarop een binnenkomend
 * document wordt gesplitst en (b) wat `state.lineBreak` teruggeeft, dus wat er
 * wordt ingevoegd als de gebruiker op Enter drukt. Uitlezen levert altijd LF.
 *
 * Behoud vraagt daarom twee dingen: de facet zetten én bij opslaan expliciet
 * serialiseren met het oorspronkelijke regeleinde.
 *
 * Bekende versimpeling: een bestand met gemengde regeleindes wordt bij opslaan
 * volledig CRLF. Dat is voor de spike aanvaardbaar; voor W3 is het een punt om
 * opnieuw te wegen.
 *
 * Deze module wordt door zowel de editor als de test gebruikt. Zou de test zijn
 * eigen logica hebben, dan bewees hij niets over de app.
 */

export type LineEnding = '\r\n' | '\n'

export function detectLineEnding(text: string): LineEnding {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

/** Zorgt dat wat de gebruiker typt hetzelfde regeleinde krijgt als het bestand. */
export function lineSeparatorExtension(text: string): Extension {
  return EditorState.lineSeparator.of(detectLineEnding(text))
}

/**
 * Zet de LF-uitvoer van de editor terug naar het regeleinde van het bestand.
 * Aanroepen vlak vóór het schrijven naar schijf, nooit eerder.
 */
export function applyLineEnding(markdown: string, ending: LineEnding): string {
  return ending === '\n' ? markdown : markdown.replace(/\r?\n/g, ending)
}
