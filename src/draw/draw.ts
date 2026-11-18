import { ask } from "../dialog/dialog";
import { change, commit } from "../editor/editor";

export type Tool = "select" | "pen" | "line" | "arrow" | "rect" | "ellipse" | "text" | "eraser";
export type DrawOptions = { tool: Tool; color: string; width: number };
export type DrawController = { detach: () => void; deleteSelected: () => void };
type Point = { x: number; y: number };

const LAYER_ID = "htmlnote-drawing";
const SVG_NS = "http://www.w3.org/2000/svg";
const HIT_SLOP = 8;
const TAGS: Record<string, string> = { pen: "path", line: "line", arrow: "path", rect: "rect", ellipse: "ellipse" };
const CURSORS: Partial<Record<Tool, string>> = { select: "default", eraser: "cell", text: "text" };

function layer(doc: Document, create: boolean) {
  let el = doc.getElementById(LAYER_ID);
  if (!el && create) {
    el = doc.createElement("div");
    el.id = LAYER_ID;
    el.setAttribute("contenteditable", "false");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483000";
    el.innerHTML = `<svg xmlns="${SVG_NS}" width="1" height="1" style="position:absolute;left:0;top:0;overflow:visible"></svg>`;
    doc.body.append(el);
  }
  return el;
}

const shapes = (doc: Document) => [...(layer(doc, false)?.querySelectorAll<SVGGraphicsElement>("svg > *") ?? [])];

function attrs(el: Element, map: Record<string, string | number>) {
  for (const [k, v] of Object.entries(map)) el.setAttribute(k, typeof v === "number" ? v.toFixed(1) : v);
}

function arrowPath(a: Point, b: Point) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const head = (turn: number) => `${(b.x - 14 * Math.cos(angle + turn)).toFixed(1)} ${(b.y - 14 * Math.sin(angle + turn)).toFixed(1)}`;
  return `M${a.x} ${a.y} L${b.x} ${b.y} M${head(-0.45)} L${b.x} ${b.y} L${head(0.45)}`;
}

function removeShape(doc: Document, shape: Element) {
  shape.remove();
  if (!shapes(doc).length) layer(doc, false)?.remove();
}

export function clearDrawing(doc: Document) {
  const el = layer(doc, false);
  if (el) change(() => el.remove());
}

