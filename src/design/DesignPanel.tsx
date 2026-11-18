import { useEffect, useRef, useState } from "react";
import { change, editorStore } from "../editor/editor";
import { Icon } from "../ui/icons";
import { Btn, Group, NativeInput, Row } from "../ui/ui";
import { attachDesign, describe, setStyle, toHex, type DesignController } from "./design";

const SHADOWS: [string, string][] = [
  ["", "None"],
  ["0 1px 3px rgba(0, 0, 0, 0.2)", "Soft"],
  ["0 4px 12px rgba(0, 0, 0, 0.25)", "Medium"],
  ["0 12px 32px rgba(0, 0, 0, 0.3)", "Strong"],
];
const WEIGHTS = ["", "400", "600", "700"];

export function DesignPanel() {
  const { doc, revision } = editorStore.use();
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [, setTick] = useState(0);
  const controller = useRef<DesignController | null>(null);
  const bump = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!doc || !active) return;
    const c = attachDesign(doc, setSelected, bump);
    controller.current = c;
    return () => {
      c.detach();
      controller.current = null;
      setSelected(null);
    };
  }, [doc, active, revision]);

  const edit = (fn: (el: HTMLElement) => HTMLElement | null) => {
    if (!selected) return;
    let next: HTMLElement | null = selected;
    change(() => {
      next = fn(selected);
    });
    controller.current?.select(next);
    bump();
  };

  const cs = selected?.ownerDocument.defaultView?.getComputedStyle(selected);
  const inline = (prop: string) => selected?.style.getPropertyValue(prop) ?? "";
  const computed = (prop: string) => cs?.getPropertyValue(prop) ?? "";
  const apply = (prop: string) => (value: string) => edit((el) => (setStyle(el, prop, value), el));

  const text = (label: string, prop: string) => (
    <label>
      {label}
      <NativeInput value={inline(prop)} placeholder={computed(prop)} disabled={!selected} onCommit={apply(prop)} />
    </label>
  );
  const color = (label: string, prop: string) => (
    <label>
      {label}
      <NativeInput type="color" value={toHex(inline(prop) || computed(prop))} disabled={!selected} onCommit={apply(prop)} />
    </label>
  );

  return (
    <>
      <Group label="Element">
        <Row>
          <Btn on={active} disabled={!doc} onClick={() => setActive(!active)}>
            <Icon name="inspect" /> Select
          </Btn>
          <span className="design-label">{selected ? describe(selected) : active ? "Click an element" : "Nothing selected"}</span>
          <Btn title="Move element up" disabled={!selected} onClick={() => edit((el) => (el.previousElementSibling?.before(el), el))}>
            <Icon name="arrowUp" /> Up
          </Btn>
          <Btn title="Move element down" disabled={!selected} onClick={() => edit((el) => (el.nextElementSibling?.after(el), el))}>
            <Icon name="arrowDown" /> Down
          </Btn>
        </Row>
        <Row>
          <Btn
            title="Duplicate element"
            disabled={!selected}
            onClick={() =>
              edit((el) => {
                const copy = el.cloneNode(true) as HTMLElement;
                copy.removeAttribute("id");
                el.after(copy);
                return copy;
              })
            }
          >
            <Icon name="copy" /> Duplicate
          </Btn>
          <Btn title="Delete element" disabled={!selected} onClick={() => edit((el) => (el.remove(), null))}>
            <Icon name="trash" /> Delete
          </Btn>
          <Btn title="Reset inline styles" disabled={!selected} onClick={() => edit((el) => (el.removeAttribute("style"), el))}>
            <Icon name="reset" /> Reset
          </Btn>
        </Row>
      </Group>
      <Group label="Box and type">
        <Row>
          {text("W", "width")}
          {text("H", "height")}
          {text("Padding", "padding")}
          {text("Margin", "margin")}
        </Row>
        <Row>
          {color("Fill", "background-color")}
          {color("Text", "color")}
          {text("Size", "font-size")}
          <label>
            Weight
            <select disabled={!selected} value={inline("font-weight")} onChange={(e) => apply("font-weight")(e.target.value)}>
              {WEIGHTS.map((w) => (
                <option key={w} value={w}>{w || "—"}</option>
              ))}
            </select>
          </label>
        </Row>
      </Group>
      <Group label="Look">
        <Row>
          {text("Border", "border-width")}
          {color("Color", "border-color")}
          {text("Radius", "border-radius")}
          <label>
            Opacity
            <NativeInput
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={inline("opacity") || computed("opacity") || "1"}
              disabled={!selected}
              onCommit={apply("opacity")}
            />
          </label>
        </Row>
        <Row>
          <label>
            Shadow
            <select disabled={!selected} value={inline("box-shadow")} onChange={(e) => apply("box-shadow")(e.target.value)}>
              {SHADOWS.map(([v, l]) => (
                <option key={l} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Alt
            <NativeInput
              value={selected?.getAttribute("alt") ?? ""}
              disabled={selected?.tagName !== "IMG"}
              onCommit={(v) => edit((el) => (el.setAttribute("alt", v), el))}
            />
          </label>
          <label>
            CSS
            <NativeInput
              className="css-input"
              value=""
              placeholder="prop: value;"
              disabled={!selected}
              onCommit={(v) => v && edit((el) => ((el.style.cssText += `;${v}`), el))}
            />
          </label>
        </Row>
      </Group>
    </>
  );
}
