import { useEffect, useRef, useState } from "react";
import { createStore } from "../store/store";

type AskOptions = { message?: string; input?: string; confirmText?: string; danger?: boolean };
type Request = AskOptions & { title: string; resolve: (value: string | null) => void };
type Toast = { id: number; text: string; tone: "info" | "error" };

const dialogStore = createStore<Request | null>(null);
const toastStore = createStore<Toast | null>(null);
let toastId = 0;

export function ask(title: string, options: AskOptions = {}) {
  return new Promise<string | null>((resolve) => {
    dialogStore.get()?.resolve(null);
    dialogStore.set({ title, ...options, resolve });
  });
}

export async function confirmAction(title: string, message: string, confirmText: string) {
  return (await ask(title, { message, confirmText, danger: true })) !== null;
}

export function notify(text: string, tone: Toast["tone"] = "info") {
  const id = ++toastId;
  toastStore.set({ id, text, tone });
  setTimeout(() => {
    if (toastStore.get()?.id === id) toastStore.set(null);
  }, 5000);
}

function Dialog({ request }: { request: Request }) {
  const [value, setValue] = useState(request.input ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const hasInput = request.input !== undefined;

  useEffect(() => {
    if (hasInput) inputRef.current?.select();
    else confirmRef.current?.focus();
  }, [hasInput]);

  const close = (result: string | null) => {
    dialogStore.set(null);
    request.resolve(result);
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(null)}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onKeyDown={(e) => e.key === "Escape" && close(null)}
        onSubmit={(e) => {
          e.preventDefault();
          if (hasInput && !value.trim()) return;
          close(hasInput ? value.trim() : "");
        }}
      >
        <h2 id="dialog-title">{request.title}</h2>
        {request.message && <p>{request.message}</p>}
        {hasInput && <input ref={inputRef} autoFocus value={value} onChange={(e) => setValue(e.target.value)} />}
        <div className="dialog-actions">
          <button type="button" onClick={() => close(null)}>Cancel</button>
          <button ref={confirmRef} type="submit" className={request.danger ? "danger" : "primary"}>
            {request.confirmText ?? "OK"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DialogHost() {
  const request = dialogStore.use();
  const toast = toastStore.use();
  return (
    <>
      {request && <Dialog key={request.title + (request.input ?? "")} request={request} />}
      {toast && (
        <div className={`toast ${toast.tone}`} role="status">
          {toast.text}
          <button type="button" aria-label="Dismiss" onClick={() => toastStore.set(null)}>✕</button>
        </div>
      )}
    </>
  );
}
