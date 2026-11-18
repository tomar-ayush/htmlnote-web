import { useState, type FormEvent } from "react";
import { signIn } from "./auth";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(mode, email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

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
        {!isLogin && <span className="hint">At least 8 characters.</span>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(isLogin ? "signup" : "login");
            setError("");
          }}
        >
          {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
