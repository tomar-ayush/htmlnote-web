import { api } from "../api/api";
import { notify } from "../dialog/dialog";
import { createStore } from "../store/store";
import {
  currentSyncScope,
  flushNavQueue,
  listDirtyPages,
  moveLocalPrefix,
  readLocalPage,
  removeLocalPrefix,
  resolveCanonicalPath,
  writeLocalPage,
} from "../sync/localdb";
import { consumePlainPaste, runKeyHandler } from "../shortcuts/keys";

type Current = { path: string; doc: Document; prevEditable: string | null };
export type EditorState = {
  path: string | null;
  doc: Document | null;
  revision: number;
  autosave: boolean;
  dirty: boolean;
  localSaved: boolean;
  saving: boolean;
  savedAt: number | null;
  error: string;
};

const SAVE_DELAY = 6000;
const LOCAL_DELAY = 150;
const TYPING_GROUP = 400;
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
  localSaved: false,
  saving: false,
  savedAt: null,
  error: "",
});
const readyHandlers: ((doc: Document) => void)[] = [];
const pageCache = new Map<string, string>();
const inflightReads = new Map<string, Promise<string>>();
let frameEl: HTMLIFrameElement | null = null;
let current: Current | null = null;
let token = 0;
let saveTimer = 0;
let localTimer = 0;
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
export const getDoc = () => current?.doc ?? null;
export const getPath = () => current?.path ?? null;
export function focusDoc() {
  frameEl?.contentWindow?.focus();
  const doc = current?.doc;
  if (!doc?.body) return;
  if (doc.activeElement !== doc.body) doc.body.focus();
  const sel = doc.getSelection();
  if (sel && sel.rangeCount === 0) {
    const target = doc.body.firstElementChild ?? doc.body;
    const range = doc.createRange();
    range.setStart(target, 0);
    range.collapse(true);
    sel.addRange(range);
  }
}

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function pageTitleFromPath(path: string) {
  return (path.split("/").pop() ?? "").replace(/\.html?$/i, "").trim() || "Untitled page";
}

