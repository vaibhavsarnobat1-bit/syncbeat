import { Router, type IRouter } from "express";
import { nanoid } from "nanoid";
import { LoginAnonymousBody, LoginAnonymousResponse } from "@workspace/api-zod";
import { generateAvatarColor } from "../lib/rooms.js";

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

export default router;
