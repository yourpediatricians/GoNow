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

// ── MOCK USER: bypasses auth for development ──────────────────────────────────
const MOCK_RIDER: User = {
  id: 'usr_001',
  name: 'Arjun Sharma',
  phone: '+91 98765 43210',
  role: 'rider',
  rating: 4.8,
  totalRides: 142,
};

export const useAuthStore = create<AuthState>(set => ({
  user: MOCK_RIDER,
  isAuthenticated: true,
  isLoading: false,
  token: 'mock_token_dev',

  setUser: user => set({ user, isAuthenticated: true }),
  setToken: token => set({ token }),
  logout: () => set({ user: null, isAuthenticated: false, token: null }),
  setLoading: isLoading => set({ isLoading }),
  updateProfile: updates =>
    set(state => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
