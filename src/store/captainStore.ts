import { create } from 'zustand';
import { RideRequest, Coordinates } from '../types';
import { captainService } from '../services/captain.service';

interface Earning {
  date: string;
  amount: number;
  rides: number;
}

interface CaptainState {
  isOnline: boolean;
  currentLocation: Coordinates | null;
  incomingRequest: RideRequest | null;
  todayEarnings: number;
  todayRides: number;
  weeklyEarnings: Earning[];
  totalEarnings: number;
  acceptanceRate: number;
  activeRideId: string | null; // captain's current ride
  isLoading: boolean;

  // Actions (local state)
  setOnline: (online: boolean) => void;
  setCurrentLocation: (location: Coordinates) => void;
  setIncomingRequest: (request: RideRequest | null) => void;
  setActiveRideId: (id: string | null) => void;
  addEarning: (amount: number) => void;

  // API actions
  toggleOnline: (isOnline: boolean, latitude?: number, longitude?: number) => Promise<void>;
  updateLocationApi: (latitude: number, longitude: number) => Promise<void>;
  fetchEarnings: () => Promise<void>;
}

export const useCaptainStore = create<CaptainState>((set) => ({
  isOnline: false,
  currentLocation: null,
  incomingRequest: null,
  todayEarnings: 0,
  todayRides: 0,
  weeklyEarnings: [],
  totalEarnings: 0,
  acceptanceRate: 100,
  activeRideId: null,
  isLoading: false,

  setOnline: (isOnline) => set({ isOnline }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setIncomingRequest: (incomingRequest) => set({ incomingRequest }),
  setActiveRideId: (activeRideId) => set({ activeRideId }),
  addEarning: (amount) =>
    set((state) => ({
      todayEarnings: state.todayEarnings + amount,
      todayRides: state.todayRides + 1,
      totalEarnings: state.totalEarnings + amount,
    })),

  /**
   * Toggle online/offline via API.
   * Coordinates required when going online.
   */
  toggleOnline: async (isOnline, latitude, longitude) => {
    set({ isLoading: true });
    try {
      await captainService.toggleOnline(isOnline, latitude, longitude);
      const updates: Partial<CaptainState> = { isOnline };
      if (isOnline && latitude && longitude) {
        updates.currentLocation = { latitude, longitude };
      }
      set(updates);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Push current GPS coordinates to the backend (call periodically when online).
   */
  updateLocationApi: async (latitude, longitude) => {
    try {
      await captainService.updateLocation(latitude, longitude);
      set({ currentLocation: { latitude, longitude } });
    } catch {
      // Fail silently — location updates are best-effort
    }
  },

  /**
   * Fetch earnings from API.
   */
  fetchEarnings: async () => {
    set({ isLoading: true });
    try {
      const result = await captainService.getEarnings();
      const d = result.data;
      set({
        todayEarnings: d.todayEarnings || 0,
        todayRides: d.todayRides || 0,
        totalEarnings: d.totalEarnings || 0,
        acceptanceRate: d.acceptanceRate || 100,
        weeklyEarnings: d.weeklyEarnings || [],
      });
    } catch {
      // Fail silently
    } finally {
      set({ isLoading: false });
    }
  },
}));
