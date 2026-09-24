import React, { useState } from 'react';
import { Play, Pause, Disc, Volume2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Vinyl3DTurntableProps {
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  albumArt?: string | null;
  songTitle?: string;
  artistName?: string;
  className?: string;
}

export function Vinyl3DTurntable({
  isPlaying = false,
  onTogglePlay,
  albumArt,
  songTitle = 'SyncBeat Music',
  artistName = 'Live Synced Audio',
  className = '',
}: Vinyl3DTurntableProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-black/95 border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 perspective-1000 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dynamic 3D Aura Ambient Glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-2xl pointer-events-none" />

      {/* Turntable Deck Frame */}
      <div className="relative w-full max-w-[340px] sm:max-w-[400px] aspect-square rounded-2xl bg-gradient-to-br from-[#121824] via-[#0b0f19] to-[#04060b] p-6 border border-white/10 shadow-2xl preserve-3d overflow-hidden">
        {/* Corner metallic rivets */}
        <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
        <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
        <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />

        {/* Pitch / Power LED Light */}
        <div className="absolute top-4 right-12 flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-cyan-400 shadow-[0_0_10px_#00d4d4] animate-pulse' : 'bg-rose-500/50'}`} />
          <span className="text-[10px] uppercase tracking-wider font-mono text-white/40">33 RPM</span>
        </div>

        {/* Platter Base */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-black p-3 shadow-2xl flex items-center justify-center border border-white/10">
          {/* Vinyl Record */}
          <div
            className={`relative w-full h-full rounded-full vinyl-grooves flex items-center justify-center cursor-pointer transition-all duration-300 ${
              isPlaying ? 'animate-vinyl-spin' : 'animate-vinyl-spin-paused'
            }`}
            onClick={onTogglePlay}
            style={{
              boxShadow: isPlaying
                ? '0 0 35px rgba(0, 212, 212, 0.35), inset 0 0 15px rgba(255, 255, 255, 0.1)'
                : '0 0 15px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Vinyl grooved sheen reflection overlay */}
            <div className="absolute inset-0 rounded-full vinyl-reflection pointer-events-none" />

            {/* Album Center Label */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-slate-900 bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex flex-col items-center justify-center p-2 text-center overflow-hidden shadow-lg">
              {albumArt ? (
                <img
                  src={albumArt}
                  alt={songTitle}
                  className="absolute inset-0 w-full h-full object-cover rounded-full"
                />
              ) : (
                <Disc className="w-8 h-8 text-white/90 animate-spin-slow mb-1" />
              )}
              <div className="relative z-10 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full w-full max-w-[90%] truncate">
                <p className="text-[11px] font-bold text-white truncate">{songTitle}</p>
                <p className="text-[9px] text-cyan-300 truncate">{artistName}</p>
              </div>

              {/* Spindle Center Hole */}
              <div className="absolute w-4 h-4 rounded-full bg-slate-950 border-2 border-slate-700 shadow-inner z-20" />
            </div>
          </div>

          {/* 3D Metallic Tonearm Arm */}
          <div
            className={`absolute top-2 right-4 w-28 h-40 pointer-events-none transition-transform duration-700 origin-top-right z-30 ${
              isPlaying ? 'rotate-[-12deg]' : 'rotate-[-45deg]'
            }`}
          >
            {/* Pivot base */}
            <div className="absolute top-0 right-0 w-9 h-9 rounded-full bg-gradient-to-b from-slate-600 to-slate-800 border border-slate-400 shadow-lg flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-slate-400 border border-slate-200" />
            </div>
            {/* Arm rod */}
            <div className="absolute top-4 right-4 w-24 h-2 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500 rounded-full transform -rotate-45 shadow-md" />
            {/* Needle Cartridge head */}
            <div className="absolute bottom-2 left-0 w-6 h-4 bg-cyan-500 rounded-sm border border-cyan-300 shadow-[0_0_10px_#00d4d4]" />
          </div>

          {/* Audio Ripple Waves radiating from needle point */}
          {isPlaying && (
            <div className="absolute bottom-12 right-16 pointer-events-none">
              <motion.div
                animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="w-8 h-8 rounded-full border-2 border-cyan-400 shadow-[0_0_12px_#00d4d4]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Turntable Control Deck Footer */}
      <div className="mt-5 w-full flex items-center justify-between px-2 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <div>
            <h4 className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-[220px]">{songTitle}</h4>
            <p className="text-xs text-cyan-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {artistName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Volume2 className="w-3.5 h-3.5" />
          <span>3D STAGE</span>
        </div>
      </div>
    </div>
  );
}
