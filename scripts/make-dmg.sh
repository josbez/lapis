#!/bin/bash
# Bouwt Lapis.app (universal: Apple Silicon + Intel) en verpakt 'm in een
# deelbare DMG, met install.sh en een snelkoppeling naar /Applications.
#   ./scripts/make-dmg.sh
# Draait op macOS — lokaal of in .github/workflows/release.yml.
#
# Met TAURI_SIGNING_PRIVATE_KEY (en _PASSWORD) in de omgeving maakt hij ook
# de update: Lapis.app.tar.gz, de handtekening en latest.json, die de
# updater in de app van de laatste release haalt. Zonder sleutel alleen de DMG.
#
# De DMG maken we zelf met hdiutil in plaats van via Tauri's dmg-bundler: die
# stuurt Finder aan met AppleScript en dat hapert op CI-runners zonder scherm.
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(uname)" = Darwin ] || { echo "✗ alleen op macOS" >&2; exit 1; }

TARGET=universal-apple-darwin
rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null

UPDATER=()
if [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
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
    echo "⚠ geen TAURI_SIGNING_PRIVATE_KEY — alleen de DMG, geen update voor de updater"
fi
