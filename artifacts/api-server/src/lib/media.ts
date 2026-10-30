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
const metas = new Map<string, MediaMeta>();

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
  metas.set(meta.id, meta);
  try {
    await query(
      `INSERT INTO media_files (id, room_invite_code, uploader_user_id, title, mime, size, duration, data, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [
        meta.id, meta.roomInviteCode, meta.uploaderUserId, meta.title, meta.mime,
        meta.size, meta.duration, input.data, meta.createdAt,
      ]
    );
  } catch (err) {
    // If DB is offline, memory cache holds the audio and meta
  }
  return meta;
}

export async function getMediaFile(id: string): Promise<{ meta: MediaMeta; data: Buffer } | null> {
  const cachedBlob = blobs.get(id);
  const cachedMeta = metas.get(id);

  if (cachedBlob && cachedMeta) {
    return { meta: cachedMeta, data: cachedBlob };
  }

  try {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM media_files WHERE id=$1`,
      [id]
    );
    if (row) {
      const meta = rowToMeta(row);
      const raw = row.data;
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "base64");
      blobs.set(id, buf);
      metas.set(id, meta);
      return { meta, data: buf };
    }
  } catch {}

  if (cachedBlob) {
    return {
      meta: cachedMeta || {
        id, roomInviteCode: "", uploaderUserId: "", title: "Device Song",
        mime: "audio/mpeg", size: cachedBlob.length, duration: 0, createdAt: Date.now(),
      },
      data: cachedBlob,
    };
  }
  return null;
}
