import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroMusicScene3DProps {
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  className?: string;
}

// Floating music note
function FloatingNote({ note, delay, x, y, size, color }: {
  note: string; delay: number; x: number; y: number; size: number; color: string;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none font-bold z-20"
      style={{ left: `${x}%`, top: `${y}%`, fontSize: size, color, textShadow: `0 0 20px ${color}` }}
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.95, 0.95, 0],
        y: [-10, -55, -100, -150],
        scale: [0.5, 1.1, 0.95, 0.4],
        x: [0, 12, -8, 18],
        rotate: [0, 12, -8, 5],
      }}
      transition={{
        duration: 4.5,
        delay,
        repeat: Infinity,
        repeatDelay: 1.5,
        ease: 'easeOut',
      }}
    >
      {note}
    </motion.div>
  );
}

// Single orbiting glowing dot
function OrbitalDot({ radius, duration, color, dotSize, initialAngle }: {
  radius: number; duration: number; color: string; dotSize: number; initialAngle: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: dotSize,
        height: dotSize,
        backgroundColor: color,
        boxShadow: `0 0 ${dotSize * 3}px ${color}, 0 0 ${dotSize * 6}px ${color}50`,
        top: '50%',
        left: '50%',
        marginTop: -dotSize / 2,
        marginLeft: -dotSize / 2,
      }}
      animate={{
        x: Array.from({ length: 37 }, (_, i) =>
          Math.cos(((initialAngle + i * 10) * Math.PI) / 180) * radius
        ),
        y: Array.from({ length: 37 }, (_, i) =>
          Math.sin(((initialAngle + i * 10) * Math.PI) / 180) * radius * 0.38
        ),
      }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// Canvas: spectrum bars + nebula ambient background
function SpectrumCanvas({ isPlaying }: { isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animId: number;
    let time = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const barCount = 60;
    const barHeights = new Float32Array(barCount).fill(4);

    const render = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      time += 0.018;

      ctx.clearRect(0, 0, w, h);

      // Nebula blobs
      const blobs = [
        { cx: w * 0.28, cy: h * 0.42, r: w * 0.35, c0: 'rgba(6,182,212,0.09)', c1: 'transparent' },
        { cx: w * 0.72, cy: h * 0.52, r: w * 0.3,  c0: 'rgba(168,85,247,0.1)', c1: 'transparent' },
        { cx: w * 0.5,  cy: h * 0.28, r: w * 0.25, c0: 'rgba(56,189,248,0.07)', c1: 'transparent' },
      ];
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r);
        g.addColorStop(0, b.c0); g.addColorStop(1, b.c1);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });

      // Wave line
      ctx.beginPath();
      const wY = h * 0.7;
      for (let x = 0; x <= w; x += 6) {
        const amp = isPlaying ? 20 : 5;
        const y = wY + Math.sin(x * 0.014 + time * 2.2) * amp
                     + Math.cos(x * 0.02 - time * 1.5) * amp * 0.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const wg = ctx.createLinearGradient(0, 0, w, 0);
      wg.addColorStop(0, 'rgba(6,182,212,0.05)');
      wg.addColorStop(0.5, `rgba(56,189,248,${isPlaying ? 0.45 : 0.12})`);
      wg.addColorStop(1, 'rgba(168,85,247,0.05)');
      ctx.strokeStyle = wg;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = isPlaying ? 10 : 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Spectrum bars
      const barW = w * 0.9;
      const sx = (w - barW) / 2;
      const gap = 2.5;
      const bw = Math.max(2, (barW - gap * barCount) / barCount);
      const baseY = h - 4;

      for (let i = 0; i < barCount; i++) {
        const norm = i / barCount;
        const bell = Math.cos(Math.abs(norm - 0.5) * 2 * Math.PI * 0.5);
        let target = 4;
        if (isPlaying) {
          const f = Math.sin(time * 4.5 + i * 0.32) * 0.4
                  + Math.cos(time * 2.8 - i * 0.2) * 0.35
                  + Math.sin(time * 6.5 + i * 0.6) * 0.25;
          target = (f + 1) * 0.5 * h * 0.4 * (0.28 + bell * 0.72) + 5;
        } else {
          target = (Math.sin(time * 1.2 + i * 0.2) * 0.5 + 0.5) * 10 + 4;
        }
        barHeights[i] += (target - barHeights[i]) * 0.2;
        const bh = barHeights[i];
        const bx = sx + i * (bw + gap);
        const by = baseY - bh;

        const g = ctx.createLinearGradient(bx, baseY, bx, by);
        g.addColorStop(0, 'rgba(6,182,212,0.1)');
        g.addColorStop(0.4, 'rgba(99,102,241,0.6)');
        g.addColorStop(0.8, 'rgba(168,85,247,0.8)');
        g.addColorStop(1, 'rgba(236,72,153,0.95)');

        const rad = Math.min(bw / 2, 3);
        ctx.beginPath();
        ctx.moveTo(bx + rad, by);
        ctx.lineTo(bx + bw - rad, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + rad, rad);
        ctx.lineTo(bx + bw, baseY); ctx.lineTo(bx, baseY);
        ctx.lineTo(bx, by + rad);
        ctx.arcTo(bx, by, bx + rad, by, rad);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();

        if (isPlaying && bh > 25) {
          ctx.beginPath();
          ctx.arc(bx + bw / 2, by - 2, Math.min(rad, 2.5), 0, Math.PI * 2);
          ctx.fillStyle = '#a5f3fc';
          ctx.shadowColor = '#00f5d4';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [isPlaying]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

const NOTE_CONFIGS = [
  { note: '♪',  delay: 0,   x: 6,  y: 55, size: 22, color: '#38bdf8' },
  { note: '♫',  delay: 1.3, x: 14, y: 38, size: 18, color: '#c084fc' },
  { note: '🎵', delay: 0.7, x: 82, y: 48, size: 20, color: '#34d399' },
  { note: '♬',  delay: 2.2, x: 87, y: 28, size: 16, color: '#f472b6' },
  { note: '♩',  delay: 1.8, x: 72, y: 65, size: 14, color: '#fbbf24' },
  { note: '🎶', delay: 3.1, x: 22, y: 70, size: 18, color: '#818cf8' },
];

const ORBITAL_PARTICLES = [
  { radius: 128, duration: 6,  color: '#06b6d4', dotSize: 8, initialAngle: 0   },
  { radius: 128, duration: 6,  color: '#a855f7', dotSize: 6, initialAngle: 120 },
  { radius: 128, duration: 6,  color: '#f472b6', dotSize: 5, initialAngle: 240 },
  { radius: 172, duration: 9,  color: '#38bdf8', dotSize: 5, initialAngle: 60  },
  { radius: 172, duration: 9,  color: '#818cf8', dotSize: 7, initialAngle: 205 },
  { radius: 172, duration: 9,  color: '#34d399', dotSize: 4, initialAngle: 315 },
  { radius: 214, duration: 13, color: '#c084fc', dotSize: 4, initialAngle: 30  },
  { radius: 214, duration: 13, color: '#fbbf24', dotSize: 3, initialAngle: 155 },
  { radius: 214, duration: 13, color: '#06b6d4', dotSize: 5, initialAngle: 272 },
];

export function HeroMusicScene3D({ isPlaying = false, onTogglePlay, className = '' }: HeroMusicScene3DProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`relative w-full h-full overflow-visible ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Canvas: nebula + spectrum */}
      <SpectrumCanvas isPlaying={isPlaying} />

      {/* Floating music notes */}
      {NOTE_CONFIGS.map((cfg, i) => <FloatingNote key={i} {...cfg} />)}

      {/* 3D center scene */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '900px' }}>

        {/* Elliptical orbital ring decorations */}
        {[
          { w: 440, h: 440, rx: 72, rz: 0,   color: 'rgba(6,182,212,0.18)' },
          { w: 560, h: 560, rx: 72, rz: 55,  color: 'rgba(168,85,247,0.12)' },
          { w: 680, h: 680, rx: 72, rz: 115, color: 'rgba(244,114,182,0.08)' },
        ].map((ring, i) => (
          <div key={i}
            className="absolute rounded-full border pointer-events-none"
            style={{
              width: ring.w, height: ring.h,
              borderColor: ring.color,
              transform: `rotateX(${ring.rx}deg) rotateZ(${ring.rz}deg)`,
              marginLeft: -ring.w / 2, marginTop: -ring.h / 2,
              left: '50%', top: '50%',
            }}
          />
        ))}

        {/* Orbiting glow particles */}
        <div className="absolute" style={{ width: 0, height: 0, top: '50%', left: '50%' }}>
          {ORBITAL_PARTICLES.map((p, i) => <OrbitalDot key={i} {...p} />)}
        </div>

        {/* Outer halo pulse */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 280, height: 280,
            background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(168,85,247,0.12) 45%, transparent 70%)',
            filter: 'blur(28px)',
          }}
          animate={isPlaying
            ? { scale: [1, 1.18, 1], opacity: [0.65, 1, 0.65] }
            : { scale: 1, opacity: 0.4 }
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ── 3D Vinyl Record ── */}
        <motion.div
          className="relative cursor-pointer z-10"
          onClick={onTogglePlay}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{ transformStyle: 'preserve-3d' }}
          animate={hovered ? { rotateY: 14, rotateX: -7 } : { rotateY: 0, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 190, damping: 18 }}
        >
          {/* The disc itself */}
          <motion.div
            className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center"
            style={{
              background: 'conic-gradient(from 0deg, #0a0a14, #1a1a2e, #111126, #0c0c1a, #0a0a14)',
              boxShadow: isPlaying
                ? '0 0 55px rgba(6,182,212,0.55), 0 0 110px rgba(168,85,247,0.28), inset 0 0 28px rgba(255,255,255,0.06)'
                : '0 20px 55px rgba(0,0,0,0.85), inset 0 0 18px rgba(255,255,255,0.03)',
            }}
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={isPlaying
              ? { duration: 4, repeat: Infinity, ease: 'linear' }
              : { duration: 0.6 }
            }
          >
            {/* Groove rings */}
            {[86, 72, 57, 42].map((pct, i) => (
              <div key={i} className="absolute rounded-full border"
                style={{ width: `${pct}%`, height: `${pct}%`, borderColor: `rgba(255,255,255,${0.025 + i * 0.012})` }} />
            ))}

            {/* Vinyl shine */}
            <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
              <div className="absolute inset-0 rounded-full"
                style={{ background: 'conic-gradient(from 40deg, transparent 0%, rgba(255,255,255,0.06) 18%, transparent 35%)' }} />
            </div>

            {/* Center label — counter-rotates to stay readable */}
            <motion.div
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center overflow-hidden border-[3px] border-slate-900"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 35%, #8b5cf6 68%, #ec4899 100%)',
                boxShadow: '0 0 22px rgba(6,182,212,0.65)',
              }}
              animate={isPlaying ? { rotate: -360 } : { rotate: 0 }}
              transition={isPlaying ? { duration: 4, repeat: Infinity, ease: 'linear' } : {}}
            >
              {/* Shine overlay */}
              <div className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle at 32% 32%, rgba(255,255,255,0.32) 0%, transparent 58%)' }} />
              {/* Spindle hole */}
              <div className="absolute w-4 h-4 rounded-full bg-slate-950 border-2 border-slate-700 z-10" />
            </motion.div>

            {/* Tonearm needle */}
            <motion.div
              className="absolute top-2.5 right-4 origin-top-right z-30 pointer-events-none"
              animate={{ rotate: isPlaying ? -16 : -52 }}
              transition={{ duration: 0.85, type: 'spring', stiffness: 110, damping: 14 }}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-400 to-slate-700 border border-slate-300 shadow-xl flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-100" />
              </div>
              <div className="absolute top-3.5 right-3 w-18 h-1.5 rounded-full -rotate-[40deg] origin-right"
                style={{ width: 68, background: 'linear-gradient(90deg,#94a3b8,#f1f5f9,#94a3b8)' }} />
              {isPlaying && (
                <motion.div className="absolute -bottom-1 -left-0.5 w-3 h-3 rounded-sm"
                  style={{ background: '#06b6d4', boxShadow: '0 0 14px #06b6d4, 0 0 28px #06b6d4' }}
                  animate={{ opacity: [1, 0.45, 1] }}
                  transition={{ duration: 0.75, repeat: Infinity }}
                />
              )}
            </motion.div>

            {/* Ripple rings when playing */}
            <AnimatePresence>
              {isPlaying && [0, 0.65, 1.3].map(d => (
                <motion.div key={d}
                  className="absolute rounded-full border-2 pointer-events-none"
                  style={{ borderColor: 'rgba(6,182,212,0.5)' }}
                  initial={{ width: 56, height: 56, opacity: 0.85 }}
                  animate={{ width: 280, height: 280, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.8, delay: d, repeat: Infinity, ease: 'easeOut' }}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Play/Pause tooltip */}
          <motion.div
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-1.5 rounded-full text-xs font-bold text-white/90 bg-black/70 backdrop-blur-xl border border-white/20 shadow-lg">
              {isPlaying ? '⏸ Pause Preview' : '▶ Play Preview'}
            </div>
          </motion.div>
        </motion.div>

      </div>

      {/* Bottom gradient fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #05070e 0%, transparent 100%)' }} />
    </div>
  );
}
