import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Radio, Trash2,
  RefreshCw, LogOut, Shield, Music2, TrendingUp, Activity,
  ChevronRight, Search, AlertTriangle, Server,
  Globe, Wifi, Clock, Zap, Eye, EyeOff,
  BarChart2, ArrowUp, ArrowDown, MessageSquare, Download,
  ChevronDown, Play, Pause, Crown, Gauge
} from 'lucide-react';
import { format } from 'date-fns';
import { BrandMark } from '@/components/BrandMark';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const ADMIN_SECRET = 'Vaibhav@2004';

function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api/admin${path}`, {
    ...opts,
    headers: { 'x-admin-secret': ADMIN_SECRET, 'Content-Type': 'application/json', ...opts?.headers },
  });
}

type Track = { videoId: string; title: string; thumbnail?: string; duration?: number };
type Stats = { totalRooms: number; activeRooms: number; totalUsers: number; totalMessages: number };
type Room = {
  id: string; name: string; inviteCode: string; memberCount: number; messageCount: number;
  isPlaying: boolean; currentTrack: Track | null; createdAt: number; members: User[];
  hostUserId?: string; queue?: Track[]; history?: Track[];
};
type User = { userId: string; displayName: string; avatarColor: string; joinedAt: number };
type Msg = {
  id: string; userId: string; displayName: string; avatarColor?: string; text: string;
  timestamp: number; isSystem?: boolean; roomName: string; inviteCode: string;
};
type ActivityEvent = { id: string; type: 'room_created' | 'room_deleted' | 'user_joined' | 'user_left' | 'track_played'; message: string; timestamp: number };

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rooms', label: 'Rooms', icon: Radio },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'messages', label: 'Live Messages', icon: MessageSquare },
  { id: 'server', label: 'Server Info', icon: Server },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

// Generate fake activity log from rooms/users data
function buildActivity(rooms: Room[], users: User[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  rooms.forEach(r => {
    events.push({ id: `rc-${r.inviteCode}`, type: 'room_created', message: `Room "${r.name}" was created`, timestamp: r.createdAt });
    if (r.isPlaying && r.currentTrack) {
      events.push({ id: `tp-${r.inviteCode}`, type: 'track_played', message: `Now playing "${r.currentTrack.title?.slice(0, 40)}" in ${r.name}`, timestamp: Date.now() - Math.random() * 300000 });
    }
    r.members.forEach(m => {
      events.push({ id: `uj-${m.userId}`, type: 'user_joined', message: `${m.displayName} joined "${r.name}"`, timestamp: m.joinedAt });
    });
  });
  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 60);
}

const EVENT_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  room_created: { color: '#7c3aed', icon: Radio },
  room_deleted: { color: '#ef4444', icon: Trash2 },
  user_joined: { color: '#10b981', icon: Users },
  user_left: { color: '#f59e0b', icon: ArrowDown },
  track_played: { color: '#ec4899', icon: Music2 },
};

export default function Admin() {
  const [, setLocation] = useLocation();
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [msgRoom, setMsgRoom] = useState('all');
  const [showSystem, setShowSystem] = useState(true);
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [pings, setPings] = useState<number[]>([]);
  const [sessionStart] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    const t0 = performance.now();
    try {
      const [s, r, u, m] = await Promise.all([
        apiFetch('/stats').then(r => r.json()),
        apiFetch('/rooms').then(r => r.json()),
        apiFetch('/users').then(r => r.json()),
        apiFetch('/messages?limit=500').then(r => r.json()),
      ]);
      setStats(s);
      setRooms(r.rooms || []);
      setUsers(u.users || []);
      setMessages(m.messages || []);
      setPings(prev => [...prev, Math.round(performance.now() - t0)].slice(-24));
      setLastSync(Date.now());
    } catch {}
    setLoading(false);
  }, [isAuthed]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isAuthed || !autoRefresh) return;
    intervalRef.current = setInterval(loadAll, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAuthed, autoRefresh, loadAll]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_SECRET) setIsAuthed(true);
    else alert('Wrong password!');
  };

  const handleDeleteRoom = async (inviteCode: string) => {
    await apiFetch(`/rooms/${inviteCode}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    loadAll();
  };

  const filteredRooms = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.inviteCode.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMessages = messages.filter(m => {
    if (!showSystem && m.isSystem) return false;
    if (msgRoom !== 'all' && m.inviteCode !== msgRoom) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return m.text.toLowerCase().includes(q)
      || m.displayName.toLowerCase().includes(q)
      || m.roomName.toLowerCase().includes(q);
  });

  const activity = buildActivity(rooms, users);
  const avgPing = pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 0;
  const liveTracks = rooms.filter(r => r.isPlaying && r.currentTrack);
  const sessionStr = (() => {
    const secs = Math.max(0, Math.floor((Date.now() - sessionStart) / 1000));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
  })();

  const exportSnapshot = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), stats, rooms, users, messages }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncbeat-admin-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Login screen ──
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#06040f] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-[50%] h-[50%] bg-primary/15 blur-[150px] rounded-full" />
          <div className="absolute bottom-[10%] right-[5%] w-[45%] h-[45%] bg-accent/10 blur-[160px] rounded-full" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full relative z-10"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Admin Panel</h1>
            <p className="text-white/40 text-sm mt-1">SyncBeat · Authorized Access Only</p>
          </div>
          <form onSubmit={handleLogin} className="glass-panel rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs text-white/40 font-semibold uppercase tracking-wider block mb-2">Admin Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/25 outline-none focus:border-primary/50 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold hover:opacity-90 transition-all"
            >
              Access Admin Panel
            </button>
            <button type="button" onClick={() => setLocation('/')} className="w-full py-2 text-sm text-white/30 hover:text-white/60 transition-colors">
              ← Back to SyncBeat
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06040f] text-white flex">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-white/6 flex flex-col bg-black/30 backdrop-blur-xl">
        <div className="p-5 border-b border-white/6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#070d1c] ring-1 ring-white/10 flex items-center justify-center">
              <BrandMark size={30} title="SyncBeat logo" />
            </div>
            <div>
              <p className="font-black text-sm">SyncBeat</p>
              <p className="text-[10px] text-white/30 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(t => {
            const active = tab === t.id;
            const count = t.id === 'rooms' ? rooms.length
              : t.id === 'users' ? users.length
              : t.id === 'messages' ? messages.length
              : t.id === 'activity' ? activity.length
              : 0;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSearch(''); }}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all overflow-hidden border ${
                  active ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/5 border-transparent'
                }`}
                style={active ? {
                  borderColor: 'rgba(0,212,212,0.28)',
                  background: 'linear-gradient(100deg, rgba(124,58,237,0.28), rgba(0,212,212,0.13))',
                  boxShadow: '0 10px 26px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                } : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-300 to-violet-500" aria-hidden="true" />
                )}
                <t.icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-300' : ''}`} />
                {t.label}
                {count > 0 && (
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/10 text-white/40'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live sync + export */}
        <div className="px-3 pb-1 space-y-1">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all"
            style={{
              borderColor: autoRefresh ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.08)',
              background: autoRefresh ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
              color: autoRefresh ? '#6ee7b7' : 'rgba(255,255,255,0.35)',
            }}
            title="Toggle 30s auto-refresh"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-white/25'}`} />
            {autoRefresh ? 'Live · every 30s' : 'Live paused'}
            {lastSync && (
              <span className="ml-auto font-mono text-[10px] opacity-70">{format(new Date(lastSync), 'HH:mm:ss')}</span>
            )}
          </button>
          <button
            onClick={exportSnapshot}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/35 hover:text-white hover:bg-white/5 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export snapshot
            <span className="ml-auto font-mono text-[10px] opacity-60">JSON</span>
          </button>
        </div>

        <div className="p-3 border-t border-white/6 space-y-1">
          <button
            onClick={loadAll}
            disabled={loading}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
          <button
            onClick={() => setIsAuthed(false)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">

          {/* ── DASHBOARD ── */}
          {tab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key="dashboard">
              <div className="mb-8">
                <h1 className="text-2xl font-black">Dashboard</h1>
                <p className="text-white/40 text-sm mt-1">Live stats from your SyncBeat server</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Rooms', value: stats?.totalRooms ?? 0, icon: Radio, color: '#7c3aed', bg: 'from-violet-600/15 to-transparent', note: `${(stats?.totalRooms ?? 0) - (stats?.activeRooms ?? 0)} idle` },
                  { label: 'Active Rooms', value: stats?.activeRooms ?? 0, icon: Activity, color: '#10b981', bg: 'from-emerald-600/15 to-transparent', note: `${liveTracks.length} playing` },
                  { label: 'Online Users', value: stats?.totalUsers ?? 0, icon: Users, color: '#db2777', bg: 'from-pink-600/15 to-transparent', note: `${stats && stats.activeRooms ? (stats.totalUsers / stats.activeRooms).toFixed(1) : '0'} per room` },
                  { label: 'Messages Sent', value: stats?.totalMessages ?? 0, icon: TrendingUp, color: '#f59e0b', bg: 'from-amber-600/15 to-transparent', note: `${stats && stats.totalUsers ? Math.round(stats.totalMessages / stats.totalUsers) : 0} per user` },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`rounded-2xl p-5 border border-white/8 bg-gradient-to-br ${stat.bg} backdrop-blur-sm relative overflow-hidden`}
                  >
                    <div className="absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}25` }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                    <p className="text-3xl font-black mb-1">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-white/40 font-medium">{stat.label}</p>
                    <span className="text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full bg-white/5 text-white/30">{stat.note}</span>
                  </motion.div>
                ))}
              </div>

              {/* Real API health strip */}
              <div className="rounded-2xl border border-white/8 p-4 mb-6 grid grid-cols-3 gap-4 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/30">API round-trip</p>
                    <p className="font-bold text-sm">
                      {avgPing ? `${avgPing} ms` : '—'}
                      <span className="ml-2 inline-flex items-end gap-[2px] align-middle">
                        {pings.slice(-12).map((p, i) => (
                          <span
                            key={i}
                            className="w-[3px] rounded-sm bg-emerald-400/70"
                            style={{ height: `${Math.max(3, Math.min(16, p / 12))}px` }}
                          />
                        ))}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/30">Tracks live</p>
                    <p className="font-bold text-sm">{liveTracks.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/30">Panel session</p>
                    <p className="font-bold text-sm">{sessionStr}</p>
                  </div>
                </div>
              </div>

              {/* Live now-playing ticker */}
              {liveTracks.length > 0 && (
                <div className="rounded-2xl border border-white/8 overflow-hidden mb-6">
                  <div className="px-5 py-3 border-b border-white/6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <h2 className="font-bold text-sm">On Air Right Now</h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto p-4">
                    {liveTracks.map(room => (
                      <div
                        key={room.inviteCode}
                        className="flex items-center gap-3 pr-4 pl-1 py-1 rounded-xl bg-white/[0.03] border border-white/8 shrink-0"
                      >
                        <img src={room.currentTrack?.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        <div className="max-w-[190px]">
                          <p className="text-[11px] font-semibold truncate">{room.currentTrack?.title}</p>
                          <p className="text-[10px] text-white/30 truncate">{room.name} · {room.memberCount} listening</p>
                        </div>
                        <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent rooms */}
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
                  <h2 className="font-bold text-sm">Recent Rooms</h2>
                  <button onClick={() => setTab('rooms')} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {rooms.length === 0 ? (
                  <div className="py-10 text-center text-white/25 text-sm">No rooms created yet</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {rooms.slice(0, 5).map(room => (
                      <div key={room.inviteCode} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/3 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${room.memberCount > 0 ? 'bg-green-400' : 'bg-white/20'}`} />
                          <div>
                            <p className="text-sm font-semibold">{room.name}</p>
                            <p className="text-[11px] text-white/30">{room.memberCount} members · {room.messageCount} messages</p>
                          </div>
                        </div>
                        {room.isPlaying && (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Music2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium truncate max-w-[120px]">{room.currentTrack?.title?.slice(0,30)}...</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ROOMS ── */}
          {tab === 'rooms' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key="rooms">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black">Rooms</h1>
                  <p className="text-white/40 text-sm mt-1">{rooms.length} total rooms</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/40 w-48 transition-all placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-16 text-white/25 text-sm">No rooms found</div>
                ) : filteredRooms.map((room, i) => {
                  const isOpen = openRoom === room.inviteCode;
                  const queue = room.queue || [];
                  const history = room.history || [];
                  return (
                  <motion.div
                    key={room.inviteCode}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`rounded-2xl border p-4 transition-all bg-white/[0.02] ${isOpen ? 'border-cyan-400/25 bg-cyan-500/[0.03]' : 'border-white/8 hover:border-white/12'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button onClick={() => setOpenRoom(isOpen ? null : room.inviteCode)} className="flex-1 min-w-0 text-left cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${room.memberCount > 0 ? 'bg-green-400' : 'bg-white/15'}`} />
                          <h3 className="font-bold truncate">{room.name}</h3>
                          {room.isPlaying && (
                            <span className="text-[10px] bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold shrink-0 flex items-center gap-1">
                              <Play className="w-2.5 h-2.5" /> Playing
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-white/35">
                          <span>Code: <span className="font-mono text-white/50">{room.inviteCode}</span></span>
                          <span>{room.memberCount} members</span>
                          <span>{room.messageCount} messages</span>
                          <span>{queue.length} queued</span>
                          <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
                        </div>
                        {room.currentTrack && (
                          <div className="mt-2 flex items-center gap-2">
                            <img src={room.currentTrack.thumbnail} className="w-8 h-8 rounded object-cover" alt="" />
                            <p className="text-xs text-white/50 truncate max-w-[300px]">{room.currentTrack.title}</p>
                          </div>
                        )}
                        {room.members.length > 0 && (
                          <div className="mt-2 flex -space-x-1.5">
                            {room.members.slice(0, 8).map((m) => (
                              <div
                                key={m.userId}
                                title={m.displayName}
                                className="w-6 h-6 rounded-full border-2 border-[#06040f] flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ backgroundColor: m.avatarColor }}
                              >
                                {m.displayName.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setOpenRoom(isOpen ? null : room.inviteCode)}
                          className="p-2 rounded-xl text-white/25 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                          title={isOpen ? 'Hide room details' : 'Inspect room'}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-cyan-300' : ''}`} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(room.inviteCode)}
                          className="p-2 rounded-xl text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete room"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-white/6 grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Who is inside */}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2.5">
                                In the room ({room.members.length})
                              </p>
                              {room.members.length === 0 ? (
                                <p className="text-xs text-white/20">Nobody listening right now</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {room.members.map(m => (
                                    <div key={m.userId} className="flex items-center gap-2.5">
                                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: m.avatarColor }}>
                                        {m.displayName.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-xs truncate flex-1">{m.displayName}</span>
                                      {room.hostUserId === m.userId && (
                                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                                      )}
                                      <span className="text-[10px] text-white/25 font-mono shrink-0">
                                        {format(new Date(m.joinedAt), 'HH:mm')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Queue */}
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2.5">
                                Up next ({queue.length})
                              </p>
                              {queue.length === 0 ? (
                                <p className="text-xs text-white/20">Queue is empty</p>
                              ) : (
                                <div className="space-y-1.5 max-h-[168px] overflow-y-auto pr-1">
                                  {queue.map((t, qi) => (
                                    <div key={`${t.videoId}-${qi}`} className="flex items-center gap-2">
                                      <img src={t.thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                                      <span className="text-[11px] text-white/55 truncate">{t.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* History */}
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2.5">
                                Recently played ({history.length})
                              </p>
                              {history.length === 0 ? (
                                <p className="text-xs text-white/20">Nothing played yet</p>
                              ) : (
                                <div className="space-y-1.5 max-h-[168px] overflow-y-auto pr-1">
                                  {history.slice(0, 8).map((t, hi) => (
                                    <div key={`${t.videoId}-${hi}`} className="flex items-center gap-2">
                                      <Pause className="w-3 h-3 text-white/20 shrink-0" />
                                      <span className="text-[11px] text-white/40 truncate">{t.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );})}
              </div>
            </motion.div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key="users">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black">Active Users</h1>
                  <p className="text-white/40 text-sm mt-1">{users.length} users currently online</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/40 w-48 transition-all placeholder:text-white/20"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-white/25 text-sm">No users online right now</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredUsers.map((u, i) => (
                    <motion.div
                      key={u.userId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-4 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/12 transition-all"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{u.displayName}</p>
                        <p className="text-[10px] text-white/30 mt-0.5 font-mono truncate">{u.userId.slice(0, 12)}...</p>
                        <p className="text-[10px] text-white/20 mt-0.5">Joined {format(new Date(u.joinedAt), 'h:mm a')}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full shrink-0 animate-pulse" title="Online" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── LIVE MESSAGES ── */}
          {tab === 'messages' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key="messages">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h1 className="text-2xl font-black">Live Messages</h1>
                  <p className="text-white/40 text-sm mt-1">
                    {filteredMessages.length} of {messages.length} chat messages across all rooms
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSystem(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all"
                    style={{
                      borderColor: showSystem ? 'rgba(0,212,212,0.25)' : 'rgba(255,255,255,0.08)',
                      background: showSystem ? 'rgba(0,212,212,0.08)' : 'rgba(255,255,255,0.02)',
                      color: showSystem ? '#67e8f9' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <Radio className="w-3 h-3" /> System messages
                  </button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search chat..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/40 w-48 transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Room filter */}
              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={() => setMsgRoom('all')}
                  className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold transition-all ${
                    msgRoom === 'all'
                      ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-200'
                      : 'bg-white/[0.02] border-white/8 text-white/35 hover:text-white'
                  }`}
                >
                  All rooms
                </button>
                {rooms.filter(r => r.messageCount > 0).map(r => (
                  <button
                    key={r.inviteCode}
                    onClick={() => setMsgRoom(msgRoom === r.inviteCode ? 'all' : r.inviteCode)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold transition-all flex items-center gap-1.5 ${
                      msgRoom === r.inviteCode
                        ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-200'
                        : 'bg-white/[0.02] border-white/8 text-white/35 hover:text-white'
                    }`}
                  >
                    <span className="truncate max-w-[130px]">{r.name}</span>
                    <span className="opacity-60">{r.messageCount}</span>
                  </button>
                ))}
              </div>

              {filteredMessages.length === 0 ? (
                <div className="text-center py-20 text-white/25 text-sm">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  No messages match this filter
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 overflow-hidden divide-y divide-white/5">
                  {filteredMessages.slice(0, 250).map(m => (
                    <div key={m.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors">
                      {m.isSystem ? (
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Radio className="w-3.5 h-3.5 text-white/35" />
                        </div>
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: m.avatarColor || '#0891b2' }}
                        >
                          {m.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-white/80">{m.isSystem ? 'system' : m.displayName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/35 truncate max-w-[150px]">
                            {m.roomName}
                          </span>
                          <span className="text-[10px] text-white/20 font-mono">{format(new Date(m.timestamp), 'HH:mm:ss')}</span>
                        </div>
                        <p className={`text-sm mt-0.5 break-words ${m.isSystem ? 'text-white/30 italic' : 'text-white/65'}`}>{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── SERVER INFO ── */}
          {tab === 'server' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key="server">
              <div className="mb-8">
                <h1 className="text-2xl font-black">Server Info</h1>
                <p className="text-white/40 text-sm mt-1">Runtime details & health status</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Server Health */}
                <div className="rounded-2xl border border-white/8 p-5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <h2 className="font-bold text-sm">Health Status</h2>
                    <span className="ml-auto text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                      ● {avgPing ? `${avgPing} ms` : 'measuring…'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'API round-trip', value: avgPing, color: '#10b981', max: 300, unit: ' ms' },
                      { label: 'Room occupancy', value: stats && stats.totalRooms ? Math.round((stats.activeRooms / stats.totalRooms) * 100) : 0, color: '#7c3aed', max: 100, unit: '%' },
                      { label: 'Chat buffer used', value: messages.length, color: '#0ea5e9', max: 500, unit: ' msgs' },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-white/40">{m.label}</span>
                          <span className="font-mono font-bold" style={{ color: m.color }}>{m.value}{m.unit}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: m.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {pings.length > 1 && (
                    <div className="mt-5 pt-4 border-t border-white/6">
                      <p className="text-[10px] text-white/30 mb-2 flex items-center justify-between">
                        <span>Last {pings.length} sync calls</span>
                        <span className="font-mono">min {Math.min(...pings)} ms · max {Math.max(...pings)} ms</span>
                      </p>
                      <div className="flex items-end gap-1 h-10">
                        {pings.map((p, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500/40 to-emerald-400"
                            style={{ height: `${Math.max(8, Math.min(100, (p / 300) * 100))}%` }}
                            title={`${p} ms`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Runtime Info */}
                <div className="rounded-2xl border border-white/8 p-5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <h2 className="font-bold text-sm">Runtime Details</h2>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Environment', value: 'Node.js / Express', icon: Server },
                      { label: 'Panel session', value: sessionStr, icon: Clock },
                      { label: 'Last sync', value: lastSync ? format(new Date(lastSync), 'HH:mm:ss') : '—', icon: RefreshCw },
                      { label: 'Realtime', value: 'WebSocket · /api/ws', icon: Wifi },
                      { label: 'Transport', value: 'In-Memory Store', icon: BarChart2 },
                      { label: 'Admin', value: 'Vaibhav', icon: Shield },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 py-2 border-b border-white/4 last:border-0">
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <row.icon className="w-3.5 h-3.5 text-white/40" />
                        </div>
                        <span className="text-xs text-white/35 flex-1">{row.label}</span>
                        <span className="text-xs font-semibold text-white/70">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Endpoint list */}
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/6">
                  <h2 className="font-bold text-sm">API Endpoints</h2>
                  <p className="text-[11px] text-white/30 mt-0.5">All admin-protected routes</p>
                </div>
                <div className="divide-y divide-white/5">
                  {[
                    { method: 'GET', path: '/api/admin/stats', desc: 'Overall dashboard statistics' },
                    { method: 'GET', path: '/api/admin/rooms', desc: 'List all rooms with members' },
                    { method: 'DELETE', path: '/api/admin/rooms/:code', desc: 'Delete a room by invite code' },
                    { method: 'GET', path: '/api/admin/users', desc: 'List all active users' },
                    { method: 'GET', path: '/api/admin/messages', desc: 'Fetch messages (all/per-room)' },
                  ].map(ep => (
                    <div key={ep.path} className="px-5 py-3 flex items-center gap-4 hover:bg-white/2 transition-colors">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono shrink-0 ${
                        ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' :
                        ep.method === 'DELETE' ? 'bg-red-500/15 text-red-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>{ep.method}</span>
                      <code className="text-xs text-white/50 font-mono flex-1">{ep.path}</code>
                      <span className="text-[11px] text-white/25">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ACTIVITY LOG ── */}
          {tab === 'activity' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key="activity">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black">Activity Log</h1>
                  <p className="text-white/40 text-sm mt-1">{activity.length} recent events</p>
                </div>
                <button
                  onClick={loadAll}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 mb-5">
                {Object.entries(EVENT_STYLES).map(([type, s]) => (
                  <span key={type} className="text-[10px] px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5"
                    style={{ backgroundColor: `${s.color}15`, borderColor: `${s.color}30`, color: s.color }}>
                    <s.icon className="w-3 h-3" />
                    {type.replace('_', ' ')}
                  </span>
                ))}
              </div>

              {activity.length === 0 ? (
                <div className="text-center py-20 text-white/25 text-sm">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  No activity yet — waiting for users to join
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[18px] top-0 bottom-0 w-px bg-white/5" />
                  <div className="space-y-2 pl-10">
                    {activity.map((ev, i) => {
                      const s = EVENT_STYLES[ev.type] || { color: '#fff', icon: Activity };
                      return (
                        <motion.div
                          key={ev.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.4) }}
                          className="relative flex items-start gap-3 p-3.5 rounded-xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                        >
                          {/* Dot on timeline */}
                          <div
                            className="absolute -left-[28px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#06040f] flex items-center justify-center"
                            style={{ backgroundColor: `${s.color}30`, borderColor: s.color }}
                          >
                            <s.icon className="w-2 h-2" style={{ color: s.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 leading-snug">{ev.message}</p>
                            <p className="text-[10px] text-white/25 mt-1">{format(new Date(ev.timestamp), 'MMM d, yyyy · h:mm a')}</p>
                          </div>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 mt-0.5"
                            style={{ backgroundColor: `${s.color}20`, color: s.color }}
                          >
                            {ev.type.replace('_', ' ')}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </main>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="font-black text-lg text-center mb-1">Delete Room?</h3>
              <p className="text-sm text-white/40 text-center mb-6">All members will be disconnected and chat history will be lost.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={() => handleDeleteRoom(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold border border-red-500/20 transition-all">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
