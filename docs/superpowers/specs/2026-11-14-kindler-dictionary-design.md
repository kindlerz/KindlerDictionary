# Kindler Dictionary — browser add-on design

Date: 2026-11-14. Status: approved.

## Intent

The user reads German text in the browser (news and anything else) to improve
their German. Today they use the LEO add-on, which translates German → English.
They want to stop translating into English and see German explanations
instead: select a German word, right-click, and read its meaning from Kindler's
German → German dictionary (kindler.ink `/dictionary`, built on wort's data) in
a small box on the page. One click opens the full entry in a new tab.

## Goals

- Firefox and Chrome add-on named **Kindler Dictionary**.
- Select a word, right-click, choose `Translate "…" in Kindler`, shown with the add-on icon (user feedback on the spike, 2026-11-14).
- A small box appears next to the selection, on the page, without opening a tab.
  It shows the entries.
- The box has an **Open in new tab** button that opens the existing Kindler
  results page for that word.
- German → German by default. If the word has no German entry, it falls back to
  English → German.

## Non-goals

- No offline mode and no bundled data. The add-on asks kindler.ink.
- No lookup by hovering or double-clicking, and no lookup without a selection.
- No German → English translation.
- No options page and no language picker.
- Not publishing to the stores as part of this work. The user does that.

## Anti-goals (a failure even if it works)

- The page's CSS breaks the box, or the box breaks the page's layout.
- Asking for "read and change all your data on all websites" at install time.
- A second copy of the dictionary logic (`fold()`, the index parsing) in
  JavaScript.

## Constraints

- One source tree for both browsers (Manifest V3, the WebExtensions API).
- Kindler work branches from the latest `master` (the `dictionary` branch is
  already merged, PR #70). It follows Kindler's CI: black and pytest
  ([[kindler-ci-checks]]).
- Entry text comes from Wiktionary, so it is untrusted. Render it as text and
  never as HTML.

## Approaches considered

**Where the data comes from:**

1. *Online, through a small JSON endpoint in Kindler.* **Picked.** The add-on
   stays tiny, the data updates when Kindler bumps `WORT_VERSION`, and the logic
   stays in `dictionary.py`.
2. *Online, scraping the HTML results page.* This breaks whenever the template
   changes.
3. *Offline, bundling wort's data* (about 128 MB). This is near the AMO size
   limit, needs a slow first import into IndexedDB, means a store release for
   every data update, and puts `fold()` in a third place.

**Where the small window appears:**

1. *A floating box in the page next to the selection* (content script, Shadow
   DOM). **Picked.** It works like LEO and looks the same in both browsers.
2. *A separate small browser window.* It steals focus and opens away from the
   word.
3. *The toolbar action popup.* Chrome can't reliably open it from a context
   menu click, and it appears far from the word.

**Where the German → English fallback happens:**

1. *On the server, in the JSON endpoint.* **Picked.** One request, and the rule
   lives in one place.
2. *In the add-on, with two requests.* This doubles the round trips for English
   words and duplicates the rule.

## Design

### Part 1: Kindler JSON endpoint (repo kindlerz/Kindler)

`GET /dictionary/search.json?q=<word>`

- Look `q` up in `de` (`wort.idx`). If there are no matches, look it up in `en`
  (`wort-en.idx`). If neither matches, return `de`'s neighbours.
- Response (`application/json`):
  ```json
  {
    "query": "Haus",
    "lang": "de",
    "entries": [{"shown": "Haus", "lines": [["@", "Haus"], ["#", "Substantiv, Neutrum"]]}],
    "neighbours": [],
    "url": "/dictionary/de/search?q=Haus",
    "data_date": "Wiktionary 2026-11-01, OpenThesaurus 2026-11-09"
  }
  ```
  `lang` is the language that matched (or `de` when neither matched). `url` is
  the HTML results page for that language, which the add-on opens in a new tab.
- Empty `q` → 400 with `{"error": "..."}`. Missing data → 503 with
  `{"error": "..."}`, matching the HTML route's log line.
- Pull the entry building in `search()` (lookup, exact spelling first, one per
  record) into a helper that both `search()` and the JSON route call, so the
  HTML and JSON results stay identical.
- No CORS headers. The add-on fetches from its background script with
  `host_permissions`, and that bypasses CORS in both browsers.
- No rate limit, the same as the HTML dictionary page (the abuse guard only
  covers conversions).
- Tests in `tests/test_dictionary.py` with the existing tiny-data fixture:
  German hit, English fallback (`house` → `en`), no match → neighbours, empty
  `q` → 400, missing data → 503.

### Part 2: The add-on (new repo kindlerz/KindlerDictionary)

Local folder: `KindlerDictionary`.

```
manifest.json      MV3, one manifest for both browsers
background.js      context menu, fetch, inject, open tab
content.js         draws the box (Shadow DOM)
icons/16,32,48,128.png
README.md
```

**manifest.json:**
- `"background": {"service_worker": "background.js", "scripts": ["background.js"]}`.
  Chrome uses `service_worker` and Firefox uses `scripts`. Both browsers accept
  the other key, from Chrome 121 and Firefox 121.
- `browser_specific_settings.gecko.id` = `kindler-dictionary@kindler.ink`
  (user decision; permanent once published).
- `browser_specific_settings.gecko.data_collection_permissions`: `required`
  declares the website-content data type, because the selected text goes to
  kindler.ink (user decision; Firefox shows a consent line at install). Check
  the exact type name against Mozilla's Extension Workshop "Firefox built-in
  consent" page. The Chrome Web Store disclosure is filled in by the user when
  uploading.
- Permissions: `contextMenus`, `activeTab`, `scripting`.
  `host_permissions: ["https://kindler.ink/*"]`. No `<all_urls>`: `activeTab` is
  granted by the context menu click, which is enough to inject `content.js`.

**Flow:**
1. On install: create the context menu item
   `Translate "%s" in Kindler`, `contexts: ["selection"]`.
2. On click: `word = info.selectionText`, trimmed of whitespace and of
   punctuation at either end. If it is empty, do nothing.
3. Inject `content.js` into `tab.id` / `info.frameId` (so selections inside
   same-origin iframes work). If that injection fails (a cross-origin iframe,
   which `activeTab` does not cover), inject into the top frame (frame 0) and
   show the box in the top-right corner (my call; no extra permissions). Then
   tell it to show the box in a "Looking up…" state at the
   selection's `getBoundingClientRect()`.
4. Background fetches `https://kindler.ink/dictionary/search.json?q=<word>` and
   sends the result (or the error) to the content script, which fills the box.
5. **Open in new tab** → the content script asks the background to
   `tabs.create({url: KINDLER + result.url})`. On an error with no `url`, it
   opens `/dictionary/de/search?q=<word>`.

**The box:**
- A fixed-position host element with a closed Shadow DOM and its own small
  stylesheet. It sits below the selection (above it if there is no room), is
  about 380 px wide with a max height of about 360 px, and scrolls inside.
- Rendering mirrors `result_dictionary.html`: `@` heading, `#` bold, `:`
  sub-heading, `>` italic quote, space → plain line. Show the `shown` line when
  it has a `→` in it. Several entries are separated by a rule. Everything is
  built with `textContent`, never `innerHTML`.
- No match: `No entry for "<word>". Nearby:` followed by the neighbours as plain
  text.
- If the English fallback matched, a small note "English → German".
- Footer: an **Open in new tab** button, plus a small data/attribution line
  (Wiktionary CC BY-SA, OpenThesaurus) as on the page.
- Closes with Esc, a click outside, the × button, or a new lookup (one box at a
  time).
- Errors (offline, 5xx): "Kindler Dictionary is unreachable." with the
  **Open in new tab** button still shown.

**Base URL:** a `KINDLER = "https://kindler.ink"` constant in `background.js`.
To test against a local Kindler, edit it and add the local origin to
`host_permissions`.

**Icon:** Kindler's favicon (a white serif "K" on #222222) redrawn at 16, 32,
48 and 128 px, because the `.ico` only has 16 and 32. It is drawn with Pillow
and Liberation Serif Bold, with the K scaled to fill the square like the
favicon.

**Packaging:** `zip` the folder for each store. No build step and no npm
dependencies.

### Order of work

1. Kindler endpoint on a new branch from `origin/master`, with tests. Commit
   locally.
2. **Spike first:** a rough add-on against the local Kindler, showing the box
   with real entries. The user sees it and reacts before the full build
   ([[spike-ui-before-full-build]]).
3. Full add-on, icons, README (wifzf style), manual test in Firefox and Chrome
   against the local Kindler.
4. Open the Kindler PR (after asking). The user merges it, which deploys to
   kindler.ink. Then do a final check of both add-ons against kindler.ink before
   the user uploads them to the stores (user decision: this is "done").
5. Small local commits. Nothing is pushed and no GitHub repo is created without
   asking.

## Left to the builder

- The exact punctuation set that is trimmed from the selection.
- The box's colours, fonts and dark mode handling (keep it plain and readable;
  following `prefers-color-scheme` is fine).
- The Kindler branch name and the helper's name.
- Whether to add a tiny self-check for the add-on's rendering function.
