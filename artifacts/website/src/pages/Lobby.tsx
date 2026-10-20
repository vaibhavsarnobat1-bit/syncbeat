import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Plus, Users, Search, ArrowRight,
  Music2, Radio, Sparkles, ArrowUpRight,
  Copy, Check, RefreshCw, Clock, Trash2, Globe, QrCode
} from 'lucide-react';
import { useCreateRoom } from '@workspace/api-client-react';
import { useAuthStore, useRecentRoomsStore } from '@/lib/store';
import { Music3DCanvas } from '@/components/3d/Music3DCanvas';
import { BrandMark } from '@/components/BrandMark';
import { Card3DTilt } from '@/components/3d/Card3DTilt';
import { CreatorSignature } from '@/components/layout/CreatorSignature';
import { AppDownloadModal } from '@/components/AppDownloadModal';
import { shareOrCopy } from '@/lib/utils';

function WaveVisualizer({ bars = 7 }: { bars?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-6" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: 'linear-gradient(to top, #00d4d4, #38bdf8)',
            animation: `wave ${0.8 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.08}s`,
            minHeight: '4px',
            height: `${35 + Math.sin(i * 0.9) * 25}%`,
            boxShadow: '0 0 8px rgba(0, 212, 212, 0.45)',
          }}
        />
      ))}
    </div>
  );
}

function VinylDisc({
  size = 110,
  className = '',
  labelColor = '#00d4d4',
  spinning = false,
}: {
  size?: number;
  className?: string;
  labelColor?: string;
  spinning?: boolean;
}) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <div className={`absolute inset-0 rounded-full vinyl-grooves ${spinning ? 'animate-spin-slow' : ''}`}>
        <div className="absolute inset-0 rounded-full vinyl-reflection" />
      </div>
      <div
        className="absolute inset-0 m-auto rounded-full"
        style={{
          width: size * 0.34,
          height: size * 0.34,
          background: `linear-gradient(135deg, ${labelColor}, #16203a)`,
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: `0 0 16px ${labelColor}55`,
        }}
      />
      <div
        className="absolute inset-0 m-auto rounded-full bg-[#030712]"
        style={{ width: Math.max(4, size * 0.06), height: Math.max(4, size * 0.06) }}
      />
    </div>
  );
}

