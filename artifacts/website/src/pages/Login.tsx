import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import {
  ArrowLeft, Eye, EyeOff, Home as HomeIcon, Link2, Loader2, Sparkles, UserPlus, LogIn, ShieldCheck, Mail, CheckCircle2, RotateCcw, KeyRound
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { AuthError, loginRequest, registerRequest, forgotPasswordRequest, resendVerificationRequest, verifyEmailRequest } from '@/lib/authApi';
import { BrandMark } from '@/components/BrandMark';
import { ElementsCollection } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';

const LAST_USERNAME_KEY = 'sb_last_username';
const NAME_PATTERN = /^[a-z0-9_.-]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Mode = 'signup' | 'signin' | 'forgot';
type NameCheck = {
  state: 'idle' | 'checking' | 'free' | 'taken' | 'invalid' | 'offline';
  msg?: string;
  suggestions?: string[];
};

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { setSession } = useAuthStore();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const inviteCode = params.get('invite');
  const next = inviteCode ? `/room/${inviteCode}` : params.get('next') || '/lobby';

  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState(() => localStorage.getItem(LAST_USERNAME_KEY) || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verifyEmail, setVerifyEmail] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [nameCheck, setNameCheck] = useState<NameCheck>({ state: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  // 📱 WebOTP API: Auto-detect and fill incoming OTP code on mobile devices!
  useEffect(() => {
    if (!verifyEmail) return;
    if (typeof window !== 'undefined' && 'OTPCredential' in window) {
      const ac = new AbortController();
      (navigator as any).credentials?.get({
        otp: { transport: ['sms', 'email'] },
        signal: ac.signal,
      }).then((cred: any) => {
        if (cred?.code) {
          const clean = String(cred.code).replace(/\D/g, '').slice(0, 6);
          if (clean.length === 6) setOtp(clean);
        }
      }).catch(() => {
        /* User typed manually or aborted, non-fatal */
      });
      return () => {
        ac.abort();
      };
    }
    return undefined;
  }, [verifyEmail]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [mode]);

  // Usernames are unique, so check availability while the visitor is still typing
  useEffect(() => {
    const name = username.trim().toLowerCase();
    if (mode !== 'signup' || name.length < 3) {
      setNameCheck({ state: 'idle' });
      return;
    }
    if (!NAME_PATTERN.test(name)) {
      setNameCheck({ state: 'invalid', msg: 'Use 3-24 characters: letters, numbers, . _ -' });
      return;
    }
    let cancelled = false;
    setNameCheck({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username/${encodeURIComponent(name)}/available`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 503 || data?.offline) {
          setNameCheck({ state: 'offline', msg: data?.reason || 'Accounts are temporarily offline on this server.' });
          return;
        }
        if (data?.available) {
          setNameCheck({ state: 'free', msg: `${name} is available` });
          return;
        }
        const taken = await fetch(`/api/auth/username/${encodeURIComponent(name)}/suggestions`)
          .then((r) => r.json())
          .catch(() => ({}));
        setNameCheck({
          state: 'taken',
          msg: `${name} is already registered — sign in, or try one of these`,
          suggestions: Array.isArray(taken?.suggestions) ? taken.suggestions.slice(0, 3) : [],
        });
      } catch {
        if (!cancelled) setNameCheck({ state: 'idle' });
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [username, mode]);

  const resend = async () => {
    const target = (email.trim() || verifyEmail).toLowerCase();
    if (!target || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await resendVerificationRequest(target);
      if (!r.ok) throw new Error(r.error || 'Could not resend the email');
      if (r.devCode) setDevCode(r.devCode);
      setAttemptsLeft(3);
      setInfo('New 6-digit verification code sent! Please check your inbox and spam folder.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  };

  const verifyWithOtp = async () => {
    const target = (verifyEmail || email.trim()).toLowerCase();
    const code = otp.trim();
    if (!target || !code || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await verifyEmailRequest(target, code);
      if (!r.ok) {
        setAttemptsLeft((prev) => {
          const nextVal = prev - 1;
          if (nextVal <= 0) {
            setError('All attempts used. Please click "Resend code" to get a fresh code.');
            return 0;
          }
          setError(`Incorrect OTP! You have ${nextVal} chance${nextVal > 1 ? 's' : ''} left.`);
          return nextVal;
        });
        return;
      }

      // 🌟 Auto-Login directly to the app!
      if (r.user) {
        setSession(r.user);
        setLocation(r.user.role === 'admin' && !inviteCode ? '/admin' : next, { replace: true });
        return;
      }

      localStorage.setItem(LAST_USERNAME_KEY, username.trim().toLowerCase());
      setInfo('Email verified! Signing you in…');
      setTimeout(() => {
        setLocation(next, { replace: true });
      }, 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const name = username.trim().toLowerCase();

    if (mode === 'forgot') {
      if (!name && !email.trim()) {
        setError('Enter your email or username');
        return;
      }
      setBusy(true);
      setError('');
      setInfo('');
      try {
        const r = await forgotPasswordRequest(email.trim() || name);
        if (!r.ok) throw new Error(r.error || 'Something went wrong');
        setInfo('If an account exists, a reset link has been sent to your email.');
        setTimeout(() => { setMode('signin'); setInfo(''); }, 4000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Please try again');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'signup') {
      const em = email.trim().toLowerCase();
      if (!EMAIL_RE.test(em)) {
        setError('Enter a valid email address');
        return;
      }
      if (!NAME_PATTERN.test(name)) {
        setError('Use 3-24 characters: letters, numbers, . _ -');
        return;
      }
      if (nameCheck.state === 'taken') {
        setError(`${name} is already registered. Pick a suggestion below, or switch to Sign in if it is your account.`);
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must be at least 8 characters with a letter and a number');
        return;
      }
    } else {
      if (name.length < 3) {
        setError('Enter your username and email');
        return;
      }
      if (password.length < 1) {
        setError('Enter your password');
        return;
      }
    }

    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'signup') {
        const result = await registerRequest(name, password, email);
        localStorage.setItem(LAST_USERNAME_KEY, name);
        if (result.needsVerification) {
          setVerifyEmail(email.trim().toLowerCase());
          if (result.devCode) setDevCode(result.devCode);
          setInfo('Account created! We sent a 6-digit verification code to your email. Enter it below to verify.');
        } else if (result.user) {
          setSession(result.user);
          setLocation(result.user.role === 'admin' && !inviteCode ? '/admin' : next, { replace: true });
        }
      } else {
        const session = await loginRequest(name, password);
        localStorage.setItem(LAST_USERNAME_KEY, name);
        setSession(session);
        setLocation(session.role === 'admin' && !inviteCode ? '/admin' : next, { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof AuthError && err.needsVerification) {
        setVerifyEmail(email.trim().toLowerCase() || verifyEmail);
        setError('Please verify your email before signing in.');
        setInfo('Check your inbox, or resend the verification email below.');
      } else {
        const message = err instanceof Error ? err.message : 'Please try again';
        if (mode === 'signup' && /taken|already/i.test(message)) {
          setError('That username is already registered. Pick a suggestion below, or switch to Sign in if it is your account.');
        } else {
          setError(message);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // Clear shared secret fields when switching tabs so a password typed on one
  // tab is never carried over or auto-filled on the other (and vice-versa).
  // Clear shared secret fields when switching tabs so a password typed on one
  // tab is never carried over or auto-filled on the other (and vice-versa).
  // Also clear the username so a name typed in Create account is never leaked
  // into the Sign in field (and vice-versa).
  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setInfo('');
    setUsername('');
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setOtp('');
    setDevCode('');
    setVerifyEmail('');
    setAttemptsLeft(3);
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background text-foreground select-none">
      <div className="fixed inset-0 z-0" style={{ width: '100%', height: '100vh' }}>
        <ElementsCollection
          variant="water" speed={1.00} size={1.00} particleAmount={1.00}
          hue={0} saturation={1.00} brightness={1.00} opacity={1.00}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b from-[#060708]/60 via-[#060708]/20 to-[#060708]/80" />

      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 py-4 pointer-events-none">
        <div className="pointer-events-auto">
          <button
            onClick={() => setLocation('/')}
            id="back-home-nav-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl surface-header text-muted-foreground hover:text-primary transition-[color,background-color,border-color,box-shadow,transform] backdrop-blur-xl group cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:-translate-x-1 transition-transform" />
            <HomeIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-bold tracking-wide">Back to Home</span>
          </button>
        </div>
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full surface-header backdrop-blur-xl">
            <BrandMark size={18} title="SyncBeat logo" />
            <span className="text-xs font-semibold tracking-wide text-foreground">SyncBeat</span>
          </div>
        </div>
      </header>

      <div className="max-w-sm w-full relative z-10 my-6">
        <div className="text-center mb-4">
          <div className="relative mx-auto mb-2.5 w-12 h-12 rounded-xl bg-[#070d1c]/85 ring-1 ring-cyan-400/25 shadow-sm flex items-center justify-center">
            <BrandMark variant="intro" size={42} title="SyncBeat logo" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-foreground">
              {verifyEmail
                ? 'Email Verification'
                : mode === 'signup'
                ? 'Create your account'
                : mode === 'forgot'
                ? 'Reset your password'
                : 'Welcome back'}
            </span>
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            {verifyEmail
              ? 'Enter the 6-digit code sent to your inbox'
              : mode === 'forgot'
              ? 'We will email you a secure reset link'
              : inviteCode
              ? 'Sign in to join the synchronized room 🎧'
              : 'Synchronized Music with Friends'}
          </p>
        </div>

        <div className="relative rounded-2xl p-5 overflow-hidden surface-card backdrop-blur-2xl">
          <div className="absolute top-0 left-[10%] right-[10%] h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border)), hsl(var(--border)), transparent)' }} />

          {verifyEmail ? (
            /* 🌟 DEDICATED CLEAN OTP VERIFICATION SCREEN */
            <div className="space-y-4 py-1" id="otp-dedicated-card">
              <div className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner">
                  <KeyRound className="w-6 h-6 text-cyan-300 animate-pulse" />
                </div>
                <h2 className="text-base font-bold text-foreground">Enter Verification Code</h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  We sent a 6-digit verification code to<br />
                  <span className="font-semibold text-cyan-300 break-all">{verifyEmail}</span>
                </p>
              </div>

              {info && (
                <div id="auth-info" className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-3 py-2 text-center">
                  {info}
                </div>
              )}

              {error && (
                <div id="login-error" className="text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-xl px-3 py-2 text-center">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-1">
                <input
                  value={otp}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(clean);
                    if (error) setError('');
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  pattern="[0-9]*"
                  placeholder="••••••"
                  aria-label="6-digit verification code"
                  className="w-44 px-3 py-3 rounded-xl field-surface text-2xl text-center tracking-[0.45em] font-mono font-bold text-cyan-200 border border-cyan-500/40 focus:border-cyan-400 shadow-sm"
                />
                {typeof navigator !== 'undefined' && 'clipboard' in navigator && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        const clean = text.replace(/\D/g, '').slice(0, 6);
                        if (clean.length === 6) setOtp(clean);
                      } catch {}
                    }}
                    title="Paste code from clipboard"
                    className="px-3.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-cyan-300 text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-sm"
                  >
                    Paste
                  </button>
                )}
              </div>

              {/* Chances left indicator */}
              <div className="text-center text-xs">
                {attemptsLeft > 0 ? (
                  <span className="text-muted-foreground font-medium">
                    Chances remaining: <strong className="text-amber-300 font-bold">{attemptsLeft}</strong>
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">
                    No chances left. Please resend a new code.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={verifyWithOtp}
                disabled={busy || otp.length !== 6 || attemptsLeft <= 0}
                className="w-full py-3 rounded-xl font-bold text-sm action-primary shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{busy ? 'Verifying & Logging In…' : 'Verify & Enter SyncBeat'}</span>
              </button>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setVerifyEmail('');
                    setOtp('');
                    setError('');
                    setInfo('');
                    setAttemptsLeft(3);
                  }}
                  className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back / Edit email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttemptsLeft(3);
                    resend();
                  }}
                  disabled={busy}
                  className="text-cyan-300 hover:text-cyan-200 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Resend code
                </button>
              </div>
            </div>
          ) : (
            <>
              {inviteCode && mode !== 'forgot' && (
                <div className="flex items-center gap-3 rounded-2xl p-3.5 bg-cyan-950/60 border border-cyan-400/30 backdrop-blur-md mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-400/30">
                    <Link2 className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cyan-100">Invite detected 🎧</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sign in and you&apos;ll join room <span className="font-mono text-cyan-200">{inviteCode}</span> automatically.</p>
                  </div>
                </div>
              )}

              {mode !== 'forgot' && (
                <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-black/40 border border-white/10 mb-4">
                  <button
                    onClick={() => switchMode('signin')}
                    id="tab-signin"
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform] cursor-pointer ${
                      mode === 'signin'
                        ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign in
                  </button>
                  <button
                    onClick={() => switchMode('signup')}
                    id="tab-signup"
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform] cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Create account
                  </button>
                </div>
              )}

              {info && (
                <div id="auth-info" className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2 mb-3">
                  {info}
                </div>
              )}

              <form onSubmit={submit} className="space-y-3.5">
                {mode === 'signup' && (
                  <label className="block">
                    <span className="text-[11px] font-bold form-label">Email</span>
                    <input
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                      type="email"
                      autoComplete="email"
                      id="field-email"
                      placeholder="you@example.com"
                      className="mt-1.5 w-full px-3.5 py-3 rounded-xl field-surface text-sm transition-[color,background-color,border-color,box-shadow,transform]"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="text-[11px] font-bold form-label">{mode === 'signin' ? 'Username and email' : 'Username'}</span>
                  <input
                    ref={inputRef}
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
                    autoComplete="username"
                    spellCheck={false}
                    id="field-username"
                    placeholder={mode === 'signin' ? 'you@example.com or username' : 'e.g. user'}
                    className="mt-1.5 w-full px-3.5 py-3 rounded-xl field-surface text-sm transition-[color,background-color,border-color,box-shadow,transform]"
                  />
                  {mode === 'signup' && nameCheck.state !== 'idle' && (
                    <p
                      id="username-hint"
                      className={`mt-1.5 text-[11px] font-semibold ${
                        nameCheck.state === 'checking'
                          ? 'text-muted-foreground'
                          : nameCheck.state === 'free'
                            ? 'text-emerald-300'
                            : nameCheck.state === 'offline'
                              ? 'text-amber-300/80'
                              : 'text-rose-300'
                      }`}
                    >
                      {nameCheck.state === 'checking' ? 'Checking username…' : nameCheck.msg}
                    </p>
                  )}
                  {mode === 'signup' && nameCheck.state === 'taken' && !!nameCheck.suggestions?.length && (
                    <div id="username-suggestions" className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-kicker">Free to use</span>
                      {nameCheck.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setUsername(s)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/12 border border-cyan-400/30 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25 hover:border-cyan-300/60 transition-[color,background-color,border-color,box-shadow,transform] cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold form-label">Password</span>
                  <div className="relative mt-1.5">
                    <input
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signup' ? 'new-password' : mode === 'forgot' ? 'off' : 'current-password'}
                      id="field-password"
                      placeholder={mode === 'signup' ? 'At least 8 characters, 1 letter & 1 number' : 'Your password'}
                      className="w-full px-3.5 py-3 pr-12 rounded-xl field-surface text-sm transition-[color,background-color,border-color,box-shadow,transform]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      id="toggle-password"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                {mode === 'signup' && (
                  <label className="block">
                    <span className="text-[11px] font-bold form-label">Confirm password</span>
                    <input
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); if (error) setError(''); }}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      id="field-confirm"
                      placeholder="Repeat your password"
                      className="mt-1.5 w-full px-3.5 py-3 rounded-xl field-surface text-sm transition-[color,background-color,border-color,box-shadow,transform]"
                    />
                  </label>
                )}

                {mode === 'forgot' && (
                  <label className="block">
                    <span className="text-[11px] font-bold form-label">Email or username</span>
                    <input
                      value={email || username}
                      onChange={(e) => { if (e.target.value.includes('@')) setEmail(e.target.value); else setUsername(e.target.value); if (error) setError(''); }}
                      autoComplete="email"
                      id="field-forgot"
                      placeholder="you@example.com or username"
                      className="mt-1.5 w-full px-3.5 py-3 rounded-xl field-surface text-sm transition-[color,background-color,border-color,box-shadow,transform]"
                    />
                  </label>
                )}

                {mode === 'signin' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      id="forgot-link"
                      className="text-[11px] font-bold text-muted-foreground hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && (
                  <p id="login-error" className="text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  id="btn-submit-auth"
                  disabled={busy}
                  className="relative w-full py-3 rounded-xl font-bold text-sm overflow-hidden action-primary active:scale-[0.99] transition-[color,background-color,border-color,box-shadow,transform] disabled:opacity-60 cursor-pointer group"
                >
                  <span className="flex items-center justify-center gap-2">
                    {busy
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                    {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
                  </span>
                </button>
              </form>

              <p className="mt-3.5 text-[11px] text-center text-muted-foreground leading-relaxed">
                {mode === 'signup'
                  ? 'Your password stays on SyncBeat. We send a verification email to confirm your address.'
                  : mode === 'forgot'
                    ? 'Back to sign in — check your inbox for the reset link.'
                    : 'Use the same username (or email) and password you created.'}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground text-center mt-3">
          <ShieldCheck className="w-3 h-3 shrink-0" />
          <span>Passwords are hashed · Verification & reset links expire</span>
        </div>
      </div>
    </div>
  );
}
