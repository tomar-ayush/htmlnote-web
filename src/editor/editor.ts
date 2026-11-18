import { api } from "../api/api";
import { notify } from "../dialog/dialog";
import { createStore } from "../store/store";

type Current = { path: string; doc: Document; prevEditable: string | null };
export type EditorState = {
  path: string | null;
  doc: Document | null;
  revision: number;
  autosave: boolean;
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
  error: string;
};

const SAVE_DELAY = 1000;
const TYPING_GROUP = 700;
const MAX_UNDO = 100;
const AUTOSAVE_KEY = "htmlnote:autosave";

function readAutosave() {
  try {
    return localStorage.getItem(AUTOSAVE_KEY) !== "off";
  } catch {
    return true;
  }
}

export const editorStore = createStore<EditorState>({
  path: null,
  doc: null,
  revision: 0,
  autosave: readAutosave(),
  dirty: false,
  saving: false,
  savedAt: null,
  error: "",
});
const readyHandlers: ((doc: Document) => void)[] = [];
const shortcuts: Record<string, () => void> = {};
const pageCache = new Map<string, string>();
const inflightReads = new Map<string, Promise<string>>();
let frameEl: HTMLIFrameElement | null = null;
let current: Current | null = null;
let token = 0;
let saveTimer = 0;
let pending = false;
let typingTimer = 0;
let saving: Promise<void> = Promise.resolve();
let undoStack: string[] = [];
let redoStack: string[] = [];
let snapshot = "";

const update = (patch: Partial<EditorState>) => editorStore.set({ ...editorStore.get(), ...patch });

export const attachFrame = (el: HTMLIFrameElement | null) => {
  frameEl = el;
};
export const onPageReady = (fn: (doc: Document) => void) => readyHandlers.push(fn);
export const setShortcut = (key: string, fn: () => void) => {
  shortcuts[key] = fn;
};
export const getDoc = () => current?.doc ?? null;
export const getPath = () => current?.path ?? null;
export const focusDoc = () => frameEl?.contentWindow?.focus();

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function setCachedPage(path: string, html: string) {
  pageCache.set(path, html);
}

export function clearPageCache() {
  pageCache.clear();
  inflightReads.clear();
}

export function moveCachedPrefix(oldPrefix: string, newPrefix: string) {
  for (const [k, v] of [...pageCache.entries()]) {
    if (k === oldPrefix || k.startsWith(`${oldPrefix}/`)) {
      pageCache.delete(k);
      pageCache.set(newPrefix + k.slice(oldPrefix.length), v);
    }
  }
}

export function removeCachedPrefix(prefix: string) {
  for (const k of [...pageCache.keys()]) {
    if (k === prefix || k.startsWith(`${prefix}/`)) {
      pageCache.delete(k);
    }
  }
}

export function repathOpenPage(oldPrefix: string, newPrefix: string) {
  if (!current) return;
  if (current.path === oldPrefix || current.path.startsWith(`${oldPrefix}/`)) {
    const nextPath = newPrefix + current.path.slice(oldPrefix.length);
    current.path = nextPath;
    update({ path: nextPath });
  }
}

function fetchPage(path: string): Promise<string> {
  const existing = inflightReads.get(path);
  if (existing) return existing;
  const p = api
    .readPage(path)
    .then((html) => {
      pageCache.set(path, html);
      return html;
    })
    .finally(() => inflightReads.delete(path));
  inflightReads.set(path, p);
  return p;
}

export async function prefetchPage(path: string) {
  if (pageCache.has(path)) return;
  try {
    await fetchPage(path);
  } catch {}
}

function mountHtml(el: HTMLIFrameElement, path: string, html: string, mine: number) {
  const doc = el.contentDocument;
  if (!doc || mine !== token) return;
  doc.open();
  doc.write(html || "<!DOCTYPE html><html><head></head><body></body></html>");
  doc.close();
  if (mine !== token || !doc.body) return;
  const prevEditable = doc.body.getAttribute("contenteditable");
  current = { path, doc, prevEditable };
  doc.body.setAttribute("contenteditable", "true");
  doc.body.addEventListener("input", onInput);
  doc.addEventListener("keydown", onKeyDown);
  undoStack = [];
  redoStack = [];
  snapshot = doc.body.innerHTML;
  readyHandlers.forEach((fn) => fn(doc));
  update({ doc });
}

export async function openPage(path: string | null, forceReload = false) {
  if (pending) void save();
  const mine = ++token;
  current = null;
  clearTimeout(saveTimer);
  clearTimeout(typingTimer);
  pending = false;
  update({ path, doc: null, dirty: false, savedAt: null, error: "" });
  const el = frameEl;
  if (!el) return;
  if (!path) {
    const doc = el.contentDocument;
    if (doc) {
      doc.open();
      doc.write("<!DOCTYPE html><html><body></body></html>");
      doc.close();
    } else {
      el.src = "about:blank";
    }
    return;
  }
  if (!el.contentDocument) {
    await new Promise<void>((resolve) => {
      el.addEventListener("load", () => resolve(), { once: true });
      el.src = "about:blank";
    });
  }
  if (mine !== token) return;
  const cached = !forceReload ? pageCache.get(path) : undefined;
  if (cached !== undefined) {
    mountHtml(el, path, cached, mine);
    void fetchPage(path).then(
      (fresh) => {
        if (mine === token && current?.path === path && !pending && fresh !== cached) {
          mountHtml(el, path, fresh, mine);
        }
      },
      () => {},
    );
    return;
  }
  try {
    const html = await fetchPage(path);
    if (mine !== token) return;
    mountHtml(el, path, html, mine);
  } catch (err) {
    if (mine === token) update({ error: (err as Error).message });
  }
}

