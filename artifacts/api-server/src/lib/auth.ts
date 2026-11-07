import { createHash, randomBytes, randomInt, scrypt as scryptRaw, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import type { IRouter, Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { dbUnavailable, query, queryOne } from "./db.js";
import { avatarColorFromSeed } from "./rooms.js";
import { sendMail, verificationEmail, resetEmail, isSmtpConfigured } from "./mailer.js";

const scrypt = promisify(scryptRaw) as unknown as (
  password: string, salt: string, keylen: number
) => Promise<Buffer>;

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // email verification link valid for 24h
export const RESET_TTL_MS = 60 * 60 * 1000; // password reset link valid for 1h

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: unknown): boolean {
  const s = String(raw ?? "").trim().toLowerCase();
  return s.length <= 254 && EMAIL_RE.test(s);
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  role: "user" | "admin";
  email: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  passHash: string;
  passSalt: string;
  role: "user" | "admin";
  provider: string;
  email: string | null;
  photoUrl: string | null;
  createdAt: number;
  lastLoginAt?: number | null;
  bannedAt?: number | null;
  emailVerified?: boolean;
  verifyTokenHash?: string | null;
  verifyExpiry?: number | null;
  resetTokenHash?: string | null;
  resetExpiry?: number | null;
}

export interface StoredSession {
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

// ── In-Memory & Local File Store Fallback ─────────────────────────────────────
const memUsers = new Map<string, StoredUser>(); // username -> StoredUser
const memUsersById = new Map<string, StoredUser>(); // id -> StoredUser
const memSessions = new Map<string, StoredSession>(); // tokenHash -> StoredSession

const STORE_PATH = path.resolve(process.cwd(), ".auth_store.json");

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const data = JSON.parse(raw);
      if (Array.isArray(data?.users)) {
        for (const u of data.users) {
          memUsers.set(u.username, u);
          memUsersById.set(u.id, u);
        }
      }
      if (Array.isArray(data?.sessions)) {
        const now = Date.now();
        for (const s of data.sessions) {
          if (s.expiresAt > now) {
            memSessions.set(s.tokenHash, s);
          }
        }
      }
    }
  } catch {
    // Ignore read or parse errors
  }
}

function saveStore() {
  try {
    const data = {
      users: Array.from(memUsersById.values()),
      sessions: Array.from(memSessions.values()).filter((s) => s.expiresAt > Date.now()),
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Ignore write errors (e.g. read-only filesystem on some container environments)
  }
}

loadStore();

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function validCredentials(username: string, password: string): string | null {
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
    return "Username must be 3-24 characters: letters, numbers, . _ -";
  }
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 200) return "Password is too long";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number";
  }
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
    emailVerified: row.email_verified === true || row.email_verified === "true",
  };
}

function storedToUser(s: StoredUser): AuthUser {
  return {
    id: s.id,
    username: s.username,
    displayName: s.displayName,
    avatarColor: s.avatarColor || avatarColorFromSeed(s.username),
    role: s.role,
    email: s.email ?? null,
    photoUrl: s.photoUrl ?? null,
    emailVerified: !!s.emailVerified,
  };
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const norm = normalizeUsername(username);
  if (memUsers.has(norm)) return false;
  const down = dbUnavailable();
  if (down) return true;
  try {
    const row = await queryOne<Record<string, unknown>>(`SELECT COUNT(*)::text c FROM users WHERE username=$1`, [norm]);
    return Number(row?.c ?? 0) === 0;
  } catch {
    return true;
  }
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const mem = memUsersById.get(id);
  if (mem) return storedToUser(mem);
  const down = dbUnavailable();
  if (!down) {
    try {
      const row = await queryOne<Record<string, unknown>>(`SELECT * FROM users WHERE id=$1`, [id]);
      if (row) return rowToUser(row);
    } catch {}
  }
  return null;
}

