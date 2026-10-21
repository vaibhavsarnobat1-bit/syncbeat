import { Router, type IRouter, type Response } from "express";
import express from "express";
import { CreateRoomBody, GetRoomParams } from "@workspace/api-zod";
import { requireAuth, resolveToken, type AuthedRequest } from "../lib/auth.js";
import {
  createRoom,
  resolveRoom,
  listUserRooms,
  forgetRoom,
  getRoomByHostUserId,
  getAllRooms,
  roomToJSON,
} from "../lib/rooms.js";
import { MAX_MEDIA_BYTES, saveMediaFile, getMediaFile } from "../lib/media.js";

const router: IRouter = Router();

function param(req: AuthedRequest, key: string): string {
  return String(req.params[key] ?? "");
}

router.post("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const parsed = CreateRoomBody.safeParse(req.body);
    const name = parsed.success
      ? parsed.data.name
      : String(req.body?.name ?? "").trim() || "Vibe Room";
    const room = await createRoom(name.slice(0, 60), req.user!.id, req.user!.displayName);
    res.status(201).json(roomToJSON(room));
  } catch (err: unknown) {
    console.error("[Rooms] createRoom error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to create room" });
  }
});

router.get("/public", requireAuth, (_req: AuthedRequest, res: Response) => {
  res.json(getAllRooms().map((r) => roomToJSON(r)));
});

router.get("/mine", requireAuth, async (req: AuthedRequest, res: Response) => {
  res.json(await listUserRooms(req.user!.id));
});

router.delete("/mine/:inviteCode", requireAuth, async (req: AuthedRequest, res: Response) => {
  await forgetRoom(req.user!.id, param(req, "inviteCode"));
  res.json({ ok: true });
});

router.get("/by-host/:userId", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = param(req, "userId");
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const room = await getRoomByHostUserId(userId);
  if (!room) { res.status(404).json({ error: "No room found" }); return; }
  res.json(roomToJSON(room));
});

// ── Shared device songs ──────────────────────────────────────────────────────

router.post(
  "/:inviteCode/media",
  requireAuth,
  express.raw({ type: "*/*", limit: `${MAX_MEDIA_BYTES / 1024 + 64}kb` }),
  async (req: AuthedRequest, res: Response) => {
    const inviteCode = param(req, "inviteCode");
    const room = await resolveRoom(inviteCode);
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }

    const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (data.length === 0) { res.status(400).json({ error: "Empty audio upload" }); return; }
    if (data.length > MAX_MEDIA_BYTES) {
      res.status(413).json({ error: "Song must be 10 MB or smaller" });
      return;
    }

    const rawTitle = String(req.query.title ?? req.headers["x-title"] ?? "Device Song").slice(0, 120);
    const mime = String(req.headers["content-type"] ?? "audio/mpeg").split(";")[0];
    const duration = Number(req.query.duration ?? 0) || 0;

    const meta = await saveMediaFile({
      roomInviteCode: room.inviteCode,
      uploaderUserId: req.user!.id,
      title: decodeURIComponent(rawTitle),
      mime: mime.startsWith("audio/") ? mime : "audio/mpeg",
      duration,
      data,
    });
    res.status(201).json(meta);
  }
);

router.get("/:inviteCode/media/:mediaId", async (req: AuthedRequest, res: Response) => {
  const caller = await resolveToken(String(req.query.t ?? ""));
  if (!caller) { res.status(401).json({ error: "Sign in required" }); return; }

  const file = await getMediaFile(param(req, "mediaId"));
  if (!file || file.meta.roomInviteCode !== param(req, "inviteCode")) {
    res.status(404).json({ error: "Song not found" });
    return;
  }

  const total = file.data.length;
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = Math.min(match?.[2] ? Number(match[2]) : total - 1, total - 1);
    if (Number.isNaN(start) || start >= total || end < start) {
      res.status(416).setHeader("Content-Range", `bytes */${total}`).end();
      return;
    }
    res
      .status(206)
      .setHeader("Accept-Ranges", "bytes")
      .setHeader("Content-Range", `bytes ${start}-${end}/${total}`)
      .setHeader("Content-Length", String(end - start + 1))
      .setHeader("Content-Type", file.meta.mime)
      .end(file.data.subarray(start, end + 1));
    return;
  }

  res
    .status(200)
    .setHeader("Accept-Ranges", "bytes")
    .setHeader("Content-Length", String(total))
    .setHeader("Content-Type", file.meta.mime)
    .end(file.data);
});

router.get("/:inviteCode", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { inviteCode } = GetRoomParams.parse(req.params);
  const room = await resolveRoom(inviteCode);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(roomToJSON(room));
});

export default router;
