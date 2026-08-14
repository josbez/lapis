/**
 * Laatst-gestarte-wint, voor asynchrone acties die dezelfde state zetten.
 *
 * Hetzelfde patroon als spike/src/requestGate.ts (bevinding B8), hier
 * hergebruikt voor het wisselen van vault: kies map A, kies dan snel map B,
 * en als het antwoord op A ná dat van B terugkomt, mag A niet meer winnen.
 * In-/uitklappen van mappen heeft dit niet nodig — dat is in W1 een zuiver
 * lokale weergavewissel zonder IPC-aanroep (Spec §5.6).
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
