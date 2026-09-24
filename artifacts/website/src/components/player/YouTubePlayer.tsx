import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface PlayerControls {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  onReady: () => void;
  onEnded?: () => void;
  remoteState: { action: 'play' | 'pause' | 'seek' | 'sync_tick'; currentTime: number; timestamp: number } | null;
  isHost: boolean;
  getTimeRef?: React.MutableRefObject<(() => number) | null>;
  playerControlRef?: React.MutableRefObject<PlayerControls | null>;
}

export function YouTubePlayer({
  videoId,
  isPlaying,
  onPlay,
  onPause,
  onReady,
  onEnded,
  remoteState,
  getTimeRef,
  playerControlRef,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(!!window.YT?.Player);
  const remoteLockUntilRef = useRef<number>(0);
  const lastReportedStateRef = useRef<'play' | 'pause' | null>(null);
  const currentVideoIdRef = useRef<string>(videoId);
  const [embedError, setEmbedError] = useState<number | null>(null);

  // Expose imperative control functions (Play/Pause/Seek) for instant 0ms response
  useEffect(() => {
    if (playerControlRef) {
      playerControlRef.current = {
        playVideo: () => {
          remoteLockUntilRef.current = Date.now() + 1200;
          lastReportedStateRef.current = 'play';
          try {
            playerRef.current?.playVideo?.();
          } catch {}
        },
        pauseVideo: () => {
          remoteLockUntilRef.current = Date.now() + 1200;
          lastReportedStateRef.current = 'pause';
          try {
            playerRef.current?.pauseVideo?.();
          } catch {}
        },
        seekTo: (sec: number) => {
          remoteLockUntilRef.current = Date.now() + 1200;
          try {
            playerRef.current?.seekTo?.(sec, true);
          } catch {}
        },
        getCurrentTime: () => {
          try {
            return playerRef.current?.getCurrentTime?.() ?? 0;
          } catch {
            return 0;
          }
        },
      };
    }
    return () => {
      if (playerControlRef) playerControlRef.current = null;
    };
  }, [playerControlRef]);

  // Expose real-time player timestamp getter to parent component
  useEffect(() => {
    if (getTimeRef) {
      getTimeRef.current = () => {
        try {
          return playerRef.current?.getCurrentTime?.() ?? 0;
        } catch {
          return 0;
        }
      };
    }
    return () => {
      if (getTimeRef) getTimeRef.current = null;
    };
  }, [getTimeRef]);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (window.YT?.Player) {
      setIsApiReady(true);
      return;
    }
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
      if (window.YT?.Player) {
        setIsApiReady(true);
        clearInterval(poll);
      }
    }, 150);
    return () => clearInterval(poll);
  }, []);

  // Initialize or Fast-Swap Player on videoId change
  useEffect(() => {
    if (!isApiReady || !videoId) return;

    // ⚡ ULTRA-FAST TRACK SWITCH (< 300ms):
    // If player already exists, reuse the iframe and call loadVideoById!
    // This eliminates 3-4 seconds of DOM destruction & iframe reconstruction!
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      if (currentVideoIdRef.current !== videoId) {
        currentVideoIdRef.current = videoId;
        remoteLockUntilRef.current = Date.now() + 1500;
        lastReportedStateRef.current = isPlaying ? 'play' : 'pause';
        // Reset any previous embed error for the new video
        setEmbedError(null);
        if (isPlaying) {
          playerRef.current.loadVideoById({
            videoId,
            startSeconds: 0,
          });
        } else {
          playerRef.current.cueVideoById({
            videoId,
            startSeconds: 0,
          });
        }
      }
      return;
    }

    if (!wrapperRef.current) return;

    setEmbedError(null);
    currentVideoIdRef.current = videoId;
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
        enablejsapi: 1,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
      events: {
        onError: (event: any) => {
          console.warn('[YouTubePlayer] Error code:', event.data);
          setEmbedError(event.data);
        },
        onReady: (e: any) => {
          const iframe = e.target.getIframe();
          if (iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.position = 'absolute';
            iframe.style.inset = '0';
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('allowfullscreen', 'true');
          }
          onReady();
        },
        onStateChange: (event: any) => {
          // Track auto-ended: notify room
          if (event.data === window.YT.PlayerState.ENDED) {
            onEnded?.();
            return;
          }

          // Suppress local echo during remote command lockout window
          if (Date.now() < remoteLockUntilRef.current) {
            return;
          }

          const currentTime = playerRef.current?.getCurrentTime?.() ?? 0;

          if (event.data === window.YT.PlayerState.PLAYING) {
            if (lastReportedStateRef.current !== 'play') {
              lastReportedStateRef.current = 'play';
              onPlay(currentTime);
            }
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            // CRITICAL: When user switches apps or minimizes browser, document.hidden becomes true.
            // On mobile browsers, YouTube iframe automatically fires PAUSED.
            // We MUST NOT broadcast pause to other devices just because one user switched to WhatsApp or background!
            if (typeof document !== 'undefined' && document.hidden) {
              return;
            }
            if (lastReportedStateRef.current !== 'pause') {
              lastReportedStateRef.current = 'pause';
              onPause(currentTime);
            }
          }
        },
      },
    });

    return () => {
      // Cleanup on unmount only
    };
  }, [isApiReady, videoId, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        playerRef.current?.destroy?.();
        playerRef.current = null;
      } catch {}
    };
  }, []);

  // 🎯 ZERO-DRIFT REMOTE STATE & HEARTBEAT SYNC
  useEffect(() => {
    if (!playerRef.current || !remoteState || typeof playerRef.current.getPlayerState !== 'function') return;

    const state = playerRef.current.getPlayerState();

    if (remoteState.action === 'pause') {
      // 1. Immediately cut audio & pause with 0ms delay on all devices
      remoteLockUntilRef.current = Date.now() + 1200;
      lastReportedStateRef.current = 'pause';
      try {
        playerRef.current.pauseVideo();
      } catch {}
      // 2. Snap to exact remote paused timestamp frame if drift > 0.35s
      if (typeof remoteState.currentTime === 'number') {
        const current = playerRef.current.getCurrentTime?.() ?? 0;
        if (Math.abs(current - remoteState.currentTime) > 0.35) {
          try {
            playerRef.current.seekTo(remoteState.currentTime, true);
          } catch {}
        }
      }
    } else if (remoteState.action === 'play') {
      // 1. Calculate ultra-precise network latency compensation
      remoteLockUntilRef.current = Date.now() + 1200;
      lastReportedStateRef.current = 'play';
      const latency = Math.max(0, (Date.now() - (remoteState.timestamp || Date.now())) / 1000);
      const target = (remoteState.currentTime || 0) + (latency < 3 ? latency : 0);
      const current = playerRef.current.getCurrentTime?.() ?? 0;

      // Frame align if drift > 200ms
      if (Math.abs(current - target) > 0.2) {
        try {
          playerRef.current.seekTo(target, true);
        } catch {}
      }
      try {
        playerRef.current.playVideo();
      } catch {}
    } else if (remoteState.action === 'seek') {
      remoteLockUntilRef.current = Date.now() + 1200;
      try {
        playerRef.current.seekTo(remoteState.currentTime || 0, true);
      } catch {}
    } else if (remoteState.action === 'sync_tick') {
      // 🔄 CONTINUOUS HEARTBEAT AUTO-ALIGNMENT
      // If playing, check drift against calculated expected time:
      if (isPlaying && state === window.YT.PlayerState.PLAYING) {
        const latency = Math.max(0, (Date.now() - (remoteState.timestamp || Date.now())) / 1000);
        const expected = remoteState.currentTime + (latency < 3 ? latency : 0);
        const current = playerRef.current.getCurrentTime?.() ?? 0;
        const drift = Math.abs(current - expected);

        // Auto-correct if drift exceeds 300ms
        if (drift > 0.3) {
          remoteLockUntilRef.current = Date.now() + 800;
          try {
            playerRef.current.seekTo(expected, true);
          } catch {}
        }
      }
    }
  }, [remoteState, isPlaying]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black group">
      {/* YouTube iframe wrapper */}
      <div
        ref={wrapperRef}
        className="absolute inset-0 bg-black"
        style={{ width: '100%', height: '100%' }}
      />

      {/* ⚠️ Embed Error Overlay: shown when video can't be embedded (error 101/150 = embedding disabled by owner) */}
      {embedError !== null && (
        <div className="absolute inset-0 z-30 bg-[#060708] flex flex-col items-center justify-center text-center p-4 sm:p-6">
          <div className="text-4xl mb-4">🎵</div>
          <h3 className="text-white font-bold text-sm sm:text-base mb-2">
            This video can't play here
          </h3>
          <p className="text-slate-400 text-xs mb-5 max-w-xs leading-relaxed">
            The video owner has disabled embedding. You can watch it directly on YouTube, or try a different song.
          </p>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors shadow-lg shadow-red-500/20"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M23.5 6.5s-.3-2-1.2-2.9c-1.1-1.2-2.4-1.2-3-1.3C16.8 2.1 12 2 12 2s-4.8.1-7.3.3c-.6.1-1.9.1-3 1.3C.8 4.5.5 6.5.5 6.5S.2 8.8.2 11v2.1c0 2.2.3 4.5.3 4.5s.3 2 1.2 2.9c1.1 1.2 2.6 1.1 3.3 1.2C7.2 21.9 12 22 12 22s4.8-.1 7.3-.3c.6-.1 1.9-.1 3-1.3.9-.9 1.2-2.9 1.2-2.9s.3-2.2.3-4.5V11c0-2.2-.3-4.5-.3-4.5zM9.7 15.5V8.4l6.6 3.6-6.6 3.5z"/></svg>
            Watch on YouTube
          </a>
        </div>
      )}

      {/* Top Bar Click Shield: Blocks YouTube title & channel link redirects */}
      {!embedError && (
        <div
          className="absolute top-0 left-0 right-16 h-14 z-20 pointer-events-auto bg-transparent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="SyncBeat Player"
        />
      )}

      {/* Bottom-Right YouTube Logo & 'More Videos' Click Shield */}
      {!embedError && (
        <div
          className="absolute bottom-0 right-12 w-64 h-14 z-20 pointer-events-auto bg-transparent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {/* Paused Screen Overlay: Shields YouTube 'More Videos' grid & allows instant 1-click resume */}
      {!isPlaying && !embedError && (
        <div
          className="absolute inset-x-0 top-14 bottom-14 z-20 cursor-pointer flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all hover:bg-black/30"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastReportedStateRef.current = 'play';
            const cur = playerRef.current?.getCurrentTime?.() ?? 0;
            onPlay(cur);
            if (playerRef.current?.playVideo) {
              playerRef.current.playVideo();
            }
          }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-110 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-cyan-500/50 border border-white/30 transform transition-all">
            <svg className="w-8 h-8 ml-1 fill-current text-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
