import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Radio, MessageCircle, Trash2,
  RefreshCw, LogOut, Shield, Music2, TrendingUp, Activity,
  ChevronRight, Search, X, AlertTriangle, Headphones, MessagesSquare, Filter
} from 'lucide-react';
import { format } from 'date-fns';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const ADMIN_SECRET = 'syncbeat-admin-2026';

function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api/admin${path}`, {
    ...opts,
    headers: { 'x-admin-secret': ADMIN_SECRET, 'Content-Type': 'application/json', ...opts?.headers },
  });
}

type Stats = { totalRooms: number; activeRooms: number; totalUsers: number; totalMessages: number };
type Room = { id: string; name: string; inviteCode: string; memberCount: number; messageCount: number; isPlaying: boolean; currentTrack: any; createdAt: number; members: any[] };
type User = { userId: string; displayName: string; avatarColor: string; joinedAt: number };
type ChatMsg = { id: string; userId: string; displayName: string; avatarColor: string; text: string; timestamp: number; roomName: string; inviteCode: string };

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rooms', label: 'Rooms', icon: Radio },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'chat', label: 'All Chats', icon: MessagesSquare },
];

export default function Admin() {
  const [, setLocation] = useLocation();
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const [s, r, u, m] = await Promise.all([
        apiFetch('/stats').then(r => r.json()),
        apiFetch('/rooms').then(r => r.json()),
        apiFetch('/users').then(r => r.json()),
        apiFetch('/messages').then(r => r.json()),
      ]);
      setStats(s);
      setRooms(r.rooms || []);
      setUsers(u.users || []);
      setMessages(m.messages || []);
    } catch {}
    setLoading(false);
  }, [isAuthed]);

  useEffect(() => { loadAll(); }, [loadAll]);

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
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-primary/50 transition-all"
                autoFocus
              />
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-sm">SyncBeat</p>
              <p className="text-[10px] text-white/30 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-primary/20 text-primary border border-primary/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
              {t.id === 'rooms' && rooms.length > 0 && (
                <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{rooms.length}</span>
              )}
              {t.id === 'users' && users.length > 0 && (
                <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{users.length}</span>
              )}
              {t.id === 'chat' && messages.length > 0 && (
                <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{messages.length}</span>
              )}
            </button>
          ))}
        </nav>

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
                  { label: 'Total Rooms', value: stats?.totalRooms ?? 0, icon: Radio, color: '#7c3aed', bg: 'from-violet-600/15 to-transparent' },
                  { label: 'Active Rooms', value: stats?.activeRooms ?? 0, icon: Activity, color: '#10b981', bg: 'from-emerald-600/15 to-transparent' },
                  { label: 'Online Users', value: stats?.totalUsers ?? 0, icon: Users, color: '#db2777', bg: 'from-pink-600/15 to-transparent' },
                  { label: 'Messages Sent', value: stats?.totalMessages ?? 0, icon: MessageCircle, color: '#f59e0b', bg: 'from-amber-600/15 to-transparent' },
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
                  </motion.div>
                ))}
              </div>

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
                ) : filteredRooms.map((room, i) => (
                  <motion.div
                    key={room.inviteCode}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border border-white/8 p-4 hover:border-white/12 transition-all bg-white/[0.02]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${room.memberCount > 0 ? 'bg-green-400' : 'bg-white/15'}`} />
                          <h3 className="font-bold truncate">{room.name}</h3>
                          {room.isPlaying && (
                            <span className="text-[10px] bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold shrink-0">
                              ▶ Playing
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-white/35">
                          <span>Code: <span className="font-mono text-white/50">{room.inviteCode}</span></span>
                          <span>{room.memberCount} members</span>
                          <span>{room.messageCount} messages</span>
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
                            {room.members.slice(0, 8).map((m: any) => (
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
                      </div>

                      <button
                        onClick={() => setDeleteConfirm(room.inviteCode)}
                        className="p-2 rounded-xl text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        title="Delete room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
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
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full shrink-0" title="Online" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── ALL CHATS ── */}
          {tab === 'chat' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key="chat">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h1 className="text-2xl font-black">All Chats</h1>
                  <p className="text-white/40 text-sm mt-1">{messages.length} total messages across all rooms</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Room filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    <select
                      value={roomFilter}
                      onChange={e => setRoomFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/40 text-white/70 transition-all appearance-none cursor-pointer"
                    >
                      <option value="all" className="bg-[#1a1030]">All Rooms</option>
                      {rooms.map(r => (
                        <option key={r.inviteCode} value={r.inviteCode} className="bg-[#1a1030]">{r.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/40 w-44 transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Messages list */}
              {(() => {
                const filtered = messages
                  .filter(m => roomFilter === 'all' || m.inviteCode === roomFilter)
                  .filter(m =>
                    !search ||
                    m.text.toLowerCase().includes(search.toLowerCase()) ||
                    m.displayName.toLowerCase().includes(search.toLowerCase())
                  );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-20">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-3">
                        <MessagesSquare className="w-7 h-7 text-white/20" />
                      </div>
                      <p className="text-white/25 text-sm font-medium">No messages found</p>
                      <p className="text-white/15 text-xs mt-1">Try adjusting filters or wait for users to chat</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filtered.map((msg, i) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="flex items-start gap-3 p-4 rounded-2xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                      >
                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md"
                          style={{ backgroundColor: msg.avatarColor }}
                        >
                          {msg.displayName.charAt(0).toUpperCase()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{msg.displayName}</span>
                            <span className="text-[10px] bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium truncate max-w-[140px]">
                              {msg.roomName}
                            </span>
                            <span className="text-[11px] text-white/25 ml-auto shrink-0">
                              {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed break-words">{msg.text}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
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
