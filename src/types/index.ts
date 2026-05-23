// User Types
export type UserRole = 'rider' | 'captain';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  rating: number;
  totalRides: number;
}

// Location Types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  address: string;
  name?: string;
}

// Ride Types
export type RideStatus =
  | 'idle'
  | 'searching'
  | 'matched'
  | 'captain_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RideType = 'bike' | 'auto' | 'cab';

export interface RideOption {
  id: RideType;
  name: string;
  icon: string;
  basePrice: number;
  pricePerKm: number;
  eta: number; // minutes
  capacity: number;
  description: string;
}

export interface RideRequest {
  id: string;
  riderId: string;
  pickup: Location;
  dropoff: Location;
  rideType: RideType;
  estimatedFare: number;
  estimatedDistance: number; // km
  estimatedDuration: number; // minutes
  status: RideStatus;
  createdAt: string;
}

export interface ActiveRide extends RideRequest {
  captainId: string;
  captain: CaptainInfo;
  otp: string;
  actualFare?: number;
  startedAt?: string;
  completedAt?: string;
}

// Captain Types
export interface CaptainInfo {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
  rating: number;
  totalRides: number;
  vehicle: Vehicle;
  currentLocation?: Coordinates;
  isOnline?: boolean;
  distanceFromPickup?: number; // km
}

export interface Vehicle {
  type: RideType;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

// Payment Types
export type PaymentMethod = 'cash' | 'upi' | 'wallet';

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
}

// History Types
export interface RideHistory {
  id: string;
  pickup: Location;
  dropoff: Location;
  rideType: RideType;
  fare: number;
  distance: number;
  duration: number;
  status: 'completed' | 'cancelled';
  date: string;
  captain?: CaptainInfo;
  rating?: number;
}

// Navigation Types
export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  PhoneEntry: { role: UserRole };
  OTPVerify: { phone: string; role: UserRole };
  ProfileSetup: { phone: string; role: UserRole };
  RoleSelect: undefined;
};

export type RiderTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type RiderTabParamList = {
  Home: undefined;
  History: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RiderStackParamList = {
  RiderTabs: undefined;
  Booking: { pickup: Location; dropoff: Location };
  RideSearch: { rideId: string };
  ActiveRide: { rideId: string };
  RideComplete: { rideId: string; fare: number; distance: number; rideType: RideType };
  SelectLocation: { type: 'pickup' | 'dropoff' };
};

export type CaptainTabParamList = {
  Dashboard: undefined;
  Earnings: undefined;
  Profile: undefined;
};

export type CaptainStackParamList = {
  CaptainTabs: undefined;
  RideRequest: { request: RideRequest };
  CaptainActiveRide: { rideId: string };
};
