import { storageApi, type StorageConfig, type StorageInput } from "../api/api";
import { notify } from "../dialog/dialog";
import { flush, openPage } from "../editor/editor";
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
  await flush();
  await openPage(null);
  const config = await storageApi.save(input);
  storageStore.set({ config, open: false, revision: storageStore.get().revision + 1 });
  notify("Object storage connected.");
}

export async function disconnectStorage() {
  await flush();
  await openPage(null);
  const config = await storageApi.clear();
  storageStore.set({ config, open: false, revision: storageStore.get().revision + 1 });
  notify("Object storage disconnected.");
}