export function setHtmlDocTitle(rawHtml: string, title: string) {
  const cleanTitle = escapeHtml(title.trim() || "Untitled page");
  const tag = `<title>${cleanTitle}</title>`;
  if (!rawHtml.trim()) {
    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${tag}\n</head>\n<body><p><br></p></body>\n</html>\n`;
  }
  if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(rawHtml)) {
    return rawHtml.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, tag);
  }
  if (/<head\b[^>]*>/i.test(rawHtml)) {
    return rawHtml.replace(/<head\b[^>]*>/i, (m) => `${m}\n${tag}`);
  }
  if (/<html\b[^>]*>/i.test(rawHtml)) {
    return rawHtml.replace(/<html\b[^>]*>/i, (m) => `${m}\n<head>${tag}</head>`);
  }
  if (/^\s*<!doctype[^>]*>/i.test(rawHtml)) {
    return rawHtml.replace(/^\s*<!doctype[^>]*>\s*/i, (m) => `${m}<head>${tag}</head>\n`);
  }
  return `<head>${tag}</head>\n${rawHtml}`;
}

export function setCachedPage(path: string, html: string, dirty = false) {
  pageCache.set(path, html);
  void writeLocalPage(currentSyncScope(), path, html, dirty);
}

export function clearPageCache() {
  pageCache.clear();
  inflightReads.clear();
}

export function moveCachedPrefix(oldPrefix: string, newPrefix: string) {
  for (const [k, v] of [...pageCache.entries()]) {
    if (k === oldPrefix || k.startsWith(`${oldPrefix}/`)) {
      const nextPath = newPrefix + k.slice(oldPrefix.length);
      pageCache.delete(k);
      pageCache.set(nextPath, setHtmlDocTitle(v, pageTitleFromPath(nextPath)));
    }
  }
  void moveLocalPrefix(currentSyncScope(), oldPrefix, newPrefix);
}

export function removeCachedPrefix(prefix: string) {
  for (const k of [...pageCache.keys()]) {
    if (k === prefix || k.startsWith(`${prefix}/`)) {
      pageCache.delete(k);
    }
  }
  void removeLocalPrefix(currentSyncScope(), prefix);
}

export function repathOpenPage(oldPrefix: string, newPrefix: string) {
  if (!current) return;
  if (current.path === oldPrefix || current.path.startsWith(`${oldPrefix}/`)) {
    const nextPath = newPrefix + current.path.slice(oldPrefix.length);
    current.path = nextPath;
    current.doc.title = pageTitleFromPath(nextPath);
    update({ path: nextPath });
  }
}

function fetchPage(path: string): Promise<string> {
  const existing = inflightReads.get(path);
  if (existing) return existing;
  const scope = currentSyncScope();
  const p = api
    .readPage(path)
    .then((html) => {
      pageCache.set(path, html);
      void readLocalPage(scope, path).then((local) => {
        if (!local?.dirty) void writeLocalPage(scope, path, html, false);
      });
      return html;
    })
    .finally(() => inflightReads.delete(path));
  inflightReads.set(path, p);
  return p;
}

export async function prefetchPage(path: string) {
  if (pageCache.has(path)) return;
  const local = await readLocalPage(currentSyncScope(), path);
  if (local) {
    pageCache.set(path, local.html);
    return;
  }
  try {
    await fetchPage(path);
  } catch {}
}

function normalizeBody(doc: Document) {
  doc.querySelectorAll("style").forEach((s) => {
    s.textContent = (s.textContent ?? "").replace(
      "[data-placeholder]:empty::before,[data-placeholder]:has(> br:only-child)::before{",
      "body>[data-placeholder]:only-child:empty::before,body>[data-placeholder]:only-child:has(> br:only-child)::before{",
    );
  });
  doc.querySelectorAll("h1.hn-title").forEach((h1) => {
    if (!(h1.textContent ?? "").trim() && h1.nextElementSibling) {
      h1.remove();
    } else {
      const p = doc.createElement("p");
      p.innerHTML = h1.innerHTML;
      h1.replaceWith(p);
    }
  });
  doc.querySelectorAll(".hn-meta").forEach((el) => el.remove());
  if (!doc.body.innerHTML.trim()) {
    doc.body.innerHTML = '<p data-placeholder="Start writing your note, or paste HTML…"><br></p>';
  }
}

function mountHtml(el: HTMLIFrameElement, path: string, html: string, mine: number) {
  const doc = el.contentDocument;
  if (!doc || mine !== token) return;
  doc.open();
  doc.write(html || "<!DOCTYPE html><html><head></head><body></body></html>");
  doc.close();
  if (mine !== token || !doc.body) return;
  normalizeBody(doc);
  doc.title = pageTitleFromPath(path);
  const prevEditable = doc.body.getAttribute("contenteditable");
  current = { path, doc, prevEditable };
  doc.body.setAttribute("contenteditable", "true");
  doc.body.addEventListener("input", onInput);
  doc.addEventListener("keydown", onKeyDown);
  doc.addEventListener("paste", onPaste);
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
  clearTimeout(localTimer);
  clearTimeout(typingTimer);
  pending = false;
  update({ path, doc: null, dirty: false, localSaved: false, savedAt: null, error: "" });
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
  const scope = currentSyncScope();
  const local = !forceReload ? await readLocalPage(scope, path) : null;
  if (mine !== token) return;
  const cached = !forceReload ? pageCache.get(path) ?? local?.html : undefined;
  if (cached !== undefined) {
    mountHtml(el, path, cached, mine);
    if (local?.dirty) {
      pending = true;
      update({ dirty: true, localSaved: true });
      if (editorStore.get().autosave) saveTimer = window.setTimeout(save, SAVE_DELAY);
      return;
    }
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
  runKeyHandler(e, true);
}

function onPaste(e: ClipboardEvent) {
  if (!current || !consumePlainPaste()) return;
  e.preventDefault();
  const text = e.clipboardData?.getData("text/plain") ?? "";
  if (!text) return;
  const html = text.split(/\r?\n/).map(escapeHtml).join("<br>");
  change((doc) => doc.execCommand("insertHTML", false, html));
}

function cleanHtml({ doc, prevEditable, path }: Current) {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-hn-root]").forEach((n) => n.remove());
  const body = clone.querySelector("body")!;
  if (prevEditable === null) body.removeAttribute("contenteditable");
  else body.setAttribute("contenteditable", prevEditable);
  const dt = doc.doctype;
  const doctype = dt
    ? `<!DOCTYPE ${dt.name}${dt.publicId ? ` PUBLIC "${dt.publicId}"` : ""}${dt.systemId ? ` "${dt.systemId}"` : ""}>`
    : "<!DOCTYPE html>";
  return setHtmlDocTitle(`${doctype}\n${clone.outerHTML}`, pageTitleFromPath(path));
}

function persistLocal() {
  if (!current) return;
  const path = resolveCanonicalPath(current.path);
  const html = cleanHtml(current);
  pageCache.set(path, html);
  void writeLocalPage(currentSyncScope(), path, html, true).then(() => {
    if (current && resolveCanonicalPath(current.path) === path && pending) {
      update({ localSaved: true });
    }
  });
}

function scheduleSave() {
  if (!current) return;
  pending = true;
  update({ dirty: true });
  clearTimeout(localTimer);
  localTimer = window.setTimeout(persistLocal, LOCAL_DELAY);
  clearTimeout(saveTimer);
  if (editorStore.get().autosave) saveTimer = window.setTimeout(save, SAVE_DELAY);
}

function save() {
  if (!current) return saving;
  commit();
  clearTimeout(saveTimer);
  clearTimeout(localTimer);
  saveTimer = 0;
  localTimer = 0;
  pending = false;
  const rawPath = current.path;
  const html = cleanHtml(current);
  const scope = currentSyncScope();
  pageCache.set(rawPath, html);
  void writeLocalPage(scope, resolveCanonicalPath(rawPath), html, true);
  update({ dirty: false, saving: true, localSaved: true, error: "" });
  saving = saving
    .then(async () => {
      await flushNavQueue();
      const targetPath = resolveCanonicalPath(rawPath);
      pageCache.set(targetPath, html);
      await writeLocalPage(scope, targetPath, html, true);
      await api.savePage(targetPath, html);
      await writeLocalPage(scope, targetPath, html, false);
      return targetPath;
    })
    .then(
      (targetPath) => {
        if (current && resolveCanonicalPath(current.path) === targetPath) {
          update({ saving: false, localSaved: false, savedAt: Date.now() });
        } else {
          update({ saving: false });
        }
      },
      (err: Error) => {
        if (current && resolveCanonicalPath(current.path) === resolveCanonicalPath(rawPath)) {
          pending = true;
          update({ saving: false, dirty: true, localSaved: true, error: err.message });
        } else {
          update({ saving: false });
          notify(`Could not save "${rawPath}": ${err.message}`, "error");
        }
      },
    );
  return saving;
}

export const saveNow = () => save();

export function currentHtml() {
  return current ? cleanHtml(current) : null;
}

export function flush() {
  return pending ? save() : saving;
}

export async function flushAll() {
  await flushNavQueue();
  await flush();
}

export async function syncPendingLocal(scope: string) {
  const dirty = await listDirtyPages(scope);
  if (!dirty.length) return;
  await flushNavQueue();
  for (const row of dirty) {
    const targetPath = resolveCanonicalPath(row.path);
    if (current && resolveCanonicalPath(current.path) === targetPath) continue;
    try {
      await api.savePage(targetPath, row.html);
      await writeLocalPage(scope, targetPath, row.html, false);
    } catch {}
  }
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
