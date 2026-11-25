import { useEffect, useRef, useState } from "react";
import { SHORTCUT_KEYS } from "./list";

/** How long a pointer has to rest on a control before its shortcut is revealed. */
export const HINT_DELAY = 2000;

type Tip = { label: string; keys: string[]; x: number; y: number; above: boolean };

export function ShortcutHint() {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef(0);
  const anchor = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const hide = () => {
      window.clearTimeout(timer.current);
      timer.current = 0;
      anchor.current = null;
      setTip(null);
    };

    const reveal = (el: HTMLElement) => {
      const keys = SHORTCUT_KEYS[el.dataset.shortcut ?? ""];
      const rect = el.getBoundingClientRect();
      if (!keys || !rect.width) return;
      const above = rect.bottom + 64 > window.innerHeight;
      setTip({
        label: el.dataset.tip ?? "",
        keys,
        x: Math.min(Math.max(12, rect.left + rect.width / 2), window.innerWidth - 12),
        y: above ? rect.top - 8 : rect.bottom + 8,
        above,
      });
    };

    const onOver = (e: PointerEvent) => {
      const el = ((e.target as Element | null)?.closest?.("[data-shortcut]") ?? null) as HTMLElement | null;
      if (!el || el === anchor.current) return;
      hide();
      anchor.current = el;
      timer.current = window.setTimeout(() => {
        if (el.isConnected) reveal(el);
      }, HINT_DELAY);
    };

    const onOut = (e: PointerEvent) => {
      const el = anchor.current;
      if (!el) return;
      const next = e.relatedTarget as Node | null;
      if (next && el.contains(next)) return;
      hide();
    };

    window.addEventListener("pointerover", onOver, true);
    window.addEventListener("pointerout", onOut, true);
    window.addEventListener("pointerdown", hide, true);
    window.addEventListener("keydown", hide, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener("pointerover", onOver, true);
      window.removeEventListener("pointerout", onOut, true);
      window.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("keydown", hide, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      className={tip.above ? "shortcut-hint above" : "shortcut-hint"}
      role="tooltip"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.label && <span className="hint-label">{tip.label}</span>}
      {tip.keys.map((key) => (
        <kbd key={key}>{key}</kbd>
      ))}
    </div>
  );
}
