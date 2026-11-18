import { useRef, useState, type FormEvent } from "react";
import { storageApi, type StorageConfig, type StorageInput } from "../api/api";
import { confirmAction } from "../dialog/dialog";
import { closeStorage, disconnectStorage, saveStorage, storageStore } from "./storage";

type Preset = "r2" | "b2" | "aws" | "custom";

const PRESETS: { id: Preset; label: string; endpointPlaceholder: string }[] = [
  { id: "r2", label: "Cloudflare R2", endpointPlaceholder: "https://<account-id>.r2.cloudflarestorage.com" },
  { id: "b2", label: "Backblaze B2", endpointPlaceholder: "https://s3.us-west-004.backblazeb2.com" },
  { id: "aws", label: "AWS S3", endpointPlaceholder: "Leave blank for AWS S3" },
  { id: "custom", label: "Custom S3", endpointPlaceholder: "https://s3.example.com" },
];

const B2_HOST = /^https?:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com/i;

function detectPreset(config: StorageConfig | null | undefined): Preset {
  if (!config?.configured) return "r2";
  if (config.endpointUrl.includes(".r2.cloudflarestorage.com")) return "r2";
  if (config.endpointUrl.includes(".backblazeb2.com")) return "b2";
  if (!config.endpointUrl) return "aws";
  return "custom";
}

function StorageForm({ config, modal }: { config: StorageConfig | null | undefined; modal: boolean }) {
  const [preset, setPreset] = useState<Preset>(() => detectPreset(config));
  const [endpointUrl, setEndpointUrl] = useState(config?.endpointUrl ?? "");
  const [region, setRegion] = useState(config?.region || "auto");
  const [bucket, setBucket] = useState(config?.bucket ?? "");
  const [accessKeyId, setAccessKeyId] = useState(config?.accessKeyId ?? "");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [prefix, setPrefix] = useState(config?.prefix ?? "");
  const [forcePathStyle, setForcePathStyle] = useState(config?.forcePathStyle ?? false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const endpointRef = useRef<HTMLInputElement>(null);

  const pickPreset = (next: Preset) => {
    setPreset(next);
    setStatus(null);
    if (next === "r2") {
      setRegion("auto");
      setForcePathStyle(false);
    } else if (next === "b2") {
      setForcePathStyle(false);
      const m = endpointUrl.match(B2_HOST);
      if (m) setRegion(m[1]);
    } else if (next === "aws") {
      setEndpointUrl("");
      if (!region || region === "auto") setRegion("us-east-1");
      setForcePathStyle(false);
    } else {
      endpointRef.current?.focus();
    }
  };

  const onEndpointChange = (val: string) => {
    setEndpointUrl(val);
    const m = val.trim().match(B2_HOST);
    if (m) setRegion(m[1]);
  };

  const payload = (): StorageInput => ({
    endpointUrl: endpointUrl.trim(),
    region: region.trim() || "auto",
    bucket: bucket.trim(),
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
    prefix: prefix.trim(),
    forcePathStyle,
  });

  const test = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await storageApi.test(payload());
      setStatus({ kind: "ok", text: "Connection verified (list, write, delete)." });
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await saveStorage(payload());
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!(await confirmAction("Disconnect object storage?", "Your notebooks stay in your bucket. You can reconnect anytime.", "Disconnect"))) return;
    setBusy(true);
    setStatus(null);
    try {
      await disconnectStorage();
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  };

  const activePreset = PRESETS.find((p) => p.id === preset)!;

  return (
    <form
      className={modal ? "dialog storage-modal" : "storage-card"}
      role={modal ? "dialog" : undefined}
      aria-modal={modal || undefined}
      aria-labelledby="storage-title"
      onKeyDown={(e) => {
        if (modal && e.key === "Escape") closeStorage();
      }}
      onSubmit={submit}
    >
      <h1 id="storage-title">{config?.configured ? "Object storage settings" : "Connect object storage"}</h1>
      <p className="hint">Notes are stored directly as .html files in your S3-compatible bucket.</p>

      <div className="storage-presets" role="group" aria-label="Storage provider">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={preset === p.id ? "active" : undefined}
            onClick={() => pickPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="storage-grid">
        <label>
          Endpoint URL (S3_ENDPOINT_URL)
          <input
            ref={endpointRef}
            type="url"
            placeholder={activePreset.endpointPlaceholder}
            required={preset !== "aws"}
            value={endpointUrl}
            onChange={(e) => onEndpointChange(e.target.value)}
          />
        </label>
        <label>
          Region (S3_REGION)
          <input
            type="text"
            placeholder="auto"
            required
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </label>
        <label>
          Bucket (S3_BUCKET)
          <input
            type="text"
            placeholder="my-html-notes"
            required
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
          />
        </label>
        <label>
          Prefix (S3_PREFIX, optional)
          <input
            type="text"
            placeholder="notes/personal"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </label>
        <label>
          Access Key ID (S3_ACCESS_KEY_ID)
          <input
            type="text"
            autoComplete="off"
            required
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
          />
        </label>
        <label>
          Secret Access Key (S3_SECRET_ACCESS_KEY)
          <input
            type="password"
            autoComplete="new-password"
            placeholder={config?.hasSecretKey ? "Saved — leave blank to keep current" : ""}
            required={!config?.hasSecretKey}
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
          />
        </label>
      </div>

      <label className="storage-check">
        <input type="checkbox" checked={forcePathStyle} onChange={(e) => setForcePathStyle(e.target.checked)} />
        <span>Use path-style URLs (S3_FORCE_PATH_STYLE)</span>
      </label>

      {status && (
        <p className={status.kind === "ok" ? "storage-ok" : "auth-error"} role="alert">
          {status.text}
        </p>
      )}

      <div className="dialog-actions storage-actions">
        {config?.configured && (
          <button type="button" className="danger-outline" disabled={busy} onClick={() => void disconnect()}>
            Disconnect
          </button>
        )}
        <span className="spacer" />
        {modal && (
          <button type="button" disabled={busy} onClick={closeStorage}>
            Cancel
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => void test()}>
          Test connection
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Please wait…" : "Save & connect"}
        </button>
      </div>
    </form>
  );
}

export function StorageSetup() {
  const { config } = storageStore.use();
  return (
    <main className="storage-screen">
      <StorageForm key={config?.bucket ?? "new"} config={config} modal={false} />
    </main>
  );
}

export function StorageModal() {
  const { config, open } = storageStore.use();
  if (!open) return null;
  return (
    <div className="dialog-backdrop storage-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeStorage()}>
      <StorageForm key={`${config?.bucket ?? "new"}-${open}`} config={config} modal />
    </div>
  );
}
