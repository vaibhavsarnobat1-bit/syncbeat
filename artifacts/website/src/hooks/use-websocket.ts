import { useEffect, useRef, useState, useCallback } from 'react';
import type { Room, Track } from '@workspace/api-client-react';
import { useAuthStore } from '@/lib/store';

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

type WsIncomingMessage =
  | { type: 'room_state'; room: Room & { queue: Track[]; history: Track[] }; members: WsUser[]; messages: ChatMessage[] }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'user_joined'; user: WsUser; memberCount: number }
  | { type: 'user_left'; userId: string; memberCount: number }
  | { type: 'play'; currentTime: number; timestamp: number }
  | { type: 'pause'; currentTime: number }
  | { type: 'seek'; currentTime: number }
  | { type: 'track_change'; track: Track; queue: Track[]; history: Track[] }
  | { type: 'queue_update'; queue: Track[]; addedBy?: string; addedTrack?: Track }
  | { type: 'reaction'; id: string; emoji: string; userId: string; displayName: string; avatarColor: string }
  | { type: 'room_closed' }
  | { type: 'error'; message: string };

type WsOutgoingMessage =
  | { type: 'chat'; text: string }
  | { type: 'play'; currentTime: number }
  | { type: 'pause'; currentTime: number }
  | { type: 'seek'; currentTime: number }
  | { type: 'track_change'; videoId: string; title: string; thumbnail: string; duration: number }
  | { type: 'queue_add'; videoId: string; title: string; thumbnail: string; duration: number }
  | { type: 'queue_remove'; videoId: string }
  | { type: 'queue_skip' }
  | { type: 'reaction'; emoji: string }
  | { type: 'delete_room' };

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1500;

export function useWebSocket(roomId: string | undefined) {
  const { user } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<WsUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [remotePlayerState, setRemotePlayerState] = useState<{
    action: 'play' | 'pause' | 'seek';
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
      const wsUrl = `${protocol}//${window.location.host}/api/ws?roomId=${encodeURIComponent(roomId!)}&userId=${encodeURIComponent(user!.userId)}&displayName=${encodeURIComponent(user!.displayName)}&avatarColor=${encodeURIComponent(user!.avatarColor || '#7c3aed')}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        setIsConnected(true);
        setWsError(null);
        retryCountRef.current = 0;
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
              break;
            case 'play':
              setRemotePlayerState({ action: 'play', currentTime: data.currentTime, timestamp: data.timestamp });
              setRoom((prev: Room | null) => prev ? { ...prev, isPlaying: true, currentTime: data.currentTime } : null);
              break;
            case 'pause':
              setRemotePlayerState({ action: 'pause', currentTime: data.currentTime, timestamp: Date.now() });
              setRoom((prev: Room | null) => prev ? { ...prev, isPlaying: false, currentTime: data.currentTime } : null);
              break;
            case 'seek':
              setRemotePlayerState({ action: 'seek', currentTime: data.currentTime, timestamp: Date.now() });
              setRoom((prev: Room | null) => prev ? { ...prev, currentTime: data.currentTime } : null);
              break;
            case 'track_change':
              setRoom((prev: Room | null) => prev ? { ...prev, currentTrack: data.track, currentTime: 0, isPlaying: true } : null);
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

  const send = useCallback((message: WsOutgoingMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
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
    send,
  };
}
