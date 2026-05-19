import { create } from 'zustand';
import {
  Location,
  RideType,
  RideStatus,
  ActiveRide,
  CaptainInfo,
  PaymentMethod,
  RideHistory,
} from '../types';

interface RideState {
  // Locations
  pickup: Location | null;
  dropoff: Location | null;

  // Ride selection
  selectedRideType: RideType | null;
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;

  // Active ride
  rideStatus: RideStatus;
  activeRide: ActiveRide | null;
  captain: CaptainInfo | null;

  // Payment
  paymentMethod: PaymentMethod;

  // History
  rideHistory: RideHistory[];

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
}

export const useRideStore = create<RideState>(set => ({
  pickup: null,
  dropoff: null,
  selectedRideType: null,
  estimatedFare: 0,
  estimatedDistance: 0,
  estimatedDuration: 0,
  rideStatus: 'idle',
  activeRide: null,
  captain: null,
  paymentMethod: 'cash',
  rideHistory: [],

  setPickup: pickup => set({ pickup }),
  setDropoff: dropoff => set({ dropoff }),
  setSelectedRideType: selectedRideType => set({ selectedRideType }),
  setEstimate: (estimatedFare, estimatedDistance, estimatedDuration) =>
    set({ estimatedFare, estimatedDistance, estimatedDuration }),
  setRideStatus: rideStatus => set({ rideStatus }),
  setActiveRide: activeRide => set({ activeRide }),
  setCaptain: captain => set({ captain }),
  setPaymentMethod: paymentMethod => set({ paymentMethod }),
  addToHistory: ride =>
    set(state => ({ rideHistory: [ride, ...state.rideHistory] })),
  resetRide: () =>
    set({
      pickup: null,
      dropoff: null,
      selectedRideType: null,
      estimatedFare: 0,
      estimatedDistance: 0,
      estimatedDuration: 0,
      rideStatus: 'idle',
      activeRide: null,
      captain: null,
    }),
}));
