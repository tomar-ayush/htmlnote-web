export type Page = { name: string; path: string };
export type Section = { name: string; path: string; pages: Page[] };
export type Notebook = { name: string; path: string; sections: Section[] };
export type Version = { id: string; savedAt: number; size: number };

export type User = { id: string; email: string };
export type StorageConfig = {
  configured: boolean;
  mode: "custom" | "managed" | "none";
  usedBytes: number | null;
  quotaBytes: number | null;
  endpointUrl: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  hasSecretKey: boolean;
  prefix: string;
  forcePathStyle: boolean;
};
export type StorageInput = {
  endpointUrl: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  forcePathStyle: boolean;
};

const unauthorizedHandlers: (() => void)[] = [];
export const onUnauthorized = (fn: () => void) => unauthorizedHandlers.push(fn);

function csrfToken() {
  return document.cookie.match(/(?:^|;\s*)(?:__Host-)?hn_csrf=([^;]+)/)?.[1] ?? "";
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["X-CSRF-Token"] = csrfToken();
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.startsWith("/api/auth/")) unauthorizedHandlers.forEach((fn) => fn());
  if (!res.ok) throw new Error(data.error || (typeof data.detail === "string" ? data.detail : res.statusText));
  return data as T;
}

export const authApi = {
  me: () => call<{ user: User | null }>("GET", "/api/auth/me"),
  login: (email: string, password: string) => call<{ user: User }>("POST", "/api/auth/login", { email, password }),
  signup: (email: string, password: string) =>
    call<{ otpRequired: boolean; email: string }>("POST", "/api/auth/signup", { email, password }),
  verifySignup: (email: string, code: string) =>
    call<{ user: User }>("POST", "/api/auth/verify-signup", { email, code }),
  logout: () => call<{ user: null }>("POST", "/api/auth/logout", {}),
};

const q = encodeURIComponent;

export const api = {
  tree: () => call<Notebook[]>("GET", "/api/tree"),
  createFolder: (parent: string, name: string) => call<{ path: string }>("POST", "/api/folder", { parent, name }),
  createPage: (section: string, name: string, html: string) =>
    call<{ path: string }>("POST", "/api/page", { section, name, html }),
  savePage: (path: string, html: string, keepVersion = false) =>
    call<{ saved: boolean }>("PUT", `/api/page?path=${q(path)}`, { html, keepVersion }),
  rename: (path: string, name: string) => call<{ path: string }>("POST", "/api/rename", { path, name }),
  remove: (path: string) => call<{ removed: boolean }>("DELETE", `/api/item?path=${q(path)}`),
  versions: (path: string) => call<Version[]>("GET", `/api/versions?path=${q(path)}`),
  version: (path: string, id: string) => call<{ html: string }>("GET", `/api/version?path=${q(path)}&id=${q(id)}`),
  readPage: async (path: string) => {
    const res = await fetch(pageUrl("page", path), { credentials: "same-origin" });
    if (res.status === 401) unauthorizedHandlers.forEach((fn) => fn());
    if (!res.ok) throw new Error("Failed to load page");
    return res.text();
  },
};

export interface ShareInfo {
  shared: boolean;
  token: string | null;
  url: string | null;
  expiresAt: string | null;
}

export const storageApi = {
  get: () => call<StorageConfig>("GET", "/api/storage"),
  test: (input: StorageInput) => call<{ ok: boolean }>("POST", "/api/storage/test", input),
  save: (input: StorageInput) => call<StorageConfig>("PUT", "/api/storage", input),
  clear: () => call<StorageConfig>("DELETE", "/api/storage"),
};

export const shareApi = {
  get: (path: string) => call<ShareInfo>("GET", `/api/share?path=${q(path)}`),
  create: (path: string, expiresHours: number | null) =>
    call<ShareInfo>("POST", "/api/share", { path, expiresHours }),
  presign: (path: string, expiresHours: number | null) =>
    call<{ url: string; expiresIn: number }>("POST", "/api/share/presign", { path, expiresHours }),
  revoke: (path: string) => call<ShareInfo>("DELETE", `/api/share?path=${q(path)}`),
};

export const pageUrl = (kind: "page" | "view", path: string) => `/${kind}/${path.split("/").map(q).join("/")}`;
