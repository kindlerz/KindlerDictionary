# Publishing Kindler Dictionary

Step-by-step guides for the two stores:

- [firefox.md](firefox.md): addons.mozilla.org (AMO)
- [chrome.md](chrome.md): Chrome Web Store (also used by Chromium, Brave, Edge users)
- [listing.md](listing.md): the texts both stores ask for, ready to paste
- `images/`: store screenshot (1280×800) and Chrome promo tile (440×280). The store icon is `icons/icon-128.png`.

## Every release

1. Make sure kindler.ink serves the dictionary JSON the add-on needs:
   ```
   $ curl -s 'https://kindler.ink/dictionary/search.json?q=Haus' | head -c 200
   ```
   It must answer with `{"data_date": ...` and entries, not an error page.
2. Test the add-on unpacked in both browsers (see the main [README](../README.md#from-source)): a German word, an English word (`yesterday`), `usw.`, **Open in new tab**.
3. Version:
   - Patch release (`0.1.0` → `0.1.1`): do nothing. The release workflow bumps it.
   - Minor or major release: set `"version"` in `manifest.json` in your pull request (for example `0.2.0`).
4. Merge the pull request to master. The [release workflow](../.github/workflows/release.yml) runs the tests, lints the zip, bumps the version if its tag already exists, tags it (for example `v0.1.1`) and creates a GitHub release with the zip.
5. Download the zip:
   ```
   $ gh release download v0.1.1 -R kindlerz/KindlerDictionary -D /tmp/kindler
   ```
   Or from the [releases page](https://github.com/kindlerz/KindlerDictionary/releases). The same zip goes to both stores.
6. Upload: [Firefox](firefox.md#updating-to-a-new-version), [Chrome](chrome.md#updating-to-a-new-version).

## If you change permissions or what is sent

Adding a permission, a new website in `host_permissions`, or sending more than the selected word means:

- update [PRIVACY.md](../PRIVACY.md),
- Firefox: update `data_collection_permissions` in `manifest.json` and the privacy policy on AMO,
- Chrome: update the **Privacy practices** tab (permission justifications, data usage).

Users get asked to approve new permissions again, and both stores may review the add-on by hand.

## If a release run fails

If it failed after it pushed the `Release v<version>` commit, push a new commit instead of re-running it: a re-run checks out the old commit and its push fails. If it failed after pushing the tag but before the release, create that release by hand: `gh release create v<version> kindler-dictionary-<version>.zip --title "Release v<version>" --generate-notes` (zip from `./package.sh` on that tag).

## Building the zip locally

`./package.sh` builds `kindler-dictionary-<version>.zip` with only the add-on's files, for testing or if you need it without a GitHub release.
