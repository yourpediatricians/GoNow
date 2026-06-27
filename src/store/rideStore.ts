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
  estimatedFares: Record<string, number>;
  estimatedDurations: Record<string, number>;
  availableCaptainsMap: Record<string, number>;

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
  estimatedFares: {},
  estimatedDurations: {},
  availableCaptainsMap: {},
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
  setSelectedRideType: (selectedRideType) => {
    const state = get();
    set({
      selectedRideType,
      estimatedFare: state.estimatedFares[selectedRideType] || 0,
      estimatedDuration: state.estimatedDurations[selectedRideType] || 0,
      availableCaptains: state.availableCaptainsMap[selectedRideType] || 0,
    });
  },
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
      estimatedFares: {},
      estimatedDurations: {},
      availableCaptainsMap: {},
      rideStatus: 'idle',
      activeRide: null,
      activeRideId: null,
      rideOtp: null,
      captain: null,
      error: null,
    }),

  /**
   * Fetch fare estimates from backend for all ride types in parallel.
   */
  fetchEstimate: async () => {
    const { pickup, dropoff } = get();
    if (!pickup || !dropoff) return;

    set({ isLoading: true, error: null });
    try {
      const types: RideType[] = ['bike', 'economy'];
      const promises = types.map(type => 
        rideService.getEstimate(
          { latitude: pickup.latitude, longitude: pickup.longitude, address: pickup.address, name: pickup.name },
          { latitude: dropoff.latitude, longitude: dropoff.longitude, address: dropoff.address, name: dropoff.name },
          type
        )
      );

      const results = await Promise.all(promises);

      const faresObj: Record<string, number> = {};
      const durationsObj: Record<string, number> = {};
      const captainsObj: Record<string, number> = {};
      let distance = 0;
      let surge = false;

      results.forEach((res, index) => {
        const type = types[index];
        faresObj[type] = res.data?.fare || 0;
        durationsObj[type] = res.data?.duration || 0;
        captainsObj[type] = res.data?.availableCaptains || 0;
        if (index === 0) {
          distance = res.data?.distance || 0;
          surge = res.data?.isSurge || false;
        }
      });

      const currentSelected = get().selectedRideType || 'bike';

      set({
        estimatedFares: faresObj,
        estimatedDurations: durationsObj,
        availableCaptainsMap: captainsObj,
        estimatedDistance: distance,
        isSurge: surge,
        // Keep active selection in sync for backward compatibility
        estimatedFare: faresObj[currentSelected] || 0,
        estimatedDuration: durationsObj[currentSelected] || 0,
        availableCaptains: captainsObj[currentSelected] || 0,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to get estimate',
        estimatedFare: 0,
        estimatedDistance: 0,
        estimatedDuration: 0,
        isSurge: false,
        availableCaptains: 0,
        estimatedFares: {},
        estimatedDurations: {},
        availableCaptainsMap: {},
      });
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
