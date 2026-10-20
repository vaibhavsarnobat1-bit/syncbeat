import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers } from 'lucide-react';
import type { Track } from '@workspace/api-client-react';

interface TrackDeckProps {
  current?: Track | null;
  history: Track[];
  isPlaying?: boolean;
  /** HSL hue (0-360) the deck glows with — follows the room's current mood. */
  accentHue?: number;
  className?: string;
}

interface DeckCard {
  key: string;
  track: Track;
  live: boolean;
}

const MAX_CARDS = 4;

const spring = { type: 'spring' as const, stiffness: 320, damping: 19, mass: 0.7 };

/**
 * Recently-played tracks as a physical card stack: every new track jumps in on
 * top and shoves the rest of the deck down.
 */
export const TrackDeck = memo(function TrackDeck({
  current,
  history,
  isPlaying = false,
  accentHue = 189,
  className = '',
}: TrackDeckProps) {
  const { cards, overflow } = useMemo(() => {
    const seen = new Set<string>();
    const list: DeckCard[] = [];
    if (current) {
      list.push({ key: `live-${current.videoId}`, track: current, live: true });
      seen.add(current.videoId);
    }
    for (const t of history) {
      if (seen.has(t.videoId)) continue;
      seen.add(t.videoId);
      if (list.length < MAX_CARDS) list.push({ key: t.videoId, track: t, live: false });
    }
    return { cards: list, overflow: Math.max(0, seen.size - list.length) };
  }, [current, history]);

  if (cards.length === 0) return null;

  return (
    <div className={`shrink-0 px-3 pt-3 pb-1 ${className}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `hsl(${accentHue} 90% 60% / 0.12)`,
            border: `1px solid hsl(${accentHue} 90% 62% / 0.28)`,
          }}
        >
          <Layers className="w-3 h-3" style={{ color: `hsl(${accentHue} 92% 68%)` }} />
        </div>
        <h3 className="text-[10px] font-bold text-white/70 uppercase tracking-[0.16em]">On Deck</h3>
        <span className="w-4 h-px bg-gradient-to-r from-white/20 to-transparent flex-1" />
        {overflow > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/6 text-white/40">
            +{overflow}
          </span>
        )}
      </div>

      <div className="relative" style={{ height: 56 + Math.max(0, cards.length - 1) * 34, perspective: '900px' }}>
        <AnimatePresence initial={false}>
          {cards.map((card, idx) => {
            const top = idx === 0;
            const height = top ? 56 : 30;
            const y = top ? 0 : 56 + (idx - 1) * 34;
            const dim = top ? 1 : Math.max(0.42, 1 - idx * 0.2);
            const live = card.live;

            return (
              <motion.div
                key={card.key}
                initial={{ y: -58, height: 56, scale: 1.14, rotateZ: -5, opacity: 0 }}
                animate={{ y, height, scale: 1, rotateZ: 0, opacity: dim }}
                exit={{ y: y + 26, scale: 0.86, opacity: 0, transition: { duration: 0.3 } }}
                transition={spring}
                style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 0, zIndex: 30 - idx }}
                className="deck-card"
                data-live={live ? '1' : '0'}
              >
                <div
                  className="deck-face w-full h-full rounded-2xl flex items-center overflow-hidden"
                  style={{
                    gap: top ? '10px' : '8px',
                    padding: top ? '0 10px' : '0 8px',
                    background: top
                      ? `linear-gradient(135deg, hsl(${accentHue} 80% 55% / 0.2), rgba(255,255,255,0.03))`
                      : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                    border: top
                      ? `1px solid hsl(${accentHue} 90% 62% / 0.45)`
                      : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: top
                      ? `0 10px 26px hsl(${accentHue} 90% 45% / 0.28), inset 0 1px 0 rgba(255,255,255,0.1)`
                      : '0 6px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="relative shrink-0">
                    <img
                      src={card.track.thumbnail}
                      alt=""
                      className={`rounded-lg object-cover border border-white/10 ${top ? 'w-10 h-10' : 'w-6 h-6'}`}
                      loading="lazy"
                    />
                    {top && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#070a16]"
                        style={{
                          background: `hsl(${accentHue} 95% 62%)`,
                          boxShadow: isPlaying ? `0 0 10px hsl(${accentHue} 95% 60%)` : 'none',
                        }}
                      />
                    )}
                  </div>

                  {top ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white/90 truncate leading-tight">
                        {card.track.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-end gap-[2px] h-2.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span
                              key={i}
                              className="w-[2px] rounded-full"
                              style={{
                                background: `hsl(${accentHue} 92% 64%)`,
                                minHeight: '2px',
                                height: isPlaying ? '100%' : '2px',
                                animation: isPlaying ? `wave ${0.55 + i * 0.14}s ease-in-out infinite alternate` : 'none',
                                boxShadow: `0 0 6px hsl(${accentHue} 92% 60% / 0.7)`,
                              }}
                            />
                          ))}
                        </div>
                        <span
                          className="text-[9px] font-black uppercase tracking-[0.14em]"
                          style={{ color: `hsl(${accentHue} 92% 68%)` }}
                        >
                          {isPlaying ? 'Now' : 'Paused'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 min-w-0 text-[10px] font-semibold text-white/70 truncate leading-none">
                        {card.track.title}
                      </p>
                      <span className="text-[8px] font-mono text-white/25 shrink-0">#{idx}</span>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});
