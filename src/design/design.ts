import { commit } from "../editor/editor";

const ACCENT = "#7719aa";
const UNITLESS = new Set(["opacity", "font-weight"]);

export type DesignController = { select: (el: HTMLElement | null) => void; refresh: () => void; detach: () => void };

export function describe(el: HTMLElement) {
  const id = el.id ? `#${el.id}` : "";
  const classes = [...el.classList].map((c) => `.${c}`).join("");
  return `${el.tagName.toLowerCase()}${id}${classes}`;
}

export function setStyle(el: HTMLElement, prop: string, raw: string) {
  const value = /^\d+(\.\d+)?$/.test(raw) && !UNITLESS.has(prop) ? `${raw}px` : raw;
  if (value === "") el.style.removeProperty(prop);
  else el.style.setProperty(prop, value);
  if (prop === "border-width" && value && !el.style.borderStyle) el.style.borderStyle = "solid";
}

export function toHex(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if (!m) return "#000000";
  if (m[4] === "0") return "#ffffff";
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

export function attachDesign(
  doc: Document,
  onSelect: (el: HTMLElement | null) => void,
  onEdit: () => void,
): DesignController {
  const win = doc.defaultView!;
  let selected: HTMLElement | null = null;

  const overlay = (css: string) => {
    const el = doc.createElement("div");
    el.setAttribute("data-hn-root", "");
    el.setAttribute("contenteditable", "false");
    el.style.cssText = `position:absolute;z-index:2147483646;pointer-events:none;box-sizing:border-box;display:none;${css}`;
    doc.documentElement.append(el);
    return el;
  };

  const hoverBox = overlay(`outline:1px dashed ${ACCENT};background:rgba(119,25,170,.06)`);
  const hoverLabel = doc.createElement("span");
  hoverLabel.style.cssText = `position:absolute;left:0;top:-18px;font:11px/16px system-ui;padding:0 4px;background:${ACCENT};color:#fff;white-space:nowrap`;
  hoverBox.append(hoverLabel);
  const selectBox = overlay(`border:2px solid ${ACCENT}`);
  const handle = overlay(`width:12px;height:12px;background:${ACCENT};border:2px solid #fff;pointer-events:auto;cursor:nwse-resize`);

  const place = (box: HTMLElement, el: Element) => {
    const r = el.getBoundingClientRect();
    Object.assign(box.style, {
      display: "block",
      left: `${r.left + win.scrollX}px`,
      top: `${r.top + win.scrollY}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
  };

  const pickable = (el: EventTarget | null): el is HTMLElement =>
    el instanceof win.HTMLElement && el !== doc.body && doc.body.contains(el) && !el.closest("#htmlnote-drawing");

  const refresh = () => {
    if (!selected?.isConnected) {
      selectBox.style.display = handle.style.display = "none";
      return;
    }
    place(selectBox, selected);
    const r = selected.getBoundingClientRect();
    Object.assign(handle.style, {
      display: "block",
      left: `${r.right + win.scrollX - 7}px`,
      top: `${r.bottom + win.scrollY - 7}px`,
    });
  };

  const select = (el: HTMLElement | null) => {
    selected = el;
    refresh();
    onSelect(el);
  };

  const onMove = (e: MouseEvent) => {
    if (!pickable(e.target)) {
      hoverBox.style.display = "none";
      return;
    }
    place(hoverBox, e.target);
    hoverLabel.textContent = describe(e.target);
  };

  const onDown = (e: MouseEvent) => {
    if (!pickable(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    select(e.target);
  };

  const onClick = (e: MouseEvent) => {
    if (pickable(e.target)) e.preventDefault();
  };

  const onKey = (e: KeyboardEvent) => {
    if (!selected) return;
    if (e.key === "Escape") select(null);
    if (e.key === "Delete") {
      e.preventDefault();
      commit();
      selected.remove();
      commit();
      select(null);
    }
  };

  const startResize = (e: PointerEvent) => {
    const el = selected;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    commit();
    const cs = win.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const startW = parseFloat(cs.width) || rect.width;
    const startH = parseFloat(cs.height) || rect.height;
    const { clientX: x0, clientY: y0 } = e;
    const move = (ev: PointerEvent) => {
      el.style.width = `${Math.max(10, Math.round(startW + ev.clientX - x0))}px`;
      el.style.height = `${Math.max(10, Math.round(startH + ev.clientY - y0))}px`;
      refresh();
    };
    const up = () => {
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);
      commit();
      onEdit();
    };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up);
  };

  const onResize = () => refresh();

  handle.addEventListener("pointerdown", startResize);
  doc.addEventListener("mousemove", onMove);
  doc.addEventListener("mousedown", onDown, true);
  doc.addEventListener("click", onClick, true);
  doc.addEventListener("keydown", onKey);
  doc.body.addEventListener("input", onResize);
  win.addEventListener("resize", onResize);

  return {
    select,
    refresh,
    detach: () => {
      doc.removeEventListener("mousemove", onMove);
      doc.removeEventListener("mousedown", onDown, true);
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("keydown", onKey);
      doc.body.removeEventListener("input", onResize);
      win.removeEventListener("resize", onResize);
      hoverBox.remove();
      selectBox.remove();
      handle.remove();
    },
  };
}
