import http from "http";
import app from "./app.js";
import { setupWebSocket } from "./lib/websocket.js";
import { loadRoomsFromDB } from "./lib/rooms.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
setupWebSocket(server);

// Load persisted rooms from DB before accepting connections
loadRoomsFromDB().then(() => {
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch((err) => {
  console.error("Failed to load rooms from DB:", err);
  server.listen(port, () => {
    console.log(`Server listening on port ${port} (no DB rooms loaded)`);
  });
});
