import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import {
  ArrowLeft, Eye, EyeOff, Home as HomeIcon, Link2, Loader2, Sparkles, UserPlus, LogIn, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { loginRequest, registerRequest } from '@/lib/authApi';
import { BrandMark } from '@/components/BrandMark';
import { ElementsCollection } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';

const LAST_USERNAME_KEY = 'sb_last_username';
const NAME_PATTERN = /^[a-z0-9_.-]{3,24}$/;
type Mode = 'signup' | 'signin';
type NameCheck = {
  state: 'idle' | 'checking' | 'free' | 'taken' | 'invalid' | 'offline';
  msg?: string;
  suggestions?: string[];
};

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, setSession } = useAuthStore();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const inviteCode = params.get('invite');
  const next = inviteCode ? `/room/${inviteCode}` : params.get('next') || '/lobby';

  const [mode, setMode] = useState<Mode>('signup');
  const [username, setUsername] = useState(() => localStorage.getItem(LAST_USERNAME_KEY) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nameCheck, setNameCheck] = useState<NameCheck>({ state: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.token) return;
    setLocation(inviteCode ? `/room/${inviteCode}` : (user.role === 'admin' ? '/admin' : '/lobby'), { replace: true });
  }, [user, inviteCode, setLocation]);

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
          // Nothing wrong with the name they typed — the server cannot see accounts right now
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const name = username.trim().toLowerCase();
    if (mode === 'signup' && !NAME_PATTERN.test(name)) {
      setError('Use 3-24 characters: letters, numbers, . _ -');
      return;
    }
    if (mode === 'signup' && nameCheck.state === 'taken') {
      setError(`${name} is already registered. Pick a suggestion below, or switch to Sign in if it is your account.`);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const session = mode === 'signup'
        ? await registerRequest(name, password)
        : await loginRequest(name, password);
      localStorage.setItem(LAST_USERNAME_KEY, name);
      setSession(session);
      setLocation(session.role === 'admin' && !inviteCode ? '/admin' : next, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again';
      // Usernames are unique, so a clash means the account already exists
      if (mode === 'signup' && /taken|already/i.test(message)) {
        setError('That username is already registered. Pick a suggestion below, or switch to Sign in if it is your account.');
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#060708] text-white select-none">
      <div className="fixed inset-0 z-0" style={{ width: '100vw', height: '100vh' }}>
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-white/80 hover:text-cyan-300 transition-all backdrop-blur-xl shadow-lg group cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <HomeIcon className="w-3.5 h-3.5 text-cyan-400/80" />
            <span className="text-xs font-bold tracking-wide">Back to Home</span>
          </button>
        </div>
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#060708]/70 border border-cyan-500/20 backdrop-blur-xl shadow-lg">
            <BrandMark size={18} title="SyncBeat logo" />
            <span className="text-xs font-semibold tracking-wide text-cyan-200">SyncBeat</span>
          </div>
        </div>
      </header>

      <div className="max-w-sm w-full relative z-10 my-6">
        <div className="text-center mb-4">
          <div className="relative mx-auto mb-2.5 w-12 h-12 rounded-xl bg-[#070d1c]/85 ring-1 ring-cyan-400/25 shadow-lg shadow-cyan-500/30 flex items-center justify-center">
            <BrandMark variant="intro" size={42} title="SyncBeat logo" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </span>
          </h1>
          <p className="text-cyan-100/60 text-xs font-medium mt-1">
            {inviteCode ? 'Sign in to join the synchronized room 🎧' : 'Synchronized Music with Friends'}
          </p>
        </div>

        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#070e1b]/88 backdrop-blur-2xl border border-cyan-500/25 shadow-2xl shadow-black/80">
          <div className="absolute top-0 left-[10%] right-[10%] h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,212,0.8), rgba(56,189,248,0.8), transparent)' }} />

          {inviteCode && (
            <div className="flex items-center gap-3 rounded-2xl p-3.5 bg-cyan-950/60 border border-cyan-400/30 backdrop-blur-md mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-400/30">
                <Link2 className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-100">Invite detected 🎧</p>
                <p className="text-xs text-cyan-300/60 mt-0.5">Sign in and you&apos;ll join room <span className="font-mono text-cyan-200">{inviteCode}</span> automatically.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-black/40 border border-white/10 mb-4">
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              id="tab-signup"
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-cyan-500/90 to-sky-500/90 text-[#04121a] shadow-lg shadow-cyan-500/25'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Create account
            </button>
            <button
              onClick={() => { setMode('signin'); setError(''); }}
              id="tab-signin"
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-cyan-500/90 to-sky-500/90 text-[#04121a] shadow-lg shadow-cyan-500/25'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200/60">Username</span>
              <input
                ref={inputRef}
                value={username}
                onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
                autoComplete="username"
                spellCheck={false}
                id="field-username"
                placeholder="e.g. rahul_92"
                className="mt-1.5 w-full px-3.5 py-3 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/60 focus:bg-black/70 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              {mode === 'signup' && nameCheck.state !== 'idle' && (
                <p
                  id="username-hint"
                  className={`mt-1.5 text-[11px] font-semibold ${
                    nameCheck.state === 'checking'
                      ? 'text-white/40'
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Free to use</span>
                  {nameCheck.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUsername(s)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/12 border border-cyan-400/30 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25 hover:border-cyan-300/60 transition-all cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200/60">Password</span>
              <div className="relative mt-1.5">
                <input
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  id="field-password"
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-3 pr-12 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/60 focus:bg-black/70 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  id="toggle-password"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && (
              <p id="login-error" className="text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              id="btn-submit-auth"
              disabled={busy}
              className="relative w-full py-3 rounded-xl font-bold text-sm text-[#04121a] overflow-hidden bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer group"
            >
              <span className="flex items-center justify-center gap-2">
                {busy
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </span>
            </button>
          </form>

          <p className="mt-3.5 text-[11px] text-center text-white/40 leading-relaxed">
            {mode === 'signup'
              ? 'Your username and password stay on SyncBeat. Come back any time and sign in with the same details.'
              : 'Use the same username and password you created.'}
          </p>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-cyan-200/45 text-center">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span>Google sign-in coming soon · Already have an account? Use the Sign in tab.</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-cyan-200/30 mt-5 text-center">
          <span>Ultra low-latency audio sync · Spatial audio ready</span>
        </div>
      </div>
    </div>
  );
}
