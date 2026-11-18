import { useState } from "react";
import { DesignPanel } from "../design/DesignPanel";
import { DrawTools } from "../draw/DrawTools";
import { HomePanel } from "../format/HomePanel";
import { HistoryPanel } from "../history/HistoryPanel";
import { InsertPanel } from "../insert/InsertPanel";

const TABS = {
  home: ["Home", HomePanel],
  insert: ["Insert", InsertPanel],
  draw: ["Draw", DrawTools],
  design: ["Design", DesignPanel],
  history: ["History", HistoryPanel],
} as const;

type TabName = keyof typeof TABS;

export function Ribbon() {
  const [tab, setTab] = useState<TabName>("home");
  const Panel = TABS[tab][1];
  return (
    <div
      className="toolbar"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
    >
      <div className="ribbon-tabs" role="tablist" aria-label="Toolbar">
        {(Object.keys(TABS) as TabName[]).map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>
            {TABS[name][0]}
          </button>
        ))}
      </div>
      <div className="toolbar-groups" role="tabpanel">
        <Panel />
      </div>
    </div>
  );
}
