# Publishing on Firefox (addons.mozilla.org)

You need: a Mozilla account, the zip from the GitHub release (see [README.md](README.md)), and the texts in [listing.md](listing.md).

## First submission

1. **Sign in** at https://addons.mozilla.org/developers/ with your Mozilla account. Accept the Developer Agreement if asked.
2. Click **Submit a New Add-on** → **On this site** (a public listing; Firefox updates it for users).
3. **Upload** `kindler-dictionary-<version>.zip`.
   - Platforms: tick **Firefox**, untick **Firefox for Android** (Android has no right-click menu for add-ons).
   - Wait for the automatic validation. Warnings are fine; errors must be fixed first.
4. **Source code:** answer **No**. Nothing is minified, bundled or generated.
5. **Describe the add-on** (from [listing.md](listing.md)):
   - Name, Summary, Description
   - Category: **Language Support**
   - Homepage and Support website: the GitHub link
   - Support email: optional (it is shown publicly)
   - License: **GNU General Public License v3.0**
   - Privacy policy: tick **This add-on has a privacy policy** and paste the body of [PRIVACY.md](../PRIVACY.md)
   - Notes to reviewer: the text under "Notes for reviewers"
6. **Submit Version.** Listed add-ons are usually signed and public within minutes to a few hours after the automatic check. A human review can follow later; you get an email if they want changes.
7. **Screenshot:** on the add-on's page in the Developer Hub, **Edit Product Page** → **Images** → upload `images/screenshot-1280x800.png`.
8. **Check:** install it from AMO in normal Firefox, restart Firefox completely, select a word, and make sure **Translate "…" in Kindler** is in the right-click menu and works.
9. **README:** in the main [README](../README.md), replace the Firefox `(#) (coming soon)` link with the add-on's AMO page (`https://addons.mozilla.org/firefox/addon/<slug>/`, shown on the Developer Hub). Commit and push.

## Updating to a new version

1. Follow "Every release" in [README.md](README.md) (test, merge, download the zip).
2. https://addons.mozilla.org/developers/ → **Kindler Dictionary** → **Upload New Version**.
3. Upload the new zip; platforms Firefox only; source code **No**.
4. Optional "Release notes" (shown to users) and "Notes to reviewer".
5. **Submit Version.** Users get the update automatically within a day.

## Data usage

AMO has no data-usage form. Firefox reads it from `manifest.json`:

```json
"data_collection_permissions": { "required": ["websiteContent"] }
```

- `websiteContent`: the selected text goes to kindler.ink. It is `required` because the add-on can't work without it; Firefox shows it at install and the user accepts it with the install.
- Nothing else is declared: no browsing history (`browsingActivity`), no clicks or typing (`websiteActivity`), no personal data, no `technicalAndInteraction` (no analytics or crash reports).
- If the add-on ever sends more, add the matching type here and update [PRIVACY.md](../PRIVACY.md) and the privacy policy on AMO. The full list of types: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/

## Good to know

- The add-on ID `kindler-dictionary@kindler.ink` (in `manifest.json`) is permanent. Never change it, or AMO treats it as a different add-on.
- `strict_min_version` is `140.0`: the first Firefox that understands `data_collection_permissions`. At install, Firefox shows that the add-on sends "website content" (the selected word).
- If users report the menu item does nothing: `about:addons` → Kindler Dictionary → **Permissions** → allow access to kindler.ink.
- Optional: uploads can also be done from the command line with `npx web-ext sign --channel=listed` and an API key from Developer Hub → **Tools** → **Manage API Keys**. The web form above is simpler for occasional releases.
