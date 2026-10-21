import { createHash, randomBytes, scrypt as scryptRaw, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { IRouter, Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { query, queryOne } from "./db.js";
import { avatarColorFromSeed } from "./rooms.js";

const scrypt = promisify(scryptRaw) as unknown as (
  password: string, salt: string, keylen: number
) => Promise<Buffer>;

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  role: "user" | "admin";
  email: string | null;
  photoUrl: string | null;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function validCredentials(username: string, password: string): string | null {
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
    return "Username must be 3-24 characters: letters, numbers, . _ -";
  }
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password.length > 200) return "Password is too long";
  return null;
}

async function hash(password: string, salt: string): Promise<string> {
  return (await scrypt(password, salt, 64)).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function rowToUser(row: Record<string, unknown>): AuthUser {
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    avatarColor: (row.avatar_color as string) || avatarColorFromSeed(row.username as string),
    role: row.role === "admin" ? "admin" : "user",
    email: (row.email as string) ?? null,
    photoUrl: (row.photo_url as string) ?? null,
  };
}

export async function registerUser(username: string, password: string, displayName?: string): Promise<AuthUser> {
  const salt = randomBytes(16).toString("hex");
  const user: AuthUser = {
    id: nanoid(16),
    username,
    displayName: (displayName || username).slice(0, 32),
    avatarColor: avatarColorFromSeed(username),
    role: "user",
    email: null,
    photoUrl: null,
  };
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO users (id, username, display_name, avatar_color, pass_hash, pass_salt, role, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,'user',$7)
     ON CONFLICT (username) DO NOTHING
     RETURNING *`,
    [user.id, user.username, user.displayName, user.avatarColor, await hash(password, salt), salt, Date.now()]
  );
  if (!rows.length) throw new Error("That username is already taken");
  return rowToUser(rows[0]);
}

export async function loginUser(username: string, password: string): Promise<AuthUser | "unknown" | "banned"> {
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM users WHERE username=$1`, [username]);
  if (!row) return "unknown";
  if (row.banned_at) return "banned";
  const candidate = await hash(password, String(row.pass_salt));
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(String(row.pass_hash), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "unknown";
  await query(`UPDATE users SET last_login_at=$2 WHERE id=$1`, [row.id, Date.now()]);
  return rowToUser(row);
}

export async function upsertGoogleUser(sub: string, email: string, displayName: string, photoUrl: string): Promise<AuthUser> {
  const username = normalizeUsername(email).split("@")[0].replace(/[^a-z0-9_.-]/g, "").slice(0, 24) || `g${sub.slice(0, 8)}`;
  const id = `g${createHash("sha256").update(sub).digest("hex").slice(0, 11)}`;
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO users (id, username, display_name, avatar_color, pass_hash, pass_salt, role, provider, email, photo_url, created_at)
     VALUES ($1,$2,$3,$4,'','','user','google',$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, email=EXCLUDED.email, photo_url=EXCLUDED.photo_url
     RETURNING *`,
    [id, username, displayName.slice(0, 32), avatarColorFromSeed(sub), email, photoUrl, Date.now()]
  );
  if (!rows.length) {
    const existing = await queryOne<Record<string, unknown>>(`SELECT * FROM users WHERE id=$1`, [id]);
    if (existing) return rowToUser(existing);
  }
  return rowToUser(rows[0]);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)`,
    [hashToken(token), userId, Date.now(), Date.now() + SESSION_TTL_MS]
  );
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  await query(`DELETE FROM sessions WHERE token_hash=$1`, [hashToken(token)]);
}

export async function resolveToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const row = await queryOne<Record<string, unknown>>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash=$1 AND s.expires_at > $2`,
    [hashToken(token), Date.now()]
  );
  if (!row) return null;
  if (row.banned_at) return null;
  return rowToUser(row);
}

function bearer(req: AuthedRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  // Media is fetched by <audio src>, which cannot set headers.
  const q = req.query.t ?? req.query.token;
  return typeof q === "string" && q.length > 0 ? q : undefined;
}

export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  req.user = (await resolveToken(bearer(req))) ?? undefined;
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access only" });
    return;
  }
  next();
}

export async function bootstrapAdmin(): Promise<void> {
  const username = normalizeUsername(process.env.ADMIN_USERNAME || "admin");
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "";
  if (!password) {
    console.warn("[Auth] ADMIN_PASSWORD not set — no admin account created");
    return;
  }
  const existing = await queryOne<Record<string, unknown>>(`SELECT id FROM users WHERE username=$1`, [username]);
  if (existing) {
    await query(`UPDATE users SET role='admin' WHERE id=$1`, [existing.id]);
    return;
  }
  const salt = randomBytes(16).toString("hex");
  await query(
    `INSERT INTO users (id, username, display_name, avatar_color, pass_hash, pass_salt, role, created_at)
     VALUES ($1,$2,'Admin','#06b6d4',$3,$4,'admin',$5) ON CONFLICT (username) DO NOTHING`,
    [nanoid(16), username, await hash(password, salt), salt, Date.now()]
  );
  console.log(`[Auth] Admin account ready as "${username}"`);
}

export async function isBanned(userId: string): Promise<boolean> {
  const row = await queryOne<{ banned_at: string | null }>(`SELECT banned_at FROM users WHERE id=$1`, [userId]);
  return !!row?.banned_at;
}
