import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";

export function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group" role="group" aria-label={label}>
      <div className="group-items">{children}</div>
      <span className="caption" aria-hidden="true">{label}</span>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="group-row">{children}</div>;
}

/**
 * `shortcut` is an id from `shortcuts/list.ts`. Controls that have one drop the native
 * tooltip and instead show the hover hint (label + keys) after a short pause.
 */
type BtnProps = { onClick: () => void; title?: string; on?: boolean; disabled?: boolean; shortcut?: string; children: ReactNode };

export function Btn({ onClick, title, on, disabled, shortcut, children }: BtnProps) {
  return (
    <button
      type="button"
      className={on ? "on" : undefined}
      aria-pressed={on}
      aria-label={shortcut ? title : undefined}
      title={shortcut ? undefined : title}
      data-tip={shortcut ? title : undefined}
      data-shortcut={shortcut}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> & {
  value: string;
  onCommit: (value: string) => void;
};

export function NativeInput({ value, onCommit, ...rest }: NativeInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  });
  useEffect(() => {
    if (ref.current) ref.current.value = value;
  }, [value]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => commitRef.current(el.value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, []);
  return <input ref={ref} defaultValue={value} {...rest} />;
}

type PickerProps = { placeholder: string; title: string; shortcut?: string; options: [string, string][]; onPick: (value: string) => void };

export function Picker({ placeholder, title, shortcut, options, onPick }: PickerProps) {
  return (
    <select
      title={shortcut ? undefined : title}
      aria-label={shortcut ? title : undefined}
      data-tip={shortcut ? title : undefined}
      data-shortcut={shortcut}
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
