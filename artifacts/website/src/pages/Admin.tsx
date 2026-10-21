import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Radio, Trash2,
  RefreshCw, LogOut, Shield, Music2, TrendingUp, Activity,
  ChevronRight, Search, AlertTriangle, Server,
  Globe, Wifi, Clock, Zap, UserX, UserCheck,
  BarChart2, ArrowUp, MessageSquare, Download,
  ChevronDown, Play, Pause, Crown, Gauge, HardDrive, KeyRound
} from 'lucide-react';
import { format } from 'date-fns';
import { BrandMark } from '@/components/BrandMark';
import { useAuthStore } from '@/lib/store';
import { logoutRequest } from '@/lib/authApi';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function apiFetch(path: string, opts: RequestInit = {}) {
  const token = useAuthStore.getState().user?.token;
  return fetch(`${BASE}/api/admin${path}`, {
    ...opts,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
}

type Track = { videoId: string; title: string; thumbnail?: string; duration?: number; source?: string };
type Stats = {
  users: number; newUsersToday: number; newUsersWeek: number; activeToday: number; banned: number;
  rooms: number; messages: number; onlineRooms: number; sharedSongs: number; db: boolean;
};
type Room = {
  id: string; name: string; inviteCode: string; memberCount: number; messageCount: number;
  isPlaying: boolean; currentTrack: Track | null; createdAt: number; members: Member[];
  hostUserId?: string; queue?: Track[]; history?: Track[];
};
type Member = { userId: string; displayName: string; avatarColor: string; joinedAt: number };
type AdminUser = {
  id: string; username: string; displayName: string; avatarColor: string; role: string;
  provider?: string | null; email?: string | null; createdAt: number; lastLoginAt: number | null;
  bannedAt: number | null; roomCount: number;
};
type Msg = {
  id: string; userId: string; displayName: string; avatarColor?: string; text: string;
  timestamp: number; isSystem?: boolean; roomName: string; inviteCode: string;
};
type ActivityEvent = { id: string; type: 'room_created' | 'user_joined' | 'user_left' | 'track_played' | 'user_registered' | 'user_login'; message: string; timestamp: number };

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rooms', label: 'Rooms', icon: Radio },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'messages', label: 'Live Messages', icon: MessageSquare },
  { id: 'server', label: 'Server Info', icon: Server },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

function buildActivity(rooms: Room[], users: AdminUser[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  users.forEach((u) => {
    events.push({ id: `reg-${u.id}`, type: 'user_registered', message: `${u.displayName} (@${u.username}) created an account`, timestamp: u.createdAt });
    if (u.lastLoginAt) {
      events.push({ id: `log-${u.id}`, type: 'user_login', message: `${u.displayName} signed in`, timestamp: u.lastLoginAt });
    }
  });
  rooms.forEach((r) => {
    events.push({ id: `rc-${r.inviteCode}`, type: 'room_created', message: `Room "${r.name}" was created`, timestamp: r.createdAt });
    if (r.isPlaying && r.currentTrack) {
      events.push({ id: `tp-${r.inviteCode}`, type: 'track_played', message: `Now playing "${r.currentTrack.title?.slice(0, 40)}" in ${r.name}`, timestamp: Date.now() - Math.random() * 300000 });
    }
    r.members.forEach((m) => {
      events.push({ id: `uj-${r.inviteCode}-${m.userId}`, type: 'user_joined', message: `${m.displayName} joined "${r.name}"`, timestamp: m.joinedAt });
    });
  });
  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 60);
}

const EVENT_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  room_created: { color: '#7c3aed', icon: Radio },
  room_deleted: { color: '#ef4444', icon: Trash2 },
  user_joined: { color: '#10b981', icon: Users },
  user_left: { color: '#f59e0b', icon: ArrowUp },
  track_played: { color: '#ec4899', icon: Music2 },
  user_registered: { color: '#06b6d4', icon: Shield },
  user_login: { color: '#84cc16', icon: KeyRound },
};

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [userScope, setUserScope] = useState<'all' | 'today' | 'banned'>('all');
  const [confirmAction, setConfirmAction] = useState<{ kind: 'room' | 'user'; id: string; label: string } | null>(null);
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
    if (!isAdmin) return;
    setLoading(true);
    const t0 = performance.now();
    try {
      const json = (res: Response) => (res.ok ? res.json() : null);
      const [s, r, u, m] = await Promise.all([
        apiFetch('/stats').then(json),
        apiFetch('/rooms').then(json),
        apiFetch('/users?limit=500').then(json),
        apiFetch('/messages?limit=500').then(json),
      ]);
      if (!s) {
        setDenied(true);
      } else {
        setDenied(false);
        setStats(s);
        setRooms(r?.rooms || []);
        setUsers(u?.users || []);
        setMessages(m?.messages || []);
        setPings(prev => [...prev, Math.round(performance.now() - t0)].slice(-24));
        setLastSync(Date.now());
      }
    } catch {}
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    intervalRef.current = setInterval(loadAll, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAdmin, autoRefresh, loadAll]);

  const runUserAction = async (id: string, action: 'ban' | 'unban') => {
    await apiFetch(`/users/${id}/${action}`, { method: 'POST' });
    loadAll();
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.kind === 'room') {
      await apiFetch(`/rooms/${encodeURIComponent(confirmAction.id)}`, { method: 'DELETE' });
    } else if (confirmAction.label === 'ban') {
      await apiFetch(`/users/${encodeURIComponent(confirmAction.id)}/ban`, { method: 'POST' });
    } else {
      await apiFetch(`/users/${encodeURIComponent(confirmAction.id)}`, { method: 'DELETE' });
    }
    setConfirmAction(null);
    loadAll();
  };

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const filteredRooms = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.inviteCode.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u => {
    if (userScope === 'banned' && !u.bannedAt) return false;
    if (userScope === 'today' && u.createdAt < startOfToday) return false;
    const q = search.trim().toLowerCase();
    return !q || u.displayName.toLowerCase().includes(q) || String(u.username || '').toLowerCase().includes(q);
  });
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
  const recentSignups = [...users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const onlineUserIds = new Set(rooms.flatMap(r => r.members.map(m => m.userId)));
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

  // ── Not authorized — admin comes in through the normal login page ──
  if (!isAdmin) {
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
            <h1 className="text-2xl font-black text-white">Admin Access Only</h1>
            <p className="text-white/40 text-sm mt-1">
              {denied
                ? 'Your session is no longer an admin session. Please sign in again.'
                : 'Sign in with the admin account to open this panel.'}
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <button
              onClick={() => setLocation('/login')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold hover:opacity-90 transition-all"
            >
              Go to Sign In
            </button>
            <button
              onClick={async () => { await logoutRequest(); setLocation('/login'); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white/60 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out of this account
            </button>
            <button onClick={() => setLocation('/')} className="w-full py-2 text-sm text-white/30 hover:text-white/60 transition-colors">
              ← Back to SyncBeat
            </button>
          </div>
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
            onClick={async () => { await logoutRequest(); setLocation('/login'); }}
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
                  { label: 'Registered Accounts', value: stats?.users ?? 0, icon: Users, color: '#db2777', bg: 'from-pink-600/15 to-transparent', note: `${stats?.newUsersWeek ?? 0} joined this week` },
                  { label: 'New Logins Today', value: stats?.activeToday ?? 0, icon: KeyRound, color: '#0ea5e9', bg: 'from-sky-600/15 to-transparent', note: `${stats?.newUsersToday ?? 0} new accounts today` },
                  { label: 'Rooms Created', value: stats?.rooms ?? 0, icon: Radio, color: '#7c3aed', bg: 'from-violet-600/15 to-transparent', note: `${stats?.onlineRooms ?? 0} live right now` },
                  { label: 'Messages Saved', value: stats?.messages ?? 0, icon: TrendingUp, color: '#f59e0b', bg: 'from-amber-600/15 to-transparent', note: `${stats && stats.users ? Math.round(stats.messages / stats.users) : 0} per account` },
                  { label: 'Shared Device Songs', value: stats?.sharedSongs ?? 0, icon: Music2, color: '#00d4d4', bg: 'from-cyan-600/15 to-transparent', note: 'Uploaded from phones' },
                  { label: 'Banned Accounts', value: stats?.banned ?? 0, icon: UserX, color: '#ef4444', bg: 'from-red-600/15 to-transparent', note: stats?.banned ? 'Action taken' : 'Nobody blocked' },
                  { label: 'Live Listening', value: liveTracks.length, icon: Activity, color: '#10b981', bg: 'from-emerald-600/15 to-transparent', note: 'Songs playing now' },
                  { label: 'Database', value: 0, icon: HardDrive, color: '#64748b', bg: 'from-slate-600/15 to-transparent', note: stats?.db ? 'PostgreSQL connected' : 'not connected' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl p-5 border border-white/8 bg-gradient-to-br ${stat.bg} backdrop-blur-sm relative overflow-hidden`}
                  >
                    <div className="absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}25` }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                    <p className="text-3xl font-black mb-1">{stat.icon === HardDrive ? (stats?.db ? 'ON' : 'OFF') : stat.value.toLocaleString()}</p>
                    <p className="text-xs text-white/40 font-medium">{stat.label}</p>
                    <span className="text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full bg-white/5 text-white/30">{stat.note}</span>
                  </motion.div>
                ))}
              </div>

              {/* Fresh registrations */}
              <div className="rounded-2xl border border-white/8 overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <h2 className="font-bold text-sm">Who Registered Recently</h2>
                  </div>
                  <button onClick={() => setTab('users')} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                    Manage Users <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {recentSignups.length === 0 ? (
                  <div className="py-8 text-center text-white/25 text-sm">No accounts registered yet</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {recentSignups.map(u => (
                      <div key={u.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ backgroundColor: u.avatarColor }}>
                          {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {u.displayName}
                            {u.role === 'admin' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 font-bold uppercase">admin</span>}
                          </p>
                          <p className="text-[11px] text-white/30 truncate">@{u.username}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-white/45">{format(new Date(u.createdAt), 'd MMM · h:mm a')}</p>
                          <p className="text-[10px] text-white/25">
                            {u.bannedAt ? 'Banned' : u.lastLoginAt ? `Last login ${format(new Date(u.lastLoginAt), 'd MMM, HH:mm')}` : 'Never signed in'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                        <img src={room.currentTrack?.thumbnail || '/brand-icon-192.png'} alt="" className="w-9 h-9 rounded-lg object-cover" />
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
                            <img src={room.currentTrack.thumbnail || '/brand-icon-192.png'} className="w-8 h-8 rounded object-cover" alt="" />
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
                          onClick={() => setConfirmAction({ kind: 'room', id: room.inviteCode, label: 'delete' })}
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
                                      <img src={t.thumbnail || '/brand-icon-192.png'} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
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
              <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                  <h1 className="text-2xl font-black">Registered Users</h1>
                  <p className="text-white/40 text-sm mt-1">
                    {users.length} accounts · {stats?.newUsersToday ?? 0} created today · {onlineUserIds.size} listening in a room
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search name or username..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/40 w-56 transition-all placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {([
                  { id: 'all', label: `All accounts (${users.length})` },
                  { id: 'today', label: `Registered today (${stats?.newUsersToday ?? 0})` },
                  { id: 'banned', label: `Banned (${stats?.banned ?? 0})` },
                ] as const).map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => setUserScope(chip.id)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold transition-all ${
                      userScope === chip.id
                        ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-200'
                        : 'bg-white/[0.02] border-white/8 text-white/35 hover:text-white'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-white/25 text-sm">No accounts match this view</div>
              ) : (
                <div className="rounded-2xl border border-white/8 overflow-hidden divide-y divide-white/5">
                  {filteredUsers.map((u, i) => {
                    const online = onlineUserIds.has(u.id);
                    const isSelf = u.id === user?.userId;
                    return (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="relative shrink-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shrink-0"
                            style={{ backgroundColor: u.avatarColor }}
                          >
                            {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                          </div>
                          {online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-[#06040f]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate flex items-center gap-2">
                            {u.displayName}
                            {u.role === 'admin' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 font-bold uppercase flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5" /> admin
                              </span>
                            )}
                            {isSelf && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/40 font-bold uppercase">you</span>}
                            {u.bannedAt && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/25 font-bold uppercase">banned</span>
                            )}
                          </p>
                          <p className="text-[11px] text-white/30 truncate">@{u.username} · {u.roomCount} {u.roomCount === 1 ? 'room' : 'rooms'} joined</p>
                        </div>

                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-[11px] text-white/45">Joined {format(new Date(u.createdAt), 'd MMM yyyy, h:mm a')}</p>
                          <p className="text-[10px] text-white/25">
                            {u.lastLoginAt ? `Last login ${format(new Date(u.lastLoginAt), 'd MMM, HH:mm')}` : 'Never signed in'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {u.role !== 'admin' && (u.bannedAt ? (
                            <button
                              onClick={() => runUserAction(u.id, 'unban')}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all"
                              title="Allow this account to sign in again"
                            >
                              <UserCheck className="w-3 h-3" /> Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmAction({ kind: 'user', id: u.id, label: 'ban' })}
                              disabled={isSelf}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-all disabled:opacity-30"
                              title="Block this account from signing in"
                            >
                              <UserX className="w-3 h-3" /> Ban
                            </button>
                          ))}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => setConfirmAction({ kind: 'user', id: u.id, label: 'delete' })}
                              className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete account permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
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
                      { label: 'Rooms live now', value: stats?.rooms ? Math.round(((stats.onlineRooms || 0) / stats.rooms) * 100) : 0, color: '#7c3aed', max: 100, unit: '%' },
                      { label: 'Messages loaded', value: messages.length, color: '#0ea5e9', max: 500, unit: ' msgs' },
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
                      { label: 'Signed in as', value: `@${user?.username || 'admin'}`, icon: Shield },
                      { label: 'Panel session', value: sessionStr, icon: Clock },
                      { label: 'Last sync', value: lastSync ? format(new Date(lastSync), 'HH:mm:ss') : '—', icon: RefreshCw },
                      { label: 'Realtime', value: 'WebSocket · /api/ws', icon: Wifi },
                      { label: 'Storage', value: stats?.db ? 'PostgreSQL · rooms, chat, songs' : 'In-memory only', icon: BarChart2 },
                      { label: 'Passwords', value: 'scrypt hashed · 30-day sessions', icon: KeyRound },
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
                    { method: 'GET', path: '/api/admin/stats', desc: 'Dashboard statistics from PostgreSQL' },
                    { method: 'GET', path: '/api/admin/users', desc: 'Every registered account, newest first' },
                    { method: 'POST', path: '/api/admin/users/:id/ban', desc: 'Block an account and kill its sessions' },
                    { method: 'POST', path: '/api/admin/users/:id/unban', desc: 'Let a banned account sign in again' },
                    { method: 'DELETE', path: '/api/admin/users/:id', desc: 'Permanently remove an account' },
                    { method: 'GET', path: '/api/admin/rooms', desc: 'List all rooms with members' },
                    { method: 'DELETE', path: '/api/admin/rooms/:code', desc: 'Delete a room, its chat and shared songs' },
                    { method: 'GET', path: '/api/admin/messages', desc: 'Search saved chat across all rooms' },
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
        {confirmAction && (
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
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mx-auto mb-4 ${
                confirmAction.label === 'ban' ? 'bg-amber-500/15 border-amber-500/20' : 'bg-red-500/15 border-red-500/20'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${confirmAction.label === 'ban' ? 'text-amber-400' : 'text-red-400'}`} />
              </div>
              <h3 className="font-black text-lg text-center mb-1">
                {confirmAction.kind === 'room'
                  ? 'Delete Room?'
                  : confirmAction.label === 'ban'
                    ? 'Ban This User?'
                    : 'Delete User Account?'}
              </h3>
              <p className="text-sm text-white/40 text-center mb-6">
                {confirmAction.kind === 'room'
                  ? 'All members will be disconnected and the room, its chat and shared songs are removed.'
                  : confirmAction.label === 'ban'
                    ? 'They will be signed out everywhere and cannot log in again until you unban them.'
                    : 'This removes the account, its sessions and its room history. It cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={handleConfirmAction} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  confirmAction.label === 'ban'
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20'
                }`}>
                  {confirmAction.kind === 'room' ? 'Delete Room' : confirmAction.label === 'ban' ? 'Ban User' : 'Delete User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
