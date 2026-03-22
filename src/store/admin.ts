'use client';
import { create } from 'zustand';

interface AdminUser { id: number; name: string; phone: string; role: string; }
interface AdminState {
  user: AdminUser | null; token: string | null; isAuthenticated: boolean; isLoading: boolean;
  login: (user: AdminUser, token: string) => void;
  logout: () => void; hydrate: () => void;
}

export const useAdmin = create<AdminState>((set) => ({
  user: null, token: null, isAuthenticated: false, isLoading: true,
  login: (user, token) => { localStorage.setItem('gkm_admin_token', token); localStorage.setItem('gkm_admin_user', JSON.stringify(user)); set({ user, token, isAuthenticated: true, isLoading: false }); },
  logout: () => { localStorage.removeItem('gkm_admin_token'); localStorage.removeItem('gkm_admin_user'); set({ user: null, token: null, isAuthenticated: false, isLoading: false }); window.location.href = '/login'; },
  hydrate: () => {
    if (typeof window === 'undefined') { set({ isLoading: false }); return; }
    const token = localStorage.getItem('gkm_admin_token');
    const raw = localStorage.getItem('gkm_admin_user');
    if (token && raw) { try { set({ token, user: JSON.parse(raw), isAuthenticated: true, isLoading: false }); } catch { set({ isLoading: false }); } }
    else { set({ isLoading: false }); }
  },
}));
