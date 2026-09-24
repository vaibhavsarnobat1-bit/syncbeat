import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import {
  Headphones, User, ArrowRight, Link2, ChevronRight,
  Music2, Shield, Sparkles, Radio, Volume2, ArrowLeft,
  Home as HomeIcon, Trash2, Mail
} from 'lucide-react';
import { useLoginAnonymous } from '@workspace/api-client-react';
import { useAuthStore } from '@/lib/store';
import { ElementsCollection } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';

const SAVED_ACCOUNTS_KEY = 'lt_saved_accounts';

export type SavedAccount = {
  displayName: string;
  avatarColor: string;
  loginType: 'google' | 'anon';
  email?: string;
  photoUrl?: string;
};

const AVATAR_COLORS = [
  '#00d4d4', '#3b82f6', '#06b6d4', '#0ea5e9',
  '#14b8a6', '#6366f1', '#8b5cf6', '#22d3ee'
];

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function getSavedAccounts(): SavedAccount[] {
  try { return JSON.parse(localStorage.getItem(SAVED_ACCOUNTS_KEY) || '[]'); } catch { return []; }
}

function saveAccount(acc: SavedAccount) {
  const existing = getSavedAccounts().filter(a => a.displayName !== acc.displayName);
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify([acc, ...existing].slice(0, 5)));
}

function removeSavedAccount(name: string): SavedAccount[] {
  const updated = getSavedAccounts().filter(a => a.displayName !== name);
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  return updated;
}

function FeatureBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-200/70 text-xs font-medium backdrop-blur-md shadow-sm">
      <Icon className="w-3.5 h-3.5 text-cyan-400" />
      {label}
    </div>
  );
}

// Reusable Google SVG logo
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

