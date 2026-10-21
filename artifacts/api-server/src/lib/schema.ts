import { query } from "./db.js";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS rooms (
     invite_code    text PRIMARY KEY,
     id             text NOT NULL,
     name           text NOT NULL,
     host_user_id   text NOT NULL,
     created_at     bigint NOT NULL,
     current_track  jsonb,
     queue          jsonb NOT NULL DEFAULT '[]'::jsonb,
     history        jsonb NOT NULL DEFAULT '[]'::jsonb,
     is_playing     boolean NOT NULL DEFAULT false,
     playback_time  integer NOT NULL DEFAULT 0,
     last_sync_at   bigint NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id                text PRIMARY KEY,
     room_invite_code  text NOT NULL,
     user_id           text NOT NULL,
     display_name      text NOT NULL,
     avatar_color      text NOT NULL DEFAULT '',
     text              text NOT NULL,
     timestamp         bigint NOT NULL,
     is_system         boolean NOT NULL DEFAULT false
   )`,
  `CREATE INDEX IF NOT EXISTS messages_room_time_idx ON messages (room_invite_code, timestamp)`,
  `CREATE TABLE IF NOT EXISTS users (
     id            text PRIMARY KEY,
     username      text NOT NULL UNIQUE,
     display_name  text NOT NULL,
     avatar_color  text NOT NULL DEFAULT '#7c3aed',
     pass_hash     text NOT NULL,
     pass_salt     text NOT NULL,
     role          text NOT NULL DEFAULT 'user',
     provider      text NOT NULL DEFAULT 'local',
     email         text,
     photo_url     text,
     created_at    bigint NOT NULL,
     last_login_at bigint,
     banned_at     bigint
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash  text PRIMARY KEY,
     user_id     text NOT NULL,
     created_at  bigint NOT NULL,
     expires_at  bigint NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS room_members (
     room_invite_code  text NOT NULL,
     user_id           text NOT NULL,
     display_name      text NOT NULL,
     avatar_color      text NOT NULL DEFAULT '',
     joined_at         bigint NOT NULL,
     last_seen_at      bigint NOT NULL DEFAULT 0,
     removed_at        bigint,
     PRIMARY KEY (room_invite_code, user_id)
   )`,
  `CREATE INDEX IF NOT EXISTS room_members_user_idx ON room_members (user_id)`,
  `CREATE TABLE IF NOT EXISTS media_files (
     id                text PRIMARY KEY,
     room_invite_code  text NOT NULL,
     uploader_user_id  text NOT NULL,
     title             text NOT NULL,
     mime              text NOT NULL DEFAULT 'application/octet-stream',
     size              bigint NOT NULL DEFAULT 0,
     duration          integer NOT NULL DEFAULT 0,
     data              bytea NOT NULL,
     created_at        bigint NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS media_room_idx ON media_files (room_invite_code)`,
];

export async function ensureSchema(): Promise<boolean> {
  try {
    for (const sql of STATEMENTS) await query(sql);
    return true;
  } catch (err: unknown) {
    console.warn("[Schema] unavailable:", err instanceof Error ? err.message : err);
    return false;
  }
}
