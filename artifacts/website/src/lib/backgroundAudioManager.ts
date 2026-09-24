/**
 * Background Audio & Media Session Manager for SyncBeat
 * Ensures playback persists when the user switches apps or minimizes browser ("app ke bahar jaane par bhi chalega").
 * Also provides native lock screen and notification media controls (Play/Pause/Skip).
 */

class BackgroundAudioManager {
  private silentAudio: HTMLAudioElement | null = null;
  private wakeLock: any = null;
  private isKeepAliveActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initSilentAudio();
      this.setupVisibilityListener();
    }
  }

  private initSilentAudio() {
    try {
      // 1-second silent WAV data URI loop
      const silentWav =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.silentAudio = new Audio(silentWav);
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.01; // Minimal volume so mobile OS classifies it as active audio stream
    } catch (e) {
      console.warn('[BackgroundAudio] Could not create silent audio element:', e);
    }
  }

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isKeepAliveActive) {
        // Re-request wake lock if screen came back
        this.requestWakeLock();
      }
    });
  }

  /**
   * Starts background keep-alive audio.
   * Mobile OS will not kill the audio context or tab when switching apps.
   */
  public async startKeepAlive() {
    this.isKeepAliveActive = true;
    if (this.silentAudio) {
      try {
        await this.silentAudio.play();
      } catch (err) {
        // Autoplay may be restricted until user gesture; it's fine as user clicks play
      }
    }
    this.requestWakeLock();
  }

  /**
   * Stops background keep-alive audio when user explicitly stops/pauses music.
   */
  public stopKeepAlive() {
    this.isKeepAliveActive = false;
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
      } catch (_) {}
    }
    this.releaseWakeLock();
  }

  /**
   * Request Screen WakeLock so screen doesn't turn off unexpectedly during listening sessions.
   */
  public async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch (_) {
      // Wake lock can fail if low battery or not supported; gracefully ignore
    }
  }

  public releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch (_) {}
      this.wakeLock = null;
    }
  }

  /**
   * Configures OS-level Media Notification & Lock Screen Controls (MediaSession API)
   */
  public updateMediaSession(config: {
    title: string;
    artist?: string;
    album?: string;
    artworkUrl?: string;
    isPlaying: boolean;
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    onSeekTo?: (time: number) => void;
  }) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: config.title || 'SyncBeat Room',
        artist: config.artist || 'SyncBeat Live Sync',
        album: config.album || 'SyncBeat',
        artwork: config.artworkUrl
          ? [
              { src: config.artworkUrl, sizes: '96x96', type: 'image/png' },
              { src: config.artworkUrl, sizes: '128x128', type: 'image/png' },
              { src: config.artworkUrl, sizes: '192x192', type: 'image/png' },
              { src: config.artworkUrl, sizes: '512x512', type: 'image/png' },
            ]
          : [
              {
                src: '/favicon.ico',
                sizes: '64x64',
                type: 'image/x-icon',
              },
            ],
      });

      navigator.mediaSession.playbackState = config.isPlaying ? 'playing' : 'paused';

      if (config.onPlay) {
        navigator.mediaSession.setActionHandler('play', () => {
          config.onPlay?.();
        });
      }

      if (config.onPause) {
        navigator.mediaSession.setActionHandler('pause', () => {
          config.onPause?.();
        });
      }

      if (config.onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          config.onNext?.();
        });
      }

      if (config.onPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          config.onPrevious?.();
        });
      }

      if (config.onSeekTo) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            config.onSeekTo?.(details.seekTime);
          }
        });
      }
    } catch (err) {
      console.warn('[BackgroundAudio] MediaSession setup error:', err);
    }
  }
}

export const backgroundAudioManager = new BackgroundAudioManager();
