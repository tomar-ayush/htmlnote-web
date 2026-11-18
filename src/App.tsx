import { useEffect, useRef, useState } from "react";
import { AuthScreen } from "./auth/AuthScreen";
import { loadUser, userStore } from "./auth/auth";
import { DialogHost } from "./dialog/dialog";
import { attachFrame, editorStore, focusDoc } from "./editor/editor";
import { FindPanel } from "./find/FindPanel";
import { findStore } from "./find/find";
import { Header } from "./header/Header";
import { Navigation, requestPageRename } from "./navigation/Navigation";
import { Ribbon } from "./ribbon/Ribbon";
import { ShareModal } from "./share/ShareModal";
import { openShare } from "./share/share";
import { StorageModal, StorageSetup } from "./storage/StorageModal";
import { loadStorage, resetStorage, storageStore } from "./storage/storage";
import { Icon } from "./ui/icons";

function Workspace() {
  const { path } = editorStore.use();
  const findOpen = findStore.use();
  const { config, revision } = storageStore.use();
  const pageTitle = path ? (path.split("/").pop() ?? "").replace(/\.html?$/i, "") : "";
  const [titleDraft, setTitleDraft] = useState(pageTitle);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    setTitleDraft(pageTitle);
  }, [pageTitle]);

  useEffect(() => {
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
          <div className={path ? "page-sheet" : "page-sheet is-empty"}>
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

  useEffect(() => {
    void loadUser();
  }, []);

  return (
    <>
      {user === undefined ? null : user ? <Workspace key={user.id} /> : <AuthScreen />}
      <DialogHost />
    </>
  );
}
