import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  onReady: () => void;
  remoteState: { action: 'play' | 'pause' | 'seek'; currentTime: number; timestamp: number } | null;
  isHost: boolean;
}

export function YouTubePlayer({
  videoId,
  onPlay,
  onPause,
  onReady,
  remoteState,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(!!window.YT?.Player);
  const internalStateChangeRef = useRef(false);
  const lastBroadcastRef = useRef(0);

  // Load IFrame API
  useEffect(() => {
    if (window.YT?.Player) { setIsApiReady(true); return; }
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      setIsApiReady(true);
    };
    const poll = setInterval(() => {
      if (window.YT?.Player) { setIsApiReady(true); clearInterval(poll); }
    }, 200);
    return () => clearInterval(poll);
  }, []);

  // Initialize Player
  useEffect(() => {
    if (!isApiReady || !wrapperRef.current || !videoId) return;

    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
    }

    // Clear wrapper
    wrapperRef.current.innerHTML = '';
    const playerDiv = document.createElement('div');
    wrapperRef.current.appendChild(playerDiv);

    playerRef.current = new window.YT.Player(playerDiv, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 1,
        disablekb: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        fs: 1,
        iv_load_policy: 3,
      },
      events: {
        onReady: (e: any) => {
          // Ensure iframe fills container
          const iframe = e.target.getIframe();
          if (iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.position = 'absolute';
            iframe.style.inset = '0';
          }
          onReady();
        },
        onStateChange: (event: any) => {
          if (internalStateChangeRef.current) {
            internalStateChangeRef.current = false;
            return;
          }
          const now = Date.now();
          if (now - lastBroadcastRef.current < 400) return;
          lastBroadcastRef.current = now;
          const currentTime = playerRef.current?.getCurrentTime?.() ?? 0;
          if (event.data === window.YT.PlayerState.PLAYING) onPlay(currentTime);
          else if (event.data === window.YT.PlayerState.PAUSED) onPause(currentTime);
        }
      }
    });

    return () => {
      try { playerRef.current?.destroy(); playerRef.current = null; } catch {}
    };
  }, [isApiReady, videoId]);

  // Apply remote state
  useEffect(() => {
    if (!playerRef.current || !remoteState || typeof playerRef.current.getPlayerState !== 'function') return;
    internalStateChangeRef.current = true;
    const state = playerRef.current.getPlayerState();
    if (remoteState.action === 'play' && state !== window.YT.PlayerState.PLAYING) {
      const latency = (Date.now() - remoteState.timestamp) / 1000;
      const target = remoteState.currentTime + latency;
      if (Math.abs(playerRef.current.getCurrentTime() - target) > 1) playerRef.current.seekTo(target, true);
      playerRef.current.playVideo();
    } else if (remoteState.action === 'pause' && state !== window.YT.PlayerState.PAUSED) {
      playerRef.current.seekTo(remoteState.currentTime, true);
      playerRef.current.pauseVideo();
    } else if (remoteState.action === 'seek') {
      playerRef.current.seekTo(remoteState.currentTime, true);
    }
  }, [remoteState]);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 bg-black"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
