import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAllRooms, getAllUsers, getStats, deleteRoom, getAllMessages, roomToJSON } from "../lib/rooms.js";

const router: IRouter = Router();
const ADMIN_SECRET = process.env["ADMIN_SECRET"] || "Vaibhav@2004";

// Auth middleware
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["x-admin-secret"] || req.query["secret"];
  if (auth !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use(adminAuth);

// Dashboard stats
router.get("/stats", (_req, res) => {
  res.json(getStats());
});

// List all rooms
router.get("/rooms", (_req, res) => {
  const rooms = getAllRooms().map(r => ({
    ...roomToJSON(r),
    messageCount: r.messages.length,
    members: Array.from(r.members.values()).map(m => ({
      userId: m.userId,
      displayName: m.displayName,
      avatarColor: m.avatarColor,
      joinedAt: m.joinedAt,
    })),
  }));
  res.json({ rooms });
});

// Delete a room
router.delete("/rooms/:inviteCode", async (req, res) => {
  const deleted = await deleteRoom(req.params.inviteCode);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Room not found" });
});

// All messages across all rooms
router.get("/messages", (req, res) => {
  const limit = Math.min(Number(req.query["limit"]) || 200, 500);
  const room = req.query["room"] as string | undefined;
  let messages = getAllMessages();
  if (room) messages = messages.filter(m => m.inviteCode === room);
  res.json({ messages: messages.slice(0, limit), total: messages.length });
});

// List all active users
router.get("/users", (_req, res) => {
  const users = getAllUsers().map(u => ({
    userId: u.userId,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    joinedAt: u.joinedAt,
  }));
  res.json({ users });
});

export default router;
