import { useRef, useState, type FormEvent } from "react";
import { storageApi, type StorageConfig, type StorageInput } from "../api/api";
import { confirmAction } from "../dialog/dialog";
import { Icon } from "../ui/icons";
import {
  closeStorage,
  connectGoogleDrive,
  disconnectGoogleDrive,
  disconnectStorage,
  saveStorage,
  storageStore,
  switchProvider,
} from "./storage";

type Preset = "r2" | "b2" | "aws" | "custom";

const PRESETS: { id: Preset; label: string; endpointPlaceholder: string }[] = [
  { id: "r2", label: "Cloudflare R2", endpointPlaceholder: "https://<account-id>.r2.cloudflarestorage.com" },
  { id: "b2", label: "Backblaze B2", endpointPlaceholder: "https://s3.us-west-004.backblazeb2.com" },
  { id: "aws", label: "AWS S3", endpointPlaceholder: "Optional for standard AWS S3" },
  { id: "custom", label: "Custom S3", endpointPlaceholder: "https://s3.example.com" },
];

const B2_HOST = /^https?:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com/i;

function detectPreset(config: StorageConfig | null | undefined): Preset {
  if (config?.mode !== "custom") return "r2";
  if (config.endpointUrl.includes(".r2.cloudflarestorage.com")) return "r2";
  if (config.endpointUrl.includes(".backblazeb2.com")) return "b2";
  if (!config.endpointUrl) return "aws";
  return "custom";
}

