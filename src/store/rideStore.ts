import { create } from 'zustand';
import { Location, RideType, RideStatus, ActiveRide, CaptainInfo, PaymentMethod, RideHistory } from '../types';
import { rideService } from '../services/ride.service';

interface RideState {
  // Locations
  pickup: Location | null;
  dropoff: Location | null;

  // Ride selection
  selectedRideType: RideType | null;
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
  isSurge: boolean;
  availableCaptains: number;

  // Active ride
  rideStatus: RideStatus;
  activeRide: ActiveRide | null;
  activeRideId: string | null;
  rideOtp: string | null;    // OTP to show rider
  captain: CaptainInfo | null;

  // Payment
  paymentMethod: PaymentMethod;

  // History
  rideHistory: RideHistory[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  setPickup: (location: Location) => void;
  setDropoff: (location: Location) => void;
  setSelectedRideType: (type: RideType) => void;
  setEstimate: (fare: number, distance: number, duration: number) => void;
  setRideStatus: (status: RideStatus) => void;
  setActiveRide: (ride: ActiveRide | null) => void;
  setCaptain: (captain: CaptainInfo | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  addToHistory: (ride: RideHistory) => void;
  resetRide: () => void;

  // API actions
  fetchEstimate: () => Promise<void>;
  requestRide: () => Promise<string | null>; // returns rideId
  cancelRide: (reason?: string) => Promise<void>;
  fetchRideHistory: () => Promise<void>;
}

export const useRideStore = create<RideState>((set, get) => ({
  pickup: null,
  dropoff: null,
  selectedRideType: null,
  estimatedFare: 0,
  estimatedDistance: 0,
  estimatedDuration: 0,
  isSurge: false,
  availableCaptains: 0,
  rideStatus: 'idle',
  activeRide: null,
  activeRideId: null,
  rideOtp: null,
  captain: null,
  paymentMethod: 'cash',
  rideHistory: [],
  isLoading: false,
  error: null,

  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setSelectedRideType: (selectedRideType) => set({ selectedRideType }),
  setEstimate: (estimatedFare, estimatedDistance, estimatedDuration) =>
    set({ estimatedFare, estimatedDistance, estimatedDuration }),
  setRideStatus: (rideStatus) => set({ rideStatus }),
  setActiveRide: (activeRide) => set({ activeRide }),
  setCaptain: (captain) => set({ captain }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  addToHistory: (ride) => set((state) => ({ rideHistory: [ride, ...state.rideHistory] })),

  resetRide: () =>
    set({
      pickup: null,
      dropoff: null,
      selectedRideType: null,
      estimatedFare: 0,
      estimatedDistance: 0,
      estimatedDuration: 0,
      isSurge: false,
      availableCaptains: 0,
      rideStatus: 'idle',
      activeRide: null,
      activeRideId: null,
      rideOtp: null,
      captain: null,
      error: null,
    }),

  /**
   * Fetch fare estimate from backend. Call after selecting pickup, dropoff, rideType.
   */
  fetchEstimate: async () => {
    const { pickup, dropoff, selectedRideType } = get();
    if (!pickup || !dropoff || !selectedRideType) return;

    set({ isLoading: true, error: null });
    try {
      const result = await rideService.getEstimate(
        { latitude: pickup.latitude, longitude: pickup.longitude, address: pickup.address, name: pickup.name },
        { latitude: dropoff.latitude, longitude: dropoff.longitude, address: dropoff.address, name: dropoff.name },
        selectedRideType
      );
      set({
        estimatedFare: result.data.fare,
        estimatedDistance: result.data.distance,
        estimatedDuration: result.data.duration,
        isSurge: result.data.isSurge,
        availableCaptains: result.data.availableCaptains,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to get estimate' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Request a ride — stores the rideId and OTP, updates status to 'searching'.
   */
  requestRide: async () => {
    const { pickup, dropoff, selectedRideType, paymentMethod } = get();
    if (!pickup || !dropoff || !selectedRideType) return null;

    set({ isLoading: true, error: null });
    try {
      const result = await rideService.requestRide(
        { latitude: pickup.latitude, longitude: pickup.longitude, address: pickup.address, name: pickup.name },
        { latitude: dropoff.latitude, longitude: dropoff.longitude, address: dropoff.address, name: dropoff.name },
        selectedRideType,
        paymentMethod
      );
      const rideId = result.data.ride._id;
      set({
        activeRideId: rideId,
        rideOtp: result.data.ride.otp,
        rideStatus: 'searching',
      });
      return rideId;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to request ride';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Cancel active ride.
   */
  cancelRide: async (reason) => {
    const { activeRideId } = get();
    if (!activeRideId) return;
    try {
      await rideService.cancelRide(activeRideId, reason);
      set({ rideStatus: 'cancelled', activeRideId: null, rideOtp: null });
    } catch (err: any) {
      throw err;
    }
  },

  /**
   * Fetch ride history from the backend.
   */
  fetchRideHistory: async () => {
    set({ isLoading: true });
    try {
      const result = await rideService.getRideHistory();
      const rides: RideHistory[] = result.data.rides.map((r: any) => ({
        id: r._id,
        pickup: r.pickup,
        dropoff: r.dropoff,
        rideType: r.rideType,
        fare: r.fare?.actual || r.fare?.estimated || 0,
        distance: r.distance,
        duration: r.estimatedDuration,
        status: r.status,
        date: r.createdAt,
        captain: r.captain,
        rating: r.ratingByRider?.score,
      }));
      set({ rideHistory: rides });
    } catch {
      // Fail silently for history
    } finally {
      set({ isLoading: false });
    }
  },
}));
