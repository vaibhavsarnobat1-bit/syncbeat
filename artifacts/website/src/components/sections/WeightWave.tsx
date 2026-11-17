import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * WeightWave — a spring‑driven travelling sound wave (designbookmark style).
 *
 * A smooth phase advances at 60fps so the peaks travel across the row
 * like a real audio waveform. Each bar chases its target height with a
 * weighted spring (stiffness 170 / damping 26), so bars overshoot a
 * little and settle instead of snapping — the classic bouncy "weighted"
 * feel that makes the wave look alive.
 */

const BAR_COUNT = 22;
const MIN_H = 10;
const MAX_H = 78;
const STIFFNESS = 170;
const DAMPING = 26;
const MASS = 0.9;
const PHASE_STEP = 0.11;

export function WeightWave({ className = "" }: { className?: string }) {
  const [phase, setPhase] = useState(0);

  // Smooth 60fps phase advance → continuous travelling wave.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setPhase((p) => p + PHASE_STEP);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const heightFor = (index: number) => {
    const s = Math.sin(phase + index * 0.62);
    return MIN_H + ((s + 1) / 2) * (MAX_H - MIN_H);
  };

  return (
    <div
      className={`flex items-end justify-center gap-[5px] h-20 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const h = heightFor(i);
        return (
          <motion.span
            key={i}
            className="w-2 sm:w-2.5 rounded-full bg-gradient-to-t from-[#06b6d4] via-[#38bdf8] to-[#818cf8] shadow-[0_0_12px_rgba(56,189,248,0.55)]"
            initial={{ height: 5, opacity: 0 }}
            animate={{ height: h, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: STIFFNESS,
              damping: DAMPING,
              mass: MASS,
            }}
          />
        );
      })}
    </div>
  );
}
