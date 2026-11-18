import { driveApi, storageApi, type StorageConfig, type StorageInput } from "../api/api";
import { notify } from "../dialog/dialog";
import { clearPageCache, flushAll, openPage } from "../editor/editor";
import { createStore } from "../store/store";

type StorageState = {
  config: StorageConfig | null | undefined;
  open: boolean;
  revision: number;
};

export const storageStore = createStore<StorageState>({
  config: undefined,
  open: false,
  revision: 0,
});

const patch = (next: Partial<StorageState>) => storageStore.set({ ...storageStore.get(), ...next });

export function resetStorage() {
  storageStore.set({ config: undefined, open: false, revision: 0 });
}

export async function loadStorage() {
  try {
    patch({ config: await storageApi.get() });
  } catch (err) {
    patch({ config: null });
    notify((err as Error).message, "error");
  }
}

export const openStorage = () => patch({ open: true });
export const closeStorage = () => patch({ open: false });

export async function saveStorage(input: StorageInput) {
  await flushAll();
  await openPage(null);
  clearPageCache();
  const config = await storageApi.save(input);
  storageStore.set({ config, open: false, revision: storageStore.get().revision + 1 });
  notify("Object storage connected.");
}

export async function disconnectStorage() {
  await flushAll();
  await openPage(null);
  clearPageCache();
  const config = await storageApi.clear();
  storageStore.set({ config, open: false, revision: storageStore.get().revision + 1 });
  notify("Object storage disconnected.");
}

export async function connectGoogleDrive() {
  await flushAll();
  const { url } = await driveApi.authUrl();
  window.location.href = url;
}

export async function switchProvider(provider: "gdrive" | "s3") {
  await flushAll();
  await openPage(null);
  clearPageCache();
  const config = await driveApi.setProvider(provider);
  storageStore.set({ config, open: false, revision: storageStore.get().revision + 1 });
  notify(provider === "gdrive" ? "Switched active storage to Google Drive." : "Switched active storage to Object Storage.");
}

export async function disconnectGoogleDrive() {
  await flushAll();
  await openPage(null);
  clearPageCache();
  const config = await driveApi.disconnect();
  storageStore.set({ config, open: false, revision: storageStore.get().revision + 1 });
  notify("Google Drive disconnected.");
}
