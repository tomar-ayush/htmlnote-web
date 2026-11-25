import { createStore } from "../store/store";

/**
 * Full screen covers the whole document, not just the page sheet: anything outside the
 * fullscreen element (ribbon, find panel, dialogs, toasts) would otherwise be invisible,
 * and a hidden dialog would silently swallow every shortcut. The app hides its own chrome
 * via the `is-fullscreen` class instead.
 */
export const fullscreenStore = createStore(false);

if (typeof document !== "undefined") {
  document.addEventListener("fullscreenchange", () => {
    fullscreenStore.set(document.fullscreenElement === document.documentElement);
  });
}

export function toggleFullScreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
    return;
  }
  void document.documentElement.requestFullscreen?.().catch(() => {});
}
