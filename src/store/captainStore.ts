import { create } from 'zustand';
import { RideRequest, Coordinates } from '../types';

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

  setOnline: (online: boolean) => void;
  setCurrentLocation: (location: Coordinates) => void;
  setIncomingRequest: (request: RideRequest | null) => void;
  addEarning: (amount: number) => void;
}

const mockWeeklyEarnings: Earning[] = [
  { date: 'Mon', amount: 850, rides: 12 },
  { date: 'Tue', amount: 1200, rides: 17 },
  { date: 'Wed', amount: 960, rides: 14 },
  { date: 'Thu', amount: 1450, rides: 20 },
  { date: 'Fri', amount: 1800, rides: 24 },
  { date: 'Sat', amount: 2100, rides: 28 },
  { date: 'Sun', amount: 750, rides: 10 },
];

export const useCaptainStore = create<CaptainState>(set => ({
  isOnline: false,
  currentLocation: null,
  incomingRequest: null,
  todayEarnings: 1800,
  todayRides: 24,
  weeklyEarnings: mockWeeklyEarnings,
  totalEarnings: 9110,

  setOnline: isOnline => set({ isOnline }),
  setCurrentLocation: currentLocation => set({ currentLocation }),
  setIncomingRequest: incomingRequest => set({ incomingRequest }),
  addEarning: amount =>
    set(state => ({
      todayEarnings: state.todayEarnings + amount,
      todayRides: state.todayRides + 1,
      totalEarnings: state.totalEarnings + amount,
    })),
}));
