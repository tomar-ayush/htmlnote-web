import { useEffect, useState } from "react";
import { api, pageUrl, type Version } from "../api/api";
import { confirmAction, notify } from "../dialog/dialog";
import { editorStore, flush, openPage } from "../editor/editor";
import { Icon } from "../ui/icons";
import { Btn, Group } from "../ui/ui";

export function HistoryPanel() {
  const { path, savedAt } = editorStore.use();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    setVersions(null);
    setSelectedId("");
    if (path) {
      api.versions(path).then(
        (list) => {
          setVersions(list);
          setSelectedId(list[0]?.id ?? "");
        },
        (err: Error) => notify(err.message, "error"),
      );
    }
  }, [path, savedAt]);

  const selectedVersion = versions?.find((v) => v.id === selectedId) ?? versions?.[0] ?? null;

  const restore = async (v: Version) => {
    if (!path) return;
    const when = new Date(v.savedAt).toLocaleString();
    if (!(await confirmAction("Restore this version?", `The page goes back to how it was at ${when}. The current page is kept in history.`, "Restore"))) return;
    try {
      await flush();
      const { html } = await api.version(path, v.id);
      await api.savePage(path, html, true);
      await openPage(path, true);
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
            <a className="btn" href={pageUrl("view", path)} target="_blank" rel="noopener">
              <Icon name="external" /> Open in new tab
            </a>
            <a className="btn" href={pageUrl("page", path)} download={path.split("/").pop()}>
              <Icon name="download" /> Download .html
            </a>
          </>
        ) : (
          <span className="hint">Open a page to see its history.</span>
        )}
      </Group>
      <Group label="Versions (last 10)">
        {!path && <span className="hint">No page open.</span>}
        {path && versions === null && <span className="hint">Loading…</span>}
        {versions?.length === 0 && (
          <span className="hint">No earlier versions yet (snapshots save every 5 min).</span>
        )}
        {versions && versions.length > 0 && (
          <>
            <select
              title="Saved versions"
              value={selectedVersion?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {new Date(v.savedAt).toLocaleString()} ({Math.ceil(v.size / 1024)} KB)
                </option>
              ))}
            </select>
            <Btn disabled={!selectedVersion} onClick={() => selectedVersion && void restore(selectedVersion)}>
              <Icon name="restore" /> Restore
            </Btn>
          </>
        )}
      </Group>
    </>
  );
}
