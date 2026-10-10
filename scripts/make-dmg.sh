#!/bin/bash
# Bouwt Lapis.app (universal: Apple Silicon + Intel) en verpakt 'm in een
# deelbare DMG, met install.sh en een snelkoppeling naar /Applications.
#   ./scripts/make-dmg.sh
# Draait op macOS — lokaal of in .github/workflows/release.yml.
#
# De DMG maken we zelf met hdiutil in plaats van via Tauri's dmg-bundler: die
# stuurt Finder aan met AppleScript en dat hapert op CI-runners zonder scherm.
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(uname)" = Darwin ] || { echo "✗ alleen op macOS" >&2; exit 1; }

TARGET=universal-apple-darwin
rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null

(cd app && npm ci && npx tauri build --target "$TARGET" --bundles app)

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
