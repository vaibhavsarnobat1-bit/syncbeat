import { useEffect, useRef, useState, useCallback } from 'react';
import type { Track } from '@workspace/api-client-react';
import { useAuthStore } from '@/lib/store';

/** Fire browser notification when offline and a friend changes track */
export function fireOfflineTrackNotification(friendName: string, trackTitle?: string, roomName?: string) {
  const title = '🎵 SyncBeat — Friend Played YouTube Song!';
  const body = trackTitle
    ? `Your friend played "${trackTitle}" in the room. Please turn on your internet connection to sync and listen together!`
    : `Your friend played a YouTube song in the room. Please turn on your internet connection to sync and listen together!`;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo.png', badge: '/logo.png', tag: 'offline-track', requireInteraction: true });
  }
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
}

export type ChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
};

export type WsUser = {
  userId: string;
  displayName: string;
  avatarColor: string;
};

export type FloatingReaction = {
  id: string;
  emoji: string;
  userId: string;
  displayName: string;
  avatarColor: string;
};

export type VoiceUserState = {
  inVoice: boolean;
  micMuted: boolean;
  videoEnabled: boolean;
  displayName: string;
  avatarColor: string;
};

/** Tracks can come from YouTube or from a member's uploaded device song. */
export type RoomTrack = Track & {
  source?: 'youtube' | 'device';
  mediaId?: string;
  uploadedBy?: string;
};

export type RoomState = {
  id: string;
  name: string;
  inviteCode: string;
  hostUserId: string;
  memberCount: number;
  currentTrack: RoomTrack | null;
  queue: RoomTrack[];
  history: RoomTrack[];
  isPlaying: boolean;
  currentTime: number;
  createdAt?: number;
};

type WsIncomingMessage =
  | { type: 'room_state'; room: RoomState; members: WsUser[]; messages: ChatMessage[] }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'user_joined'; user: WsUser; memberCount: number }
  | { type: 'user_left'; userId: string; memberCount: number }
  | { type: 'play'; currentTime: number; timestamp: number }
  | { type: 'pause'; currentTime: number; timestamp?: number }
  | { type: 'seek'; currentTime: number; timestamp?: number }
  | { type: 'sync_tick'; currentTime: number; timestamp?: number; isPlaying?: boolean }
  | { type: 'track_change'; track: RoomTrack; queue: RoomTrack[]; history: RoomTrack[] }
  | { type: 'queue_update'; queue: RoomTrack[]; addedBy?: string; addedTrack?: RoomTrack }
  | { type: 'reaction'; id: string; emoji: string; userId: string; displayName: string; avatarColor: string }
  | { type: 'voice_state'; userId: string; displayName: string; avatarColor: string; inVoice: boolean; micMuted: boolean; videoEnabled: boolean }
  | { type: 'room_closed'; inviteCode?: string }
  | { type: 'error'; message: string };

type WsOutgoingMessage =
  | { type: 'chat'; text: string }
  | { type: 'play'; currentTime: number }
  | { type: 'pause'; currentTime: number }
  | { type: 'seek'; currentTime: number }
  | { type: 'sync_tick'; currentTime: number; timestamp?: number }
  | { type: 'track_change'; videoId: string; title: string; thumbnail?: string; duration?: number; source?: 'youtube' | 'device'; mediaId?: string }
  | { type: 'queue_add'; videoId: string; title: string; thumbnail?: string; duration?: number }
  | { type: 'queue_remove'; videoId: string }
  | { type: 'queue_skip' }
  | { type: 'reaction'; emoji: string }
  | { type: 'voice_state'; inVoice: boolean; micMuted: boolean; videoEnabled: boolean }
  | { type: 'delete_room' };

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1500;

