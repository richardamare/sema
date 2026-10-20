#!/usr/bin/env bash
# Installs or updates Sema from the latest GitHub release into /Applications.
# curl does not quarantine downloads, so the unsigned app opens without a
# Gatekeeper prompt.
set -euo pipefail

REPO=richardamare/sema

if [[ "$(uname -s)/$(uname -m)" != "Darwin/arm64" ]]; then
  echo "Sema builds are published for Apple silicon Macs only." >&2
  exit 1
fi

url=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -o '"browser_download_url": *"[^"]*\.dmg"' | head -1 | cut -d '"' -f 4)
if [[ -z "$url" ]]; then
  echo "No DMG on the latest release of $REPO." >&2
  exit 1
fi

work=$(mktemp -d)
mount="$work/mount"
trap 'hdiutil detach -quiet "$mount" 2>/dev/null || true; rm -rf "$work"' EXIT

echo "Downloading ${url##*/}"
curl -fL --progress-bar -o "$work/Sema.dmg" "$url"
hdiutil attach -quiet -nobrowse -readonly -mountpoint "$mount" "$work/Sema.dmg"

if pgrep -xq Sema; then
  echo "Quitting Sema"
  osascript -e 'quit app "Sema"'
  while pgrep -xq Sema; do sleep 1; done
fi

rm -rf /Applications/Sema.app
cp -R "$mount/Sema.app" /Applications/
xattr -dr com.apple.quarantine /Applications/Sema.app 2>/dev/null || true
echo "Installed /Applications/Sema.app"
