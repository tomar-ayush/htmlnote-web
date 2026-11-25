type KeyHandler = (e: KeyboardEvent, fromEditor: boolean) => boolean;

let handler: KeyHandler | null = null;
let plainPasteUntil = 0;

export function setKeyHandler(fn: KeyHandler | null) {
  handler = fn;
}

export function runKeyHandler(e: KeyboardEvent, fromEditor = false) {
  return handler ? handler(e, fromEditor) : false;
}

/** Ctrl+Shift+V arms this; the paste event that follows is inserted as plain text. */
export function markPlainPaste() {
  plainPasteUntil = Date.now() + 1500;
}

export function consumePlainPaste() {
  if (Date.now() > plainPasteUntil) return false;
  plainPasteUntil = 0;
  return true;
}
