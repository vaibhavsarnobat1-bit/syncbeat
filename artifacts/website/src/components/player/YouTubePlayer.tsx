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
  onSkipNext?: () => void;
  remoteState: { action: 'play' | 'pause' | 'seek' | 'sync_tick'; currentTime: number; timestamp: number } | null;
  isHost: boolean;
  getTimeRef?: React.MutableRefObject<(() => number) | null>;
  playerControlRef?: React.MutableRefObject<PlayerControls | null>;
  trackTitle?: string;
  trackThumbnail?: string;
}

export function YouTubePlayer({
  videoId,
  isPlaying,
  onPlay,
  onPause,
  onReady,
  onEnded,
  onSkipNext,
  remoteState,
  getTimeRef,
  playerControlRef,
  trackTitle,
  trackThumbnail,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(!!window.YT?.Player);
  const remoteLockUntilRef = useRef<number>(0);
  const lastReportedStateRef = useRef<'play' | 'pause' | null>(null);
  const currentVideoIdRef = useRef<string>(videoId);
  const [embedError, setEmbedError] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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
          try {
            if (isPlaying) {
              e.target.playVideo();
            }
          } catch {}
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

  // Reactively sync isPlaying boolean with YouTube player
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.getPlayerState !== 'function') return;
    try {
      const state = playerRef.current.getPlayerState();
      if (isPlaying && state !== window.YT.PlayerState.PLAYING && state !== window.YT.PlayerState.BUFFERING) {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === window.YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
      }
    } catch {}
  }, [isPlaying]);

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
      remoteLockUntilRef.current = Date.now() + 1000;
      lastReportedStateRef.current = 'play';
      const latency = Math.max(0, (Date.now() - (remoteState.timestamp || Date.now())) / 1000);
      const target = (remoteState.currentTime || 0) + (latency < 2 ? latency : 0);
      const current = playerRef.current.getCurrentTime?.() ?? 0;

      // Frame align immediately if drift > 120ms to eliminate delay
      if (Math.abs(current - target) > 0.12) {
        try {
          playerRef.current.seekTo(target, true);
        } catch {}
      }
      try {
        playerRef.current.playVideo();
      } catch {}
    } else if (remoteState.action === 'seek') {
      remoteLockUntilRef.current = Date.now() + 1000;
      try {
        playerRef.current.seekTo(remoteState.currentTime || 0, true);
      } catch {}
    } else if (remoteState.action === 'sync_tick') {
      // 🔄 CONTINUOUS HEARTBEAT AUTO-ALIGNMENT
      // If playing, check drift against calculated expected time:
      if (isPlaying && state === window.YT.PlayerState.PLAYING) {
        const latency = Math.max(0, (Date.now() - (remoteState.timestamp || Date.now())) / 1000);
        const expected = remoteState.currentTime + (latency < 2 ? latency : 0);
        const current = playerRef.current.getCurrentTime?.() ?? 0;
        const drift = Math.abs(current - expected);

        // Auto-correct if drift exceeds 180ms so other device catches up instantly
        if (drift > 0.18) {
          remoteLockUntilRef.current = Date.now() + 600;
          try {
            playerRef.current.seekTo(expected, true);
          } catch {}
        }
      }
    }
  }, [remoteState, isPlaying]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black group">
      {/* YouTube iframe wrapper */}
      <div
        ref={wrapperRef}
        className="absolute inset-0 bg-black"
        style={{ width: '100%', height: '100%' }}
      />

      {/* ⚠️ Embed Error Overlay: shown when video can't be embedded */}
      {embedError !== null && (
        <div className="absolute inset-0 z-30 bg-[#060708] flex flex-col items-center justify-center text-center p-4 sm:p-6">
          <div className="text-4xl mb-3 animate-bounce">🎧</div>
          <h3 className="text-white font-bold text-sm sm:text-base mb-1.5">
            Song Restricted by Owner
          </h3>
          <p className="text-slate-400 text-xs mb-4 max-w-xs leading-relaxed">
            This YouTube track doesn&apos;t permit embedded playback on third-party sites.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onSkipNext && (
              <button
                type="button"
                onClick={onSkipNext}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer"
              >
                ⏭️ Skip to Next Song
              </button>
            )}
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15"
            >
              Open on YouTube
            </a>
          </div>
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

      {/* Bottom-Right YouTube Logo & 'More Videos' Click Shield (Blocks popup & YouTube link) */}
      {!embedError && (
        <div
          className="absolute bottom-0 right-0 w-80 h-16 z-20 pointer-events-auto bg-transparent cursor-default"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {/* Full Screen Toggle Button */}
      {!embedError && (
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          className="absolute top-2.5 right-2.5 z-30 p-2 rounded-xl bg-black/60 hover:bg-cyan-500/30 text-white/80 hover:text-cyan-300 border border-white/15 backdrop-blur-md transition-all active:scale-95 shadow-lg cursor-pointer"
        >
          {isFullscreen ? (
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v5m0-5h5m6 6l5-5m0 0v5m0-5h-5m-6 6l-5 5m0 0v-5m0 5h5m6-6l5 5m0 0v-5m0 5h-5" />
            </svg>
          ) : (
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      )}

      {/* Paused Screen Overlay: Shields YouTube 'More Videos' grid & allows instant 1-click animated resume */}
      {!isPlaying && !embedError && (
        <div
          className="absolute inset-0 z-20 cursor-pointer flex flex-col items-center justify-center bg-black/60 backdrop-blur-[4px] transition-all duration-300 hover:bg-black/50 select-none group/pause"
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
          {/* Animated Ambient Pulse Rings */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-28 h-28 rounded-full bg-cyan-500/20 animate-ping opacity-75 pointer-events-none" />
            <span className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/30 to-blue-500/30 blur-md animate-pulse pointer-events-none" />

            {/* Glowing Play Icon Core */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.6)] border-2 border-white/40 transform transition-all duration-300 group-hover/pause:scale-115 group-hover/pause:shadow-[0_0_50px_rgba(6,182,212,0.9)] active:scale-95">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-current text-white drop-shadow-md" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Pause Status Indicator Badge */}
          <div className="mt-4 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2 transform transition-transform group-hover/pause:scale-105">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-bold text-white/90 tracking-wide uppercase">
              Paused • Tap to Play Together
            </span>
          </div>

          {trackTitle && (
            <p className="mt-1.5 text-xs text-white/50 max-w-[80%] truncate text-center font-medium">
              {trackTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
