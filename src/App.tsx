import { useEffect } from "react";
import { AuthScreen } from "./auth/AuthScreen";
import { loadUser, userStore } from "./auth/auth";
import { DialogHost } from "./dialog/dialog";
import { attachFrame, editorStore } from "./editor/editor";
import { FindPanel } from "./find/FindPanel";
import { findStore } from "./find/find";
import { Header } from "./header/Header";
import { Navigation } from "./navigation/Navigation";
import { Ribbon } from "./ribbon/Ribbon";
import { StorageModal, StorageSetup } from "./storage/StorageModal";
import { loadStorage, resetStorage, storageStore } from "./storage/storage";

function Workspace() {
  const { path } = editorStore.use();
  const findOpen = findStore.use();
  const { config, revision } = storageStore.use();

  useEffect(() => {
    resetStorage();
    void loadStorage();
  }, []);

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
          <iframe ref={attachFrame} title="Page content" />
          {!path && (
            <div className="empty">
              <p>Pick a page on the left, add a new one, or import .html files.</p>
            </div>
          )}
          {findOpen && path && <FindPanel />}
        </section>
      </main>
      <StorageModal />
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
