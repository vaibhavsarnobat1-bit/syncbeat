import React, { memo, useEffect, useMemo, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&.,:;!?-+*/()#%';

interface FlapCell {
  ch: string;
  flip: number;
}

interface FlapTextProps {
  /** Full text — the board flaps to this whenever it changes. */
  text: string;
  /** Number of physical flap cells on the board. */
  cells?: number;
  className?: string;
}

function toCells(text: string, count: number): string[] {
  const clean = (text || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const shown = clean.length > count ? `${clean.slice(0, count - 1).trimEnd()}~` : clean;
  return shown.padEnd(count, ' ').slice(0, count).split('');
}

/**
 * Split-flap departure-board text. Each cell cycles through random glyphs and
 * settles on its final character, staggered left to right, on every text change.
 */
export const FlapText = memo(function FlapText({ text, cells = 30, className = '' }: FlapTextProps) {
  const target = useMemo(() => toCells(text, cells), [text, cells]);
  const [state, setState] = useState<FlapCell[]>(() => target.map((ch) => ({ ch, flip: 0 })));
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    let spins = target.map((_, i) => 5 + Math.floor(Math.random() * 7) + Math.floor(i * 0.5));
    const id = window.setInterval(() => {
      spins = spins.map((v) => Math.max(0, v - 1));
      setState(target.map((ch, i) => ({
        ch: spins[i] > 0 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : ch,
        flip: spins[i] > 0 ? 1000 - spins[i] : 0,
      })));
      if (spins.every((v) => v === 0)) window.clearInterval(id);
    }, 42);
    return () => window.clearInterval(id);
  }, [target]);

  return (
    <div
      className={`flex items-stretch gap-[3px] overflow-hidden whitespace-nowrap ${className}`}
      role="text"
      aria-label={text}
    >
      {state.map((c, i) => (
        <span
          key={`${i}-${c.flip}`}
          className="flap-cell"
          style={{ animationDelay: `${Math.min(i, 14) * 26}ms` }}
        >
          {c.ch === ' ' ? '\u00A0' : c.ch}
        </span>
      ))}
    </div>
  );
});
