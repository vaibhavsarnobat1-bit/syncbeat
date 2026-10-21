import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[DB] Running in memory-only mode (DATABASE_URL not set).");
}

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10,
    })
  : null;

if (pool) {
  pool.on("error", (err) => {
    console.warn("[DB] Pool background connection notice:", err.message);
  });
}

let dbBrokenUntil = 0;
let lastDbError = "";
const DB_RETRY_MS = 30_000;

export function dbStatus() {
  return { configured: !!pool, degraded: Date.now() < dbBrokenUntil, lastError: lastDbError };
}

export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!pool) return [];
  if (Date.now() < dbBrokenUntil) return [];
  try {
    const res = await pool.query(sql, params);
    dbBrokenUntil = 0;
    lastDbError = "";
    return res.rows as T[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    dbBrokenUntil = Date.now() + DB_RETRY_MS;
    if (msg !== lastDbError) console.warn(`[DB] ${msg} — retrying in ${DB_RETRY_MS / 1000}s`);
    lastDbError = msg;
    return [];
  }
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

