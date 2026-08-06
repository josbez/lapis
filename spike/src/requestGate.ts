/**
 * Laatst-gestarte-wint, voor asynchrone acties die dezelfde state zetten.
 *
 * BEVINDING UIT DE CODE-ANALYSE (B8). `openNote` was async zonder
 * volgordebewaking: klik notitie A, klik dan B, en als de read van A ná die van
 * B terugkomt, staat A in beeld terwijl B geopend lijkt. ⌘S schrijft dan A's
 * inhoud — de gebruiker denkt in B te werken. Zeldzaam op een SSD, niet
 * zeldzaam op een trage of netwerkmap, en onzichtbaar als het gebeurt.
 *
 * Eén gate voor alle acties die de geopende notitie bepalen (map kiezen én
 * notitie openen), zodat een mapwissel een read die nog onderweg is óók
 * ongeldig maakt.
 */

export interface RequestGate {
  /**
   * Start een nieuwe actie en geeft een controle terug. Die geeft `false`
   * zodra er ná deze actie een nieuwe is gestart; de aanroeper zet dan geen
   * state meer.
   */
  start(): () => boolean
}

export function createRequestGate(): RequestGate {
  let latest = 0
  return {
    start() {
      latest += 1
      const token = latest
      return () => token === latest
    },
  }
}
