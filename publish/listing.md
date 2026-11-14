# Store listing texts

Paste these into AMO and the Chrome Web Store.

## Name

```
Kindler Dictionary
```

## Summary (short description)

AMO allows 250 characters, Chrome 132. This one is 124:

```
German → German dictionary: select a word, right-click "Translate in Kindler", and read its German meaning next to the word.
```

## Description

```
Learning German? Read German meanings, not English translations.

Select a word on any page, right-click and choose Translate "word" in Kindler. A small box opens next to the word with its German Wiktionary entry: meanings, examples, grammar. "Open in new tab" shows the full entry on kindler.ink.

• German → German by default; words without a German entry are looked up English → German
• Abbreviations like "usw." and "z. B." work
• Close with Esc, a click outside, or ×
• Follows your light/dark theme

Only the selected word is sent to kindler.ink, and only when you click the menu item. The add-on cannot read pages on its own.

Data: German Wiktionary (CC BY-SA 4.0) and OpenThesaurus, via wort.
Source code: https://github.com/kindlerz/KindlerDictionary
```

## Links

- Homepage / support: `https://github.com/kindlerz/KindlerDictionary`
- Privacy policy URL: `https://github.com/kindlerz/KindlerDictionary/blob/master/PRIVACY.md`
- License: GNU General Public License v3.0

## Privacy policy text (AMO asks for the text itself)

Copy the body of [PRIVACY.md](../PRIVACY.md).

## Notes for reviewers

```
Test: select "Haus" on any page, right-click → Translate "Haus" in Kindler. Also try "yesterday" (English → German fallback) and "usw.".
Backend: https://kindler.ink/dictionary/search.json?q=Haus
Source (no build step, the zip is the source): https://github.com/kindlerz/KindlerDictionary
```
