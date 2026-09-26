import api from './api';
import { User } from '../types';

export const userService = {
  /**
   * Update rider profile details on the backend.
   */
  updateProfile: async (updates: Partial<User>) => {
    const { data } = await api.put('/user/profile', updates);
    return data; // { success: true, message: 'Profile updated', data: { user } }
  },

  /**
   * Submit app rating and suggestions to the backend.
   */
  rateApp: async (score: number, message?: string) => {
    const { data } = await api.post('/user/rate-app', { score, message });
    return data;
  },

  /**
   * Apply a referral code manually (for users who skipped during signup).
   */
  applyReferral: async (referralCode: string) => {
    const { data } = await api.post('/user/apply-referral', { referralCode });
    return data; // { success, message, walletCredited }
  },

  /**
   * Get referral code, stats, and reward rules.
   */
  getReferralInfo: async () => {
    const { data } = await api.get('/user/referral');
    return data; // { referralCode, totalReferrals, totalReferralEarnings, rewardRules }
  },
};
