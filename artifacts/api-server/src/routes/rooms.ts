import { Router, type IRouter } from "express";
import { CreateRoomBody, GetRoomParams } from "@workspace/api-zod";
import { createRoom, getRoomByInviteCode, getRoomByHostUserId, getAllRooms, roomToJSON } from "../lib/rooms.js";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  try {
    const parsed = CreateRoomBody.safeParse(req.body);
    let name = "Vibe Room";
    let hostUserId = `anon-${Math.random().toString(36).substring(2, 9)}`;
    let hostDisplayName = "Host";

    if (parsed.success) {
      name = parsed.data.name;
      hostUserId = parsed.data.hostUserId;
      hostDisplayName = parsed.data.hostDisplayName;
    } else if (req.body && typeof req.body.name === "string" && req.body.name.trim()) {
      name = req.body.name.trim();
      if (req.body.hostUserId) hostUserId = String(req.body.hostUserId);
      if (req.body.hostDisplayName) hostDisplayName = String(req.body.hostDisplayName);
    }

    const room = await createRoom(name, hostUserId, hostDisplayName);
    res.status(201).json(roomToJSON(room));
  } catch (err: any) {
    console.error("[Rooms] createRoom error:", err);
    res.status(500).json({ error: err?.message || "Failed to create room" });
  }
});

router.get("/public", (_req, res) => {
  const rooms = getAllRooms().map(r => roomToJSON(r));
  res.json(rooms);
});

router.get("/by-host/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const room = await getRoomByHostUserId(userId);
  if (!room) { res.status(404).json({ error: "No room found" }); return; }
  res.json(roomToJSON(room));
});

router.get("/:inviteCode", (req, res) => {
  const { inviteCode } = GetRoomParams.parse(req.params);
  const room = getRoomByInviteCode(inviteCode);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(roomToJSON(room));
});

export default router;

