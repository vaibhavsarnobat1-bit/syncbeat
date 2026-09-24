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

let dbAvailable: boolean | null = null;

export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!pool || dbAvailable === false) return [];
  try {
    const res = await pool.query(sql, params);
    dbAvailable = true;
    return res.rows as T[];
  } catch (err: unknown) {
    if (dbAvailable === null) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[DB] Database unavailable (${msg}). Seamlessly using in-memory mode.`);
      dbAvailable = false;
    }
    return [];
  }
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

