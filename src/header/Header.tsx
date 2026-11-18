import { useEffect, useState } from "react";
import { signOut, userStore } from "../auth/auth";
import { notify } from "../dialog/dialog";
import { editorStore, saveNow, setAutosave } from "../editor/editor";
import { openStorage, storageStore } from "../storage/storage";

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `at ${new Date(Date.now() - ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function SaveStatus() {
  const { path, autosave, dirty, saving, savedAt, error } = editorStore.use();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!savedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [savedAt]);

  if (!path) return null;
  const text = error
    ? `Not saved: ${error}`
    : saving
      ? "Saving…"
      : dirty
        ? autosave ? "Saving soon…" : "Unsaved changes"
        : savedAt
          ? `Saved ${ago(now - savedAt)}`
          : "No changes yet";

  return (
    <div className="save">
      <span className={`save-text${error ? " error" : dirty ? " dirty" : ""}`} aria-live="polite">{text}</span>
      {(!autosave || error) && (
        <button type="button" className="header-btn compact primary" disabled={!dirty || saving} onClick={() => void saveNow()} title="Save (Ctrl+S)">
          Save
        </button>
      )}
      <label className="toggle" title="Save changes automatically">
        <input type="checkbox" role="switch" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} />
        <span className="track" aria-hidden="true" />
        Autosave
      </label>
    </div>
  );
}

export function Header() {
  const { path } = editorStore.use();
  const user = userStore.use();
  const { config } = storageStore.use();
  const parts = path ? path.replace(/\.html?$/i, "").split("/") : [];
  const page = parts.pop();

  return (
    <header className="header">
      <div className="brand" aria-label="HTML Notebook">
        <span className="brand-mark" aria-hidden="true" />
        HTML Notebook
      </div>
      <nav className="crumbs" aria-label="Current page">
        {parts.map((p) => (
          <span key={p} className="crumb">{p}</span>
        ))}
        {page && <span className="crumb current">{page}</span>}
      </nav>
      <div className="header-right">
        <div className="account">
          <span className="account-email" title={user?.email}>{user?.email}</span>
          <button
            type="button"
            className="header-btn"
            onClick={openStorage}
            title={config?.configured ? `Bucket: ${config.bucket}` : "Configure object storage"}
          >
            {config?.configured ? `Storage: ${config.bucket}` : "Storage"}
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={() => signOut().catch((err: Error) => notify(err.message, "error"))}
          >
            Sign out
          </button>
        </div>
        <SaveStatus />
      </div>
    </header>
  );
}
