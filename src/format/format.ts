import { ask } from "../dialog/dialog";
import { change, escapeHtml, focusDoc, getDoc } from "../editor/editor";
import { normalizeLinkInput } from "../links/links";

const BLOCKS = "p,h1,h2,h3,h4,h5,h6,li,pre,blockquote,td,th,div";

function run(fn: (doc: Document) => void) {
  if (!getDoc()) return;
  focusDoc();
  change((doc) => {
    doc.execCommand("styleWithCSS", false, "true");
    fn(doc);
  });
}

export const exec = (cmd: string, value?: string) => run((doc) => doc.execCommand(cmd, false, value));

export function setFontSize(px: string) {
  run((doc) => {
    doc.execCommand("fontSize", false, "7");
    doc.body.querySelectorAll<HTMLElement>('[style*="xxx-large"]').forEach((el) => (el.style.fontSize = px));
    doc.body.querySelectorAll<HTMLElement>('font[size="7"]').forEach((el) => {
      el.removeAttribute("size");
      el.style.fontSize = px;
    });
  });
}

export function inlineCode() {
  const doc = getDoc();
  const sel = doc?.getSelection();
  const text = sel?.toString();
  if (!doc || !sel || !sel.rangeCount || !text) return;
  const code = doc.createElement("code");
  code.textContent = text;
  const range = sel.getRangeAt(0);
  change(() => {
    range.deleteContents();
    range.insertNode(code);
    const after = doc.createRange();
    after.setStartAfter(code);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  });
}

export function clearFormatting() {
  run((doc) => {
    doc.execCommand("removeFormat");
    doc.execCommand("unlink");
  });
}

export function lineHeight(delta: number) {
  const doc = getDoc();
  const sel = doc?.getSelection();
  if (!doc || !sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  const blocks = [...doc.body.querySelectorAll<HTMLElement>(BLOCKS)].filter(
    (el) => range.intersectsNode(el) && !el.querySelector(BLOCKS),
  );
  if (!blocks.length) return;
  change(() =>
    blocks.forEach((el) => {
      const cs = doc.defaultView!.getComputedStyle(el);
      const now = cs.lineHeight === "normal" ? 1.2 : parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
      el.style.lineHeight = String(Math.max(0.8, Math.round((now + delta) * 10) / 10));
    }),
  );
}

export async function insertLink() {
  if (!getDoc()) return;
  const raw = await ask("Add a link", { input: "https://", confirmText: "Add link" });
  const url = raw && raw.trim() !== "https://" ? normalizeLinkInput(raw) : "";
  if (!url) return;
  run((doc) =>
    doc.getSelection()?.isCollapsed
      ? doc.execCommand("insertHTML", false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`)
      : doc.execCommand("createLink", false, url),
  );
}

export function activeCommands(doc: Document, commands: string[]) {
  return new Set(
    commands.filter((cmd) => {
      try {
        return doc.queryCommandState(cmd);
      } catch {
        return false;
      }
    }),
  );
}
