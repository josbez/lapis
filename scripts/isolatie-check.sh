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
# Sinds W1 dekt dit script twee projecten: spike/ (wegwerpcode, blijft
# ongewijzigd) en app/ (het blijvende product). Elke bestaande regel loopt
# daarom twee keer — één keer per project — als aparte, los benoemde checks,
# zodat een fout in het ene project het andere niet verbergt.
#
# W1 voegde hier tijdelijk een regel toe die app/vault-core elke
# schrijfaanroep verbood (Goal W1 §11), met de aankondiging dat hij in W3
# weer zou verdwijnen zodra de kern zelf ging schrijven. Dat moment is nu:
# de regel is ingetrokken, bewust en zichtbaar, hier in de geschiedenis —
# niet stilzwijgend vervangen.
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
  scan "geen hardgecodeerde paden of gebruikersnamen (spike)" \
    '(/Users/|/home/[a-z]|C:\\\\)' \
    spike/vault-core/src spike/src-tauri/src spike/src
  scan "geen hardgecodeerde paden of gebruikersnamen (app)" \
    '(/Users/|/home/[a-z]|C:\\\\)' \
    app/vault-core/src app/app-state/src app/search-index/src app/src-tauri/src app/src

  # 07 §4.3: geen netwerk in de kern. Geen telemetrie, geen update-check.
  scan "geen netwerk in de kern (spike)" \
    '\b(reqwest|ureq|hyper|curl|TcpStream|TcpListener|std::net)\b|https?://' \
    spike/vault-core/src spike/src-tauri/src
  scan "geen netwerk in de kern (app)" \
    '\b(reqwest|ureq|hyper|curl|TcpStream|TcpListener|std::net)\b|https?://' \
    app/vault-core/src app/app-state/src app/search-index/src app/src-tauri/src

  # 07 §4.4: de frontend raakt nooit zelf een bestand aan. Alles loopt via IPC.
  scan "geen bestandstoegang vanuit de frontend (spike)" \
    "@tauri-apps/plugin-fs|from '(node:)?fs'|from \"(node:)?fs\"|require\('fs'\)" \
    spike/src
  scan "geen bestandstoegang vanuit de frontend (app)" \
    "@tauri-apps/plugin-fs|from '(node:)?fs'|from \"(node:)?fs\"|require\('fs'\)" \
    app/src

  # 07 §4.3: één poort naar de schijf. De Tauri-schil vertaalt alleen; alle
  # bestandsoperaties staan in de kern-crates, waar de padcontrole omheen zit.
  scan "geen bestandsoperaties in de Tauri-schil (spike)" \
    '\bfs::|File::create|File::open|OpenOptions' \
    spike/src-tauri/src
  scan "geen bestandsoperaties in de Tauri-schil (app)" \
    '\bfs::|File::create|File::open|OpenOptions' \
    app/src-tauri/src

  # Bevinding B1: de root is een veiligheidsinvariant en ligt in Rust. Zodra de
  # frontend een root kan meegeven, is de padcontrole eromheen te lopen.
  # Twee scans met een verschillend bereik. De frontend mág een root in beeld
  # bijhouden (dat is een string om te tónen); wat hij niet mag, is hem over de
  # IPC-grens duwen. Vandaar: geen enkel `invoke` met root waar dan ook, en in
  # `ipc.ts` — de enige plek waar die grens ligt — helemaal geen root-argument.
  scan "geen IPC-aanroep met een root-argument (spike)" \
    'invoke\(.*root' \
    spike/src
  scan "geen IPC-aanroep met een root-argument (app)" \
    'invoke\(.*root' \
    app/src

  scan "ipc.ts kent geen root-parameter (spike)" \
    '\broot\s*[:,}]' \
    spike/src/ipc.ts
  scan "ipc.ts kent geen root-parameter (app)" \
    '\broot\s*[:,}]' \
    app/src/ipc.ts

  scan "geen command accepteert nog een root-pad (spike)" \
    'fn [a-z_]+\([^)]*root' \
    spike/src-tauri/src
  scan "geen command accepteert nog een root-pad (app)" \
    'fn [a-z_]+\([^)]*root' \
    app/src-tauri/src

  # De fs-plugin is bewust niet toegekend: zou hij erbij komen, dan is de
  # vorige check te omzeilen zonder één regel Rust te veranderen.
  scan "de fs-plugin staat niet in de capabilities (spike)" \
    '"fs:' \
    spike/src-tauri/capabilities
  scan "de fs-plugin staat niet in de capabilities (app)" \
    '"fs:' \
    app/src-tauri/capabilities
}

# Bouwt een miniatuur-repo waarin élke check overtreden wordt, en controleert
# dat het script ze allemaal ziet. Zonder dit is een stille check niet van een
# geslaagde check te onderscheiden.
zelftest() {
  # Bewust geen `local`: de opruim-trap draait ná deze functie.
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp:-}"' EXIT

  for project in spike app; do
    mkdir -p "$tmp/$project/vault-core/src" "$tmp/$project/src-tauri/src" \
      "$tmp/$project/src-tauri/capabilities" "$tmp/$project/src"
  done
  mkdir -p "$tmp/app/app-state/src" "$tmp/app/search-index/src"

  for project in spike app; do
    {
      echo 'let pad = "/Users/jos/notities";'
      echo 'use reqwest::get; // https://voorbeeld.test'
    } >"$tmp/$project/vault-core/src/lib.rs"
    echo 'fn read_note(root: String) { fs::write("x", "y"); }' \
      >"$tmp/$project/src-tauri/src/main.rs"
    echo "import { readFileSync } from 'node:fs'" >"$tmp/$project/src/App.tsx"
    echo "export const readNote = (root: string) => invoke('read_note', { root })" \
      >"$tmp/$project/src/ipc.ts"
    echo '{"permissions": ["fs:allow-read"]}' \
      >"$tmp/$project/src-tauri/capabilities/default.json"
  done
  # app-state en search-index bestaan wel (anders "pad bestaat niet"), maar
  # overtreden zelf niets — de vault-core-fixture hierboven levert de
  # hardgecodeerd-pad- en netwerktreffers voor de (app)-varianten al.
  echo '// niets bijzonders' >"$tmp/app/app-state/src/lib.rs"
  echo '// niets bijzonders' >"$tmp/app/search-index/src/lib.rs"

  local echte_basis="$BASIS"
  BASIS="$tmp"
  stil=1
  draai_checks
  stil=0
  BASIS="$echte_basis"

  local verwacht=16
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
