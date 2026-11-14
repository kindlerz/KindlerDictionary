#!/bin/sh
# Builds kindler-dictionary-<version>.zip for AMO and the Chrome Web Store:
# only the files the add-on needs, manifest.json at the top of the zip.
set -eu
cd "$(dirname "$0")"
version=$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' manifest.json)
[ -n "$version" ] || { echo "no version in manifest.json" >&2; exit 1; }
out="kindler-dictionary-$version.zip"
rm -f "$out"
zip -qr "$out" manifest.json background.js content.js icons
echo "$out"
