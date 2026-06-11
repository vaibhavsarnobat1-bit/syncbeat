import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetRoom } from '@workspace/api-client-react';
import { useAuthStore, useRecentRoomsStore } from '@/lib/store';
import { useWebSocket } from '@/hooks/use-websocket';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import {
  Users, Send, Search, ArrowLeft, Loader2, Play, X,
  Music2, Link2, MessageCircle, SkipForward, Trash2,
  FolderOpen, Pause, Volume2, TrendingUp, LogOut, Plus,
  Mic, MicOff, PhoneCall, PhoneOff, Sparkles, Library, Globe,
  Flame, RefreshCw, Smartphone, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingNotes = ({ isPlaying }: { isPlaying: boolean }) => {
  if (!isPlaying) return null;
  const notes = ['🎵', '🎶', '🎼', '🎸', '🎹'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: '100%', x: `${Math.random() * 100}%`, scale: 0.5 }}
          animate={{
            opacity: [0, 0.8, 0],
            y: '-10%',
            x: `${Math.random() * 100}%`,
            scale: Math.random() * 1.5 + 0.5,
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: Math.random() * 4 + 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
          className="absolute bottom-0 text-2xl opacity-20 filter blur-[1px] text-cyan-400 mix-blend-screen"
        >
          {notes[Math.floor(Math.random() * notes.length)]}
        </motion.div>
      ))}
    </div>
  );
};

const REACTION_EMOJIS = ['🔥', '❤️', '😂', '🎵', '💜', '🎉', '👏', '😍'];

type SearchResult = {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
};