export function attachDraw(doc: Document, options: () => DrawOptions, onSelect: (has: boolean) => void): DrawController {
  const win = doc.defaultView!;
  let drawing: { el: SVGElement; start: Point; points: Point[]; tool: Tool } | null = null;
  let erasing = false;
  let selected: SVGGraphicsElement | null = null;

  const capture = doc.createElement("div");
  capture.setAttribute("data-hn-root", "");
  capture.style.cssText = "position:fixed;inset:0;z-index:2147483647;touch-action:none";
  const outline = doc.createElement("div");
  outline.setAttribute("data-hn-root", "");
  outline.style.cssText = "position:absolute;z-index:2147483646;pointer-events:none;display:none;border:1.5px dashed #7719aa;border-radius:3px";
  doc.documentElement.append(outline, capture);

  const origin = () => layer(doc, false)?.getBoundingClientRect() ?? null;
  const point = (e: PointerEvent, o: DOMRect): Point => ({ x: e.clientX - o.left, y: e.clientY - o.top });

  const hitTest = (p: Point) =>
    shapes(doc)
      .reverse()
      .find((s) => {
        const b = s.getBBox();
        return p.x >= b.x - HIT_SLOP && p.x <= b.x + b.width + HIT_SLOP && p.y >= b.y - HIT_SLOP && p.y <= b.y + b.height + HIT_SLOP;
      }) ?? null;

  const select = (shape: SVGGraphicsElement | null) => {
    selected = shape;
    const o = origin();
    if (!shape || !o) {
      outline.style.display = "none";
    } else {
      const b = shape.getBBox();
      Object.assign(outline.style, {
        display: "block",
        left: `${o.left + win.scrollX + b.x - 6}px`,
        top: `${o.top + win.scrollY + b.y - 6}px`,
        width: `${b.width + 12}px`,
        height: `${b.height + 12}px`,
      });
    }
    onSelect(!!shape);
  };

  const deleteSelected = () => {
    const shape = selected;
    if (!shape) return;
    select(null);
    change(() => removeShape(doc, shape));
  };

  const eraseAt = (e: PointerEvent) => {
    const o = origin();
    const hit = o && hitTest(point(e, o));
    if (hit) change(() => removeShape(doc, hit));
  };

  const update = (p: Point) => {
    if (!drawing) return;
    const { el, start, tool } = drawing;
    const x = Math.min(start.x, p.x);
    const y = Math.min(start.y, p.y);
    const w = Math.abs(p.x - start.x);
    const h = Math.abs(p.y - start.y);
    if (tool === "pen") {
      drawing.points.push(p);
      attrs(el, { d: drawing.points.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ") });
    } else if (tool === "line") attrs(el, { x1: start.x, y1: start.y, x2: p.x, y2: p.y });
    else if (tool === "arrow") attrs(el, { d: arrowPath(start, p) });
    else if (tool === "rect") attrs(el, { x, y, width: w, height: h, rx: 4 });
    else if (tool === "ellipse") attrs(el, { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 });
  };

  const addText = async (p: Point, { color, width }: DrawOptions) => {
    const value = await ask("Add text to the drawing", { input: "", confirmText: "Add" });
    if (!value) return;
    change(() => {
      const el = doc.createElementNS(SVG_NS, "text");
      attrs(el, { x: p.x, y: p.y, fill: color, "font-size": 14 + width * 2, "font-family": "system-ui, sans-serif" });
      el.textContent = value;
      layer(doc, true)!.querySelector("svg")!.append(el);
    });
  };

  const onDown = (e: PointerEvent) => {
    e.preventDefault();
    const opts = options();
    if (opts.tool === "select") {
      const o = origin();
      return select(o && hitTest(point(e, o)));
    }
    select(null);
    if (opts.tool === "eraser") {
      erasing = true;
      capture.setPointerCapture(e.pointerId);
      return eraseAt(e);
    }
    const p = point(e, layer(doc, true)!.getBoundingClientRect());
    if (opts.tool === "text") return void addText(p, opts);
    commit();
    const el = doc.createElementNS(SVG_NS, TAGS[opts.tool]);
    attrs(el, { stroke: opts.color, "stroke-width": opts.width, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
    layer(doc, true)!.querySelector("svg")!.append(el);
    drawing = { el, start: p, points: [p], tool: opts.tool };
    capture.setPointerCapture(e.pointerId);
    update(p);
  };

  const onMove = (e: PointerEvent) => {
    capture.style.cursor = CURSORS[options().tool] ?? "crosshair";
    if (erasing) return eraseAt(e);
    const o = origin();
    if (drawing && o) update(point(e, o));
  };

  const onUp = (e: PointerEvent) => {
    erasing = false;
    const o = origin();
    if (!drawing || !o) return;
    const end = point(e, o);
    const tiny = Math.hypot(end.x - drawing.start.x, end.y - drawing.start.y) < 3;
    if (drawing.tool !== "pen" && tiny) removeShape(doc, drawing.el);
    drawing = null;
    commit();
  };

  const onKey = (e: KeyboardEvent) => {
    if (!selected) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
    } else if (e.key === "Escape") select(null);
  };

  capture.addEventListener("pointerdown", onDown);
  capture.addEventListener("pointermove", onMove);
  capture.addEventListener("pointerup", onUp);
  doc.addEventListener("keydown", onKey);

  return {
    deleteSelected,
    detach: () => {
      doc.removeEventListener("keydown", onKey);
      capture.remove();
      outline.remove();
    },
  };
}