export function ensureCaret(doc: Document) {
  const sel = doc.getSelection();
  if (!sel || (sel.rangeCount && doc.body.contains(sel.anchorNode))) return;
  const range = doc.createRange();
  range.selectNodeContents(doc.body);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function onInput() {
  clearTimeout(typingTimer);
  typingTimer = window.setTimeout(commit, TYPING_GROUP);
  scheduleSave();
}

export function commit() {
  clearTimeout(typingTimer);
  if (!current) return;
  const html = current.doc.body.innerHTML;
  if (html === snapshot) return;
  undoStack.push(snapshot);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  snapshot = html;
  scheduleSave();
}

export function change(fn: (doc: Document) => void) {
  if (!current) return;
  commit();
  fn(current.doc);
  commit();
}

function restore(from: string[], to: string[]) {
  commit();
  if (!current || !from.length) return;
  to.push(snapshot);
  snapshot = from.pop()!;
  current.doc.body.innerHTML = snapshot;
  update({ revision: editorStore.get().revision + 1 });
  scheduleSave();
}

export const undo = () => restore(undoStack, redoStack);
export const redo = () => restore(redoStack, undoStack);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && current) {
    const sel = current.doc.getSelection();
    const anchor = sel?.anchorNode;
    const anchorEl = anchor ? (anchor.nodeType === 1 ? (anchor as Element) : anchor.parentElement) : null;
    if (anchorEl?.closest(".hn-title")) {
      e.preventDefault();
      let target = current.doc.querySelector(".hn-meta")?.nextElementSibling as HTMLElement | null;
      if (!target || target.getAttribute("contenteditable") === "false") {
        target = current.doc.createElement("p");
        target.innerHTML = "<br>";
        const meta = current.doc.querySelector(".hn-meta");
        if (meta) meta.after(target);
        else current.doc.body.appendChild(target);
      }
      const range = current.doc.createRange();
      range.setStart(target, 0);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      commit();
      return;
    }
  }
  if (!(e.metaKey || e.ctrlKey)) return;
  const key = e.key.toLowerCase();
  const builtIn: Record<string, () => void> = {
    z: () => (e.shiftKey ? redo() : undo()),
    y: redo,
    s: () => void saveNow(),
  };
  const action = builtIn[key] ?? shortcuts[key];
  if (!action) return;
  e.preventDefault();
  action();
}

function cleanHtml({ doc, prevEditable }: Current) {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-hn-root]").forEach((n) => n.remove());
  const body = clone.querySelector("body")!;
  if (prevEditable === null) body.removeAttribute("contenteditable");
  else body.setAttribute("contenteditable", prevEditable);
  const dt = doc.doctype;
  const doctype = dt
    ? `<!DOCTYPE ${dt.name}${dt.publicId ? ` PUBLIC "${dt.publicId}"` : ""}${dt.systemId ? ` "${dt.systemId}"` : ""}>`
    : "<!DOCTYPE html>";
  return `${doctype}\n${clone.outerHTML}`;
}

function scheduleSave() {
  if (!current) return;
  pending = true;
  update({ dirty: true });
  clearTimeout(saveTimer);
  if (editorStore.get().autosave) saveTimer = window.setTimeout(save, SAVE_DELAY);
}

function save() {
  if (!current) return saving;
  commit();
  clearTimeout(saveTimer);
  saveTimer = 0;
  pending = false;
  const { path } = current;
  const html = cleanHtml(current);
  pageCache.set(path, html);
  update({ dirty: false, saving: true, error: "" });
  saving = saving
    .then(() => api.savePage(path, html))
    .then(
      () => {
        if (current?.path === path) update({ saving: false, savedAt: Date.now() });
        else update({ saving: false });
      },
      (err: Error) => {
        if (current?.path === path) {
          pending = true;
          update({ saving: false, dirty: true, error: err.message });
        } else {
          update({ saving: false });
          notify(`Could not save "${path}": ${err.message}`, "error");
        }
      },
    );
  return saving;
}

export const saveNow = () => save();

export function flush() {
  return pending ? save() : saving;
}

export function setAutosave(on: boolean) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, on ? "on" : "off");
  } catch {}
  update({ autosave: on });
  if (on && pending) void save();
}

export function initEditor() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && editorStore.get().autosave) void flush();
  });
  window.addEventListener("beforeunload", (e) => {
    if (pending) e.preventDefault();
  });
}