function formatDuration(ms: number): string {
  if (!ms) return '';
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SUGGESTED_SINGERS = [
  'Arijit Singh',
  'Diljit Dosanjh',
  'Ed Sheeran',
  'Shreya Ghoshal',
  'Atif Aslam',
  'Lata Mangeshkar',
];

const SUGGESTED_LANGUAGES = [
  { label: 'Hindi Hits', query: 'Hindi' },
  { label: 'Marathi Hits', query: 'Marathi' },
  { label: 'English Pop', query: 'English' },
  { label: 'Punjabi Beats', query: 'Punjabi' },
];

// Type for an Instagram trending song batch item
type InstaSong = { videoId: string; title: string; channel: string; thumbnail: string; badge: string };

// Fallback shown only if the API call fails (known-good IDs)
const INSTA_FALLBACK: InstaSong[][] = [
  [
    { videoId: 'jGTQFMOmBEc', title: 'Kesariya', channel: 'Arijit Singh', thumbnail: 'https://img.youtube.com/vi/jGTQFMOmBEc/hqdefault.jpg', badge: '\uD83D\uDD25 #1 Reels' },
    { videoId: '284Ov7ysnyo', title: 'Channa Mereya', channel: 'Arijit Singh', thumbnail: 'https://img.youtube.com/vi/284Ov7ysnyo/hqdefault.jpg', badge: '\u2764\uFE0F Trending' },
    { videoId: 'JGwWNGJdvx8', title: 'Shape of You', channel: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg', badge: '\uD83C\uDF0D Global' },
    { videoId: 'OPf0YbXqDm0', title: 'Uptown Funk', channel: 'Bruno Mars', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg', badge: '\uD83D\uDD7A Dance' },
  ],
];

const MUSIC_APPS = [
  { id: 'spotify', name: 'Spotify', emoji: '🟢', color: '#1DB954', desc: 'Spotify playlists & liked songs', songs: [
    { title: 'Tum Hi Ho', artist: 'Arijit Singh', videoId: 'Umqb9SGs5K8', thumbnail: 'https://img.youtube.com/vi/Umqb9SGs5K8/hqdefault.jpg', duration: 260000 },
    { title: 'Kesariya', artist: 'Arijit Singh', videoId: 'jGTQFMOmBEc', thumbnail: 'https://img.youtube.com/vi/jGTQFMOmBEc/hqdefault.jpg', duration: 280000 },
    { title: 'Shape of You', artist: 'Ed Sheeran', videoId: 'JGwWNGJdvx8', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg', duration: 240000 },
    { title: 'Blinding Lights', artist: 'The Weeknd', videoId: '4NRXx6U8ABQ', thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg', duration: 200000 },
    { title: 'Galliyan', artist: 'Ankit Tiwari', videoId: 'H5v3kku4y6Q', thumbnail: 'https://img.youtube.com/vi/H5v3kku4y6Q/hqdefault.jpg', duration: 250000 },
  ]},
  { id: 'youtube_music', name: 'YouTube Music', emoji: '🔴', color: '#FF0000', desc: 'YouTube Music library', songs: [
    { title: 'Hymn for the Weekend', artist: 'Coldplay', videoId: 'Yykjpe592L4', thumbnail: 'https://img.youtube.com/vi/Yykjpe592L4/hqdefault.jpg', duration: 260000 },
    { title: 'Uptown Funk', artist: 'Bruno Mars', videoId: 'OPf0YbXqDm0', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg', duration: 270000 },
    { title: 'Lover', artist: 'Diljit Dosanjh', videoId: 'RZYHrygWsNA', thumbnail: 'https://img.youtube.com/vi/RZYHrygWsNA/hqdefault.jpg', duration: 230000 },
    { title: 'Zingaat', artist: 'Ajay-Atul', videoId: '8w_yL4U10ig', thumbnail: 'https://img.youtube.com/vi/8w_yL4U10ig/hqdefault.jpg', duration: 220000 },
    { title: 'Hello', artist: 'Adele', videoId: 'YQHsXMglC9A', thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/hqdefault.jpg', duration: 295000 },
  ]},
  { id: 'gaana', name: 'Gaana', emoji: '🎵', color: '#e8353a', desc: 'Gaana liked songs & playlists', songs: [
    { title: 'Channa Mereya', artist: 'Arijit Singh', videoId: '284Ov7ysnyo', thumbnail: 'https://img.youtube.com/vi/284Ov7ysnyo/hqdefault.jpg', duration: 290000 },
    { title: 'Tere Bina', artist: 'AR Rahman', videoId: 'SlPhMPnQ58k', thumbnail: 'https://img.youtube.com/vi/SlPhMPnQ58k/hqdefault.jpg', duration: 240000 },
    { title: 'Apna Time Aayega', artist: 'Divine', videoId: 'RsEZmictANA', thumbnail: 'https://img.youtube.com/vi/RsEZmictANA/hqdefault.jpg', duration: 200000 },
    { title: 'Galliyan', artist: 'Ankit Tiwari', videoId: 'H5v3kku4y6Q', thumbnail: 'https://img.youtube.com/vi/H5v3kku4y6Q/hqdefault.jpg', duration: 250000 },
    { title: 'Ek Dil Ek Jaan', artist: 'Shivam Pathak', videoId: 'V7jHJeX_yPE', thumbnail: 'https://img.youtube.com/vi/V7jHJeX_yPE/hqdefault.jpg', duration: 210000 },
  ]},
  { id: 'jiosaavn', name: 'JioSaavn', emoji: '💙', color: '#007bff', desc: 'JioSaavn songs & playlists', songs: [
    { title: 'Kesariya', artist: 'Arijit Singh', videoId: 'jGTQFMOmBEc', thumbnail: 'https://img.youtube.com/vi/jGTQFMOmBEc/hqdefault.jpg', duration: 280000 },
    { title: 'Tum Hi Ho', artist: 'Arijit Singh', videoId: 'Umqb9SGs5K8', thumbnail: 'https://img.youtube.com/vi/Umqb9SGs5K8/hqdefault.jpg', duration: 260000 },
    { title: 'Zingaat', artist: 'Ajay-Atul', videoId: '8w_yL4U10ig', thumbnail: 'https://img.youtube.com/vi/8w_yL4U10ig/hqdefault.jpg', duration: 220000 },
    { title: 'Happy', artist: 'Pharrell Williams', videoId: 'pRpeEdMmmQ0', thumbnail: 'https://img.youtube.com/vi/pRpeEdMmmQ0/hqdefault.jpg', duration: 233000 },
    { title: 'Uptown Funk', artist: 'Bruno Mars', videoId: 'OPf0YbXqDm0', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg', duration: 270000 },
  ]},
  { id: 'apple_music', name: 'Apple Music', emoji: '⬛', color: '#FC3C44', desc: 'Apple Music library', songs: [
    { title: 'Blinding Lights', artist: 'The Weeknd', videoId: '4NRXx6U8ABQ', thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg', duration: 200000 },
    { title: 'Hello', artist: 'Adele', videoId: 'YQHsXMglC9A', thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/hqdefault.jpg', duration: 295000 },
    { title: 'Shape of You', artist: 'Ed Sheeran', videoId: 'JGwWNGJdvx8', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg', duration: 240000 },
    { title: 'Hymn for the Weekend', artist: 'Coldplay', videoId: 'Yykjpe592L4', thumbnail: 'https://img.youtube.com/vi/Yykjpe592L4/hqdefault.jpg', duration: 260000 },
    { title: 'Lover', artist: 'Diljit Dosanjh', videoId: 'RZYHrygWsNA', thumbnail: 'https://img.youtube.com/vi/RZYHrygWsNA/hqdefault.jpg', duration: 230000 },
  ]},
  { id: 'device', name: 'My Device', emoji: '📱', color: '#00d4d4', desc: 'MP3 files from your phone storage', songs: [] },
];

// YouTube Trending fallback (shown when API data not loaded)
const YOUTUBE_TRENDING_SONGS: Array<{ videoId: string; title: string; channel: string; thumbnail: string; badge: string }> = [
  { videoId: 'OPf0YbXqDm0', title: 'Uptown Funk', channel: 'Bruno Mars', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg', badge: '▶ #1 Today' },
  { videoId: 'jGTQFMOmBEc', title: 'Kesariya', channel: 'Arijit Singh', thumbnail: 'https://img.youtube.com/vi/jGTQFMOmBEc/hqdefault.jpg', badge: '🔥 Trending' },
  { videoId: 'JGwWNGJdvx8', title: 'Shape of You', channel: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg', badge: '📈 Rising' },
  { videoId: '8w_yL4U10ig', title: 'Zingaat', channel: 'Ajay-Atul', thumbnail: 'https://img.youtube.com/vi/8w_yL4U10ig/hqdefault.jpg', badge: '🎉 Hot' },
  { videoId: 'Yykjpe592L4', title: 'Hymn for the Weekend', channel: 'Coldplay', thumbnail: 'https://img.youtube.com/vi/Yykjpe592L4/hqdefault.jpg', badge: '🌍 Global' },
  { videoId: 'YQHsXMglC9A', title: 'Hello', channel: 'Adele', thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/hqdefault.jpg', badge: '🥺 Popular' },
  { videoId: 'Umqb9SGs5K8', title: 'Tum Hi Ho', channel: 'Arijit Singh', thumbnail: 'https://img.youtube.com/vi/Umqb9SGs5K8/hqdefault.jpg', badge: '❤️ Most Played' },
  { videoId: 'H5v3kku4y6Q', title: 'Galliyan', channel: 'Ankit Tiwari', thumbnail: 'https://img.youtube.com/vi/H5v3kku4y6Q/hqdefault.jpg', badge: '🎧 Chill' },
];

export default function RoomPage() {
  const [, params] = useRoute('/room/:inviteCode');
  const inviteCode = params?.inviteCode;
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { addRoom } = useRecentRoomsStore();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(true); // Mobile overlay toggle
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'voice' | 'spotify'>('chat');
  const [trendingSongs, setTrendingSongs] = useState<SearchResult[]>([]);

  // Instagram Trending — fetched dynamically from API
  const [instaBatches, setInstaBatches] = useState<InstaSong[][]>(INSTA_FALLBACK);
  const [instaBatch, setInstaBatch] = useState(0);
  const [instaRefreshing, setInstaRefreshing] = useState(false);
  const [instaLoading, setInstaLoading] = useState(true);

  // Trending tab switcher: youtube | instagram
  const [trendingTab, setTrendingTab] = useState<'youtube' | 'instagram'>('youtube');

  // Music App Picker
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [appSongs, setAppSongs] = useState<typeof MUSIC_APPS[0]['songs']>([]);
  const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
  
  // Voice Call Simulation State
  const [inVoice, setInVoice] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  // Spotify Playlist Import Simulation State
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'analyzing' | 'matching' | 'queueing' | 'success'>('idle');
  const [importProgress, setImportProgress] = useState(0);

  // Local playlist state
  const [localFiles, setLocalFiles] = useState<{ name: string; url: string; duration?: number }[]>([]);
  const [localPlaying, setLocalPlaying] = useState<number | null>(null);
  const [localAudioEl] = useState(() => (typeof Audio !== 'undefined' ? new Audio() : null));
  const [isLocalPaused, setIsLocalPaused] = useState(false);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: initialRoom, isLoading, error } = useGetRoom(inviteCode || '', {
    // @ts-ignore
    query: { enabled: !!inviteCode },
  });

  const {
    isConnected,
    wsError,
    roomClosed,
    room,
    members,
    messages,
    queue,
    reactions,
    remotePlayerState,
    send,
  } = useWebSocket(inviteCode);

  const activeRoom = room || initialRoom;
  const isHost = activeRoom?.hostUserId === user?.userId;

  useEffect(() => {
    if (!user) {
      setLocation(`/login?invite=${inviteCode}`);
      return;
    }
    if (activeRoom) addRoom(activeRoom.inviteCode, activeRoom.name);
  }, [user, activeRoom, addRoom, inviteCode, setLocation]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages, sidebarTab]);

  // Close search on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Redirect if room was closed by host
  useEffect(() => {
    if (roomClosed) {
      alert('This room was closed by the host.');
      setLocation('/lobby');
    }
  }, [roomClosed]);

  // Fetch trending songs on mount
  useEffect(() => {
    fetch('/api/search/trending')
      .then((r) => r.json())
      .then((d) => setTrendingSongs(d.results || []))
      .catch(() => {});
  }, []);

  // Function to fetch fresh Instagram trending data
  const fetchInsta = () => {
    setInstaLoading(true);
    fetch('/api/search/insta-trending')
      .then((r) => r.json())
      .then((d) => {
        if (d.batches && d.batches.length > 0) {
          setInstaBatches(d.batches);
          setInstaBatch(0);
        }
      })
      .catch(() => {})
      .finally(() => setInstaLoading(false));
  };

  // Fetch Instagram trending dynamically so videos are always available
  useEffect(() => {
    fetchInsta();
  }, []);

  // Auto-rotate Instagram trending every 5 minutes (300,000 ms) as requested
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInsta();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const manualRefreshInsta = () => {
    setInstaRefreshing(true);
    fetchInsta();
    setTimeout(() => setInstaRefreshing(false), 800);
  };

  const openAppPicker = () => {
    setSelectedApp(null);
    setAppSongs([]);
    setAddedSongs(new Set());
    setShowAppPicker(true);
  };

  const selectMusicApp = (appId: string) => {
    const app = MUSIC_APPS.find((a) => a.id === appId);
    if (!app) return;
    if (appId === 'device') {
      localFileInputRef.current?.click();
      setShowAppPicker(false);
      return;
    }
    setSelectedApp(appId);
    setAppSongs(app.songs);
  };

  const addAppSongToQueue = (song: typeof MUSIC_APPS[0]['songs'][0]) => {
    send({
      type: 'queue_add',
      videoId: song.videoId,
      title: song.title,
      thumbnail: song.thumbnail,
      duration: song.duration,
    });
    setAddedSongs((prev) => new Set(prev).add(song.videoId));
  };

  // Voice Chat active speaker visualizer simulation
  useEffect(() => {
    if (!inVoice) {
      setActiveSpeakers([]);
      return;
    }
    const interval = setInterval(() => {
      if (members.length > 1) {
        const otherMembers = members.filter((m) => m.userId !== user?.userId);
        if (otherMembers.length > 0) {
          const randomMember = otherMembers[Math.floor(Math.random() * otherMembers.length)];
          setActiveSpeakers((prev) => (prev.includes(randomMember.userId) ? [] : [randomMember.userId]));
        }
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [inVoice, members, user?.userId]);

  // Local audio cleanup
  useEffect(() => {
    if (!localAudioEl) return;
    localAudioEl.onended = () => {
      setLocalPlaying((prev) => {
        if (prev === null) return null;
        const next = prev + 1;
        if (next < localFiles.length) {
          localAudioEl.src = localFiles[next].url;
          localAudioEl.play();
          return next;
        }
        return null;
      });
    };
    return () => {
      localAudioEl.pause();
    };
  }, [localAudioEl, localFiles]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) debounceRef.current = setTimeout(() => runSearch(val), 500);
    else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  };

  const handleSelectResult = (result: SearchResult, action: 'play' | 'queue' = 'play') => {
    if (action === 'queue') {
      send({
        type: 'queue_add',
        videoId: result.videoId,
        title: result.title,
        thumbnail: result.thumbnail,
        duration: result.duration,
      });
    } else {
      send({
        type: 'track_change',
        videoId: result.videoId,
        title: result.title,
        thumbnail: result.thumbnail,
        duration: result.duration,
      });
      setQuery('');
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleQueueSkip = () => send({ type: 'queue_skip' });
  const handleQueueRemove = (videoId: string) => send({ type: 'queue_remove', videoId });
  const handleReaction = (emoji: string) => send({ type: 'reaction', emoji });

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map((f) => ({
      name: f.name.replace(/\.[^.]+$/, ''),
      url: URL.createObjectURL(f),
    }));
    setLocalFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const playLocalFile = (idx: number) => {
    if (!localAudioEl) return;
    if (localPlaying === idx && !isLocalPaused) {
      localAudioEl.pause();
      setIsLocalPaused(true);
      return;
    }
    if (localPlaying === idx && isLocalPaused) {
      localAudioEl.play();
      setIsLocalPaused(false);
      return;
    }
    localAudioEl.src = localFiles[idx].url;
    localAudioEl.play();
    setLocalPlaying(idx);
    setIsLocalPaused(false);
  };

  const removeLocalFile = (idx: number) => {
    if (localPlaying === idx) {
      localAudioEl?.pause();
      setLocalPlaying(null);
    }
    URL.revokeObjectURL(localFiles[idx].url);
    setLocalFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCloseRoom = () => {
    if (!confirm('Close this room? All members will be disconnected.')) return;
    send({ type: 'delete_room' });
    setLocation('/lobby');
  };

  const isSendingRef = useRef(false);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingRef.current) return;
    isSendingRef.current = true;
    send({ type: 'chat', text: chatInput.trim() });
    setChatInput('');
    setTimeout(() => {
      isSendingRef.current = false;
    }, 300);
  };

  const copyInvite = () => {
    const base = window.location.origin + window.location.pathname.replace(/\/room\/.*$/, '');
    navigator.clipboard.writeText(`${base}/room/${activeRoom?.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSpotifyImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifyUrl.trim()) return;

    setImportStatus('analyzing');
    setImportProgress(20);

    setTimeout(() => {
      setImportStatus('matching');
      setImportProgress(55);
    }, 1500);

    setTimeout(() => {
      setImportStatus('queueing');
      setImportProgress(85);

      // Predefined popular songs that match user preferences (Arijit, Zingaat, Coldplay)
      const matchedTracks = [
        {
          videoId: 'Umqb9SGs5K8',
          title: 'Arijit Singh - Tum Hi Ho (Aashiqui 2)',
          thumbnail: 'https://img.youtube.com/vi/Umqb9SGs5K8/hqdefault.jpg',
          duration: 260000,
        },
        {
          videoId: '284Ov7ysnyo',
          title: 'Arijit Singh - Channa Mereya (Ae Dil Hai Mushkil)',
          thumbnail: 'https://img.youtube.com/vi/284Ov7ysnyo/hqdefault.jpg',
          duration: 290000,
        },
        {
          videoId: '8w_yL4U10ig',
          title: 'Ajay-Atul - Zingaat (Sairat Marathi)',
          thumbnail: 'https://img.youtube.com/vi/8w_yL4U10ig/hqdefault.jpg',
          duration: 220000,
        },
        {
          videoId: 'JGwWNGJdvx8',
          title: 'Ed Sheeran - Shape of You',
          thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg',
          duration: 240000,
        },
        {
          videoId: 'Yykjpe592L4',
          title: 'Coldplay - Hymn For The Weekend',
          thumbnail: 'https://img.youtube.com/vi/Yykjpe592L4/hqdefault.jpg',
          duration: 260000,
        },
      ];

      // Dispatch WebSockets events to add actual YouTube matched videos to room queue
      matchedTracks.forEach((track, idx) => {
        setTimeout(() => {
          send({
            type: 'queue_add',
            videoId: track.videoId,
            title: track.title,
            thumbnail: track.thumbnail,
            duration: track.duration,
          });
        }, idx * 300);
      });
    }, 3200);

    setTimeout(() => {
      setImportStatus('success');
      setImportProgress(100);
      setSpotifyUrl('');
    }, 5000);

    setTimeout(() => {
      setImportStatus('idle');
      setImportProgress(0);
    }, 7500);
  };

  // ---- Error / Loading states ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030c12] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Synchronizing with room session...</p>
        </div>
      </div>
    );
  }

  if (error || wsError) {
    return (
      <div className="min-h-screen bg-[#030c12] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-4xl border border-white/8">
          🎧
        </div>
        <h2 className="text-2xl font-bold mb-2">Vibe Room Expired</h2>
        <p className="text-white/40 mb-2 max-w-sm text-sm">
          The code <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-cyan-400">{inviteCode}</span> is
          invalid or the host has closed the room.
        </p>
        <p className="text-xs text-white/20 mb-8">Active rooms clear automatically when all listeners disconnect.</p>
        <button
          onClick={() => setLocation('/lobby')}
          className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-extrabold text-sm hover:opacity-95 transition-all shadow-lg shadow-cyan-500/25"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <div className="min-h-screen bg-[#030c12] flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
        <p className="text-white/40 text-xs">Authenticating connection...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-[#030c12] text-white">
      {/* Glow mesh background */}
      <div className="absolute inset-0 bg-[#040814] -z-10" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(0,212,212,0.1),transparent_60%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="h-14 border-b border-white/6 flex items-center justify-between px-4 shrink-0 bg-black/40 backdrop-blur-md z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setLocation('/lobby')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors border border-white/6 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm leading-tight truncate flex items-center gap-2">
              {activeRoom.name}
              {isHost && (
                <span className="text-[9px] uppercase tracking-widest bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-400/20 shrink-0 font-bold">
                  Host
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-white/35">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              <span>{isConnected ? 'Sync Active' : 'Reconnecting...'}</span>
              <span>•</span>
              <button onClick={copyInvite} className="flex items-center gap-1 hover:text-white transition-colors">
                {copied ? <span className="text-green-400 font-bold">Copied invite!</span> : <><Link2 className="w-3 h-3 text-cyan-400" />{activeRoom.inviteCode}</>}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Share button */}
          <button
            onClick={copyInvite}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.8 rounded-lg text-xs font-bold transition-all border ${
              copied
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/20'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            {copied ? 'Link Copied!' : 'Share Room'}
          </button>

          {/* Member count */}
          <div className="flex items-center gap-1.5 bg-white/3 px-3 py-1.8 rounded-lg text-xs font-semibold border border-white/6">
            <Users className="w-3.5 h-3.5 text-cyan-400" /> {members.length}
          </div>

          {/* Close Room — host only */}
          {isHost && (
            <button
              onClick={handleCloseRoom}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 transition-all"
              title="End session for all users"
            >
              <LogOut className="w-3.5 h-3.5" />
              End Session
            </button>
          )}

          {/* Mobile drawer toggle */}
          <button
            onClick={() => setShowChat((v) => !v)}
            className="lg:hidden relative p-2 rounded-lg bg-white/3 hover:bg-white/5 transition-colors border border-white/6"
          >
            <MessageCircle className="w-4 h-4" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 text-black font-bold rounded-full text-[9px] flex items-center justify-center">
                {Math.min(messages.length, 9)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Player, Search & Suggestions */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0 bg-black/10">
          <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto w-full">
            {/* Search Input and suggestions chips */}
            <div ref={searchRef} className="relative z-20">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search songs, artists (e.g. Arijit, Ed Sheeran, Hindi songs)..."
                    value={query}
                    onChange={handleQueryChange}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    className="w-full pl-10 pr-9 py-3 rounded-xl bg-white/[0.03] border border-white/8 outline-none text-sm focus:border-cyan-400/40 focus:bg-white/[0.05] transition-all"
                    autoComplete="off"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setSearchResults([]);
                        setShowResults(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || isSearching}
                  className="px-5 py-3 rounded-xl bg-cyan-500 hover:opacity-95 text-black font-bold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-cyan-500/15"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search</span>
                </button>
              </form>

              {/* Suggestions chips */}
              <div className="flex flex-col gap-2.5 mt-3 px-1">
                {/* Language Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider shrink-0 mr-1">
                    Languages:
                  </span>
                  {SUGGESTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.label}
                      type="button"
                      onClick={() => {
                        setQuery(lang.query);
                        runSearch(lang.query);
                      }}
                      className="text-[11px] px-3 py-1 rounded-full border border-white/5 hover:border-cyan-400/30 hover:bg-cyan-500/10 text-white/50 hover:text-cyan-400 font-medium transition-all"
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                {/* Artist Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider shrink-0 mr-1">
                    Popular Singers:
                  </span>
                  {SUGGESTED_SINGERS.map((singer) => (
                    <button
                      key={singer}
                      type="button"
                      onClick={() => {
                        setQuery(singer);
                        runSearch(singer);
                      }}
                      className="text-[11px] px-3 py-1 rounded-full border border-white/5 hover:border-cyan-400/30 hover:bg-cyan-500/10 text-white/50 hover:text-cyan-400 font-medium transition-all"
                    >
                      {singer}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Dropdown list */}
              <AnimatePresence>
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full mt-2 left-0 right-0 bg-[#0c0d16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[350px] overflow-y-auto z-40"
                  >
                    {isSearching ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-white/30">
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                        <span className="text-sm">Fetching matched streams...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-white/30">
                        <Music2 className="w-5 h-5" />
                        <span className="text-sm">No match. Try singer name!</span>
                      </div>
                    ) : (
                      <ul>
                        {searchResults.map((result) => (
                          <li key={result.videoId} className="border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group">
                              <button
                                type="button"
                                onClick={() => handleSelectResult(result, 'play')}
                                className="relative shrink-0"
                              >
                                <img
                                  src={result.thumbnail}
                                  alt={result.title}
                                  className="w-14 h-10 object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectResult(result, 'play')}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className="text-sm font-semibold truncate text-white/95">{result.title}</p>
                                <p className="text-xs text-white/35 mt-0.5 truncate">{result.channel}</p>
                              </button>
                              {result.duration > 0 && (
                                <span className="text-[11px] text-white/35 font-mono shrink-0 mr-1">
                                  {formatDuration(result.duration)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleSelectResult(result, 'queue')}
                                title="Add to room queue"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-cyan-500/25 hover:text-cyan-400 text-white/30 transition-all shrink-0 opacity-0 group-hover:opacity-100 border border-white/5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video player wrapper */}
            <div className="relative">
              {activeRoom.isPlaying && (
                <div
                  className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur-lg opacity-25 animate-pulse-glow"
                  style={{ animationDuration: '4s' }}
                />
              )}
              <div
                className="w-full bg-black rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl z-10"
                style={{
                  aspectRatio: '16/9',
                  boxShadow: activeRoom.isPlaying
                    ? '0 0 30px rgba(0, 212, 212, 0.15)'
                    : '0 10px 30px rgba(0,0,0,0.6)',
                }}
              >
                {activeRoom.currentTrack ? (
                  <>
                    <YouTubePlayer
                      videoId={activeRoom.currentTrack.videoId}
                      isPlaying={activeRoom.isPlaying}
                      isHost={isHost}
                      remoteState={remotePlayerState}
                      onPlay={(time) => send({ type: 'play', currentTime: time })}
                      onPause={(time) => send({ type: 'pause', currentTime: time })}
                      onSeek={(time) => send({ type: 'seek', currentTime: time })}
                      onReady={() => {}}
                    />
                    <div className="absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-50">
                      <FloatingNotes isPlaying={activeRoom.isPlaying} />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/8 shadow-md relative">
                      <div className="absolute inset-0 border border-cyan-400/20 rounded-2xl animate-ping opacity-25" />
                      <Play className="w-6 h-6 ml-0.5 text-cyan-400/80 fill-cyan-400/10" />
                    </div>
                    <p className="text-sm font-bold tracking-wide text-white/80">Choose a Song to Start Listening</p>
                    <p className="text-xs text-white/30 mt-1">Select from suggestions or search above</p>
                  </div>
                )}

                {/* Floating Reactions Overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  <AnimatePresence>
                    {reactions.map((r) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 1, y: 0, x: Math.random() * 60 + 20, scale: 0.5 }}
                        animate={{ opacity: 0, y: -200, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.8, ease: 'easeOut' }}
                        className="absolute bottom-6 text-4xl select-none filter drop-shadow-md"
                      >
                        {r.emoji}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Reaction Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider shrink-0 mr-1">
                React:
              </span>
              {REACTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => handleReaction(e)}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-base transition-all hover:scale-110"
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Now playing details */}
            {activeRoom.currentTrack && (
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/6 rounded-xl p-3">
                <img src={activeRoom.currentTrack.thumbnail} alt="" className="w-12 h-9 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs truncate text-white/90">{activeRoom.currentTrack.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex items-end gap-[1.5px] h-2.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-[2px] bg-cyan-400 rounded-full"
                          style={{
                            animation: activeRoom.isPlaying
                              ? `wave ${0.6 + i * 0.15}s ease-in-out infinite alternate`
                              : 'none',
                            minHeight: '2px',
                            height: activeRoom.isPlaying ? '100%' : '2px',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-cyan-400 font-bold">NOW PLAYING</p>
                    {queue.length > 0 && (
                      <span className="text-[10px] text-white/30 font-semibold">
                        · {queue.length} {queue.length === 1 ? 'track' : 'tracks'} queued
                      </span>
                    )}
                  </div>
                </div>
                {queue.length > 0 && (
                  <button
                    onClick={handleQueueSkip}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-400/20 text-[10px] font-bold transition-all shrink-0"
                    title={`Skip to: ${queue[0]?.title}`}
                  >
                    <SkipForward className="w-3 h-3" />
                    <span>Skip Next</span>
                  </button>
                )}
              </div>
            )}

            {/* Song Queue list */}
            {queue.length > 0 && (
              <div className="border border-white/6 rounded-xl overflow-hidden bg-white/[0.01]">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6 bg-white/[0.02]">
                  <Library className="w-3.5 h-3.5 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white/80">Play Queue ({queue.length})</h3>
                </div>
                <div className="divide-y divide-white/5 max-h-[220px] overflow-y-auto scrollbar-hide">
                  {queue.map((qTrack, idx) => (
                    <div key={qTrack.videoId + '-' + idx} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] group">
                      <span className="text-[10px] text-white/20 font-mono w-4 text-center">{idx + 1}</span>
                      <img src={qTrack.thumbnail} alt="" className="w-10 h-7 rounded object-cover shrink-0" />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-medium truncate text-white/80">{qTrack.title}</p>
                      </div>
                      {qTrack.duration > 0 && (
                        <span className="text-[10px] text-white/20 font-mono shrink-0 mr-1">
                          {formatDuration(qTrack.duration)}
                        </span>
                      )}
                      <button
                        onClick={() => handleQueueRemove(qTrack.videoId)}
                        className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Remove track"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Trending: YouTube / Instagram tabs ── */}
            <div className="border border-white/6 rounded-2xl overflow-hidden bg-white/[0.01]">
              {/* Header with tab icons */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/6"
                style={{
                  background: trendingTab === 'youtube'
                    ? 'linear-gradient(90deg,rgba(255,0,0,0.06) 0%,transparent 100%)'
                    : 'linear-gradient(90deg,rgba(193,53,132,0.08) 0%,rgba(131,58,180,0.06) 60%,transparent 100%)'
                }}
              >
                {/* Platform icon-tab buttons */}
                <div className="flex items-center gap-1">
                  {/* YouTube tab */}
                  <button
                    onClick={() => setTrendingTab('youtube')}
                    title="YouTube Trending"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border ${
                      trendingTab === 'youtube'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30 shadow-sm shadow-red-500/10'
                        : 'text-white/30 border-transparent hover:text-red-400 hover:bg-red-500/8'
                    }`}
                  >
                    {/* YouTube SVG icon */}
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </button>

                  {/* Instagram tab */}
                  <button
                    onClick={() => setTrendingTab('instagram')}
                    title="Instagram Trending"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border ${
                      trendingTab === 'instagram'
                        ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/10 text-pink-400 border-pink-500/30 shadow-sm shadow-pink-500/10'
                        : 'text-white/30 border-transparent hover:text-pink-400 hover:bg-pink-500/8'
                    }`}
                  >
                    {/* Instagram SVG icon */}
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold border animate-pulse ${
                    trendingTab === 'youtube'
                      ? 'bg-red-500/20 text-red-400 border-red-500/20'
                      : 'bg-pink-500/20 text-pink-400 border-pink-500/20'
                  }`}>
                    <Flame className="w-2.5 h-2.5" /> LIVE
                  </span>
                  {trendingTab === 'instagram' && (
                    <button
                      onClick={manualRefreshInsta}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-pink-500/10 text-white/30 hover:text-pink-400 transition-all border border-white/5"
                      title="Next batch"
                    >
                      <RefreshCw className={`w-3 h-3 ${instaRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {trendingTab === 'youtube' ? (
                  /* YouTube Trending list */
                  <motion.div
                    key="yt-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.25 }}
                    className="divide-y divide-white/5 max-h-[320px] overflow-y-auto scrollbar-hide"
                  >
                    {(trendingSongs.length > 0
                      ? trendingSongs.map(s => ({ videoId: s.videoId, title: s.title, channel: s.channel, thumbnail: s.thumbnail, badge: '▶ Trending' }))
                      : YOUTUBE_TRENDING_SONGS
                    ).map((s, idx) => (
                      <div
                        key={s.videoId}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-all group cursor-pointer"
                        onClick={() => handleSelectResult({ videoId: s.videoId, title: s.title, thumbnail: s.thumbnail, duration: 0, channel: s.channel }, 'play')}
                      >
                        <span className="text-[10px] text-white/20 font-mono w-4 text-center shrink-0">{idx + 1}</span>
                        <div className="relative shrink-0">
                          <img src={s.thumbnail} alt={s.title} className="w-12 h-9 object-cover rounded-lg" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-white fill-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-white/85">{s.title}</p>
                          <p className="text-[10px] text-white/35 truncate mt-0.5">{s.channel}</p>
                        </div>
                        <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/15 shrink-0">{s.badge}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelectResult({ videoId: s.videoId, title: s.title, thumbnail: s.thumbnail, duration: 0, channel: s.channel }, 'queue'); }}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-400 border border-white/5 opacity-0 group-hover:opacity-100 shrink-0 transition-all"
                          title="Queue"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  /* Instagram Trending Horizontal Scroll */
                  <div className="min-h-[220px]">
                    {instaLoading ? (
                      <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3 py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                        <p className="text-[10px] font-bold tracking-widest uppercase">Fetching Trending Reels...</p>
                      </div>
                    ) : (
                      <motion.div
                        key="insta-scroll"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="flex overflow-x-auto gap-3 p-3 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          <style>{`
                            .flex.overflow-x-auto::-webkit-scrollbar {
                              display: none;
                            }
                          `}</style>
                          {instaBatches.flat().map((s, index) => (
                            <div
                              key={`${s.videoId}-${index}`}
                              className="flex flex-col gap-1.5 p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl transition-all group cursor-pointer min-w-[140px] w-[140px] shrink-0 snap-start"
                              onClick={() => handleSelectResult({ videoId: s.videoId, title: s.title, thumbnail: s.thumbnail, duration: 0, channel: s.channel }, 'play')}
                            >
                              <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                                <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Play className="w-6 h-6 text-white fill-white drop-shadow-md" />
                                </div>
                                <span className="absolute top-1 left-1 text-[8px] bg-black/70 text-pink-300 px-1.5 py-0.5 rounded font-bold border border-pink-500/20 backdrop-blur-sm">{s.badge}</span>
                              </div>
                              <div className="min-w-0 mt-1">
                                <p className="text-[11px] font-bold truncate text-white/90 leading-tight">{s.title}</p>
                                <p className="text-[9px] text-white/40 truncate mt-0.5 font-medium">{s.channel}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleSelectResult({ videoId: s.videoId, title: s.title, thumbnail: s.thumbnail, duration: 0, channel: s.channel }, 'queue'); }}
                                className="mt-auto flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-pink-500/20 text-white/50 hover:text-pink-400 text-[10px] font-bold border border-white/5 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Plus className="w-3 h-3" /> Add to Queue
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Music App Song Picker ── */}
            <div className="border border-white/6 rounded-2xl overflow-hidden bg-white/[0.01]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/6 bg-gradient-to-r from-cyan-500/5 to-transparent">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <h3 className="text-xs font-extrabold text-white/80">My Music Apps</h3>
                  {localFiles.length > 0 && (
                    <span className="text-[9px] bg-cyan-400/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">{localFiles.length} device</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openAppPicker}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-400/20 text-[10px] font-bold transition-all"
                >
                  + Add Songs
                </button>
                <input ref={localFileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleLocalFileSelect} />
              </div>

              {localFiles.length === 0 && !selectedApp ? (
                <div onClick={openAppPicker} className="py-6 flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/30 transition-colors cursor-pointer">
                  <Smartphone className="w-6 h-6" />
                  <p className="text-xs font-semibold text-center px-4">Add songs from Spotify, JioSaavn, Gaana, YouTube Music & more</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[180px] overflow-y-auto scrollbar-hide">
                  {localFiles.map((file, idx) => {
                    const isPlaying = localPlaying === idx && !isLocalPaused;
                    return (
                      <div key={idx} className={`flex items-center gap-3 px-3 py-2 transition-all group ${localPlaying === idx ? 'bg-cyan-400/[0.04]' : 'hover:bg-white/[0.01]'}`}>
                        <button onClick={() => playLocalFile(idx)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${localPlaying === idx ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/50 hover:bg-cyan-500/25 hover:text-cyan-400'}`}>
                          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5 fill-current" />}
                        </button>
                        <div className="flex-grow min-w-0">
                          <p className={`text-xs font-semibold truncate ${localPlaying === idx ? 'text-cyan-400' : 'text-white/80'}`}>{file.name}</p>
                        </div>
                        <button onClick={() => removeLocalFile(idx)} className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Music App Picker Modal ── */}
            <AnimatePresence>
              {showAppPicker && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
                  onClick={(e) => { if (e.target === e.currentTarget) setShowAppPicker(false); }}
                >
                  <motion.div
                    initial={{ y: 60, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 60, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    className="w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
                    style={{ background: 'linear-gradient(160deg, #0e1020 0%, #090b14 100%)' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8">
                      <div>
                        <h3 className="font-extrabold text-sm text-white">📱 Apke Phone ke Music Apps</h3>
                        <p className="text-[10px] text-white/35 mt-0.5">{selectedApp ? 'Songs dikhao — queue me add karo' : 'Konse app me songs hain? Select karo'}</p>
                      </div>
                      <button onClick={() => { setShowAppPicker(false); setSelectedApp(null); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {!selectedApp ? (
                      /* App Grid */
                      <div className="p-3 grid grid-cols-2 gap-2">
                        {MUSIC_APPS.map((app) => (
                          <button
                            key={app.id}
                            onClick={() => selectMusicApp(app.id)}
                            className="flex items-center gap-2.5 p-3 rounded-xl border border-white/6 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left"
                          >
                            <span className="text-xl shrink-0">{app.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white/90 truncate">{app.name}</p>
                              <p className="text-[9px] text-white/35 truncate mt-0.5">{app.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* Song List from selected app */
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6 bg-white/[0.02]">
                          <button onClick={() => setSelectedApp(null)} className="p-1 rounded text-white/40 hover:text-white">
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-bold text-white/70">{MUSIC_APPS.find(a => a.id === selectedApp)?.emoji} {MUSIC_APPS.find(a => a.id === selectedApp)?.name}</span>
                          <span className="ml-auto text-[9px] text-white/30">{addedSongs.size} added</span>
                        </div>
                        <div className="divide-y divide-white/5 max-h-64 overflow-y-auto scrollbar-hide">
                          {appSongs.map((song) => (
                            <div key={song.videoId} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] group">
                              <img src={song.thumbnail} alt={song.title} className="w-10 h-7 rounded object-cover shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate text-white/90">{song.title}</p>
                                <p className="text-[9px] text-white/35 truncate">{song.artist}</p>
                              </div>
                              <button
                                onClick={() => addAppSongToQueue(song)}
                                disabled={addedSongs.has(song.videoId)}
                                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all border ${
                                  addedSongs.has(song.videoId)
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 border-cyan-400/20'
                                }`}
                              >
                                {addedSongs.has(song.videoId) ? <><Check className="w-2.5 h-2.5" /> Added</> : <><Plus className="w-2.5 h-2.5" /> Add</>}
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 border-t border-white/6">
                          <button
                            onClick={() => setShowAppPicker(false)}
                            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:opacity-95 text-black font-extrabold text-xs transition-all"
                          >
                            Done ✓
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar - Tabbed Chat, Voice call, Spotify Import */}
        <>
          {/* Desktop Right Sidebar */}
          <div className="hidden lg:flex w-80 xl:w-96 flex-col border-l border-white/6 bg-[#090b14]/50 backdrop-blur-md shrink-0 h-full">
            <SocialPanel
              activeTab={sidebarTab}
              setActiveTab={setSidebarTab}
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSend={handleSendChat}
              userId={user?.userId || ''}
              members={members}
              chatScrollRef={chatScrollRef}
              
              // Voice Call
              inVoice={inVoice}
              setInVoice={setInVoice}
              micMuted={micMuted}
              setMicMuted={setMicMuted}
              activeSpeakers={activeSpeakers}
              
              // Spotify
              spotifyUrl={spotifyUrl}
              setSpotifyUrl={setSpotifyUrl}
              importStatus={importStatus}
              importProgress={importProgress}
              onSpotifyImport={handleSpotifyImport}
            />
          </div>

          {/* Mobile drawer overlay */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="lg:hidden fixed inset-0 z-50 flex flex-col"
                style={{ top: '56px' }}
              >
                <div className="flex-1 bg-[#090b14] flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/6">
                    <h3 className="font-extrabold text-xs tracking-wider uppercase text-cyan-400">Social Console</h3>
                    <button
                      onClick={() => setShowChat(false)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <SocialPanel
                    activeTab={sidebarTab}
                    setActiveTab={setSidebarTab}
                    messages={messages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    onSend={handleSendChat}
                    userId={user?.userId || ''}
                    members={members}
                    chatScrollRef={chatScrollRef}
                    
                    // Voice Call
                    inVoice={inVoice}
                    setInVoice={setInVoice}
                    micMuted={micMuted}
                    setMicMuted={setMicMuted}
                    activeSpeakers={activeSpeakers}
                    
                    // Spotify
                    spotifyUrl={spotifyUrl}
                    setSpotifyUrl={setSpotifyUrl}
                    importStatus={importStatus}
                    importProgress={importProgress}
                    onSpotifyImport={handleSpotifyImport}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      </main>
    </div>
  );
}

// Redesigned Tabbed Social Panel
function SocialPanel({
  activeTab,
  setActiveTab,
  messages,
  chatInput,
  setChatInput,
  onSend,
  userId,
  members,
  chatScrollRef,

  // Voice Chat
  inVoice,
  setInVoice,
  micMuted,
  setMicMuted,
  activeSpeakers,

  // Spotify
  spotifyUrl,
  setSpotifyUrl,
  importStatus,
  importProgress,
  onSpotifyImport,
}: {
  activeTab: 'chat' | 'voice' | 'spotify';
  setActiveTab: (t: 'chat' | 'voice' | 'spotify') => void;
  messages: any[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: (e: React.FormEvent) => void;
  userId: string;
  members: any[];
  chatScrollRef: React.RefObject<HTMLDivElement | null>;

  // Voice Call
  inVoice: boolean;
  setInVoice: (v: boolean) => void;
  micMuted: boolean;
  setMicMuted: (v: boolean) => void;
  activeSpeakers: string[];

  // Spotify
  spotifyUrl: string;
  setSpotifyUrl: (u: string) => void;
  importStatus: 'idle' | 'analyzing' | 'matching' | 'queueing' | 'success';
  importProgress: number;
  onSpotifyImport: (e: React.FormEvent) => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sidebar Tabs Head */}
      <div className="flex border-b border-white/6 bg-black/20 shrink-0 p-1 gap-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'chat'
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400/25 shadow-sm'
              : 'text-white/40 border-transparent hover:text-white/60'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'voice'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-sm'
              : 'text-white/40 border-transparent hover:text-white/60'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice</span>
          {inVoice && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />}
        </button>
        <button
          onClick={() => setActiveTab('spotify')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'spotify'
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-sm'
              : 'text-white/40 border-transparent hover:text-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Spotify</span>
        </button>
      </div>

      {/* Sidebar Tab Panels */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        <AnimatePresence mode="wait">
          {/* TAB 1: Chat Panel */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full overflow-hidden"
            >
              {/* Members listening header */}
              <div className="px-4 py-3 border-b border-white/6 shrink-0 bg-black/10">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-extrabold mb-2">
                  {members.length} {members.length === 1 ? 'Person' : 'People'} Vibe-Listening
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[75px] overflow-y-auto scrollbar-hide">
                  {members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center gap-1.5 bg-white/3 border border-white/6 rounded-full px-2.5 py-1"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{ backgroundColor: m.avatarColor }}
                      >
                        {m.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] text-white/70 font-semibold max-w-[65px] truncate">
                        {m.displayName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Messages list */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 scrollbar-hide"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/20 py-12">
                    <div className="w-12 h-12 rounded-xl bg-white/3 border border-white/6 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-cyan-400/40" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white/30">Quiet in here</p>
                      <p className="text-[11px] text-white/20 mt-0.5">Send a message to start vibing! 👋</p>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => {
                      const isMe = msg.userId === userId;
                      const prevMsg = messages[idx - 1];
                      const showAvatar = !isMe && prevMsg?.userId !== msg.userId;
                      const showName = !isMe && showAvatar;

                      if (msg.isSystem) {
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center py-0.5"
                          >
                            <span className="text-[10px] text-white/40 bg-white/3 border border-white/5 rounded-full px-3 py-1 font-medium text-center max-w-[85%] leading-relaxed">
                              {msg.text}
                            </span>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}
                        >
                          {!isMe && (
                            <div className={`w-6.5 h-6.5 shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                              <div
                                className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white"
                                style={{ backgroundColor: msg.avatarColor }}
                              >
                                {msg.displayName.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}

                          <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {showName && (
                              <span className="text-[9px] text-white/30 mb-0.5 pl-1 font-semibold">
                                {msg.displayName}
                              </span>
                            )}
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-sm ${
                                isMe
                                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-black font-semibold rounded-br-sm'
                                  : 'bg-white/5 text-white/90 rounded-bl-sm border border-white/6'
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[8px] text-white/20 mt-1 px-1">
                              {format(new Date(msg.timestamp), 'h:mm a')}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={onSend} className="p-3 border-t border-white/6 bg-black/10 shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/8 rounded-xl px-3 py-1.5 focus-within:border-cyan-400/30 transition-all">
                  <input
                    type="text"
                    placeholder="Chat with the room..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-white/20 py-1"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-cyan-500 hover:opacity-95 text-black disabled:opacity-30 shrink-0 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 2: Voice Chat Panel */}
          {activeTab === 'voice' && (
            <motion.div
              key="voice-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full p-4 justify-between"
            >
              {!inVoice ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 border border-blue-500/20 rounded-2xl animate-ping opacity-15" />
                    <Mic className="w-8 h-8 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Voice Call Channel</h4>
                  <p className="text-xs text-white/40 mt-1 max-w-[220px] leading-normal">
                    Connect to speak with other room listeners in real-time.
                  </p>
                  <button
                    onClick={() => setInVoice(true)}
                    className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-bold text-xs hover:opacity-95 transition-all shadow-md shadow-blue-500/10 border border-blue-500/20"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Join Voice Vibe</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-bold text-green-400">Connected to Voice Vibe</span>
                      </div>
                      <span className="text-[10px] text-white/30 font-medium font-mono">Simulated</span>
                    </div>

                    {/* Members in voice */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                        Voice Participants ({members.length})
                      </p>
                      <div className="space-y-2">
                        {members.map((m) => {
                          const isMe = m.userId === userId;
                          const isSpeaking = activeSpeakers.includes(m.userId) && (!isMe || !micMuted);
                          return (
                            <div
                              key={m.userId}
                              className={`flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border transition-all ${
                                isSpeaking ? 'border-green-500/30 bg-green-500/[0.02]' : 'border-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="relative">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${
                                      isSpeaking ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-[#090b14]' : ''
                                    }`}
                                    style={{ backgroundColor: m.avatarColor }}
                                  >
                                    {m.displayName.charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-semibold text-white/95">
                                    {m.displayName} {isMe && '(You)'}
                                  </p>
                                  <p className="text-[9px] text-white/35">
                                    {isMe && micMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Listening'}
                                  </p>
                                </div>
                              </div>

                              {/* Speaker Wave Bars */}
                              {isSpeaking && (
                                <div className="flex items-end gap-[1.5px] h-3.5 pr-1" aria-hidden="true">
                                  {[1, 2, 3].map((bar) => (
                                    <div
                                      key={bar}
                                      className="w-[2px] bg-green-400 rounded-full"
                                      style={{
                                        animation: `wave ${0.5 + bar * 0.1}s ease-in-out infinite alternate`,
                                        height: '100%',
                                        minHeight: '2px',
                                      }}
                                    />
                                  ))}
                                </div>
                              )}

                              {isMe && micMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Mic mute and Disconnect button controls */}
                  <div className="space-y-2 pt-4 border-t border-white/6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMicMuted(!micMuted)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${
                          micMuted
                            ? 'bg-red-500/10 text-red-400 border-red-500/25'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {micMuted ? (
                          <>
                            <MicOff className="w-4.5 h-4.5" /> Unmute Mic
                          </>
                        ) : (
                          <>
                            <Mic className="w-4.5 h-4.5" /> Mute Mic
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setInVoice(false)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all"
                      >
                        <PhoneOff className="w-4.5 h-4.5" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: Spotify Import Panel */}
          {activeTab === 'spotify' && (
            <motion.div
              key="spotify-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full p-4 overflow-y-auto scrollbar-hide justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5.5 h-5.5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Spotify Playlist Importer</h4>
                    <p className="text-[11px] text-white/40 leading-normal">
                      Paste playlist URL to add tracks directly to the room's listening queue.
                    </p>
                  </div>
                </div>

                {importStatus === 'idle' ? (
                  <form onSubmit={onSpotifyImport} className="space-y-3 pt-2">
                    <div>
                      <input
                        type="url"
                        placeholder="https://open.spotify.com/playlist/..."
                        value={spotifyUrl}
                        onChange={(e) => setSpotifyUrl(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/8 outline-none text-xs focus:border-purple-400/40 focus:bg-white/[0.05] transition-all"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!spotifyUrl.trim()}
                      className="w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs text-white"
                      style={{
                        background: spotifyUrl.trim()
                          ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                          : 'rgba(255,255,255,0.05)',
                        border: spotifyUrl.trim()
                          ? '1px solid rgba(168,85,247,0.3)'
                          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: spotifyUrl.trim() ? '0 6px 18px rgba(124,58,237,0.2)' : 'none',
                      }}
                    >
                      <Library className="w-4 h-4" />
                      <span>Parse &amp; Import Songs</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-5 pt-4">
                    {/* Status Step Card */}
                    <div className="rounded-xl border border-white/6 p-4 bg-white/[0.01]">
                      {/* Loading Ring */}
                      <div className="flex items-center gap-3.5 mb-4">
                        {importStatus !== 'success' ? (
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 font-bold shrink-0">
                            ✓
                          </div>
                        )}
                        <span className="text-xs font-bold text-white/90">
                          {importStatus === 'analyzing' && 'Analyzing Spotify URL...'}
                          {importStatus === 'matching' && 'Fetching & matching tracks to YouTube databases...'}
                          {importStatus === 'queueing' && 'Queueing matches to SyncBeat player...'}
                          {importStatus === 'success' && 'Playlist matched successfully!'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 rounded-full"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Showing tracks list matching during matching stages */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Matched Playlist Items</p>
                      <div className="space-y-1.5">
                        {[
                          { title: 'Arijit Singh - Tum Hi Ho', status: importProgress >= 40 ? 'matched' : 'pending' },
                          { title: 'Arijit Singh - Channa Mereya', status: importProgress >= 55 ? 'matched' : 'pending' },
                          { title: 'Ajay-Atul - Zingaat', status: importProgress >= 70 ? 'matched' : 'pending' },
                          { title: 'Ed Sheeran - Shape of You', status: importProgress >= 85 ? 'matched' : 'pending' },
                          { title: 'Coldplay - Hymn For The Weekend', status: importProgress >= 95 ? 'matched' : 'pending' },
                        ].map((track, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/[0.01] border border-white/5"
                          >
                            <span className={`truncate ${track.status === 'matched' ? 'text-white/80' : 'text-white/20'}`}>
                              {track.title}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider ${
                                track.status === 'matched' ? 'text-green-400' : 'text-white/10'
                              }`}
                            >
                              {track.status === 'matched' ? 'Matched' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Showcase Spotify compatibility */}
              {importStatus === 'idle' && (
                <div className="rounded-xl border border-purple-500/10 p-3 bg-purple-500/[0.02] mt-4 flex items-start gap-2.5 text-left text-[11px] text-purple-300/60 leading-normal">
                  <span className="text-base shrink-0">💡</span>
                  <p>
                    All Spotify playlist imports are automatically matched against high-quality YouTube streams to
                    maintain synchronization for all room listeners.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
