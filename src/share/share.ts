import { createStore } from "../store/store";

export const shareStore = createStore<{ path: string | null }>({ path: null });

export function openShare(path: string) {
  shareStore.set({ path });
}

export function closeShare() {
  shareStore.set({ path: null });
}
