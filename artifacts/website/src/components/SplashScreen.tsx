import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { FlapText } from '@/components/room/FlapText';

interface SplashScreenProps {
  onDone: () => void;
}

const TAGLINE = 'LISTEN · LEARN · GROW';

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [tagline, setTagline] = useState('');

  /* FlapText only flaps when its text changes, so the tagline is fed in one beat late. */
  useEffect(() => {
    const t = window.setTimeout(() => setTagline(TAGLINE), 1150);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), 2250);
    const done = window.setTimeout(onDone, 2800);
    return () => { window.clearTimeout(out); window.clearTimeout(done); };
  }, [onDone]);

  return (
    <div className={`splash${leaving ? ' is-leaving' : ''}`}>
      <div className="splash-disc" aria-hidden="true" />
      <div className="splash-halo" aria-hidden="true" />

      <div className="splash-copy">
        <BrandMark
          variant="intro"
          size={132}
          title="SyncBeat"
          className="relative"
        />

        <div className="splash-word">
          <h1>SyncBeat</h1>
        </div>

        <div className="splash-tag" aria-label={TAGLINE}>
          {tagline && <FlapText text={tagline} cells={TAGLINE.length} className="text-[13px] sm:text-[15px]" />}
        </div>

        <div className="splash-meter" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
