import { useEffect, useState, type ReactNode } from "react";
import { DrawTools } from "../draw/DrawTools";
import { editorStore, redo, undo } from "../editor/editor";
import { openFind } from "../find/find";
import { openShare } from "../share/share";
import { Icon } from "../ui/icons";
import { Btn, Group, NativeInput, Picker, Row } from "../ui/ui";
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
  const { doc, path } = editorStore.use();
  const [active, setActive] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!doc) return;
    const refresh = () => setActive(activeCommands(doc, STATE_COMMANDS));
    doc.addEventListener("selectionchange", refresh);
    return () => doc.removeEventListener("selectionchange", refresh);
  }, [doc]);

  const cmd = (name: string, title: string, label: ReactNode, shortcut?: string) => (
    <Btn title={title} shortcut={shortcut} on={active.has(name)} disabled={!doc} onClick={() => exec(name)}>
      {label}
    </Btn>
  );

  return (
    <>
      <Group label="Undo">
        <Row>
          <Btn title="Undo" shortcut="undo" disabled={!doc} onClick={undo}><Icon name="undo" /> Undo</Btn>
        </Row>
        <Row>
          <Btn title="Redo" shortcut="redo" disabled={!doc} onClick={redo}><Icon name="redo" /> Redo</Btn>
        </Row>
      </Group>
      <Group label="Text">
        <Row>
          <Picker placeholder="Style" title="Paragraph style" shortcut="heading" options={STYLES} onPick={(v) => exec("formatBlock", `<${v}>`)} />
          <Picker placeholder="Font" title="Font" options={FONTS} onPick={(v) => exec("fontName", v)} />
          <Picker placeholder="Size" title="Font size" options={SIZES} onPick={setFontSize} />
        </Row>
        <Row>
          {cmd("bold", "Bold", <b>B</b>, "bold")}
          {cmd("italic", "Italic", <i>I</i>, "italic")}
          {cmd("underline", "Underline", <u>U</u>, "underline")}
          {cmd("strikeThrough", "Strikethrough", <s>S</s>, "strike")}
          <Btn title="Inline code" shortcut="inlineCode" disabled={!doc} onClick={inlineCode}><Icon name="code" /></Btn>
          <label className="swatch" title="Text color">
            <span className="swatch-letter">A</span>
            <NativeInput type="color" value="#c92a2a" onCommit={(v) => exec("foreColor", v)} />
          </label>
          <label className="swatch" title="Highlight">
            <span className="swatch-letter mark">ab</span>
            <NativeInput type="color" value="#ffe066" onCommit={(v) => exec("hiliteColor", v)} />
          </label>
          <Btn title="Clear formatting" shortcut="clearFormatting" disabled={!doc} onClick={clearFormatting}><Icon name="clear" /> Clear</Btn>
        </Row>
      </Group>
      <Group label="Paragraph">
        <Row>
          {cmd("insertUnorderedList", "Bulleted list", <><Icon name="listBullet" /> List</>, "bulletedList")}
          {cmd("insertOrderedList", "Numbered list", <><Icon name="listNumber" /> Numbered</>, "numberedList")}
          {cmd("outdent", "Decrease indent", <Icon name="outdent" />)}
          {cmd("indent", "Increase indent", <Icon name="indent" />)}
        </Row>
        <Row>
          {cmd("justifyLeft", "Align left", <><Icon name="alignLeft" /> Left</>, "alignLeft")}
          {cmd("justifyCenter", "Center", <><Icon name="alignCenter" /> Center</>, "alignCenter")}
          {cmd("justifyRight", "Align right", <><Icon name="alignRight" /> Right</>, "alignRight")}
          <Btn title="Less line spacing" disabled={!doc} onClick={() => lineHeight(-0.2)}><Icon name="lineHeight" />−</Btn>
          <Btn title="More line spacing" disabled={!doc} onClick={() => lineHeight(0.2)}><Icon name="lineHeight" />+</Btn>
        </Row>
      </Group>
      <Group label="Links & share">
        <Row>
          <Btn title="Add link" shortcut="link" disabled={!doc} onClick={() => void insertLink()}><Icon name="link" /> Link</Btn>
          <Btn title="Remove link" disabled={!doc} onClick={() => exec("unlink")}><Icon name="unlink" /> Unlink</Btn>
        </Row>
        <Row>
          <Btn title="Find and replace" shortcut="find" disabled={!doc} onClick={openFind}><Icon name="search" /> Find</Btn>
          <Btn title="Share page" disabled={!path} onClick={() => path && openShare(path)}><Icon name="share" /> Share</Btn>
        </Row>
      </Group>
      <DrawTools />
    </>
  );
}
