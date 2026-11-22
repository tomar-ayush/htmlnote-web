import type { Notebook } from "../api/api";

type TreeRow = { scope: string; tree: Notebook[]; updatedAt: number };
type PageRow = { id: string; scope: string; path: string; html: string; dirty: boolean; updatedAt: number };

const DB_NAME = "htmlnote_local_v1";
const DB_VERSION = 1;
const STORE_TREES = "trees";
const STORE_PAGES = "pages";

let syncScope = "default";
let dbPromise: Promise<IDBDatabase | null> | null = null;
let navFlushFn: (() => Promise<void>) | null = null;
let pathResolverFn: ((path: string) => string) | null = null;

export function setSyncScope(scope: string) {
  syncScope = scope || "default";
}

export function currentSyncScope() {
  return syncScope;
}

export function registerNavFlush(fn: (() => Promise<void>) | null) {
  navFlushFn = fn;
}

export async function flushNavQueue() {
  if (navFlushFn) await navFlushFn();
}

export function registerPathResolver(fn: ((path: string) => string) | null) {
  pathResolverFn = fn;
}

export function resolveCanonicalPath(path: string) {
  return pathResolverFn ? pathResolverFn(path) : path;
}

function pageKey(scope: string, path: string) {
  return `${scope}\0${path}`;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_TREES)) {
          db.createObjectStore(STORE_TREES, { keyPath: "scope" });
        }
        if (!db.objectStoreNames.contains(STORE_PAGES)) {
          const pages = db.createObjectStore(STORE_PAGES, { keyPath: "id" });
          pages.createIndex("by_scope", "scope", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

function reqPromise<T>(req: IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

export async function readLocalTree(scope: string): Promise<Notebook[] | null> {
  const db = await openDb();
  if (!db) return null;
  const tx = db.transaction(STORE_TREES, "readonly");
  const row = (await reqPromise<TreeRow>(tx.objectStore(STORE_TREES).get(scope))) ?? null;
  return row?.tree ?? null;
}

export async function writeLocalTree(scope: string, tree: Notebook[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE_TREES, "readwrite");
  tx.objectStore(STORE_TREES).put({ scope, tree, updatedAt: Date.now() } satisfies TreeRow);
  await txDone(tx);
}

export async function readLocalPage(
  scope: string,
  path: string,
): Promise<{ html: string; dirty: boolean; updatedAt: number } | null> {
  const db = await openDb();
  if (!db) return null;
  const tx = db.transaction(STORE_PAGES, "readonly");
  const row = await reqPromise<PageRow>(tx.objectStore(STORE_PAGES).get(pageKey(scope, path)));
  if (!row) return null;
  return { html: row.html, dirty: row.dirty, updatedAt: row.updatedAt };
}

export async function writeLocalPage(scope: string, path: string, html: string, dirty: boolean): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE_PAGES, "readwrite");
  tx.objectStore(STORE_PAGES).put({
    id: pageKey(scope, path),
    scope,
    path,
    html,
    dirty,
    updatedAt: Date.now(),
  } satisfies PageRow);
  await txDone(tx);
}

async function listScopePages(scope: string): Promise<PageRow[]> {
  const db = await openDb();
  if (!db) return [];
  const tx = db.transaction(STORE_PAGES, "readonly");
  const idx = tx.objectStore(STORE_PAGES).index("by_scope");
  return (await reqPromise<PageRow[]>(idx.getAll(scope))) ?? [];
}

export async function moveLocalPrefix(scope: string, oldPrefix: string, newPrefix: string): Promise<void> {
  const rows = await listScopePages(scope);
  const moved = rows.filter((r) => r.path === oldPrefix || r.path.startsWith(`${oldPrefix}/`));
  if (!moved.length) return;
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE_PAGES, "readwrite");
  const store = tx.objectStore(STORE_PAGES);
  for (const row of moved) {
    store.delete(row.id);
    const nextPath = newPrefix + row.path.slice(oldPrefix.length);
    store.put({
      ...row,
      id: pageKey(scope, nextPath),
      path: nextPath,
    } satisfies PageRow);
  }
  await txDone(tx);
}

export async function removeLocalPrefix(scope: string, prefix: string): Promise<void> {
  const rows = await listScopePages(scope);
  const victims = rows.filter((r) => r.path === prefix || r.path.startsWith(`${prefix}/`));
  if (!victims.length) return;
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE_PAGES, "readwrite");
  const store = tx.objectStore(STORE_PAGES);
  for (const row of victims) store.delete(row.id);
  await txDone(tx);
}

export async function clearSyncedLocal(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction([STORE_TREES, STORE_PAGES], "readwrite");
  tx.objectStore(STORE_TREES).clear();
  const pages = tx.objectStore(STORE_PAGES);
  for (const row of (await reqPromise<PageRow[]>(pages.getAll())) ?? []) {
    if (!row.dirty) pages.delete(row.id);
  }
  await txDone(tx);
}

export async function listDirtyPages(scope: string): Promise<{ path: string; html: string }[]> {
  const rows = await listScopePages(scope);
  return rows.filter((r) => r.dirty).map((r) => ({ path: r.path, html: r.html }));
}
