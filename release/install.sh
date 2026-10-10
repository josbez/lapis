#!/bin/bash
# Haalt Lapis langs Gatekeeper. De app is niet door Apple genotariseerd; zonder
# deze stap weigert macOS de eerste start ("kan niet worden geopend").
# Vereist: Lapis.app staat al in /Applications.
set -e

APP=/Applications/Lapis.app

if [ ! -d "$APP" ]; then
    echo "✗ $APP niet gevonden. Sleep Lapis eerst naar Applications."
    exit 1
fi

xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true

echo "✓ Lapis staat klaar. Open het vanuit Applications of Spotlight."
echo "  Tip: zet je vault eerst onder git (git init && git add -A && git commit -m vangnet)."
