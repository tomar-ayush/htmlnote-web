import { useState } from "react";
import { DesignPanel } from "../design/DesignPanel";
import { HomePanel } from "../format/HomePanel";
import { SaveStatus } from "../header/Header";
import { HistoryPanel } from "../history/HistoryPanel";
import { InsertPanel } from "../insert/InsertPanel";
import { Icon, type IconName } from "../ui/icons";

const TABS = {
  home: ["Home", "tabHome", HomePanel],
  insert: ["Insert", "tabInsert", InsertPanel],
  design: ["Design", "tabDesign", DesignPanel],
  history: ["History", "tabHistory", HistoryPanel],
} as const;

type TabName = keyof typeof TABS;

export function Ribbon() {
  const [tab, setTab] = useState<TabName>("home");
  const Panel = TABS[tab][2];
  return (
    <div
      className="toolbar"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
    >
      <div className="ribbon-bar">
        <div className="ribbon-tabs" role="tablist" aria-label="Toolbar">
          {(Object.keys(TABS) as TabName[]).map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>
              <Icon name={TABS[name][1] as IconName} size={14} />
              {TABS[name][0]}
            </button>
          ))}
        </div>
        <SaveStatus />
      </div>
      <div className="toolbar-groups" role="tabpanel">
        <Panel />
      </div>
    </div>
  );
}
