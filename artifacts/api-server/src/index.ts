import http from "http";
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

async function boot() {
  const ready = await ensureSchema();
  if (ready) {
    await bootstrapAdmin();
    await loadRoomsFromDB();
    console.log("[Server] Database ready — rooms and chat will persist");
  } else {
    console.warn(`[Server] Running memory-only: ${dbStatus().lastError || "no DATABASE_URL"}`);
  }

  server.listen(effectivePort, () => {
    console.log(`[Server] SyncBeat API & WebSocket listening on http://localhost:${effectivePort}`);
  });
}

boot().catch((err) => {
  console.error("[Server] boot failed, starting without database:", err);
  server.listen(effectivePort);
});
