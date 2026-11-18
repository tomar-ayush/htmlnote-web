import { useEffect, useRef, useState } from "react";
import { editorStore } from "../editor/editor";
import { Btn, Group } from "../ui/ui";
import { attachDraw, clearDrawing, type DrawController, type Tool } from "./draw";

const TOOLS: [Tool, string, string][] = [
  ["select", "Select shape", "Click a shape, then press Delete"],
  ["pen", "Pen", "Freehand"],
  ["line", "Line", "Straight line"],
  ["arrow", "Arrow", "Arrow"],
  ["rect", "Box", "Rectangle"],
  ["ellipse", "Circle", "Ellipse"],
  ["text", "Label", "Text on the drawing"],
  ["eraser", "Eraser", "Click or drag over shapes to erase"],
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
    <Group label="Draw">
      <Btn title="Type and edit text" on={!drawing} onClick={() => setTool(null)}>Type</Btn>
      {TOOLS.map(([id, label, title]) => (
        <Btn key={id} title={title} on={tool === id} disabled={!doc} onClick={() => setTool(id)}>
          {label}
        </Btn>
      ))}
      <label className="swatch" title="Pen color">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </label>
      <select title="Pen width" value={width} onChange={(e) => setWidth(Number(e.target.value))}>
        {[2, 3, 5, 8].map((w) => (
          <option key={w} value={w}>{w} px</option>
        ))}
      </select>
      <Btn title="Delete the selected shape (Delete key)" disabled={!hasSelection} onClick={() => controller.current?.deleteSelected()}>
        Delete shape
      </Btn>
      <Btn title="Remove every drawing on this page" disabled={!doc} onClick={() => doc && clearDrawing(doc)}>
        Clear drawings
      </Btn>
    </Group>
  );
}
