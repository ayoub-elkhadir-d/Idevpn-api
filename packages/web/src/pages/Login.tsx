import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../components/Brand";

export function Login() {
  const { admin, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (admin) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-visual">
        <div className="login-grid" />
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <div className="relative z-10 flex h-full flex-col justify-between p-8 sm:p-12 lg:p-16">
          <Brand />
          <div className="login-hero">
            <div className="eyebrow"><span className="eyebrow-line" /> PRIVATE NETWORK OPERATIONS</div>
            <h1>Secure your<br /><span>digital frontier.</span></h1>
            <p>A single command center for every connection, configuration, and server in your network.</p>
            <div className="mt-10 flex items-center gap-3 text-[12px] text-[#c2c6d2]">
              <div className="login-orbit"><Fingerprint size={19} /></div>
              <div><div className="font-medium text-white">Privacy by design</div><div className="mt-1 text-[11px] text-muted">Your infrastructure. Your control.</div></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#747b8b]"><span>© 2025 Ultimate Tunnel</span><span className="flex items-center gap-2"><span className="status-dot" /> All systems operational</span></div>
        </div>
        <div className="login-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <div className="orbit-core"><ShieldCheck size={26} strokeWidth={1.5} /></div>
          <span className="orbit-node node-one" /><span className="orbit-node node-two" /><span className="orbit-node node-three" />
        </div>
      </div>

      <div className="login-panel">
        <div className="login-mobile-brand sm:hidden"><Brand /></div>
        <div className="login-form-wrap">
          <div className="login-form-icon"><LockKeyhole size={18} /></div>
          <div className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Admin access</div>
          <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-white">Welcome back</h2>
          <p className="mt-2 text-[13px] leading-6 text-muted">Sign in to manage your private network.</p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <label className="form-label">Email address
              <input autoComplete="username" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@company.com" className="form-input" />
            </label>
            <label className="form-label">Password
              <span className="password-wrap">
                <input autoComplete="current-password" type={showPassword ? "text" : "password"} required maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="form-input password-input" />
                <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </span>
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="submit-button" disabled={submitting}>{submitting ? "Signing in..." : "Sign in to dashboard"}<ArrowRight size={16} /></button>
          </form>

          <div className="mt-7 flex items-start gap-3 rounded-xl border border-line bg-[#0d1119] p-4">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
            <p className="text-[11px] leading-[1.7] text-muted">Protected with encrypted sessions and industry-standard security. This area is restricted to authorized administrators.</p>
          </div>
        </div>
        <div className="login-panel-footer"><span>SECURE ADMIN PORTAL</span><span>PRIVACY <span className="mx-2 text-[#414756]">·</span> SECURITY</span></div>
      </div>
    </div>
  );
}
