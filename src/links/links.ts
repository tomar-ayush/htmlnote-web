import { change, onPageReady } from "../editor/editor";
import { notify } from "../dialog/dialog";
import { createStore } from "../store/store";

/** The link the caret is on, positioned in the parent window's coordinates. */
export type LinkBubble = { href: string; anchor: HTMLAnchorElement; x: number; y: number };

export const linkStore = createStore<LinkBubble | null>(null);

/**
 * Turns whatever is in an href into something safe to open, or null.
 * Bare domains ("example.com") get https://; script-like schemes are refused.
 */
export function safeHref(raw: string | null | undefined) {
  const value = (raw ?? "").trim();
  if (!value || value.startsWith("#")) return null;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return new URL(value, window.location.origin).href;
  return `https://${value}`;
}

/** What insertLink should store: bare domains become https:// links. */
export function normalizeLinkInput(raw: string) {
  const value = raw.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/") || value.startsWith("#")) return value;
  return `https://${value}`;
}

export function openLink(raw: string | null | undefined) {
  const href = safeHref(raw);
  if (!href) {
    notify("This link can't be opened.", "error");
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function unlinkAnchor(anchor: HTMLAnchorElement) {
  change(() => anchor.replaceWith(...Array.from(anchor.childNodes)));
  linkStore.set(null);
}

const anchorOf = (node: Node | null) =>
  ((node instanceof Element ? node : node?.parentElement)?.closest("a[href]") ?? null) as HTMLAnchorElement | null;

function showBubble(doc: Document, anchor: HTMLAnchorElement | null) {
  const frame = doc.defaultView?.frameElement as HTMLElement | null;
  if (!anchor || !frame) {
    if (linkStore.get()) linkStore.set(null);
    return;
  }
  const f = frame.getBoundingClientRect();
  const r = anchor.getClientRects()[0] ?? anchor.getBoundingClientRect();
  linkStore.set({ href: anchor.getAttribute("href") ?? "", anchor, x: f.left + r.left, y: f.top + r.bottom + 6 });
}

onPageReady((doc) => {
  linkStore.set(null);

  doc.addEventListener("click", (e) => {
    const anchor = anchorOf(e.target as Node);
    if (anchor && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      openLink(anchor.getAttribute("href"));
      return;
    }
    showBubble(doc, anchor);
  });

  doc.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const anchor = anchorOf(e.target as Node);
    if (!anchor) return;
    e.preventDefault();
    openLink(anchor.getAttribute("href"));
  });

  doc.addEventListener("keyup", () => showBubble(doc, anchorOf(doc.getSelection()?.anchorNode ?? null)));
  doc.addEventListener("scroll", () => linkStore.set(null), true);
  doc.defaultView?.addEventListener("blur", () => {
    // Let a click on the bubble itself land before it disappears.
    window.setTimeout(() => {
      if (!document.activeElement?.closest(".link-bubble")) linkStore.set(null);
    }, 150);
  });
});
