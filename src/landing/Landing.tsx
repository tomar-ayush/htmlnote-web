import { useEffect, useRef, type CSSProperties } from "react";
import { userStore } from "../auth/auth";
import { GoogleMark, SiteShell } from "../site/Site";
import "./landing.css";

const SOURCE = [
  "<h1>Launch checklist</h1>",
  "<p>Owner: <mark>Priya</mark>, due Friday.</p>",
  "<table>",
  "  <tr><th>Task</th><th>Status</th></tr>",
  "  <tr><td>Pricing page</td><td>Done</td></tr>",
  "  <tr><td>Email to beta users</td><td>Draft</td></tr>",
  "  <tr><td>Status page</td><td>Not started</td></tr>",
  "</table>",
  "<blockquote>Ship the small version first.</blockquote>",
];

const PROVIDERS = ["Google Drive", "Cloudflare R2", "Backblaze B2", "AWS S3", "MinIO", "Any S3-compatible bucket"];

const clamp = (n: number) => Math.min(1, Math.max(0, n));

function Actions() {
  const user = userStore.use();
  if (user) {
    return (
      <div className="lp-actions">
        <a className="lp-btn google" href="/app">
          Open your dashboard
        </a>
      </div>
    );
  }
  return (
    <div className="lp-actions">
      <button type="button" className="lp-btn google" onClick={() => window.location.assign("/api/drive/login")}>
        <GoogleMark />
        Continue with Google
      </button>
      <a className="lp-btn" href="/login">
        Sign in with email
      </a>
    </div>
  );
}

