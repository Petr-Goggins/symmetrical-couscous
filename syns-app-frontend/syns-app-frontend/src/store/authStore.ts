import { create } from 'zustand';

interface AuthState {
  user: any | null;
  loading: boolean;
  setUser: (user: any) => void;
  reset: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  setUser: (user) => set({ user }),
  reset: () => set({ user: null, loading: false }),
  logout: () => set({ user: null, loading: false }),
}));