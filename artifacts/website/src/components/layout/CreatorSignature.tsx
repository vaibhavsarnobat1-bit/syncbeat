import React from 'react';
import { Sparkles, Mail, ExternalLink } from 'lucide-react';

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.889-9.888 9.889m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

interface CreatorSignatureProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export function CreatorSignature({ className = "", variant = 'full' }: CreatorSignatureProps) {
  const WHATSAPP_NUMBER = "7248949501";
  const WHATSAPP_LINK = "https://wa.me/917248949501?text=Hi%20Vaibhav!%20Connecting%20with%20you%20from%20SyncBeat.";
  const EMAIL = "vaibhavsarnobat1@gmail.com";
  const LINKEDIN_LINK = "https://www.linkedin.com/in/vaibhav-sarnobat-4704052aa?utm_source=share_via&utm_content=profile&utm_medium=member_android";

  return (
    <div className={`w-full flex flex-col items-center justify-center gap-6 ${className}`}>
      
      {/* 🌟 Top Made By Vaibhav Glowing Pill 🌟 */}
      <div className="relative group cursor-default">
        {/* Animated Background Aura */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/35 via-blue-500/35 to-emerald-400/35 rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse" />
        
        {/* Glass Container */}
        <div className="relative flex items-center gap-3 px-6 sm:px-8 py-2.5 rounded-full bg-[#080d1e]/95 backdrop-blur-2xl border border-cyan-400/40 text-slate-300 shadow-[0_0_25px_rgba(34,211,238,0.15)] transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-300/80">
          <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-500" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Made by
          </span>
          
          {/* Glowing Name */}
          <span className="font-black text-sm sm:text-base tracking-widest uppercase bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(56,189,248,0.7)] group-hover:drop-shadow-[0_0_22px_rgba(56,189,248,0.95)] transition-all">
            Vaibhav Sarnobat
          </span>

          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse ml-0.5" />
        </div>
      </div>

      {/* 🌟 Direct Connect Action Buttons with Glowing Sticks 🌟 */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl px-2">

        {/* 📱 WHATSAPP / CONTACT NUMBER */}
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] hover:from-emerald-500/20 hover:to-emerald-900/30 border border-emerald-500/30 hover:border-emerald-400/80 backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] cursor-pointer"
          title="Click to chat directly on WhatsApp (+91 7248949501)"
        >
          {/* 🟢 Neon Stick in front */}
          <span className="w-1.5 h-6 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] group-hover:scale-y-110 transition-transform duration-300" />

          {/* WhatsApp Sticker Icon */}
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <WhatsAppIcon className="w-4 h-4" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              WhatsApp / Call
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors tracking-wide">
              {WHATSAPP_NUMBER}
            </span>
          </div>
        </a>

        {/* Separator Stick */}
        <span className="hidden sm:inline-block w-px h-7 bg-white/20" />

        {/* ✉️ EMAIL LINK */}
        <a
          href={`mailto:${EMAIL}`}
          className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] hover:from-sky-500/20 hover:to-cyan-900/30 border border-sky-500/30 hover:border-sky-400/80 backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_24px_rgba(56,189,248,0.35)] cursor-pointer"
          title={`Click to email ${EMAIL}`}
        >
          {/* 🔵 Neon Stick in front */}
          <span className="w-1.5 h-6 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8] group-hover:scale-y-110 transition-transform duration-300" />

          {/* Mail Sticker Icon */}
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-400 group-hover:bg-sky-400 group-hover:text-black transition-colors duration-300 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
            <Mail className="w-4 h-4" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] text-sky-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              Email
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-sky-300 transition-colors tracking-wide">
              {EMAIL}
            </span>
          </div>
        </a>

        {/* Separator Stick */}
        <span className="hidden sm:inline-block w-px h-7 bg-white/20" />

        {/* 💼 LINKEDIN PROFILE */}
        <a
          href={LINKEDIN_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] hover:from-blue-600/25 hover:to-indigo-950/40 border border-blue-500/30 hover:border-blue-400/80 backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_24px_rgba(59,130,246,0.35)] cursor-pointer"
          title="View Vaibhav's LinkedIn Profile"
        >
          {/* 🔷 Neon Stick in front */}
          <span className="w-1.5 h-6 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] group-hover:scale-y-110 transition-transform duration-300" />

          {/* LinkedIn Sticker Icon */}
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
            <LinkedInIcon className="w-4 h-4" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              LinkedIn
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-blue-300 transition-colors tracking-wide">
              Vaibhav Sarnobat
            </span>
          </div>
        </a>

      </div>

    </div>
  );
}
