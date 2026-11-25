import { notify } from "../dialog/dialog";
import { linkStore, openLink, safeHref, unlinkAnchor } from "./links";
import { MOD } from "../shortcuts/list";

export function LinkBubble() {
  const bubble = linkStore.use();
  if (!bubble) return null;
  const href = safeHref(bubble.href);
  const left = Math.min(Math.max(8, bubble.x), window.innerWidth - 328);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href ?? bubble.href);
      notify("Link copied.");
    } catch {
      notify("Couldn't copy the link.", "error");
    }
  };

  return (
    <div className="link-bubble" style={{ left, top: bubble.y }} onMouseDown={(e) => e.preventDefault()}>
      <span className="link-url" title={bubble.href}>{bubble.href || "(empty link)"}</span>
      <button type="button" disabled={!href} onClick={() => openLink(bubble.href)} title={`Open (${MOD}+click)`}>
        Open
      </button>
      <button type="button" onClick={() => void copy()}>Copy</button>
      <button type="button" onClick={() => unlinkAnchor(bubble.anchor)}>Remove</button>
    </div>
  );
}
