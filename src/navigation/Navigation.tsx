import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { api, type Notebook, type Section } from "../api/api";
import { confirmAction, notify } from "../dialog/dialog";
import {
  editorStore,
  escapeHtml,
  flush,
  moveCachedPrefix,
  openPage,
  prefetchPage,
  removeCachedPrefix,
  repathOpenPage,
  setCachedPage,
  setHtmlDocTitle,
  syncPendingLocal,
} from "../editor/editor";
import {
  currentSyncScope,
  readLocalTree,
  registerNavFlush,
  registerPathResolver,
  writeLocalTree,
} from "../sync/localdb";
import { Icon } from "../ui/icons";

const COLORS = ["#1f5f7a", "#b5482b", "#2f7d4f", "#7a4fb0", "#b07d12", "#3a6fd8", "#a33d6b", "#4c6a6e"];
const LAST_KEY = "htmlnote:last";
const PAGE_FILE = /\.html?$/i;
const BAD_CHARS = /[/\\:*?"<>|\x00-\x1f]/g;

function remember(path: string | null) {
  try {
    localStorage.setItem(LAST_KEY, path ?? "");
  } catch {}
}

function recall() {
  try {
    return localStorage.getItem(LAST_KEY) ?? "";
  } catch {
    return "";
  }
}

function blankPage(title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:"Segoe UI",system-ui,-apple-system,sans-serif;font-size:15px;font-weight:400;max-width:760px;margin:0 auto;padding:28px 48px 64px;line-height:1.6;color:#1f2329}
p{margin:0 0 10px;font-size:15px;font-weight:400}
[data-placeholder]:empty::before,[data-placeholder]:has(> br:only-child)::before{content:attr(data-placeholder);color:#98a2b3;font-weight:400;pointer-events:none}
</style>
</head>
<body>
<p data-placeholder="Start writing your note, or paste HTML…"><br></p>
</body>
</html>
`;
}

const within = (path: string | null, root: string) => !!path && (path === root || path.startsWith(`${root}/`));

const cleanLocalName = (name: string) => name.replace(BAD_CHARS, "").trim();

function uniqueFolderName(existing: string[], base: string) {
  const taken = new Set(existing);
  let candidate = base;
  let i = 2;
  while (taken.has(candidate)) {
    candidate = `${base} ${i}`;
    i += 1;
  }
  return candidate;
}

function uniquePageFile(existingNames: string[], baseRaw: string) {
  const base = cleanLocalName(baseRaw.replace(PAGE_FILE, "")) || "Untitled page";
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  let i = 1;
  while (true) {
    const stem = i === 1 ? base : `${base} (${i})`;
    if (!taken.has(stem.toLowerCase())) return { stem, file: `${stem}.html` };
    i += 1;
  }
}

function findSection(notebooks: Notebook[], path: string | null): Section | null {
  for (const nb of notebooks) for (const s of nb.sections) if (s.path === path) return s;
  return null;
}

function swapPrefix(value: string | null, oldPrefix: string, newPrefix: string) {
  return value && within(value, oldPrefix) ? newPrefix + value.slice(oldPrefix.length) : value;
}

function renameInTree(tree: Notebook[], oldPath: string, newPath: string, newName: string): Notebook[] {
  const depth = oldPath.split("/").length;
  return tree.map((nb) => {
    if (depth === 1 && nb.path === oldPath) {
      return {
        name: newName,
        path: newPath,
        sections: nb.sections.map((s) => ({
          name: s.name,
          path: newPath + s.path.slice(oldPath.length),
          pages: s.pages.map((p) => ({ name: p.name, path: newPath + p.path.slice(oldPath.length) })),
        })),
      };
    }
    if (depth === 2 && within(oldPath, nb.path)) {
      return {
        ...nb,
        sections: nb.sections.map((s) =>
          s.path === oldPath
            ? {
                name: newName,
                path: newPath,
                pages: s.pages.map((p) => ({ name: p.name, path: newPath + p.path.slice(oldPath.length) })),
              }
            : s,
        ),
      };
    }
    if (depth === 3 && within(oldPath, nb.path)) {
      const display = newName.replace(PAGE_FILE, "");
      return {
        ...nb,
        sections: nb.sections.map((s) =>
          within(oldPath, s.path)
            ? {
                ...s,
                pages: s.pages.map((p) => (p.path === oldPath ? { name: display, path: newPath } : p)),
              }
            : s,
        ),
      };
    }
    return nb;
  });
}

function removeFromTree(tree: Notebook[], targetPath: string): Notebook[] {
  const depth = targetPath.split("/").length;
  if (depth === 1) return tree.filter((nb) => nb.path !== targetPath);
  if (depth === 2) {
    return tree.map((nb) =>
      within(targetPath, nb.path) ? { ...nb, sections: nb.sections.filter((s) => s.path !== targetPath) } : nb,
    );
  }
  return tree.map((nb) =>
    within(targetPath, nb.path)
      ? {
          ...nb,
          sections: nb.sections.map((s) =>
            within(targetPath, s.path) ? { ...s, pages: s.pages.filter((p) => p.path !== targetPath) } : s,
          ),
        }
      : nb,
  );
}

function Tool({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="tool"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function NameInput({ value, onDone }: { value: string; onDone: (name: string | null) => void }) {
  const done = useRef(false);
  const finish = (name: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(name);
  };
  return (
    <input
      className="name-input"
      aria-label="Name"
      autoFocus
      defaultValue={value}
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(e.currentTarget.value);
        if (e.key === "Escape") finish(null);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}

const guard = (fn: () => Promise<unknown>) => () => {
  fn().catch((err: Error) => notify(err.message, "error"));
};

type RenameHandler = (path: string, oldName: string, name: string | null) => void;
let renameHandler: RenameHandler | null = null;

export function requestPageRename(path: string, newName: string) {
  const leaf = path.split("/").pop()?.replace(PAGE_FILE, "") ?? "";
  renameHandler?.(path, leaf, newName);
}

export function Navigation() {
  const { path: pagePath } = editorStore.use();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sectionPath, setSectionPath] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const queueRef = useRef(Promise.resolve());
  const aliasRef = useRef(new Map<string, string>());
  const treeReadyRef = useRef(false);

  const resolvePath = (local: string) => {
    let cur = local;
    for (let i = 0; i < 6; i += 1) {
      const next = aliasRef.current.get(cur);
      if (!next || next === cur) break;
      cur = next;
    }
    return cur;
  };
  const resolvePathRef = useRef(resolvePath);
  resolvePathRef.current = resolvePath;

  const load = useCallback(async () => {
    const tree = await api.tree();
    treeReadyRef.current = true;
    setNotebooks(tree);
    void writeLocalTree(currentSyncScope(), tree);
    return tree;
  }, []);

  const selectPage = useCallback(async (path: string | null) => {
    remember(path);
    await openPage(path);
  }, []);

  const selectSection = useCallback(
    (tree: Notebook[], path: string | null) => {
      setSectionPath(path);
      const section = findSection(tree, path);
      const keep = section?.pages.some((p) => p.path === editorStore.get().path);
      if (!keep) void selectPage(section?.pages[0]?.path ?? null);
    },
    [selectPage],
  );

  const enqueue = useCallback(
    (task: () => Promise<void>, rollback?: () => void) => {
      const run = async () => {
        try {
          await task();
        } catch (err) {
          rollback?.();
          notify((err as Error).message, "error");
          void load();
        }
      };
      queueRef.current = queueRef.current.then(run, run);
    },
    [load],
  );

  useEffect(() => {
    registerNavFlush(() => queueRef.current);
    registerPathResolver((p) => resolvePathRef.current(p));
    return () => {
      registerNavFlush(null);
      registerPathResolver(null);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const scope = currentSyncScope();
    void readLocalTree(scope).then((cachedTree) => {
      if (cancelled || treeReadyRef.current || !cachedTree?.length) return;
      treeReadyRef.current = true;
      setNotebooks(cachedTree);
      const last = recall();
      const all = cachedTree.flatMap((nb) => nb.sections);
      const home = all.find((s) => s.pages.some((p) => p.path === last));
      if (home) {
        setSectionPath(home.path);
        void selectPage(last);
      } else if (all[0]) {
        selectSection(cachedTree, all[0].path);
      }
    });
    load()
      .then((tree) => {
        if (cancelled) return;
        const last = recall();
        const all = tree.flatMap((nb) => nb.sections);
        const home = all.find((s) => s.pages.some((p) => p.path === last));
        if (home) {
          setSectionPath(home.path);
          void selectPage(last);
        } else if (all[0]) selectSection(tree, all[0].path);
        void syncPendingLocal(scope);
      })
      .catch((err: Error) => notify(`Cannot reach the server: ${err.message}`, "error"));
    return () => {
      cancelled = true;
    };
  }, [load, selectPage, selectSection]);

  useEffect(() => {
    if (treeReadyRef.current) void writeLocalTree(currentSyncScope(), notebooks);
  }, [notebooks]);

  useEffect(() => {
    const sec = findSection(notebooks, sectionPath);
    sec?.pages.slice(0, 5).forEach((p) => void prefetchPage(p.path));
  }, [notebooks, sectionPath]);

  const reconcilePath = (localPath: string, serverPath: string) => {
    if (localPath === serverPath) return;
    aliasRef.current.set(localPath, serverPath);
    const nextName = serverPath.split("/").pop() ?? serverPath;
    setNotebooks((prev) => renameInTree(prev, localPath, serverPath, nextName));
    setSectionPath((prev) => swapPrefix(prev, localPath, serverPath));
    setEditing((prev) => swapPrefix(prev, localPath, serverPath));
    moveCachedPrefix(localPath, serverPath);
    repathOpenPage(localPath, serverPath);
  };

  const addNotebook = () => {
    treeReadyRef.current = true;
    const prevTree = notebooks;
    const prevSec = sectionPath;
    const nbName = uniqueFolderName(notebooks.map((n) => n.name), "Untitled notebook");
    const secPath = `${nbName}/Untitled section`;
    const nextTree = [...notebooks, { name: nbName, path: nbName, sections: [{ name: "Untitled section", path: secPath, pages: [] }] }];
    setNotebooks(nextTree);
    selectSection(nextTree, secPath);
    setEditing(nbName);
    enqueue(
      async () => {
        const nb = await api.createFolder("", "Untitled notebook");
        reconcilePath(nbName, nb.path);
        const sec = await api.createFolder(nb.path, "Untitled section");
        reconcilePath(`${nb.path}/Untitled section`, sec.path);
      },
      () => {
        setNotebooks(prevTree);
        setSectionPath(prevSec);
      },
    );
  };

  const addSection = (notebook: string) => {
    const nb = notebooks.find((n) => n.path === notebook);
    if (!nb) return;
    const prevTree = notebooks;
    const prevSec = sectionPath;
    const secName = uniqueFolderName(nb.sections.map((s) => s.name), "Untitled section");
    const secPath = `${notebook}/${secName}`;
    const nextTree = notebooks.map((n) =>
      n.path === notebook ? { ...n, sections: [...n.sections, { name: secName, path: secPath, pages: [] }] } : n,
    );
    const nextCollapsed = new Set(collapsed);
    nextCollapsed.delete(notebook);
    setCollapsed(nextCollapsed);
    setNotebooks(nextTree);
    selectSection(nextTree, secPath);
    setEditing(secPath);
    enqueue(
      async () => {
        const sec = await api.createFolder(resolvePath(notebook), "Untitled section");
        reconcilePath(secPath, sec.path);
      },
      () => {
        setNotebooks(prevTree);
        setSectionPath(prevSec);
      },
    );
  };

  const addPage = () => {
    const section = findSection(notebooks, sectionPath);
    if (!section) return;
    const prevTree = notebooks;
    const { stem, file } = uniquePageFile(section.pages.map((p) => p.name), "Untitled page");
    const newPath = `${section.path}/${file}`;
    const html = blankPage(stem);
    setCachedPage(newPath, html);
    const nextTree = notebooks.map((nb) => ({
      ...nb,
      sections: nb.sections.map((s) =>
        s.path === section.path ? { ...s, pages: [...s.pages, { name: stem, path: newPath }] } : s,
      ),
    }));
    setNotebooks(nextTree);
    void selectPage(newPath);
    setEditing(newPath);
    enqueue(
      async () => {
        const page = await api.createPage(resolvePath(section.path), "Untitled page", html);
        reconcilePath(newPath, page.path);
      },
      () => {
        removeCachedPrefix(newPath);
        setNotebooks(prevTree);
      },
    );
  };

  const importFiles = async (files: File[]) => {
    const section = findSection(notebooks, sectionPath);
    if (!section) return;
    const pages = files.filter((f) => PAGE_FILE.test(f.name));
    if (!pages.length) return notify("Only .html and .htm files can be imported.", "error");
    const entries = await Promise.all(
      pages.map(async (file) => ({ rawName: file.name.replace(PAGE_FILE, ""), html: await file.text() })),
    );
    const prevTree = notebooks;
    const taken = section.pages.map((p) => p.name);
    const created: { stem: string; path: string; rawName: string; html: string }[] = [];
    for (const entry of entries) {
      const { stem, file } = uniquePageFile(taken, entry.rawName);
      taken.push(stem);
      const localPath = `${section.path}/${file}`;
      const titledHtml = setHtmlDocTitle(entry.html, stem);
      setCachedPage(localPath, titledHtml);
      created.push({ stem, path: localPath, rawName: entry.rawName, html: titledHtml });
    }
    const nextTree = notebooks.map((nb) => ({
      ...nb,
      sections: nb.sections.map((s) =>
        s.path === section.path
          ? { ...s, pages: [...s.pages, ...created.map((c) => ({ name: c.stem, path: c.path }))] }
          : s,
      ),
    }));
    setNotebooks(nextTree);
    const last = created[created.length - 1];
    if (last) void selectPage(last.path);
    const count = pages.length === 1 ? `"${pages[0].name}"` : `${pages.length} pages`;
    notify(`Copied ${count} into ${section.name}. Your original files are not changed.`);
    enqueue(
      async () => {
        const targetSec = resolvePath(section.path);
        for (const item of created) {
          const res = await api.createPage(targetSec, item.rawName, item.html);
          reconcilePath(item.path, res.path);
        }
      },
      () => {
        created.forEach((c) => removeCachedPrefix(c.path));
        setNotebooks(prevTree);
      },
    );
  };

  const finishRename = (path: string, oldName: string, name: string | null) => {
    setEditing(null);
    const clean = cleanLocalName(name ?? "");
    if (!clean || clean === oldName) return;
    const parts = path.split("/");
    const isPage = parts.length === 3;
    const cleanLeaf = isPage ? `${clean.replace(PAGE_FILE, "")}.html` : clean;
    if (!cleanLeaf || cleanLeaf === ".html") return;
    const localTarget = [...parts.slice(0, -1), cleanLeaf].join("/");
    if (localTarget === path) return;
    const prevTree = notebooks;
    const prevSec = sectionPath;
    setNotebooks((prev) => renameInTree(prev, path, localTarget, clean));
    setSectionPath((prev) => swapPrefix(prev, path, localTarget));
    moveCachedPrefix(path, localTarget);
    repathOpenPage(path, localTarget);
    remember(swapPrefix(recall() || null, path, localTarget));
    enqueue(
      async () => {
        await flush();
        const { path: renamed } = await api.rename(resolvePath(path), clean);
        reconcilePath(localTarget, renamed);
      },
      () => {
        moveCachedPrefix(localTarget, path);
        repathOpenPage(localTarget, path);
        setNotebooks(prevTree);
        setSectionPath(prevSec);
      },
    );
  };

  const remove = (path: string, kind: string, name: string) =>
    guard(async () => {
      const extra = kind === "page" ? "" : ` Everything inside this ${kind} is deleted too.`;
      if (!(await confirmAction(`Delete ${kind} "${name}"?`, `This removes it from storage and can't be undone.${extra}`, `Delete ${kind}`))) return;
      const prevTree = notebooks;
      const prevSec = sectionPath;
      setNotebooks((prev) => removeFromTree(prev, path));
      removeCachedPrefix(path);
      if (within(pagePath, path)) void selectPage(null);
      if (within(sectionPath, path)) setSectionPath(null);
      enqueue(
        async () => {
          await flush();
          await api.remove(resolvePath(path));
        },
        () => {
          setNotebooks(prevTree);
          setSectionPath(prevSec);
        },
      );
    })();

  const renameRef = useRef(finishRename);
  renameRef.current = finishRename;

  useEffect(() => {
    renameHandler = (p, o, n) => renameRef.current(p, o, n);
    return () => {
      renameHandler = null;
    };
  }, []);

  const label = (path: string, name: string) =>
    editing === path ? (
      <NameInput value={name} onDone={(n) => finishRename(path, name, n)} />
    ) : (
      <span className="label">{name}</span>
    );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    guard(() => importFiles([...e.dataTransfer.files]))();
  };

  const section = findSection(notebooks, sectionPath);

  return (
    <>
      <aside className="pane notebooks" aria-label="Notebooks">
        <div className="pane-head">
          <span>Notebooks</span>
          <button type="button" className="add" onClick={addNotebook}><Icon name="plus" size={13} /> Notebook</button>
        </div>
        {!notebooks.length && <p className="hint">Add a notebook to start collecting pages.</p>}
        {notebooks.map((nb) => (
          <div key={nb.path} className="notebook">
            <div className="notebook-head" onDoubleClick={() => setEditing(nb.path)} title="Double-click to rename">
              <button
                type="button"
                className="caret"
                aria-label={collapsed.has(nb.path) ? "Expand" : "Collapse"}
                onClick={() => {
                  const next = new Set(collapsed);
                  if (!next.delete(nb.path)) next.add(nb.path);
                  setCollapsed(next);
                }}
              >
                {collapsed.has(nb.path) ? "▸" : "▾"}
              </button>
              {label(nb.path, nb.name)}
              <Tool title="Add section" onClick={() => addSection(nb.path)}>+</Tool>
              <Tool title="Delete notebook" onClick={() => remove(nb.path, "notebook", nb.name)}>✕</Tool>
            </div>
            {!collapsed.has(nb.path) &&
              nb.sections.map((s, i) => (
                <div
                  key={s.path}
                  className={`section${s.path === sectionPath ? " active" : ""}`}
                  style={{ "--section-color": COLORS[i % COLORS.length] } as CSSProperties}
                  title="Double-click to rename"
                  onClick={() => s.path !== sectionPath && selectSection(notebooks, s.path)}
                  onDoubleClick={() => setEditing(s.path)}
                >
                  {label(s.path, s.name)}
                  <Tool title="Delete section" onClick={() => remove(s.path, "section", s.name)}>✕</Tool>
                </div>
              ))}
          </div>
        ))}
      </aside>
      <aside
        className={`pane pages${dragging ? " dragging" : ""}`}
        aria-label="Pages"
        onDragOver={(e) => {
          if (!section) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="pane-head">
          <span>{section?.name ?? "Pages"}</span>
        </div>
        <div className="page-actions">
          <button type="button" disabled={!section} onClick={addPage}><Icon name="plus" size={13} /> Page</button>
          <button type="button" disabled={!section} onClick={() => importInput.current?.click()}><Icon name="upload" size={13} /> Import .html</button>
          <input
            ref={importInput}
            type="file"
            accept=".html,.htm,text/html"
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              guard(() => importFiles(files))();
            }}
          />
        </div>
        {!section && <p className="hint">Pick a section to see its pages.</p>}
        {section && !section.pages.length && (
          <p className="hint">No pages yet. Add one, or import .html files. Imports are copied here; the originals stay untouched.</p>
        )}
        {section?.pages.map((p) => (
          <div
            key={p.path}
            className={`page${p.path === pagePath ? " active" : ""}`}
            title="Double-click to rename"
            onClick={() => p.path !== pagePath && void selectPage(p.path)}
            onDoubleClick={() => setEditing(p.path)}
          >
            {label(p.path, p.name)}
            <Tool title="Delete page" onClick={() => remove(p.path, "page", p.name)}>✕</Tool>
          </div>
        ))}
      </aside>
    </>
  );
}
