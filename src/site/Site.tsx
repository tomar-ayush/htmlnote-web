import { useState, type ReactNode } from "react";
import { userStore } from "../auth/auth";
import "./site.css";

export const CONTACT_EMAIL = "ayushtomar8624@gmail.com";

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const THEME_KEY = "htmlnote:theme";

function initialDark() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === "dark";
  } catch {
    return true;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const user = userStore.use();
  const [dark, setDark] = useState(initialDark);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      return;
    }
  };

  return (
    <div className={dark ? "site dark" : "site"}>
      <header className="site-nav">
        <a className="site-brand" href="/">
          <span className="site-mark" aria-hidden="true" />
          HTML Notebook
        </a>
        <nav className="site-links" aria-label="Site">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <button
            type="button"
            className="site-theme"
            onClick={toggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {dark ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
              ) : (
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              )}
            </svg>
          </button>
          <a className="site-btn" href={user ? "/app" : "/login"}>
            {user ? "Dashboard" : "Sign in"}
          </a>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <span>HTML Notebook, built by Ayush Tomar</span>
        <nav className="site-links" aria-label="Footer">
          <a href="/privacy">Privacy policy</a>
          <a href="/terms">Terms of service</a>
          <a href="https://github.com/tomar-ayush/htmlnote-web" rel="noopener">Source code</a>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </nav>
      </footer>
    </div>
  );
}
