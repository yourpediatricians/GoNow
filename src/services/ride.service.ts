import api from './api';
import { RideType, PaymentMethod } from '../types';

interface LocationPayload {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
}

export const rideService = {
  /**
   * Get fare + duration estimate without creating a ride.
   */
  getEstimate: async (pickup: LocationPayload, dropoff: LocationPayload, rideType: RideType) => {
    const { data } = await api.post('/rides/estimate', { pickup, dropoff, rideType });
    return data;
    // Returns: { distance, duration, fare, isSurge, surgeMultiplier, availableCaptains, eta }
  },

  /**
   * Request a ride — creates ride in DB and notifies nearby captains via socket.
   */
  requestRide: async (
    pickup: LocationPayload,
    dropoff: LocationPayload,
    rideType: RideType,
    paymentMethod: PaymentMethod = 'cash'
  ) => {
    const { data } = await api.post('/rides/request', { pickup, dropoff, rideType, paymentMethod });
    return data;
    // Returns: { ride: { _id, otp, fare, distance, estimatedDuration }, captainsNotified }
  },

  /**
   * Get ride details by ID.
   */
  getRideById: async (rideId: string) => {
    const { data } = await api.get(`/rides/${rideId}`);
    return data;
  },

  /**
   * Cancel an active ride (rider or captain).
   */
  cancelRide: async (rideId: string, reason?: string) => {
    const { data } = await api.post(`/rides/${rideId}/cancel`, { reason });
    return data;
  },

  /**
   * Captain: Accept a ride request.
   */
  acceptRide: async (rideId: string) => {
    const { data } = await api.post(`/rides/${rideId}/accept`);
    return data;
  },

  /**
   * Captain: Reject a ride request.
   */
  rejectRide: async (rideId: string, reason?: string) => {
    const { data } = await api.post(`/rides/${rideId}/reject`, { reason });
    return data;
  },

  /**
   * Captain: Enter rider's OTP to officially start the ride.
   */
  verifyRideOtp: async (rideId: string, otp: string) => {
    const { data } = await api.post(`/rides/${rideId}/verify-otp`, { otp });
    return data;
  },

  /**
   * Captain: Mark ride as completed — triggers earnings + wallet update.
   */
  completeRide: async (rideId: string) => {
    const { data } = await api.post(`/rides/${rideId}/complete`);
    return data;
  },

  /**
   * Get online captains near a location (before requesting a ride).
   */
  getNearbyCaptains: async (latitude: number, longitude: number, rideType: RideType) => {
    const { data } = await api.get('/rides/nearby-captains', {
      params: { latitude, longitude, rideType },
    });
    return data;
  },

  /**
   * Rider: Get paginated ride history.
   */
  getRideHistory: async (page = 1, limit = 10, status?: string) => {
    const { data } = await api.get('/user/ride-history', {
      params: { page, limit, status },
    });
    return data;
  },

  /**
   * Rider: Rate the captain and add optional tip.
   */
  rateRide: async (rideId: string, score: number, comment?: string, tip?: number) => {
    const { data } = await api.post('/user/rate-ride', { rideId, score, comment, tip });
    return data;
  },
};
