import { setShortcut } from "../editor/editor";
import { createStore } from "../store/store";

const STYLE_ID = "hn-find-style";

export const findStore = createStore(false);
export const openFind = () => findStore.set(true);

function textNodes(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest("#htmlnote-drawing, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

export function search(doc: Document, query: string, matchCase: boolean) {
  const ranges: Range[] = [];
  if (!query) return ranges;
  const needle = matchCase ? query : query.toLowerCase();
  for (const node of textNodes(doc)) {
    const hay = matchCase ? node.data : node.data.toLowerCase();
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) {
      const range = doc.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + needle.length);
      ranges.push(range);
    }
  }
  return ranges;
}

export function paint(doc: Document, ranges: Range[], index: number) {
  const win = doc.defaultView;
  if (!win?.CSS?.highlights) return;
  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute("data-hn-root", "");
    style.textContent = "::highlight(hn-find){background:#fde68a}::highlight(hn-find-current){background:#f59e0b;color:#000}";
    doc.documentElement.append(style);
  }
  win.CSS.highlights.set("hn-find", new win.Highlight(...ranges));
  win.CSS.highlights.set("hn-find-current", new win.Highlight(...(index >= 0 && ranges[index] ? [ranges[index]] : [])));
}

export function clearPaint(doc: Document | null) {
  doc?.defaultView?.CSS?.highlights?.clear();
}

export function scrollToRange(doc: Document, range: Range) {
  const win = doc.defaultView!;
  win.scrollTo({ top: win.scrollY + range.getBoundingClientRect().top - win.innerHeight / 3 });
}

export function replaceRange(doc: Document, range: Range, text: string) {
  range.deleteContents();
  range.insertNode(doc.createTextNode(text));
}

setShortcut("f", openFind);
