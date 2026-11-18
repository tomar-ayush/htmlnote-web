import { useEffect, useState } from "react";
import { api, pageUrl, type Version } from "../api/api";
import { confirmAction, notify } from "../dialog/dialog";
import { editorStore, flush, openPage } from "../editor/editor";
import { Group } from "../ui/ui";

export function HistoryPanel() {
  const { path, savedAt } = editorStore.use();
  const [versions, setVersions] = useState<Version[] | null>(null);

  useEffect(() => {
    setVersions(null);
    if (path) api.versions(path).then(setVersions, (err: Error) => notify(err.message, "error"));
  }, [path, savedAt]);

  const restore = async (v: Version) => {
    if (!path) return;
    const when = new Date(v.savedAt).toLocaleString();
    if (!(await confirmAction("Restore this version?", `The page goes back to how it was at ${when}. The current page is kept in history.`, "Restore"))) return;
    try {
      await flush();
      const { html } = await api.version(path, v.id);
      await api.savePage(path, html, true);
      await openPage(path);
      notify(`Restored the version from ${when}.`);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <>
      <Group label="Page">
        {path ? (
          <>
            <a className="btn" href={pageUrl("view", path)} target="_blank" rel="noopener">Open in new tab</a>
            <a className="btn" href={pageUrl("page", path)} download={path.split("/").pop()}>Download .html</a>
          </>
        ) : (
          <span className="hint">Open a page to see its history.</span>
        )}
      </Group>
      <Group label="Versions (last 10)">
        {path && versions === null && <span className="hint">Loading…</span>}
        {versions?.length === 0 && (
          <span className="hint">No earlier versions yet. A copy is kept when the page changes, at most every 5 minutes.</span>
        )}
        <ul className="versions">
          {versions?.map((v) => (
            <li key={v.id}>
              <span>{new Date(v.savedAt).toLocaleString()}</span>
              <span className="hint">{Math.ceil(v.size / 1024)} KB</span>
              <button type="button" onClick={() => void restore(v)}>Restore</button>
            </li>
          ))}
        </ul>
      </Group>
    </>
  );
}
