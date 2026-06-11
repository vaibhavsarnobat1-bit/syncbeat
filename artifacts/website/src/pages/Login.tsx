import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, User, ArrowRight, Link2, ChevronRight,
  Music2, Shield, Sparkles, Radio, Zap
} from 'lucide-react';
import { useLoginAnonymous } from '@workspace/api-client-react';
import { useAuthStore } from '@/lib/store';

const SAVED_ACCOUNTS_KEY = 'lt_saved_accounts';

type SavedAccount = { displayName: string; avatarColor: string; loginType: 'google' | 'anon' };

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
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify([acc, ...existing].slice(0, 3)));
}

// Animated waveform bars
function WaveformAnim({ bars = 12 }: { bars?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-8" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: 'linear-gradient(to top, #00d4d4, #3b82f6)',
            animation: `wave ${0.8 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.07}s`,
            minHeight: '4px',
            height: `${30 + Math.sin(i * 0.8) * 20}%`,
          }}
        />
      ))}
    </div>
  );
}

// Feature badge
function FeatureBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-medium">
      <Icon className="w-3 h-3 text-cyan-400" />
      {label}
    </div>
  );
}

type Step = 'home' | 'google' | 'anon' | 'saved';

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { setUser, user } = useAuthStore();
  const [step, setStep] = useState<Step>('home');
  const [displayName, setDisplayName] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams(search);
  const inviteCode = params.get('invite');

  useEffect(() => {
    if (user) setLocation(inviteCode ? `/room/${inviteCode}` : '/lobby');
    setSavedAccounts(getSavedAccounts());
  }, [user, inviteCode, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get('invite');
    if (user) setLocation(code ? `/room/${code}` : '/lobby');
  }, []);

  useEffect(() => {
    if (step !== 'home') {
      setTimeout(() => inputRef.current?.focus(), 150);
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

  const doLogin = (name: string, type: 'google' | 'anon') => {
    const color = getRandomColor();
    saveAccount({ displayName: name, avatarColor: color, loginType: type });
    login({ data: { displayName: name } });
  };

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    doLogin(displayName.trim(), step === 'google' ? 'google' : 'anon');
  };

  return (
    <div className="page-bg-login w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Concert BG */}
      <div className="bg-image" />
      <div className="grid-overlay" />

      {/* Cyan pulse orbs */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{
            top: '-10%', left: '-5%',
            background: 'radial-gradient(circle, #00d4d4 0%, transparent 70%)',
            animation: 'pulse-glow 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{
            bottom: '-8%', right: '-4%',
            background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
            animation: 'pulse-glow 8s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* Floating music symbols */}
      <div className="pointer-events-none select-none fixed inset-0 z-[1] overflow-hidden">
        <div className="animate-float absolute top-[10%] left-[5%] text-cyan-500/10 text-[120px] font-black">♪</div>
        <div className="animate-float2 absolute top-[40%] right-[4%] text-blue-500/8 text-[90px] font-black">♫</div>
        <div className="animate-float absolute bottom-[22%] left-[2%] text-cyan-400/7 text-[75px] font-black">♩</div>
        <div className="animate-float-delayed absolute bottom-[35%] right-[7%] text-sky-400/6 text-[65px] font-black">♬</div>
      </div>

      {/* Admin link */}
      <a
        href="/admin"
        id="admin-link"
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 text-white/40 hover:text-white transition-all backdrop-blur-sm group"
      >
        <Shield className="w-3.5 h-3.5 group-hover:text-cyan-400 transition-colors" />
        <span className="text-xs font-semibold">Admin</span>
      </a>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full relative z-10 my-8"
      >
        {/* ── Logo & Branding ── */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
            className="relative mx-auto mb-5 w-24 h-24"
          >
            {/* Rotating outer ring */}
            <div
              className="absolute inset-0 rounded-3xl border-2 border-cyan-400/30"
              style={{ animation: 'spin-slow 12s linear infinite' }}
            />
            {/* Glow ring */}
            <div className="absolute inset-1 rounded-[20px] bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 opacity-20 blur-md" />
            {/* Icon box */}
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40">
              <Headphones className="w-11 h-11 text-white drop-shadow-lg" />
            </div>
            {/* Sparkle */}
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shadow-lg"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap className="w-2.5 h-2.5 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-extrabold text-shimmer tracking-tight"
          >
            SyncBeat
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="flex items-center justify-center gap-2 mt-3"
          >
            <WaveformAnim bars={10} />
            <p className="text-white/50 text-sm font-medium px-2">
              {inviteCode ? 'Join the listening party 🎉' : 'Listen together, in real-time'}
            </p>
            <WaveformAnim bars={10} />
          </motion.div>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 mt-4 flex-wrap"
          >
            <FeatureBadge icon={Radio} label="Live Sync" />
            <FeatureBadge icon={Music2} label="Any Music" />
            <FeatureBadge icon={Sparkles} label="Free Forever" />
          </motion.div>
        </div>

        {/* ── Main Glass Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative"
        >
          {/* Glowing border effect */}
          <div
            className="absolute -inset-[1px] rounded-3xl opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,212,0.4) 0%, rgba(59,130,246,0.3) 50%, rgba(0,212,212,0.1) 100%)',
              filter: 'blur(1px)',
            }}
          />

          <div
            className="relative rounded-3xl p-7 overflow-hidden"
            style={{
              background: 'rgba(3, 15, 28, 0.72)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border: '1px solid rgba(0, 212, 212, 0.12)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(0,212,212,0.08)',
            }}
          >
            {/* Inner shimmer top border */}
            <div
              className="absolute top-0 left-[10%] right-[10%] h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,212,0.5), rgba(59,130,246,0.5), transparent)' }}
            />

            {/* Invite banner */}
            <AnimatePresence>
              {inviteCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{
                    background: 'rgba(0, 212, 212, 0.08)',
                    border: '1px solid rgba(0, 212, 212, 0.25)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(0, 212, 212, 0.15)' }}
                  >
                    <Link2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">You've been invited! 🎧</p>
                    <p className="text-xs text-white/50 mt-0.5">Sign in to join the room instantly.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved accounts */}
            <AnimatePresence>
              {savedAccounts.length > 0 && step === 'home' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-white/35 font-semibold uppercase tracking-widest">Recent</p>
                    <button
                      onClick={() => setStep('google')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      + Add account
                    </button>
                  </div>
                  <div className="space-y-2">
                    {savedAccounts.map(acc => (
                      <motion.button
                        key={acc.displayName}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => doLogin(acc.displayName, acc.loginType)}
                        disabled={isPending}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all group neon-hover"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <div className="relative shrink-0">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                            style={{ backgroundColor: acc.avatarColor }}
                          >
                            {acc.displayName.charAt(0).toUpperCase()}
                          </div>
                          {acc.loginType === 'google' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm text-white">{acc.displayName}</p>
                          <p className="text-xs text-white/35">{acc.loginType === 'google' ? 'Google Account' : 'Guest'}</p>
                        </div>
                        {isPending ? (
                          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-cyan-400 transition-colors" />
                        )}
                      </motion.button>
                    ))}
                  </div>

                  <div className="relative flex items-center my-5">
                    <div className="flex-grow border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                    <span className="mx-3 text-xs text-white/25 font-medium">or sign in differently</span>
                    <div className="flex-grow border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login options / form */}
            <AnimatePresence mode="wait">
              {step === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Google button */}
                  <motion.button
                    id="btn-google-login"
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setStep('google')}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 py-4 px-6 rounded-2xl font-semibold transition-colors shadow-xl shadow-black/30"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </motion.button>

                  <div className="relative flex items-center">
                    <div className="flex-grow border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                    <span className="mx-4 text-xs text-white/25 font-semibold">OR</span>
                    <div className="flex-grow border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                  </div>

                  {/* Anonymous button */}
                  <motion.button
                    id="btn-anon-login"
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setStep('anon')}
                    className="w-full flex items-center justify-center gap-3 text-white py-4 px-6 rounded-2xl font-semibold transition-all group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,212,212,0.12) 0%, rgba(59,130,246,0.10) 100%)',
                      border: '1px solid rgba(0,212,212,0.20)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(0,212,212,0.45)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(0,212,212,0.15)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(0,212,212,0.20)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,212,212,0.2)' }}
                    >
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    Continue as Guest
                    <span className="ml-auto text-xs text-cyan-400/60 font-normal">No signup needed</span>
                  </motion.button>
                </motion.div>
              )}

              {(step === 'google' || step === 'anon') && (
                <motion.form
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  onSubmit={submitName}
                  className="space-y-4"
                >
                  {/* Step header */}
                  <div className="flex items-center gap-3 mb-6">
                    {step === 'google' ? (
                      <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, rgba(0,212,212,0.25), rgba(59,130,246,0.20))' }}
                      >
                        <User className="w-5 h-5 text-cyan-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white">
                        {step === 'google' ? 'Google Sign In' : 'Guest Sign In'}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">Pick a display name to continue</p>
                    </div>
                  </div>

                  {/* Name input */}
                  <div className="relative group">
                    <input
                      ref={inputRef}
                      id="input-display-name"
                      type="text"
                      autoFocus
                      placeholder={step === 'google' ? 'Your full name...' : 'Choose a nickname...'}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={24}
                      required
                      className="w-full px-5 py-4 rounded-2xl text-white placeholder:text-white/25 text-base outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(0,212,212,0.18)',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.border = '1px solid rgba(0,212,212,0.5)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,212,0.10), inset 0 2px 8px rgba(0,0,0,0.2)';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.border = '1px solid rgba(0,212,212,0.18)';
                        e.currentTarget.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.2)';
                      }}
                    />
                    {displayName.length > 0 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/25"
                      >
                        {displayName.length}/24
                      </motion.span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      id="btn-back"
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setStep('home'); setDisplayName(''); }}
                      className="px-5 py-3.5 rounded-2xl font-semibold text-sm text-white/60 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      ← Back
                    </motion.button>

                    <motion.button
                      id="btn-submit-name"
                      type="submit"
                      disabled={isPending || !displayName.trim()}
                      whileHover={{ scale: isPending || !displayName.trim() ? 1 : 1.02, y: isPending || !displayName.trim() ? 0 : -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 flex items-center justify-center gap-2 text-white py-3.5 rounded-2xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                      style={{
                        background: displayName.trim()
                          ? 'linear-gradient(135deg, #00d4d4 0%, #0ea5e9 50%, #3b82f6 100%)'
                          : 'rgba(255,255,255,0.08)',
                        boxShadow: displayName.trim() ? '0 8px 24px rgba(0,212,212,0.30)' : 'none',
                        color: displayName.trim() ? '#030c12' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          {inviteCode ? 'Join Room' : 'Enter SyncBeat'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-white/20 mt-5"
        >
          🎵 Listen together · Share the vibe · No ads, ever
        </motion.p>
      </motion.div>
    </div>
  );
}
