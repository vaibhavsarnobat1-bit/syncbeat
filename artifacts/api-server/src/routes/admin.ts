import { Router, type IRouter, type Response } from "express";
import { requireAdmin, type AuthedRequest } from "../lib/auth.js";
import { query, queryOne } from "../lib/db.js";
import { deleteRoom, getAllRooms, roomToJSON } from "../lib/rooms.js";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/stats", async (_req: AuthedRequest, res: Response) => {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const one = async (sql: string, params?: unknown[]) => {
    const row = await queryOne<Record<string, unknown>>(sql, params);
    return Number(row?.c ?? 0);
  };
  res.json({
    users: await one(`SELECT COUNT(*)::text c FROM users`),
    newUsersToday: await one(`SELECT COUNT(*)::text c FROM users WHERE created_at >= $1`, [dayAgo]),
    newUsersWeek: await one(`SELECT COUNT(*)::text c FROM users WHERE created_at >= $1`, [weekAgo]),
    activeToday: await one(`SELECT COUNT(*)::text c FROM users WHERE last_login_at >= $1`, [dayAgo]),
    banned: await one(`SELECT COUNT(*)::text c FROM users WHERE banned_at IS NOT NULL`),
    rooms: await one(`SELECT COUNT(*)::text c FROM rooms`),
    messages: await one(`SELECT COUNT(*)::text c FROM messages`),
    onlineRooms: getAllRooms().filter((r) => r.members.size > 0).length,
    sharedSongs: await one(`SELECT COUNT(*)::text c FROM media_files`),
    db: true,
  });
});

router.get("/users", async (req: AuthedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const rows = await query<Record<string, unknown>>(
    `SELECT u.id, u.username, u.display_name, u.avatar_color, u.role, u.provider, u.email,
            u.created_at, u.last_login_at, u.banned_at,
            (SELECT COUNT(*) FROM room_members m WHERE m.user_id = u.id) AS room_count
     FROM users u ORDER BY u.created_at DESC LIMIT $1`,
    [limit]
  );
  res.json({
    users: rows.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarColor: r.avatar_color,
      role: r.role,
      provider: r.provider,
      email: r.email,
      createdAt: Number(r.created_at),
      lastLoginAt: r.last_login_at ? Number(r.last_login_at) : null,
      bannedAt: r.banned_at ? Number(r.banned_at) : null,
      roomCount: Number(r.room_count),
    })),
  });
});

router.post("/users/:id/ban", async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  if (id === req.user!.id) {
    res.status(400).json({ error: "You cannot ban your own admin account" });
    return;
  }
  const rows = await query(
    `UPDATE users SET banned_at=$2 WHERE id=$1 AND role <> 'admin' RETURNING id`,
    [id, Date.now()]
  );
  if (!rows.length) { res.status(404).json({ error: "User not found or is an admin" }); return; }
  await query(`DELETE FROM sessions WHERE user_id=$1`, [id]);
  res.json({ ok: true });
});

router.post("/users/:id/unban", async (req: AuthedRequest, res: Response) => {
  const rows = await query(`UPDATE users SET banned_at=NULL WHERE id=$1 RETURNING id`, [String(req.params.id)]);
  if (!rows.length) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ok: true });
});

router.delete("/users/:id", async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  if (id === req.user!.id) {
    res.status(400).json({ error: "You cannot delete your own admin account" });
    return;
  }
  const rows = await query(`DELETE FROM users WHERE id=$1 AND role <> 'admin' RETURNING id`, [id]);
  if (!rows.length) { res.status(404).json({ error: "User not found or is an admin" }); return; }
  await query(`DELETE FROM sessions WHERE user_id=$1`, [id]);
  await query(`DELETE FROM room_members WHERE user_id=$1`, [id]);
  res.json({ ok: true });
});

router.get("/rooms", (_req: AuthedRequest, res: Response) => {
  const rooms = getAllRooms().map((r) => ({
    ...roomToJSON(r),
    messageCount: r.messages.length,
    members: Array.from(r.members.values()).map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      avatarColor: m.avatarColor,
      joinedAt: m.joinedAt,
    })),
  }));
  res.json({ rooms });
});

router.delete("/rooms/:inviteCode", async (req: AuthedRequest, res: Response) => {
  const deleted = await deleteRoom(String(req.params.inviteCode));
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Room not found" });
});

router.get("/messages", async (req: AuthedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const room = req.query.room ? String(req.query.room) : null;
  const search = req.query.q ? `%${String(req.query.q)}%` : null;
  const rows = await query<Record<string, unknown>>(
    `SELECT m.id, m.room_invite_code, r.name AS room_name, m.user_id, m.display_name,
            m.avatar_color, m.text, m.timestamp, m.is_system
     FROM messages m LEFT JOIN rooms r ON r.invite_code = m.room_invite_code
     WHERE ($1::text IS NULL OR m.room_invite_code = $1)
       AND ($2::text IS NULL OR m.text ILIKE $2)
     ORDER BY m.timestamp DESC LIMIT $3`,
    [room, search, limit]
  );
  res.json({
    messages: rows.map((row) => ({
      id: row.id,
      inviteCode: row.room_invite_code,
      roomName: row.room_name ?? "Room",
      userId: row.user_id,
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      text: row.text,
      timestamp: Number(row.timestamp),
      isSystem: row.is_system,
    })),
  });
});

export default router;
