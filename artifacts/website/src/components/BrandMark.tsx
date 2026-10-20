import { useId } from 'react';

const urlOf = (id: string) => `url(#${id})`;

interface BrandMarkProps {
  /** Rendered size in px (square). */
  size?: number;
  /** `intro` plays the full build-in sequence, `idle` only keeps the living parts looping. */
  variant?: 'intro' | 'idle';
  className?: string;
  /** Extra seconds added to every entrance step — used by the splash to let the ring breathe first. */
  delay?: number;
  title?: string;
}

/**
 * The SyncBeat mark: two listeners under one band, an open book, and the beat they share.
 * Entrance is CSS-keyframed so it survives SSR-free Vite builds and honours reduced-motion.
 */
export function BrandMark({
  size = 48,
  variant = 'idle',
  className = '',
  delay = 0,
  title,
}: BrandMarkProps) {
  const uid = useId().replace(/[:]/g, '');
  const g = (name: string) => `bm-${name}-${uid}`;
  const intro = variant === 'intro';
  const d = (base: number) => ({ animationDelay: `${delay + base}s` });
  const root = intro ? 'bm bm-intro' : 'bm';

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label={title || 'SyncBeat'}
      className={`${root} ${className}`}
      style={{ '--bm-delay': String(delay) } as React.CSSProperties}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={g('band')} x1="20" y1="24" x2="108" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.5" stopColor="#4f8ef7" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={g('cupL')} x1="13" y1="64" x2="32" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={g('cupR')} x1="96" y1="64" x2="115" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={g('figL')} x1="35" y1="46" x2="47" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={g('figR')} x1="69" y1="46" x2="81" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d8b4fe" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={g('pageL')} x1="34" y1="88" x2="64" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id={g('pageR')} x1="64" y1="88" x2="94" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={g('bar')} x1="0" y1="48" x2="0" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a5f3fc" />
        </linearGradient>
        <radialGradient id={g('aura')} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#7c3aed" stopOpacity="0.16" />
          <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* breathing aura behind the mark */}
      <circle className="bm-aura" cx="64" cy="62" r="58" fill={urlOf(g('aura'))} />

      {/* orbiting pulse ring */}
      <circle
        className="bm-ring"
        cx="64"
        cy="64"
        r="52"
        stroke={urlOf(g('band'))}
        strokeOpacity="0.28"
        strokeWidth="1.5"
        strokeDasharray="6 14"
        pathLength={100}
      />

      <g className="bm-float">
        {/* headphone band — drawn on with a dash sweep */}
        <path
          className="bm-band"
          d="M26 74 V64 a38 38 0 0 1 76 0 V74"
          stroke={urlOf(g('band'))}
          strokeWidth="11"
          strokeLinecap="round"
          pathLength={1}
          style={intro ? d(0.15) : undefined}
        />

        <rect className="bm-cup" x="13" y="64" width="19" height="33" rx="9.5" fill={urlOf(g('cupL'))} style={intro ? d(0.55) : undefined} />
        <rect className="bm-cup" x="96" y="64" width="19" height="33" rx="9.5" fill={urlOf(g('cupR'))} style={intro ? d(0.68) : undefined} />

        {/* open book unfolds from the spine */}
        <path className="bm-page bm-page-l" d="M64 97C57.5 90.5 46.5 88 34 90V108c12.5-2 23.5.5 30 7.5z" fill={urlOf(g('pageL'))} style={intro ? d(0.8) : undefined} />
        <path className="bm-page bm-page-r" d="M64 97c6.5-6.5 17.5-9 30-7V108c-12.5-2-23.5.5-30 7.5z" fill={urlOf(g('pageR'))} style={intro ? d(0.9) : undefined} />
        <path className="bm-spine" d="M64 97v18.5" stroke="#020617" strokeOpacity="0.4" strokeWidth="2.2" style={intro ? d(1) : undefined} />

        {/* the two listeners */}
        <g className="bm-fig" style={intro ? d(1.05) : undefined}>
          <circle cx="47" cy="57" r="8.5" fill={urlOf(g('figL'))} />
          <path d="M35 92v-4.5c0-6.6 5.4-12 12-12s12 5.4 12 12V92z" fill={urlOf(g('figL'))} />
        </g>
        <g className="bm-fig" style={intro ? d(1.18) : undefined}>
          <circle cx="81" cy="57" r="8.5" fill={urlOf(g('figR'))} />
          <path d="M69 92v-4.5c0-6.6 5.4-12 12-12s12 5.4 12 12V92z" fill={urlOf(g('figR'))} />
        </g>

        {/* the shared beat — keeps pulsing forever */}
        <g className="bm-bars">
          <rect className="bm-bar bm-bar-1" x="58.6" y="64" width="3.4" height="22" rx="1.7" fill={urlOf(g('bar'))} />
          <rect className="bm-bar bm-bar-2" x="63.3" y="48" width="3.4" height="38" rx="1.7" fill={urlOf(g('bar'))} />
          <rect className="bm-bar bm-bar-3" x="68" y="58" width="3.4" height="28" rx="1.7" fill={urlOf(g('bar'))} />
        </g>
      </g>
    </svg>
  );
}