/* Mouse-tracked 3D tilt stage — the whole panel leans toward the cursor */
function PanelStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -3.5, ry: px * 4.5 });
  };

  return (
    <div style={{ perspective: '1500px' }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* Centerpiece: floating spinning vinyl wrapped in two 3D orbit rings */
function OrbitScene({ color = '#00d4d4' }: { color?: string }) {
  return (
    <div className="relative mx-auto w-[230px] h-[230px] sm:w-[280px] sm:h-[280px]" style={{ perspective: '1000px' }}>
      {/* Ambient halo */}
      <div
        className="absolute inset-8 rounded-full blur-3xl animate-halo-breathe"
        style={{ background: `radial-gradient(circle, ${color}66 0%, transparent 70%)` }}
        aria-hidden="true"
      />
      {/* Floating spinning vinyl */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-float-3d">
          <VinylDisc size={132} labelColor={color} spinning />
        </div>
      </div>
      {/* Inner 3D orbit ring + satellite dot */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
        <div
          className="animate-orbit-ring absolute rounded-full border"
          style={{ width: '78%', height: '78%', borderColor: `${color}66` }}
        >
          <span
            className="absolute -top-[5px] left-1/2 -ml-[5px] w-2.5 h-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 14px 3px ${color}aa` }}
          />
        </div>
      </div>
      {/* Outer counter-rotating ring + satellite dot */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
        <div
          className="animate-orbit-ring-rev absolute rounded-full border border-dashed"
          style={{ width: '96%', height: '96%', borderColor: 'rgba(255,255,255,0.18)' }}
        >
          <span
            className="absolute top-1/2 -right-[4px] -mt-[4px] w-2 h-2 rounded-full bg-blue-400"
            style={{ boxShadow: '0 0 12px 3px rgba(96,165,250,0.7)' }}
          />
        </div>
      </div>
      {/* Floating note accents */}
      <span className="absolute top-[6%] right-[10%] text-xl opacity-70 animate-float-3d" style={{ animationDelay: '1.1s' }} aria-hidden="true">🎵</span>
      <span className="absolute bottom-[10%] left-[6%] text-lg opacity-50 animate-float-3d" style={{ animationDelay: '2.3s' }} aria-hidden="true">🎶</span>
    </div>
  );
}

/* Mini animated equalizer bars (live feel) */
function MiniEQ({ color = '#a855f7', bars = 4 }: { color?: string; bars?: number }) {
  return (
    <div className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full"
          style={{
            background: `linear-gradient(to top, ${color}, ${color}bb)`,
            animation: `wave ${0.7 + i * 0.14}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.1}s`,
            height: `${30 + ((i * 37) % 60)}%`,
          }}
        />
      ))}
    </div>
  );
}

const TABS = [
  {
    id: 'create',
    label: 'Create Room',
    icon: Plus,
    activeColor: '#030c12',
    gradient: 'linear-gradient(135deg, #00d4d4 0%, #0ea5e9 100%)',
    glow: 'rgba(0, 212, 212, 0.35)',
  },
  {
    id: 'join',
    label: 'Join Room',
    icon: Search,
    activeColor: '#bfdbfe',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.32) 0%, rgba(37,99,235,0.2) 100%)',
    glow: 'rgba(59, 130, 246, 0.28)',
  },
  {
    id: 'discover',
    label: 'Discover',
    icon: Globe,
    activeColor: '#ddd0fe',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.32) 0%, rgba(168,85,247,0.18) 100%)',
    glow: 'rgba(139, 92, 246, 0.28)',
  },
] as const;

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuthStore();
  const { rooms: recentRooms, removeRoom } = useRecentRoomsStore();

  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'discover'>('create');
  const [myRoom, setMyRoom] = useState<{ name: string; inviteCode: string; memberCount: number; currentTrack?: { title: string } | null } | null>(null);
  const [loadingMyRoom, setLoadingMyRoom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Discover public rooms state
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  const fetchPublicRooms = useCallback(() => {
    setLoadingPublic(true);
    fetch('/api/rooms/public')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setPublicRooms(data || []);
      })
      .catch(() => setPublicRooms([]))
      .finally(() => setLoadingPublic(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code);
      setActiveTab('join');
    }
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    setLoadingMyRoom(true);
    fetch(`/api/rooms/by-host/${user.userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setMyRoom(data || null);
      })
      .catch(() => setMyRoom(null))
      .finally(() => setLoadingMyRoom(false));
  }, [user?.userId]);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchPublicRooms();
    }
  }, [activeTab, fetchPublicRooms]);

  const { mutate: createRoom, isPending: isCreating } = useCreateRoom({
    mutation: {
      onSuccess: (data: any) => {
        setMyRoom(data);
        setLocation(`/room/${data.inviteCode}`);
      },
    },
  });

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed || isCreatingRoom) return;
    setIsCreatingRoom(true);
    setCreateError(null);

    let activeUser = user;
    if (!activeUser?.userId) {
      activeUser = {
        userId: 'anon-' + Math.random().toString(36).substring(2, 9),
        displayName: 'Guest_' + Math.floor(100 + Math.random() * 900),
        avatarColor: '#00d4d4',
      };
      setUser(activeUser);
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          hostUserId: activeUser.userId,
          hostDisplayName: activeUser.displayName,
        }),
      });

      if (res.ok) {
        const roomData = await res.json();
        setMyRoom(roomData);
        setLocation(`/room/${roomData.inviteCode}`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setCreateError(errJson.error || 'Failed to create room. Please ensure the backend server is running on port 3001.');
      }
    } catch (err: any) {
      setCreateError('Could not reach backend server on port 3001. Please make sure the server is started.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) setLocation(`/room/${inviteCode.trim()}`);
  };

  const copyInviteLink = async () => {
    if (!myRoom) return;
    const inviteUrl = `${window.location.origin}/login?invite=${myRoom.inviteCode}`;
    const result = await shareOrCopy({
      title: `SyncBeat — ${myRoom.name}`,
      text: `Join my room "${myRoom.name}" on SyncBeat and listen together!`,
      url: inviteUrl,
    });
    if (result !== 'failed') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentUser = user || {
    userId: 'anon-guest',
    displayName: 'Guest',
    avatarColor: '#00d4d4',
  };

  const roomSuggestions = [
    { name: 'Bollywood Night', emoji: '🎵' },
    { name: 'Lofi Study Session', emoji: '📚' },
    { name: 'Party Mix Vibes', emoji: '🎉' },
    { name: 'Retro 80s Disco', emoji: '🕺' },
    { name: 'Late Night Chill', emoji: '🌙' },
  ];

  return (
    <div className="page-bg-lobby w-full relative overflow-hidden min-h-screen bg-[#030712] text-white">
      {/* Aurora nebula background canvas */}
      <Music3DCanvas mode="nebula" isPlaying={true} speed={0.45} />

      {/* Dark background mask */}
      <div className="absolute inset-0 bg-[#050814]/92 -z-10 pointer-events-none" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,212,212,0.12),transparent_60%)] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00d4d4 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute top-[40%] right-[-10%] w-[450px] h-[450px] rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="grid-overlay" aria-hidden="true" />

      {/* Floating 3D vinyl discs */}
      <div
        className="pointer-events-none select-none fixed inset-0 z-0 overflow-hidden"
        style={{ perspective: '1200px' }}
        aria-hidden="true"
      >
        <div className="animate-float-3d absolute top-[9%] left-[5%] opacity-50">
          <VinylDisc size={112} labelColor="#00d4d4" spinning />
        </div>
        <div className="animate-float-3d absolute top-[54%] right-[5%] opacity-40" style={{ animationDelay: '1.6s' }}>
          <VinylDisc size={84} labelColor="#f472b6" spinning />
        </div>
        <div className="animate-float-3d absolute bottom-[16%] left-[7%] opacity-30" style={{ animationDelay: '3.2s' }}>
          <VinylDisc size={62} labelColor="#fbbf24" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_430px] lg:gap-x-10 lg:gap-y-6 lg:items-start">
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-toolbar rounded-2xl px-3.5 py-3 mb-8 flex items-center justify-between gap-2 lg:col-span-2 lg:row-start-1 lg:mb-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-xl shadow-lg shadow-cyan-500/25 border border-cyan-400/25 shrink-0 bg-[#070d1c]/85 flex items-center justify-center">
              <BrandMark size={34} title="SyncBeat logo" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold leading-tight text-shimmer">SyncBeat</h1>
              <p className="text-[10px] text-white/35 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                Listening Together
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Install App QR Code */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="chip-pop flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 cursor-pointer"
              title="Download & Install App via QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* User badge */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 border border-white/8 bg-white/[0.03]">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: currentUser.avatarColor, boxShadow: `0 0 12px ${currentUser.avatarColor}55` }}
              >
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold max-w-[100px] truncate text-white/80">{currentUser.displayName}</span>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setUser(null);
                setLocation('/login');
              }}
              className="chip-pop p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 border border-white/6"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </motion.header>

        {/* ── Greeting ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 flex items-end justify-between gap-4 lg:col-start-1 lg:row-start-2 lg:mb-0"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/60 mb-2 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-cyan-400/70 to-transparent inline-block" />
              Your Lobby
            </p>
            <h2
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ fontFamily: 'var(--app-font-display)' }}
            >
              Welcome back,{' '}
              <span className="text-shimmer">{currentUser.displayName.split(' ')[0]}</span>
            </h2>
            <p className="text-sm text-white/45 mt-1.5">Ready to listen? Choose an option below to get started.</p>
          </div>
          <div className="ml-auto hidden sm:flex flex-col items-end gap-2 pb-1">
            <WaveVisualizer bars={8} />
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 font-bold">Live Audio Engine</p>
          </div>
        </motion.div>

        {/* ── Active Room Banner ── */}
        <AnimatePresence>
          {!loadingMyRoom && myRoom && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="card-gradient-border rounded-2xl mb-6 p-4 flex items-center gap-4 lg:col-start-2 lg:row-start-2 lg:mb-0"
            >
              <div className="relative shrink-0">
                <div className="icon-orb w-11 h-11 animate-pulse-ring">
                  <Radio className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-cyan-400 font-bold mb-0.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                  Your Active Room
                </p>
                <p className="font-bold text-sm text-white truncate">{myRoom.name}</p>
                {myRoom.currentTrack?.title && (
                  <p className="text-[11px] text-white/40 truncate mt-0.5">🎵 {myRoom.currentTrack.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyInviteLink}
                  className="chip-pop p-2 rounded-xl border border-white/8 text-cyan-400 hover:bg-cyan-500/10"
                  title="Copy invite link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setLocation(`/room/${myRoom.inviteCode}`)}
                  className="btn-shine chip-pop flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #00d4d4, #3b82f6)',
                    color: '#030c12',
                    boxShadow: '0 4px 16px rgba(0,212,212,0.25)',
                  }}
                >
                  Rejoin <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stacked in one column: a taller sidebar block must not stretch the tab row */}
        <div className="flex flex-col gap-6 mb-6 lg:mb-0 lg:col-start-1 lg:row-start-3">
        {/* ── Tab Switcher (sliding 3D pill) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative flex rounded-2xl p-1.5 gap-1 glass-toolbar"
        >
          {TABS.map(({ id, label, icon: Icon, activeColor, gradient, glow }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors duration-200 cursor-pointer"
                style={{ color: isActive ? activeColor : 'rgba(255,255,255,0.42)' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="lobby-tab-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: gradient, boxShadow: `0 6px 22px ${glow}, inset 0 1px 0 rgba(255,255,255,0.14)` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Main Panel Container ── */}
        <motion.div layout className="relative">
          <AnimatePresence mode="wait">
            {activeTab === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 26, rotateX: 7 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -18, rotateX: -5 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <PanelStage>
                  <div className="card-gradient-border relative rounded-3xl p-6 sm:p-9 overflow-hidden shadow-[0_35px_90px_rgba(0,0,0,0.9)]">
                    {/* Ambient corner glow */}
                    <div
                      className="absolute -left-24 -top-24 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none"
                      style={{ background: 'radial-gradient(circle, #00d4d4 0%, transparent 70%)' }}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -right-20 -bottom-24 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
                      style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
                      aria-hidden="true"
                    />

                    <div className="relative z-10 grid sm:grid-cols-[auto_1fr] gap-7 sm:gap-10 items-center">
                      {/* LEFT — 3D orbit centerpiece */}
                      <div className="mx-auto">
                        <OrbitScene color="#00d4d4" />
                        <p className="text-center text-[10px] uppercase tracking-[0.26em] text-cyan-300/50 font-bold mt-2">
                          Host · Sync · Vibe
                        </p>
                      </div>

                      {/* RIGHT — creation form */}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/70 mb-2 flex items-center gap-2">
                          <span className="w-5 h-px bg-gradient-to-r from-cyan-400 to-transparent inline-block" />
                          Step 01 — Host a Session
                        </p>
                        <h3
                          className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1"
                          style={{ fontFamily: 'var(--app-font-display)' }}
                        >
                          Spin Up{' '}
                          <span className="text-shimmer">Your Room</span>
                        </h3>
                        <p className="text-xs text-white/40 mb-7">
                          Name it, create it, and drop the invite link to your crew.
                        </p>

                        <form onSubmit={handleCreateRoom} className="space-y-5">
                          <div>
                            <div className="flex items-center justify-between mb-2 pl-1">
                              <label className="text-[10px] font-bold text-cyan-300/90 uppercase tracking-[0.18em]">
                                Room Name
                              </label>
                              {roomName.trim().length >= 2 && (
                                <motion.span
                                  initial={{ opacity: 0, x: 6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 font-mono"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  Name Ready
                                </motion.span>
                              )}
                            </div>

                            <div className="relative">
                              <input
                                type="text"
                                placeholder="e.g. Chill Beats, Bollywood Night..."
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className={`input-glow w-full pl-5 pr-14 py-4 rounded-2xl text-white text-base font-bold outline-none transition-all placeholder:text-white/30 border ${
                                  roomName.trim().length >= 2
                                    ? 'border-emerald-400/80 focus:border-emerald-400'
                                    : 'border-cyan-500/30 focus:border-cyan-400'
                                }`}
                                required
                                autoFocus
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <AnimatePresence>
                                  {roomName.trim().length >= 2 && (
                                    <motion.div
                                      key="valid-tick"
                                      initial={{ scale: 0, rotate: -30, opacity: 0 }}
                                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                      className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/70 flex items-center justify-center text-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.5)]"
                                    >
                                      <Check className="w-5 h-5 stroke-[3]" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.18em] mb-2.5 pl-1">
                              Quick Ideas
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {roomSuggestions.map((s) => (
                                <button
                                  key={s.name}
                                  type="button"
                                  onClick={() => setRoomName(s.name)}
                                  className="chip-pop text-xs px-3.5 py-2 rounded-xl font-bold border border-white/10 bg-white/5 hover:border-cyan-400/60 hover:bg-cyan-500/15 text-white/80 hover:text-cyan-200 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>{s.emoji}</span>
                                  <span>{s.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {createError && (
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                              <span>{createError}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isCreatingRoom || !roomName.trim()}
                            className="btn-shine btn-3d w-full mt-2 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 text-[#02141a] bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 disabled:opacity-50 disabled:shadow-none cursor-pointer"
                          >
                            {isCreatingRoom ? (
                              <>
                                <div className="w-5 h-5 border-2 border-[#02141a] border-t-transparent rounded-full animate-spin" />{' '}
                                Creating Room...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" /> Create &amp; Enter Room
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </PanelStage>
              </motion.div>
            )}

            {activeTab === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, y: 26, rotateX: 7 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -18, rotateX: -5 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <PanelStage>
                  <div className="card-gradient-border relative rounded-3xl p-6 sm:p-10 overflow-hidden shadow-[0_35px_90px_rgba(0,0,0,0.9)]">
                    {/* Ambient glows */}
                    <div
                      className="absolute -right-24 -top-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
                      style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -left-20 -bottom-24 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
                      style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
                      aria-hidden="true"
                    />

                    {/* HUD corner brackets */}
                    <span className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-md pointer-events-none" aria-hidden="true" />
                    <span className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-md pointer-events-none" aria-hidden="true" />
                    <span className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-md pointer-events-none" aria-hidden="true" />
                    <span className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400/50 rounded-br-md pointer-events-none" aria-hidden="true" />

                    {/* Scanning laser line */}
                    <div
                      className="animate-hud-scan absolute left-10 right-10 h-[2px] pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.9), transparent)',
                        boxShadow: '0 0 14px rgba(34,211,238,0.55)',
                      }}
                      aria-hidden="true"
                    />

                    <div className="relative z-10 max-w-md mx-auto">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-300/70 mb-2 flex items-center gap-2">
                        <span className="w-5 h-px bg-gradient-to-r from-blue-400 to-transparent inline-block" />
                        Step 02 — Enter the Vibe
                      </p>
                      <h3
                        className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1"
                        style={{ fontFamily: 'var(--app-font-display)' }}
                      >
                        Drop the <span className="text-shimmer">Invite Code</span>
                      </h3>
                      <p className="text-xs text-white/40 mb-8">
                        Paste the code your friend shared — you will land straight in their room.
                      </p>

                      <form onSubmit={handleJoinRoom} className="space-y-5">
                        <div>
                          <label className="block text-[10px] font-bold text-blue-300/70 mb-2 pl-1 uppercase tracking-[0.18em]">
                            Invite Code
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="e.g. aBcdEfGhIjKl"
                              value={inviteCode}
                              onChange={(e) => setInviteCode(e.target.value)}
                              className="input-glow w-full pl-5 pr-12 py-4 rounded-2xl text-white text-lg outline-none transition-all placeholder:text-white/20 border border-white/10 focus:border-blue-500/70 tracking-[0.22em] font-mono"
                              required
                            />
                            {inviteCode.trim() && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none"
                              >
                                <Check className="w-5 h-5 stroke-[3]" />
                              </motion.div>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!inviteCode.trim()}
                          className={`btn-shine btn-3d w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 ${
                            inviteCode.trim()
                              ? 'text-white cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600'
                              : 'text-white/30 bg-white/[0.04] border border-white/8 shadow-none'
                          }`}
                        >
                          <ArrowRight className="w-5 h-5" /> Join Room Instantly
                        </button>

                        <p className="text-center text-[10px] text-white/25 font-semibold uppercase tracking-[0.2em]">
                          Codes look like N520QUzP7XjE
                        </p>
                      </form>
                    </div>
                  </div>
                </PanelStage>
              </motion.div>
            )}

            {activeTab === 'discover' && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 26, rotateX: 7 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -18, rotateX: -5 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <PanelStage>
                  <div className="card-gradient-border relative rounded-3xl p-6 sm:p-8 overflow-hidden shadow-[0_35px_90px_rgba(0,0,0,0.9)]">
                    {/* Ambient glows */}
                    <div
                      className="absolute -right-24 -top-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
                      style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -left-20 -bottom-24 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
                      style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
                      aria-hidden="true"
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-purple-300/70 mb-2 flex items-center gap-2">
                            <span className="w-5 h-px bg-gradient-to-r from-purple-400 to-transparent inline-block" />
                            Live Now — Open Sessions
                          </p>
                          <h3
                            className="text-3xl sm:text-4xl font-black text-white tracking-tight"
                            style={{ fontFamily: 'var(--app-font-display)' }}
                          >
                            Rooms <span className="text-shimmer">In Session</span>
                          </h3>
                          <p className="text-xs text-white/40 mt-1.5 mb-7">
                            Hop into any public vibe — everyone hears the same beat, synced.
                          </p>
                        </div>
                        <button
                          onClick={fetchPublicRooms}
                          disabled={loadingPublic}
                          className="chip-pop p-2.5 rounded-xl text-white/50 hover:text-purple-300 hover:bg-purple-500/10 border border-white/8 shrink-0"
                          title="Refresh"
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingPublic ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {loadingPublic ? (
                        <div className="py-14 flex flex-col items-center justify-center text-white/40">
                          <div className="relative mb-4">
                            <div className="w-12 h-12 rounded-full border-2 border-purple-400/20 border-t-purple-400 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Music2 className="w-5 h-5 text-purple-400/70" />
                            </div>
                          </div>
                          <p className="text-xs font-semibold">Scanning public vibe rooms...</p>
                        </div>
                      ) : publicRooms.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl bg-white/[0.01] border border-white/5 p-6 flex flex-col items-center justify-center">
                          <div className="animate-float-3d mb-3">
                            <VinylDisc size={72} labelColor="#a855f7" spinning />
                          </div>
                          <p className="text-sm font-semibold text-white/50">No active rooms found</p>
                          <p className="text-xs text-white/30 mt-1 max-w-[250px] mx-auto leading-normal">
                            Create a new room and share the invite code to start the first party!
                          </p>
                          <button
                            onClick={() => setActiveTab('create')}
                            className="chip-pop mt-5 px-5 py-2.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25 text-xs font-bold hover:bg-purple-500/25"
                          >
                            Start a Vibe Room
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1.5 scrollbar-hide">
                          {publicRooms.map((room, idx) => (
                            <motion.div
                              key={room.inviteCode}
                              initial={{ opacity: 0, x: -14 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="row-slide flex items-center gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/6 hover:border-purple-500/50 hover:bg-purple-500/[0.05] hover:shadow-[0_8px_28px_rgba(168,85,247,0.12)] group"
                            >
                              <div
                                className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 gap-1"
                                style={{
                                  background: 'linear-gradient(145deg, rgba(139,92,246,0.2), rgba(139,92,246,0.06))',
                                  border: '1px solid rgba(139,92,246,0.3)',
                                  boxShadow: '0 0 18px rgba(139,92,246,0.12)',
                                }}
                              >
                                <MiniEQ color="#c084fc" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm truncate group-hover:text-purple-200 transition-colors">
                                    {room.name}
                                  </span>
                                  <span className="text-[10px] bg-white/5 border border-white/8 rounded-full px-2 py-0.5 text-white/40 shrink-0 font-mono">
                                    {room.inviteCode}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/35">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-purple-400" /> {room.memberCount || 0}{' '}
                                    {room.memberCount === 1 ? 'member' : 'members'}
                                  </span>
                                  {room.currentTrack?.title ? (
                                    <span className="truncate max-w-[150px] sm:max-w-[200px] text-purple-400/80 font-medium">
                                      🎵 {room.currentTrack.title}
                                    </span>
                                  ) : (
                                    <span>🎧 Just Chilling</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setLocation(`/room/${room.inviteCode}`)}
                                className="btn-shine chip-pop flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:shadow-[0_0_22px_rgba(168,85,247,0.45)] border border-purple-400/30 shrink-0"
                              >
                                Vibe In <ArrowRight className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </PanelStage>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        </div>

        <div className="flex flex-col gap-8 lg:col-start-2 lg:row-start-3">
        {/* ── Recent Rooms History ── */}
        <AnimatePresence>
          {recentRooms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,212,212,0.1)', border: '1px solid rgba(0,212,212,0.2)' }}
                >
                  <Clock className="w-3 h-3 text-cyan-400" />
                </div>
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Recent Vibe History</h3>
                <span className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 via-white/8 to-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-1">
                {recentRooms.map((room) => (
                  <div
                    key={room.inviteCode}
                    className="row-slide flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/6 hover:border-cyan-400/35 hover:bg-cyan-500/[0.03] group"
                  >
                    <button
                      onClick={() => setLocation(`/room/${room.inviteCode}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="font-semibold text-sm truncate text-white/80 group-hover:text-cyan-300 transition-colors">
                        {room.name}
                      </p>
                      <p className="text-[10px] text-white/30 font-mono mt-0.5">Code: {room.inviteCode}</p>
                    </button>
                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeRoom(room.inviteCode)}
                        className="chip-pop p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10"
                        title="Remove history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLocation(`/room/${room.inviteCode}`)}
                        className="chip-pop p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10"
                        title="Quick join"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Feature highlights (3D tilt cards) ── */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 xl:grid-cols-3" style={{ perspective: '1000px' }}>
          {[
            { icon: Music2, label: 'Real-time Sync', desc: 'Perfect beat alignment', color: '#00d4d4' },
            { icon: Users, label: 'Live Chat & Vibes', desc: 'Real-time chat & reactions', color: '#3b82f6' },
            { icon: Radio, label: 'Spotify Import', desc: 'Matched playlist parser', color: '#06b6d4' },
          ].map(({ icon: Icon, label, desc, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
            >
              <Card3DTilt maxTilt={10} scale={1.03} glare className="rounded-2xl block">
                <div
                  className="rounded-2xl p-4 text-center cursor-default border border-white/6"
                  style={{ background: 'rgba(3,12,22,0.5)', backdropFilter: 'blur(16px)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                    style={{
                      background: `linear-gradient(145deg, ${color}26, ${color}0d)`,
                      border: `1px solid ${color}3d`,
                      boxShadow: `0 0 18px ${color}2e`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-[11px] font-bold text-white mb-0.5">{label}</p>
                  <p className="text-[9px] text-white/30 leading-tight">{desc}</p>
                </div>
              </Card3DTilt>
            </motion.div>
          ))}
        </div>
        </div>

        {/* Bottom Creator Showcase & Auto-cleanup note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-12 pt-8 border-t border-white/[0.08] text-center flex flex-col items-center gap-6 relative lg:col-span-2 lg:row-start-4 lg:mt-0"
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <CreatorSignature />
          <p className="text-xs text-white/20">🔒 Rooms auto-cleanup when all listeners leave</p>
        </motion.div>
      </div>

      <AppDownloadModal open={showDownloadModal} onOpenChange={setShowDownloadModal} />
    </div>
  );
}
