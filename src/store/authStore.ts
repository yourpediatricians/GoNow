import { create } from 'zustand';
import { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null,

  setUser: user => set({ user, isAuthenticated: true }),
  setToken: token => set({ token }),
  logout: () => set({ user: null, isAuthenticated: false, token: null }),
  setLoading: isLoading => set({ isLoading }),
  updateProfile: updates =>
    set(state => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
