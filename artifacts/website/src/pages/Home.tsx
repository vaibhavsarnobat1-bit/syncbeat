import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, Users, Play, Pause, SkipBack, SkipForward, Shuffle,
  Heart, Music2, MessageSquare, Volume2, Sparkles, Radio,
  Share2, Disc3, CheckCircle2, ChevronRight, ArrowRight, ShieldCheck,
  Zap, Smartphone, Flame, Globe2, Compass, Layers, ListMusic, QrCode
} from 'lucide-react';
import { CreatorSignature } from '@/components/layout/CreatorSignature';
import { AppDownloadSection } from '@/components/AppDownloadSection';
import { AppDownloadModal } from '@/components/AppDownloadModal';
import { HeroMusicScene3D } from '@/components/3d/HeroMusicScene3D';

const HIGHLIGHT_FEATURES = [
  {
    icon: Users,
    iconColor: 'text-[#a855f7]',
    iconBg: 'bg-[#a855f7]/10 border-[#a855f7]/20',
    title: 'Create / Join Rooms',
    desc: 'Start a room or join your friends and pick a song.',
  },
  {
    icon: Music2,
    iconColor: 'text-[#38bdf8]',
    iconBg: 'bg-[#38bdf8]/10 border-[#38bdf8]/20',
    title: 'Play in Real Time',
    desc: 'Everyone hears the same song, at the same time.',
  },
  {
    icon: MessageSquare,
    iconColor: 'text-[#c084fc]',
    iconBg: 'bg-[#c084fc]/10 border-[#c084fc]/20',
    title: 'Connect with Friends',
    desc: 'Share the vibe, chat, and make it a moment.',
  },
  {
    icon: Heart,
    iconColor: 'text-[#38bdf8]',
    iconBg: 'bg-[#38bdf8]/10 border-[#38bdf8]/20',
    title: 'Music Brings Us Closer',
    desc: 'No distance, no limits — just good music.',
  },
];

const EXTENDED_FEATURES = [
  {
    icon: Radio,
    color: 'from-cyan-500 to-blue-500',
    title: 'Sub-second Audio Sync',
    desc: 'Cutting-edge WebSocket precision keeps every listener synced down to the exact millisecond.',
  },
  {
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    title: 'Universal YouTube Search',
    desc: 'Instant access to over 100M+ songs, live performances, mashups, and lofi streams.',
  },
  {
    icon: MessageSquare,
    color: 'from-emerald-400 to-teal-500',
    title: 'Live Chat & Reactions',
    desc: 'Drop floating emojis, cheer your favorite beat drops, and chat with synchronized vibes.',
  },
  {
    icon: ListMusic,
    color: 'from-amber-400 to-orange-500',
    title: 'Collaborative Queue',
    desc: 'Anyone in the room can add tracks, vote on upcoming songs, and DJ together smoothly.',
  },
  {
    icon: Smartphone,
    color: 'from-blue-500 to-indigo-500',
    title: 'Cross-Device Compatible',
    desc: 'Works seamlessly in any browser across iOS, Android, macOS, Windows, and Linux.',
  },
  {
    icon: ShieldCheck,
    color: 'from-rose-500 to-red-500',
    title: 'Private & Public Rooms',
    desc: 'Host private hangouts with password codes or open up public listening parties.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create or Join a Room',
    desc: 'Sign in with a click and create your custom room in seconds with no setup required.',
  },
  {
    step: '02',
    title: 'Invite Your Friends',
    desc: 'Share a clean one-click link or room code directly on WhatsApp, Discord, or Instagram.',
  },
  {
    step: '03',
    title: 'Pick Any Track',
    desc: 'Search any YouTube song or playlist and queue up everyone’s favorite tunes.',
  },
  {
    step: '04',
    title: 'Vibe in Synchrony',
    desc: 'Sit back, chat, send heart drops, and enjoy perfectly synced music together.',
  },
];

