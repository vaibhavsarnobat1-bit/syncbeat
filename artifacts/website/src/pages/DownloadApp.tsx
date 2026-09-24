import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, CheckCircle, Share2, PlusSquare, Home,
  ChevronRight, Wifi, Zap, Music2, Star
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function DownloadApp() {
  const [, setLocation] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setInstalled(true));

    // Cycle through steps for animation
    const stepTimer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 3);
    }, 2200);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearInterval(stepTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const steps = [
    {
      icon: <Share2 className="w-6 h-6" />,
      label: 'Chrome menu kholein',
      sub: 'Upar 3 dots (⋮) tap karein',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: <PlusSquare className="w-6 h-6" />,
      label: '"Add to Home Screen" tap karein',
      sub: 'Ya "Install App" option select karein',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Home className="w-6 h-6" />,
      label: 'Install dabao — Done!',
      sub: 'SyncBeat home screen pe aa jayega',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  if (installed) {
    return (
      <div className="min-h-screen bg-[#05070e] text-white flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">SyncBeat Installed! 🎉</h1>
          <p className="text-slate-400 text-sm mb-8">Ab apne home screen se open karo</p>
          <button
            onClick={() => setLocation('/')}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-white"
          >
            App Kholein
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070e] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-20 blur-[130px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, #a855f7 55%, #ec4899 100%)' }}
      />

      <div className="max-w-sm w-full relative z-10">

        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center mb-7"
        >
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-3xl bg-cyan-400/30 blur-2xl animate-pulse scale-110" />
            <div className="w-24 h-24 rounded-3xl p-[2px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-2xl shadow-purple-500/40 relative">
              <img src="/logo.png" alt="SyncBeat" className="w-full h-full object-cover rounded-[22px]" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            SyncBeat
          </h1>
          <p className="text-slate-400 text-xs text-center">
            Real-time music rooms • Offline player
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-2 flex-wrap mb-6"
        >
          {[
            { icon: <Zap className="w-3 h-3" />, label: 'Instant Install' },
            { icon: <Wifi className="w-3 h-3" />, label: 'Works Offline' },
            { icon: <Music2 className="w-3 h-3" />, label: 'Sync Rooms' },
            { icon: <Star className="w-3 h-3" />, label: 'Free' },
          ].map((f) => (
            <span key={f.label} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
              <span className="text-cyan-400">{f.icon}</span> {f.label}
            </span>
          ))}
        </motion.div>

        {/* Primary: 1-tap install if PWA prompt available */}
        {deferredPrompt && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleInstall}
            className="w-full py-4 px-6 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4"
          >
            <Smartphone className="w-5 h-5" />
            Install SyncBeat — 1 Tap!
          </motion.button>
        )}

        {/* Step-by-step guide card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-[#090e1c]/90 border border-white/10 rounded-3xl p-5 mb-4 backdrop-blur-xl shadow-xl"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            Phone pe install kaise karein (Chrome)
          </p>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: activeStep === i ? 1.02 : 1,
                  opacity: activeStep === i ? 1 : 0.6,
                }}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  activeStep === i
                    ? 'bg-white/8 border-white/20'
                    : 'bg-transparent border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                  {step.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white leading-tight">{step.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{step.sub}</p>
                </div>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                  activeStep === i ? 'bg-white text-black' : 'bg-white/10 text-white/40'
                }`}>
                  {i + 1}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Visual hint */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[11px] text-amber-300/80 bg-amber-500/8 rounded-xl p-3">
            <span className="text-base">💡</span>
            <span>
              <strong>Chrome me:</strong> Address bar ke paas{' '}
              <strong>"⊕ Install"</strong> icon bhi aa sakta hai — direct tap karo!
            </span>
          </div>
        </motion.div>

        {/* Open in browser button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          onClick={() => setLocation('/')}
          className="w-full py-3.5 px-6 rounded-2xl font-semibold text-sm text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-4 h-4 text-cyan-400" />
          Browser mein kholein (Install baad mein)
        </motion.button>

        {/* Bottom note */}
        <p className="text-center text-[10px] text-slate-600 mt-5">
          SyncBeat PWA • Works like a native app • No Play Store needed
        </p>
      </div>
    </div>
  );
}
