import http from "http";
import app from "./app.js";
import { setupWebSocket } from "./lib/websocket.js";
import { loadRoomsFromDB } from "./lib/rooms.js";

// Render or local .env assigns PORT
const port = Number(process.env["PORT"] || "3001");
const effectivePort = Number.isNaN(port) || port <= 0 ? 3001 : port;

console.log(`[Server] NODE_ENV=${process.env.NODE_ENV || 'development'}, starting on port ${effectivePort}`);

const server = http.createServer(app);
setupWebSocket(server);

// Start server immediately so API & WebSockets are instantly available
server.listen(effectivePort, () => {
  console.log(`[Server] SyncBeat API & WebSocket listening on http://localhost:${effectivePort}`);
});

// Load persisted rooms from DB in background if available
loadRoomsFromDB().catch((err) => {
  console.log("[Server] DB offline or in-memory mode:", err?.message || err);
});

