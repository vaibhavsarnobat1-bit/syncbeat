import { useMemo, useState } from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { ShieldCheck, Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import { verifyEmailRequest, resendVerificationRequest, resetPasswordRequest } from '@/lib/authApi';
import { BrandMark } from '@/components/BrandMark';

export function VerifyPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    if (!email || otp.length !== 6 || busy) return;
    setBusy(true);
    setMessage('');
    const r = await verifyEmailRequest(email, otp);
    setBusy(false);
    if (r.ok) {
      setState('ok');
    } else {
      setState('error');
      setMessage(r.error || 'Incorrect verification code.');
    }
  };

  const resend = async () => {
    if (!email || busy) return;
    setBusy(true);
    const r = await resendVerificationRequest(email);
    setBusy(false);
    setMessage(r.ok ? 'Verification code re-sent. Check your inbox.' : (r.error || 'Could not resend.'));
  };

  return (
    <Shell>
      {state === 'idle' && (
        <Centered>
          <Mail className="w-10 h-10 text-cyan-300 mx-auto" />
          <h2 className="mt-3 text-lg font-extrabold text-foreground">Verify your email</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code we emailed you.</p>
          <div className="mt-4 w-full space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="your@email.com"
              className="w-full px-3.5 py-3 rounded-xl field-surface text-sm"
            />
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              aria-label="Verification code"
              className="w-full px-3.5 py-3 rounded-xl field-surface text-sm text-center tracking-[0.4em]"
            />
            {message && <p className="text-xs font-semibold text-amber-300">{message}</p>}
            <button
              onClick={verify}
              disabled={busy || otp.length !== 6}
              className="w-full px-4 py-2.5 rounded-xl action-primary text-sm font-bold disabled:opacity-60 cursor-pointer"
            >
              {busy ? 'Verifying…' : 'Verify code'}
            </button>
            <button
              onClick={resend}
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-xl surface-header text-sm font-bold text-muted-foreground hover:text-primary disabled:opacity-60 cursor-pointer"
            >
              Resend code
            </button>
          </div>
        </Centered>
      )}
      {state === 'ok' && (
        <Centered>
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto" />
          <h2 className="mt-3 text-lg font-extrabold text-foreground">Email verified 🎉</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your account is active. You can now sign in.</p>
          <Link href="/login?next=/lobby" className="mt-4 inline-block px-4 py-2.5 rounded-xl action-primary text-sm font-bold">
            Go to Sign in
          </Link>
        </Centered>
      )}
      {state === 'error' && (
        <Centered>
          <Mail className="w-10 h-10 text-amber-300 mx-auto" />
          <h2 className="mt-3 text-lg font-extrabold text-foreground">Verification failed</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          <Link href="/login" className="mt-4 inline-block px-4 py-2.5 rounded-xl action-primary text-sm font-bold">
            Back to Sign in
          </Link>
        </Centered>
      )}
    </Shell>
  );
}

export function ResetPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !token) return;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters with a letter and a number');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    const r = await resetPasswordRequest(token, password);
    setBusy(false);
    if (r.ok) {
      setDone(true);
    } else {
      setError(r.error || 'This reset link is invalid.');
    }
  };

  return (
    <Shell>
      {done ? (
        <Centered>
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto" />
          <h2 className="mt-3 text-lg font-extrabold text-foreground">Password updated</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your new password.</p>
          <Link href="/login" className="mt-4 inline-block px-4 py-2.5 rounded-xl action-primary text-sm font-bold">
            Go to Sign in
          </Link>
        </Centered>
      ) : (
        <Centered>
          <KeyRound className="w-10 h-10 text-cyan-300 mx-auto" />
          <h2 className="mt-3 text-lg font-extrabold text-foreground">Choose a new password</h2>
          <p className="mt-1 text-sm text-muted-foreground">This link can be used once and expires in 1 hour.</p>
          {!token && <p className="mt-2 text-xs text-rose-300">Missing reset token.</p>}
          <form onSubmit={submit} className="mt-4 w-full space-y-3">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="New password (8+, letter & number)"
              className="w-full px-3.5 py-3 rounded-xl field-surface text-sm"
            />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              className="w-full px-3.5 py-3 rounded-xl field-surface text-sm"
            />
            {error && <p className="text-xs font-semibold text-rose-300">{error}</p>}
            {info && <p className="text-xs font-semibold text-emerald-300">{info}</p>}
            <button
              type="submit"
              disabled={busy || !token}
              className="w-full px-4 py-3 rounded-xl action-primary text-sm font-bold disabled:opacity-60 cursor-pointer"
            >
              {busy ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        </Centered>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <div className="relative w-full min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background text-foreground select-none">
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#060708]/80 via-[#060708]/40 to-[#060708]/90" />
      <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 py-4 flex items-center gap-2">
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl surface-header text-muted-foreground hover:text-primary text-xs font-bold cursor-pointer">
          ← Back to Home
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full surface-header">
          <BrandMark size={18} title="SyncBeat logo" />
          <span className="text-xs font-semibold text-foreground">SyncBeat</span>
        </div>
      </header>
      <div className="relative z-10 w-full max-w-sm">
        <div className="relative rounded-2xl p-6 overflow-hidden surface-card backdrop-blur-2xl">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground mb-4">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure account actions</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="text-center flex flex-col items-center">{children}</div>;
}
