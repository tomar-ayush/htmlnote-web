import { useEffect } from "react";
import { closeHelp, helpStore } from "./help";
import { SHORTCUT_GROUPS } from "./list";

export function ShortcutsDialog() {
  const open = helpStore.use();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "F1") {
        e.preventDefault();
        closeHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeHelp()}>
      <div className="shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <header>
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button type="button" aria-label="Close" title="Close" onClick={closeHelp}>✕</button>
        </header>
        <div className="shortcut-groups">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.items.map((item) => (
                  <div key={item.label} className="shortcut-row">
                    <dt>{item.label}</dt>
                    <dd>
                      {item.keys.map((key) => (
                        <kbd key={key}>{key}</kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
