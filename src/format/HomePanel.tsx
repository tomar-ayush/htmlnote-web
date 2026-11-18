import { useEffect, useState, type ReactNode } from "react";
import { editorStore, redo, undo } from "../editor/editor";
import { openFind } from "../find/find";
import { Icon } from "../ui/icons";
import { Btn, Group, NativeInput, Picker } from "../ui/ui";
import { activeCommands, clearFormatting, exec, inlineCode, insertLink, lineHeight, setFontSize } from "./format";

const STATE_COMMANDS = [
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "insertUnorderedList",
  "insertOrderedList",
  "justifyLeft",
  "justifyCenter",
  "justifyRight",
  "justifyFull",
];

const FONTS: [string, string][] = [
  ["Segoe UI, system-ui, sans-serif", "Segoe UI"],
  ["Calibri, Carlito, sans-serif", "Calibri"],
  ["Arial, sans-serif", "Arial"],
  ["Georgia, serif", "Georgia"],
  ["Times New Roman, serif", "Times New Roman"],
  ["Verdana, sans-serif", "Verdana"],
  ["Courier New, monospace", "Courier New"],
];
const SIZES: [string, string][] = ["11", "12", "14", "16", "18", "20", "24", "28", "32", "40", "48"].map((n) => [`${n}px`, n]);
const STYLES: [string, string][] = [
  ["p", "Normal text"],
  ["h1", "Heading 1"],
  ["h2", "Heading 2"],
  ["h3", "Heading 3"],
  ["h4", "Heading 4"],
  ["pre", "Code block"],
  ["blockquote", "Quote"],
];

export function HomePanel() {
  const { doc } = editorStore.use();
  const [active, setActive] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!doc) return;
    const refresh = () => setActive(activeCommands(doc, STATE_COMMANDS));
    doc.addEventListener("selectionchange", refresh);
    return () => doc.removeEventListener("selectionchange", refresh);
  }, [doc]);

  const cmd = (name: string, title: string, label: ReactNode) => (
    <Btn title={title} on={active.has(name)} disabled={!doc} onClick={() => exec(name)}>
      {label}
    </Btn>
  );

  return (
    <>
      <Group label="Undo">
        <Btn title="Undo (Ctrl+Z)" disabled={!doc} onClick={undo}><Icon name="undo" /> Undo</Btn>
        <Btn title="Redo (Ctrl+Shift+Z)" disabled={!doc} onClick={redo}><Icon name="redo" /></Btn>
      </Group>
      <Group label="Text">
        <Picker placeholder="Style" title="Paragraph style" options={STYLES} onPick={(v) => exec("formatBlock", `<${v}>`)} />
        <Picker placeholder="Font" title="Font" options={FONTS} onPick={(v) => exec("fontName", v)} />
        <Picker placeholder="Size" title="Font size" options={SIZES} onPick={setFontSize} />
        {cmd("bold", "Bold (Ctrl+B)", <b>B</b>)}
        {cmd("italic", "Italic (Ctrl+I)", <i>I</i>)}
        {cmd("underline", "Underline (Ctrl+U)", <u>U</u>)}
        {cmd("strikeThrough", "Strikethrough", <s>S</s>)}
        <Btn title="Inline code" disabled={!doc} onClick={inlineCode}><Icon name="code" /></Btn>
        <label className="swatch" title="Text color">
          <span className="swatch-letter">A</span>
          <NativeInput type="color" value="#c92a2a" onCommit={(v) => exec("foreColor", v)} />
        </label>
        <label className="swatch" title="Highlight">
          <span className="swatch-letter mark">ab</span>
          <NativeInput type="color" value="#ffe066" onCommit={(v) => exec("hiliteColor", v)} />
        </label>
        <Btn title="Clear formatting" disabled={!doc} onClick={clearFormatting}><Icon name="clear" /> Clear</Btn>
      </Group>
      <Group label="Paragraph">
        {cmd("insertUnorderedList", "Bulleted list", <><Icon name="listBullet" /> List</>)}
        {cmd("insertOrderedList", "Numbered list", <><Icon name="listNumber" /> Numbered</>)}
        {cmd("outdent", "Decrease indent", <Icon name="outdent" />)}
        {cmd("indent", "Increase indent", <Icon name="indent" />)}
        {cmd("justifyLeft", "Align left", <><Icon name="alignLeft" /> Left</>)}
        {cmd("justifyCenter", "Center", <><Icon name="alignCenter" /> Center</>)}
        {cmd("justifyRight", "Align right", <><Icon name="alignRight" /> Right</>)}
        <Btn title="Less line spacing" disabled={!doc} onClick={() => lineHeight(-0.2)}><Icon name="lineHeight" />−</Btn>
        <Btn title="More line spacing" disabled={!doc} onClick={() => lineHeight(0.2)}><Icon name="lineHeight" />+</Btn>
      </Group>
      <Group label="Links and search">
        <Btn title="Add link (Ctrl+K)" disabled={!doc} onClick={() => void insertLink()}><Icon name="link" /> Link</Btn>
        <Btn title="Remove link" disabled={!doc} onClick={() => exec("unlink")}><Icon name="unlink" /> Unlink</Btn>
        <Btn title="Find and replace (Ctrl+F)" disabled={!doc} onClick={openFind}><Icon name="search" /> Find</Btn>
      </Group>
    </>
  );
}
