import { Router, type IRouter } from "express";
import { CreateRoomBody, GetRoomParams } from "@workspace/api-zod";
import { createRoom, getRoomByInviteCode, getRoomByHostUserId, getAllRooms, roomToJSON } from "../lib/rooms.js";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const body = CreateRoomBody.parse(req.body);
  const room = await createRoom(body.name, body.hostUserId, body.hostDisplayName);
  res.status(201).json(roomToJSON(room));
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

