#!/bin/bash
# Bouwt Lapis.app (universal: Apple Silicon + Intel) en verpakt 'm in een
# deelbare DMG, met install.sh en een snelkoppeling naar /Applications.
#   ./scripts/make-dmg.sh
# Draait op macOS — lokaal (scripts/release.sh) of in .github/workflows/dmg.yml.
#
# Staat de updater-sleutel op ~/.tauri/lapis.key (of in TAURI_SIGNING_PRIVATE_KEY),
# dan maakt hij ook de update: Lapis.app.tar.gz met handtekening en latest.json,
# die de updater in de app van de laatste release haalt. Zonder sleutel alleen
# de DMG (zo draait hij in CI). De sleutel gaat nooit in git of naar GitHub.
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(uname)" = Darwin ] || { echo "✗ alleen op macOS" >&2; exit 1; }

TARGET=universal-apple-darwin
rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null

KEY_FILE="$HOME/.tauri/lapis.key"
if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ] && [ -f "$KEY_FILE" ]; then
    export TAURI_SIGNING_PRIVATE_KEY="$KEY_FILE"
    if [ -z "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" ]; then
        read -r -s -p "Wachtwoord van $KEY_FILE: " TAURI_SIGNING_PRIVATE_KEY_PASSWORD
        echo
        export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
    fi
fi

UPDATER=()
if [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
    if grep -q VERVANG_DOOR app/src-tauri/tauri.conf.json; then
        echo "✗ de publieke updater-sleutel in tauri.conf.json is nog een placeholder" >&2
        exit 1
    fi
    UPDATER=(--config '{"bundle":{"createUpdaterArtifacts":true}}')
fi

(cd app && npm ci && npx tauri build --target "$TARGET" --bundles app ${UPDATER[@]+"${UPDATER[@]}"})

SRC="app/target/$TARGET/release/bundle/macos/Lapis.app"
[ -d "$SRC" ] || { echo "✗ $SRC niet gevonden na de build" >&2; exit 1; }

STAGE=$(mktemp -d)
chmod 755 "$STAGE"
cp -R "$SRC" "$STAGE/"
cp release/install.sh "$STAGE/"
ln -s /Applications "$STAGE/Applications"

DMG=Lapis.dmg
rm -f "$DMG"
hdiutil create -volname "Lapis" -srcfolder "$STAGE" -ov -format UDZO "$DMG"
rm -rf "$STAGE"

echo "✓ $DMG klaar ($(du -h "$DMG" | cut -f1))"

if [ ${#UPDATER[@]} -gt 0 ]; then
    BUNDLE="app/target/$TARGET/release/bundle/macos"
    VERSION=$(node -p "require('./app/src-tauri/tauri.conf.json').version")
    cp "$BUNDLE/Lapis.app.tar.gz" Lapis.app.tar.gz
    SIG=$(cat "$BUNDLE/Lapis.app.tar.gz.sig")
    URL="https://github.com/josbez/lapis/releases/download/v$VERSION/Lapis.app.tar.gz"
    # Eén universal build, dus beide architecturen wijzen naar hetzelfde bestand.
    node -e '
      const [version, sig, url] = process.argv.slice(1)
      const platform = { signature: sig, url }
      const out = {
        version,
        pub_date: new Date().toISOString(),
        platforms: { "darwin-aarch64": platform, "darwin-x86_64": platform },
      }
      require("fs").writeFileSync("latest.json", JSON.stringify(out, null, 2) + "\n")
    ' "$VERSION" "$SIG" "$URL"
    echo "✓ update klaar: Lapis.app.tar.gz + latest.json (v$VERSION)"
else
    echo "⚠ geen updater-sleutel ($KEY_FILE) — alleen de DMG, geen update voor de updater"
fi
