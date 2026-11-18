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

type BtnProps = { onClick: () => void; title?: string; on?: boolean; disabled?: boolean; children: ReactNode };

export function Btn({ onClick, title, on, disabled, children }: BtnProps) {
  return (
    <button
      type="button"
      className={on ? "on" : undefined}
      aria-pressed={on}
      title={title}
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

type PickerProps = { placeholder: string; title: string; options: [string, string][]; onPick: (value: string) => void };

export function Picker({ placeholder, title, options, onPick }: PickerProps) {
  return (
    <select title={title} value="" onChange={(e) => e.target.value && onPick(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
