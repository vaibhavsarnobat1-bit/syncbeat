import { Router, type IRouter, type Request, type Response } from "express";
import {
  createSession,
  getUserById,
  isUsernameAvailable,
  loginUser,
  normalizeUsername,
  registerUser,
  requireAuth,
  revokeSession,
  sendVerificationForUser,
  verifyOtp,
  findUserIdByEmail,
  createPasswordReset,
  resetPassword,
  upsertGoogleUser,
  validCredentials,
  type AuthedRequest,
} from "../lib/auth.js";

const router: IRouter = Router();

interface Attempt { count: number; resetAt: number }
const attempts = new Map<string, Attempt>();

function throttled(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

async function issueToken(userId: string) {
  const token = await createSession(userId);
  const user = await getUserById(userId);
  return user ? {
    token,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    role: user.role,
    email: user.email ?? undefined,
    photoUrl: user.photoUrl ?? undefined,
  } : null;
}

router.get("/username/:username/available", async (req: Request, res: Response) => {
  const username = normalizeUsername(req.params.username);
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
    res.json({ available: false, reason: "Username must be 3-24 characters: letters, numbers, . _ -" });
    return;
  }
  const available = await isUsernameAvailable(username);
  res.json({ available });
});

const NAME_PATTERN = /^[a-z0-9_.-]{3,24}$/;

function candidateNames(base: string): string[] {
  // Trim the digits they already tried so the suggestion reads as `vaibhav48`, not `vaibhav1223_0148`
  const stripped = base.replace(/[0-9._-]+$/, "");
  const root = (stripped.length >= 3 ? stripped : base).slice(0, 19).replace(/[._-]+$/, "");
  const dice = () => String(Math.floor(Math.random() * 90) + 10);
  const out = new Set([
    `${root}1234`,
    `${root}_01`,
    `${root}${dice()}`,
    `the_${root}`.slice(0, 24),
    `${root}.${dice()}${dice()}`,
    `${root}_${dice()}`,
  ]);
  return [...out].filter((n) => NAME_PATTERN.test(n) && n !== base).slice(0, 6);
}

router.get("/username/:username/suggestions", async (req: Request, res: Response) => {
  const username = normalizeUsername(req.params.username);
  if (!NAME_PATTERN.test(username)) {
    res.json({ suggestions: [] });
    return;
  }
  const wanted = candidateNames(username);
  const suggestions: string[] = [];
  for (const name of wanted) {
    if (await isUsernameAvailable(name)) {
      suggestions.push(name);
      if (suggestions.length >= 3) break;
    }
  }
  res.json({ suggestions });
});

router.post("/register", async (req: Request, res: Response) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password ?? "");
  const problem = validCredentials(username, password);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  if (throttled(`register:${req.ip}`, 10, 10 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }

  // 🌟 SMART AUTO-LOGIN: If user already exists with matching credentials, log them in automatically!
  const emailInput = req.body?.email ? String(req.body.email).trim().toLowerCase() : undefined;
  const existingLogin = await loginUser(emailInput || username, password);
  if (typeof existingLogin !== "string") {
    const payload = await issueToken(existingLogin.id);
    if (payload) {
      res.status(200).json({ user: payload, autoLoggedIn: true });
      return;
    }
  } else if (existingLogin === "unverified") {
    const userId = await findUserIdByEmail(emailInput || username);
    if (userId) {
      const sent = await sendVerificationForUser(userId);
      res.status(200).json({
        user: { id: userId, username, email: sent.email || emailInput, emailVerified: false },
        needsVerification: true,
        devCode: sent.devCode,
      });
      return;
    }
  }

  try {
    const user = await registerUser(username, password, req.body?.displayName ? String(req.body.displayName) : undefined, req.body?.email);
    // If an email was provided, the account must be verified before signing in.
    if (user.email && !user.emailVerified) {
      const sent = await sendVerificationForUser(user.id);
      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerified: false,
        },
        needsVerification: true,
        devCode: sent.devCode, // dev mode only (no SMTP)
      });
      return;
    }
    const payload = await issueToken(user.id);
    if (!payload) {
      res.status(500).json({ error: "Could not start your session" });
      return;
    }
    res.status(201).json({ user: payload });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sign up failed";
    const code = msg.includes("taken") || msg.includes("already registered") ? 409 : msg.includes("valid email") ? 400 : 500;
    res.status(code).json({ error: msg });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password ?? "");
  if (throttled(`login:${req.ip}:${username}`, 8, 10 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }
  const result = await loginUser(username, password);
  if (result === "banned") {
    res.status(403).json({ error: "This account has been suspended." });
    return;
  }
  if (result === "unverified") {
    res.status(403).json({ error: "Please verify your email before signing in", needsVerification: true });
    return;
  }
  if (typeof result === "string") {
    res.status(401).json({ error: "Wrong username or password" });
    return;
  }
  const payload = await issueToken(result.id);
  if (!payload) {
    res.status(500).json({ error: "Could not start your session" });
    return;
  }
  res.json({ user: payload });
});

