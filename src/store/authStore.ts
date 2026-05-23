import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { User, UserRole } from '../types';
import { authService } from '../services/auth.service';
import { STORAGE_KEYS } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  updateProfile: (updates: Partial<User>) => void;

  // Native Firebase Auth Actions
  sendOtp: (phone: string, role: UserRole) => Promise<{ success: boolean }>;
  verifyOtp: (phone: string, otp: string, role: UserRole) => Promise<void>;
  loadFromStorage: () => Promise<boolean>; // returns true if user found
}

// Module-level variable to hold the non-serializable confirmation result from Firebase
let confirmationResult: any = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null,

  setUser: (user) => set({ user, isAuthenticated: true }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),

  updateProfile: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  /**
   * Request Firebase Phone Auth SMS.
   * Handles device/SMS verification natively.
   */
  sendOtp: async (phone, role) => {
    set({ isLoading: true });
    try {
      const confirmation = await auth().signInWithPhoneNumber(phone);
      confirmationResult = confirmation;
      return { success: true };
    } catch (err: any) {
      console.error('Firebase signInWithPhoneNumber error:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Confirm OTP code natively, retrieve Firebase ID token, and sign in to backend
   */
  verifyOtp: async (phone, otp, role) => {
    set({ isLoading: true });
    try {
      if (!confirmationResult) {
        throw new Error('No active OTP session found. Please request a code first.');
      }

      // 1. Verify code natively with Firebase
      const credential = await confirmationResult.confirm(otp);
      if (!credential || !credential.user) {
        throw new Error('Firebase OTP verification failed.');
      }

      // 2. Fetch Firebase ID Token
      const idToken = await credential.user.getIdToken();

      // 3. Authenticate with GoNow backend
      const result = await authService.firebaseVerify(idToken, role);
      const { accessToken, refreshToken, user } = result.data;

      // Store tokens securely in AsyncStorage
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER, JSON.stringify(user)],
      ]);

      // Map backend user to app User type
      const appUser: User = {
        id: user._id,
        name: user.name || '',
        phone: user.phone,
        role: user.role,
        rating: user.rating || 5.0,
        totalRides: user.totalRides || 0,
      };

      set({ user: appUser, isAuthenticated: true, token: accessToken });

      // Connect Socket.io after login
      await connectSocket();
    } catch (err: any) {
      console.error('Firebase verifyOtp error:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Restore session from AsyncStorage on app startup.
   */
  loadFromStorage: async () => {
    try {
      const [token, userJson] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER,
      ]);

      const accessToken = token[1];
      const user = userJson[1] ? JSON.parse(userJson[1]) : null;

      if (accessToken && user) {
        const appUser: User = {
          id: user._id || user.id,
          name: user.name || '',
          phone: user.phone,
          role: user.role,
          rating: user.rating || 5.0,
          totalRides: user.totalRides || 0,
        };

        set({ user: appUser, isAuthenticated: true, token: accessToken });

        // Reconnect socket
        await connectSocket();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Log out — clear all stored data, disconnect socket.
   */
  logout: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await authService.logout(refreshToken).catch(() => {}); // best effort
      }
      // Also sign out from native Firebase Auth session
      await auth().signOut().catch(() => {});
    } finally {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      disconnectSocket();
      set({ user: null, isAuthenticated: false, token: null });
      confirmationResult = null;
    }
  },
}));
