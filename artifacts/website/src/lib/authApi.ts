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

async function postJson(path: string, body: unknown): Promise<SessionUser> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Something went wrong");
  return data.user as SessionUser;
}

export const registerRequest = (username: string, password: string) =>
  postJson("/auth/register", { username, password });

export const loginRequest = (username: string, password: string) =>
  postJson("/auth/login", { username, password });

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
