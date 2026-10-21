import { nanoid } from "nanoid";
import { query, queryOne } from "./db.js";

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export interface MediaMeta {
  id: string;
  roomInviteCode: string;
  uploaderUserId: string;
  title: string;
  mime: string;
  size: number;
  duration: number;
  createdAt: number;
}

const blobs = new Map<string, Buffer>();

function rowToMeta(row: Record<string, unknown>): MediaMeta {
  return {
    id: row.id as string,
    roomInviteCode: row.room_invite_code as string,
    uploaderUserId: row.uploader_user_id as string,
    title: row.title as string,
    mime: row.mime as string,
    size: Number(row.size),
    duration: Number(row.duration),
    createdAt: Number(row.created_at),
  };
}

export async function saveMediaFile(input: {
  roomInviteCode: string;
  uploaderUserId: string;
  title: string;
  mime: string;
  duration: number;
  data: Buffer;
}): Promise<MediaMeta> {
  const meta: MediaMeta = {
    id: `med_${nanoid(10)}`,
    roomInviteCode: input.roomInviteCode,
    uploaderUserId: input.uploaderUserId,
    title: input.title.slice(0, 120),
    mime: input.mime || "audio/mpeg",
    size: input.data.length,
    duration: Math.round(input.duration) || 0,
    createdAt: Date.now(),
  };
  blobs.set(meta.id, input.data);
  await query(
    `INSERT INTO media_files (id, room_invite_code, uploader_user_id, title, mime, size, duration, data, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    [
      meta.id, meta.roomInviteCode, meta.uploaderUserId, meta.title, meta.mime,
      meta.size, meta.duration, input.data, meta.createdAt,
    ]
  );
  return meta;
}

export async function getMediaFile(id: string): Promise<{ meta: MediaMeta; data: Buffer } | null> {
  const cached = blobs.get(id);
  const row = await queryOne<Record<string, unknown>>(
    cached
      ? `SELECT id, room_invite_code, uploader_user_id, title, mime, size, duration, created_at
         FROM media_files WHERE id=$1`
      : `SELECT * FROM media_files WHERE id=$1`,
    [id]
  );
  if (row) {
    if (!cached) {
      const raw = row.data;
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "base64");
      blobs.set(id, buf);
    }
    return { meta: rowToMeta(row), data: blobs.get(id) as Buffer };
  }
  if (cached) {
    return {
      meta: {
        id, roomInviteCode: "", uploaderUserId: "", title: "Device Song",
        mime: "audio/mpeg", size: cached.length, duration: 0, createdAt: Date.now(),
      },
      data: cached,
    };
  }
  return null;
}
