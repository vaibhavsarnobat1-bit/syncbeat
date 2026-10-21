import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SessionUser {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  role: 'user' | 'admin';
  email?: string;
  photoUrl?: string;
}

interface AuthState {
  user: SessionUser | null;
  setSession: (user: SessionUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setSession: (user) => set({ user }),
    }),
    {
      name: 'lt_user',
    }
  )
);

interface RecentRoomsState {
  rooms: { inviteCode: string; name: string; lastVisited: number }[];
  addRoom: (inviteCode: string, name: string) => void;
  removeRoom: (inviteCode: string) => void;
}

export const useRecentRoomsStore = create<RecentRoomsState>()(
  persist(
    (set) => ({
      rooms: [],
      addRoom: (inviteCode, name) =>
        set((state) => {
          const filtered = state.rooms.filter(r => r.inviteCode !== inviteCode);
          return {
            rooms: [{ inviteCode, name, lastVisited: Date.now() }, ...filtered].slice(0, 10)
          };
        }),
      removeRoom: (inviteCode) =>
        set((state) => ({
          rooms: state.rooms.filter(r => r.inviteCode !== inviteCode)
        }))
    }),
    {
      name: 'lt_recent_rooms',
    }
  )
);
