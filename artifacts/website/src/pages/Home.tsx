import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Headphones, Users, Link2, Search, Play, MessageCircle, Music2,
  Radio, Zap, Smartphone, ListMusic, ChevronRight, ArrowRight,
  Mic2, Shield, Globe, FolderOpen, Sparkles
} from 'lucide-react';

const FEATURES = [
  { icon: Radio,          label: 'Real-time Sync',      desc: 'Music plays in perfect sync for everyone in the room, no delays.' },
  { icon: Users,          label: 'Music Rooms',          desc: 'Create and join as many rooms as you want, completely free.' },
  { icon: Link2,          label: 'Shareable Links',      desc: 'One link is all it takes to invite your entire friend group.' },
  { icon: Search,         label: 'YouTube Search',       desc: 'Search and play any song — Bollywood, English, Punjabi, anything.' },
  { icon: Play,           label: 'Full Playback Control',desc: 'Everyone can play, pause, seek, and pick the next song.' },
  { icon: MessageCircle,  label: 'Live Chat',            desc: 'Send emojis and messages while the music plays.' },
  { icon: ListMusic,      label: 'Song Queue',           desc: 'Add songs to a queue so the music never stops.' },
  { icon: FolderOpen,     label: 'Local Playlist',       desc: 'Play songs from your phone or computer directly in the room.' },
  { icon: Smartphone,     label: 'Mobile Friendly',      desc: 'Works perfectly on every device — phone, tablet, or desktop.' },
  { icon: Mic2,           label: 'Voice Chat',          desc: 'Talk and chat with your friends in real-time while listening.' },
  { icon: Globe,          label: 'Public Rooms',         desc: 'Discover active vibe rooms and join the listener community.' },
  { icon: Shield,         label: 'Spotify Import',       desc: 'Import your personal Spotify playlists directly into the queue.' },
];

const STEPS = [
  { num: '01', title: 'Create a Room',   desc: 'Sign in and create your music room in seconds.' },
  { num: '02', title: 'Share the Link',  desc: 'Send your unique invite link to friends on WhatsApp or anywhere.' },
  { num: '03', title: 'Search & Play',   desc: 'Search any song on YouTube — it plays for everyone instantly.' },
  { num: '04', title: 'Enjoy Together',  desc: 'Chat, react, and vibe with your crew — all in real-time.' },
];

const FUTURE = [
  { icon: Sparkles,  label: 'AI DJ Recommendation',desc: 'Let our AI DJ queue the next song matching the room mood.' },
  { icon: Globe,     label: 'Community Canvas',    desc: 'Shared visualizers and synced ambient video filters.' },
  { icon: Mic2,      label: 'Video Vibe Streaming',desc: 'Optional synced webcam streams for visual parties.' },
  { icon: Smartphone,label: 'Desktop Player App',  desc: 'PWA with global media keyboard controls.' },
];

function FloatingNote({ char, className }: { char: string; className: string }) {
  return (
    <div className={`absolute pointer-events-none select-none font-black ${className}`}>
      {char}
    </div>
  );
}

