const api = globalThis.browser ?? chrome;
const KINDLER = "https://kindler.ink";
let lastId = 0;

// menus survive reloads and updates; recreate so a changed title applies (create() rejects a duplicate id)
api.runtime.onInstalled.addListener(async () => {
  await api.contextMenus.removeAll();
  api.contextMenus.create({
    id: "lookup",
    title: 'Translate "%s" in Kindler',
    contexts: ["selection"],
  });
});

// „Haus," -> Haus; inner punctuation (geht's, E-Mail) stays; one trailing "." stays for
// abbreviations (usw.), Kindler retries without it. Soft hyphens and zero-width spaces go.
function cleanWord(text) {
  const s = (text || "").replace(/[­​]/g, "").replace(/^[\s\p{P}]+/u, "");
  const tail = s.match(/[\s\p{P}]*$/u)[0];
  const body = s.slice(0, s.length - tail.length);
  return body && tail.includes(".") ? `${body}.` : body;
}

api.contextMenus.onClicked.addListener(async (info, tab) => {
  const word = cleanWord(info.selectionText);
  if (!word) return;
  const id = ++lastId;
  const pageUrl = `${KINDLER}/dictionary/de/search?q=${encodeURIComponent(word)}`;
  let frameId = info.frameId ?? 0;
  let corner = false;
  const inject = (frame) => api.scripting.executeScript({ target: { tabId: tab.id, frameIds: [frame] }, files: ["content.js"] });
  const send = (msg) => api.tabs.sendMessage(tab.id, { id, word, ...msg }, { frameId });
  try {
    try {
      await inject(frameId);
    } catch {
      // activeTab does not cover cross-origin iframes: show the box in the top page instead
      frameId = 0;
      corner = true;
      await inject(0);
    }
    await send({ type: "show", corner });
  } catch {
    // pages no add-on may touch (Reader View, PDF viewer, store pages): use the full page instead
    api.tabs.create({ url: pageUrl });
    return;
  }
  try {
    const r = await fetch(`${KINDLER}/dictionary/search.json?q=${encodeURIComponent(word)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    await send({ type: "result", data, url: KINDLER + data.url });
  } catch {
    await send({ type: "error", url: pageUrl });
  }
});

api.runtime.onMessage.addListener((msg) => {
  if (msg.type === "open" && msg.url.startsWith(`${KINDLER}/`)) api.tabs.create({ url: msg.url });
});
