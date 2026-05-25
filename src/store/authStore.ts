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

// ─── DEV BYPASS ───────────────────────────────────────────────────────────────
// Set to true to skip Firebase auth and go straight to the app.
// Change `role` to 'rider' or 'captain' to test different flows.
const DEV_BYPASS = false;
const DEV_ROLE: UserRole = 'rider'; // 👈 change to 'rider' to test rider flow

const DEV_USER: User = {
  id: 'dev_001',
  name: '', // 👈 empty name triggers RiderOnboardingScreen for testing
  phone: '+91 98765 43210',
  role: DEV_ROLE,
  rating: 4.9,
  totalRides: 2840,
};
// ─────────────────────────────────────────────────────────────────────────────

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
      const { isNewUser, data } = result;
      const { accessToken, refreshToken, user } = data;

      // Store tokens securely in AsyncStorage
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER, JSON.stringify(user)],
      ]);

      // Map backend user to app User type
      // NOTE: For a new user, user.name will be empty/undefined.
      // RootNavigator checks: role === 'captain' && !user.name → shows CaptainOnboardingScreen
      // This is how the routing to onboarding works — no extra flags needed.
      const appUser: User = {
        id: user._id,
        name: user.name || '',          // empty for new users → triggers onboarding
        phone: user.phone,
        role: user.role,
        rating: user.rating || 0.0,
        totalRides: user.totalRides || 0,
      };

      set({ user: appUser, token: accessToken });

      // Connect Socket.io after login
      await connectSocket().catch(() => {});
      set({ isAuthenticated: true });
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

      // Under DEV_BYPASS, pre-fill saved name if they completed onboarding once
      if (DEV_BYPASS) {
        const restoredUser = user && user.name ? { ...DEV_USER, name: user.name } : DEV_USER;
        set({ user: restoredUser, token: accessToken });
        await connectSocket().catch(() => {});
        set({ isAuthenticated: true });
        return true;
      }

      if (accessToken && user) {
        const appUser: User = {
          id: user._id || user.id,
          name: user.name || '',
          phone: user.phone,
          role: user.role,
          rating: user.rating || 5.0,
          totalRides: user.totalRides || 0,
        };

        set({ user: appUser, token: accessToken });

        // Reconnect socket
        await connectSocket().catch(() => {});
        set({ isAuthenticated: true });
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
    // 1. Clear local state and Storage immediately (Instant UI response!)
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN).catch(() => null);
    
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS)).catch(() => {});
    disconnectSocket();
    set({ user: null, isAuthenticated: false, token: null });
    confirmationResult = null;

    // 2. Fire and forget remote calls in the background (Non-blocking!)
    if (refreshToken) {
      authService.logout(refreshToken).catch(() => {}); // best effort
    }
    auth().signOut().catch(() => {});
  },
}));
