// Loads background.js with a stubbed browser API: node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function load({ inject = async () => {} } = {}) {
  const calls = { created: [], sent: [] };
  let onClicked;
  const browser = {
    runtime: { onInstalled: { addListener() {} }, onMessage: { addListener() {} } },
    contextMenus: { onClicked: { addListener: (f) => (onClicked = f) } },
    scripting: { executeScript: inject },
    tabs: { create: (o) => calls.created.push(o.url), sendMessage: async (_t, m) => calls.sent.push(m) },
  };
  const fetch = async () => ({ ok: true, json: async () => ({ url: "/dictionary/de/search?q=Haus", lang: "de", entries: [] }) });
  const ctx = vm.createContext({ browser, fetch });
  vm.runInContext(readFileSync(new URL("../background.js", import.meta.url), "utf8"), ctx);
  return { ctx, calls, click: (text) => onClicked({ selectionText: text, frameId: 0 }, { id: 1 }) };
}

test("cleanWord trims punctuation but keeps one trailing period", () => {
  const { ctx } = load();
  const c = (s) => vm.runInContext(`cleanWord(${JSON.stringify(s)})`, ctx);
  assert.equal(c("„Haus,“"), "Haus");
  assert.equal(c(" usw. "), "usw.");
  assert.equal(c("z. B."), "z. B.");
  assert.equal(c("Haus.“"), "Haus.");
  assert.equal(c("geht's"), "geht's");
  assert.equal(c("..."), "");
  assert.equal(c("„“"), "");
});

test("cleanWord drops soft hyphens and zero-width spaces", () => {
  const { ctx } = load();
  assert.equal(vm.runInContext(`cleanWord("Haus\\u00ADt\\u200Bür")`, ctx), "Haustür");
});

test("refused injection opens the page in a new tab", async () => {
  const { calls, click } = load({ inject: async () => { throw new Error("Missing host permission"); } });
  await click("Haus");
  assert.deepEqual(calls.created, ["https://kindler.ink/dictionary/de/search?q=Haus"]);
});

test("normal lookup sends show then result", async () => {
  const { calls, click } = load();
  await click("Haus");
  assert.deepEqual(calls.sent.map((m) => m.type), ["show", "result"]);
  assert.equal(calls.created.length, 0);
});
