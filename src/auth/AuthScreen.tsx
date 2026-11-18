import { useEffect, useState, type FormEvent } from "react";
import { loginUser, requestSignupOtp, verifySignupOtp } from "./auth";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        await loginUser(email, password);
      } else if (mode === "signup") {
        const res = await requestSignupOtp(email, password);
        setEmail(res.email);
        setCode("");
        setCooldown(45);
        setMode("otp");
        setBusy(false);
      } else {
        await verifySignupOtp(email, code);
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestSignupOtp(email, password);
      setCooldown(45);
      setNotice("Sent a fresh 6-digit code.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (mode === "otp") {
    return (
      <div className="auth">
        <div className="auth-bar">
          <span className="brand-mark" aria-hidden="true" />
          HTML Notebook
        </div>
        <form className="auth-card" onSubmit={submit}>
          <h1>Check your email</h1>
          <p className="hint">Enter the 6-digit verification code sent to {email}.</p>
          <label>
            Verification code
            <input
              className="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D+/g, "").slice(0, 6))}
            />
          </label>
          {notice && <p className="storage-ok" role="status">{notice}</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Verify & create account"}
          </button>
          <div className="otp-links">
            <button type="button" className="auth-switch" disabled={busy || cooldown > 0} onClick={() => void resend()}>
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>
            <button
              type="button"
              className="auth-switch"
              disabled={busy}
              onClick={() => {
                setMode("signup");
                setCode("");
                setError("");
                setNotice("");
              }}
            >
              Change email
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth-bar">
        <span className="brand-mark" aria-hidden="true" />
        HTML Notebook
      </div>
      <form className="auth-card" onSubmit={submit}>
        <h1>{isLogin ? "Sign in" : "Create your account"}</h1>
        <p className="hint">Your notebooks are private to your account.</p>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {!isLogin && <span className="hint">At least 8 characters. A verification code will be emailed to you.</span>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Please wait…" : isLogin ? "Sign in" : "Continue"}
        </button>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(isLogin ? "signup" : "login");
            setError("");
            setNotice("");
          }}
        >
          {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