const VIBE_STATIONS = [
  {
    id: 'lofi',
    name: 'Midnight Lo-Fi & Study',
    emoji: '🌙',
    badge: 'Deep Focus',
    genre: 'Lo-Fi Chill & Beats',
    desc: 'Gentle vinyl crackles, rainy keys, and chill instrumental beats to study or unwind.',
    artists: 'Lofi Girl, ChilledCow, Synthwave Chill',
    gradient: 'from-violet-600/30 via-indigo-600/20 to-blue-600/10',
    border: 'border-violet-500/30 hover:border-violet-400',
    glowColor: '#8b5cf6',
    accentBadge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  {
    id: 'desi',
    name: 'Bollywood & Desi Bangers',
    emoji: '🔥',
    badge: 'Trending Now',
    genre: 'Bollywood & Punjabi Pop',
    desc: 'Chart-busting Hindi, Punjabi, and fusion anthems made for shared sing-alongs.',
    artists: 'Arijit Singh, Diljit Dosanjh, AP Dhillon, Pritam',
    gradient: 'from-amber-600/30 via-orange-600/20 to-red-600/10',
    border: 'border-amber-500/30 hover:border-amber-400',
    glowColor: '#f59e0b',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'edm',
    name: 'Cyberpunk & EDM Stage',
    emoji: '⚡',
    badge: 'High Energy',
    genre: 'Electronic & Synthwave',
    desc: 'Heavy bass drops, cyberpunk synthwave, and festival bangers with crisp audio sync.',
    artists: 'Kavinsky, Martin Garrix, Daft Punk, Skrillex',
    gradient: 'from-cyan-600/30 via-blue-600/20 to-indigo-600/10',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    glowColor: '#06b6d4',
    accentBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'acoustic',
    name: 'Acoustic Sunset & Indie',
    emoji: '🌅',
    badge: 'Calm & Soulful',
    genre: 'Indie Folk & Coffeehouse',
    desc: 'Warm acoustic guitars, soothing indie vocals, and sunset vibes with loved ones.',
    artists: 'Jack Johnson, Prateek Kuhad, Ed Sheeran, Anuv Jain',
    gradient: 'from-pink-600/30 via-rose-600/20 to-amber-600/10',
    border: 'border-pink-500/30 hover:border-pink-400',
    glowColor: '#ec4899',
    accentBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
];

export default function Home() {
  const [, setLocation] = useLocation();

  // Floating Player Interactive State with REAL Instrumental Chill Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(245);
  const [activeTab, setActiveTab] = useState<'home' | 'rooms' | 'features' | 'about' | 'download'>('home');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [quickReactionList, setQuickReactionList] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [quickRoomName, setQuickRoomName] = useState('');

  const triggerShowcaseReaction = (emoji: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const x = Math.random() * 80 + 10;
    setQuickReactionList((prev) => [...prev.slice(-8), { id, emoji, x }]);
    setTimeout(() => {
      setQuickReactionList((prev) => prev.filter((r) => r.id !== id));
    }, 1800);
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play prevented:', err);
      });
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTimeSec(Math.floor(audioRef.current.currentTime));
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      setDurationSec(Math.floor(audioRef.current.duration));
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTimeSec(0);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPercent = (currentTimeSec / durationSec) * 100;

  return (
    <div className="min-h-screen bg-[#05070e] text-white selection:bg-[#38bdf8]/30 selection:text-white font-sans overflow-x-hidden">
      
      {/* ─── GLOBAL BACKGROUND AMBIENCE ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#38bdf8]/10 blur-[180px] rounded-full mix-blend-screen" />
        <div className="absolute top-[20%] right-[-100px] w-[650px] h-[650px] bg-[#a855f7]/15 blur-[200px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-[#6366f1]/10 blur-[180px] rounded-full mix-blend-screen" />
      </div>

      {/* ─── HEADER / NAVIGATION ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#05070e]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <button
            onClick={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#06b6d4] via-[#0284c7] to-[#6366f1] shadow-lg shadow-[#06b6d4]/30 group-hover:scale-105 transition-transform duration-300">
              <img src="/logo.png" alt="SyncBeat Logo" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              SyncBeat
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative py-1 transition-colors ${
                activeTab === 'home' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Home
              {activeTab === 'home' && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-[#38bdf8] rounded-full shadow-[0_0_8px_#38bdf8]"
                />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('rooms');
                setLocation('/login');
              }}
              className={`relative py-1 transition-colors ${
                activeTab === 'rooms' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rooms
            </button>

            <a
              href="#features"
              onClick={() => setActiveTab('features')}
              className={`relative py-1 transition-colors ${
                activeTab === 'features' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Features
            </a>

            <a
              href="#download-app"
              onClick={() => setActiveTab('download')}
              className={`relative py-1 transition-colors flex items-center gap-1.5 ${
                activeTab === 'download' ? 'text-cyan-300 font-semibold' : 'text-cyan-400 hover:text-cyan-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Download App
            </a>

            <a
              href="#about"
              onClick={() => setActiveTab('about')}
              className={`relative py-1 transition-colors ${
                activeTab === 'about' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              About
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setShowDownloadModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all duration-200 cursor-pointer"
              title="Download & Install App with QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Install App</span>
            </button>
            <button
              onClick={() => setLocation('/login')}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Start Listening</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLocation('/login')}
              className="hidden sm:inline-flex px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 transition-all duration-200"
            >
              Login
            </button>
          </div>

        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <main className="relative pt-28 pb-16 lg:pt-32 lg:pb-24 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Centered Hero Section (matching reference screenshot) */}
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center pt-2 sm:pt-4 mb-10 sm:mb-14">
            
            {/* Animated Equalizer Sound Bars */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-end justify-center gap-1.5 h-10 sm:h-12 mb-5"
            >
              {[22, 38, 16, 42, 28, 48, 20, 52, 30, 44, 18, 40, 26, 36].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 sm:w-2 rounded-full bg-gradient-to-t from-[#06b6d4] via-[#38bdf8] to-[#818cf8]"
                  style={{
                    height: `${h}px`,
                    animation: `soundwave 1.1s ease-in-out infinite alternate`,
                    animationDelay: `${(i % 5) * 0.16}s`,
                  }}
                />
              ))}
            </motion.div>

            {/* Vibe Together Tagline Pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#38bdf8] text-xs sm:text-sm font-semibold mb-6 shadow-sm shadow-[#06b6d4]/10"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Vibe together in real-time</span>
            </motion.div>

            {/* Huge Bold Title — Perfectly Centered on Mobile & Laptop */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight leading-[1.06] mb-6 drop-shadow-sm text-center"
            >
              Music is better
              <br />
              <span className="text-shimmer drop-shadow-[0_10px_35px_rgba(56,189,248,0.4)]">
                together.
              </span>
            </motion.h1>

            {/* Subtitle Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-sm sm:text-lg lg:text-xl text-slate-300/80 font-normal leading-relaxed max-w-xl mx-auto mb-8 text-center px-4"
            >
              Create a room, share a link, and enjoy perfectly synced music with your friends — anywhere in the world.
            </motion.p>

            {/* Action Buttons — Centered & Full-Width on Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xl mx-auto px-4 mb-8"
            >
              <button
                onClick={() => setLocation('/login')}
                className="w-full sm:w-auto whitespace-nowrap group flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#06b6d4] via-[#0284c7] to-[#2563eb] hover:from-[#22d3ee] hover:to-[#3b82f6] text-white font-extrabold text-base sm:text-lg shadow-[0_0_35px_rgba(6,182,212,0.45)] hover:shadow-[0_0_55px_rgba(56,189,248,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <Headphones className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                <span>Start Listening</span>
                <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-white font-bold text-base backdrop-blur-md transition-all duration-200"
              >
                <span>How It Works</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Trust & Live Highlights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-300 font-semibold">100% Free & No Setup</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div>Works with YouTube & Local audio</div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div className="hidden sm:block">Unlimited Friends</div>
            </motion.div>

          </div>

          {/* 3D Music Animation Scene — Hero Showcase */}
          <div className="max-w-3xl w-full mx-auto relative flex items-center justify-center mt-2 sm:mt-6">

            {/* 3D Stage Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full rounded-3xl overflow-hidden border border-white/[0.12] shadow-2xl shadow-black/80 bg-[#050810]"
              style={{ aspectRatio: '16/10', minHeight: 320 }}
            >
              {/* Real Audio Element for Live Music Preview */}
              <audio
                ref={audioRef}
                src="/audio/chill-lofi-beats.mp3"
                preload="metadata"
                onTimeUpdate={handleAudioTimeUpdate}
                onLoadedMetadata={handleAudioLoadedMetadata}
                onEnded={handleAudioEnded}
              />

              {/* 3D Music Animation */}
              <HeroMusicScene3D
                isPlaying={isPlaying}
                onTogglePlay={togglePlayAudio}
                className="absolute inset-0"
              />

              {/* Floating Glassmorphic Music Player Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8 sm:bottom-6 bg-[#0b0e1b]/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/90 z-20"
              >
                {/* Track Info Header */}
                <div className="flex items-center gap-3.5 mb-3">
                  {/* Album Art */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0 border border-white/10">
                    <img
                      src="/images/lofi-cover.jpg"
                      alt="Lofi Chill Instrumental"
                      className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm sm:text-base truncate tracking-tight">
                      Lofi Chill Instrumental ☕
                    </h3>
                    <p className="text-cyan-400/90 text-xs truncate font-medium">
                      PeryCreep · Chillhop Music
                    </p>
                  </div>

                  {/* Live Sync Status */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {isPlaying ? 'Playing Now' : 'Click Vinyl ↑'}
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="space-y-1 mb-3">
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                      const newTime = Math.floor(percentage * durationSec);
                      setCurrentTimeSec(newTime);
                      if (audioRef.current) audioRef.current.currentTime = newTime;
                    }}
                    className="relative w-full h-1.5 bg-white/10 hover:h-2 rounded-full overflow-hidden cursor-pointer transition-all"
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#38bdf8] rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{formatTime(currentTimeSec)}</span>
                    <span>{formatTime(durationSec)}</span>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => setIsShuffled(!isShuffled)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isShuffled ? 'text-[#38bdf8] bg-[#38bdf8]/10' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Shuffle"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; setCurrentTimeSec(0); }}
                    className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-90"
                    title="Restart"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>

                  <button
                    onClick={togglePlayAudio}
                    className="w-11 h-11 rounded-full bg-white hover:bg-slate-100 text-black flex items-center justify-center shadow-lg shadow-white/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-black text-black" />
                    ) : (
                      <Play className="w-5 h-5 fill-black text-black translate-x-[1px]" />
                    )}
                  </button>

                  <button
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; setCurrentTimeSec(0); }}
                    className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-90"
                    title="Next"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>

                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isLiked ? 'text-rose-500 scale-110' : 'text-slate-400 hover:text-rose-400'
                    }`}
                    title="Favorite"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                  </button>
                </div>

                {/* Equalizer visualizer */}
                <div className="mt-3.5 pt-2 flex items-center justify-center gap-[3px] h-6 overflow-hidden">
                  {[14, 22, 35, 18, 28, 45, 30, 20, 38, 50, 42, 26, 48, 36, 22, 40, 30, 46, 25, 38, 50, 32, 20, 44, 28, 16, 35, 24, 18, 26, 15].map((height, idx) => (
                    <motion.div
                      key={idx}
                      className="w-[3px] rounded-full bg-gradient-to-t from-[#8b5cf6] via-[#6366f1] to-[#38bdf8]"
                      animate={{
                        height: isPlaying ? [`${height * 0.3}%`, `${height}%`, `${height * 0.4}%`] : '20%',
                        opacity: isPlaying ? [0.6, 1, 0.7] : 0.3,
                      }}
                      transition={{
                        duration: 0.8 + (idx % 5) * 0.15,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: (idx % 7) * 0.08,
                      }}
                    />
                  ))}
                </div>
              </motion.div>

            </motion.div>

          </div>

        </div>
      </main>

      {/* ─── 4-COLUMN HIGHLIGHT FEATURES BAR (EXACT AS SCREENSHOT) ─── */}
      <section className="relative z-10 border-t border-b border-white/[0.08] bg-[#05070e]/90 backdrop-blur-md py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-8">
            {HIGHLIGHT_FEATURES.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex flex-col items-start text-left group p-2 rounded-2xl hover:bg-white/[0.02] transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${item.iconBg} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <Icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-lg mb-1.5 tracking-tight group-hover:text-[#38bdf8] transition-colors">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
              Seamless & Instant
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4 tracking-tight">
              How SyncBeat Works
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              No tricky configurations or complex apps. Join or host a music room in 4 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {HOW_IT_WORKS.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative p-6 rounded-3xl bg-[#090d1d]/60 border border-white/[0.08] hover:border-[#38bdf8]/40 hover:bg-[#0c1228]/80 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6366f1] to-[#38bdf8] text-white font-black text-lg flex items-center justify-center mb-5 shadow-lg shadow-[#6366f1]/25 group-hover:scale-105 transition-transform">
                  {step.step}
                </div>
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-[#38bdf8] transition-colors">
                  {step.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setLocation('/lobby')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#05070e] font-bold text-sm hover:bg-slate-200 transition-all hover:scale-105 shadow-xl shadow-white/10"
            >
              <span>Explore Live Rooms</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ─── INTERACTIVE VIBE STATIONS & INSTANT SYNC ENGINE ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#05070e] via-[#070d1e] to-[#05070e] border-t border-b border-cyan-500/15 relative overflow-hidden">
        {/* Ambient background glow orb */}
        <div
          className="absolute w-[600px] h-[350px] -top-20 left-1/2 -translate-x-1/2 rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, #8b5cf6 50%, transparent 80%)' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Instant Vibe Stations</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Pick Your Mood & Listen Instantly
              </h2>
              <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
                Choose a sound atmosphere or launch your own room in seconds — zero sign-up required.
              </p>
            </div>

            <button
              onClick={() => setLocation('/lobby')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-sm font-semibold text-cyan-300 hover:text-white transition-all shrink-0 shadow-lg cursor-pointer"
            >
              <span>Explore All Rooms</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Interactive Vibe Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {VIBE_STATIONS.map((vibe, idx) => (
              <motion.div
                key={vibe.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                onClick={() => setLocation('/lobby')}
                className={`group cursor-pointer rounded-3xl p-5 bg-gradient-to-b ${vibe.gradient} border ${vibe.border} backdrop-blur-xl hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden`}
                style={{
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
              >
                {/* Subtle top glow highlight */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${vibe.glowColor}, transparent)` }}
                />

                <div>
                  {/* Top Bar with Emoji & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{vibe.emoji}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vibe.accentBadge}`}>
                      {vibe.badge}
                    </span>
                  </div>

                  {/* Title & Genre */}
                  <h3 className="text-white font-extrabold text-lg group-hover:text-cyan-200 transition-colors">
                    {vibe.name}
                  </h3>
                  <p className="text-cyan-400/80 text-xs font-semibold mt-0.5">
                    {vibe.genre}
                  </p>

                  {/* Description */}
                  <p className="text-slate-300/70 text-xs leading-relaxed mt-2.5 mb-4 line-clamp-2">
                    {vibe.desc}
                  </p>
                </div>

                <div>
                  {/* Top artists tag */}
                  <div className="text-[11px] text-white/40 mb-3 truncate flex items-center gap-1.5 font-mono">
                    <Headphones className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{vibe.artists}</span>
                  </div>

                  {/* Action link */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    <span>Start This Vibe</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Interactive Live Sync Showcase & Quick Launcher */}
          <div className="rounded-3xl p-6 sm:p-8 bg-[#090f20]/80 border border-cyan-500/20 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: Simulated Real-Time Multi-Device Sync */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                  </span>
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
                    Sub-Millisecond Engine Live Demo
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Synchronized to the Exact Beat Across Any Device
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  When the host plays, pauses, or seeks, every connected phone, tablet, and PC reacts instantaneously without lag or echo.
                </p>

                {/* Multi-Device Visualizer Mockup */}
                <div className="mt-5 p-4 rounded-2xl bg-black/40 border border-white/8 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    
                    {/* Device 1 */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Your Phone</p>
                        <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Synced · 8ms
                        </p>
                      </div>
                    </div>

                    {/* Equalizer Wave Connector */}
                    <div className="flex-1 min-w-[80px] max-w-[180px] flex items-center justify-center gap-1 h-6">
                      {[14, 22, 10, 26, 18, 24, 12, 20].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-blue-400"
                          style={{
                            height: `${h}px`,
                            animation: 'wave 0.8s ease-in-out infinite alternate',
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Device 2 */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Friend's Device</p>
                        <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Synced · 12ms
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Reaction trigger bar */}
                  <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/40 font-semibold">Test real-time reaction:</span>
                    <div className="flex items-center gap-1.5">
                      {['🔥', '💖', '🎧', '⚡', '🎉'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => triggerShowcaseReaction(emoji)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:scale-110 active:scale-95 border border-white/10 text-sm transition-all flex items-center justify-center cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Floating test reactions */}
                  {quickReactionList.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 1, y: 0, scale: 0.8 }}
                      animate={{ opacity: 0, y: -70, scale: 1.4 }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className="absolute bottom-10 text-2xl select-none pointer-events-none"
                      style={{ left: `${r.x}%` }}
                    >
                      {r.emoji}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right Column: 1-Click Quick Room Launcher */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-blue-950/20 to-purple-950/30 border border-cyan-400/25 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider font-mono">
                    Instant Room Launch
                  </span>
                  <h4 className="text-base font-extrabold text-white mt-1">
                    Ready to Listen Together?
                  </h4>
                  <p className="text-xs text-white/50 mt-1">
                    Create a room right now and share the link with anyone.
                  </p>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Room name (e.g. Chill Session)..."
                      value={quickRoomName}
                      onChange={(e) => setQuickRoomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setLocation('/lobby');
                      }}
                      className={`w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-black/50 border text-xs text-white placeholder:text-white/30 outline-none transition-all ${
                        quickRoomName.trim().length >= 2
                          ? 'border-emerald-400/80 focus:border-emerald-400'
                          : 'border-white/10 focus:border-cyan-400'
                      }`}
                    />
                    {quickRoomName.trim().length >= 2 && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setLocation('/lobby')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#040812] font-black text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Headphones className="w-4 h-4 fill-current" />
                    <span>Launch & Invite Friends</span>
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-white/8 grid grid-cols-2 gap-2 text-[10px] text-white/50">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>100% Free Forever</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>YouTube & MP3 Audio</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>No App Download</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Spatial Audio Ready</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─── ALL FEATURES SECTION ─── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
              Packed with Features
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-4 tracking-tight">
              Everything You Need for Shared Vibes
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Engineered with modern WebSockets, high-fidelity audio controls, and rich real-time interactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXTENDED_FEATURES.map((feat, index) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="p-6 rounded-3xl bg-[#090e20]/60 border border-white/[0.08] hover:border-white/20 hover:bg-[#0d142d]/80 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center mb-5 text-white shadow-lg group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-[#38bdf8] transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─── ABOUT & FINAL CALL TO ACTION ─── */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-5xl mx-auto">
          
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#12102f] via-[#0e1634] to-[#070b18] border border-white/15 p-8 sm:p-14 text-center shadow-2xl">
            
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#a855f7]/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#38bdf8]/20 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6366f1] to-[#38bdf8] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#6366f1]/30">
                <Headphones className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
                Ready to Listen Together?
              </h2>

              <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                Invite your friends, choose your songs, and start your synced music party now. Completely free forever.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setLocation('/login')}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#38bdf8] text-white font-bold text-base shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  Start Listening Now
                </button>

                <button
                  onClick={() => setLocation('/lobby')}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-base transition-all"
                >
                  Browse Public Rooms
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── APP DOWNLOAD & QR CODE SCAN SECTION ─── */}
      <AppDownloadSection />

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.08] bg-[#03050a] py-14 px-4 sm:px-6 lg:px-8 text-slate-500 text-sm relative overflow-hidden">
        {/* Subtle ambient light from bottom */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-28 opacity-25 blur-3xl pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, #8b5cf6 60%, transparent 80%)' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/[0.06]">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 border border-white/10 shrink-0">
                <img src="/logo.png" alt="Listening Together Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight block">SyncBeat</span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Listening Together</span>
              </div>
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-6 text-xs text-slate-400 font-medium">
              <a href="#how-it-works" className="hover:text-cyan-300 transition-colors">How It Works</a>
              <a href="#features" className="hover:text-cyan-300 transition-colors">Features</a>
              <a href="#download-app" className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">Download App</a>
              <button onClick={() => setLocation('/lobby')} className="hover:text-cyan-300 transition-colors cursor-pointer">Rooms</button>
              <button onClick={() => setLocation('/login')} className="hover:text-cyan-300 transition-colors cursor-pointer">Login</button>
            </div>
          </div>

          {/* 🌟 PREMIUM 'MADE BY VAIBHAV' DESIGN BADGE & CONTACT CONNECT 🌟 */}
          <div className="pt-8">
            <CreatorSignature />
          </div>

          {/* Bottom Copyright Row */}
          <div className="pt-8 mt-6 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p className="order-2 md:order-1 text-center md:text-left">
              © {new Date().getFullYear()} SyncBeat. Synchronized Music Experience.
            </p>
            <div className="text-[11px] text-slate-500 font-mono order-3 text-center md:text-right">
              Crafted for pure vibes
            </div>
          </div>

        </div>
      </footer>

      {/* ─── APP DOWNLOAD & QR MODAL ─── */}
      <AppDownloadModal open={showDownloadModal} onOpenChange={setShowDownloadModal} />

    </div>
  );
}
