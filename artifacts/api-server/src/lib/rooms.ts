import { nanoid } from "nanoid";
import { query, queryOne } from "./db.js";

export interface Track {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: number;
}

export interface RoomMember {
  userId: string;
  displayName: string;
  avatarColor: string;
  joinedAt: number;
  ws?: unknown;
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface Room {
  id: string;
  name: string;
  inviteCode: string;
  hostUserId: string;
  createdAt: number;
  members: Map<string, RoomMember>;
  messages: ChatMessage[];
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  isPlaying: boolean;
  currentTime: number;
  lastSyncAt: number;
}

const rooms = new Map<string, Room>();

const AVATAR_COLORS = [
  "#7c3aed", "#db2777", "#059669", "#d97706",
  "#dc2626", "#2563eb", "#0891b2", "#65a30d",
];

export function generateAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ── DB helpers ──────────────────────────────────────────────────────────────

async function upsertRoomToDB(room: Room): Promise<void> {
  try {
    await query(
      `INSERT INTO rooms (invite_code, id, name, host_user_id, created_at, current_track, queue, history, is_playing, playback_time, last_sync_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (invite_code) DO UPDATE SET
         current_track = EXCLUDED.current_track,
         queue = EXCLUDED.queue,
         history = EXCLUDED.history,
         is_playing = EXCLUDED.is_playing,
         playback_time = EXCLUDED.playback_time,
         last_sync_at = EXCLUDED.last_sync_at`,
      [
        room.inviteCode, room.id, room.name, room.hostUserId, room.createdAt,
        room.currentTrack ? JSON.stringify(room.currentTrack) : null,
        JSON.stringify(room.queue),
        JSON.stringify(room.history),
        room.isPlaying,
        Math.round(room.currentTime),
        room.lastSyncAt,
      ]
    );
  } catch (err) {
    console.error("[DB] upsertRoom error:", err);
  }
}

async function persistMessage(inviteCode: string, msg: ChatMessage): Promise<void> {
  try {
    await query(
      `INSERT INTO messages (id, room_invite_code, user_id, display_name, avatar_color, text, timestamp, is_system)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [msg.id, inviteCode, msg.userId, msg.displayName, msg.avatarColor, msg.text, msg.timestamp, msg.isSystem ?? false]
    );
  } catch (err) {
    console.error("[DB] persistMessage error:", err);
  }
}

async function loadMessagesFromDB(inviteCode: string): Promise<ChatMessage[]> {
  try {
    const rows = await query<{
      id: string; user_id: string; display_name: string;
      avatar_color: string; text: string; timestamp: string; is_system: boolean;
    }>(
      `SELECT id, user_id, display_name, avatar_color, text, timestamp, is_system
       FROM messages WHERE room_invite_code=$1 ORDER BY timestamp ASC LIMIT 500`,
      [inviteCode]
    );
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      displayName: r.display_name,
      avatarColor: r.avatar_color,
      text: r.text,
      timestamp: Number(r.timestamp),
      isSystem: r.is_system,
    }));
  } catch {
    return [];
  }
}

function rowToRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    name: row.name as string,
    inviteCode: row.invite_code as string,
    hostUserId: row.host_user_id as string,
    createdAt: Number(row.created_at),
    members: new Map(),
    messages: [],
    currentTrack: row.current_track ? (row.current_track as Track) : null,
    queue: Array.isArray(row.queue) ? (row.queue as Track[]) : [],
    history: Array.isArray(row.history) ? (row.history as Track[]) : [],
    isPlaying: Boolean(row.is_playing),
    currentTime: Number(row.playback_time) || 0,
    lastSyncAt: Number(row.last_sync_at) || Date.now(),
  };
}

// ── Load all rooms from DB on startup ───────────────────────────────────────

export async function loadRoomsFromDB(): Promise<void> {
  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM rooms ORDER BY created_at DESC`
    );
    for (const row of rows) {
      const room = rowToRoom(row);
      room.messages = await loadMessagesFromDB(room.inviteCode);
      rooms.set(room.inviteCode, room);
    }
    console.log(`[DB] Loaded ${rows.length} rooms from database`);
  } catch (err) {
    console.error("[DB] loadRoomsFromDB error:", err);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function createRoom(name: string, hostUserId: string, _hostDisplayName: string): Promise<Room> {
  const id = nanoid(10);
  const inviteCode = nanoid(12);
  const room: Room = {
    id, name, inviteCode, hostUserId,
    createdAt: Date.now(),
    members: new Map(),
    messages: [],
    queue: [],
    history: [],
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    lastSyncAt: Date.now(),
  };
  rooms.set(inviteCode, room);
  await upsertRoomToDB(room);
  return room;
}

export function getRoomByInviteCode(inviteCode: string): Room | undefined {
  return rooms.get(inviteCode);
}

export async function getRoomByHostUserId(hostUserId: string): Promise<Room | null> {
  // Check in-memory first
  for (const room of rooms.values()) {
    if (room.hostUserId === hostUserId) return room;
  }
  // Check DB
  try {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM rooms WHERE host_user_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [hostUserId]
    );
    if (!row) return null;
    const room = rowToRoom(row);
    room.messages = await loadMessagesFromDB(room.inviteCode);
    rooms.set(room.inviteCode, room);
    return room;
  } catch {
    return null;
  }
}

export async function deleteRoom(inviteCode: string): Promise<boolean> {
  rooms.delete(inviteCode);
  try {
    await query(`DELETE FROM rooms WHERE invite_code=$1`, [inviteCode]);
  } catch (err) {
    console.error("[DB] deleteRoom error:", err);
  }
  return true;
}

export async function updateRoomPlayback(room: Room): Promise<void> {
  room.lastSyncAt = Date.now();
  await upsertRoomToDB(room);
}

export async function addMessageToRoom(inviteCode: string, msg: ChatMessage): Promise<void> {
  const room = rooms.get(inviteCode);
  if (!room) return;
  room.messages.push(msg);
  if (room.messages.length > 500) room.messages.shift();
  await persistMessage(inviteCode, msg);
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

export function getAllUsers(): RoomMember[] {
  const seen = new Set<string>();
  const users: RoomMember[] = [];
  for (const room of rooms.values()) {
    for (const member of room.members.values()) {
      if (!seen.has(member.userId)) {
        seen.add(member.userId);
        users.push(member);
      }
    }
  }
  return users;
}

export function getStats() {
  const allRooms = getAllRooms();
  const uniqueUsers = new Set<string>();
  let totalMessages = 0;
  let activeRooms = 0;
  for (const room of allRooms) {
    for (const m of room.members.values()) uniqueUsers.add(m.userId);
    totalMessages += room.messages.length;
    if (room.members.size > 0) activeRooms++;
  }
  return { totalRooms: allRooms.length, activeRooms, totalUsers: uniqueUsers.size, totalMessages };
}

export function getAllMessages(): Array<ChatMessage & { roomName: string; inviteCode: string }> {
  const allMessages: Array<ChatMessage & { roomName: string; inviteCode: string }> = [];
  for (const room of rooms.values()) {
    for (const msg of room.messages) {
      allMessages.push({ ...msg, roomName: room.name, inviteCode: room.inviteCode });
    }
  }
  return allMessages.sort((a, b) => b.timestamp - a.timestamp);
}

export function roomToJSON(room: Room) {
  return {
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
    createdAt: room.createdAt,
  };
}
