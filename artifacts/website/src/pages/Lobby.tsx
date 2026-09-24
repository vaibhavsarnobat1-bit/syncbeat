import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Plus, Users, Play, Search, ArrowRight,
  Music2, Headphones, Radio, Sparkles, ArrowUpRight,
  Link2, Copy, Check, RefreshCw, Clock, Trash2, Globe, QrCode
} from 'lucide-react';
import { useCreateRoom } from '@workspace/api-client-react';
import { useAuthStore, useRecentRoomsStore } from '@/lib/store';
import { Music3DCanvas } from '@/components/3d/Music3DCanvas';
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
            background: 'linear-gradient(to top, #00d4d4, #3b82f6)',
            animation: `wave ${0.8 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.08}s`,
            minHeight: '4px',
            height: `${35 + Math.sin(i * 0.9) * 25}%`,
          }}
        />
      ))}
    </div>
  );
}

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

  // Ensure user profile exists or generate guest profile immediately
  useEffect(() => {
    if (!user) {
      const guestUser = {
        userId: 'anon-' + Math.random().toString(36).substring(2, 9),
        displayName: 'Guest_' + Math.floor(100 + Math.random() * 900),
        avatarColor: '#00d4d4',
      };
      setUser(guestUser);
    }
  }, [user, setUser]);

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
      {/* 3D Subtle Particle Starfield Canvas */}
      <Music3DCanvas mode="particle-starfield" isPlaying={true} speed={0.35} />

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

      {/* Floating music emojis */}
      <div className="pointer-events-none select-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float absolute top-[10%] left-[6%] text-6xl opacity-30">🎵</div>
        <div className="animate-float2 absolute top-[60%] right-[5%] text-5xl opacity-25">🎶</div>
        <div className="animate-float-delayed absolute bottom-[22%] left-[4%] text-4xl opacity-20">🎸</div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 border border-cyan-400/20 shrink-0">
              <img src="/logo.png" alt="Listening Together Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-tight text-shimmer">SyncBeat</h1>
              <p className="text-[10px] text-white/35 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                Listening Together
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Install App QR Code */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all cursor-pointer"
              title="Download & Install App via QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* User badge */}
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                style={{ backgroundColor: currentUser.avatarColor }}
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
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all border border-white/6"
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
          className="mb-8 flex items-center gap-4"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Welcome back,{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #67e8f9, #38bdf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {currentUser.displayName.split(' ')[0]}
              </span>{' '}
              👋
            </h2>
            <p className="text-sm text-white/45 mt-1">Ready to listen? Choose an option below to get started.</p>
          </div>
          <div className="ml-auto hidden sm:block">
            <WaveVisualizer bars={8} />
          </div>
        </motion.div>

        {/* ── Active Room Banner ── */}
        <AnimatePresence>
          {!loadingMyRoom && myRoom && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl flex items-center gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,212,0.08) 0%, rgba(59,130,246,0.04) 100%)',
                border: '1px solid rgba(0,212,212,0.22)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,212,212,0.12)' }}
              >
                <Radio className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-cyan-400 font-bold mb-0.5 flex items-center gap-1.5">
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
                  className="p-2 rounded-xl transition-all hover:bg-white/5 border border-white/8"
                  title="Copy invite link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                </button>
                <button
                  onClick={() => setLocation(`/room/${myRoom.inviteCode}`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #00d4d4, #3b82f6)',
                    color: '#030c12',
                    boxShadow: '0 4px 14px rgba(0,212,212,0.2)',
                  }}
                >
                  Rejoin <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tab Switcher ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative flex rounded-2xl p-1 gap-1 mb-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="absolute inset-y-1 w-[calc(33.33%-4px)] rounded-xl transition-all duration-300 ease-out z-0"
            style={{
              left:
                activeTab === 'create'
                  ? '4px'
                  : activeTab === 'join'
                  ? 'calc(33.33% + 2px)'
                  : 'calc(66.66%)',
              background:
                activeTab === 'create'
                  ? 'linear-gradient(135deg, #00d4d4, #0ea5e9)'
                  : activeTab === 'join'
                  ? 'rgba(59,130,246,0.18)'
                  : 'rgba(124,58,237,0.18)',
              boxShadow:
                activeTab === 'create'
                  ? '0 4px 12px rgba(0,212,212,0.25)'
                  : activeTab === 'join'
                  ? 'inset 0 0 0 1px rgba(59,130,246,0.25)'
                  : 'inset 0 0 0 1px rgba(124,58,237,0.25)',
            }}
          />
          <button
            onClick={() => setActiveTab('create')}
            className="flex-1 relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
            style={{ color: activeTab === 'create' ? '#030c12' : 'rgba(255,255,255,0.45)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Create Room
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className="flex-1 relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
            style={{ color: activeTab === 'join' ? '#93c5fd' : 'rgba(255,255,255,0.45)' }}
          >
            <Search className="w-3.5 h-3.5" /> Join Room
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className="flex-1 relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
            style={{ color: activeTab === 'discover' ? '#c084fc' : 'rgba(255,255,255,0.45)' }}
          >
            <Globe className="w-3.5 h-3.5" /> Discover
          </button>
        </motion.div>

        {/* ── Main Panel Container ── */}
        <motion.div layout className="relative mb-6">
          <AnimatePresence mode="wait">
            {activeTab === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-[#070b18] border-2 border-cyan-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.9)]"
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,212,212,0.2)]"
                    >
                      <Radio className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight">Create a Room</h3>
                      <p className="text-xs text-cyan-300/80 font-medium mt-0.5">Start a new synced listening room</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateRoom} className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2 pl-1">
                        <label className="text-xs font-bold text-cyan-300/90 uppercase tracking-wider">
                          Enter Room Name
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
                          className={`w-full pl-5 pr-14 py-4 rounded-2xl text-white text-base font-bold outline-none transition-all placeholder:text-white/30 bg-[#0e1526] border-2 shadow-inner ${
                            roomName.trim().length >= 2
                              ? 'border-emerald-400/80 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20'
                              : 'border-cyan-500/30 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20'
                          }`}
                          required
                          autoFocus
                        />

                        {/* Right side animated green tick (Checkmark) */}
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
                      <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider mb-2 pl-1">Quick Ideas:</p>
                      <div className="flex flex-wrap gap-2">
                        {roomSuggestions.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => setRoomName(s.name)}
                            className="text-xs px-3.5 py-2 rounded-xl transition-all font-bold border border-white/10 bg-white/5 hover:border-cyan-400 hover:bg-cyan-500/20 text-white/80 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer active:scale-95"
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
                      className="w-full mt-6 py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 text-white bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-[0_0_35px_rgba(0,212,212,0.45)] hover:shadow-[0_0_55px_rgba(0,212,212,0.65)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      {isCreatingRoom ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{' '}
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
              </motion.div>
            )}

            {activeTab === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, scale: 0.97, filter: 'blur(5px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.97, filter: 'blur(5px)' }}
                transition={{ duration: 0.2 }}
                className="relative rounded-3xl p-6 sm:p-8 overflow-hidden"
                style={{
                  background: 'rgba(3, 12, 22, 0.65)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(59,130,246,0.1)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}
                    >
                      <Link2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Join a Room</h3>
                      <p className="text-xs text-white/40 mt-0.5">Enter an invite code or room link</p>
                    </div>
                  </div>

                  <form onSubmit={handleJoinRoom} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/35 mb-2 pl-1 uppercase tracking-wider">
                        Invite Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. aBcdEfGhIjKl"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          className="w-full pl-4 pr-11 py-3.5 rounded-xl text-white text-sm outline-none transition-all placeholder:text-white/20 bg-white/[0.03] border border-white/10 focus:border-blue-500/50 tracking-wider font-mono"
                          required
                        />
                        {inviteCode.trim() && (
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!inviteCode.trim()}
                      className="w-full mt-4 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40"
                      style={{
                        background: inviteCode.trim() ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                        border: inviteCode.trim() ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(255,255,255,0.08)',
                        color: inviteCode.trim() ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                        boxShadow: inviteCode.trim() ? '0 4px 16px rgba(59,130,246,0.15)' : 'none',
                      }}
                    >
                      <ArrowRight className="w-4 h-4" /> Join Room
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'discover' && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, scale: 0.97, filter: 'blur(5px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.97, filter: 'blur(5px)' }}
                transition={{ duration: 0.2 }}
                className="relative rounded-3xl p-6 sm:p-8 overflow-hidden"
                style={{
                  background: 'rgba(3, 12, 22, 0.65)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(124,58,237,0.1)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.18)' }}
                      >
                        <Globe className="w-5.5 h-5.5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Active Rooms</h3>
                        <p className="text-xs text-white/40 mt-0.5">Explore and join ongoing listener sessions</p>
                      </div>
                    </div>
                    <button
                      onClick={fetchPublicRooms}
                      disabled={loadingPublic}
                      className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 border border-white/8 transition-all"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingPublic ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loadingPublic ? (
                    <div className="py-12 flex flex-col items-center justify-center text-white/40">
                      <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-xs font-semibold">Scanning public vibe rooms...</p>
                    </div>
                  ) : publicRooms.length === 0 ? (
                    <div className="py-10 text-center rounded-2xl bg-white/[0.01] border border-white/5 p-6 flex flex-col items-center justify-center">
                      <Radio className="w-10 h-10 text-white/10 mb-3" />
                      <p className="text-sm font-semibold text-white/50">No active rooms found</p>
                      <p className="text-xs text-white/30 mt-1 max-w-[240px] mx-auto leading-normal">
                        Create a new room and share the invite code to start the first party!
                      </p>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="mt-4 px-4 py-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/20 text-xs font-bold transition-all hover:bg-purple-500/25"
                      >
                        Start a Vibe Room
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-hide">
                      {publicRooms.map((room) => (
                        <div
                          key={room.inviteCode}
                          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/6 hover:border-purple-500/30 transition-all group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center shrink-0">
                            <Music2 className="w-4.5 h-4.5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">{room.name}</span>
                              <span className="text-[10px] bg-white/5 border border-white/8 rounded-full px-2 py-0.5 text-white/40 shrink-0 font-medium">
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
                            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-purple-500/20 hover:bg-purple-500 hover:text-white border border-purple-500/30 group-hover:scale-105"
                          >
                            Vibe In <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Recent Rooms History ── */}
        <AnimatePresence>
          {recentRooms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Recent Vibe History</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentRooms.map((room) => (
                  <div
                    key={room.inviteCode}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/6 hover:border-cyan-400/30 transition-all group"
                  >
                    <button
                      onClick={() => setLocation(`/room/${room.inviteCode}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="font-semibold text-sm truncate text-white/80 group-hover:text-cyan-400 transition-colors">
                        {room.name}
                      </p>
                      <p className="text-[10px] text-white/30 font-mono mt-0.5">Code: {room.inviteCode}</p>
                    </button>
                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeRoom(room.inviteCode)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLocation(`/room/${room.inviteCode}`)}
                        className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
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

        {/* ── Feature highlights ── */}
        <div className="grid grid-cols-3 gap-3">
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
              whileHover={{ y: -3, scale: 1.02 }}
              className="rounded-2xl p-4 text-center cursor-default border border-white/6"
              style={{
                background: 'rgba(3,12,22,0.45)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                style={{ background: `${color}15`, border: `1px solid ${color}25` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-[11px] font-bold text-white mb-0.5">{label}</p>
              <p className="text-[9px] text-white/30 leading-tight">{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Creator Showcase & Auto-cleanup note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-12 pt-8 border-t border-white/[0.08] text-center flex flex-col items-center gap-6"
        >
          <CreatorSignature />
          <p className="text-xs text-white/20">🔒 Rooms auto-cleanup when all listeners leave</p>
        </motion.div>
      </div>

      <AppDownloadModal open={showDownloadModal} onOpenChange={setShowDownloadModal} />
    </div>
  );
}
