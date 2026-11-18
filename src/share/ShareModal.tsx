import { useEffect, useState } from "react";
import { shareApi, type ShareInfo } from "../api/api";
import { notify } from "../dialog/dialog";
import { flush } from "../editor/editor";
import { Icon } from "../ui/icons";
import { closeShare, shareStore } from "./share";

const EXPIRIES: [string, string][] = [
  ["", "Never expires"],
  ["1", "1 hour"],
  ["24", "24 hours"],
  ["168", "7 days"],
  ["720", "30 days"],
];

export function ShareModal() {
  const { path } = shareStore.use();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expiry, setExpiry] = useState("");
  const [presigned, setPresigned] = useState("");
  const [copied, setCopied] = useState<"" | "link" | "presign">("");

  useEffect(() => {
    if (!path) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeShare();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path]);

  useEffect(() => {
    if (!path) return;
    let active = true;
    setLoading(true);
    setInfo(null);
    setPresigned("");
    setCopied("");
    setExpiry("");
    shareApi.get(path).then(
      (res) => {
        if (!active) return;
        setInfo(res);
        setLoading(false);
      },
      (err: Error) => {
        if (!active) return;
        setLoading(false);
        notify(err.message, "error");
      },
    );
    return () => {
      active = false;
    };
  }, [path]);

  if (!path) return null;

  const title = path.split("/").pop()?.replace(/\.html?$/i, "") || path;
  const fullUrl = info?.shared && info.url ? `${window.location.origin}${info.url}` : "";
  const expiryHours = expiry ? Number(expiry) : null;

  const copyText = async (text: string, which: "link" | "presign") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((cur) => (cur === which ? "" : cur)), 2000);
    } catch {
      notify("Copy failed; select the URL field to copy manually.", "error");
    }
  };

  const createOrUpdate = async () => {
    setBusy(true);
    try {
      await flush();
      const res = await shareApi.create(path, expiryHours);
      setInfo(res);
      if (res.url) await copyText(`${window.location.origin}${res.url}`, "link");
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      const res = await shareApi.revoke(path);
      setInfo(res);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const makePresigned = async () => {
    setBusy(true);
    try {
      await flush();
      const hours = expiryHours ? Math.min(168, Math.max(1, expiryHours)) : 24;
      const res = await shareApi.presign(path, hours);
      setPresigned(res.url);
      await copyText(res.url, "presign");
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop storage-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeShare()}>
      <div className="dialog share-modal" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
        <div className="share-head">
          <h2 id="share-dialog-title">Share page</h2>
          <span className="share-page-name">{title}</span>
        </div>

        <label className="share-expiry-row">
          <span>Link expiry</span>
          <select value={expiry} disabled={busy} onChange={(e) => setExpiry(e.target.value)}>
            {EXPIRIES.map(([val, label]) => (
              <option key={label} value={val}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <section className="share-section">
          <div className="share-section-head">
            <strong>Public share link</strong>
            {info?.shared && (
              <span className="hint">
                {info.expiresAt ? `Expires ${new Date(info.expiresAt).toLocaleString()}` : "Never expires"}
              </span>
            )}
          </div>
          {loading ? (
            <p className="hint">Checking link status…</p>
          ) : info?.shared && fullUrl ? (
            <>
              <div className="share-url-row">
                <input
                  type="text"
                  readOnly
                  value={fullUrl}
                  aria-label="Share URL"
                  onFocus={(e) => e.target.select()}
                />
                <button type="button" onClick={() => void copyText(fullUrl, "link")}>
                  <Icon name={copied === "link" ? "check" : "copy"} />
                  <span>{copied === "link" ? "Copied" : "Copy"}</span>
                </button>
                <a className="btn share-open-btn" href={fullUrl} target="_blank" rel="noopener" title="Open in new tab">
                  <Icon name="external" />
                </a>
              </div>
              <div className="share-inline-actions">
                <button type="button" disabled={busy} onClick={() => void createOrUpdate()}>
                  Update expiry
                </button>
                <button type="button" className="danger-outline" disabled={busy} onClick={() => void revoke()}>
                  Revoke link
                </button>
              </div>
            </>
          ) : (
            <div className="share-inline-actions">
              <button type="button" className="primary-btn" disabled={busy} onClick={() => void createOrUpdate()}>
                <Icon name="share" />
                <span>{busy ? "Creating…" : "Create share link"}</span>
              </button>
            </div>
          )}
        </section>

        <section className="share-section">
          <div className="share-section-head">
            <strong>S3 presigned URL</strong>
            <span className="hint">Direct storage read link (1h–7d)</span>
          </div>
          {presigned && (
            <div className="share-url-row">
              <input
                type="text"
                readOnly
                value={presigned}
                aria-label="Presigned S3 URL"
                onFocus={(e) => e.target.select()}
              />
              <button type="button" onClick={() => void copyText(presigned, "presign")}>
                <Icon name={copied === "presign" ? "check" : "copy"} />
                <span>{copied === "presign" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}
          <div className="share-inline-actions">
            <button type="button" disabled={busy} onClick={() => void makePresigned()}>
              <Icon name="link" />
              <span>Copy 24h S3 presigned URL</span>
            </button>
          </div>
        </section>

        <div className="dialog-actions">
          <button type="button" onClick={closeShare}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
