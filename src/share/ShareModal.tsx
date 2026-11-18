import { useEffect, useState } from "react";
import { shareApi, type ShareInfo } from "../api/api";
import { notify } from "../dialog/dialog";
import { flushAll } from "../editor/editor";
import { resolveCanonicalPath } from "../sync/localdb";
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
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
    setExpiry("");
    void (async () => {
      try {
        await flushAll();
        const res = await shareApi.get(resolveCanonicalPath(path));
        if (!active) return;
        setInfo(res);
      } catch (err) {
        if (!active) return;
        notify((err as Error).message, "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [path]);

  if (!path) return null;

  const targetPath = resolveCanonicalPath(path);
  const title = targetPath.split("/").pop()?.replace(/\.html?$/i, "") || targetPath;
  const fullUrl = info?.shared && info.url ? `${window.location.origin}${info.url}` : "";
  const expiryHours = expiry ? Number(expiry) : null;

  const copyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("Copy failed; select the URL field to copy manually.", "error");
    }
  };

  const createOrUpdate = async () => {
    setBusy(true);
    try {
      await flushAll();
      const res = await shareApi.create(resolveCanonicalPath(path), expiryHours);
      setInfo(res);
      if (res.url) await copyLink(`${window.location.origin}${res.url}`);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await flushAll();
      const res = await shareApi.revoke(resolveCanonicalPath(path));
      setInfo(res);
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
                <button type="button" onClick={() => void copyLink(fullUrl)}>
                  <Icon name={copied ? "check" : "copy"} />
                  <span>{copied ? "Copied" : "Copy"}</span>
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

        <div className="dialog-actions">
          <button type="button" onClick={closeShare}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
