import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Download, Smartphone, CheckCircle, Apple, Sparkles,
  ArrowRight, ShieldCheck, RefreshCw, ChevronRight, Zap
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function DownloadApp() {
  const [, setLocation] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isAppleDevice);

    // If Android or desktop, automatically trigger APK download
    if (!isAppleDevice) {
      const timer = setTimeout(() => {
        triggerApkDownload();
      }, 700);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const triggerApkDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/SyncBeat.apk';
    link.download = 'SyncBeat.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#040711] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient neon glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-purple-600/20 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full relative z-10">
        
        {/* App Logo & Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center mb-6 text-center"
        >
          <div className="relative mb-3">
            <div className="absolute inset-0 rounded-3xl bg-cyan-400/30 blur-2xl animate-pulse scale-110" />
            <div className="w-20 h-20 rounded-3xl p-[2px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-2xl shadow-cyan-500/30 relative">
              <img src="/logo.png" alt="SyncBeat" className="w-full h-full object-cover rounded-[22px]" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>SyncBeat</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              v1.0 APK
            </span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-Time YouTube Music Sync • Listen with Friends
          </p>
        </motion.div>

        {/* Download Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-[#080d1e]/90 border border-cyan-500/25 rounded-3xl p-6 backdrop-blur-2xl shadow-2xl shadow-cyan-500/10 mb-4"
        >
          {!isIOS ? (
            /* Android / PC Direct Download Card */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-cyan-500/20">
                <Download className="w-7 h-7 animate-bounce" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-white">
                  {downloadStarted ? 'Downloading SyncBeat APK...' : 'Download SyncBeat APK'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {downloadStarted 
                    ? 'Agar download shuru nahi hua, to niche wale button par tap karein:'
                    : 'Download auto-start ho raha hai...'}
                </p>
              </div>

              {/* Glowing Download Button */}
              <button
                onClick={triggerApkDownload}
                className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Direct Download APK (677 KB)</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-3">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>100% Safe & Verified • Android Compatible</span>
              </div>
            </div>
          ) : (
            /* iOS / iPhone Install Card */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-300 shadow-lg shadow-purple-500/20">
                <Apple className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-white">Install on iPhone (iOS)</h2>
                <p className="text-xs text-slate-400 mt-1">
                  iPhone par bina App Store ke 1-tap me install karein:
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-left text-xs space-y-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Safari me niche <strong>Share Button (⬆️)</strong> dabayein</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Scroll karke <strong>"Add to Home Screen"</strong> par tap karein</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Upar <strong>"Add"</strong> dabayein — Done! 🎉</span>
                </div>
              </div>

              <button
                onClick={() => setLocation('/')}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to SyncBeat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>

        {/* PWA 1-Tap button if prompt available */}
        {deferredPrompt && (
          <button
            onClick={handlePwaInstall}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all flex items-center justify-center gap-2 mb-3"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Ya Browser me Install Karein (PWA)</span>
          </button>
        )}

        {/* Browser Open Button */}
        <button
          onClick={() => setLocation('/')}
          className="w-full py-3 px-4 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all flex items-center justify-center gap-1.5"
        >
          <span>Open Web Player Directly</span>
          <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        <p className="text-center text-[10px] text-slate-500 mt-4">
          SyncBeat Music • Direct APK & Web App
        </p>
      </div>
    </div>
  );
}
