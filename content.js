// Injected on each lookup; the guard keeps one listener per frame. After an add-on update
// Chrome keeps the old script's globals but its listener is dead: then install again.
(() => {
  if (window.__kindlerDictionaryAlive?.()) return;
  const api = globalThis.browser ?? chrome;
  window.__kindlerDictionaryAlive = () => {
    try {
      return !!api.runtime.id;
    } catch {
      return false;
    }
  };

  const CSS = `
    :host { all: initial; }
    .box { box-sizing: border-box; width: 380px; max-width: calc(100vw - 16px); max-height: 360px;
      display: flex; flex-direction: column; font: 14px/1.4 Georgia, serif;
      background: #fff; color: #222; border: 1px solid #888; border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,.25); }
    .head { display: flex; align-items: center; padding: 6px 10px; border-bottom: 1px solid #ccc; }
    .head b { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .note { font-size: 12px; color: #666; margin-right: 8px; }
    .x { border: 0; background: none; color: inherit; font-size: 18px; cursor: pointer; padding: 0 2px; }
    .body { overflow-y: auto; padding: 6px 10px; }
    .body h3 { font-size: 17px; margin: 4px 0; }
    .body h4 { font-size: 14px; margin: 8px 0 2px; }
    .body p { margin: 4px 0; }
    .body blockquote { margin: 0 0 4px 16px; color: #555; }
    .body hr { border: 0; border-top: 1px solid #ccc; margin: 8px 0; }
    .foot { padding: 6px 10px; border-top: 1px solid #ccc; }
    .foot button { font: inherit; cursor: pointer; padding: 2px 10px; }
    .foot small { display: block; margin-top: 4px; font-size: 11px; color: #666; }
    @media (prefers-color-scheme: dark) {
      .box { background: #222; color: #eee; border-color: #666; }
      .head, .foot { border-color: #444; }
      .body hr { border-top-color: #444; }
      .note, .foot small, .body blockquote { color: #aaa; }
    }`;

  let host = null;
  let current = 0;
  let anchor = null; // selection rect, or null for the top-right corner

  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function close() {
    if (!host) return;
    host.remove();
    host = null;
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("mousedown", onOutside, true);
  }
  const onKey = (e) => e.key === "Escape" && close();
  const onOutside = (e) => host && !e.composedPath().includes(host) && close();

  function place() {
    const box = host.firstBox;
    box.style.maxHeight = "";
    const w = box.offsetWidth, gap = 6;
    let h = box.offsetHeight;
    let top = 8, left = innerWidth - w - 8;
    if (anchor) {
      // below the word if it fits, else on the side with more room, shrunk so it never covers the word
      const below = innerHeight - anchor.bottom - gap - 8, above = anchor.top - gap - 8;
      const down = h <= below || below >= above;
      box.style.maxHeight = `${Math.max(120, Math.min(360, down ? below : above))}px`;
      h = box.offsetHeight;
      top = down ? anchor.bottom + gap : anchor.top - gap - h;
      left = anchor.left;
    }
    host.style.top = `${Math.max(8, Math.min(top, innerHeight - h - 8))}px`;
    host.style.left = `${Math.max(8, Math.min(left, innerWidth - w - 8))}px`;
  }

  function open(word) {
    close();
    host = document.createElement("kindler-dictionary");
    host.style.cssText = "position:fixed;z-index:2147483647;top:0;left:0;";
    const root = host.attachShadow({ mode: "closed" });
    root.append(el("style", CSS));
    const box = el("div", null, "box");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", `Kindler Dictionary: ${word}`);
    const head = el("div", null, "head");
    const note = el("span", null, "note");
    const x = el("button", "×", "x");
    x.title = "Close";
    x.onclick = close;
    head.append(el("b", word), note, x);
    const body = el("div", null, "body");
    body.setAttribute("aria-live", "polite");
    body.append(el("p", "Looking up…"));
    const foot = el("div", null, "foot");
    box.append(head, body, foot);
    root.append(box);
    Object.assign(host, { firstBox: box, note, body, foot });
    document.documentElement.append(host);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onOutside, true);
    place();
  }

  function renderEntries(data) {
    const out = [];
    if (!data.entries.length) {
      out.push(el("p", `No entry for "${data.query}". Nearby:`));
      out.push(el("p", data.neighbours.join(" · ")));
      return out;
    }
    data.entries.forEach((entry, i) => {
      if (i) out.push(el("hr"));
      if (entry.shown.includes("→")) out.push(el("p", entry.shown));
      for (const [type, text] of entry.lines) {
        if (type === "@") out.push(el("h3", text));
        else if (type === "#") { const p = el("p"); p.append(el("b", text)); out.push(p); }
        else if (type === ":") out.push(el("h4", text));
        else if (type === ">") { const q = el("blockquote"); q.append(el("i", text)); out.push(q); }
        else out.push(el("div", text));
      }
    });
    return out;
  }

  function fill(msg) {
    const { body, foot, note } = host;
    body.replaceChildren(...(msg.type === "result" ? renderEntries(msg.data) : [el("p", "Kindler Dictionary is unreachable.")]));
    if (msg.type === "result" && msg.data.lang === "en") note.textContent = "English → German";
    const btn = el("button", "Open in new tab");
    btn.onclick = () => api.runtime.sendMessage({ type: "open", url: msg.url });
    foot.replaceChildren(btn);
    if (msg.type === "result") {
      foot.append(el("small", `Data: ${msg.data.data_date}. Wiktionary text: CC BY-SA 4.0.`));
    }
    place();
    btn.focus({ preventScroll: true }); // keyboard users land in the box; Esc closes it
  }

  api.runtime.onMessage.addListener((msg) => {
    if (msg.type === "show") {
      current = msg.id;
      const sel = getSelection();
      const r = !msg.corner && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
      anchor = r && (r.width || r.height) ? r : null;
      open(msg.word);
    } else if (msg.id === current && host) {
      fill(msg);
    }
  });
})();
