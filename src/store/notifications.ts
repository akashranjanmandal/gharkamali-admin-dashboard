import { create } from 'zustand';

export type AdminNotif = {
  id: number;
  title: string;
  body: string;
  type: string;
  created_at: string;
  is_read: boolean;
};

type Store = {
  notifs: AdminNotif[];
  unread: number;
  addNotif: (n: AdminNotif) => void;
  markAllRead: () => void;
};

export const useNotifStore = create<Store>((set) => ({
  notifs: [],
  unread: 0,
  addNotif: (n) =>
    set((s) => ({
      notifs: [n, ...s.notifs].slice(0, 50),
      unread: s.unread + 1,
    })),
  markAllRead: () => set({ unread: 0 }),
}));
