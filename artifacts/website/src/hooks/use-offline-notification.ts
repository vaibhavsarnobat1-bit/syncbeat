/**
 * useOfflineNotification
 * 
 * When user is offline and a friend plays/changes a YouTube song in the room,
 * shows a browser notification + in-app toast saying "Friend played a YouTube song, turn on internet".
 */
import { useEffect, useRef, useCallback } from 'react';

interface OfflineNotificationOptions {
  /** Current room members / display names to identify who changed track */
  roomName?: string;
}

export function useOfflineNotification({ roomName }: OfflineNotificationOptions = {}) {
  const permissionAsked = useRef(false);

  // Request notification permission once
  const requestPermission = useCallback(async () => {
    if (permissionAsked.current) return;
    permissionAsked.current = true;
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Ask for permission on mount (after a short delay so user is settled)
    const t = setTimeout(requestPermission, 3000);
    return () => clearTimeout(t);
  }, [requestPermission]);

  /**
   * Call this when a track_change WebSocket event is received
   * AND the user is currently offline (navigator.onLine === false)
   */
  const notifyOfflineTrackChange = useCallback((friendName: string, trackTitle?: string) => {
    if (navigator.onLine) return; // Only fire when offline

    const title = '🎵 SyncBeat — Turn on Internet!';
    const body = trackTitle
      ? `${friendName} played "${trackTitle}" — Turn on your internet to join!`
      : `${friendName} played a YouTube song in${roomName ? ` "${roomName}"` : ' the room'} — Turn on your internet to listen!`;

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'offline-track-change',
        requireInteraction: true,
      });
    }

    // Also try vibration on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [roomName]);

  return { notifyOfflineTrackChange, requestPermission };
}