router.post("/logout", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  if (token) await revokeSession(token);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user });
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

router.post("/google", async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Google login is not configured (missing GOOGLE_CLIENT_ID)" });
    return;
  }
  const credential = String(req.body?.credential ?? "");
  if (!credential) {
    res.status(400).json({ error: "Missing Google credential" });
    return;
  }

  let payload: GoogleTokenInfo;
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`tokeninfo returned ${r.status}`);
    payload = (await r.json()) as GoogleTokenInfo;
  } catch {
    res.status(401).json({ error: "Google sign-in failed. Please try again." });
    return;
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!payload.sub || payload.aud !== clientId || !emailVerified || !payload.email) {
    res.status(401).json({ error: "Google credential rejected. Please try again." });
    return;
  }

  const user = await upsertGoogleUser(
    payload.sub,
    payload.email,
    payload.name || payload.given_name || payload.email.split("@")[0],
    payload.picture || ""
  );
  const session = await issueToken(user.id);
  if (!session) {
    res.status(500).json({ error: "Could not start your session" });
    return;
  }
  res.json({ user: session });
});

router.post("/verify-email-otp", async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const otp = String(req.body?.otp ?? "").trim();
  if (!email || !otp) {
    res.status(400).json({ error: "Email and verification code are required" });
    return;
  }
  const status = await verifyOtp(email, otp);
  if (status === "ok") {
    const userId = await findUserIdByEmail(email);
    const session = userId ? await issueToken(userId) : null;
    res.json({ ok: true, user: session });
    return;
  }
  if (status === "expired") {
    res.status(410).json({ error: "This verification code has expired. Request a new one." });
    return;
  }
  res.status(400).json({ error: "Incorrect verification code." });
});

router.post("/resend-verification", async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (throttled(`verify:${req.ip}`, 5, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    // Generic success — do not reveal whether the address is registered.
    res.json({ ok: true });
    return;
  }
  const sent = await sendVerificationForUser(userId);
  res.json({ ok: true, devCode: sent.devCode }); // dev mode only
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const identifier = String(req.body?.identifier ?? req.body?.email ?? "").trim();
  if (!identifier) {
    res.status(400).json({ error: "Enter your email or username" });
    return;
  }
  if (throttled(`forgot:${req.ip}`, 5, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }
  await createPasswordReset(identifier);
  // Always return the same message so attackers cannot tell if an account exists.
  res.json({ ok: true });
});

router.post("/reset-password", async (req: Request, res: Response) => {
  const token = String(req.body?.token ?? "");
  const password = String(req.body?.password ?? "");
  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  const status = await resetPassword(token, password);
  if (status === "ok") {
    res.json({ ok: true });
    return;
  }
  if (status === "expired") {
    res.status(410).json({ error: "This reset link has expired. Request a new one." });
    return;
  }
  if (status === "weak") {
    res.status(400).json({ error: "Password must be at least 8 characters with a letter and a number" });
    return;
  }
  res.status(400).json({ error: "This reset link is invalid." });
});

export default router;
