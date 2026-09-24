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
  QrCode, Smartphone, Download, Check, Copy, ExternalLink, X
} from 'lucide-react';
import { shareOrCopy } from '@/lib/utils';

interface AppDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppDownloadModal({ open, onOpenChange }: AppDownloadModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [appUrl, setAppUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');

  useEffect(() => {
    if (!open) return;
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://syncbeat.app';
    setAppUrl(currentOrigin);

    QRCode.toDataURL(currentOrigin, {
      width: 280,
      margin: 2,
      color: { dark: '#030712', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#080d1a] border border-cyan-500/20 text-white p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[2px] mb-3 shadow-lg shadow-cyan-500/25">
            <img src="/logo.png" alt="Logo" className="w-full h-full rounded-[14px] object-cover" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-white">
            Download & Install SyncBeat
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Scan with your phone camera to download & install as a mobile app.
          </DialogDescription>
        </DialogHeader>

        {/* QR Code Container */}
        <div className="relative bg-white p-3 rounded-2xl mx-auto my-3 shadow-xl w-fit">
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

        {/* App URL Copy Box */}
        <div className="flex items-center justify-between gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs">
          <span className="font-mono text-slate-300 truncate max-w-[240px]">
            {appUrl}
          </span>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition-colors shrink-0"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Platform tabs */}
        <div className="mt-3">
          <div className="flex items-center justify-center gap-2 border-b border-white/10 pb-2 mb-3">
            <button
              onClick={() => setActiveTab('android')}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                activeTab === 'android' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Android (Chrome)
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                activeTab === 'ios' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              iPhone (Safari)
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            {activeTab === 'android' ? (
              <>Scan QR → Open in Chrome → Tap <strong>⋮ Menu</strong> → <strong>"Install app"</strong></>
            ) : (
              <>Scan QR → Open in Safari → Tap <strong>Share</strong> → <strong>"Add to Home Screen"</strong></>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
