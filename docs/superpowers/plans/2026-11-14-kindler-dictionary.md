# Kindler Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firefox and Chrome add-on: select a word, right-click, and see its German → German meaning (English → German fallback) from kindler.ink in a small box on the page, with an "Open in new tab" button.

**Architecture:** Kindler gets `GET /dictionary/search.json?q=`, which reuses `dictionary.py`'s lookup and does the de → en fallback. The add-on (one MV3 source tree for both browsers) creates a selection context-menu item. Its background script fetches the JSON and injects `content.js`, which draws the box in a closed Shadow DOM.

**Tech Stack:** Python 3 / Flask / pytest / black (Kindler). Plain JavaScript WebExtensions MV3, no build step, no npm dependencies (add-on). Pillow for the icons.

**Spec:** `docs/superpowers/specs/2026-11-14-kindler-dictionary-design.md`

## Global Constraints

- Product name: `Kindler Dictionary`. Repo `kindlerz/KindlerDictionary`, local `KindlerDictionary`.
- Kindler repo: `Kindler`. Branch from the latest `origin/master` (the dictionary PR #70 is merged). Run CI's checks (black, pytest) before each commit.
- Gecko id: `kindler-dictionary@kindler.ink`.
- Permissions: `contextMenus`, `activeTab`, `scripting`. `host_permissions: ["https://kindler.ink/*"]`. Never `<all_urls>`.
- `data_collection_permissions.required`: the website-content type. Verify the exact name on https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/.
- Entry text is untrusted: build the DOM with `textContent` only, never `innerHTML`.
- `KINDLER = "https://kindler.ink"` constant in `background.js`. For local testing, swap it and add the local origin to `host_permissions`, then revert before committing.
- Context menu title: `Look up "%s" in Kindler Dictionary`.
- Small local commits. No push, no PR and no GitHub repo creation without asking the user.

## Review Focus

- Selection with surrounding punctuation or spaces (`„Haus,"`) → looked up as `Haus`. A selection that is only punctuation → nothing happens. (Task 2, manual case.)
- Query with `&`, `?`, `#` or a space (`Guten Tag`) must be URL-encoded (`encodeURIComponent`). The server must return the multi-word entry and never a broken URL. (Task 1 test `test_json_url_encodes_query`, Task 2 manual case.)
- Entry text that looks like HTML (`<b>Weg</b>` in the fixture) shows literally in the box and is never parsed. (Task 1 test `test_json_returns_raw_text`, Task 3 manual case.)
- A second lookup before the first answer arrives: one box only, showing the latest word. Ignore stale responses with a request counter. (Task 3.)
- A selection near the bottom of the viewport: the box flips above the selection and stays fully on screen. (Task 3.)

---

### Task 1: Kindler JSON endpoint

**Files:**
- Modify: `kindler/api/dictionary.py` (`search()` and a new route)
- Test: `tests/test_dictionary.py`

**Interfaces:**
- Produces (HTTP): `GET /dictionary/search.json?q=<word>` →
  `{"query", "lang", "entries": [{"shown", "lines": [[type, text], ...]}], "neighbours": [...], "url", "data_date"}`.
  `lang` is the language that matched, or `"de"` when nothing matched. `url` is the root-relative HTML page (`url_for("dictionary.search", lang=lang, q=query)`).
  Empty or whitespace-only `q` → 400 `{"error": "..."}`. Missing data → 503 `{"error": "..."}`.
- Produces (Python): `find_entries(lang, query) -> tuple[list[dict], list[str]]` (entries, neighbours). `search()` now calls it, and its HTML output stays unchanged.

- [ ] **Step 1: Branch.** `git fetch origin && git switch -c dictionary-json origin/master`. Check that `git status` is clean, apart from the untracked `session-continue`.

- [ ] **Step 2: Write the failing tests** in `tests/test_dictionary.py`, reusing the `data` and `client` fixtures:

```python
def test_json_german_hit(data, client):
    r = client.get("/dictionary/search.json?q=Haus")
    j = r.get_json()
    assert r.status_code == 200 and j["lang"] == "de" and j["query"] == "Haus"
    assert [e["shown"] for e in j["entries"]] == ["Haus", "haus → hausen"]
    assert j["entries"][0]["lines"][0] == ["@", "Haus"]
    assert j["neighbours"] == [] and j["url"] == "/dictionary/de/search?q=Haus"
    assert j["data_date"] == "Wiktionary 2026-11-01, OpenThesaurus 2026-11-09"

def test_json_falls_back_to_english(data, client):
    j = client.get("/dictionary/search.json?q=house").get_json()
    assert j["lang"] == "en" and j["entries"][0]["shown"] == "house → Haus"
    assert j["url"] == "/dictionary/en/search?q=house"

def test_json_no_match_returns_german_neighbours(data, client):
    j = client.get("/dictionary/search.json?q=hausa").get_json()
    assert j["lang"] == "de" and j["entries"] == []
    assert j["neighbours"] == ["hausen", "Straße"]

def test_json_returns_raw_text(data, client):
    j = client.get("/dictionary/search.json?q=Straße").get_json()
    assert [" ", "[1] <b>Weg</b>"] in j["entries"][0]["lines"]

def test_json_url_encodes_query(data, client):
    j = client.get("/dictionary/search.json?q=a%26b").get_json()
    assert j["url"] == "/dictionary/de/search?q=a%26b"

def test_json_empty_query_is_400(data, client):
    r = client.get("/dictionary/search.json?q=%20")
    assert r.status_code == 400 and "error" in r.get_json()

def test_json_missing_data_is_503(tmp_path, monkeypatch, client):
    monkeypatch.setattr(dictionary, "DATA_DIR", tmp_path)
    r = client.get("/dictionary/search.json?q=haus")
    assert r.status_code == 503 and "error" in r.get_json()
```

- [ ] **Step 3: Run** `pytest tests/test_dictionary.py -v`. Expected: the 7 new tests FAIL (404), the old ones PASS.

- [ ] **Step 4: Implement.** Move the entry building out of `search()` (lookup, exact spelling first, one entry per offset) into `find_entries(lang, query)`. `search()` calls it. Add `@dictionary_bp.route("/search.json") def search_json()`: strip `q`, try `de`, and if there are no entries try `en`, else keep `de`'s neighbours. Return `jsonify(...)`, using the same data-missing check and `logging.error` as `search()`. The `/search.json` rule must not be swallowed by `/<lang>/search`; it can't be, because the paths differ.

- [ ] **Step 5: Run** `black --check kindler tests && pytest -q`. Expected: all pass, including the 7 new tests (the old count was 125).

- [ ] **Step 6: Commit.** `git add kindler/api/dictionary.py tests/test_dictionary.py && git commit -m "Add JSON dictionary endpoint with English fallback"`.

---

### Task 2: Add-on spike against the local Kindler (show the user)

**Files (in `KindlerDictionary`):**
- Create: `manifest.json`, `background.js`, `content.js`, `.gitignore` (`*.zip`)

**Interfaces:**
- Consumes: the Task 1 endpoint, running locally (see the vault note `kindler-local-run` for how to start Kindler and on which port).
- Produces: messages from background to content `{type: "show", id, rect?}` and `{type: "result", id, word, data}` / `{type: "error", id, word}`. Message from content to background `{type: "open", url}`.

- [ ] **Step 1: `git init`** in the folder (the `docs/` folder already exists there). Commit the docs: `git add docs && git commit -m "Add design and plan"`.

- [ ] **Step 2: Write `manifest.json`.** `manifest_version: 3`, name `Kindler Dictionary`, version `0.1.0`, the Global Constraints permissions, `background: {service_worker: "background.js", scripts: ["background.js"]}`, and `browser_specific_settings.gecko` with the id, `strict_min_version: "140.0"` (the data-consent minimum) and `data_collection_permissions`. Use `const api = globalThis.browser ?? chrome;` in the JS.

- [ ] **Step 3: Write `background.js`.**
  - `runtime.onInstalled` creates the menu item `{id: "lookup", title, contexts: ["selection"]}`.
  - `contextMenus.onClicked`: `word = cleanWord(info.selectionText)`. `cleanWord` trims whitespace and `\p{P}` at both ends (Unicode regex). If the result is empty, return.
  - Inject with `scripting.executeScript({target: {tabId, frameIds: [info.frameId ?? 0]}, files: ["content.js"]})`. On rejection, retry with `frameIds: [0]` and send `rect: null`, so the box goes top-right.
  - Fetch `${KINDLER}/dictionary/search.json?q=${encodeURIComponent(word)}`, then `tabs.sendMessage(tabId, msg, {frameId})`.
  - `runtime.onMessage` `{type: "open"}` → `tabs.create({url})`.

- [ ] **Step 4: Write `content.js`, rough version.** Guard against double injection (`if (window.__kindlerDict) return;`). The box is a fixed host plus a closed shadow root, placed below the selection rect, and renders the entries with `textContent` per the spec's type mapping. Leave styling plain.

- [ ] **Step 5: Load and look.**
  - Firefox: `about:debugging` → Load Temporary Add-on → `manifest.json`.
  - Chrome: `chrome://extensions` → Developer mode → Load unpacked.
  - On a German news page, look up `Haus`, `house` and `Straße`. Take a screenshot of the box and **show it to the user, then wait for their reactions** before Task 3.

- [ ] **Step 6: Commit** (with `KINDLER` set back to `https://kindler.ink`). `git add -A && git commit -m "Add spike: context menu lookup with in-page box"`.

---

### Task 3: Finish the box

**Files:**
- Modify: `content.js`, `background.js`

**Interfaces:**
- Consumes: the Task 2 messages.

- [ ] **Step 1: Apply the user's spike feedback first.**

- [ ] **Step 2: Box behaviour, per the spec:**
  - "Looking up…" state.
  - About 380 px wide, max height about 360 px, scrolls inside.
  - Flips above the selection when there's no room below, and is clamped to the viewport.
  - `rect: null` → top-right corner.
  - One box at a time. A request `id` counter drops stale results.
  - Closes with Esc, a click outside, or the × button.
  - "English → German" note when `lang === "en"`.
  - No-match text: `No entry for "<word>". Nearby:` followed by the neighbours.
  - Error text: `Kindler Dictionary is unreachable.`
  - Footer: an **Open in new tab** button (`KINDLER + data.url`, or `/dictionary/de/search?q=` on error), plus the attribution line with `data_date`, Wiktionary CC BY-SA and OpenThesaurus.
  - Dark mode via `prefers-color-scheme`.

- [ ] **Step 3: Manual check, both browsers, local Kindler.** Every Review Focus line. Also: a page with a strict CSP (e.g. github.com), a same-origin iframe, and a cross-origin iframe (top-right fallback). Expected: everything behaves as described, and the page layout is untouched.

- [ ] **Step 4: Commit.** `git commit -am "Finish lookup box: placement, states, closing, attribution"`.

---

### Task 4: Icons, README, packaging

**Files:**
- Create: `icons/icon-16.png`, `icons/icon-32.png`, `icons/icon-48.png`, `icons/icon-128.png`, `README.md`
- Modify: `manifest.json` (`icons`, `action` not needed)

- [ ] **Step 1: Icons.** Use Pillow and `/usr/share/fonts/liberation/LiberationSerif-Bold.ttf`: a white `K` (254,254,254) centred on #222222, sized to fill the square like `Kindler/kindler/static/favicon.ico`. Draw each size directly; don't scale one size down. Compare against the favicon at 16 and 32 px. The draw script stays out of the repo (scratchpad).

- [ ] **Step 2: README** in wifzf's style (vault note `readme-style-like-wifzf`): what it is, a screenshot of the box, install from the stores (placeholder links), load unpacked for development, how to point it at a local Kindler, privacy (only the selected word goes to kindler.ink, only when you click), credits (wort, Wiktionary CC BY-SA, OpenThesaurus).

- [ ] **Step 3: Package.** Run `zip -r kindler-dictionary-0.1.0.zip manifest.json background.js content.js icons`. Load the zip's contents once in each browser to confirm it works.

- [ ] **Step 4: Commit.** `git add icons README.md manifest.json && git commit -m "Add icons and README"`.

---

### Task 5: Ship (each step gated by the user)

- [ ] **Step 1:** Ask the user, then push Kindler's `dictionary-json` and open the PR. The user merges it, which deploys.
- [ ] **Step 2:** Check that `curl -s 'https://kindler.ink/dictionary/search.json?q=Haus'` returns `"lang": "de"` with entries.
- [ ] **Step 3:** Run both add-ons (with `KINDLER = "https://kindler.ink"`) through `Haus`, `house` and `hausa`, plus the open-in-new-tab button.
- [ ] **Step 4:** Ask the user before creating `kindlerz/KindlerDictionary` and pushing (scan files and history for hosts, IPs and secrets first). The user uploads the zips to AMO and the Chrome Web Store.
