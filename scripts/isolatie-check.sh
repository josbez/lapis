#!/usr/bin/env bash
#
# Isolatiecheck — de lijst uit 07 §4.3, uitvoerbaar gemaakt.
#
# Waarom dit een script is en geen grep die een agent zelf doet en rapporteert:
# een agent die zijn eigen huiswerk nakijkt is geen verificatie (bevinding B16).
# Deze checks draaien in CI en kunnen door niemand worden overgeslagen.
#
# De keuze bij elke check: liever weinig checks die hard zijn dan veel die
# ruisen. Een check die af en toe onterecht piept wordt binnen twee weken met
# een `# noqa` het zwijgen opgelegd, en dan bewaakt hij niets meer.
#
# Gebruik:
#   scripts/isolatie-check.sh              controleer deze repo
#   scripts/isolatie-check.sh --zelftest   bewijs dat elke check ook echt vangt

set -uo pipefail

BASIS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fouten=0
stil=0

meld() { [[ $stil -eq 1 ]] || echo "$@"; }

# scan <naam> <patroon> <pad>...
#
# Faalt als het patroon ergens in de opgegeven paden voorkomt. Een ontbrekend
# pad is óók een fout: een check die niets vindt omdat hij niets ziet, is de
# gevaarlijkste soort.
scan() {
  local naam="$1" patroon="$2"
  shift 2
  local pad treffers=""
  for pad in "$@"; do
    if [[ ! -e "$BASIS/$pad" ]]; then
      meld "✗ ${naam}"
      meld "    pad bestaat niet: ${pad} — is de repo verplaatst?"
      fouten=$((fouten + 1))
      return
    fi
    treffers+="$(grep -rnE --exclude-dir=__tests__ --exclude-dir=target \
      --exclude-dir=node_modules "$patroon" "$BASIS/$pad" 2>/dev/null || true)"
  done
  if [[ -n "$treffers" ]]; then
    meld "✗ ${naam}"
    meld "$treffers" | sed "s#$BASIS/#    #"
    fouten=$((fouten + 1))
  else
    meld "✓ ${naam}"
  fi
}

draai_checks() {
  fouten=0

  # 07 §4.3: geen hardgecodeerde paden of gebruikersnamen. Lapis moet ook voor
  # iemand anders dan Jos werken. Testcode mag wel paden bouwen — die staat in
  # __tests__ en achter `CARGO_MANIFEST_DIR`, en wordt hier overgeslagen.
  scan "geen hardgecodeerde paden of gebruikersnamen" \
    '(/Users/|/home/[a-z]|C:\\\\)' \
    spike/vault-core/src spike/src-tauri/src spike/src

  # 07 §4.3: geen netwerk in de kern. Geen telemetrie, geen update-check.
  scan "geen netwerk in de kern" \
    '\b(reqwest|ureq|hyper|curl|TcpStream|TcpListener|std::net)\b|https?://' \
    spike/vault-core/src spike/src-tauri/src

  # 07 §4.4: de frontend raakt nooit zelf een bestand aan. Alles loopt via IPC.
  scan "geen bestandstoegang vanuit de frontend" \
    "@tauri-apps/plugin-fs|from '(node:)?fs'|from \"(node:)?fs\"|require\('fs'\)" \
    spike/src

  # 07 §4.3: één poort naar de schijf. De Tauri-schil vertaalt alleen; alle
  # bestandsoperaties staan in vault-core, waar de padcontrole omheen zit.
  scan "geen bestandsoperaties in de Tauri-schil" \
    '\bfs::|File::create|File::open|OpenOptions' \
    spike/src-tauri/src

  # Bevinding B1: de root is een veiligheidsinvariant en ligt in Rust. Zodra de
  # frontend een root kan meegeven, is de padcontrole eromheen te lopen.
  # Twee scans met een verschillend bereik. De frontend mág een root in beeld
  # bijhouden (dat is een string om te tónen); wat hij niet mag, is hem over de
  # IPC-grens duwen. Vandaar: geen enkel `invoke` met root waar dan ook, en in
  # `ipc.ts` — de enige plek waar die grens ligt — helemaal geen root-argument.
  scan "geen IPC-aanroep met een root-argument" \
    'invoke\(.*root' \
    spike/src

  scan "ipc.ts kent geen root-parameter" \
    '\broot\s*[:,}]' \
    spike/src/ipc.ts

  scan "geen command accepteert nog een root-pad" \
    'fn [a-z_]+\([^)]*root' \
    spike/src-tauri/src

  # De fs-plugin is bewust niet toegekend: zou hij erbij komen, dan is de vorige
  # check te omzeilen zonder één regel Rust te veranderen.
  scan "de fs-plugin staat niet in de capabilities" \
    '"fs:' \
    spike/src-tauri/capabilities
}

# Bouwt een miniatuur-repo waarin élke check overtreden wordt, en controleert
# dat het script ze allemaal ziet. Zonder dit is een stille check niet van een
# geslaagde check te onderscheiden.
zelftest() {
  # Bewust geen `local`: de opruim-trap draait ná deze functie.
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp:-}"' EXIT

  mkdir -p "$tmp/spike/vault-core/src" "$tmp/spike/src-tauri/src" \
    "$tmp/spike/src-tauri/capabilities" "$tmp/spike/src"

  echo 'let pad = "/Users/jos/notities";' >"$tmp/spike/vault-core/src/lib.rs"
  echo 'use reqwest::get; // https://voorbeeld.test' >>"$tmp/spike/vault-core/src/lib.rs"
  echo 'fn read_note(root: String) { fs::write("x", "y"); }' >"$tmp/spike/src-tauri/src/main.rs"
  echo "import { readFileSync } from 'node:fs'" >"$tmp/spike/src/App.tsx"
  echo "export const readNote = (root: string) => invoke('read_note', { root })" \
    >"$tmp/spike/src/ipc.ts"
  echo '{"permissions": ["fs:allow-read"]}' >"$tmp/spike/src-tauri/capabilities/default.json"

  local echte_basis="$BASIS"
  BASIS="$tmp"
  stil=1
  draai_checks
  stil=0
  BASIS="$echte_basis"

  local verwacht=8
  if [[ $fouten -eq $verwacht ]]; then
    echo "✓ zelftest: alle ${verwacht} checks vangen hun proef-overtreding"
    return 0
  fi
  echo "✗ zelftest: ${fouten} van de ${verwacht} checks sloegen aan"
  echo "  Een check die zijn eigen overtreding niet ziet, bewaakt niets."
  return 1
}

if [[ "${1:-}" == "--zelftest" ]]; then
  zelftest
  exit $?
fi

echo "Isolatiecheck — 07 §4.3"
draai_checks
if [[ $fouten -gt 0 ]]; then
  echo
  echo "${fouten} isolatiecheck(s) gefaald."
  exit 1
fi
echo
echo "Alle isolatiechecks geslaagd."
