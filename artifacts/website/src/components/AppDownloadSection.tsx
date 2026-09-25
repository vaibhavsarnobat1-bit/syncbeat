import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, QrCode, Smartphone, Laptop, Check, Copy,
  Wifi, WifiOff, Share2, Sparkles, ExternalLink, ArrowRight, ShieldCheck
} from 'lucide-react';
import { shareOrCopy } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadSection() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [appUrl, setAppUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios' | 'desktop'>('android');
  const [downloadType, setDownloadType] = useState<'apk' | 'web'>('apk');

  useEffect(() => {
    // Current URL (or LAN IP when local so phone scanning connects over Wi-Fi)
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
    const baseOrigin = isLocal ? `http://192.168.1.5${port}` : (typeof window !== 'undefined' ? window.location.origin : 'https://syncbeat.app');
    
    const currentUrl = downloadType === 'apk' ? `${baseOrigin}/SyncBeat.apk` : baseOrigin;
    setAppUrl(currentUrl);

    // Generate high-res QR Code
    QRCode.toDataURL(currentUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));

    // Listen for PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If prompt isn't directly available (iOS or desktop), switch to platform instructions
      const userAgent = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setActivePlatform('ios');
      } else if (/android/.test(userAgent)) {
        setActivePlatform('android');
      } else {
        setActivePlatform('desktop');
      }
    }
  };

  const copyUrl = async () => {
    const result = await shareOrCopy({
      title: 'SyncBeat — Music Player App',
      text: 'Download & listen to music together with SyncBeat!',
      url: appUrl,
    });
    if (result !== 'failed') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section id="download-app" className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background ambient glows */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] opacity-20 blur-[140px] pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle, #38bdf8 0%, #8b5cf6 50%, #ec4899 90%)',
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Smartphone className="w-3.5 h-3.5" />
            Install SyncBeat App
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            Take <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">SyncBeat</span> Everywhere
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Install on your phone or PC in 1 click. Works offline for local songs, syncs instantly with friends on YouTube, and sends you alerts when someone plays a song.
          </p>
        </div>

        {/* Main Grid: QR Code Card & Install Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT: QR Code Scanner Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative group p-1 rounded-3xl bg-gradient-to-b from-cyan-500/40 via-purple-500/20 to-transparent shadow-2xl shadow-cyan-500/10 w-full max-w-sm">
              <div className="bg-[#080c18] border border-white/[0.08] rounded-[22px] p-6 text-center backdrop-blur-xl relative overflow-hidden">
                
                {/* Corner accent glow */}
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-4 text-xs font-bold">
                  <button
                    onClick={() => setDownloadType('apk')}
                    className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      downloadType === 'apk'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Android APK</span>
                  </button>
                  <button
                    onClick={() => setDownloadType('web')}
                    className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      downloadType === 'web'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Web App</span>
                  </button>
                </div>

                {/* QR Code Container */}
                <div className="relative bg-white p-4 rounded-2xl mx-auto w-fit shadow-xl group-hover:scale-[1.02] transition-transform duration-300">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="SyncBeat Download QR Code"
                      className="w-56 h-56 sm:w-64 sm:h-64 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                      Generating QR...
                    </div>
                  )}

                  {/* Logo in center overlay */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white p-1 shadow-lg border border-slate-200 flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="SyncBeat Logo"
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>
                </div>

                {/* Direct Download APK Button */}
                {downloadType === 'apk' && (
                  <a
                    href="/SyncBeat.apk"
                    download="SyncBeat.apk"
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download SyncBeat.apk (677 KB)</span>
                  </a>
                )}

                {/* URL preview & Copy */}
                <div className="mt-3 flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="font-mono text-slate-300 truncate max-w-[210px] text-left">
                    {appUrl}
                  </span>
                  <button
                    onClick={copyUrl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium transition-colors shrink-0"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  {downloadType === 'apk'
                    ? 'Scan QR with phone camera to download SyncBeat.apk instantly'
                    : 'Scan QR with phone camera to open in Chrome / Safari'}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Install Buttons, Features, & Step-by-Step Instructions */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Quick Action Box */}
            <div className="bg-[#070b16]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-7 relative overflow-hidden backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-cyan-500/30 border border-cyan-400/30 shrink-0">
                    <img src="/logo.png" alt="SyncBeat Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      SyncBeat Web App
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        PWA Ready
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Offline playback + Real-time YouTube sync</p>
                  </div>
                </div>

                {/* Direct Install Button */}
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalled}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xl ${
                    isInstalled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                      : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 hover:scale-[1.02] cursor-pointer'
                  }`}
                >
                  {isInstalled ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      App Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Install App Now
                    </>
                  )}
                </button>
              </div>

              {/* Feature Pill Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Offline Ready</div>
                    <div className="text-[10px] text-slate-400">Local files play without internet</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Smart Alerts</div>
                    <div className="text-[10px] text-slate-400">Notifies when friend plays song</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Zero Storage</div>
                    <div className="text-[10px] text-slate-400">Installs in 2MB without Play Store</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Guides (Tabs) */}
            <div className="bg-[#070b16]/70 border border-white/[0.06] rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3 mb-4">
                <span className="text-xs font-bold text-slate-300">How to install on your device:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActivePlatform('android')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activePlatform === 'android'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Android
                  </button>
                  <button
                    onClick={() => setActivePlatform('ios')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activePlatform === 'ios'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    iPhone / iOS
                  </button>
                  <button
                    onClick={() => setActivePlatform('desktop')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activePlatform === 'desktop'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PC / Laptop
                  </button>
                </div>
              </div>

              {/* Instructions content */}
              {activePlatform === 'android' && (
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span>Scan QR code with your mobile camera or open Chrome.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span>Tap the <strong>three dots (⋮)</strong> menu in the top right corner.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>. SyncBeat will appear on your phone screen!</span>
                  </div>
                </div>
              )}

              {activePlatform === 'ios' && (
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span>Scan QR code or open link in <strong>Safari browser</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span>Tap the <strong>Share button</strong> (square with arrow pointing up) at the bottom.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong>. Done!</span>
                  </div>
                </div>
              )}

              {activePlatform === 'desktop' && (
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span>In Google Chrome or Microsoft Edge, look at the address bar.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span>Click the <strong>Install icon (monitor with arrow or ⊕)</strong> in the top right.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span>Launch SyncBeat as a standalone desktop app anytime from your taskbar or desktop.</span>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
