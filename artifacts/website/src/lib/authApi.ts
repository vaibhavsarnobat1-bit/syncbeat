import { useAuthStore, type SessionUser } from "./store";

export type { SessionUser };

export const authHeaders = (): Record<string, string> => {
  const token = useAuthStore.getState().user?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
}

export class AuthError extends Error {
  needsVerification?: boolean;
  constructor(message: string, meta?: { needsVerification?: boolean }) {
    super(message);
    this.name = "AuthError";
    this.needsVerification = meta?.needsVerification;
  }
}

async function postJson(path: string, body: unknown): Promise<SessionUser> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuthError(data?.error || "Something went wrong", {
      needsVerification: data?.needsVerification === true,
    });
  }
  return data.user as SessionUser;
}

export async function registerRequest(
  username: string,
  password: string,
  email?: string
): Promise<{ user?: SessionUser; needsVerification: boolean; devCode?: string }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email: email || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuthError(data?.error || "Sign up failed", {
      needsVerification: data?.needsVerification === true,
    });
  }
  return {
    user: (data?.user as SessionUser) || undefined,
    needsVerification: data?.needsVerification === true,
    devCode: data?.devCode,
  };
}

export const loginRequest = (username: string, password: string) =>
  postJson("/auth/login", { username, password });

export async function verifyEmailRequest(email: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/verify-email-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data?.error };
}

export async function resendVerificationRequest(email: string): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  const res = await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data?.error, devCode: data?.devCode };
}

export async function forgotPasswordRequest(identifier: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data?.error };
}

export async function resetPasswordRequest(token: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data?.error };
}

export async function logoutRequest(): Promise<void> {
  const token = useAuthStore.getState().user?.token;
  if (token) {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  useAuthStore.getState().setSession(null);
}

export async function refreshSession(): Promise<void> {
  const { user, setSession } = useAuthStore.getState();
  const token = user?.token;
  // Sessions saved before real accounts existed (guests) hold no token and cannot authenticate
  if (!token) {
    if (user) setSession(null);
    return;
  }
  try {
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      useAuthStore.getState().setSession(null);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data?.user) useAuthStore.getState().setSession({ ...data.user, token });
  } catch {
    /* offline — keep the cached session */
  }
}

export function mediaStreamUrl(inviteCode: string, mediaId: string): string {
  const token = useAuthStore.getState().user?.token ?? "";
  return `/api/rooms/${encodeURIComponent(inviteCode)}/media/${encodeURIComponent(mediaId)}?t=${encodeURIComponent(token)}`;
}
