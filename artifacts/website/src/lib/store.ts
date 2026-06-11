import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSession } from '@workspace/api-client-react';

interface AuthState {
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
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
