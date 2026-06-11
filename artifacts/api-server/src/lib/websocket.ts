import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { nanoid } from "nanoid";
import {
  getRoomByInviteCode,
  generateAvatarColor,
  addMessageToRoom,
  updateRoomPlayback,
  deleteRoom,
  type ChatMessage,
  type RoomMember,
  type Track,
} from "./rooms.js";

interface WsClient extends WebSocket {
  userId: string;
  displayName: string;
  avatarColor: string;
  roomInviteCode: string;
  isAlive: boolean;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  function broadcast(roomInviteCode: string, data: unknown, excludeUserId?: string) {
    const room = getRoomByInviteCode(roomInviteCode);
    if (!room) return;
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      const ws = client as WsClient;
      if (
        ws.readyState === WebSocket.OPEN &&
        ws.roomInviteCode === roomInviteCode &&
        ws.userId !== excludeUserId
      ) {
        ws.send(msg);
      }
    });
  }

  function broadcastAll(roomInviteCode: string, data: unknown) {
    broadcast(roomInviteCode, data, undefined);
  }

  async function addSystemMessage(roomInviteCode: string, text: string): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: nanoid(8),
      userId: "system",
      displayName: "SyncBeat",
      avatarColor: "#7c3aed",
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    await addMessageToRoom(roomInviteCode, msg);
    return msg;
  }

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const client = ws as WsClient;
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const roomId = url.searchParams.get("roomId") || "";
    const userId = url.searchParams.get("userId") || nanoid(12);
    const displayName = url.searchParams.get("displayName") || `Guest${Math.floor(Math.random() * 9999)}`;
    const avatarColor = url.searchParams.get("avatarColor") || generateAvatarColor();

    client.userId = userId;
    client.displayName = displayName;
    client.avatarColor = avatarColor;
    client.roomInviteCode = roomId;
    client.isAlive = true;

    const room = getRoomByInviteCode(roomId);
    if (!room) {
      client.send(JSON.stringify({ type: "error", message: "Room not found" }));
      client.close();
      return;
    }

    const member: RoomMember = { userId, displayName, avatarColor, joinedAt: Date.now() };
    room.members.set(userId, member);

    const members = Array.from(room.members.values()).map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      avatarColor: m.avatarColor,
    }));

    // Send full room state + complete chat history
    client.send(
      JSON.stringify({
        type: "room_state",
        room: {
          id: room.id,
          name: room.name,
          inviteCode: room.inviteCode,
          hostUserId: room.hostUserId,
          memberCount: room.members.size,
          currentTrack: room.currentTrack,
          queue: room.queue,
          history: room.history,
          isPlaying: room.isPlaying,
          currentTime: room.currentTime,
        },
        members,
        messages: room.messages,
      })
    );

    broadcast(
      roomId,
      {
        type: "user_joined",
        user: { userId, displayName, avatarColor },
        memberCount: room.members.size,
      },
      userId
    );

    client.on("pong", () => { client.isAlive = true; });

    client.on("message", (rawData) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      const msgType = data.type as string;

      // ── Chat ──
      if (msgType === "chat") {
        const chatMsg: ChatMessage = {
          id: nanoid(8),
          userId,
          displayName,
          avatarColor,
          text: String(data.text || "").slice(0, 500),
          timestamp: Date.now(),
          isSystem: false,
        };
        addMessageToRoom(roomId, chatMsg);
        broadcastAll(roomId, { type: "chat", message: chatMsg });

      // ── Playback ──
      } else if (msgType === "play") {
        room.isPlaying = true;
        room.currentTime = Number(data.currentTime) || 0;
        room.lastSyncAt = Date.now();
        updateRoomPlayback(room);
        broadcast(roomId, { type: "play", currentTime: room.currentTime, timestamp: room.lastSyncAt }, userId);

      } else if (msgType === "pause") {
        room.isPlaying = false;
        room.currentTime = Number(data.currentTime) || 0;
        updateRoomPlayback(room);
        broadcast(roomId, { type: "pause", currentTime: room.currentTime }, userId);

      } else if (msgType === "seek") {
        room.currentTime = Number(data.currentTime) || 0;
        room.lastSyncAt = Date.now();
        updateRoomPlayback(room);
        broadcast(roomId, { type: "seek", currentTime: room.currentTime }, userId);

      // ── Track change ──
      } else if (msgType === "track_change") {
        if (room.currentTrack) {
          room.history.unshift(room.currentTrack);
          if (room.history.length > 20) room.history.pop();
        }
        const newTrack: Track = {
          videoId: String(data.videoId || ""),
          title: String(data.title || ""),
          thumbnail: String(data.thumbnail || ""),
          duration: Number(data.duration) || 0,
        };
        room.currentTrack = newTrack;
        room.isPlaying = true;
        room.currentTime = 0;
        updateRoomPlayback(room);

        // System message in chat — "now playing"
        addSystemMessage(roomId, `🎵 Now Playing: ${newTrack.title}`).then((sysMsg) => {
          broadcastAll(roomId, {
            type: "track_change",
            track: room.currentTrack,
            queue: room.queue,
            history: room.history,
          });
          broadcastAll(roomId, { type: "chat", message: sysMsg });
        });

      // ── Queue: add ──
      } else if (msgType === "queue_add") {
        const track: Track = {
          videoId: String(data.videoId || ""),
          title: String(data.title || ""),
          thumbnail: String(data.thumbnail || ""),
          duration: Number(data.duration) || 0,
        };
        if (!room.queue.find(t => t.videoId === track.videoId)) {
          room.queue.push(track);
        }
        updateRoomPlayback(room);
        broadcastAll(roomId, { type: "queue_update", queue: room.queue, addedBy: displayName, addedTrack: track });

        // System message in chat — "added to queue"
        addSystemMessage(roomId, `📋 ${displayName} added "${track.title}" to queue`).then((sysMsg) => {
          broadcastAll(roomId, { type: "chat", message: sysMsg });
        });

      // ── Queue: remove ──
      } else if (msgType === "queue_remove") {
        const videoId = String(data.videoId || "");
        room.queue = room.queue.filter(t => t.videoId !== videoId);
        updateRoomPlayback(room);
        broadcastAll(roomId, { type: "queue_update", queue: room.queue });

      // ── Queue: skip to next ──
      } else if (msgType === "queue_skip") {
        if (room.queue.length === 0) return;
        if (room.currentTrack) {
          room.history.unshift(room.currentTrack);
          if (room.history.length > 20) room.history.pop();
        }
        room.currentTrack = room.queue.shift()!;
        room.isPlaying = true;
        room.currentTime = 0;
        updateRoomPlayback(room);

        addSystemMessage(roomId, `⏭️ Skipped to: ${room.currentTrack.title}`).then((sysMsg) => {
          broadcastAll(roomId, {
            type: "track_change",
            track: room.currentTrack,
            queue: room.queue,
            history: room.history,
          });
          broadcastAll(roomId, { type: "chat", message: sysMsg });
        });

      // ── Live emoji reaction ──
      } else if (msgType === "reaction") {
        const emoji = String(data.emoji || "🔥").slice(0, 2);
        broadcastAll(roomId, {
          type: "reaction",
          emoji,
          userId,
          displayName,
          avatarColor,
          id: nanoid(6),
        });

      // ── Delete room (host only) ──
      } else if (msgType === "delete_room") {
        if (userId !== room.hostUserId) return;
        broadcastAll(roomId, { type: "room_closed" });
        deleteRoom(roomId);
        wss.clients.forEach((c) => {
          const wsc = c as WsClient;
          if (wsc.roomInviteCode === roomId) wsc.close();
        });
      }
    });

    client.on("close", () => {
      room.members.delete(userId);
      broadcast(roomId, {
        type: "user_left",
        userId,
        memberCount: room.members.size,
      });
    });
  });

  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WsClient;
      if (!client.isAlive) { client.terminate(); return; }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(pingInterval));
  return wss;
}