function StorageForm({ config, modal }: { config: StorageConfig | null | undefined; modal: boolean }) {
  const isCustom = config?.s3Mode === "custom";
  const isManaged = config?.s3Mode === "managed";
  const isDriveConnected = Boolean(config?.driveConnected);
  const isDriveActive = config?.mode === "gdrive";
  const [preset, setPreset] = useState<Preset>(() => detectPreset(config));
  const [endpointUrl, setEndpointUrl] = useState(isCustom ? config.endpointUrl : "");
  const [region, setRegion] = useState((isCustom && config.region) || "auto");
  const [bucket, setBucket] = useState(isCustom ? config.bucket : "");
  const [accessKeyId, setAccessKeyId] = useState(isCustom ? config.accessKeyId : "");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [prefix, setPrefix] = useState(isCustom ? config.prefix : "");
  const [forcePathStyle, setForcePathStyle] = useState(isCustom ? config.forcePathStyle : false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showS3, setShowS3] = useState(isCustom || !config?.driveAvailable);
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
    if (!(await confirmAction("Disconnect custom bucket?", "Your notebooks stay in your bucket. You can reconnect anytime.", "Disconnect"))) return;
    setBusy(true);
    setStatus(null);
    try {
      await disconnectStorage();
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  };

  const startDriveConnect = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await connectGoogleDrive();
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  };

  const activateProvider = async (provider: "gdrive" | "s3") => {
    setBusy(true);
    setStatus(null);
    try {
      await switchProvider(provider);
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  };

  const removeDrive = async () => {
    if (!(await confirmAction("Disconnect Google Drive?", "Your html-notes-app folder remains in your Google Drive.", "Disconnect"))) return;
    setBusy(true);
    setStatus(null);
    try {
      await disconnectGoogleDrive();
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  };

  const activePreset = PRESETS.find((p) => p.id === preset)!;
  const endpointRequired = preset !== "aws";
  const secretRequired = !isCustom || !config?.hasSecretKey;
  const usedBytes = config?.usedBytes ?? 0;
  const quotaBytes = Math.max(1, config?.quotaBytes ?? 50 * 1024 * 1024);
  const usedMb = (usedBytes / (1024 * 1024)).toFixed(1);
  const quotaMb = Math.max(1, Math.round(quotaBytes / (1024 * 1024)));
  const pct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

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
      <div className="storage-head">
        <div>
          <h1 id="storage-title">{isCustom || isDriveActive ? "Storage settings" : "Connect storage"}</h1>
          <p className="hint">Keep notes synced in Google Drive or any S3-compatible bucket. Both stay completely separate.</p>
        </div>
      </div>

      <section className={`drive-panel${isDriveActive ? " active" : ""}`}>
        <div className="drive-panel-head">
          <div className="drive-title-row">
            <Icon name="drive" size={16} />
            <strong>Google Drive Sync</strong>
            {isDriveActive && <span className="drive-badge active">Active</span>}
            {!isDriveActive && isDriveConnected && <span className="drive-badge">Connected</span>}
          </div>
          {isDriveConnected ? (
            <span className="hint">
              Folder: {config?.driveFolderName || "html-notes-app"}
              {config?.driveEmail ? ` (${config.driveEmail})` : ""}
            </span>
          ) : (
            <span className="hint">
              {config?.driveAvailable
                ? "Creates an html-notes-app folder in your Google Drive and keeps your notebooks, sections and pages inside it."
                : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend server to enable OAuth."}
            </span>
          )}
        </div>
        <div className="drive-actions-row">
          {isDriveConnected ? (
            <>
              {!isDriveActive && (
                <button type="button" className="drive-btn primary" disabled={busy} onClick={() => void activateProvider("gdrive")}>
                  Switch to Google Drive
                </button>
              )}
              {isDriveActive && config?.s3Mode !== "none" && (
                <button type="button" className="drive-btn" disabled={busy} onClick={() => void activateProvider("s3")}>
                  Switch to Object Storage
                </button>
              )}
              <button type="button" className="drive-btn" disabled={busy} onClick={() => void startDriveConnect()}>
                Reconnect
              </button>
              <button type="button" className="drive-btn danger-outline" disabled={busy} onClick={() => void removeDrive()}>
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              className="drive-btn primary"
              disabled={busy || !config?.driveAvailable}
              onClick={() => void startDriveConnect()}
            >
              <Icon name="drive" size={14} />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </section>

      {!showS3 && status && (
        <p className={status.kind === "ok" ? "storage-ok" : "auth-error"} role="alert">
          {status.text}
        </p>
      )}

      {!showS3 && (
        <div className="dialog-actions storage-actions">
          <button type="button" disabled={busy} onClick={() => setShowS3(true)}>
            Use S3-compatible object storage instead
          </button>
          <span className="spacer" />
          {modal && (
            <button type="button" disabled={busy} onClick={closeStorage}>
              Cancel
            </button>
          )}
        </div>
      )}

      {showS3 && (
      <>
      <div className="storage-section-divider">
        <span>S3-compatible Object Storage</span>
      </div>

      {isManaged && (
        <div className="storage-managed">
          <div className="storage-managed-top">
            <strong>Free managed R2 storage</strong>
            <span>{usedMb} MB of {quotaMb} MB used</span>
          </div>
          <div className="storage-meter" aria-hidden="true">
            <div className="storage-meter-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="hint">Connect your own Cloudflare R2, Backblaze B2, or S3 bucket below anytime for unlimited space.</p>
        </div>
      )}

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
        <label className="storage-field span-2">
          <span className="field-head">
            <span className="field-title">
              Endpoint URL {endpointRequired ? <span className="req">*</span> : <span className="opt">optional</span>}
            </span>
            <code className="field-env">S3_ENDPOINT_URL</code>
          </span>
          <input
            ref={endpointRef}
            type="url"
            placeholder={activePreset.endpointPlaceholder}
            required={endpointRequired}
            value={endpointUrl}
            onChange={(e) => onEndpointChange(e.target.value)}
          />
        </label>

        <label className="storage-field">
          <span className="field-head">
            <span className="field-title">Bucket <span className="req">*</span></span>
            <code className="field-env">S3_BUCKET</code>
          </span>
          <input
            type="text"
            placeholder="my-html-notes"
            required
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
          />
        </label>

        <label className="storage-field">
          <span className="field-head">
            <span className="field-title">Region <span className="req">*</span></span>
            <code className="field-env">S3_REGION</code>
          </span>
          <input
            type="text"
            placeholder="auto"
            required
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </label>

        <label className="storage-field">
          <span className="field-head">
            <span className="field-title">Access Key ID <span className="req">*</span></span>
            <code className="field-env">S3_ACCESS_KEY_ID</code>
          </span>
          <input
            type="text"
            autoComplete="off"
            required
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
          />
        </label>

        <label className="storage-field">
          <span className="field-head">
            <span className="field-title">
              Secret Access Key {secretRequired ? <span className="req">*</span> : <span className="opt">saved</span>}
            </span>
            <code className="field-env">S3_SECRET_ACCESS_KEY</code>
          </span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder={isCustom && config?.hasSecretKey ? "Leave blank to keep saved key" : ""}
            required={secretRequired}
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
          />
        </label>

        <label className="storage-field">
          <span className="field-head">
            <span className="field-title">Key Prefix <span className="opt">optional</span></span>
            <code className="field-env">S3_PREFIX</code>
          </span>
          <input
            type="text"
            placeholder="notes/personal"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </label>

        <div className="storage-field">
          <span className="field-head">
            <span className="field-title">Addressing</span>
            <code className="field-env">S3_FORCE_PATH_STYLE</code>
          </span>
          <label className="storage-check-box">
            <input type="checkbox" checked={forcePathStyle} onChange={(e) => setForcePathStyle(e.target.checked)} />
            <span>Use path-style URLs</span>
          </label>
        </div>
      </div>

      {status && (
        <p className={status.kind === "ok" ? "storage-ok" : "auth-error"} role="alert">
          {status.text}
        </p>
      )}

      <div className="dialog-actions storage-actions">
        {isCustom && (
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
      </>
      )}
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
      <StorageForm key={`${config?.mode ?? "new"}-${config?.s3Mode ?? "none"}-${config?.driveActive ? 1 : 0}-${config?.bucket ?? ""}-${open}`} config={config} modal />
    </div>
  );
}
