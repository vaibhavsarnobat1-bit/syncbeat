
import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { nanoid } from "nanoid";
import {
  LoginAnonymousBody,
  LoginAnonymousResponse,
  LoginGoogleBody,
  LoginGoogleResponse,
} from "@workspace/api-zod";
import { generateAvatarColor, avatarColorFromSeed } from "../lib/rooms.js";

const router: IRouter = Router();

router.post("/anonymous", (req, res) => {
  const body = LoginAnonymousBody.parse(req.body);
  const displayName = body.displayName || `Guest${Math.floor(Math.random() * 9999)}`;
  const data = LoginAnonymousResponse.parse({
    userId: nanoid(12),
    displayName,
    avatarColor: generateAvatarColor(),
  });
  res.json(data);
});

interface GoogleTokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  given_name?: string;
  picture?: string;
}

// Same Google account always maps to the same userId/color
function googleUserId(sub: string): string {
  return `g${createHash("sha256").update(sub).digest("hex").slice(0, 11)}`;
}

router.post("/google", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Google login is not configured (missing GOOGLE_CLIENT_ID)" });
    return;
  }

  const parsed = LoginGoogleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing Google credential" });
    return;
  }

  let payload: GoogleTokenInfo;
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.credential)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`tokeninfo returned ${r.status}`);
    payload = (await r.json()) as GoogleTokenInfo;
  } catch {
    res.status(401).json({ error: "Google sign-in failed. Please try again." });
    return;
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!payload.sub || payload.aud !== clientId || !emailVerified) {
    res.status(401).json({ error: "Google credential rejected. Please try again." });
    return;
  }

  const displayName =
    payload.name || payload.given_name || payload.email?.split("@")[0] || "Google User";

  const data = LoginGoogleResponse.parse({
    userId: googleUserId(payload.sub),
    displayName,
    avatarColor: avatarColorFromSeed(payload.sub),
    email: payload.email,
    photoUrl: payload.picture,
  });
  res.json(data);
});

export default router;
