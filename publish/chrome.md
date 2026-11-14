# Publishing on the Chrome Web Store

You need: a Google account, a one-time US$5 registration fee, the zip from `./package.sh`, the texts in [listing.md](listing.md), and the images in `images/`.

The same listing works for Chromium, Brave, Edge and other Chromium-based browsers: they install from the Chrome Web Store.

## One-time: developer account

1. Open https://chrome.google.com/webstore/devconsole and sign in with the Google account that should own the add-on.
2. Accept the developer agreement and pay the US$5 registration fee.
3. **Account** tab:
   - Publisher name (shown on the listing), for example `Kindler`.
   - Verify the contact email.
   - Trader declaration (EU rules): Kindler Dictionary is free and non-commercial, so declare **non-trader** unless that changes.

## First submission

1. In the developer console click **+ New item** and upload `kindler-dictionary-<version>.zip`.
2. **Store listing** tab:
   - Description: from [listing.md](listing.md)
   - Category: **Education** (or **Tools**)
   - Language: English
   - Store icon: `icons/icon-128.png`
   - Screenshots: `images/screenshot-1280x800.png`
   - Small promo tile: `images/promo-440x280.png`
   - Homepage URL and Support URL: the GitHub link
3. **Privacy** tab (paste these):
   - Single purpose:
     ```
     Look up the meaning of a selected German word in the Kindler Dictionary and show it next to the word.
     ```
   - Permission justifications:
     - `contextMenus`: `Adds the "Translate in Kindler" item to the right-click menu for selected text.`
     - `activeTab`: `Lets the add-on show the dictionary box on the current page, only after the user clicks the menu item.`
     - `scripting`: `Injects the script that draws the dictionary box next to the selected word, only after the user clicks the menu item.`
     - Host permission `https://kindler.ink/*`: `Fetches the dictionary entry for the selected word from kindler.ink, the dictionary's server.`
   - Remote code: **No, I am not using remote code**.
   - Data usage: tick **Website content** only (the selected word). Leave the rest unticked.
   - Tick all three certifications (not sold, not used for unrelated purposes, not used for credit).
   - Privacy policy URL: `https://github.com/kindlerz/KindlerDictionary/blob/master/PRIVACY.md`
4. **Distribution** tab: Free, **Public**, all regions.
5. **Submit for review.** Review usually takes a few days, sometimes longer for a first item. You get an email when it is approved or rejected. By default it is published right after approval.

## Updating to a new version

1. Follow "Every release" in [README.md](README.md) (bump version, test, `./package.sh`).
2. Developer console → **Kindler Dictionary** → **Package** → **Upload new package** → choose the new zip.
3. If permissions changed, update the **Privacy** tab first.
4. **Submit for review.** Users get the update automatically after approval.

## Good to know

- `manifest.json` has both `"service_worker"` (Chrome) and `"scripts"` (Firefox) under `background`. Chrome 121+ accepts this. If the upload ever complains about `scripts`, Chrome ignores the key, so it's only a warning.
- A rejection email names the policy and the part of the listing to fix. Fix it, then submit again from the same item. Don't create a new item.
- Unpacked testing: `chrome://extensions` → **Developer mode** → **Load unpacked** → the repo folder. After code changes, restart the browser rather than clicking reload: reloading an add-on loaded with `--load-extension` can switch it off.
