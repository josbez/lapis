#!/bin/bash
# Brengt een nieuwe Lapis uit, vanaf de Mac van Jos (zoals Usage Meter).
#   ./scripts/release.sh
#
# 1. Controleert dat de versie in de drie bestanden gelijk is en nog niet
#    uitgebracht is.
# 2. Bouwt de DMG en de gesigneerde update (make-dmg.sh, met ~/.tauri/lapis.key).
# 3. Zet de tag en maakt de GitHub-release met Lapis.dmg, Lapis.app.tar.gz en
#    latest.json — via `gh` als die er is, anders staat er wat je moet uploaden.
#
# Zonder latest.json in de release blijft elke geïnstalleerde Lapis stil op
# de vorige versie; daarom weigert dit script een build zonder sleutel.
set -euo pipefail
cd "$(dirname "$0")/.."

V_PKG=$(node -p "require('./app/package.json').version")
V_CONF=$(node -p "require('./app/src-tauri/tauri.conf.json').version")
V_CARGO=$(sed -n 's/^version = "\(.*\)"/\1/p' app/src-tauri/Cargo.toml | head -1)
if [ "$V_PKG" != "$V_CONF" ] || [ "$V_PKG" != "$V_CARGO" ]; then
    echo "✗ versies verschillen: package.json $V_PKG, tauri.conf.json $V_CONF, Cargo.toml $V_CARGO" >&2
    exit 1
fi
TAG="v$V_PKG"

git fetch -q --tags origin
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
    echo "✗ $TAG bestaat al — zet eerst een nieuwe versie in de drie bestanden" >&2
    exit 1
fi
[ -z "$(git status --porcelain)" ] || { echo "✗ er staan nog wijzigingen open" >&2; exit 1; }

[ -f "$HOME/.tauri/lapis.key" ] || [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ] \
    || { echo "✗ geen updater-sleutel op ~/.tauri/lapis.key" >&2; exit 1; }

./scripts/make-dmg.sh
[ -f latest.json ] || { echo "✗ latest.json ontbreekt na de build" >&2; exit 1; }

git tag "$TAG"
git push origin "$TAG"

if command -v gh >/dev/null; then
    gh release create "$TAG" Lapis.dmg Lapis.app.tar.gz latest.json \
        --title "Lapis $TAG" --generate-notes
    echo "✓ $TAG uitgebracht"
else
    echo "✓ tag $TAG gepusht. Maak de release op GitHub (Releases → Draft a new release,"
    echo "  tag $TAG) en upload deze drie bestanden:"
    echo "    $(pwd)/Lapis.dmg"
    echo "    $(pwd)/Lapis.app.tar.gz"
    echo "    $(pwd)/latest.json"
fi
