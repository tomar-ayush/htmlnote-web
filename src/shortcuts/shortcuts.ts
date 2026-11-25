import { isDialogOpen, notify } from "../dialog/dialog";
import { currentHtml, getPath, redo, saveNow, undo } from "../editor/editor";
import { findStore, openFind, stepFind } from "../find/find";
import { clearFormatting, exec, inlineCode, insertLink } from "../format/format";
import { runNavCommand } from "../navigation/commands";
import { shareStore } from "../share/share";
import { storageStore } from "../storage/storage";
import { helpStore, openHelp } from "./help";
import { markPlainPaste, setKeyHandler } from "./keys";

type Binding = { run: () => void; inInput?: boolean; keepDefault?: boolean };

const BINDINGS = new Map<string, Binding>();

function bind(combo: string, run: () => void, options: { inInput?: boolean; keepDefault?: boolean } = {}) {
  BINDINGS.set(combo, { run, ...options });
}

function isEditable(target: HTMLElement | null) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function isBlocked() {
  return isDialogOpen() || helpStore.get() || storageStore.get().open || !!shareStore.get().path;
}

function keyName(e: KeyboardEvent) {
  if (e.code === "Space" || e.key === " ") return "space";
  if (/^F\d{1,2}$/.test(e.key)) return e.key.toLowerCase();
  if (e.key === "Escape") return "escape";
  if (e.key === "Enter") return "enter";
  if (e.key === "Tab") return "tab";
  if (e.key.startsWith("Arrow")) return e.key.toLowerCase();
  if (e.altKey) {
    const letter = /^Key([A-Z])$/.exec(e.code);
    if (letter) return letter[1].toLowerCase();
  }
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
  if (digit) return digit[1];
  return e.key.toLowerCase();
}

function comboOf(e: KeyboardEvent) {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(keyName(e));
  return parts.join("+");
}

function handleKey(e: KeyboardEvent, fromEditor = false) {
  if (e.isComposing || e.defaultPrevented) return false;
  if (isBlocked()) return false;
  const binding = BINDINGS.get(comboOf(e));
  if (!binding) return false;
  if (!fromEditor && isEditable(e.target as HTMLElement | null) && !binding.inInput) return false;
  if (!binding.keepDefault) e.preventDefault();
  binding.run();
  return true;
}

let installed = false;

export function initShortcuts() {
  if (installed) return;
  installed = true;
  setKeyHandler(handleKey);
  window.addEventListener("keydown", (e) => void handleKey(e), true);
}

const format = (cmd: string, value?: string) => () => exec(cmd, value);

function escapePressed() {
  if (findStore.get()) {
    findStore.set(false);
    return;
  }
  if (document.fullscreenElement) void document.exitFullscreen();
}

function renameOpenPage() {
  if (!getPath()) return;
  const input = document.querySelector<HTMLInputElement>(".page-title-input");
  input?.focus();
  input?.select();
}

function toggleFullScreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  const sheet = document.querySelector<HTMLElement>(".page-sheet");
  if (sheet?.requestFullscreen) void sheet.requestFullscreen().catch(() => {});
}

function printPage() {
  const html = currentHtml();
  if (!html) {
    notify("Open a page before printing.", "error");
    return;
  }
  const view = window.open("", "_blank");
  if (!view) {
    notify("Allow pop-ups so this page can be printed.", "error");
    return;
  }
  view.document.open();
  view.document.write(html);
  view.document.close();
  view.focus();
  window.setTimeout(() => {
    try {
      view.print();
    } catch {}
  }, 300);
}

bind("ctrl+z", undo);
bind("ctrl+shift+z", redo);
bind("ctrl+y", redo);
bind("ctrl+s", () => void saveNow(), { inInput: true });
bind("ctrl+b", format("bold"));
bind("ctrl+i", format("italic"));
bind("ctrl+u", format("underline"));
bind("ctrl+shift+x", format("strikeThrough"));
bind("ctrl+shift+k", () => void insertLink());
bind("ctrl+alt+c", inlineCode);
bind("ctrl+\\", clearFormatting);
bind("ctrl+shift+v", markPlainPaste, { keepDefault: true });

bind("ctrl+alt+0", format("formatBlock", "<p>"));
bind("ctrl+alt+1", format("formatBlock", "<h1>"));
bind("ctrl+alt+2", format("formatBlock", "<h2>"));
bind("ctrl+alt+3", format("formatBlock", "<h3>"));
bind("ctrl+alt+4", format("formatBlock", "<h4>"));
bind("ctrl+alt+5", format("formatBlock", "<h5>"));
bind("ctrl+alt+6", format("formatBlock", "<h6>"));
bind("ctrl+shift+7", format("insertOrderedList"));
bind("ctrl+shift+8", format("insertUnorderedList"));
bind("ctrl+alt+l", format("justifyLeft"));
bind("ctrl+alt+e", format("justifyCenter"));
bind("ctrl+alt+r", format("justifyRight"));
bind("ctrl+alt+j", format("justifyFull"));

bind("ctrl+f", openFind, { inInput: true });
bind("f3", () => stepFind(1), { inInput: true });
bind("shift+f3", () => stepFind(-1), { inInput: true });
bind("escape", escapePressed, { inInput: true });

bind("ctrl+alt+n", () => runNavCommand("newPage"));
bind("ctrl+alt+shift+n", () => runNavCommand("newNotebook"));
bind("alt+arrowup", () => runNavCommand("movePageUp"));
bind("alt+arrowdown", () => runNavCommand("movePageDown"));
bind("f2", renameOpenPage);

bind("ctrl+shift+f", toggleFullScreen);
bind("ctrl+p", printPage);
bind("ctrl+/", openHelp, { inInput: true });
bind("f1", openHelp, { inInput: true });
