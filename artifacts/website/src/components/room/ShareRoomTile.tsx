import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Link2, QrCode, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

interface ShareRoomTileProps {
  roomName: string;
  inviteCode: string;
  inviteUrl: string;
  copied: boolean;
  onShare: () => void;
  /** Follows the room's genre-reactive hue so the tile matches the current mood. */
  accentHue?: number;
}

const POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Cycles random glyphs before settling on the real code — replays whenever `replayKey` changes. */
function useDecode(text: string, replayKey: unknown) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    const chars = text.split('');
    const frames = 22;
    let frame = 0;
    let raf = 0;
    const run = () => {
      const settled = Math.floor(Math.pow(frame / frames, 1.4) * (chars.length + 2));
      setShown(chars.map((c, i) => (i < settled ? c : POOL[(Math.random() * POOL.length) | 0])).join(''));
      frame += 1;
      if (frame <= frames) raf = requestAnimationFrame(run);
      else setShown(text);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [text, replayKey]);

  return shown;
}

export function ShareRoomTile({
  roomName,
  inviteCode,
  inviteUrl,
  copied,
  onShare,
  accentHue = 189,
}: ShareRoomTileProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSrc, setQrSrc] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const decode = useDecode(inviteCode, copied);

  useEffect(() => {
    if (!qrOpen || !inviteUrl) return;
    let active = true;
    QRCode.toDataURL(inviteUrl, {
      margin: 1,
      width: 260,
      errorCorrectionLevel: 'M',
      color: { dark: '#040810', light: '#e8fbff' },
    })
      .then((url) => { if (active) setQrSrc(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [qrOpen, inviteUrl]);

  useEffect(() => {
    if (!qrOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setQrOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [qrOpen]);

  const hue = copied ? 152 : accentHue;
  const accent = `hsl(${hue} 95% 72%)`;
  const accentDim = `hsl(${hue} 95% 72% / 0.62)`;
  const violet = `hsl(${accentHue + 96} 92% 68%)`;

  return (
    <div
      ref={wrapRef}
      className="group relative shrink-0"
      style={{ '--pass-hue': String(hue), perspective: '900px' } as React.CSSProperties}
    >
      <div
        className="relative"
        style={{
          transformStyle: 'preserve-3d',
          animation: 'pass-float 9s ease-in-out infinite',
          willChange: 'transform',
        }}
      >
        {/* Spinning beam edge — a light source orbiting behind the pass */}
        <span className="absolute -inset-[1.5px] overflow-hidden rounded-[16px] pointer-events-none" aria-hidden="true">
          <span
            className="absolute left-1/2 top-1/2 w-[240%] aspect-square opacity-70 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              transform: 'translate(-50%, -50%)',
              animation: 'pass-beam 6.5s linear infinite',
              filter: 'blur(1.5px)',
              background: `conic-gradient(from 0deg,
                transparent 0deg, ${accent} 34deg, ${violet} 72deg,
                transparent 128deg, transparent 190deg, ${accent} 232deg,
                transparent 300deg, transparent 360deg)`,
            }}
          />
        </span>

        <div
          className="relative flex items-stretch gap-1 rounded-[15px] border border-white/10 px-1.5 py-1"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(8px)',
            background: `linear-gradient(155deg, hsl(${accentHue} 70% 12% / 0.96) 0%, rgba(5,9,20,0.97) 55%, hsl(${accentHue + 60} 60% 10% / 0.96) 100%)`,
            boxShadow: `0 12px 30px rgba(0,0,0,0.6), 0 0 22px hsl(${hue} 92% 55% / ${copied ? 0.34 : 0.18}), inset 0 1px 0 rgba(255,255,255,0.09)`,
            transition: 'box-shadow 0.35s ease',
          }}
        >
          {/* Fixed prismatic foil — no pointer tracking */}
          <span
            className="absolute inset-0 rounded-[15px] pointer-events-none opacity-25 transition-opacity duration-500 group-hover:opacity-70 mix-blend-plus-lighter"
            aria-hidden="true"
            style={{
              background: `radial-gradient(140px 80px at 18% 0%, hsl(${hue} 100% 78% / 0.35), transparent 70%),
                linear-gradient(118deg, transparent 34%, ${violet} 48%, transparent 60%)`,
            }}
          />
          {/* Slow holographic scan sweep */}
          <span className="absolute inset-0 overflow-hidden rounded-[15px] pointer-events-none" aria-hidden="true">
            <span
              className="absolute top-0 bottom-0 w-[26%]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
                animation: 'pass-scan 5.2s ease-in-out infinite',
              }}
            />
          </span>

          {/* ── Code zone ── */}
          <button
            onClick={onShare}
            className="relative flex flex-col justify-center gap-1 pl-2 pr-2.5 py-0.5"
            style={{ transform: 'translateZ(16px)', transformStyle: 'preserve-3d' }}
            title="Copy the room code"
            aria-label="Copy room code"
          >
            <span
              className="flex items-center gap-1 text-[7.5px] font-black uppercase tracking-[0.22em] leading-none"
              style={{ color: copied ? '#5eead4' : `hsl(${accentHue} 60% 62% / 0.8)` }}
            >
              {copied ? <Check className="w-2 h-2" /> : <Link2 className="w-2 h-2" />}
              {copied ? 'Copied to clipboard' : 'Invite pass'}
            </span>
            <span className="flex items-stretch gap-[2px] text-[11px] leading-none" aria-hidden="true">
              {decode.split('').map((c, i) => (
                <span
                  key={`${i}-${c}`}
                  className="pass-cell"
                  style={{
                    transform: `translateZ(${10 + (i % 4) * 3}px)`,
                    animationDelay: `${Math.min(i, 11) * 18}ms`,
                  }}
                >
                  {c}
                </span>
              ))}
            </span>
            <span className="sr-only">{inviteCode}</span>
          </button>

          <span className="w-px self-stretch my-1" style={{ background: `linear-gradient(180deg, transparent, hsl(${hue} 90% 70% / 0.35), transparent)` }} aria-hidden="true" />

          {/* ── Share ── */}
          <button
            onClick={onShare}
            className="relative flex flex-col items-center justify-center gap-1 w-[42px] rounded-xl hover:bg-white/[0.07] transition-colors"
            style={{ transform: 'translateZ(22px)' }}
            title="Share the invite link"
            aria-label="Share invite link"
          >
            <Share2 className="w-[15px] h-[15px]" style={{ color: accent, filter: `drop-shadow(0 0 6px hsl(${hue} 95% 60% / 0.8))` }} />
            <span className="text-[7.5px] font-black uppercase tracking-[0.14em] leading-none" style={{ color: accentDim }}>
              Share
            </span>
          </button>

          {/* ── QR ── */}
          <button
            onClick={() => setQrOpen((v) => !v)}
            className="relative flex flex-col items-center justify-center gap-1 w-[42px] rounded-xl transition-colors"
            style={{
              transform: 'translateZ(22px)',
              background: qrOpen ? `hsl(${accentHue} 90% 60% / 0.14)` : undefined,
            }}
            title="Show a QR friends can scan"
            aria-label="Toggle room QR code"
            aria-expanded={qrOpen}
          >
            <QrCode className="w-[15px] h-[15px]" style={{ color: qrOpen ? accent : 'rgba(255,255,255,0.6)' }} />
            <span
              className="text-[7.5px] font-black uppercase tracking-[0.14em] leading-none"
              style={{ color: qrOpen ? accentDim : 'rgba(255,255,255,0.42)' }}
            >
              QR
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {qrOpen && (
          <div className="absolute right-0 top-full mt-2 z-50" style={{ perspective: '1000px' }}>
            <motion.div
              initial={{ opacity: 0, rotateX: -65, y: -10 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, rotateX: -50, y: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-[252px] rounded-2xl p-4 border overflow-hidden"
              style={{
                transformOrigin: 'top center',
                background: `linear-gradient(165deg, hsl(${accentHue} 60% 10% / 0.98), rgba(4,7,16,0.99))`,
                borderColor: `hsl(${accentHue} 90% 68% / 0.32)`,
                boxShadow: `0 26px 70px rgba(0,0,0,0.8), 0 0 30px hsl(${accentHue} 90% 55% / 0.16)`,
              }}
            >
              <span
                className="absolute top-0 left-[12%] right-[12%] h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                aria-hidden="true"
              />
              <p className="text-[9px] font-black uppercase tracking-[0.24em] mb-3" style={{ color: accentDim }}>
                Scan to join
              </p>

              <div className="relative mx-auto w-[176px] h-[176px] rounded-xl p-3" style={{ background: 'linear-gradient(160deg, #f4feff, #cbeaf3)' }}>
                {qrSrc ? (
                  <img src={qrSrc} alt={`QR code inviting people to ${roomName}`} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full animate-pulse rounded bg-cyan-500/10" />
                )}
                {/* Laser sweep across the code */}
                <span
                  className="absolute left-3 right-3 top-1/2 h-[3px] rounded-full pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, transparent, hsl(${accentHue} 95% 60% / 0.95), transparent)`,
                    boxShadow: `0 0 12px hsl(${accentHue} 95% 60% / 0.8)`,
                    animation: 'qr-laser 2.6s ease-in-out infinite',
                  }}
                  aria-hidden="true"
                />
                {/* Scanner corner brackets */}
                {[
                  'left-1 top-1 border-l-2 border-t-2 rounded-tl',
                  'right-1 top-1 border-r-2 border-t-2 rounded-tr',
                  'left-1 bottom-1 border-l-2 border-b-2 rounded-bl',
                  'right-1 bottom-1 border-r-2 border-b-2 rounded-br',
                ].map((pos) => (
                  <span
                    key={pos}
                    className={`absolute w-3.5 h-3.5 pointer-events-none ${pos}`}
                    style={{ borderColor: `hsl(${accentHue} 92% 55% / 0.85)` }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <p className="text-center text-xs font-bold text-white/85 mt-3 truncate">{roomName}</p>
              <p className="text-center font-mono text-[10px] tracking-[0.16em] mt-0.5" style={{ color: accentDim }}>
                {inviteCode}
              </p>
              <p className="text-center text-[9px] text-white/25 mt-2 truncate">
                {inviteUrl.replace(/^https?:\/\//, '')}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
