import { useEffect, useRef, useState } from "react";
import { editorStore } from "../editor/editor";
import { Icon, type IconName } from "../ui/icons";
import { Btn, Group } from "../ui/ui";
import { attachDraw, clearDrawing, type DrawController, type Tool } from "./draw";

const TOOLS: [Tool, IconName, string, string][] = [
  ["select", "selectCursor", "Select", "Click a shape, then press Delete"],
  ["pen", "pen", "Pen", "Freehand"],
  ["line", "slashLine", "Line", "Straight line"],
  ["arrow", "arrowUpRight", "Arrow", "Arrow"],
  ["rect", "rect", "Box", "Rectangle"],
  ["ellipse", "circle", "Circle", "Ellipse"],
  ["text", "labelTag", "Label", "Text on the drawing"],
  ["eraser", "eraser", "Eraser", "Click or drag over shapes to erase"],
];

export function DrawTools() {
  const { doc, revision } = editorStore.use();
  const [tool, setTool] = useState<Tool | null>("pen");
  const [color, setColor] = useState("#d9480f");
  const [width, setWidth] = useState(3);
  const [hasSelection, setHasSelection] = useState(false);
  const options = useRef({ tool: tool ?? "pen", color, width });
  const controller = useRef<DrawController | null>(null);
  const drawing = tool !== null;

  useEffect(() => {
    options.current = { tool: tool ?? "pen", color, width };
  }, [tool, color, width]);

  useEffect(() => {
    if (!doc || !drawing) return;
    const c = attachDraw(doc, () => options.current, setHasSelection);
    controller.current = c;
    return () => {
      c.detach();
      controller.current = null;
      setHasSelection(false);
    };
  }, [doc, drawing, revision]);

  return (
    <>
      <Group label="Mode">
        <Btn title="Type and edit text" on={!drawing} onClick={() => setTool(null)}>
          <Icon name="typeText" /> Type
        </Btn>
      </Group>
      <Group label="Tools">
        {TOOLS.map(([id, icon, label, title]) => (
          <Btn key={id} title={title} on={tool === id} disabled={!doc} onClick={() => setTool(id)}>
            <Icon name={icon} /> {label}
          </Btn>
        ))}
      </Group>
      <Group label="Stroke">
        <label className="swatch" title="Pen color">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <select title="Pen width" value={width} onChange={(e) => setWidth(Number(e.target.value))}>
          {[2, 3, 5, 8].map((w) => (
            <option key={w} value={w}>{w} px</option>
          ))}
        </select>
        <Btn title="Delete the selected shape (Delete key)" disabled={!hasSelection} onClick={() => controller.current?.deleteSelected()}>
          <Icon name="trash" /> Delete
        </Btn>
        <Btn title="Remove every drawing on this page" disabled={!doc} onClick={() => doc && clearDrawing(doc)}>
          <Icon name="clear" /> Clear all
        </Btn>
      </Group>
    </>
  );
}
