const mac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

export const MOD = mac ? "⌘" : "Ctrl";
export const ALT = mac ? "⌥" : "Alt";
export const SHIFT = mac ? "⇧" : "Shift";

/** `id` is what buttons point at with `data-shortcut`, so a hint can never drift from this list. */
export type ShortcutItem = { id: string; keys: string[]; label: string };
export type ShortcutGroup = { title: string; items: ShortcutItem[] };

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Editing",
    items: [
      { id: "undo", keys: [MOD, "Z"], label: "Undo" },
      { id: "redo", keys: [MOD, SHIFT, "Z"], label: "Redo" },
      { id: "redoAlt", keys: [MOD, "Y"], label: "Redo (alternate)" },
      { id: "save", keys: [MOD, "S"], label: "Save now" },
      { id: "bold", keys: [MOD, "B"], label: "Bold" },
      { id: "italic", keys: [MOD, "I"], label: "Italic" },
      { id: "underline", keys: [MOD, "U"], label: "Underline" },
      { id: "strike", keys: [MOD, SHIFT, "X"], label: "Strikethrough" },
      { id: "link", keys: [MOD, SHIFT, "K"], label: "Add or edit a link" },
      { id: "openLink", keys: [MOD, "Click"], label: "Open a link" },
      { id: "inlineCode", keys: [MOD, ALT, "C"], label: "Inline code" },
      { id: "clearFormatting", keys: [MOD, "\\"], label: "Clear formatting" },
      { id: "plainPaste", keys: [MOD, SHIFT, "V"], label: "Paste as plain text" },
    ],
  },
  {
    title: "Paragraphs",
    items: [
      { id: "normalText", keys: [MOD, ALT, "0"], label: "Normal text" },
      { id: "heading", keys: [MOD, ALT, "1 – 6"], label: "Heading 1 – 6" },
      { id: "numberedList", keys: [MOD, SHIFT, "7"], label: "Numbered list" },
      { id: "bulletedList", keys: [MOD, SHIFT, "8"], label: "Bulleted list" },
      { id: "alignLeft", keys: [MOD, ALT, "L"], label: "Align left" },
      { id: "alignCenter", keys: [MOD, ALT, "E"], label: "Center" },
      { id: "alignRight", keys: [MOD, ALT, "R"], label: "Align right" },
      { id: "justify", keys: [MOD, ALT, "J"], label: "Justify" },
    ],
  },
  {
    title: "Finding text",
    items: [
      { id: "find", keys: [MOD, "F"], label: "Find and replace" },
      { id: "findNext", keys: ["F3"], label: "Next match" },
      { id: "findPrev", keys: [SHIFT, "F3"], label: "Previous match" },
      { id: "escape", keys: ["Esc"], label: "Close find, full screen or a dialog" },
    ],
  },
  {
    title: "Pages",
    items: [
      { id: "newPage", keys: [MOD, ALT, "N"], label: "New page" },
      { id: "newNotebook", keys: [MOD, ALT, SHIFT, "N"], label: "New notebook" },
      { id: "movePageUp", keys: [ALT, "↑"], label: "Move page up" },
      { id: "movePageDown", keys: [ALT, "↓"], label: "Move page down" },
      { id: "renamePage", keys: ["F2"], label: "Rename open page" },
    ],
  },
  {
    title: "This app",
    items: [
      { id: "fullscreen", keys: [MOD, SHIFT, "F"], label: "Full screen" },
      { id: "print", keys: [MOD, "P"], label: "Print or save as PDF" },
      { id: "help", keys: [MOD, "/"], label: "Show this list" },
    ],
  },
];

export const SHORTCUT_KEYS: Record<string, string[]> = Object.fromEntries(
  SHORTCUT_GROUPS.flatMap((group) => group.items.map((item) => [item.id, item.keys])),
);