export async function registerUser(username: string, password: string, displayName?: string, emailRaw?: string): Promise<AuthUser> {
  const norm = normalizeUsername(username);
  if (memUsers.has(norm)) {
    throw new Error("That username is already taken");
  }
  let email: string | null = null;
  if (emailRaw !== undefined && String(emailRaw).trim() !== "") {
    if (!isValidEmail(emailRaw)) throw new Error("Please enter a valid email address");
    email = String(emailRaw).trim().toLowerCase();
    for (const u of memUsersById.values()) {
      if (u.email?.toLowerCase() === email) throw new Error("That email is already registered");
    }
    if (!dbUnavailable()) {
      try {
        const row = await queryOne<Record<string, unknown>>(`SELECT id FROM users WHERE lower(email)=$1`, [email]);
        if (row) throw new Error("That email is already registered");
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("already registered")) throw err;
      }
    }
  }

  const salt = randomBytes(16).toString("hex");
  const passHash = await hash(password, salt);
  const id = nanoid(16);
  const stored: StoredUser = {
    id,
    username: norm,
    displayName: (displayName || norm).slice(0, 32),
    avatarColor: avatarColorFromSeed(norm),
    passHash,
    passSalt: salt,
    role: "user",
    provider: "local",
    email,
    photoUrl: null,
    createdAt: Date.now(),
    emailVerified: !email,
  };

  const down = dbUnavailable();
  if (!down) {
    try {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO users (id, username, display_name, avatar_color, pass_hash, pass_salt, role, created_at, email, email_verified)
         VALUES ($1,$2,$3,$4,$5,$6,'user',$7,$8,$9)
         ON CONFLICT (username) DO NOTHING
         RETURNING *`,
        [stored.id, stored.username, stored.displayName, stored.avatarColor, passHash, salt, stored.createdAt, email, stored.emailVerified]
      );
      if (!rows.length) {
        throw new Error("That username is already taken");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("already taken")) {
        throw err;
      }
      // If DB error, fall back seamlessly to memory
    }
  }

  memUsers.set(norm, stored);
  memUsersById.set(id, stored);
  saveStore();
  return storedToUser(stored);
}

export async function loginUser(username: string, password: string): Promise<AuthUser | "unknown" | "banned" | "unverified"> {
  const norm = normalizeUsername(username);
  const lowerEmail = String(username).trim().toLowerCase();
  const down = dbUnavailable();

  if (!down) {
    try {
      const row = await queryOne<Record<string, unknown>>(
        `SELECT * FROM users WHERE username=$1 OR lower(email)=$2`,
        [norm, lowerEmail]
      );
      if (row) {
        if (row.banned_at) return "banned";
        const candidate = await hash(password, String(row.pass_salt));
        const a = Buffer.from(candidate, "hex");
        const b = Buffer.from(String(row.pass_hash), "hex");
        if (a.length === b.length && timingSafeEqual(a, b)) {
          const emailVerified = row.email_verified === true || row.email_verified === "true";
          if (row.email && !emailVerified && row.provider !== "google") {
            return "unverified";
          }
          await query(`UPDATE users SET last_login_at=$2 WHERE id=$1`, [row.id, Date.now()]);
          const u = rowToUser(row);
          memUsers.set(norm, {
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarColor: u.avatarColor,
            passHash: String(row.pass_hash),
            passSalt: String(row.pass_salt),
            role: u.role,
            provider: (row.provider as string) || "local",
            email: u.email,
            photoUrl: u.photoUrl,
            createdAt: Number(row.created_at || Date.now()),
            lastLoginAt: Date.now(),
            emailVerified: row.email_verified === true || row.email_verified === "true",
          });
          memUsersById.set(u.id, memUsers.get(norm)!);
          saveStore();
          return u;
        } else {
          return "unknown";
        }
      }
    } catch {
      // If DB fails, fall through to memory
    }
  }

  const mem = memUsers.get(norm) || [...memUsersById.values()].find((u) => u.email?.toLowerCase() === lowerEmail);
  if (!mem) return "unknown";
  if (mem.bannedAt) return "banned";
  const candidate = await hash(password, mem.passSalt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(mem.passHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "unknown";
  if (mem.email && !mem.emailVerified && mem.provider !== "google") return "unverified";
  mem.lastLoginAt = Date.now();
  saveStore();
  return storedToUser(mem);
}

export async function upsertGoogleUser(sub: string, email: string, displayName: string, photoUrl: string): Promise<AuthUser> {
  const username = normalizeUsername(email).split("@")[0].replace(/[^a-z0-9_.-]/g, "").slice(0, 24) || `g${sub.slice(0, 8)}`;
  const id = `g${createHash("sha256").update(sub).digest("hex").slice(0, 11)}`;
  const down = dbUnavailable();

  if (!down) {
    try {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO users (id, username, display_name, avatar_color, pass_hash, pass_salt, role, provider, email, photo_url, created_at)
         VALUES ($1,$2,$3,$4,'','','user','google',$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, email=EXCLUDED.email, photo_url=EXCLUDED.photo_url
         RETURNING *`,
        [id, username, displayName.slice(0, 32), avatarColorFromSeed(sub), email, photoUrl, Date.now()]
      );
      if (rows.length) {
        const u = rowToUser(rows[0]);
        memUsers.set(username, {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarColor: u.avatarColor,
          passHash: "",
          passSalt: "",
          role: u.role,
          provider: "google",
          email: u.email,
          photoUrl: u.photoUrl,
          createdAt: Date.now(),
        });
        memUsersById.set(u.id, memUsers.get(username)!);
        saveStore();
        return u;
      }
    } catch {}
  }

  const existing = memUsersById.get(id);
  if (existing) {
    existing.displayName = displayName.slice(0, 32);
    existing.email = email;
    existing.photoUrl = photoUrl;
    saveStore();
    return storedToUser(existing);
  }

  const stored: StoredUser = {
    id,
    username,
    displayName: displayName.slice(0, 32),
    avatarColor: avatarColorFromSeed(sub),
    passHash: "",
    passSalt: "",
    role: "user",
    provider: "google",
    email,
    photoUrl,
    createdAt: Date.now(),
  };
  memUsers.set(username, stored);
  memUsersById.set(id, stored);
  saveStore();
  return storedToUser(stored);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  memSessions.set(tokenHash, { tokenHash, userId, createdAt: now, expiresAt });
  saveStore();

  const down = dbUnavailable();
  if (!down) {
    try {
      await query(
        `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)`,
        [tokenHash, userId, now, expiresAt]
      );
    } catch {}
  }
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  memSessions.delete(tokenHash);
  saveStore();
  const down = dbUnavailable();
  if (!down) {
    try {
      await query(`DELETE FROM sessions WHERE token_hash=$1`, [tokenHash]);
    } catch {}
  }
}

