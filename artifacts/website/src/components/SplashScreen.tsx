import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<'show' | 'fadeout'>('show');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fadeout'), 1200);
    const t2 = setTimeout(() => onDone(), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#060708',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.4s ease',
        opacity: phase === 'fadeout' ? 0 : 1,
        pointerEvents: phase === 'fadeout' ? 'none' : 'all',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Glow rings + Logo — responsive using vmin so it looks great on any screen */}
      <div style={{ position: 'relative', width: 'min(130px, 30vmin)', height: 'min(130px, 30vmin)', marginBottom: 'min(24px, 5vmin)' }}>
        <div
          style={{
            position: 'absolute',
            inset: '-12%',
            borderRadius: '50%',
            border: '2px solid rgba(6,182,212,0.2)',
            animation: 'splash-pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '-5%',
            borderRadius: '50%',
            border: '1.5px solid rgba(6,182,212,0.35)',
            animation: 'splash-pulse 1.5s ease-in-out infinite 0.3s',
          }}
        />
        <img
          src="/logo.png"
          alt="SyncBeat"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '22%',
            objectFit: 'cover',
            boxShadow: '0 0 60px rgba(6,182,212,0.4), 0 0 120px rgba(99,102,241,0.2)',
            animation: 'splash-zoom 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        />
      </div>

      {/* App name */}
      <div style={{ textAlign: 'center', animation: 'splash-fadein 0.5s ease 0.3s both' }}>
        <h1
          style={{
            fontSize: 'clamp(22px, 7vmin, 32px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #fff 0%, #a5f3fc 50%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          SyncBeat
        </h1>
        <p
          style={{
            color: 'rgba(6,182,212,0.7)',
            fontSize: 'clamp(11px, 3vmin, 14px)',
            marginTop: 6,
            fontWeight: 500,
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '0.05em',
          }}
        >
          Listen Together · In Real-Time
        </p>
      </div>

      {/* Loading dots */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 'clamp(24px, 6vmin, 40px)',
          animation: 'splash-fadein 0.5s ease 0.5s both',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'rgba(6,182,212,0.7)',
              animation: `splash-dot 1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-zoom {
          0%   { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes splash-fadein {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.5; }
          50%       { transform: scale(1.08); opacity: 1; }
        }
        @keyframes splash-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
