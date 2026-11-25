import { useEffect, useRef, useState } from "react";
import { change, editorStore } from "../editor/editor";
import { clearPaint, findStore, paint, replaceRange, scrollToRange, search, setFindStepper } from "./find";

export function FindPanel() {
  const { doc, revision } = editorStore.use();
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [index, setIndex] = useState(0);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [tick, setTick] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const stepRef = useRef<(step: number) => void>(() => {});

  useEffect(() => {
    setFindStepper((step) => stepRef.current(step));
    return () => setFindStepper(null);
  }, []);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  useEffect(() => {
    setRanges(doc ? search(doc, query, matchCase) : []);
  }, [doc, revision, query, matchCase, tick]);

  const current = ranges.length ? Math.min(index, ranges.length - 1) : -1;

  useEffect(() => {
    if (doc) paint(doc, ranges, current);
  }, [doc, ranges, current]);

  useEffect(() => () => clearPaint(editorStore.get().doc), []);

  const go = (step: number) => {
    if (!doc || !ranges.length) return;
    const next = (current + step + ranges.length) % ranges.length;
    setIndex(next);
    scrollToRange(doc, ranges[next]);
  };

  stepRef.current = go;

  const replace = (all: boolean) => {
    if (current < 0) return;
    const targets = all ? [...ranges].reverse() : [ranges[current]];
    change((d) => targets.forEach((r) => replaceRange(d, r, replacement)));
    setTick((t) => t + 1);
  };

  const count = ranges.length ? `${current + 1} / ${ranges.length}` : query ? "No results" : "";

  return (
    <div className="find-panel">
      <input
        ref={input}
        placeholder="Find"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") go(e.shiftKey ? -1 : 1);
          if (e.key === "Escape") findStore.set(false);
        }}
      />
      <input placeholder="Replace with" value={replacement} onChange={(e) => setReplacement(e.target.value)} />
      <label>
        <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case
      </label>
      <span className="find-count">{count}</span>
      <div className="row">
        <button type="button" aria-label="Previous match" data-tip="Previous match" data-shortcut="findPrev" onClick={() => go(-1)}>↑</button>
        <button type="button" aria-label="Next match" data-tip="Next match" data-shortcut="findNext" onClick={() => go(1)}>↓</button>
        <button type="button" onClick={() => replace(false)}>Replace</button>
        <button type="button" onClick={() => replace(true)}>Replace all</button>
        <button type="button" aria-label="Close find" data-tip="Close find" data-shortcut="escape" onClick={() => findStore.set(false)}>✕</button>
      </div>
    </div>
  );
}
