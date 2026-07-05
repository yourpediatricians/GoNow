import api from './api';

export const captainService = {
  getProfile: async () => {
    const { data } = await api.get('/captain/profile');
    return data;
  },

  updateProfile: async (updates: {
    name?: string;
    email?: string;
    gender?: string;
    dob?: string;
    vehicle?: { type?: string; make?: string; model?: string; color?: string; plateNumber?: string; year?: number };
    documents?: { drivingLicense?: string; rcBook?: string; insurance?: string };
  }) => {
    const { data } = await api.put('/captain/profile', updates);
    return data;
  },

  /**
   * Toggle captain online/offline.
   * When going online, must provide current GPS coordinates.
   */
  toggleOnline: async (isOnline: boolean, latitude?: number, longitude?: number) => {
    const { data } = await api.put('/captain/toggle-online', { isOnline, latitude, longitude });
    return data;
  },

  /**
   * Send captain's current GPS location to the backend.
   */
  updateLocation: async (latitude: number, longitude: number) => {
    const { data } = await api.put('/captain/location', { latitude, longitude });
    return data;
  },

  /**
   * Get paginated ride history for captain.
   */
  getRideHistory: async (page = 1, limit = 10) => {
    const { data } = await api.get('/captain/ride-history', { params: { page, limit } });
    return data;
  },

  /**
   * Get today, weekly, and all-time earnings.
   */
  getEarnings: async () => {
    const { data } = await api.get('/captain/earnings');
    return data;
  },

  /**
   * Rate the rider after a completed ride.
   */
  rateRider: async (rideId: string, score: number, comment?: string) => {
    const { data } = await api.post('/captain/rate-rider', { rideId, score, comment });
    return data;
  },

  /**
   * Get active dispatch/invitation from Redis.
   */
  getActiveInvitation: async () => {
    const { data } = await api.get('/captain/active-invitation');
    return data;
  },
};
