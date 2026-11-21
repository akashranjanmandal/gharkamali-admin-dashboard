'use client';
// ─────────────────────────────────────────────────────────────────────────────
// RBAC on the dashboard side. The backend is the real gatekeeper (every
// /admin route runs through the RBAC guard); this only decides what the UI
// shows: which sidebar entries render, which pages display "no access", and
// where each role lands after login.
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { AdminAPI } from './api';

// Dashboard page → backend RBAC module (mirror of services/rbac.service.js).
export const PAGE_MODULE: Record<string, string> = {
  '/dashboard': 'dashboard', '/analytics': 'analytics', '/leads': 'leads',
  '/bookings': 'bookings', '/blocked-dates': 'pricing', '/field-ops': 'operations',
  '/create-invoice': 'invoices', '/manual-invoices': 'invoices',
  '/tips': 'payouts', '/rewards': 'payouts', '/withdrawals': 'payouts',
  '/wallet': 'wallet', '/payments': 'payments',
  '/subscriptions': 'subscriptions',
  '/customers': 'customers', '/plant-history': 'customers',
  '/gardeners': 'staff', '/supervisors': 'staff',
  '/plans': 'pricing', '/geofencing': 'pricing', '/surcharges': 'pricing',
  '/addons': 'pricing', '/coupons': 'pricing',
  '/reviews': 'marketing', '/blogs': 'marketing', '/city-pages': 'marketing',
  '/faqs': 'marketing', '/taglines': 'marketing', '/notifications': 'marketing',
  '/complaints': 'support', '/sla': 'support',
  '/shop-products': 'shop', '/shop-categories': 'shop', '/shop-orders': 'shop',
  '/settings': 'settings', '/team': 'users', '/audit': 'audit',
};

export const moduleForPath = (pathname: string): string | null => {
  const base = '/' + (pathname || '').split('/').filter(Boolean)[0];
  return PAGE_MODULE[base] || null;
};

// Where each role starts after login.
export const ROLE_LANDING: Record<string, string> = {
  admin: '/dashboard',
  business: '/dashboard',
  accounts: '/payments',
  sales: '/leads',
  supervisor: '/supervisor/dashboard',
};

export function usePerms() {
  const { data, isLoading } = useQuery({
    queryKey: ['rbac-me'],
    queryFn: AdminAPI.rbacMe,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const role: string | undefined = (data as any)?.role;
  const modules: Record<string, string[]> | null = (data as any)?.modules || null;
  return {
    loaded: !isLoading && !!modules,
    role,
    modules,
    canView: (module: string | null) => {
      if (!module) return true;                 // unmapped page → leave to backend
      if (!modules) return true;                // still loading → don't flash "no access"
      return Array.isArray(modules[module]) && modules[module].length > 0;
    },
    canManage: (module: string) => !!modules && (modules[module] || []).includes('manage'),
  };
}
