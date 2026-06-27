import api from './api';

interface LocationPayload {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
}

export const poolService = {
  joinPool: async (
    pickup: LocationPayload,
    dropoff: LocationPayload,
    timeSlot: string,
    direction: 'to_metro' | 'to_home'
  ) => {
    const { data } = await api.post('/pools/join', { pickup, dropoff, timeSlot, direction });
    return data;
  },

  getPoolDetails: async (poolId: string) => {
    const { data } = await api.get(`/pools/${poolId}`);
    return data;
  },

  leavePool: async (poolId: string) => {
    const { data } = await api.post(`/pools/${poolId}/leave`);
    return data;
  },

  acceptPool: async (poolId: string) => {
    const { data } = await api.post(`/pools/${poolId}/accept`);
    return data;
  },

  getActivePool: async () => {
    const { data } = await api.get('/pools/active/captain');
    return data;
  },

  startPool: async (poolId: string) => {
    const { data } = await api.post(`/pools/${poolId}/start`);
    return data;
  },

  completePool: async (poolId: string) => {
    const { data } = await api.post(`/pools/${poolId}/complete`, {}, { timeout: 120000 });
    return data;
  },

  acceptAdditionalRider: async (poolId: string, riderId: string) => {
    const { data } = await api.post(`/pools/${poolId}/accept-rider`, { riderId });
    return data;
  },

  declineAdditionalRider: async (poolId: string, riderId: string) => {
    const { data } = await api.post(`/pools/${poolId}/decline-rider`, { riderId });
    return data;
  },
};
export default poolService;
