const api = globalThis.browser ?? chrome;
const KINDLER = "https://kindler.ink";
let lastId = 0;

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: "lookup",
    title: 'Look up "%s" in Kindler Dictionary',
    contexts: ["selection"],
  });
});

// „Haus," -> Haus; inner punctuation (geht's, E-Mail) stays
function cleanWord(text) {
  return (text || "").replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "");
}

api.contextMenus.onClicked.addListener(async (info, tab) => {
  const word = cleanWord(info.selectionText);
  if (!word) return;
  const id = ++lastId;
  const pageUrl = `${KINDLER}/dictionary/de/search?q=${encodeURIComponent(word)}`;
  let frameId = info.frameId ?? 0;
  let corner = false;
  try {
    await api.scripting.executeScript({ target: { tabId: tab.id, frameIds: [frameId] }, files: ["content.js"] });
  } catch {
    // activeTab does not cover cross-origin iframes: show the box in the top page instead
    frameId = 0;
    corner = true;
    await api.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, files: ["content.js"] });
  }
  const send = (msg) => api.tabs.sendMessage(tab.id, { id, word, ...msg }, { frameId });
  await send({ type: "show", corner });
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