export function Landing() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const pathRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const path = pathRef.current;
    if (!root || !stage || !path) return;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stage.style.setProperty("--t", "1");
      stage.style.setProperty("--p", "0.6");
      path.style.setProperty("--q", "1");
      reveals.forEach((el) => el.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18 },
    );
    reveals.forEach((el) => observer.observe(el));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const s = stage.getBoundingClientRect();
      stage.style.setProperty("--t", clamp((vh - s.top) / vh).toFixed(4));
      stage.style.setProperty("--p", clamp(-s.top / Math.max(1, s.height - vh)).toFixed(4));
      const p = path.getBoundingClientRect();
      path.style.setProperty("--q", clamp((vh - p.top) / (vh * 0.45)).toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <SiteShell>
      <main className="lp" ref={rootRef}>
        <section className="lp-hero">
          <h1 className="lp-title">
            <span className="lp-tag" aria-hidden="true">&lt;h1&gt;</span>
            <span className="lp-title-text">Your notes are real .html files.</span>
            <span className="lp-tag" aria-hidden="true">&lt;/h1&gt;</span>
          </h1>
          <p className="lp-lede">
            A notebook with sections and pages, where every page is saved as a plain HTML file in your own Google
            Drive or storage bucket. Open it anywhere. Nothing is locked in.
          </p>
          <Actions />
        </section>

        <section className="lp-stage" ref={stageRef} aria-label="How a note is stored and shown">
          <div className="lp-stick">
            <div className="lp-win">
              <div className="lp-win-bar">
                <span className="lp-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="lp-crumbs">
                  Work <b>/</b> Launches <b>/</b> Launch checklist.html
                </span>
                <span className="lp-sync">
                  <i aria-hidden="true" />
                  Synced
                </span>
              </div>
              <div className="lp-win-body">
                <aside className="lp-side" aria-hidden="true">
                  <p>Notebooks</p>
                  <ul>
                    <li className="on">Work</li>
                    <li>Personal</li>
                    <li>Reading</li>
                  </ul>
                  <p>Pages</p>
                  <ul>
                    <li className="on">Launch checklist</li>
                    <li>Pricing notes</li>
                    <li>Beta feedback</li>
                  </ul>
                </aside>
                <div className="lp-layers">
                  <pre className="lp-source" aria-hidden="true">
                    {SOURCE.map((line) => (
                      <span key={line}>
                        {line.split(/(<[^>]+>)/).map((part, i) =>
                          part.startsWith("<") ? <b key={i}>{part}</b> : part,
                        )}
                        {"\n"}
                      </span>
                    ))}
                  </pre>
                  <div className="lp-render">
                    <h2>Launch checklist</h2>
                    <p>
                      Owner: <mark>Priya</mark>, due Friday.
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Pricing page</td>
                          <td>Done</td>
                        </tr>
                        <tr>
                          <td>Email to beta users</td>
                          <td>Draft</td>
                        </tr>
                        <tr>
                          <td>Status page</td>
                          <td>Not started</td>
                        </tr>
                      </tbody>
                    </table>
                    <blockquote>Ship the small version first.</blockquote>
                  </div>
                  <div className="lp-divider" aria-hidden="true" />
                </div>
              </div>
            </div>
            <p className="lp-caption">
              <span>What is stored: one HTML file</span>
              <span>What you see: your note</span>
            </p>
          </div>
        </section>

        <div className="lp-marquee" aria-label="Works with Google Drive and S3-compatible storage">
          <div className="lp-marquee-track" aria-hidden="true">
            {[...PROVIDERS, ...PROVIDERS].map((name, i) => (
              <span key={i}>{name}</span>
            ))}
          </div>
        </div>

        <section className="lp-block">
          <h2 className="lp-h2" data-reveal>
            Your notes, in storage you control
          </h2>
          <div className="lp-grid">
            <article className="lp-card wide" data-reveal>
              <div className="lp-chips" aria-hidden="true">
                <span>Google Drive</span>
                <span>Your own bucket</span>
                <span>Free 50 MB</span>
              </div>
              <h3>Choose where your notes live</h3>
              <p>
                Connect Google Drive and notes sync to an html-notes-app folder that the app alone can see. Or connect
                your own bucket. Or start on 50 MB of free storage and move later.
              </p>
            </article>

            <article className="lp-card" data-reveal>
              <div className="lp-versions" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} style={{ "--i": i } as CSSProperties} />
                ))}
              </div>
              <h3>The last 10 versions of every page</h3>
              <p>Open an earlier version, or restore it with one click.</p>
            </article>

            <article className="lp-card" data-reveal>
              <div className="lp-link" aria-hidden="true">
                <span>/s/9fK2xQ7b…</span>
                <em>Expires in 7 days</em>
              </div>
              <h3>Share a page with a link</h3>
              <p>Publish a read-only link. Set it to expire, or revoke it whenever you like.</p>
            </article>

            <article className="lp-card wide lp-agents" data-reveal ref={pathRef}>
              <p className="lp-path" aria-label="notebook / section / page.html">
                <span>notebook</span>
                <i>/</i>
                <span>section</span>
                <i>/</i>
                <span>page.html</span>
              </p>
              <h3>Anything that writes HTML can add a page</h3>
              <p>
                Put a file at that path in your Drive folder or bucket and it shows up in the notebook. That works for
                a script, an export from another tool, or an AI assistant that writes its report as HTML.
              </p>
            </article>

            <article className="lp-card wide" data-reveal>
              <svg className="lp-draw" viewBox="0 0 420 90" aria-hidden="true">
                <path d="M8 62 C 48 8, 88 100, 128 44 S 208 10, 248 52 S 328 92, 412 26" />
              </svg>
              <h3>Tables, drawing and a spacing inspector</h3>
              <p>Build tables, sketch with a pen, and see the exact spacing of any element on the page.</p>
            </article>

            <article className="lp-card" data-reveal>
              <div className="lp-pulse" aria-hidden="true">
                <i />
                <span>Saved in your browser</span>
              </div>
              <h3>Keeps your typing through bad connections</h3>
              <p>Edits are saved in your browser first, then synced when the connection is back.</p>
            </article>
          </div>
        </section>

        <section className="lp-end" data-reveal>
          <h2 className="lp-h2">Start a notebook</h2>
          <p className="lp-lede">Free to start. Your notes stay yours.</p>
          <Actions />
        </section>
      </main>
    </SiteShell>
  );
}
