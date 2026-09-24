import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Reaction3DItem {
  id: string;
  emoji: string;
  xPct: number;
  scale: number;
  rotation: number;
  duration: number;
}

interface Reaction3DEmitterProps {
  reactions?: Reaction3DItem[];
  onRemove?: (id: string) => void;
}

export function Reaction3DEmitter({ reactions = [], onRemove }: Reaction3DEmitterProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden perspective-1000">
      <AnimatePresence>
        {reactions.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              opacity: 0,
              y: '100vh',
              x: `${item.xPct}%`,
              scale: 0.2,
              rotateX: -45,
              rotateY: 0,
              rotateZ: item.rotation,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: '-20vh',
              x: [`${item.xPct}%`, `${item.xPct + (Math.random() * 16 - 8)}%`, `${item.xPct}%`],
              scale: [0.2, item.scale, item.scale * 1.2],
              rotateX: [0, 20, -20],
              rotateY: [0, 45, 90],
              rotateZ: item.rotation + 360,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: item.duration,
              ease: 'easeOut',
            }}
            onAnimationComplete={() => onRemove?.(item.id)}
            className="absolute bottom-0 text-4xl sm:text-5xl select-none filter drop-shadow-[0_10px_20px_rgba(0,212,212,0.6)]"
            style={{
              left: 0,
              transformStyle: 'preserve-3d',
            }}
          >
            {item.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