function FeatureCard({ icon: Icon, label, desc, delay = 0 }: { icon: any; label: string; desc: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-primary/40 hover:bg-white/[0.06] transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-bold text-white text-base mb-1.5">{label}</h3>
      <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
}

function StepCard({ num, title, desc, delay = 0 }: { num: string; title: string; desc: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay }}
      className="relative flex flex-col items-center text-center p-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xl mb-5 shadow-xl shadow-primary/30">
        {num}
      </div>
      <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed max-w-[200px]">{desc}</p>
    </motion.div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#030c12] text-white overflow-x-hidden">

      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-10 h-16 bg-black/40 backdrop-blur-xl border-b border-white/6">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight">SyncBeat</span>
        </button>
        <div className="hidden sm:flex items-center gap-8 text-sm font-medium text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How It Works</a>
          <a href="#future" className="hover:text-white transition-colors">Roadmap</a>
        </div>
        <button
          onClick={() => setLocation('/login')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-primary/25"
        >
          Start Listening <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-4 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to bottom, rgba(7,5,17,0.5) 0%, rgba(7,5,17,0.7) 40%, rgba(7,5,17,1) 100%),
              url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1400&q=70&auto=format&fit=crop')
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="absolute top-[15%] left-[8%] w-[45%] h-[45%] bg-primary/20 blur-[140px] rounded-full animate-pulse-glow z-0" />
        <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-accent/15 blur-[160px] rounded-full animate-pulse-glow z-0" style={{ animationDelay: '2s' }} />

        <div className="absolute top-[20%] left-[6%] text-[88px] z-[2] animate-float pointer-events-none select-none opacity-80" style={{ filter: 'drop-shadow(0 0 22px rgba(0,212,212,0.50))' }}>🎵</div>
        <div className="absolute top-[32%] right-[7%] text-[70px] z-[2] animate-float2 pointer-events-none select-none opacity-75" style={{ filter: 'drop-shadow(0 0 18px rgba(59,130,246,0.50))' }}>🎶</div>
        <div className="absolute bottom-[26%] left-[11%] text-[58px] z-[2] animate-float pointer-events-none select-none opacity-70" style={{ filter: 'drop-shadow(0 0 16px rgba(6,182,212,0.45))' }}>🎸</div>
        <div className="absolute bottom-[36%] right-[5%] text-[63px] z-[2] animate-float-delayed pointer-events-none select-none opacity-70" style={{ filter: 'drop-shadow(0 0 18px rgba(14,165,233,0.45))' }}>🎤</div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-semibold mb-8"
          >
            <Music2 className="w-4 h-4" />
            Listen music together — in real-time
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-black leading-[1.04] tracking-tight mb-6"
          >
            Music is better
            <br />
            <span className="text-shimmer">together.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-lg sm:text-xl text-white/55 max-w-xl mx-auto leading-relaxed mb-10"
          >
            Create a room, share a link, and enjoy perfectly synced music with your friends — anywhere in the world.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => setLocation('/login')}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-black text-lg transition-all hover:scale-[1.03] shadow-2xl shadow-primary/35"
            >
              <Headphones className="w-6 h-6" />
              Start Listening
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#how"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/10 text-white font-bold text-base transition-all"
            >
              How It Works <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-3"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold" style={{ background: 'rgba(0,212,212,0.08)', borderColor: 'rgba(0,212,212,0.25)', color: '#67e8f9' }}>
              <Zap className="w-3.5 h-3.5" />
              100% Free · No ads
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)', color: '#93c5fd' }}>
              <Smartphone className="w-3.5 h-3.5" />
              Works on all devices
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
              <Users className="w-3.5 h-3.5" />
              No download required
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/25 text-xs"
        >
          <span>Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/30 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative py-28 px-4">
        <div className="absolute inset-0 z-0 opacity-40" style={{ backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)` }} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl font-black mb-4"
            >
              Everything you need to <span className="text-shimmer">vibe together</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white/45 text-lg max-w-xl mx-auto"
            >
              All the tools for the perfect shared listening experience — right out of the box.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.label} {...f} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="relative py-28 px-4 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to bottom, rgba(7,5,17,1) 0%, rgba(7,5,17,0.75) 40%, rgba(7,5,17,0.75) 60%, rgba(7,5,17,1) 100%),
              url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=70&auto=format&fit=crop')
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/25 text-accent text-sm font-semibold mb-5"
            >
              <Zap className="w-3.5 h-3.5" /> Super Simple
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-black mb-4"
            >
              How It <span className="text-shimmer">Works</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white/45 text-lg max-w-xl mx-auto"
            >
              Get a room going in under 30 seconds.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 relative">
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
            {STEPS.map((s, i) => <StepCard key={s.num} {...s} delay={i * 0.1} />)}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-14 text-center"
          >
            <button
              onClick={() => setLocation('/login')}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-lg hover:opacity-90 transition-all hover:scale-[1.03] shadow-2xl shadow-primary/30"
            >
              <Play className="w-5 h-5" /> Try It Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── ROADMAP ─── */}
      <section id="future" className="py-24 px-4">
        <div
          className="max-w-5xl mx-auto rounded-3xl overflow-hidden relative"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(219,39,119,0.15) 100%),
              url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=70&auto=format&fit=crop')
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <div className="relative z-10 p-10 sm:p-16">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm font-semibold mb-5"
              >
                🚀 Coming Future
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl font-black mb-4"
              >
                The Future of <span className="text-shimmer">SyncBeat</span>
              </motion.h2>
              <p className="text-white/50 text-lg max-w-xl mx-auto">
                Big things are coming to make your music experience even better.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {FUTURE.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/8 border border-white/10 hover:border-primary/40 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-bold text-sm mb-1">{f.label}</p>
                  <p className="text-xs text-white/40">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-6 w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-2xl shadow-primary/40"
          >
            <Headphones className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black mb-5"
          >
            Ready to vibe <span className="text-shimmer">together?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-lg mb-10 max-w-lg mx-auto"
          >
            Create your room in seconds and start listening with your friends right now.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            onClick={() => setLocation('/login')}
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-xl hover:opacity-90 transition-all hover:scale-[1.03] shadow-2xl shadow-primary/35"
          >
            <Headphones className="w-7 h-7" />
            Start Listening Now
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <p className="text-white/20 text-sm mt-6">100% free · No downloads · Works on all devices</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/8 py-10 px-6" style={{ background: 'rgba(3,12,18,0.8)' }}>
        <div className="max-w-5xl mx-auto">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">SyncBeat</span>
            </div>
            <p className="text-white/25 text-sm text-center">
              © 2026 SyncBeat · Listen music together, in real-time
              <a href="/admin" className="text-white/5 hover:text-white/15 transition-colors ml-2">·</a>
            </p>
            {/* Made by Vaibhav */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(0,212,212,0.06)', border: '1px solid rgba(0,212,212,0.15)' }}>
              <span className="text-sm">⚡</span>
              <span className="text-white/35 text-sm font-medium">Made by</span>
              <span
                className="text-sm font-black tracking-wide"
                style={{
                  background: 'linear-gradient(90deg, #67e8f9, #38bdf8, #818cf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Vaibhav
              </span>
              <span className="text-sm">🎧</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,212,0.15), rgba(59,130,246,0.15), transparent)' }} />

          {/* Bottom row */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-white/20">
            <span>🎵 Real-time music sync</span>
            <span className="hidden sm:block">·</span>
            <span>🎶 YouTube powered</span>
            <span className="hidden sm:block">·</span>
            <span>🚀 Built with React + WebSockets</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