export function useWebSocket(roomId: string | undefined) {
  const { user } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const pendingTrackRef = useRef<{ message: WsOutgoingMessage; at: number } | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<WsUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queue, setQueue] = useState<RoomTrack[]>([]);
  const [history, setHistory] = useState<RoomTrack[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceUserState>>({});
  const [remotePlayerState, setRemotePlayerState] = useState<{
    action: 'play' | 'pause' | 'seek' | 'sync_tick';
    currentTime: number;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    unmountedRef.current = false;
    retryCountRef.current = 0;

    function connect() {
      if (unmountedRef.current) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?roomId=${encodeURIComponent(roomId!)}&token=${encodeURIComponent(user!.token)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        setIsConnected(true);
        setWsError(null);
        retryCountRef.current = 0;
        const pending = pendingTrackRef.current;
        pendingTrackRef.current = null;
        // A song picked during a reconnect is still what the user wants to hear —
        // but only if they picked it moments ago, not minutes ago.
        if (pending && Date.now() - pending.at < 12000) {
          ws.send(JSON.stringify(pending.message));
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        setIsConnected(false);
        if (wsError) return;
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(1.5, retryCountRef.current);
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {};

      ws.onmessage = (event) => {
        if (unmountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as WsIncomingMessage;

          switch (data.type) {
            case 'room_state':
              setRoom(data.room);
              setMembers(data.members);
              setMessages(data.messages);
              setQueue(data.room.queue || []);
              setHistory(data.room.history || []);
              break;
            case 'chat':
              setMessages(prev => [...prev, data.message]);
              break;
            case 'user_joined':
              setMembers(prev => {
                if (prev.find(m => m.userId === data.user.userId)) return prev;
                return [...prev, data.user];
              });
              break;
            case 'user_left':
              setMembers(prev => prev.filter(m => m.userId !== data.userId));
              setVoiceStates(prev => {
                const copy = { ...prev };
                delete copy[data.userId];
                return copy;
              });
              break;
            case 'voice_state':
              setVoiceStates(prev => ({
                ...prev,
                [data.userId]: {
                  inVoice: data.inVoice,
                  micMuted: data.micMuted,
                  videoEnabled: data.videoEnabled,
                  displayName: data.displayName,
                  avatarColor: data.avatarColor,
                }
              }));
              break;
            case 'play':
              setRemotePlayerState({ action: 'play', currentTime: data.currentTime, timestamp: data.timestamp || Date.now() });
              setRoom((prev: RoomState | null) => prev ? { ...prev, isPlaying: true, currentTime: data.currentTime } : null);
              break;
            case 'pause':
              setRemotePlayerState({ action: 'pause', currentTime: data.currentTime, timestamp: data.timestamp || Date.now() });
              setRoom((prev: RoomState | null) => prev ? { ...prev, isPlaying: false, currentTime: data.currentTime } : null);
              break;
            case 'seek':
              setRemotePlayerState({ action: 'seek', currentTime: data.currentTime, timestamp: data.timestamp || Date.now() });
              setRoom((prev: RoomState | null) => prev ? { ...prev, currentTime: data.currentTime } : null);
              break;
            case 'sync_tick':
              setRemotePlayerState({ action: 'sync_tick', currentTime: data.currentTime, timestamp: data.timestamp || Date.now() });
              setRoom((prev: RoomState | null) => prev ? { ...prev, currentTime: data.currentTime } : null);
              break;
            case 'track_change':
              setRoom((prev: RoomState | null) => {
                // Fire offline notification if user has no internet
                if (!navigator.onLine) {
                  // Find who changed track from members state (best effort)
                  fireOfflineTrackNotification('A friend', data.track?.title);
                }
                return prev ? { ...prev, currentTrack: data.track, currentTime: 0, isPlaying: true } : null;
              });
              if (data.queue !== undefined) setQueue(data.queue);
              if (data.history !== undefined) setHistory(data.history);
              break;
            case 'queue_update':
              setQueue(data.queue || []);
              break;
            case 'reaction':
              setReactions(prev => [...prev, { id: data.id, emoji: data.emoji, userId: data.userId, displayName: data.displayName, avatarColor: data.avatarColor }]);
              // Auto-remove after animation
              setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== data.id));
              }, 3500);
              break;
            case 'room_closed':
              setRoomClosed(true);
              retryCountRef.current = MAX_RETRIES;
              break;
            case 'error':
              setWsError(data.message);
              retryCountRef.current = MAX_RETRIES;
              if (/sign in/i.test(data.message)) useAuthStore.getState().setSession(null);
              break;
          }
        } catch (e) {
          console.error('[WS] Parse error', e);
        }
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [roomId, user]);

  const send = useCallback((message: WsOutgoingMessage): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    if (message.type === 'track_change') pendingTrackRef.current = { message, at: Date.now() };
    return false;
  }, []);

  return {
    isConnected,
    wsError,
    roomClosed,
    room,
    members,
    messages,
    queue,
    history,
    reactions,
    remotePlayerState,
    voiceStates,
    send,
  };
}