type Step = 'home' | 'choose-google' | 'google' | 'anon';

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { setUser, user } = useAuthStore();
  const [step, setStep] = useState<Step>('home');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams(search);
  const inviteCode = params.get('invite');

  useEffect(() => {
    if (user) setLocation(inviteCode ? `/room/${inviteCode}` : '/lobby');
    const accounts = getSavedAccounts();
    setSavedAccounts(accounts);
    // Auto-show Google chooser if any Google accounts saved
    if (accounts.some(a => a.loginType === 'google')) {
      setStep('choose-google');
    }
  }, [user, inviteCode, setLocation]);

  useEffect(() => {
    if (step === 'google' || step === 'anon') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  const { mutate: login, isPending } = useLoginAnonymous({
    mutation: {
      onSuccess: (data: any) => {
        setUser(data);
        setLocation(inviteCode ? `/room/${inviteCode}` : '/lobby');
      }
    }
  });

  const doLogin = (name: string, type: 'google' | 'anon', userEmail?: string, photoUrl?: string) => {
    const color = getRandomColor();
    saveAccount({ displayName: name, avatarColor: color, loginType: type, email: userEmail, photoUrl });
    login({ data: { displayName: name } });
  };

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    doLogin(
      displayName.trim(),
      step === 'google' ? 'google' : 'anon',
      step === 'google' ? email.trim() : undefined
    );
  };

  const googleAccounts = savedAccounts.filter(a => a.loginType === 'google');
  const guestAccounts  = savedAccounts.filter(a => a.loginType === 'anon');

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#060708] text-white select-none">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden">
        <ElementsCollection
          variant="water" speed={1.00} size={1.00} particleAmount={1.00}
          hue={0} saturation={1.00} brightness={1.00} opacity={1.00}
          style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-radial from-transparent via-[#060708]/35 to-[#060708]/80" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#060708]/50 via-transparent to-[#060708]/85" />

      {/* Top Navbar */}
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
            <img src="/logo.png" alt="Logo" className="w-4 h-4 rounded-full object-cover" />
            <span className="text-xs font-semibold tracking-wide text-cyan-200">SyncBeat</span>
          </div>
          <a href="/admin" id="admin-link" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-cyan-400/30 text-white/60 hover:text-white transition-all backdrop-blur-md group">
            <Shield className="w-3.5 h-3.5 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-semibold">Admin</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-md w-full relative z-10 my-8">
        {/* Hero Header */}
        <div className="text-center mb-6">
          <div className="relative mx-auto mb-3.5 w-16 h-16 rounded-2xl overflow-hidden p-[2px] bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 shadow-xl shadow-cyan-500/30 border border-cyan-300/30">
            <img src="/logo.png" alt="Listening Together Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">SyncBeat</span>
          </h1>
          <p className="text-cyan-100/70 text-sm font-medium mt-1.5 px-2">
            {inviteCode ? 'Join the synchronized room 🎧' : 'Synchronized Music with Friends'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <FeatureBadge icon={Radio} label="Sub-ms Sync" />
            <FeatureBadge icon={Music2} label="YouTube & Web" />
            <FeatureBadge icon={Sparkles} label="Instant Access" />
          </div>
        </div>

        {/* Glass Card */}
        <div className="relative rounded-3xl p-6 sm:p-7 overflow-hidden bg-[#070e1b]/85 backdrop-blur-2xl border border-cyan-500/25 shadow-2xl shadow-black/80">
          {/* Top accent line */}
          <div className="absolute top-0 left-[10%] right-[10%] h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,212,0.8), rgba(56,189,248,0.8), transparent)' }} />

          {/* Invite Banner */}
          {inviteCode && (
            <div className="flex items-center gap-3 rounded-2xl p-3.5 bg-cyan-950/60 border border-cyan-400/30 backdrop-blur-md mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-400/30">
                <Link2 className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-100">Party Invite Detected! 🎧</p>
                <p className="text-xs text-cyan-300/60 mt-0.5">Select your account to jump directly into the room.</p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP: choose-google
              Google "Choose an account" style screen
              ════════════════════════════════════════════ */}
          {step === 'choose-google' && (
            <div>
              {/* Google header */}
              <div className="flex flex-col items-center mb-5">
                <GoogleLogo size={30} />
                <p className="mt-2.5 text-base font-semibold text-white">Choose an account</p>
                <p className="text-xs text-cyan-200/50 mt-0.5">to continue to SyncBeat</p>
              </div>

              {/* Saved Google accounts */}
              <div className="space-y-2 mb-2">
                {googleAccounts.map(acc => (
                  <div key={acc.displayName} className="flex items-center gap-2 group/item">
                    <button
                      onClick={() => doLogin(acc.displayName, 'google', acc.email, acc.photoUrl)}
                      disabled={isPending}
                      id={`btn-google-acc-${acc.displayName.replace(/\s+/g, '-').toLowerCase()}`}
                      className="flex-1 flex items-center gap-3.5 p-3.5 rounded-2xl transition-all bg-white/[0.04] hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-400/40 shadow-sm text-left active:scale-[0.99] min-w-0 cursor-pointer"
                    >
                      {/* Avatar circle with Google badge */}
                      <div className="relative shrink-0">
                        {acc.photoUrl ? (
                          <img src={acc.photoUrl} alt={acc.displayName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-cyan-400/30 shadow" />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white/20"
                            style={{ backgroundColor: acc.avatarColor }}
                          >
                            {acc.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Google G badge */}
                        <div
                          className="absolute -bottom-1 -right-1 bg-white rounded-full flex items-center justify-center shadow border border-gray-200"
                          style={{ width: 18, height: 18 }}
                        >
                          <GoogleLogo size={11} />
                        </div>
                      </div>

                      {/* Name & email */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white group-hover/item:text-cyan-200 transition-colors truncate">
                          {acc.displayName}
                        </p>
                        <p className="text-[11px] text-cyan-200/50 truncate">
                          {acc.email || 'Google Account'}
                        </p>
                      </div>

                      {isPending ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-cyan-400/40 group-hover/item:text-cyan-400 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                      )}
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = removeSavedAccount(acc.displayName);
                        setSavedAccounts(updated);
                        if (!updated.some(a => a.loginType === 'google')) setStep('home');
                      }}
                      className="p-2.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all opacity-60 hover:opacity-100 shrink-0"
                      title="Remove account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Use another account */}
              <button
                id="btn-use-another-google"
                onClick={() => { setStep('google'); setDisplayName(''); setEmail(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-400/30 text-white/70 hover:text-cyan-300 text-sm font-semibold transition-all group cursor-pointer mb-2"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="flex-1 text-left">Use another account</span>
                <ChevronRight className="w-4 h-4 text-cyan-400/40 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Guest accounts (if any) */}
              {guestAccounts.length > 0 && (
                <>
                  <div className="relative flex items-center my-3">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="mx-3 text-[10px] text-white/30 font-semibold tracking-widest uppercase">or</span>
                    <div className="flex-grow border-t border-white/10" />
                  </div>
                  <p className="text-[10px] text-cyan-300/50 font-semibold uppercase tracking-wider mb-1.5 font-mono px-1">Recent Guests</p>
                  <div className="space-y-1.5 mb-2">
                    {guestAccounts.map(acc => (
                      <div key={acc.displayName} className="flex items-center gap-2 group/item">
                        <button
                          onClick={() => doLogin(acc.displayName, 'anon')}
                          disabled={isPending}
                          className="flex-1 flex items-center gap-3 p-3 rounded-2xl transition-all bg-white/[0.03] hover:bg-cyan-950/40 border border-white/[0.08] hover:border-cyan-400/30 text-left active:scale-[0.99] min-w-0 cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow border border-white/20 shrink-0"
                            style={{ backgroundColor: acc.avatarColor }}>
                            {acc.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white/80 group-hover/item:text-white transition-colors truncate">{acc.displayName}</p>
                            <p className="text-[10px] text-white/30">Instant Guest</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover/item:text-cyan-400 transition-colors shrink-0" />
                        </button>
                        <button type="button"
                          onClick={() => { const u = removeSavedAccount(acc.displayName); setSavedAccounts(u); }}
                          className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all opacity-60 hover:opacity-100 shrink-0"
                          title="Remove">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Continue as new guest */}
              <button
                id="btn-continue-as-new-guest"
                onClick={() => setStep('anon')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-white/40 hover:text-cyan-300 text-xs font-semibold transition-all hover:bg-cyan-500/10 border border-transparent hover:border-cyan-400/20 mt-1 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                Continue as new guest
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP: home — No saved Google accounts
              ════════════════════════════════════════════ */}
          {step === 'home' && (
            <div>
              {/* Saved guest accounts */}
              {guestAccounts.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] text-cyan-300/60 font-semibold uppercase tracking-wider font-mono">Recent Guests</p>
                    <button onClick={() => setStep('anon')} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                      + New profile
                    </button>
                  </div>
                  <div className="space-y-2 mb-4">
                    {guestAccounts.map(acc => (
                      <div key={acc.displayName} className="flex items-center gap-2 group/item">
                        <button
                          onClick={() => doLogin(acc.displayName, 'anon')}
                          disabled={isPending}
                          className="flex-1 flex items-center gap-3.5 p-3 rounded-2xl transition-all bg-white/[0.04] hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-400/40 shadow-sm text-left active:scale-[0.99] min-w-0 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md border border-white/20"
                            style={{ backgroundColor: acc.avatarColor }}>
                            {acc.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold text-sm text-white group-hover/item:text-cyan-200 transition-colors truncate">{acc.displayName}</p>
                            <p className="text-[11px] text-cyan-200/50">Instant Guest</p>
                          </div>
                          {isPending
                            ? <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-cyan-400/40 group-hover/item:text-cyan-400 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                          }
                        </button>
                        <button type="button"
                          onClick={() => { const u = removeSavedAccount(acc.displayName); setSavedAccounts(u); }}
                          className="p-2.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all opacity-60 hover:opacity-100 shrink-0"
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="relative flex items-center my-4">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="mx-3 text-[11px] text-white/30 font-medium">or continue with</span>
                    <div className="flex-grow border-t border-white/10" />
                  </div>
                </div>
              )}

              {/* Login options */}
              <div className="space-y-3">
                <button
                  id="btn-google-login"
                  onClick={() => setStep('google')}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 py-3.5 px-6 rounded-2xl font-bold transition-all shadow-md cursor-pointer active:scale-[0.99]"
                >
                  <GoogleLogo size={20} />
                  Continue with Google
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="mx-4 text-[10px] text-white/30 font-semibold tracking-widest uppercase">OR</span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                <button
                  id="btn-anon-login"
                  onClick={() => setStep('anon')}
                  className="w-full flex items-center justify-between gap-3 text-white py-3.5 px-5 rounded-2xl font-semibold transition-all group bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-400/25 hover:border-cyan-400/50 shadow-md cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-400/30">
                      <User className="w-4 h-4 text-cyan-300" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">Continue as Guest</p>
                      <p className="text-[11px] text-cyan-200/50">Instant access · No signup needed</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cyan-400/50 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </button>


              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP: google / anon — Add new account form
              ════════════════════════════════════════════ */}
          {(step === 'google' || step === 'anon') && (
            <form onSubmit={submitName} className="space-y-4">
              {/* Step header */}
              <div className="flex items-center gap-3 mb-4">
                {step === 'google' ? (
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-md">
                    <GoogleLogo size={20} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-400/30 shadow-md">
                    <User className="w-5 h-5 text-cyan-300" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-white">
                      {step === 'google' ? 'Google Account Login' : 'Choose Your Nickname'}
                    </p>
                    {step === 'google' && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">100% Free</span>
                    )}
                  </div>
                  <p className="text-xs text-cyan-200/50 mt-0.5">
                    {step === 'google'
                      ? 'Apna Gmail type karein — agli baar sirf click!'
                      : 'What should friends call you in the room?'}
                  </p>
                </div>
              </div>

              {/* Google: email input */}
              {step === 'google' && (
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-200/80 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Google Email Address (Gmail):</span>
                  </label>
                  <input
                    type="email"
                    id="input-google-email"
                    autoFocus
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmail(val);
                      if (!displayName && val.includes('@')) {
                        const pre = val.split('@')[0];
                        setDisplayName(pre.charAt(0).toUpperCase() + pre.slice(1));
                      }
                    }}
                    required
                    className="w-full px-4 py-3 rounded-2xl text-white placeholder:text-white/25 text-sm outline-none transition-all bg-white/[0.04] border border-cyan-400/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 mb-3"
                  />
                </div>
              )}

              {/* Display name input */}
              <div>
                {step === 'google' && (
                  <label className="block text-[11px] font-semibold text-cyan-200/80 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Display Name (Room me dikhne wala naam):</span>
                  </label>
                )}
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="input-display-name"
                    type="text"
                    autoFocus={step === 'anon'}
                    placeholder={step === 'google' ? 'e.g. Vaibhav' : 'e.g. Alex, DJ Vibe, Echo...'}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={24}
                    required
                    className="w-full px-4 py-3 rounded-2xl text-white placeholder:text-white/25 text-base outline-none transition-all bg-white/[0.04] border border-cyan-400/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  {displayName.length > 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-cyan-300/40 font-mono">
                      {displayName.length}/24
                    </span>
                  )}
                </div>
              </div>

              {step === 'google' && (
                <div className="rounded-xl bg-cyan-950/40 border border-cyan-500/20 p-2.5 flex items-start gap-2 text-[11px] text-cyan-200/80">
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓ Free:</span>
                  <span>Aapka Google account is browser me save hoga. Agli baar seedha click karke login!</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  id="btn-back"
                  type="button"
                  onClick={() => {
                    setDisplayName('');
                    setEmail('');
                    const accs = getSavedAccounts();
                    setStep(accs.some(a => a.loginType === 'google') ? 'choose-google' : 'home');
                  }}
                  className="px-4 py-3 rounded-2xl font-semibold text-sm text-white/60 hover:text-white transition-colors bg-white/[0.05] border border-white/10 hover:border-white/20 cursor-pointer active:scale-[0.98]"
                >
                  ← Back
                </button>

                <button
                  id="btn-submit-name"
                  type="submit"
                  disabled={isPending || !displayName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg cursor-pointer active:scale-[0.98]"
                  style={{
                    background: displayName.trim()
                      ? 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #38bdf8 100%)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: displayName.trim() ? '0 4px 20px rgba(6,182,212,0.35)' : 'none',
                    color: displayName.trim() ? '#040d18' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Entering...
                    </>
                  ) : (
                    <>
                      {inviteCode ? 'Join Room' : 'Start Listening'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-cyan-200/30 mt-5 text-center">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400/40" />
          <span>Ultra low-latency audio sync · Spatial audio ready</span>
        </div>
      </div>
    </div>
  );
}
