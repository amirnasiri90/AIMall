'use client';
import { create } from 'zustand';
import { useEffect } from 'react';

export interface BillingContext {
  effectiveCoinCap: number | null;
  contractEndsAt: string | null;
  organizationName: string | null;
}

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  coins: number;
  hasOrganizationPlan?: boolean;
  billingContext?: BillingContext;
}

const CURRENT_ORG_KEY = 'aimall_current_organization_id';

interface AuthState {
  user: User | null;
  token: string | null;
  _hydrated: boolean;
  currentOrganizationId: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setCurrentOrganizationId: (id: string | null) => void;
  logout: () => void;
  isAdmin: () => boolean;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  _hydrated: false,
  currentOrganizationId: null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    const orgId = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_ORG_KEY) : null;
    set({ user, token, currentOrganizationId: orgId || null });
  },
  setUser: (user) => set({ user }),
  setCurrentOrganizationId: (id) => {
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(CURRENT_ORG_KEY, id);
      else localStorage.removeItem(CURRENT_ORG_KEY);
    }
    set({ currentOrganizationId: id });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem(CURRENT_ORG_KEY);
    if (typeof window !== 'undefined') sessionStorage.removeItem('aimall_profile_chosen');
    set({ user: null, token: null, currentOrganizationId: null });
  },
  isAdmin: () => get().user?.role === 'ADMIN',
  hydrate: () => {
    if (typeof window !== 'undefined' && !get()._hydrated) {
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem(CURRENT_ORG_KEY);
      set({ token, currentOrganizationId: orgId || null, _hydrated: true });
    }
  },
}));

// Hook to hydrate auth store on mount (client-side only)
export function useHydrateAuth() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
