import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';

interface BootBlockedProps {
  onRetry: () => void;
  onOpenAnyway: () => void;
}

/**
 * Rendered only when the backend never answered the warm-up probes — the free
 * hosting tier sleeps, so a cold start used to leave the visitor on a dead page.
 */
export default function BootBlocked({ onRetry, onOpenAnyway }: BootBlockedProps) {
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="splash">
      <div className="splash-disc" />
      <div className="splash-halo" />
      <BrandMark variant="intro" size={104} title="SyncBeat" className="relative" />
      <p className="splash-tag">Server is still waking up</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        <button
          onClick={() => { setRetrying(true); onRetry(); }}
          disabled={retrying}
          style={{
            padding: '11px 22px', borderRadius: 999, border: '1px solid rgba(34,211,238,0.45)',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.9), rgba(99,102,241,0.9))',
            color: '#04060e', fontWeight: 800, fontSize: 13, letterSpacing: '0.04em',
            cursor: retrying ? 'default' : 'pointer', opacity: retrying ? 0.6 : 1,
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {retrying ? 'Trying…' : 'TRY AGAIN'}
        </button>
        <button
          onClick={onOpenAnyway}
          style={{
            padding: '11px 22px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.78)',
            fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          OPEN ANYWAY
        </button>
      </div>
    </div>
  );
}
