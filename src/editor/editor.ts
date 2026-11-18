import { api, pageUrl } from "../api/api";
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

export async function openPage(path: string | null) {
  await flush();
  const mine = ++token;
  current = null;
  update({ path, doc: null, dirty: false, savedAt: null, error: "" });
  const el = frameEl;
  if (!el) return;
  if (!path) {
    el.src = "about:blank";
    return;
  }
  const loaded = new Promise<void>((resolve) => el.addEventListener("load", () => resolve(), { once: true }));
  el.src = pageUrl("page", path);
  await loaded;
  const doc = el.contentDocument;
  if (mine !== token || !doc?.body) return;
  current = { path, doc, prevEditable: doc.body.getAttribute("contenteditable") };
  doc.body.setAttribute("contenteditable", "true");
  doc.body.addEventListener("input", onInput);
  doc.addEventListener("keydown", onKeyDown);
  undoStack = [];
  redoStack = [];
  snapshot = doc.body.innerHTML;
  readyHandlers.forEach((fn) => fn(doc));
  update({ doc });
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
  update({ dirty: false, saving: true, error: "" });
  saving = saving
    .then(() => api.savePage(path, html))
    .then(
      () => update({ saving: false, savedAt: Date.now() }),
      (err: Error) => {
        pending = true;
        update({ saving: false, dirty: true, error: err.message });
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
