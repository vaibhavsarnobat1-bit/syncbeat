import http from "http";
import https from "https";
import app from "./app.js";
import { setupWebSocket } from "./lib/websocket.js";
import { loadRoomsFromDB } from "./lib/rooms.js";
import { ensureSchema } from "./lib/schema.js";
import { bootstrapAdmin } from "./lib/auth.js";
import { dbStatus } from "./lib/db.js";

// Render or local .env assigns PORT
const port = Number(process.env["PORT"] || "3001");
const effectivePort = Number.isNaN(port) || port <= 0 ? 3001 : port;

console.log(`[Server] NODE_ENV=${process.env.NODE_ENV || 'development'}, starting on port ${effectivePort}`);

const server = http.createServer(app);
setupWebSocket(server);

// Listen FIRST so the health check and static HTML respond instantly, even while
// the database is still warming up. DB/schema init happens in the background so a
// slow/sleeping database never delays the first byte of the page.
server.listen(effectivePort, () => {
  console.log(`[Server] SyncBeat API & WebSocket listening on http://localhost:${effectivePort}`);
});

async function bootDatabase() {
  try {
    const ready = await ensureSchema();
    if (ready) {
      await bootstrapAdmin();
      await loadRoomsFromDB();
      console.log("[Server] Database ready — rooms and chat will persist");
    } else {
      console.warn(`[Server] Running memory-only: ${dbStatus().lastError || "no DATABASE_URL"}`);
      await bootstrapAdmin();
    }
  } catch (err) {
    console.error("[Server] boot failed, running without database:", err);
    try { await bootstrapAdmin(); } catch { /* non-fatal */ }
  }
}

void bootDatabase();

// ────────────────────────────────────────────────────────────────────────────
// 🔄 SELF-PING KEEP-ALIVE: Prevents Render free-tier cold-start sleeping.
// Pings /api/healthz every 10 minutes so the service NEVER goes idle.
// ────────────────────────────────────────────────────────────────────────────
const RENDER_EXTERNAL_URL = process.env["RENDER_EXTERNAL_URL"];
if (RENDER_EXTERNAL_URL) {
  const pingUrl = `${RENDER_EXTERNAL_URL}/api/healthz`;
  const client = pingUrl.startsWith("https") ? https : http;

  const doPing = () => {
    const req = client.get(pingUrl, (res) => {
      console.log(`[KeepAlive] Ping ${pingUrl} → ${res.statusCode}`);
      res.resume(); // consume response so socket is freed
    });
    req.on("error", (err) => {
      console.warn("[KeepAlive] Ping failed:", (err as Error).message);
    });
    req.setTimeout(10000, () => req.destroy());
  };

  // Ping once right away, then every 5 minutes. Render free tier sleeps after
  // ~15 min of inactivity, so 5 min keeps the instance warm while staying well
  // under the idle threshold (a 10 min gap was too close and let it sleep).
  const startPing = () => {
    doPing();
    setInterval(doPing, 5 * 60 * 1000); // every 5 minutes
  };
  // Ping after 5s (no need to wait 30s), giving the boot a moment to settle.
  setTimeout(startPing, 5_000);

  console.log(`[KeepAlive] Self-ping active → ${pingUrl} every 5 min`);
}
