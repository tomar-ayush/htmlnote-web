import { useEffect, useRef, useState } from "react";
import { AuthScreen } from "./auth/AuthScreen";
import { loadUser, userStore } from "./auth/auth";
import { DialogHost, notify } from "./dialog/dialog";
import { pageUrl } from "./api/api";
import { attachFrame, editorStore, flush, focusDoc } from "./editor/editor";
import { FindPanel } from "./find/FindPanel";
import { findStore } from "./find/find";
import { Header } from "./header/Header";
import { Landing } from "./landing/Landing";
import { Privacy, Terms } from "./legal/Legal";
import { Navigation, requestPageRename } from "./navigation/Navigation";
import { Ribbon } from "./ribbon/Ribbon";
import { ShareModal } from "./share/ShareModal";
import { openShare } from "./share/share";
import { StorageModal, StorageSetup } from "./storage/StorageModal";
import { loadStorage, resetStorage, storageStore } from "./storage/storage";
import { setSyncScope } from "./sync/localdb";
import { Icon } from "./ui/icons";

function Workspace() {
  const { path } = editorStore.use();
  const findOpen = findStore.use();
  const user = userStore.use();
  const { config, revision } = storageStore.use();
  const pageTitle = path ? (path.split("/").pop() ?? "").replace(/\.html?$/i, "") : "";
  const [titleDraft, setTitleDraft] = useState(pageTitle);
  const skipBlurRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleDraft(pageTitle);
  }, [pageTitle]);

  useEffect(() => {
    const scopeKey =
      config?.mode === "gdrive"
        ? `gdrive:${config.driveEmail || "default"}`
        : `${config?.mode ?? "none"}:${config?.bucket || ""}`;
    setSyncScope(`${user?.id ?? "anon"}:${scopeKey}`);
  }, [user?.id, config?.mode, config?.driveEmail, config?.bucket]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveOk = params.get("drive");
    const driveErr = params.get("drive_error");
    if (driveOk === "connected") {
      notify("Google Drive connected. Notes now sync to your html-notes-app folder.");
    } else if (driveErr) {
      notify(driveErr, "error");
    }
    if (driveOk || driveErr) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    resetStorage();
    void loadStorage();
  }, []);

  const commitTitle = () => {
    if (!path) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(pageTitle);
      return;
    }
    if (trimmed !== pageTitle) {
      requestPageRename(path, trimmed);
      setTitleDraft(trimmed);
    }
  };

  if (config === undefined) {
    return (
      <div className="app">
        <Header />
        <main className="storage-screen">
          <p className="hint">Loading…</p>
        </main>
      </div>
    );
  }

  if (!config?.configured) {
    return (
      <div className="app">
        <Header />
        <StorageSetup />
        <StorageModal />
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <Ribbon />
      <main className="workspace">
        <Navigation key={revision} />
        <section className="canvas" aria-label="Page">
          <div ref={sheetRef} className={path ? "page-sheet" : "page-sheet is-empty"}>
            {path && (
              <header className="page-title-bar">
                <input
                  className="page-title-input"
                  type="text"
                  value={titleDraft}
                  placeholder="Untitled page"
                  aria-label="Page title"
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (skipBlurRef.current) {
                      skipBlurRef.current = false;
                      return;
                    }
                    commitTitle();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitTitle();
                      focusDoc();
                    } else if (e.key === "Escape") {
                      skipBlurRef.current = true;
                      setTitleDraft(pageTitle);
                      e.currentTarget.blur();
                    }
                  }}
                />
                <button
                  type="button"
                  className="page-share-btn"
                  onClick={() => (document.fullscreenElement ? document.exitFullscreen() : sheetRef.current?.requestFullscreen())}
                  title="Full screen"
                >
                  <Icon name="expand" />
                  <span>Full screen</span>
                </button>
                <button
                  type="button"
                  className="page-share-btn"
                  onClick={() => {
                    const tab = window.open("", "_blank");
                    if (!tab) return;
                    tab.opener = null;
                    void flush().finally(() => tab.location.replace(pageUrl("view", path)));
                  }}
                  title="Open a read-only view in a new tab"
                >
                  <Icon name="external" />
                  <span>Read only</span>
                </button>
                <button type="button" className="page-share-btn" onClick={() => openShare(path)} title="Share this page">
                  <Icon name="share" />
                  <span>Share</span>
                </button>
              </header>
            )}
            <iframe ref={attachFrame} sandbox="allow-same-origin" title="Page content" />
          </div>
          {!path && (
            <div className="empty">
              <p>Pick a page on the left, add a new one, or import .html files.</p>
            </div>
          )}
          {findOpen && path && <FindPanel />}
        </section>
      </main>
      <StorageModal />
      <ShareModal />
    </div>
  );
}

export function App() {
  const user = userStore.use();
  const path = window.location.pathname;

  useEffect(() => {
    void loadUser();
  }, []);

  useEffect(() => {
    if (user && path === "/login") window.history.replaceState({}, "", "/app");
  }, [user, path]);

  if (path === "/privacy") return <Privacy />;
  if (path === "/terms") return <Terms />;
  if (path !== "/app" && path !== "/login") return <Landing />;

  return (
    <>
      {user === undefined ? null : user ? <Workspace key={user.id} /> : <AuthScreen />}
      <DialogHost />
    </>
  );
}
