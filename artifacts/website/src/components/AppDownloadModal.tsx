import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  QrCode, Smartphone, Download, Check, Copy, ExternalLink, Sparkles
} from 'lucide-react';
import { shareOrCopy } from '@/lib/utils';

interface AppDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppDownloadModal({ open, onOpenChange }: AppDownloadModalProps) {
  const [downloadType, setDownloadType] = useState<'apk' | 'web'>('apk');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Detect if on localhost - use Wi-Fi LAN IP 192.168.1.5 so phone scanner works on the same network
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const port = window.location.port ? `:${window.location.port}` : '';
    const origin = isLocal ? `http://192.168.1.5${port}` : window.location.origin;

    const urlToEncode = downloadType === 'apk' ? `${origin}/SyncBeat.apk` : origin;
    setTargetUrl(urlToEncode);

    QRCode.toDataURL(urlToEncode, {
      width: 320,
      margin: 2,
      color: { dark: '#030712', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [open, downloadType]);

  const copyUrl = async () => {
    const result = await shareOrCopy({
      title: downloadType === 'apk' ? 'Download SyncBeat APK' : 'SyncBeat Web App',
      text: downloadType === 'apk' ? 'Download SyncBeat Android APK directly!' : 'Listen to music together on SyncBeat!',
      url: targetUrl,
    });
    if (result !== 'failed') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#080d1a] border border-cyan-500/20 text-white p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[2px] mb-3 shadow-lg shadow-cyan-500/25">
            <img src="/logo.png" alt="Logo" className="w-full h-full rounded-[14px] object-cover" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
            <span>Download SyncBeat</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Mobile App
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Apne phone camera se scan karke download ya install karein
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector: APK vs Web App */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl mt-1">
          <button
            onClick={() => setDownloadType('apk')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              downloadType === 'apk'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Android APK (.apk)</span>
          </button>
          <button
            onClick={() => setDownloadType('web')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              downloadType === 'web'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Web App / iPhone</span>
          </button>
        </div>

        {/* QR Code Container */}
        <div className="relative bg-white p-3 rounded-2xl mx-auto my-3 shadow-xl w-fit group">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Download QR"
              className="w-48 h-48 rounded-lg object-contain"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
              Generating QR...
            </div>
          )}
          {/* Logo badge in center of QR */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white p-0.5 shadow-md border border-slate-200">
            <img src="/logo.png" alt="Logo" className="w-full h-full rounded-lg object-cover" />
          </div>
        </div>

        {/* Direct Download Button */}
        {downloadType === 'apk' ? (
          <a
            href="/SyncBeat.apk"
            download="SyncBeat.apk"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Direct Download: SyncBeat.apk (677 KB)</span>
          </a>
        ) : null}

        {/* App URL Copy Box */}
        <div className="flex items-center justify-between gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs">
          <span className="font-mono text-slate-300 truncate max-w-[240px]">
            {targetUrl}
          </span>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition-colors shrink-0"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-1 bg-white/[0.03] border border-white/5 rounded-xl p-2.5 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {downloadType === 'apk' ? (
              <>📱 Phone Camera se scan karein → <strong>SyncBeat.apk</strong> auto-download hoga → Install karein!</>
            ) : (
              <>🌐 Phone Camera se scan karein → Browser me open hoga → <strong>"Add to Home Screen"</strong> karein!</>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
