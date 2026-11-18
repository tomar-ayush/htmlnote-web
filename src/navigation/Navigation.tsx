import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { api, type Notebook, type Section } from "../api/api";
import { confirmAction, notify } from "../dialog/dialog";
import { editorStore, escapeHtml, flush, openPage } from "../editor/editor";

const COLORS = ["#1f5f7a", "#b5482b", "#2f7d4f", "#7a4fb0", "#b07d12", "#3a6fd8", "#a33d6b", "#4c6a6e"];
const LAST_KEY = "htmlnote:last";
const PAGE_FILE = /\.html?$/i;

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
<style>body{font-family:"Segoe UI",system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;line-height:1.55;color:#1f2329}</style>
</head>
<body>
<h1><br></h1>
<p><br></p>
</body>
</html>
`;
}

const within = (path: string | null, root: string) => !!path && (path === root || path.startsWith(`${root}/`));

function findSection(notebooks: Notebook[], path: string | null): Section | null {
  for (const nb of notebooks) for (const s of nb.sections) if (s.path === path) return s;
  return null;
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

export function Navigation() {
  const { path: pagePath } = editorStore.use();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sectionPath, setSectionPath] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const tree = await api.tree();
    setNotebooks(tree);
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

  useEffect(() => {
    load()
      .then((tree) => {
        const last = recall();
        const all = tree.flatMap((nb) => nb.sections);
        const home = all.find((s) => s.pages.some((p) => p.path === last));
        if (home) {
          setSectionPath(home.path);
          void selectPage(last);
        } else if (all[0]) selectSection(tree, all[0].path);
      })
      .catch((err: Error) => notify(`Cannot reach the server: ${err.message}`, "error"));
  }, [load, selectPage, selectSection]);

  const addNotebook = guard(async () => {
    const nb = await api.createFolder("", "Untitled notebook");
    const section = await api.createFolder(nb.path, "Untitled section");
    selectSection(await load(), section.path);
    setEditing(nb.path);
  });

  const addSection = (notebook: string) =>
    guard(async () => {
      const section = await api.createFolder(notebook, "Untitled section");
      const next = new Set(collapsed);
      next.delete(notebook);
      setCollapsed(next);
      selectSection(await load(), section.path);
      setEditing(section.path);
    })();

  const addPage = guard(async () => {
    if (!sectionPath) return;
    const page = await api.createPage(sectionPath, "Untitled page", blankPage("Untitled page"));
    await load();
    await selectPage(page.path);
    setEditing(page.path);
  });

  const importFiles = async (files: File[]) => {
    const section = findSection(notebooks, sectionPath);
    if (!section) return;
    const pages = files.filter((f) => PAGE_FILE.test(f.name));
    if (!pages.length) return notify("Only .html and .htm files can be imported.", "error");
    let last: string | null = null;
    for (const file of pages) {
      last = (await api.createPage(section.path, file.name.replace(PAGE_FILE, ""), await file.text())).path;
    }
    await load();
    if (last) await selectPage(last);
    const count = pages.length === 1 ? `"${pages[0].name}"` : `${pages.length} pages`;
    notify(`Copied ${count} into ${section.name}. Your original files are not changed.`);
  };

  const finishRename = (path: string, oldName: string, name: string | null) => {
    setEditing(null);
    const clean = name?.trim();
    if (!clean || clean === oldName) return;
    guard(async () => {
      await flush();
      const { path: renamed } = await api.rename(path, clean);
      const swap = (p: string | null) => (p && within(p, path) ? renamed + p.slice(path.length) : p);
      setSectionPath(swap(sectionPath));
      await load();
      if (within(pagePath, path)) await selectPage(swap(pagePath));
    })();
  };

  const remove = (path: string, kind: string, name: string) =>
    guard(async () => {
      const extra = kind === "page" ? "" : ` Everything inside this ${kind} is deleted too.`;
      if (!(await confirmAction(`Delete ${kind} "${name}"?`, `This removes it from storage and can't be undone.${extra}`, `Delete ${kind}`))) return;
      await flush();
      if (within(pagePath, path)) await selectPage(null);
      await api.remove(path);
      if (within(sectionPath, path)) setSectionPath(null);
      await load();
    })();

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
          <button type="button" className="add" onClick={addNotebook}>+ Notebook</button>
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
          <button type="button" disabled={!section} onClick={addPage}>+ Page</button>
          <button type="button" disabled={!section} onClick={() => importInput.current?.click()}>Import .html</button>
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