export async function resolveToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const memSession = memSessions.get(tokenHash);
  if (memSession && memSession.expiresAt > Date.now()) {
    const user = memUsersById.get(memSession.userId);
    if (user && !user.bannedAt) return storedToUser(user);
  }

  const down = dbUnavailable();
  if (!down) {
    try {
      const row = await queryOne<Record<string, unknown>>(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash=$1 AND s.expires_at > $2`,
        [tokenHash, Date.now()]
      );
      if (row && !row.banned_at) {
        return rowToUser(row);
      }
    } catch {}
  }
  return null;
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
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "admin123";

  // Bootstrap admin in memory
  const salt = randomBytes(16).toString("hex");
  const passHash = await hash(password, salt);
  const existingMem = memUsers.get(username);
  if (existingMem) {
    existingMem.role = "admin";
  } else {
    const adminUser: StoredUser = {
      id: nanoid(16),
      username,
      displayName: "Admin",
      avatarColor: "#06b6d4",
      passHash,
      passSalt: salt,
      role: "admin",
      provider: "local",
      email: null,
      photoUrl: null,
      createdAt: Date.now(),
    };
    memUsers.set(username, adminUser);
    memUsersById.set(adminUser.id, adminUser);
  }
  saveStore();

  const down = dbUnavailable();
  if (!down) {
    try {
      const existing = await queryOne<Record<string, unknown>>(`SELECT id FROM users WHERE username=$1`, [username]);
      if (existing) {
        await query(`UPDATE users SET role='admin' WHERE id=$1`, [existing.id]);
      } else {
        await query(
          `INSERT INTO users (id, username, display_name, avatar_color, pass_hash, pass_salt, role, created_at)
           VALUES ($1,$2,'Admin','#06b6d4',$3,$4,'admin',$5) ON CONFLICT (username) DO NOTHING`,
          [nanoid(16), username, passHash, salt, Date.now()]
        );
      }
    } catch {}
  }
  console.log(`[Auth] Admin account ready as "${username}"`);
}

export async function isBanned(userId: string): Promise<boolean> {
  const mem = memUsersById.get(userId);
  if (mem?.bannedAt) return true;
  const down = dbUnavailable();
  if (!down) {
    try {
      const row = await queryOne<{ banned_at: string | null }>(`SELECT banned_at FROM users WHERE id=$1`, [userId]);
      return !!row?.banned_at;
    } catch {}
  }
  return false;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const e = String(email).trim().toLowerCase();
  for (const u of memUsersById.values()) {
    if (u.email?.toLowerCase() === e) return u.id;
  }
  if (!dbUnavailable()) {
    try {
      const row = await queryOne<Record<string, unknown>>(`SELECT id FROM users WHERE lower(email)=$1`, [e]);
      if (row) return String(row.id);
    } catch {}
  }
  return null;
}

export async function sendVerificationForUser(userId: string): Promise<{ ok: boolean; email: string | null; error?: string; devCode?: string }> {
  // 6-digit OTP, hashed at rest (never stored in plain text).
  const code = String(randomInt(100000, 999999));
  const tokenHash = hashToken(code);
  const expiry = Date.now() + VERIFY_TTL_MS;

  let email: string | null = null;
  const mem = memUsersById.get(userId);
  if (mem) {
    if (!mem.email) return { ok: false, email: null, error: "No email on this account" };
    if (mem.emailVerified) return { ok: true, email: mem.email };
    email = mem.email;
    mem.verifyTokenHash = tokenHash;
    mem.verifyExpiry = expiry;
    saveStore();
  }

  if (!dbUnavailable()) {
    try {
      const row = await queryOne<Record<string, unknown>>(`SELECT email, email_verified FROM users WHERE id=$1`, [userId]);
      if (row) {
        if (row.email_verified === true || row.email_verified === "true") {
          return { ok: true, email: row.email ? String(row.email) : null };
        }
        if (row.email) {
          email = String(row.email);
          await query(`UPDATE users SET verify_token=$2, verify_expiry=$3 WHERE id=$1`, [userId, tokenHash, expiry]);
        }
      }
    } catch {}
  }

  if (!email) return { ok: false, email: null, error: "No email on this account" };
  const sent = await sendMail(verificationEmail(email, code));
  if (!sent) return { ok: false, email, error: "Failed to send verification email" };
  // Only expose devCode fallback when real SMTP is NOT configured
  const devCode = isSmtpConfigured() ? undefined : code;
  return { ok: true, email, devCode };
}

export async function verifyOtp(emailRaw: string, code: string): Promise<"ok" | "invalid" | "expired"> {
  const email = String(emailRaw).trim().toLowerCase();
  const tokenHash = hashToken(String(code).trim());
  const now = Date.now();
  for (const u of memUsersById.values()) {
    if (u.email?.toLowerCase() === email && u.verifyTokenHash === tokenHash) {
      if (u.verifyExpiry && u.verifyExpiry < now) return "expired";
      u.emailVerified = true;
      u.verifyTokenHash = null;
      u.verifyExpiry = null;
      saveStore();
      return "ok";
    }
  }
  if (!dbUnavailable()) {
    try {
      const row = await queryOne<Record<string, unknown>>(
        `SELECT id, verify_expiry, verify_token, email_verified FROM users WHERE lower(email)=$1`,
        [email]
      );
      if (row) {
        if (row.email_verified === true || row.email_verified === "true") return "ok";
        if (String(row.verify_token) !== tokenHash) return "invalid";
        if (Number(row.verify_expiry) < now) return "expired";
        await query(`UPDATE users SET email_verified=true, verify_token=NULL, verify_expiry=NULL WHERE id=$1`, [row.id]);
        return "ok";
      }
    } catch {}
  }
  return "invalid";
}

export async function createPasswordReset(identifier: string): Promise<boolean> {
  const norm = normalizeUsername(identifier);
  const lowerEmail = String(identifier).trim().toLowerCase();

  let userId: string | null = null;
  let email: string | null = null;

  const mem = memUsers.get(norm) || [...memUsersById.values()].find((u) => u.email?.toLowerCase() === lowerEmail);
  if (mem) {
    userId = mem.id;
    email = mem.email || mem.username;
  }
  if (!mem && !dbUnavailable()) {
    try {
      const row = await queryOne<Record<string, unknown>>(
        `SELECT id, email, username FROM users WHERE username=$1 OR lower(email)=$2`,
        [norm, lowerEmail]
      );
      if (row) {
        userId = String(row.id);
        email = String(row.email || row.username);
      }
    } catch {}
  }
  if (!userId) return true; // generic response — never reveal whether the account exists

  const token = randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiry = Date.now() + RESET_TTL_MS;

  const memU = memUsersById.get(userId);
  if (memU) {
    memU.resetTokenHash = tokenHash;
    memU.resetExpiry = expiry;
    saveStore();
  }
  if (!dbUnavailable()) {
    try {
      await query(`UPDATE users SET reset_token=$2, reset_expiry=$3 WHERE id=$1`, [userId, tokenHash, expiry]);
    } catch {}
  }

  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173").replace(/\/$/, "");
  const link = `${base}/reset?token=${encodeURIComponent(token)}`;
  if (email) await sendMail(resetEmail(email, link));
  return true;
}

export async function resetPassword(token: string, newPassword: string): Promise<"ok" | "invalid" | "expired" | "weak"> {
  if (newPassword.length < 8 || newPassword.length > 200) return "weak";
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return "weak";

  const tokenHash = hashToken(token);
  const now = Date.now();

  for (const u of memUsersById.values()) {
    if (u.resetTokenHash === tokenHash) {
      if (u.resetExpiry && u.resetExpiry < now) return "expired";
      const salt = randomBytes(16).toString("hex");
      const passHash = await hash(newPassword, salt);
      u.passHash = passHash;
      u.passSalt = salt;
      u.resetTokenHash = null;
      u.resetExpiry = null;
      for (const [th, s] of memSessions) {
        if (s.userId === u.id) memSessions.delete(th);
      }
      saveStore();
      return "ok";
    }
  }

  if (!dbUnavailable()) {
    try {
      const row = await queryOne<Record<string, unknown>>(`SELECT id, reset_expiry FROM users WHERE reset_token=$1`, [tokenHash]);
      if (row) {
        if (Number(row.reset_expiry) < now) return "expired";
        const salt = randomBytes(16).toString("hex");
        const passHash = await hash(newPassword, salt);
        await query(
          `UPDATE users SET pass_hash=$2, pass_salt=$3, reset_token=NULL, reset_expiry=NULL WHERE id=$1`,
          [row.id, passHash, salt]
        );
        await query(`DELETE FROM sessions WHERE user_id=$1`, [row.id]);
        return "ok";
      }
    } catch {}
  }
  return "invalid";
}
