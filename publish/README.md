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
2. Raise `"version"` in `manifest.json` (for example `0.1.0` → `0.1.1`). Both stores reject a version they already have.
3. Test the add-on unpacked in both browsers (see the main [README](../README.md#from-source)): a German word, an English word (`yesterday`), `usw.`, **Open in new tab**.
4. Build the zip:
   ```
   $ ./package.sh
   kindler-dictionary-0.1.1.zip
   ```
   The same zip goes to both stores.
5. Commit, tag and push:
   ```
   $ git commit -am "Release 0.1.1"
   $ git tag v0.1.1
   $ git push && git push --tags
   ```
6. Upload: [Firefox](firefox.md#updating-to-a-new-version), [Chrome](chrome.md#updating-to-a-new-version).

## If you change permissions or what is sent

Adding a permission, a new website in `host_permissions`, or sending more than the selected word means:

- update [PRIVACY.md](../PRIVACY.md),
- Firefox: update `data_collection_permissions` in `manifest.json` and the privacy policy on AMO,
- Chrome: update the **Privacy practices** tab (permission justifications, data usage).

Users get asked to approve new permissions again, and both stores may review the add-on by hand.
